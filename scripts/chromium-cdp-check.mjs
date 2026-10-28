// Chromium con reloj real vía DevTools: útil para PDF.js que utiliza Web Workers.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';

export async function runChromiumCdp(chrome,url,timeoutMs=75000){
  const dir=mkdtempSync(join(tmpdir(),'obi-cdp-qa-'));
  const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu',
    '--disable-dev-shm-usage','--disable-background-networking','--no-first-run',
    '--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
  let stderr='',ws,wsUrl,stage='iniciando';let closed=false;
  let nextId=0;const pending=new Map();
  const deadline=Date.now()+timeoutMs;
  const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
  try{
    wsUrl=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('No inició la depuración de Chromium: '+stderr.slice(-700))),15000);
      const onData=chunk=>{
        stderr+=String(chunk).slice(0,20000);
        const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if(match){clearTimeout(timer);resolve(match[1])}
      };
      child.stderr.on('data',onData);
      child.once('error',e=>{clearTimeout(timer);reject(e)});
      child.once('exit',code=>{if(!wsUrl){clearTimeout(timer);reject(Error('Chromium salió '+code+': '+stderr.slice(-700)))}})
    });
    ws=new WebSocket(wsUrl);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('No conectó DevTools WebSocket')),10000);
      ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
      ws.addEventListener('error',e=>{clearTimeout(timer);reject(Error('WebSocket: '+String(e?.message||e)))},{once:true});
    });
    ws.addEventListener('message',event=>{
      let msg;try{msg=JSON.parse(event.data)}catch{return}
      if(!msg.id||!pending.has(msg.id))return;
      const {ok,bad}=pending.get(msg.id);pending.delete(msg.id);
      msg.error?bad(Error(msg.error.message||String(msg.error))):ok(msg.result);
    });
    const cmd=(method,params={},sessionId)=>new Promise((ok,bad)=>{
      const id=++nextId;pending.set(id,{ok,bad});
      ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
    });
    const created=await cmd('Target.createTarget',{url:'about:blank'});
    const attached=await cmd('Target.attachToTarget',{targetId:created.targetId,flatten:true});
    const sessionId=attached.sessionId;
    await cmd('Page.enable',{},sessionId);
    await cmd('Runtime.enable',{},sessionId);
    await cmd('Page.navigate',{url},sessionId);
    while(Date.now()<deadline){
      await sleep(400);
      let r;
      try{r=await cmd('Runtime.evaluate',{expression:
        '(function(){const e=document.getElementById("qa-result");return {status:e?.dataset.status||"loading",text:e?.textContent||"",stage:window.__qaStage||"desconocida"}})()',
        returnByValue:true,awaitPromise:false},sessionId)}
      catch(error){stage='CDP: '+error.message;continue}
      const out=r?.result?.value;
      if(!out)continue;
      stage=out.stage;
      if(out.status==='pass'||out.status==='fail')return {...out,stderr:stderr.slice(-900)};
    }
    throw Error('No terminó Chromium ('+stage+') en '+timeoutMs+' ms: '+stderr.slice(-850));
  }finally{
    for(const entry of pending.values())entry.bad(Error('Chromium cerrado'));
    pending.clear();
    if(ws){try{ws.close()}catch{}}
    if(!child.killed)child.kill('SIGKILL');
    try{rmSync(dir,{recursive:true,force:true})}catch{}
  }
}

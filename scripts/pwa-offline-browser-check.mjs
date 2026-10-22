// PWA real en Chromium: instalar Service Worker, guardar capítulo ficticio,
// simular modo avión en DevTools y reabrir rutas con el servidor local disponible.
// No consulta Supabase real ni depende de cuentas reales.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

assert(existsSync('dist/index.html'), 'Primero ejecutar npm run build');
const bin = (process.env.QA_CHROME ? [process.env.QA_CHROME] :
  ['chromium','google-chrome','google-chrome-stable','chromium-browser']).map(x=> {
  try { return execFileSync('which',[x],{encoding:'utf8'}).trim(); } catch { return ''; }
}).find(Boolean);
assert(bin,'Chromium no disponible en este runner');
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css',
 '.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=createServer((req,res)=>{
  let p=new URL(req.url,'http://localhost').pathname;
  const rel=p==='/'?'index.html':p.slice(1);
  const path=join(process.cwd(),'dist',rel);
  const filename=existsSync(path) ? path : join(process.cwd(),'dist/index.html');
  res.writeHead(200,{'Content-Type':mime[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(readFileSync(filename));
});
const temp=mkdtempSync(join(tmpdir(),'obi-offline-chrome-'));
let proc,ws;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function cdp(socket){
  let next=1;
  const pending=new Map();
  socket.addEventListener('message',e=>{
    try{const m=JSON.parse(e.data);if(!m.id)return;
      const p=pending.get(m.id);if(!p)return;pending.delete(m.id);
      m.error?p.reject(Error(m.error.message)):p.resolve(m.result);
    }catch(err){console.error('CDP message',err);}
  });
  return (method,params={})=>new Promise((resolve,reject)=>{
    const id=next++;pending.set(id,{resolve,reject});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function waitFor(fn,limit=10000,interval=100){
  const start=Date.now(),errors=[];
  while(Date.now()-start < limit){
    try {const val=await fn();if(val)return val;}catch(e){errors.push(e.message);}
    await delay(interval);
  }
  throw Error('Timeout '+limit+' ms '+errors.slice(-2).join('; '));
}
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 const origin='http://127.0.0.1:'+server.address().port;
 proc=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-background-networking','--no-first-run','--no-default-browser-check',
   '--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+temp,'about:blank'],
   {stdio:['ignore','ignore','pipe']});
 let stderr=''; proc.stderr.on('data',b=>{stderr+=String(b).slice(0,1000);});
 const active=join(temp,'DevToolsActivePort');
 await waitFor(()=>existsSync(active),10000);
 const port=readFileSync(active,'utf8').split('\n')[0].trim();
 const targets=await waitFor(async()=>{
   const r=await fetch('http://127.0.0.1:'+port+'/json/list');
   const j=await r.json();return j.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 },10000);
 ws=new WebSocket(targets.webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
 const call=cdp(ws);
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 async function evalJs(expression){
   const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error(r.exceptionDetails.text + ': '+r.result?.description);
   return r.result?.value;
 }
 const navigate=async path=>call('Page.navigate',{url:origin+path});
 await navigate('/descargas');
 await waitFor(()=>evalJs("Boolean(document.querySelector('#off'))"),13000);
 const ready=await waitFor(()=>evalJs("navigator.serviceWorker.controller && navigator.serviceWorker.controller.state==='activated'"),14000);
 assert(ready,'La PWA no quedó controlada por SW');
 const meta={
   series:{id:'serie-prueba',slug:'obra-local',title:'Obra QA offline',team_id:'e',teams:{name:'QA',slug:'qa',reader_defaults:{}}},
   chapters:[{id:'c-1',num:1,vol:1,volume_id:'v-1',title:'Capítulo QA',updated_at:'2026-10-21T00:00:00Z'}],
   vols:[{id:'v-1',num:1,title:'Volumen QA',epub_fonts:[]}],gloss:[]
 };
 const content=[{type:'paragraph',text:'TEXTO OFFLINE DE PRUEBA'}];
 const seed=`(async()=>{
   const c=await caches.open('obi-offline-v1');
   await c.put('/offline/meta/obra-local',new Response(JSON.stringify(${JSON.stringify(meta)}),{headers:{'content-type':'application/json'}}));
   await c.put('/offline/obra-local/1',new Response(JSON.stringify(${JSON.stringify(content)}),{headers:{'content-type':'application/json'}}));
   localStorage.setItem('obi-offline-index',JSON.stringify({'serie-prueba:1':{slug:'obra-local',title:'Obra QA offline',vol:1,nums:[1],assets:[],at:Date.now()}}));
   return {shell:(await caches.keys()).filter(k=>k.startsWith('obi-')),downloaded:!!(await c.match('/offline/obra-local/1'))};
 })()`;
 const setup=await evalJs(seed);
 assert(setup.downloaded,'Capítulo no quedó guardado en Cache Storage');
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await waitFor(()=>evalJs('navigator.onLine === false'),4500);
 const startList=performance.now();
 await navigate('/descargas');
 await waitFor(()=>evalJs("Boolean(document.querySelector('.off-it'))"),7500);
 const descMs=Math.round(performance.now()-startList);
 const offline=await evalJs('!navigator.onLine');
 assert.equal(offline,true,'Chrome no quedó en modo avión');
 const startChapter=performance.now();
 await navigate('/leer/obra-local/1');
 let chapterReady=false,terminal='';
 try{
   await waitFor(()=>evalJs("Boolean(document.querySelector('.rd-body')?.textContent.includes('TEXTO OFFLINE DE PRUEBA'))"),6000);
   chapterReady=true;
 }catch{
   terminal=await evalJs("document.querySelector('#app')?.textContent?.slice(0,250) || 'sin contenido'");
 }
 const chapterMs=Math.round(performance.now()-startChapter);
 console.log('CHROMIUM PWA modo avión: SW='+setup.shell.join(',')+'; Mis descargas='+descMs+'ms; capítulo='+chapterMs+'ms; resultado='+ (chapterReady?'OK':'FALLA: '+terminal));
 assert(chapterReady,'El capítulo ficticio descargado no abrió sin red: '+terminal);
}finally{
 try{ws?.close();}catch{}
 try{proc?.kill('SIGKILL');}catch{}
 try{await new Promise(r=>server.close(r));}catch{}
 rmSync(temp,{recursive:true,force:true});
}

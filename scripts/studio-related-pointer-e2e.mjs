// Chromium vía DevTools: pulsaciones de ratón y pantalla táctil reales del motor,
// sin .click() ni eventos PointerEvent fabricados y sin dependencias adicionales.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync,existsSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawn,execFileSync } from 'node:child_process';

const files = new Map([
  ['/studio-related-editor.js','src/studio-related-editor.js'],
  ['/studio-related-works.js','src/studio-related-works.js'],
  ['/paging.js','src/paging.js'],
  ['/studio-obras.css','src/studio-obras.css'],
  ['/__qa__/pointer-fixture.mjs','scripts/fixtures/studio-related-pointer-fixture.mjs']
]);
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<link rel="stylesheet" href="/studio-obras.css"></head><body class="s2" style="margin:0;background:#16120e;color:#eee">' +
  '<main style="max-width:600px;margin:auto;padding:12px"><p id="ready">loading</p><p id="dirty"></p>' +
  '<div id="panel"></div><button type="button" id="reopen">Reabrir ficha</button></main>' +
  '<script type="module" src="/__qa__/pointer-fixture.mjs"></script></body></html>';
const server = createServer((req,res)=>{
  const pathname = new URL(req.url,'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'");
  if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
  const file=files.get(pathname);
  if(!file){res.writeHead(404);res.end('No encontrado');return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':'text/javascript'});
  res.end(readFileSync(resolve(file)));
});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function poll(callback,label){
  for(let i=0;i<150;i++){
    try{const value=await callback();if(value)return value;}catch{}
    await sleep(100);
  }
  throw Error('No se completó: '+label);
}
function chromeBinary(){
  if(process.env.QA_CHROME)return process.env.QA_CHROME;
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{return execFileSync('which',[name],{encoding:'utf8'}).trim();}catch{}
  }
  throw Error('Chromium no disponible en runner');
}
async function connectCDP(url){
  const ws=new WebSocket(url);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});
    ws.addEventListener('error',fail,{once:true});
  });
  let seq=0;
  const pending=new Map();
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    const task=pending.get(msg.id);
    if(!task)return;
    pending.delete(msg.id);
    if(msg.error)task.reject(Error(msg.error.message));
    else task.resolve(msg.result);
  });
  return {
    send(method,params={}){
      const id=++seq;
      return new Promise((resolve,reject)=>{
        pending.set(id,{resolve,reject});
        ws.send(JSON.stringify({id,method,params}));
      });
    },
    close(){ws.close();}
  };
}
let chrome,cdp,dir;
try{
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
  const port=server.address().port;
  dir=mkdtempSync(join(tmpdir(),'obi-studio-pointer-'));
  chrome=spawn(chromeBinary(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+dir,'--window-size=980,900',
    'http://127.0.0.1:'+port+'/'],{stdio:'ignore'});
  const portFile=join(dir,'DevToolsActivePort');
  const debugPort=await poll(()=>existsSync(portFile)&&Number(readFileSync(portFile,'utf8').split('\n')[0]),'Chromium DevTools');
  const targets=await poll(async()=>{
    const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list');
    const result=await response.json();
    return result.find(x=>x.type==='page'&&x.url.includes('127.0.0.1:'+port))?.webSocketDebuggerUrl;
  },'pestaña de QA');
  cdp=await connectCDP(targets);
  await cdp.send('Runtime.enable');
  const evalJS=async expression=>{
    const response=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails)throw Error(response.exceptionDetails.text);
    return response.result.value;
  };
  const until=async(expression,label)=>poll(()=>evalJS(expression),label);
  const rect=async selector=>{
    const value=await evalJS('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');'+
      'if(!e)return null;const r=e.getBoundingClientRect();'+
      'return {x:r.left+r.width/2,y:r.top+r.height/2,visible:!!r.width&&!!r.height};})()');
    assert(value?.visible,'Elemento no visible: '+selector);
    return value;
  };
  const click=async selector=>{
    const {x,y}=await rect(selector);
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
    await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
  };
  await until("document.querySelector('#ready')?.textContent==='ready' && !!document.querySelector('[data-related-query]')",'catálogo');
  await click('#wk-related-search');
  await cdp.send('Input.insertText',{text:'bruja'});
  await until("document.querySelector('.srp-result')?.textContent.includes('Bruja')",'búsqueda con ratón');
  await click('.srp-result .srp-select-action');
  await until("window.__qaState.selected().length===1 && document.querySelector('[data-rel-selected]')?.textContent.includes('Bruja')",'selección de ratón');
  assert.equal(await evalJS('window.__qaState.persisted().length'),0,'No se debe guardar antes de confirmar');
  await click('#rel-save-all');
  await until('window.__qaState.persisted().length===1','persistencia tras clic real');
  await click('#reopen');
  await until("window.__qaState.selected().length===1 && document.querySelector('#wk-related-search')",'reapertura persistente');
  assert.equal(await evalJS("document.querySelector('[data-rel-selected]').textContent.includes('Bruja')"),true);
  // Teclado: Escape desde una opción no debe volver a abrir la lista.
  await click('#wk-related-search');
  await cdp.send('Input.insertText',{text:'Fortaleza'});
  await until("document.querySelector('.srp-result')?.textContent.includes('Fortaleza')",'resultado de teclado');
  await evalJS("document.querySelector('.srp-result').focus()");
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evalJS("document.querySelector('[data-related-results]').hidden && document.activeElement.id==='wk-related-search'"),true,'Escape reabrió el buscador');
  // El segundo vínculo se añade con un toque real del motor Chromium.
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:780,deviceScaleFactor:1,mobile:true});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await evalJS("(()=>{const e=document.querySelector('#wk-related-search');e.value='Fortaleza';e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await until("document.querySelector('.srp-result')?.textContent.includes('Fortaleza')",'resultado táctil');
  const {x,y}=await rect('.srp-result .srp-select-action');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("window.__qaState.selected().length===2",'selección táctil móvil');
  await click('#rel-save-all');
  await until("window.__qaState.persisted().length===2",'guardado después del toque');
  console.log('✓ Chromium CDP real: ratón → seleccionar → guardar → reabrir, Escape y toque móvil → seleccionar → guardar');
}finally{
  cdp?.close();
  chrome?.kill('SIGKILL');
  await new Promise(done=>server.close(done));
  if(dir)rmSync(dir,{force:true,recursive:true});
}

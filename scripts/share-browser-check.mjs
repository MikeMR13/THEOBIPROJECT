// Chromium real: controlar el menú sin Supabase ni servicios externos.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const files=new Map([['/dialogs.js','src/dialogs.js'],['/share.js','src/share.js'],['/seo.js','src/seo.js'],['/share-placement.js','src/share-placement.js']]);
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow"><link rel="canonical" href="https://elobidellector.com/serie/prueba">
<style>*{box-sizing:border-box}body{margin:0;background:#0d0c0a;color:#f3ecd9;font:14px sans-serif}
.ui-series-hero{position:relative;margin-top:max(10px,calc(100vh - 360px));height:320px;overflow:hidden;background:#14120d;border-top:6px solid #f2c230}
.ui-series-actions{position:absolute;left:12px;right:12px;bottom:13px;display:flex;flex-wrap:wrap;gap:8px}
.ui-series-actions .btn{padding:10px 12px;min-height:44px;background:#19160e;color:#f3ecd9;border:2px solid #51432d}</style></head><body>
<div class="ui-series-page"><section class="ui-series-hero"><div><h1>Los secretos de la Bruja del Silencio</h1>
<div class="ui-series-actions"><a class="btn" href="#a">Seguir leyendo</a><a class="btn" href="#b">Mis anotaciones</a><a class="btn ui-jump" href="#serie-vols">Explorar volúmenes</a></div>
</div></section></div><div id="toast" role="status" style="display:none;position:fixed;bottom:24px;left:50%"> </div><output id="qa" data-result="running">RUNNING</output>
<script type="module">
import {installPublicShare} from '/share.js';
const delay=()=>new Promise(r=>setTimeout(r,100)),check=(value,reason)=>{if(!value)throw Error(reason)};
const out=document.getElementById('qa');
try{
  installPublicShare();
  const box=document.querySelector('.ui-series-actions > .obi-share');
  check(!!box,'Compartir fuera de la fila de acciones');
  check(!box.querySelector('[data-obi-share="native"]'),'Opción de compartir nativo redundante');
  const summary=box.querySelector('summary');
  summary.click();await delay();
  let panel=document.body.querySelector(':scope > .obi-share-menu.is-floating');
  check(box.open&&!!panel,'El menú no sale del hero recortado');
  const rect=panel.getBoundingClientRect();
  check(rect.left>=0&&rect.right<=window.innerWidth+1,'Menú cortado horizontalmente');
  check(rect.top>=0&&rect.bottom<=window.innerHeight+1,'Menú cortado verticalmente');
  check(panel.dataset.direction==='above','La apertura debería ser superior cerca del borde inferior');
  check(panel.querySelector('a[href*="wa.me"]')&&panel.querySelector('a[href*="t.me"]'),
    'Opciones WhatsApp y Telegram ausentes');
  const copy=panel.querySelector('[data-obi-share="copy"]');
  check(copy,'Copiar enlace ausente');
  // El click real usa un portapapeles simulado, sin pedir permisos ni salir a la red.
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    writeText:async url=>{window.__copiedURL=url;}
  }});
  copy.click();await delay();
  const toast=document.getElementById('toast');
  check(window.__copiedURL===location.origin+location.pathname,'Copió un enlace distinto a la obra pública');
  check(toast.textContent==='Enlace copiado'&&toast.style.display==='block',
    'Falta el aviso visible después de copiar el enlace');
  check(Number(toast.style.zIndex)>9000,'El menú flotante puede tapar el aviso');
  check(toast.getAttribute('role')==='status','El mensaje no es accesible al lector de pantalla');
  // Fallo de clipboard: jamás decir que se copió cuando solo se abrió el prompt.
  window.__promptURL='';
  window.prompt=(message,url)=>{window.__promptURL=url;return url;};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    writeText:async()=>{throw Error('portapapeles bloqueado');}
  }});
  copy.click();await delay();
  check(window.__promptURL===location.origin+location.pathname,'No muestra el enlace para copiar manualmente');
  check(toast.textContent==='Enlace listo para copiar','El aviso debe distinguir el fallo del copiado real');
  // Compatibilidad: el estado del menú sigue funcionando si no existe el toast global.
  toast.remove();
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    writeText:async url=>{window.__copiedURL=url;}
  }});
  copy.click();await delay();
  check(panel.querySelector('.obi-share-status')?.textContent==='Enlace copiado',
    'Sin toast global el aviso debe mostrarse en el panel flotante');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await delay();check(!box.open,'Escape no cierra');
  check(!document.body.querySelector(':scope > .obi-share-menu.is-floating'),'Panel huérfano en body');
  check(document.activeElement===summary,'Escape no devuelve foco al disparador');
  summary.click();await delay();
  panel=document.body.querySelector(':scope > .obi-share-menu.is-floating');
  check(!!panel,'No se puede reabrir');
  document.body.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  await delay();check(!box.open,'Click exterior no cierra');
  out.dataset.result='pass';out.textContent='PASS responsive '+window.innerWidth+'x'+window.innerHeight;
}catch(e){out.dataset.result='fail';out.textContent=String(e.stack||e)}
</script></body></html>`;
const server=createServer((req,res)=>{
  const u=new URL(req.url||'/','http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self'; object-src 'none'");
  if(u.pathname==='/serie/prueba'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  const p=files.get(u.pathname);
  if(!p){res.writeHead(404);res.end('Not found');return;}
  try{res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});
    res.end(readFileSync(resolve(process.cwd(),p)));}
  catch{res.writeHead(500);res.end('Fixture error');}
});
function chromeBinary(){
  if(process.env.QA_CHROME)return process.env.QA_CHROME;
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{return execFileSync('which',[name],{encoding:'utf8'}).trim();}catch{}
  }
  throw new Error('Chromium no disponible');
}
async function run(bin,port,viewport){
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--disable-component-update','--no-first-run',
    '--no-default-browser-check','--disable-extensions','--no-proxy-server',
    '--window-size='+viewport,'--virtual-time-budget=7000','--dump-dom',
    'http://127.0.0.1:'+port+'/serie/prueba'];
  const proc=spawn(bin,args,{stdio:['ignore','pipe','pipe']});
  let text='',err='';
  proc.stdout.on('data',b=>text+=String(b).slice(0,500000));
  proc.stderr.on('data',b=>err+=String(b).slice(0,20000));
  const code=await new Promise((ok,fail)=>{
    const timer=setTimeout(()=>{proc.kill('SIGKILL');fail(Error('Chromium timeout '+viewport))},45000);
    proc.once('error',e=>{clearTimeout(timer);fail(e)});
    proc.once('close',v=>{clearTimeout(timer);ok(v)});
  });
  assert.equal(code,0,'Chromium exit: '+err.slice(-450));
  const result=text.match(/<output id="qa" data-result="(pass|fail)">([\s\S]*?)<\/output>/);
  if(!result)throw Error('Sin resultado DOM '+viewport+' '+text.slice(-850));
  if(result[1]!=='pass')throw Error('Fallo Chromium '+viewport+': '+result[2].slice(0,1100));
  console.log('share-browser: '+viewport+' '+result[2]);
}
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const port=server.address().port,bin=chromeBinary();
  for(const size of ['1280,800','390,700'])await run(bin,port,size);
  console.log('share-browser: aviso de copiado, fallback, menú flotante, móvil, Escape y enlaces OK');
}finally{await new Promise(ok=>server.close(ok))}

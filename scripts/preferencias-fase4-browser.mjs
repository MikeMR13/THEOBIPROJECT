// Chromium real, backend simulado y cuatro anchuras para Preferencias.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

// Un solo viewport por Chromium: evita dos renderizadores compitiendo
// por CPU en Actions cuando se lanzan otros workflows simultáneos.
const views=[[320],[390],[768],[1280]];
const application=readFileSync('src/app.js','utf8');
const screen=readFileSync('src/profile.js','utf8');
// La sesión sin ui_prefs debe aplicar valores por defecto: nunca la configuración de otra cuenta.
assert(screen.includes("hide: [], ...(P.ui_prefs || {})"),'Preferencias debe inicializarse exclusivamente desde el perfil autenticado');
assert(application.includes("else window.obiSetUI({});"),'Cambiar a una cuenta sin preferencias debe restablecer accesibilidad');
assert(application.includes("window.obiSetUI(profile?.ui_prefs || {});"),'La sesión cacheada o sin conexión no debe heredar otra identidad');
const source='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--gold:#f2c230;--paper:#eee2cf;--mute:#a79a82;--line:#665942}*,*:before,*:after{box-sizing:border-box}body{margin:0;padding:8px;background:#0d0c0a;color:var(--paper);font-family:Arial,sans-serif}</style></head><body><main id="app"></main><p id="result" data-qa-status="running">EJECUTANDO</p><script type="module" src="/harness.js"></script></body></html>';
const parent='<!doctype html><html><body><p id="qa-result" data-qa-status="running">EJECUTANDO</p><script>'+
  'const expected=new URLSearchParams(location.search).get("widths").split(",").map(Number);const results=new Map();'+
  'window.addEventListener("message",e=>{if(e.data?.type!=="qa-result")return;results.set(e.data.width,e.data);if(results.size===expected.length){const fails=[...results.values()].flatMap(x=>x.errors.map(err=>x.width+": "+err));const p=document.getElementById("qa-result");p.dataset.qaStatus=fails.length?"fail":"pass";p.textContent=fails.length?fails.join(" | "):"Preferencias fase 4: "+expected.join(",")+" px OK";}});'+
  'expected.forEach(w=>{const f=document.createElement("iframe");f.src="/case";f.width=w;f.height=1700;f.style.display="block";document.body.appendChild(f)});'+
  '</script></body></html>';
const server=createServer((req,res)=>{
 const path=(req.url||'/').split('?')[0];
 res.setHeader('Cache-Control','no-store');
 if(path==='/harness.js'){
  res.setHeader('Content-Type','text/javascript; charset=utf-8');
  res.end(readFileSync('scripts/qa-preferencias-browser-harness.js','utf8'));return;
 }
 if(['/profile.js','/reader-pref-cache.js','/preferences-preview.js'].includes(path)){
  res.setHeader('Content-Type','text/javascript; charset=utf-8');
  res.end(readFileSync('src/'+path.slice(1),'utf8'));return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(path==='/case'?source:parent);
});
const browser=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>{try{return execFileSync('which',[name],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(browser,'Chromium requerido');
// Cuatro procesos secuenciales y un solo iframe cada vez. Cada proceso recibe
// su propio directorio de perfil temporal; evita GPU/cache/procesos residuales.
// Un fallo real de aserción NO se reintenta. Solo reintenta un arranque colgado.
async function runGroup(widths, attempt) {
 const url='http://127.0.0.1:'+server.address().port+'/?widths='+widths.join(',');
 const profileDir=mkdtempSync(join(tmpdir(),'obi-pref-qa-'));
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server','--disable-sync','--disable-extensions','--no-first-run','--no-default-browser-check',`--user-data-dir=${profileDir}`,
 '--disable-renderer-backgrounding','--disable-background-timer-throttling','--window-size=1500,900','--virtual-time-budget=12000','--dump-dom',url];
 const child=spawn(browser,args,{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='',timedOut=false;
 child.stdout.on('data',d=>{if(stdout.length<160000)stdout+=String(d)});
 child.stderr.on('data',d=>{if(stderr.length<30000)stderr+=String(d)});
 let code;
 try {
  code=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},45000);
   child.once('error',error=>{clearTimeout(timer);reject(error)});
   child.once('close',result=>{clearTimeout(timer);resolve(result)});
  });
 } finally {
  try { rmSync(profileDir,{recursive:true,force:true,maxRetries:12,retryDelay:120}); }
  catch (error) { console.warn('Limpieza de perfil QA Chromium:',error.message); }
 }
 if(timedOut) {
  if(attempt===1){console.warn('Chromium bloqueado en '+widths.join('/')+'; reintento aislado con perfil nuevo');return runGroup(widths,2)}
  throw Error('Chromium agotó 2 intentos en '+widths.join('/')+'; '+stderr.slice(-1200));
 }
 assert.equal(code,0,'Chromium exit '+code+': '+stderr.slice(-1200));
 const result=stdout.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(result,'Chromium sin resultado en '+widths.join('/')+': '+stdout.slice(-1700)+' stderr '+stderr.slice(-900));
 assert.equal(result[1],'pass',result[2]);
 console.log('QA Chromium '+widths.join('/')+'px: '+result[2]);
}
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 for(const group of views)await runGroup(group,1);
 console.log('Preferencias fase 4: 320, 390, 768 y 1280 px — OK');
} finally {await new Promise(resolve=>server.close(resolve))}

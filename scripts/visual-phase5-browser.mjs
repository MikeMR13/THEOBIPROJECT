// Chromium local: teclado y preferencia de movimiento, sin red ni datos reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const ui=readFileSync('src/ui.js','utf8');
const m=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(m,'Falta CSS2 de la navegación');
const css=readFileSync('src/styles.css','utf8')+'\n'+JSON.parse(m[1])+'\n'+readFileSync('src/reader-a11y.css','utf8');
const sizes=[320,390,768,1024];
function sample(){
 const validate="addEventListener('load',()=>{try{const w=document.documentElement.clientWidth,r=matchMedia('(prefers-reduced-motion: reduce)').matches,fail=[];const skip=document.querySelector('.ob-skip'),im=document.querySelector('.rd-body img');if(skip.getBoundingClientRect().bottom>0)fail.push('Salto visible antes del foco');skip.focus();if(skip.getBoundingClientRect().top<0)fail.push('Salto oculto con foco');if(getComputedStyle(skip).outlineStyle==='none')fail.push('Sin foco visible');if(im.getBoundingClientRect().width>w-15)fail.push('Imagen fuera de pantalla');const a=getComputedStyle(document.querySelector('.ob-animation-sample')).animationName;if(r&&a!=='none')fail.push('No reduce el movimiento: '+a);if(!r&&a!=='obIn')fail.push('Animación editorial perdida: '+a);const q=document.getElementById('case-result');q.dataset.qaStatus=fail.length?'fail':'pass';q.textContent=fail.join('; ')||'OK '+w+(r?' reducido':' normal');}catch(e){const q=document.getElementById('case-result');q.dataset.qaStatus='fail';q.textContent=String(e);}});";
 return '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><style>body{margin:0}.sample{padding:10px}.sample>.rd{margin:10px 0;padding:10px;min-height:0}</style></head><body>'
 +'<a class="ob-skip" href="#app">Saltar al contenido principal</a><header class="top"><a href="/">El Obi del Lector</a></header>'
 +'<main id="app" class="sample" tabindex="-1"><span class="ob-page ob-animation-sample" aria-hidden="true" style="position:absolute;width:1px;height:1px;pointer-events:none"></span>'
 +'<section class="rd"><div class="rd-bar"><a class="rd-back" href="#">Volver</a><div class="rd-tools"><button class="btn ghost">Opciones</button><details class="rd-more"><summary>Más opciones</summary></details></div></div><article class="rd-ch"><header class="rd-head"><h2>Capítulo de ejemplo</h2></header><div class="rd-body"><p>Lectura de prueba.</p><figure><img width="1600" height="900" alt="Ilustración de prueba"></figure></div></article></section>'
 +'</main><p id="case-result" data-qa-status="running">QA_RUNNING</p><script>'+validate+'</script></body></html>';
}
function parent(){
 return '<!doctype html><html><body><p id="qa-result" data-qa-status="running">QA_RUNNING</p>'+sizes.map(w=>'<iframe width="'+w+'" height="700" title="Ancho '+w+'" src="/sample"></iframe>').join('')
 +'<script>const fs=[...document.querySelectorAll("iframe")];let done=0,bad=[];fs.forEach(f=>f.addEventListener("load",()=>{const a=f.contentDocument.getElementById("case-result");if(a?.dataset.qaStatus!=="pass")bad.push(f.width+": "+(a?.textContent||"sin resultado"));if(++done===fs.length){const q=document.getElementById("qa-result");q.dataset.qaStatus=bad.length?"fail":"pass";q.textContent=bad.join("; ")||"Anchos 320, 390, 768, 1024 OK";}}));</script></body></html>';
}
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(req.url?.startsWith('/sample')?sample():parent());});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no disponible');
async function visit(url,reduced){
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server','--incognito','--window-size=1500,1000','--virtual-time-budget=12000','--dump-dom'];
 if(reduced)args.push('--force-prefers-reduced-motion=reduce');
 args.push(url);
 const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
 p.stdout.on('data',d=>out+=String(d).slice(0,220000));
 p.stderr.on('data',d=>err+=String(d).slice(0,26000));
 const exit=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Chromium supera 55 segundos'))},55000);p.once('error',e=>{clearTimeout(timer);fail(e)});p.once('close',c=>{clearTimeout(timer);ok(c)})});
 assert.equal(exit,0,err.slice(-700));
 const st=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(st,'No se obtuvo resultado DOM');
 assert.equal(st[1],'pass',st[2]);
 console.log((reduced?'Movimiento reducido':'Animaciones normales')+': '+st[2]);
}
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const url='http://127.0.0.1:'+server.address().port;
 await visit(url,false);
 await visit(url,true);
}finally{await new Promise(ok=>server.close(ok))}

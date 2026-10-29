// Renderización de componentes reales (CSS de código) en Chromium sin acceso a red externa.
// QA sintético: NO sustituye la revisión visual autenticada.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
const ui=readFileSync('src/ui.js','utf8');
const extract=name=>{
 const open='const '+name+' = '+String.fromCharCode(96);
 const begin=ui.indexOf(open), end=ui.indexOf(String.fromCharCode(96)+';',begin+open.length);
 assert(begin>=0 && end>begin,'CSS no disponible: '+name);
 return ui.slice(begin+open.length,end);
};
const css2 = ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(css2, 'No se encontró CSS2 de navegación');
const css=readFileSync('src/styles.css','utf8')+'\n'+extract('CSS')+'\n'+JSON.parse(css2[1])+'\n'+extract('HOME_CSS')+'\n'+readFileSync('src/studio.css','utf8');
function sample(){
 const cover='<div class="ui-book" style="background:#343f53"><div class="ui-obi slim"><small>Equipo traductor</small></div></div>';
 const card='<a class="ui-card" href="#">'+cover+'<h3>Novela de ejemplo con título suficientemente largo para evaluar ancho</h3><span class="meta">En traducción · 5 capítulos</span></a>';
 const article='<article class="s2-work" style="--c:#f2c230"><a class="cv" href="#"><span>Portada de respaldo</span></a><div class="bd"><h2>Un título literario extenso para móvil</h2></div></article>';
 const check='window.addEventListener("load",()=>{const names=[".ui-card",".ui-vol",".ob-ann",".s2-work",".ui-sh"];const width=document.documentElement.clientWidth;const fail=[];for(const n of names){for(const el of document.querySelectorAll(n)){if(el.closest(".ob-car"))continue;const r=el.getBoundingClientRect();if(r.left< -3||r.right>width+3)fail.push(n+" desbordado a "+width)}}const p=document.getElementById("case-result");p.dataset.qaStatus=fail.length?"fail":"pass";p.textContent=fail.join(", ")||"OK "+width;});';
 return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><style>body{margin:0;padding:10px;overflow-x:hidden}.ui-grid,.ob-anns,.ui-sh,.ui-vol,.s2-work{margin:15px 0}</style></head><body><div class="ui-grid">'+card.repeat(3)+'</div><div class="ob-car">'+card.repeat(3)+'</div><div class="ob-anns"><article class="ob-ann" style="--tc:#f2c230"><h3>Anuncios de equipos</h3><p>Una actualización editorial larga para pantallas estrechas.</p></article></div><section class="ui-sh"><div class="ui-book"></div><div><h1>Obra con un título extenso</h1></div></section><article class="ui-vol"><span class="th"></span><div><h3>Volumen uno</h3></div></article>'+article+'<p id="case-result" data-qa-status="running"></p><script>'+check+'</script></body></html>';
}
const widths=[320,390,768,1024,1440];
const parent='<html><body><p id="qa-result" data-qa-status="running">QA_RUNNING</p>'+widths.map(w=>'<iframe title="Ancho '+w+'" width="'+w+'" height="700" src="/sample"></iframe>').join('')+'<script>const f=[...document.querySelectorAll("iframe")];let n=0,fail=[];f.forEach(x=>x.addEventListener("load",()=>{const v=x.contentDocument.getElementById("case-result");if(v?.dataset.qaStatus!=="pass")fail.push(x.width+": "+(v?.textContent||"sin resultado"));if(++n===f.length){const p=document.getElementById("qa-result");p.dataset.qaStatus=fail.length?"fail":"pass";p.textContent=fail.join("; ")||"Chromium 320, 390, 768, 1024 y 1440 px OK";}}));</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(req.url?.startsWith('/sample')?sample():parent)});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no está instalado');
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server','--incognito','--window-size=1600,900','--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:'+server.address().port];
 const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
 p.stdout.on('data',d=>out+=String(d).slice(0,200000));
 p.stderr.on('data',d=>err+=String(d).slice(0,30000));
 const code=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{p.kill('SIGKILL');fail(Error('QA Chrome timeout'))},55000);p.once('error',e=>{clearTimeout(timer);fail(e)});p.once('close',c=>{clearTimeout(timer);ok(c)})});
 assert.equal(code,0,err.slice(-700));
 const m=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(m,'No se encontró el resultado de los marcos');
 assert.equal(m[1],'pass',m[2]);
 console.log('Fase visual 4 · '+m[2]);
}finally{await new Promise(ok=>server.close(ok))}

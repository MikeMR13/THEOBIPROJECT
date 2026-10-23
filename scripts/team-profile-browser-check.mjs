// Prueba real Chromium responsive, sin credenciales ni acceso a Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { render } from '../src/teampage.js';
const widths=[320,390,768,1024,1440];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data={
 t:{id:'g',slug:'grupo-demo',name:'Equipo de traducción de ejemplo',color:'#f2c230',settings:{show_works:true,show_members:true,show_stats:true,show_featured:true}},
 works:[{id:'w',slug:'novela',title:'Novela ligera de ejemplo',short:'Novela',synopsis:'Fantasía y aventuras',chapters:[{count:12}],translation_status:'active'}],
 mem:[{role:'owner',profiles:{username:'Editora'},team_roles:{name:'Propietaria'}}],
 next:{at:'2027-01-01T12:00:00Z',series:{slug:'novela',title:'Novela ligera de ejemplo'}},
 recent:[{id:'c',kind:'chapter',series_id:'w',series:{slug:'novela',title:'Novela'},title:'Capítulo doce',chapter:12,at:'2026-10-22T10:00:00Z',href:'/leer/novela/12'}]
};
const design={
 order:['featured','next','recent','works','members','announce','stats'],featured:['novela'],
 editorial:{featureStyle:'editorial'},composition:{columns:'dos'},
 mobile:{orderMode:'propio',order:['members','recent','featured','works','next','announce','stats'],hero:'compacto',catalog:'una',follow:'mostrar'}
};
const page=render(data,design,{esc,media:x=>x,sim:''});
const checks=[
 "import {bind,ensureFonts} from '/teampage.js';",
 "const errors=[];try{",
 "ensureFonts([]); const root=document.querySelector('.tp2'); bind(root);",
 "await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));",
 "const w=document.documentElement.clientWidth, mobile=w<=640, comp=document.querySelector('.tp2-composition');",
 "const order=Array.from(comp.children).map(n=>n.dataset.section);",
 "const expected=mobile?['members','recent','featured','works','next','stats']:['featured','recent','works','members','stats'];",
 "if(JSON.stringify(order)!==JSON.stringify(expected))errors.push('orden '+order.join(','));",
 "if(document.querySelectorAll('#grupo-destacadas').length!==1||document.querySelectorAll('#grupo-lanzamientos').length!==1)errors.push('IDs duplicados');",
 "if(document.querySelectorAll('a[href=\"#grupo-obras\"]').length!==1)errors.push('navegación ausente');",
 "const grid=getComputedStyle(comp).gridTemplateColumns.trim().split(/\\s+/).length;",
 "if(mobile&&grid!==1||w>=1024&&grid!==2)errors.push('columnas '+grid);",
 "const bar=getComputedStyle(document.querySelector('.tp2-fbar')).display;",
 "if(mobile&&bar==='none'||!mobile&&bar!=='none')errors.push('barra seguir '+bar);",
 "const overflow=document.documentElement.scrollWidth-w;if(overflow>4)errors.push('desbordamiento '+overflow);",
 "const b=document.querySelector('.tp2-car-nav button')?.getBoundingClientRect();",
 "if(b&&(b.width<43||b.height<43))errors.push('botón carrusel');",
 "}catch(e){errors.push(e.message)}",
 "const q=document.getElementById('case-result');q.dataset.qaStatus=errors.length?'fail':'pass';q.textContent=errors.join('; ')||'OK';"
].join('\n');
const sample='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>'+
 page+'<p id="case-result" data-qa-status="running">RUNNING</p><script type="module">'+checks+'</script></body></html>';
const parent='<!doctype html><html><head><meta charset="utf-8"></head><body><p id="qa-result" data-qa-status="running">QA_RUNNING</p>'+
 widths.map(w=>'<iframe title="Perfil '+w+'" width="'+w+'" height="800" src="/sample"></iframe>').join('')+
 '<script>let pending='+widths.length+',errors=[];for(const x of document.querySelectorAll("iframe"))x.addEventListener("load",()=>{const p=x.contentDocument.getElementById("case-result");if(p?.dataset.qaStatus!=="pass")errors.push(x.width+": "+(p?.textContent||"sin resultado"));if(!--pending){const q=document.getElementById("qa-result");q.dataset.qaStatus=errors.length?"fail":"pass";q.textContent=errors.join(" | ")||"Perfil grupal Chromium 320/390/768/1024/1440 OK";}})</script></body></html>';
const server=createServer((req,res)=>{
 const url=new URL(req.url||'/', 'http://127.0.0.1');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'");
 if(url.pathname==='/teampage.js'||url.pathname==='/anim.js'){
  res.setHeader('Content-Type','text/javascript; charset=utf-8');
  res.end(readFileSync(url.pathname==='/teampage.js'?'src/teampage.js':'src/anim.js'));return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(url.pathname==='/sample'?sample:parent);
});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no está instalado');
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',
 '--no-proxy-server','--incognito','--window-size=1600,900','--virtual-time-budget=20000','--dump-dom',
 'http://127.0.0.1:'+server.address().port];
 const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
 child.stdout.on('data',x=>out+=String(x));child.stderr.on('data',x=>err+=String(x).slice(0,35000));
 const code=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium timeout'))},55000);
  child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('close',c=>{clearTimeout(timer);resolve(c)});
 });
 assert.equal(code,0,err.slice(-850));
 const match=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(match,'No se encontró el resultado responsive');
 assert.equal(match[1],'pass',match[2]);
 console.log(match[2]);
}finally{await new Promise(ok=>server.close(ok))}

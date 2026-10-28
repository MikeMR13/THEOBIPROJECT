// Regresión real de layout CSS: nombres y acciones legibles a anchuras de iPhone.
// Fixture editorial sintética; no requiere backend, credenciales ni servicios de pago.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

const css=readFileSync('src/styles.css','utf8'), ui=readFileSync('src/ui.js','utf8');
const begin='const CSS = `',a=ui.indexOf(begin),b=ui.indexOf('`;',a+begin.length);
assert(a>=0&&b>a,'No se encontró CSS de ficha');const inline=ui.slice(a+begin.length,b);
const match=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(match,'No se encontró CSS de cabecera');const headerCSS=JSON.parse(match[1]);
assert(css.includes('.ui-series-page .ui-v-index .ui-chl li>a'),'No se corrigió el índice');
const share=readFileSync('src/share.js','utf8');
assert(share.includes("document.querySelector('.tp2-page .tp2-links')"),'Compartir debe estar con los enlaces del equipo');
assert(share.includes("el.dataset.placement = 'team'; target.append(el)"),'Compartir no debe flotar antes del banner');
assert(ui.includes("const continueLabel = p =>"),'Continuar leyendo necesita número editorial');
assert(ui.includes("formatChapterIndex({title:chapter.title,sectionType:chapter.section_type})"),'Usar datos editoriales del capítulo');
assert(ui.includes("void hydrateContinueTitles(nextCont)"),'La numeración remota debe actualizarse tras el progreso');
assert(!ui.includes('<span class="ob-continue-chapter">CAP. ${esc(p.chapter_num)}</span>'),'Nunca exponer global en etiqueta de Continuar');
assert(!ui.includes('<span class="ob-continue-location">Sigue en el cap. ${esc(p.chapter_num)}</span>'),'Nunca exponer global en ubicación');
assert(css.includes('.s2 .imp-fg textarea[name="synopsis"]'),'Sinopsis de volumen no se adaptó al móvil');

const list=Array.from({length:3},(_,i)=>`<li>
  <a href="/leer/demo/${39+i}"><span class="n" aria-hidden="true">${i===1?'◆':'0'+(i+1)}</span>
    <span class="ui-ch-display"><small class="ui-ch-type">${i===1?'CRÉDITOS':'CAPÍTULO'}</small>
    <span class="ui-ch-name">${i===0?'Portada y créditos':i===1?'Sinopsis':'La Bruja del Silencio y la ciudad de los misterios que todos habían olvidado'}</span></span></a>
  <button class="ui-read-chapter">✓ Leído</button>
  <button class="ui-read-chapter">↓ Descargar capítulo</button>
</li>`).join('');

const page=`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}\n${inline}\n${headerCSS}
body{--gold:#f2c230;--paper:#f3ecd9;--mute:#a89f8a;--line:#2f2a20}
.test{margin:0 auto;max-width:100%;padding:12px}
</style></head><body>
<header class="top"><a class="ob-brand" href="/"><span class="ob-seal">帯</span><span class="ob-word"><b>El Obi del Lector</b></span></a>
<nav class="ob-nav"><a href="/">Inicio</a></nav>
<div class="ob-tools"><div id="session"><button aria-label="Avisos">鈴</button><button aria-label="Cuenta">OX</button></div></div></header>
<main class="test"><section class="ob-page"><section class="ob-sec"><div class="ob-st">
 <span class="k">推薦</span><h2>Para ti</h2><span class="r2"><span class="mono">porque lees Comedia y Escolar</span><button>‹</button><button>›</button></span>
 </div></section></section>
 <div class="ui-wrap ui-series-page"><section class="ui-series-library ui-series-panel" id="serie-vols">
  <div class="ui-vols is-galeria"><article class="ui-vol ui-vol-book"><div class="ui-v-content">
  <details open class="ui-v-index"><summary>Índice de capítulos</summary><ul class="ui-chl">${list}</ul></details></div></article></div>
 </section></div>
 <div class="ui-wrap ui-series-page"><section class="ui-series-library ui-series-panel">
  <div class="ui-vols is-lista"><article class="ui-vol ui-vol-book"><span class="ui-v-cover"></span><div class="ui-v-content">
  <details open class="ui-v-index"><summary>Índice de capítulos</summary><ul class="ui-chl">${list}</ul></details></div></article></div>
 </section></div>
 <div id="result" data-qa="running"></div></main>
<script>addEventListener('load',()=>{
 const e=[],w=innerWidth,head=document.querySelector('header.top');
 const intersects=(a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.left<y.right-1&&x.right>y.left+1&&x.top<y.bottom-1&&x.bottom>y.top+1};
 for (const [i,li] of [...document.querySelectorAll('.ui-v-index .ui-chl li')].entries()){
  const link=li.querySelector('a'),buttons=[...li.querySelectorAll('button')],name=li.querySelector('.ui-ch-display');
  const lr=link.getBoundingClientRect(),nr=name.getBoundingClientRect(),br=li.getBoundingClientRect();
  if(lr.width<Math.min(170,w*.46))e.push('Enlace estrecho '+i+' '+Math.round(lr.width));
  if(nr.width<105)e.push('Etiqueta estrecha '+i+' '+Math.round(nr.width));
  if(buttons.some(b=>intersects(link,b)))e.push('Botón encima del título '+i);
  if(buttons.some(b=>b.getBoundingClientRect().right>br.right+2))e.push('Botón fuera de tarjeta '+i);
  if(buttons.some(b=>b.getBoundingClientRect().height<42))e.push('Botón táctil bajo '+i);
  if(getComputedStyle(name.querySelector('.ui-ch-type')).writingMode!=='horizontal-tb')e.push('Etiqueta vertical '+i);
 }
 if(w<=640){
  const tools=head.querySelector('.ob-tools'),brand=head.querySelector('.ob-brand');
  if(head.querySelector('.ob-mbtn'))e.push('Hamburguesa duplicada en cabecera');
  if(getComputedStyle(head.querySelector('.ob-nav')).display!=='none')e.push('Navegación duplicada visible');
  if(intersects(brand,tools))e.push('Cabecera superpuesta');
  if(head.getBoundingClientRect().height>92)e.push('Cabecera alta '+head.getBoundingClientRect().height);
  const h=document.querySelector('.ob-st h2');
  if(h.getBoundingClientRect().height>65)e.push('Título Para ti vertical');
 }
 if(document.documentElement.scrollWidth>w+3)e.push('Desbordamiento horizontal '+document.documentElement.scrollWidth+' > '+w);
 const q=document.querySelector('#result');q.dataset.qa=e.length?'fail':'pass';q.textContent=e.join('; ')||'OK '+w;
});</script></body></html>`;
const widths=[320,375,390,430,768,1024];
const parent='<!doctype html><html><body><p id="qa" data-qa="running">RUNNING</p>'+
 widths.map(w=>'<iframe title="móvil '+w+'" width="'+w+'" height="1200" src="/case"></iframe>').join('')+
 '<script>let done=0,bad=[];document.querySelectorAll("iframe").forEach(f=>f.addEventListener("load",()=>{let tries=0;const read=()=>{const q=f.contentDocument.querySelector("#result");if(q?.dataset.qa==="running"&&++tries<60)return requestAnimationFrame(read);if(q?.dataset.qa!=="pass")bad.push(f.width+": "+(q?.textContent||"sin respuesta"));if(++done===6){const o=document.querySelector("#qa");o.dataset.qa=bad.length?"fail":"pass";o.textContent=bad.join(" | ")||"Índice, controles y cabecera: 320-1024 OK"}};read();}));</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(req.url==='/case'?page:parent)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(bin,'Se necesita Chromium');
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const c=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--window-size=1660,1100','--virtual-time-budget=13000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
 let out='',err='';c.stdout.on('data',x=>out+=String(x).slice(0,240000));c.stderr.on('data',x=>err+=String(x).slice(0,12000));
 const code=await new Promise((ok,fail)=>{const t=setTimeout(()=>{c.kill('SIGKILL');fail(Error('Chromium timeout'))},55000);c.once('error',e=>{clearTimeout(t);fail(e)});c.once('close',n=>{clearTimeout(t);ok(n)})});
 assert.equal(code,0,err.slice(-700));const result=out.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);assert(result,'Sin resultado de Chromium');assert.equal(result[1],'pass',result[2]);console.log(result[2]);
} finally{await new Promise(ok=>server.close(ok))}

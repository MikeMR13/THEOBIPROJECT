// Ficha editorial pública F1–F2: contratos y Chromium sintético en 5 resoluciones.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { formatChapterIndex } from '../src/chapter-title-display.js';
const src = readFileSync('src/ui.js', 'utf8'), css = readFileSync('src/styles.css', 'utf8');
const checks = [
  ['Galería y lista', 'data-series-view="galeria"'],
  ['Selector de lista', 'data-series-view="lista"'],
  ['Persistencia de preferencia', "localStorage.setItem('obi-serie-vol-view', view)"],
  ['Navegación editorial', 'class="ui-series-nav" role="tablist"'],
  ['Ficha con editorial', 's.publisher ?'],
  ['Portada individual', 'class="th ui-v-cover'],
  ['Índice plegable', '<details class="ui-v-index">'],
  ['Ancla volúmenes', 'id="serie-vols"'],
  ['Acciones de lectura', 'Leer desde el inicio'],
  ['Omitir preliminares cuando el lector lo elija', 'Ir al primer capítulo'],
  ['Enlaces externos', 'v.external_url ?'],
  ['Descargas seguras', 'data-dl="${d.id}"'],
  ['Compra oficial', 'data-buy="${b.id}"'],
  ['Reseñas', 'id="rv-sec"'],
  ['Seguimiento', "$('#follow').onclick"],
  ['Solo volúmenes publicados', ".eq('status', 'published').is('deleted_at', null)"]
];
for (const [label, token] of checks) assert(src.includes(token), label + ': no se encuentra ' + token);
const start = src.indexOf("const dlOf = v =>"), render = src.slice(start, src.indexOf("app.querySelectorAll('[data-buy]')", start));
assert(render.indexOf('ui-dl-featured') > render.indexOf('id="serie-descargas"'), 'Descargas fuera de su nueva sección');
assert(render.includes('href="#serie-descargas"'), 'No hay acceso a descargas desde libros');
assert(render.includes('d.locked || vLk'), 'Se perdieron restricciones a descargas');
assert(render.includes("read.has(c.id)"), 'Se perdió la marca de capítulos leídos');
assert(css.includes('.ui-vols.is-galeria') && css.includes('.ui-vols.is-lista'), 'Falta CSS de ambos modos');
const tick = String.fromCharCode(96), prefix = 'const CSS = ' + tick;
const a = src.indexOf(prefix), b = src.indexOf(tick + ';', a + prefix.length);
assert(a >= 0 && b > a, 'CSS público de ui.js no encontrado');
const styles = css + '\n' + src.slice(a + prefix.length, b);
// Datos ficticios representativos del índice universal: número editorial, prólogos, títulos extensos.
const chapters = Array.from({length:18}, (_,i)=>{
  const raw=i===0?'Capítulo 1: La Bruja del Silencio, o la Bruja que Tropieza con sus Palabras y descubre un secreto que nadie quiso contar en el antiguo castillo':i===1?'Prólogo: El Dragón Negro de Worgan':'Capítulo '+(i+1)+': Un encuentro inesperado';
  const type=i===1?'Prólogo':'Capítulo', p=formatChapterIndex({title:raw,sectionType:type});
  return '<li><a href="/leer/demo/'+(i+24)+'"><span class="n" aria-hidden="true">'+(p.number||'◆')+'</span><span class="ui-ch-display"><small class="ui-ch-type">'+p.label+'</small><span class="ui-ch-name">'+p.heading+'</span></span></a></li>';
}).join('');
assert(!chapters.includes('Sección global 24'),'No mostrar número global en la ficha.');
const card = i => '<article class="ui-vol ui-vol-book"><span class="th ui-v-cover no-cover" role="img" aria-label="Portada del volumen '+i+'"><span class="ui-v-spine"></span><span class="ui-v-placeholder">帯<small>VOLUMEN '+i+'</small></span></span><div class="ui-v-content"><div class="ui-v-heading"><span class="ui-lbl">LIBRO '+i+' · 17 capítulos numerados · 1 sección sin número</span><h3>Volumen '+i+'</h3><p class="ui-v-syn">Una sinopsis extensa sobre este volumen y la biblioteca.</p></div>'+(i===1?'<div class="ui-dl ui-dl-featured" role="group" aria-label="Descargas del volumen 1"><span class="ui-lbl ui-dl-title">↓ Descargar Volumen 1</span><button class="ui-dlb ui-dlb-dl" data-dl="2">↓ EPUB<small>Google Drive</small></button><button class="ui-dlb ui-dlb-dl" data-dl="3">↓ PDF<small>Google Drive</small></button></div>':'')+'<div class="ui-v-actions"><a class="btn" href="/leer/demo/24">Leer desde el inicio →</a><a class="btn ghost ui-v-first-chapter" href="/leer/demo/26">Ir al primer capítulo</a></div><details class="ui-v-index"><summary>Índice de capítulos y secciones <span class="mono">18 · desplegar ⌄</span></summary><ul class="ui-chl">'+chapters+'</ul></details></div></article>';
const check = "addEventListener('load',()=>{const errors=[],shelf=document.querySelector('#fx-vols'),buttons=[...document.querySelectorAll('[data-series-view]')],w=window.innerWidth;try{const test=(label)=>{if(document.documentElement.scrollWidth>w+2)errors.push(label+': ancho '+document.documentElement.scrollWidth+' > '+w+' :: '+[...document.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().right>w+1).slice(0,7).map(x=>x.tagName+'.'+String(x.className).slice(0,25)+':'+Math.round(x.getBoundingClientRect().right)).join(','));for(const x of document.querySelectorAll('.ui-dl-featured button')){const r=x.getBoundingClientRect();if(r.height<43||r.width<90)errors.push(label+': botón descargas '+Math.round(r.width)+'x'+Math.round(r.height));}if(document.querySelectorAll('.ui-vol-book').length!==3)errors.push(label+': faltan libros');};test('galeria');if(!shelf.classList.contains('is-galeria'))errors.push('sin galeria');buttons[1].click();if(!shelf.classList.contains('is-lista')||buttons[1].getAttribute('aria-pressed')!=='true')errors.push('no cambia a lista');test('lista');buttons[0].click();if(!shelf.classList.contains('is-galeria'))errors.push('no vuelve a galeria');for(const idx of document.querySelectorAll('.ui-v-index')){if(idx.open)errors.push('índice abierto por defecto');idx.querySelector('summary').click();if(!idx.open||idx.querySelectorAll('li').length!==18)errors.push('índice no despliega');}if(!document.querySelector('.ui-dl-featured'))errors.push('sin descarga');}catch(e){errors.push(String(e));}const q=document.querySelector('#result');q.dataset.qa=errors.length?'fail':'pass';q.textContent=errors.join('; ')||'OK '+w;});";
const scriptActions = "document.querySelectorAll('[data-series-view]').forEach(b=>b.onclick=()=>{const view=b.dataset.seriesView,shelf=document.querySelector('#fx-vols');shelf.classList.toggle('is-galeria',view==='galeria');shelf.classList.toggle('is-lista',view==='lista');document.querySelectorAll('[data-series-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});";
const page='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'</style><style>:root{--gold:#f2c230;--paper:#f3ecd9;--line:#2f2a20;--mute:#a89f8a}body{margin:0;background:#0d0c0a;color:var(--paper);font-family:Arial,sans-serif}.sample{box-sizing:border-box;padding:16px;max-width:1160px;margin:auto}</style></head><body><main class="sample ui-series-page"><nav class="ui-series-nav" aria-label="Secciones de la obra"><a href="#vols">Volúmenes</a><a href="#reviews">Reseñas</a></nav><section id="vols" class="ui-series-library"><div class="ui-h2"><h2>Volúmenes</h2></div><div class="ui-series-shelfbar"><span class="mono">Colección de 3 libros</span><div class="ui-series-views" role="group" aria-label="Vista de volúmenes"><button data-series-view="galeria" aria-pressed="true">▦ Galería</button><button data-series-view="lista" aria-pressed="false">☷ Lista</button></div></div><div class="ui-vols is-galeria" id="fx-vols">'+[1,2,3].map(card).join('')+'</div></section><p id="result" data-qa="running"></p></main><script>'+scriptActions+check+'</script></body></html>';
const sizes=[320,390,768,1024,1440];
const parent='<!doctype html><html><body><p id="qa" data-qa="running">RUNNING</p>'+sizes.map(w=>'<iframe width="'+w+'" height="1600" src="/sample"></iframe>').join('')+'<script>const fs=[...document.querySelectorAll("iframe")];let n=0,bad=[];fs.forEach(f=>f.addEventListener("load",()=>{const r=f.contentDocument.querySelector("#result");if(r?.dataset.qa!=="pass")bad.push(f.width+": "+(r?.textContent||"sin respuesta"));if(++n===fs.length){const q=document.querySelector("#qa");q.dataset.qa=bad.length?"fail":"pass";q.textContent=bad.join(" | ")||"Ficha editorial: galería, lista e índices OK en 5 resoluciones"}}));</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(req.url==='/sample'?page:parent)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin, 'Chromium no está disponible');
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const c=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--window-size=1600,1000','--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  c.stdout.on('data',d=>out+=String(d).slice(0,220000));c.stderr.on('data',d=>err+=String(d).slice(0,14000));
  const code=await new Promise((ok,fail)=>{const t=setTimeout(()=>{c.kill('SIGKILL');fail(Error('Chromium timeout'))},55000);c.once('error',e=>{clearTimeout(t);fail(e)});c.once('close',n=>{clearTimeout(t);ok(n)})});
  assert.equal(code,0,err.slice(-700));
  const m=out.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(m,'No se recibió resultado de Chromium');assert.equal(m[1],'pass',m[2]);
  console.log('Fases 1–2: '+m[2]);
}finally{await new Promise(ok=>server.close(ok))}

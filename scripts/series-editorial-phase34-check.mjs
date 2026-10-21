// Fases 3–4: pruebas de búsqueda, orden, progreso y responsive con datos ficticios.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { chapterMatches, compareVolumeNumbers, normalizeSeriesText, volumeProgress } from '../src/series-organization.js';
assert.equal(normalizeSeriesText('¡Capítulo 2: La despedida!'), 'capitulo 2 la despedida');
assert.equal(chapterMatches({num:2,title:'La Biblioteca',read:false,newly:true},'biblioteca','all'),true);
assert.equal(chapterMatches({num:2,title:'La Biblioteca',read:false,newly:true},'CAPÍTULO 2','all'),true);
assert.equal(chapterMatches({num:2,title:'La Biblioteca',read:false,newly:true},'biblioteca','read'),false);
assert.equal(chapterMatches({num:2,title:'La Biblioteca',read:false,newly:true},'biblioteca','new'),true);
assert.equal(chapterMatches({num:2,title:'La Biblioteca',read:false,newly:true},'otra','all'),false);
assert.equal(compareVolumeNumbers('10','2','asc')>0,true);
assert.equal(compareVolumeNumbers('10','2','desc')<0,true);
assert.deepEqual(volumeProgress([{id:'a'},{id:'b'},{id:'c'}],new Set(['a','c'])),{total:3,read:2,pct:67});
assert.deepEqual(volumeProgress([],new Set()),{total:0,read:0,pct:0});
const ui=readFileSync('src/ui.js','utf8'),css=readFileSync('src/styles.css','utf8');
for(const token of ['initSeriesOrganization(app)','data-chapter-title=','data-chapter-new=','data-chapter-read=','volumeProgress(list, read)','ui-series-search','ui-series-state','ui-series-order','ui-series-result','loading="lazy" decoding="async" fetchpriority="low"','class="ui-series-clear"'])assert(ui.includes(token),'Falta componente: '+token);
for(const token of ['.ui-series-library [hidden]','@media(max-width:580px)','@media(prefers-reduced-motion:reduce)','.ui-vols .ui-v-cover img'])assert(css.includes(token),'Falta CSS: '+token);
const mark='const CSS = '+String.fromCharCode(96),i=ui.indexOf(mark),end=ui.indexOf(String.fromCharCode(96)+';',i+mark.length);
assert(i>=0&&end>i,'Falta CSS base de obra');
const allCss=css+'\n'+ui.slice(i+mark.length,end);
const img='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#272015"/></svg>');
const row=(num,title,read,newly)=>'<li data-chapter-num="'+num+'" data-chapter-title="'+title+'" data-chapter-read="'+read+'" data-chapter-new="'+newly+'" class="'+(read?'is-read':'')+'"><a href="/leer/demo/'+num+'"><span class="n">'+num+'</span><span>'+title+'</span></a></li>';
const article=(num,chapters)=>'<article class="ui-vol ui-vol-book" data-vol-num="'+num+'"><span class="th ui-v-cover has-cover" role="img" aria-label="Portada del volumen '+num+'"><img src="'+img+'" alt="" loading="lazy" decoding="async" fetchpriority="low" width="240" height="360"></span><div class="ui-v-content"><div class="ui-v-heading"><span class="ui-lbl">LIBRO '+num+'</span><h3>Volumen '+num+'</h3></div><div class="ui-volume-progress" aria-label="Progreso del volumen '+num+'"><span>1 de '+chapters.length+' leídos</span><b>50%</b><div class="ui-volume-progress-track"><i style="width:50%"></i></div></div><div class="ui-dl ui-dl-featured"><span class="ui-lbl ui-dl-title">↓ Descargar Volumen '+num+'</span><button class="ui-dlb ui-dlb-dl">↓ EPUB</button></div><details class="ui-v-index"><summary>Índice de capítulos</summary><ul class="ui-chl">'+chapters.join('')+'</ul></details></div></article>';
const cards=[
article(3,[row(8,'Un mundo nuevo',false,false)]),
article(2,[row(6,'Primera misión',true,false),row(7,'La despedida',false,false)]),
article(1,[row(1,'El amanecer',true,false),row(2,'Encuentro en la biblioteca',false,true),row(3,'El capítulo extra',false,false)])
].join('');
const innerScript=[
"import { initSeriesOrganization } from '/series-organization.js';",
"const test=document.querySelector('#result'),root=document,box=root.querySelector('#fx-vols'),q=root.querySelector('#ui-series-search'),f=root.querySelector('#ui-series-state'),o=root.querySelector('#ui-series-order'),clear=root.querySelector('#ui-series-clear');",
"const errors=[];const chk=(condition,msg)=>{if(!condition)errors.push(msg)};",
"const api=initSeriesOrganization(root,localStorage);chk(!!api,'falta controlador');",
"const order=()=>[...box.children].filter(x=>x.matches('.ui-vol-book')).map(x=>x.dataset.volNum).join(',');",
"const vis=()=>[...box.children].filter(x=>x.matches('.ui-vol-book')&&!x.hidden).map(x=>x.dataset.volNum).join(',');",
"const checkSize=label=>{const w=window.innerWidth;chk(document.documentElement.scrollWidth<=w+2,label+': desborde '+document.documentElement.scrollWidth+'/'+w);for(const b of root.querySelectorAll('.ui-dlb-dl')){const r=b.getBoundingClientRect();if(!b.closest('[hidden]'))chk(r.width>=90&&r.height>=43,label+': botón '+Math.round(r.width)+'x'+Math.round(r.height));}};",
"chk(order()==='3,2,1','orden inicial');chk(vis()==='3,2,1','volúmenes iniciales');",
"chk(root.querySelectorAll('.ui-v-cover img[loading=\"lazy\"]').length===3,'portadas sin lazy');",
"chk(root.querySelectorAll('.ui-volume-progress').length===3,'sin progreso por libro');checkSize('inicial');",
"q.value='biblioteca';q.dispatchEvent(new Event('input'));api.refresh();",
"chk(vis()==='1','búsqueda por título');chk(box.querySelector('[data-vol-num=\"1\"] .ui-v-index').open,'índice sin abrir');",
"chk(root.querySelector('#ui-series-result').textContent.includes('1 capítulo'),'contador erróneo');",
"q.value='CAPÍTULO 2';q.dispatchEvent(new Event('input'));api.refresh();chk(vis()==='1','búsqueda por número');",
"q.value='';f.value='read';f.dispatchEvent(new Event('change'));api.refresh();",
"chk(vis()==='2,1','filtro leído: volúmenes');chk(box.querySelectorAll('li:not([hidden])[data-chapter-read=\"true\"]').length===2,'filtro leído: capítulos');",
"f.value='unread';f.dispatchEvent(new Event('change'));api.refresh();chk(vis()==='3,2,1','filtro sin leer');",
"f.value='new';f.dispatchEvent(new Event('change'));api.refresh();chk(vis()==='1','filtro novedades');",
"f.value='all';o.value='asc';o.dispatchEvent(new Event('change'));api.refresh();chk(order()==='1,2,3','orden ascendente');checkSize('ascendente');",
"o.value='desc';o.dispatchEvent(new Event('change'));api.refresh();chk(order()==='3,2,1','orden descendente');",
"q.value='inexistente';q.dispatchEvent(new Event('input'));api.refresh();chk(vis()==='','búsqueda sin resultados');",
"chk(!root.querySelector('#ui-series-empty').hidden,'mensaje sin resultados');",
"clear.click();api.refresh();chk(vis()==='3,2,1','limpieza');chk(q.value===''&&f.value==='all','limpieza de filtros');chk(root.querySelector('#ui-series-empty').hidden,'ocultar vacío');",
"checkSize('limpiado');test.dataset.status=errors.length?'fail':'pass';test.textContent=errors.join(' | ')||'PASS '+window.innerWidth;"
].join('\n');
const page='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+allCss+'</style><style>:root{--gold:#f2c230;--paper:#f3ecd9;--line:#2f2a20;--mute:#a89f8a}body{margin:0;background:#0d0c0a;color:var(--paper);font-family:Arial,sans-serif}.sample{max-width:1080px;box-sizing:border-box;padding:16px;margin:auto}</style></head><body><main class="sample"><section id="serie-vols" class="ui-series-library"><div class="ui-series-tools" role="search"><label>Buscar<input id="ui-series-search" type="search" placeholder="Capítulo"></label><label>Estado<select id="ui-series-state"><option value="all">Todos</option><option value="read">Leídos</option><option value="unread">Sin leer</option><option value="new">Novedades</option></select></label><label>Orden<select id="ui-series-order"><option value="desc">Recientes</option><option value="asc">Desde el primero</option></select></label><button type="button" id="ui-series-clear" class="ui-series-clear" disabled>Limpiar filtros</button></div><p id="ui-series-result" role="status"></p><div class="ui-series-shelfbar"><span>Colección de 3 libros</span></div><div class="ui-vols is-galeria" id="fx-vols">'+cards+'</div><p id="ui-series-empty" hidden>No se encontraron capítulos.</p></section><p id="result" data-status="running"></p></main><script type="module">'+innerScript+'</script></body></html>';
const sizes=[320,390,768,1024,1440];
const check=[
"const frames=[...document.querySelectorAll('iframe')];let done=0,errors=[];",
"frames.forEach(f=>f.addEventListener('load',()=>{const p=f.contentDocument.querySelector('#result');if(p?.dataset.status!=='pass')errors.push(f.width+': '+(p?.textContent||'sin verificación'));if(++done===frames.length){const q=document.querySelector('#qa');q.dataset.status=errors.length?'fail':'pass';q.textContent=errors.join(' | ')||'Series F3-F4: 5 tamaños, búsqueda, filtros, progreso y orden OK';}}));"
].join('\n');
const parent='<html><body><p id="qa" data-status="running">RUNNING</p>'+sizes.map(w=>'<iframe width="'+w+'" height="1200" src="/fixture"></iframe>').join('')+'<script>'+check+'</script></body></html>';
const server=createServer((req,res)=>{const mod=req.url==='/series-organization.js';res.setHeader('Content-Type',mod?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'; img-src data:");res.end(mod?readFileSync('src/series-organization.js','utf8'):req.url==='/fixture'?page:parent)});
const browser=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(browser,'Chromium no disponible');
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--window-size=1680,1100','--virtual-time-budget=13000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
  let output='',err='';
  child.stdout.on('data',d=>output+=String(d).slice(0,230000));child.stderr.on('data',d=>err+=String(d).slice(0,12000));
  const exit=await new Promise((yes,no)=>{const t=setTimeout(()=>{child.kill('SIGKILL');no(Error('Chromium timeout'))},55000);child.once('error',e=>{clearTimeout(t);no(e)});child.once('close',c=>{clearTimeout(t);yes(c)})});
  assert.equal(exit,0,err.slice(-900));
  const result=output.match(/<p id="qa" data-status="(pass|fail)">([\s\S]*?)<\/p>/);assert(result,'Chromium no devolvió resultado');assert.equal(result[1],'pass',result[2]);console.log(result[2]);
}finally{await new Promise(resolve=>server.close(resolve))}

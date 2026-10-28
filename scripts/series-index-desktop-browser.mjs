// Contrato visual universal del índice: galería de 4 libros en PC, lista y móvil.
// Datos sintéticos locales; sin consultas a Supabase ni a producción.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

const source=readFileSync('src/ui.js','utf8');
const begin='const CSS = '+String.fromCharCode(96),a=source.indexOf(begin),
 b=source.indexOf(String.fromCharCode(96)+';',a+begin.length);
assert(a>=0&&b>a,'No se encontró CSS público');
const inline=source.slice(a+begin.length,b);
const json=source.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(json,'No se encontró CSS complementario');
const css=readFileSync('src/styles.css','utf8')+'\n'+inline+'\n'+JSON.parse(json[1]);
const widths=[320,375,390,768,1024,1280,1660,1920];
const titles=[
 ['CRÉDITOS','Portada y créditos','◆'],
 ['PRÓLOGO','Bernie Jones y Everett la Muda','◆'],
 ['CAPÍTULO 1','La Bruja del Silencio y la ciudad de los misterios que todos habían olvidado','01']
];
function chapter([type,title,number]){
 return '<li class="qa-chapter">'+
  '<a href="/leer/demo/1"><span class="n" aria-hidden="true">'+number+'</span>'+
  '<span class="ui-ch-display"><span class="ui-ch-meta"><small class="ui-ch-type">'+type+
  '</small><em class="fx-tag">NUEVO</em></span><span class="ui-ch-name">'+title+'</span></span></a>'+
  '<button class="ui-read-chapter">✓ Leído</button>'+
  '<button class="ui-read-chapter">↓ Descargar capítulo</button></li>';
}
function card(i){
 return '<article class="ui-vol ui-vol-book"><div class="ui-v-content">'+
  '<div class="ui-v-heading"><h3>Volumen '+i+'</h3></div>'+
  '<div class="ui-v-actions"><a class="btn ghost" href="/leer/demo/1">Leer volumen →</a></div>'+
  '<details open class="ui-v-index"><summary>Índice de capítulos y secciones <span>3 · desplegar</span></summary>'+
  '<ul class="ui-chl">'+titles.map(chapter).join('')+'</ul></details></div></article>';
}
const checks=()=>{
 const out=document.getElementById('result'),errors=[],w=document.documentElement.clientWidth;
 const fail=x=>errors.push(x);
 const gallery=[...document.querySelectorAll('.is-galeria .ui-vol-book')];
 const list=[...document.querySelectorAll('.is-lista .ui-vol-book')];
 if(gallery.length!==4||list.length!==1) fail('Tarjetas sintéticas incompletas');
 if(w>=1280){
  const xs=gallery.map(x=>Math.round(x.getBoundingClientRect().x));
  if(new Set(xs).size<3)fail('La galería de PC no muestra varias tarjetas');
 }
 for(const [i,li] of [...document.querySelectorAll('.qa-chapter')].entries()){
  const link=li.querySelector('a'),name=li.querySelector('.ui-ch-name');
  const n=li.querySelector('.n'),type=li.querySelector('.ui-ch-type');
  const buttons=[...li.querySelectorAll('button')];
  const lr=link.getBoundingClientRect(),nr=name.getBoundingClientRect(),
   num=n.getBoundingClientRect(),br=li.getBoundingClientRect();
  if(getComputedStyle(li).display!=='grid')fail('No es grid el capítulo '+i);
  if(getComputedStyle(link).display!=='grid')fail('No es grid el enlace '+i);
  if(lr.width < Math.min(245,w*.72))fail('Enlace comprimido '+i+': '+Math.round(lr.width));
  if(nr.width < 145)fail('Título en columna estrecha '+i+': '+Math.round(nr.width));
  if(nr.left < num.right+4)fail('Título encima del número '+i);
  if(nr.right > br.right+2)fail('Título desborda la tarjeta '+i);
  if(getComputedStyle(type).writingMode!=='horizontal-tb')fail('Categoría vertical '+i);
  if(type.getBoundingClientRect().width>nr.width+4)fail('Categoría fuera de título '+i);
  if(name.textContent.includes('Portada y créditos')&&nr.height>80)
   fail('Título corto escrito letra por letra '+i);
  if(buttons.length!==2)fail('Acciones ausentes '+i);
  if(buttons.some(btn=>btn.getBoundingClientRect().top<lr.bottom-2))
   fail('Acciones invaden el nombre del capítulo '+i);
  if(buttons.some(btn=>btn.getBoundingClientRect().height<43.5))
   fail('Área táctil insuficiente '+i);
  if(buttons.some(btn=>btn.getBoundingClientRect().right>br.right+2))
   fail('Acción fuera del contenedor '+i);
  if(parseFloat(getComputedStyle(name).fontSize)<16.9)
   fail('Título demasiado pequeño '+i);
 }
 if(document.documentElement.scrollWidth>w+4)
  fail('Desbordamiento horizontal: '+document.documentElement.scrollWidth+'/'+w);
 out.dataset.qa=errors.length?'fail':'pass';
 out.textContent=errors.join(' | ')||'Galería, lista y títulos legibles en '+w+' px';
};
const page='<!doctype html><html lang="es"><head>'+
 '<meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<style>'+css+'\nbody{--gold:#f2c230;--paper:#f3ecd9;--mute:#a89f8a;--line:#2f2a20;margin:0;background:#0d0c0a;color:#f3ecd9}'+
 '.qa{box-sizing:border-box;padding:14px;max-width:100%}.qa h1{font-size:22px;margin:0 0 12px}'+
 '.qa .ui-vols{margin-bottom:24px}.qa .ui-vol-book{background:#17140f}</style></head>'+
 '<body><main class="qa ui-series-page"><h1>Galería: cuatro volúmenes</h1>'+
 '<section class="ui-series-library"><div class="ui-vols is-galeria">'+[1,2,3,4].map(card).join('')+
 '</div><h1>Vista de lista</h1><div class="ui-vols is-lista">'+card(5)+
 '</div></section><p id="result" data-qa="running">RUNNING</p></main>'+
 '<script>addEventListener("load",('+checks.toString()+'))</script></body></html>';
const parent='<!doctype html><html><body><p id="qa" data-qa="running">RUNNING</p>'+
 widths.map(w=>'<iframe title="Ancho '+w+'" width="'+w+'" height="1300" src="/case"></iframe>').join('')+
 '<script>const fs=[...document.querySelectorAll("iframe")];let tries=0;'+
 'const poll=()=>{const states=fs.map(f=>{const q=f.contentDocument.querySelector("#result");return[f.width,q?.dataset.qa,q?.textContent]});'+
 'if(states.some(x=>x[1]!=="pass"&&x[1]!=="fail")&&++tries<1200)return requestAnimationFrame(poll);'+
 'const bad=states.filter(x=>x[1]!=="pass");const out=document.getElementById("qa");'+
 'out.dataset.qa=bad.length?"fail":"pass";out.textContent=bad.map(x=>x[0]+": "+x[2]).join(" | ")||"Ocho anchuras, dos vistas OK"};requestAnimationFrame(poll)</script></body></html>';
const server=createServer((req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");
 res.end(req.url?.startsWith('/case')?page:parent);
});
const chrome=process.env.QA_CHROME||
 ['chromium','google-chrome','google-chrome-stable','chromium-browser']
 .map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(chrome,'Se necesita Chromium');
async function run(args){
 const p=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
 p.stdout.on('data',d=>out+=String(d));p.stderr.on('data',d=>err+=String(d).slice(0,12000));
 const code=await new Promise((ok,fail)=>{
  const t=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Timeout de Chromium'))},65000);
  p.once('error',e=>{clearTimeout(t);fail(e)});
  p.once('close',c=>{clearTimeout(t);ok(c)});
 });
 assert.equal(code,0,err.slice(-900));return out;
}
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const base='http://127.0.0.1:'+server.address().port;
 const out=await run(['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--window-size=1750,1100',
  '--virtual-time-budget=18000','--dump-dom',base]);
 const state=out.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(state,'El test de escritorio no obtuvo resultados');
 assert.equal(state[1],'pass',state[2]);console.log(state[2]);
 mkdirSync('qa-capturas',{recursive:true});
 for(const w of [1280,1660]){
  const file='qa-capturas/indice-escritorio-'+w+'.png';
  await run(['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--hide-scrollbars','--window-size='+w+',1100','--virtual-time-budget=5000',
    '--screenshot='+file,base+'/case']);
  assert(statSync(file).size>6000,'Captura de escritorio vacía '+w);
  console.log('Evidencia visual: '+file);
 }
}finally{await new Promise(ok=>server.close(ok))}

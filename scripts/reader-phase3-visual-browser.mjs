// Fase 3 — QA visual real del lector en Chromium, sin backend ni recursos externos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { renderBlock } from '../src/blocks.js';

const styles=readFileSync('src/styles.css','utf8')+'\n'+readFileSync('src/reader-a11y.css','utf8');
const known=renderBlock({type:'image',url:'/fig.svg',w:600,h:900,alt:'Página ilustrada',caption:'Ilustración'},0);
const legacy=renderBlock({type:'image',url:'/fig.svg',alt:'Ilustración de formato antiguo'},1);
const other=renderBlock({type:'image',url:'/fig.svg',width:800,height:600},2);
assert.match(known,/width="600" height="900"/,'El EPUB conserva medidas originales');
assert.match(other,/width="800" height="600"/,'Soporta medidas width y height');
assert.match(legacy,/class="rd-img-unmeasured"/,'Reserva proporción para EPUB antiguo');
assert.match(known,/loading="lazy" decoding="async"/,'No quitar carga diferida');
assert.match(renderBlock({type:'image',url:'/fig.svg'},3,{illus:false}),/Ilustración oculta/,'Mantener la preferencia de ocultar');
assert.doesNotMatch(renderBlock({type:'image',url:'/fig.svg',w:-1,h:Infinity},4),/width="-1"/,'Rechazar medidas inválidas');
const title='Una novela de fantasía con un título extremadamente largo para la prueba de navegación en un teléfono de 320 píxeles';

function qa(){
  const fail=[], bad=(msg)=>fail.push(msg), width=document.documentElement.clientWidth;
  const $=s=>document.querySelector(s), rd=$('.rd'),bar=$('.rd-bar'),panel=$('.rd-panel');
  rd.style.setProperty('--rd-h',Math.ceil(bar.getBoundingClientRect().height)+'px');
  if(document.documentElement.scrollWidth>width+2) bad('Desbordamiento horizontal: '+document.documentElement.scrollWidth);
  for(const s of ['.rd','.rd-bar','.rd-where','.rd-tools','.rd-panel','.rd-ch','.rd-head','.rd-body','.rd-pop']){
    const el=$(s),r=el.getBoundingClientRect();
    if(r.left < -2 || r.right > width+2) bad(s+' fuera de la pantalla '+Math.round(r.left)+'..'+Math.round(r.right));
  }
  for(const b of document.querySelectorAll('.rd-tools .btn,.rd-more summary,.rd-opt button,.rd-opt input[type=range],.rd-pop .sw')){
    if(b.getBoundingClientRect().height<43.5) bad('Área táctil pequeña: '+(b.textContent||b.className));
  }
  if(width<=540){
    if(getComputedStyle(bar).display!=='grid')bad('Barra móvil no se adapta');
    if(getComputedStyle($('.rd-back')).textOverflow!=='ellipsis')bad('Título largo no se abrevia visualmente');
  }
  if($('.rd-tools [data-act=toc]')?.hidden || $('.rd-tools [data-act=prefs]')?.hidden ||
    $('.rd-tools [data-act=zen]')?.hidden || $('.rd-more summary')?.hidden)bad('Faltan herramientas');
  const first=panel.getBoundingClientRect();
  if(first.width>width+1)bad('Panel de ajustes desbordado');
  if(getComputedStyle(panel).overflowY!=='auto' && getComputedStyle(panel).overflowY!=='scroll')bad('Panel sin scroll');
  panel.dataset.kind='toc';
  panel.innerHTML='<h4>Volumen primero con nombre extensísimo</h4><a href="#"><i class="rd-ok">✓</i><span>Capítulo con un título literario muy largo que ocupa varias líneas y no debe escapar del contenedor</span><small class="rd-here">Estás aquí</small></a>';
  const link=panel.querySelector('a');
  if(link.getBoundingClientRect().height<43.5)bad('Índice con toque pequeño');
  if(link.getBoundingClientRect().right>width+2)bad('Índice fuera de pantalla');
  const measured=$('.rd-body img[width]'), unknown=$('.rd-img-unmeasured');
  if(measured.getBoundingClientRect().height<=0)bad('Ilustración dimensionada no reservó espacio');
  if(unknown.getBoundingClientRect().height<=0)bad('Ilustración antigua no reservó espacio');
  if(!getComputedStyle(unknown).aspectRatio.includes('3 / 4'))bad('Falta proporción provisional de ilustración');
  const pop=$('.rd-pop'), sw=$('.rd-pop .sw');
  if(pop.getBoundingClientRect().right>width+2)bad('Anotación cortada');
  if(sw.getBoundingClientRect().width<43.5)bad('Subrayado inaccesible');
  document.body.classList.add('rd-zen');
  const zen=$('.rd-zen-x');
  if(getComputedStyle(zen).display==='none'||zen.getBoundingClientRect().height<43.5)bad('No se puede salir del modo zen');
  document.body.classList.remove('rd-zen');
  const gloss=$('.gl-sheet');
  gloss.hidden=false;
  const card=$('.gl-card');
  if(card.getBoundingClientRect().width>width+2)bad('Glosario fuera de pantalla');
  gloss.hidden=true;
  const p=$('#case-result');
  p.dataset.qaStatus=fail.length?'fail':'pass';
  p.textContent=fail.join('; ')||'OK '+width;
}
const js='('+qa.toString()+')()';
function sample(){
  const opts=['Sepia','Noche cálida','Claro','Negro'].map((t,i)=>
    '<button type="button"'+(i===0?' class="on"':'')+' aria-pressed="'+(i===0)+'">'+t+'</button>').join('');
  const article='<article class="rd-ch"><header class="rd-head"><h2>'+title+'</h2></header>'+
    '<div class="rd-body"><p>Un párrafo del relato con tamaño cómodo y texto legible.</p>'+known+legacy+'</div></article>';
  const bar='<nav class="rd-bar"><span class="rd-where"><a class="rd-back" title="'+title+'" href="#">‹ '+title+'</a>'+
    '<span class="rd-left mono">≈ 120 min restantes</span></span>'+
    '<div class="rd-tools"><button class="btn ghost" data-act="toc">Índice</button><button class="btn ghost" data-act="prefs">Aa</button>'+
    '<button class="btn ghost" data-act="zen">Zen</button><details class="rd-more"><summary class="btn ghost" aria-label="Más opciones">⋯</summary>'+
    '<div class="rd-more-m"><button class="btn">Comentarios</button><button class="btn">Anotaciones</button><button class="btn">Descargar volumen</button></div></details></div></nav>';
  return '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
    styles+'</style></head><body><main id="app"><div class="rd" data-theme="sepia">'+bar+
    '<div class="rd-panel" data-kind="prefs"><div class="rd-opt"><span class="mono">Tema</span><div>'+opts+'</div>'+
    '<input aria-label="Tamaño" type="range" min="14" max="30" value="20"></div></div>'+article+
    '<div class="rd-pop" style="left:8px;top:150px"><button class="sw" style="--swatch:#f2c230" aria-label="Subrayar"></button>'+
    '<button type="button">Nota</button><button type="button">Citar</button></div>'+
    '<div class="gl-sheet" hidden><div class="gl-card"><p>Glosario cómodo para teléfonos</p><button class="gl-x">Cerrar</button></div></div>'+
    '<button class="rd-zen-x">Salir del modo zen</button></div></main>'+
    '<p id="case-result" data-qa-status="running"></p><script>'+js+'</script></body></html>';
}
const widths=[320,390,540,768,1024];
const parent='<html><body><p id="qa-result" data-qa-status="running">COMPROBANDO</p>'+
  widths.map(w=>'<iframe title="Lector '+w+'" width="'+w+'" height="760" src="/sample"></iframe>').join('')+
  '<script>const frames=[...document.querySelectorAll("iframe")];let done=0,failed=[];for(const f of frames) f.addEventListener("load",()=>{const p=f.contentDocument.getElementById("case-result");if(p?.dataset.qaStatus!=="pass")failed.push(f.width+": "+(p?.textContent||"sin resultado"));if(++done===frames.length){const o=document.getElementById("qa-result");o.dataset.qaStatus=failed.length?"fail":"pass";o.textContent=failed.join("; ")||"Lector responsive 320, 390, 540, 768 y 1024 px OK";}});</script></body></html>';
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/fig.svg'){
    res.setHeader('Content-Type','image/svg+xml');
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#c1ab87"/></svg>');
  } else {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(req.url?.startsWith('/sample')?sample():parent);
  }
});
const bin=process.env.QA_CHROME || ['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no está instalado');
try{
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',
    '--no-proxy-server','--incognito','--window-size=1600,1000','--virtual-time-budget=12000','--dump-dom',
    'http://127.0.0.1:'+server.address().port];
  const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',d=>{out+=String(d).slice(0,200000)});
  child.stderr.on('data',d=>{err+=String(d).slice(0,20000)});
  const code=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');fail(Error('Chromium no completó la prueba'))},55000);
    child.once('error',e=>{clearTimeout(timer);fail(e)});child.once('close',c=>{clearTimeout(timer);ok(c)})});
  assert.equal(code,0,err.slice(-900));
  const m=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(m,'Chromium no devolvió los resultados responsive');
  assert.equal(m[1],'pass',m[2]);
  console.log('Fase 3 visual · '+m[2]);
}finally{await new Promise(ok=>server.close(ok))}

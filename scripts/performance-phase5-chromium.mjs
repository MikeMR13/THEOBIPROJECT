// Fase 5: métricas de laboratorio de Vitrina V2, usando JS compilado real.
// Servidor, imágenes y contenido son ficticios/locales: nunca conecta a Supabase.
// Estos datos NO son los Core Web Vitals reales de la plataforma.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

const ui=readFileSync('src/ui.js','utf8');
const css2=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(css2,'No se encontró CSS2');
const tick=String.fromCharCode(96),mark='const HOME_CSS = '+tick;
const start=ui.indexOf(mark)+mark.length,end=ui.indexOf(tick+';',start);
assert(start>mark.length&&end>start,'No se encontró HOME_CSS');
const css=readFileSync('dist/styles.css','utf8')+'\n'+JSON.parse(css2[1])+'\n'+ui.slice(start,end);
const source=readFileSync('dist/home-vitrina.js','utf8');
const books=Array.from({length:8},(_,i)=>({
 id:String(i+1),slug:'obra-'+i,title:'Novela de ejemplo '+(i+1),
 cover_path:'/covers/'+i+'.svg',cover_thumb_path:'/covers/'+i+'-thumb.svg',
 translation_status:'active',theme:{color:'#30251b'}
}));
const instrument=[
 'window.__lab={lcpMs:null,cls:0};',
 "try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lab.lcpMs=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}",
 "try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}",
 "window.addEventListener('load',()=>setTimeout(()=>{",
 " const fcp=performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint');",
 " const imgs=[...document.querySelectorAll('.vt-book img')];",
 " const requests=performance.getEntriesByType('resource');",
 " const out={viewportWidth:innerWidth,fcpMs:fcp?Math.round(fcp.startTime):null,",
 " lcpMs:window.__lab.lcpMs===null?null:Math.round(window.__lab.lcpMs),",
 " cls:Number(window.__lab.cls.toFixed(5)),resources:requests.length,",
 " coversRequested:requests.filter(r=>r.name.includes('/covers/')).length,",
 " coversWithSrc:imgs.filter(x=>x.hasAttribute('src')).length,",
 " coversDeferred:imgs.filter(x=>x.hasAttribute('data-src')).length,",
 " renderedBooks:document.querySelectorAll('.vt-book').length,",
 " activeOriginal:document.querySelector('.vt-book[aria-current=true] img')?.getAttribute('src')||null,",
 " inpMs:null};",
 " const box=document.getElementById('result');box.dataset.status=out.renderedBooks===8&&out.activeOriginal?'pass':'fail';",
 " box.textContent=JSON.stringify(out);",
 "},850),{once:true});"
].join('\n');
const fixtureScript=[
 "import {enhanceHomeVitrina} from '/home-vitrina.js';",
 "enhanceHomeVitrina(document.querySelector('#hero'),__BOOKS__,3,{esc:s=>String(s),media:s=>s});"
].join('\n').replace('__BOOKS__',JSON.stringify(books));
const html=[
 '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>',css,'\n:root{--gold:#f2c230;--sea:#d8a75c;--paper:#f3ecd9;--line:#3d3628}',
 'html,body{margin:0;background:#0d0c0a;color:#f3ecd9}',
 '.ob-page{max-width:1160px;padding:12px;box-sizing:border-box;margin:auto}</style>',
 '<script>',instrument,'</script></head><body>',
 '<main class="ob-page"><header><h1>El Obi del Lector · laboratorio</h1></header>',
 '<section id="hero" class="ob-hero"><div class="ob-cov"><div class="f"></div></div>',
 '<div class="ob-txt"><div class="ob-hero-copy"><div class="ob-hero-head"><div class="ob-hero-meta">',
 '<span class="ob-kick">VOLUMEN</span><div class="ob-hero-flags"><span class="ob-badge ob-badge-vol">SELECCIÓN</span></div>',
 '</div></div><h2><a class="ob-h1a" href="/serie/obra-3">Novela de ejemplo 4</a></h2>',
 '<p class="ob-syn">Contenido ficticio para laboratorio de rendimiento sin solicitudes externas.</p>',
 '</div><div class="ob-hero-footer"><div class="ob-acts">',
 '<a class="a1" href="/serie/obra-3">Ver novela</a><a class="a2" href="/leer/obra-3/1">Leer</a>',
 '</div></div></div><div class="ob-pager2"><button data-dir="-1">Anterior</button>',
 '<span><button data-j="0">1</button></span><button data-dir="1">Siguiente</button></div>',
 '</section></main><pre id="result" data-status="loading"></pre>',
 '<script type="module">',fixtureScript,'</script></body></html>'
].join('');
const svg=(n,thumb)=>{
 const w=thumb?160:400,h=thumb?240:600;
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 400 600">'+
 '<rect width="400" height="600" fill="#4c3926"/><rect x="25" y="25" width="350" height="550" fill="#bfa37a"/>'+
 '<text x="200" y="300" font-size="50" text-anchor="middle" fill="#26180c">OBI '+n+'</text></svg>';
};
const server=createServer((req,res)=>{
 const path=new URL(req.url||'/','http://localhost').pathname;
 if(path==='/home-vitrina.js'){
   res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'public,max-age=3600'});return res.end(source);
 }
 const m=path.match(/^\/covers\/(\d+)(-thumb)?\.svg$/);
 if(m){
   res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=3600'});
   return res.end(svg(Number(m[1]),!!m[2]));
 }
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
});
const browser=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable']
 .map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(browser,'No hay Chromium instalado');
function chromium(url,width){
 return new Promise((resolve,reject)=>{
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-background-networking','--disable-extensions','--virtual-time-budget=3000',
   '--window-size='+width+',1000','--dump-dom',url];
  const child=spawn(browser,args,{stdio:['ignore','pipe','pipe']});
  let out='',err='',finished=false;
  const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);
    error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('Chromium excedió 40 s: '+err.slice(-250)));},40000);
  child.stdout.on('data',data=>out+=String(data));
  child.stderr.on('data',data=>err=(err+String(data)).slice(-900));
  child.once('error',error=>finish(error));
  child.once('close',code=>{
   if(code!==0)return finish(Error('Chromium '+width+'px terminó '+code+': '+err.slice(-350)));
   const m=out.match(/<pre id="result" data-status="(pass|fail)">([^<]*)<\/pre>/);
   if(!m)return finish(Error('Sin métricas de Chromium '+width+'px'));
   if(m[1]!=='pass')return finish(Error('Vitrina incompleta '+width+'px: '+m[2]));
   try{finish(null,JSON.parse(m[2]))}catch(e){finish(Error('JSON Chromium: '+e.message))}
  });
 });
}
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});
 const results=[],base='http://127.0.0.1:'+server.address().port+'/';
 for(const width of [390,1440]){
  const result=await chromium(base,width);
  assert.equal(result.renderedBooks,8,'Se perdieron libros en Vitrina');
  // La maqueta de escritorio deja una de ocho portadas completamente oculta.
  // No permitir que un observador descargue también esa ilustración.
  if(result.viewportWidth>700)assert(result.coversRequested<=7,
    'Se solicitaron portadas ocultas en escritorio: '+result.coversRequested);
  assert(result.activeOriginal?.includes('/covers/3.svg'),'Portada activa distinta del original');
  for(const field of ['fcpMs','lcpMs'])
   assert(result[field]===null||Number.isFinite(result[field])&&result[field]>=0,field+' no numérico');
  assert(Number.isFinite(result.cls)&&result.cls>=0,'CLS no numérico');
  results.push(result);
 }
 mkdirSync('qa-performance',{recursive:true});
 const report={version:1,scope:'Vitrina real compilada, dos tamaños, SVG y datos ficticios locales',
  limitation:'No mide páginas completas, red pública, LCP/INP/CLS de usuarios reales ni caché caliente.',
  results};
 writeFileSync('qa-performance/fase5-chromium.json',JSON.stringify(report,null,2)+'\n');
 const summary='### Fase 5 · Vitrina aislada en Chromium (datos ficticios)\n\n'+
 '| Ancho | FCP de laboratorio | LCP de laboratorio | CLS de laboratorio | Portadas solicitadas |\n|---|---:|---:|---:|---:|\n'+
 results.map(r=>'| '+r.viewportWidth+'px | '+(r.fcpMs??'n/d')+' ms | '+(r.lcpMs??'n/d')+' ms | '+r.cls+' | '+r.coversRequested+' |').join('\n')+
 '\n\n**INP y métricas reales de producción: no medidos.**\n';
 console.log(summary);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
}finally{server.closeAllConnections();await new Promise(ok=>server.close(ok))}

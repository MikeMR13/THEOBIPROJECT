// QA visual de Mi biblioteca con CSS real del código y datos sintéticos, sin sesión ni red.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const source=readFileSync('src/app.js','utf8');
const match=source.match(/const LB_CSS = \`([\s\S]*?)\`;/);
assert(match,'Faltan los estilos de Mi biblioteca');
const css=readFileSync('src/styles.css','utf8')+'\n'+match[1];
const sizes=[320,390,768,1024,1440];
const svg=i=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#241d16"/><rect x="30" y="28" width="340" height="540" stroke="#b58a42" fill="none" stroke-width="5"/><text x="200" y="150" font-size="36" text-anchor="middle" fill="#d9c3a0">OBRA '+i+'</text></svg>');
const card=(i)=>'<article class="lb-card"><a class="lb-cover-link" href="/serie/obra-'+i+'" aria-label="Ver ficha"><img src="'+svg(i)+'" alt="" loading="lazy" decoding="async"></a>'+
 '<div class="lb-card-body"><span class="lb-label">'+(i===1?'En progreso':'Pendiente')+'</span><a class="lb-title" href="/serie/obra-'+i+'">'+(i%2===0?'Una novela ligera de traducciones extraordinariamente largas':'Historias de fantasía, aventuras y mundos lejanos')+'</a>'+
 '<span class="lb-card-sub">Continuar · Capítulo '+(i+4)+'</span><div class="lb-progress" aria-label="8 de 24 capítulos"><span class="lb-progress-head"><span>8 de 24 capítulos</span><span>33 %</span></span>'+
 '<span class="lb-progress-track" aria-hidden="true"><i style="width:33%"></i></span></div><a class="lb-card-cta" href="/leer/obra-'+i+'/5">Continuar leyendo</a>'+
 '<button type="button" class="lb-read-toggle" data-read-work="work-'+i+'" data-read-mark="1" aria-label="Marcar novela como leída">✓ Marcar novela como leída</button><button type="button" class="lb-card-hide">Ocultar de mi perfil público</button></div></article>';
// Vista S3: recrear los tres estantes con las clases reales y portadas sintéticas.
const shelf=(key,title,count)=>'<article class="lb-collection" data-collection="'+key+'">'+
 '<header class="lb-collection-head"><div><h2>'+title+'</h2><p>Obras disponibles en esta estantería</p></div><span class="lb-collection-count" aria-label="Obras: '+count+'">'+count+'</span></header>'+
 '<div class="lb-collection-books">'+Array.from({length:Math.min(count,3)},(_,i)=>'<a class="lb-collection-book" href="/serie/obra-'+(i+1)+'" aria-label="Ver ficha de '+title+'">'+
 '<span class="lb-collection-cover"><img src="'+svg(i+1)+'" alt="" loading="lazy" decoding="async"></span>'+
 '<span class="lb-collection-book-title">'+(i===2?'Una novela ligera con título extraordinariamente extenso':'Obra editorial '+(i+1))+'</span></a>').join('')+'</div>'+
 '<a class="lb-collection-more" href="/biblioteca?t='+key+'">Ver estantería completa →</a></article>';
const qa=[
 "const e=[];const w=document.documentElement.clientWidth;",
 "const direct=[...document.querySelectorAll('.lb-read-toggle')];if(direct.length!==5)e.push('botones por novela faltantes');",
 "for(const b of direct)if(b.getBoundingClientRect().height<42||b.getBoundingClientRect().width<140)e.push('botón directo demasiado pequeño');",
 "if(document.querySelector('dialog,[data-read-open]'))e.push('menú adicional inesperado');",

 "const all=[...document.querySelectorAll('.lb-card')];",
 "if(all.length!==5)e.push('faltan fichas');",
 "if(document.documentElement.scrollWidth>w+4)e.push('desbordamiento horizontal: '+(document.documentElement.scrollWidth-w));",
 "const img=all[0]?.querySelector('img');if(!img||getComputedStyle(img).objectFit!=='contain')e.push('portada recortada');",
 "const grid=document.querySelector('.lb-grid');if(!grid||getComputedStyle(grid).display!=='grid')e.push('sin cuadrícula');",
 "const first=all[0]?.getBoundingClientRect();if(w<=480&&first.width>w-15)e.push('tarjeta demasiado ancha');",
 "if(w<=480&&all[0]?.getBoundingClientRect().top>=all[1]?.getBoundingClientRect().top)e.push('tarjetas móviles superpuestas');",
 "if(w>=1024&&all[0]?.getBoundingClientRect().top!==all[1]?.getBoundingClientRect().top)e.push('escritorio sin múltiples columnas');",
 "const shelves=document.querySelectorAll('.lb-collection');const collection=document.querySelector('.lb-collections-desktop');",
 "if(shelves.length!==3)e.push('no se muestran tres estantes');",
 "if(w>=960&&getComputedStyle(collection).display!=='grid')e.push('faltan estantes de escritorio');",
 "if(w<960&&getComputedStyle(collection).display!=='none')e.push('los estantes invaden la pantalla móvil');",
 "if(w>=960){const boxes=[...shelves].map(s=>s.getBoundingClientRect());if(boxes.some(b=>b.width<185))e.push('estantes demasiado estrechos');if(boxes.some(b=>Math.abs(b.top-boxes[0].top)>3))e.push('estantes no alineados en escritorio');}",
 "if(w>=960&&[...shelves].some(s=>!s.querySelector('.lb-collection-more')||!s.querySelector('.lb-collection-book img')))e.push('faltan portadas o enlace a estante');",
 "if(w>=960&&[...document.querySelectorAll('.lb-collection-cover img')].some(im=>getComputedStyle(im).objectFit!=='contain'))e.push('portadas de estantería recortadas');",
 "const nav=document.querySelector('.lb-tabs');if(!nav?.querySelector('[aria-current=page]'))e.push('pestaña sin aria-current');",
 "const links=[...nav.querySelectorAll('a')];if(w<=480&&(links.some(a=>Math.abs(a.getBoundingClientRect().top-links[0].getBoundingClientRect().top)>2)||getComputedStyle(nav).flexWrap!=='nowrap'))e.push('pestañas móviles en varias filas');",
 "if(w<=480&&nav.scrollWidth<=nav.clientWidth+10)e.push('pestañas sin desplazamiento horizontal');",
 "for(const x of document.querySelectorAll('.lb-card-cta'))if(x.getBoundingClientRect().height<40)e.push('acción táctil corta');",
 "for(const x of document.querySelectorAll('.lb-toolbar input,.lb-toolbar select'))if(x.getBoundingClientRect().width<135)e.push('filtro estrecho');",
 "const q=document.querySelector('#case-result');q.dataset.qaStatus=e.length?'fail':'pass';q.textContent=e.join(' ; ')||'OK';"
].join('\n');
function sample(){
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<main id="app"><div class="ui-cath"><div><h1>Mi biblioteca</h1><p>28 capítulos leídos · 9 obras seguidas</p></div><span class="kj" aria-hidden="true">書庫</span></div>'+
 '<section class="lb-collections-desktop" aria-label="Obras de tus tres estanterías">'+
 shelf('leyendo','Leyendo',3)+shelf('pendientes','Pendientes',2)+shelf('terminadas','Terminadas',1)+'</section>'+
 '<nav class="lb-tabs" aria-label="Secciones de Mi biblioteca"><a class="on" aria-current="page" href="/biblioteca">Leyendo <em>5</em></a><a href="?t=pendientes">Pendientes <em>4</em></a><a href="?t=terminadas">Terminadas</a><a href="?t=avisos">Avisos</a><a href="?t=offline">Sin conexión</a><a href="?t=historial">Historial</a></nav>'+
 '<p class="lb-navhelp">Desliza las pestañas para ver todas las secciones →</p>'+
 '<div class="lb-toolbar"><label>Buscar en esta sección<input type="search" placeholder="Título u organización"></label><label>Ordenar por<select><option>Actividad reciente</option></select></label></div>'+
 '<p class="lb-match-count">5 de 5 obras</p><div class="lb-grid">'+Array.from({length:5},(_,i)=>card(i+1)).join('')+'</div>'+
 '</main><p id="case-result" data-qa-status="running">RUNNING</p><script>'+qa+'</script></body></html>';
}
const parent='<html><head><meta charset="utf-8"></head><body><p id="qa-result" data-qa-status="running">QA_RUNNING</p>'+
 sizes.map(w=>'<iframe title="Biblioteca '+w+'" width="'+w+'" height="800" src="/sample"></iframe>').join('')+
 '<script>const frames=[...document.querySelectorAll("iframe")];let n=0;const tick=setInterval(()=>{const rs=frames.map(x=>x.contentDocument?.getElementById("case-result"));if(rs.every(x=>x?.dataset.qaStatus&&x.dataset.qaStatus!=="running")||++n>700){clearInterval(tick);const bad=rs.flatMap((x,i)=>x?.dataset.qaStatus==="pass"?[]:[frames[i].width+": "+(x?.textContent||"sin resultado")]);const q=document.getElementById("qa-result");q.dataset.qaStatus=bad.length?"fail":"pass";q.textContent=bad.join(" | ")||"Biblioteca Chromium 320/390/768/1024/1440 OK";}},20);</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self' data:; connect-src 'none'; img-src data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'");res.end(req.url?.startsWith('/sample')?sample():parent)});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no está instalado');
const run=async args=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=String(x));p.stderr.on('data',x=>err+=String(x).slice(0,20000));const code=await new Promise((done,fail)=>{const t=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Chromium timeout'))},60000);p.once('error',e=>{clearTimeout(t);fail(e)});p.once('close',c=>{clearTimeout(t);done(c)})});assert.equal(code,0,err.slice(-700));return out;};
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const url='http://127.0.0.1:'+server.address().port;
 const out=await run(['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-proxy-server','--virtual-time-budget=19000','--window-size=1600,900','--dump-dom',url]);
 const match=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(match,'No se encontró el resultado Chromium');assert.equal(match[1],'pass',match[2]);
 console.log(match[2]);
 // Capturas de maqueta fiel al CSS para revisión humana; datos/portadas ilustrativos.
 if(process.env.OBI_LIBRARY_SCREENSHOTS==='1'){
  const dest=resolve('qa-capturas');mkdirSync(dest,{recursive:true});
  for(const [width,height,label] of [[1440,1100,'escritorio'],[390,1000,'movil']]){
   await run(['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--no-proxy-server','--virtual-time-budget=3000',
   '--window-size='+width+','+height,'--screenshot='+resolve(dest,'biblioteca-'+label+'.png'),url+'/sample']);
  }
  console.log('Capturas de validación en qa-capturas/');
 }
}finally{await new Promise(ok=>server.close(ok))}

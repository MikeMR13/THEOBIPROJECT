// QA responsive del carrusel compacto: seis tamaños, tres longitudes, anuncio y controles visibles.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

const ui=readFileSync('src/ui.js','utf8');
const cssMatch=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(cssMatch,'No se encontró la hoja de estilos del Inicio');
const css2=JSON.parse(cssMatch[1]);
const mark='const HOME_CSS = ',pos=ui.indexOf(mark),quote=String.fromCharCode(96);
assert(pos>=0,'No se encontró HOME_CSS');
const cssStart=pos+mark.length;
assert.equal(ui[cssStart],quote);
const cssEnd=ui.indexOf(quote+';',cssStart+1);
assert(cssEnd>cssStart);
const homeCss=ui.slice(cssStart+1,cssEnd);
assert(ui.includes('<div class="ob-hero-flags">') && ui.includes('<div class="ob-hero-rank">'),'El carrusel debe separar avisos y ranking');
assert(ui.includes('ob-hero-flags .ob-utag-hero') && ui.includes('ob-txt h2[data-len=xl]'),'Faltan reglas responsive de etiquetas o títulos');

const viewport=[320,390,768,1024,1440,1873];
const checks=[
"const get=s=>document.querySelector(s),rect=s=>get(s).getBoundingClientRect(),err=[];",
"const test=(pass,text)=>{if(!pass)err.push(text)};",
"const badge=rect('.ob-badge-vol'), custom=rect('.ob-utag-hero'),rank=rect('.ob-hero-rank'),title=rect('.ob-txt h2'),actions=rect('.ob-acts'),pager=rect('.ob-pager2'),logo=rect('.ob-hero-team-logo'),meta=rect('.ob-hero-meta'),cover=rect('.ob-cov'),footer=rect('.ob-hero-footer'),hero=rect('.ob-hero');",
"const max=document.documentElement.clientWidth, tol=3;",
"test(badge.height>20&&custom.height>15,'etiquetas sin altura');",
"test(custom.top-badge.bottom>=5,'etiquetas pegadas/solapadas');",
"test(rank.top-custom.bottom>=6,'ranking demasiado junto al aviso');",
"test(title.top-rank.bottom>=8,'ranking demasiado junto al título');",
"test(logo.left>=meta.right-3,'logo invade la columna del aviso editorial');",
"test(Math.abs(logo.top-meta.top)<=5,'logo debe alinearse arriba en su propia columna');",
"test(innerWidth<=1100?logo.bottom<=title.top-6:title.right<=logo.left-6,'logo se superpone con el título');",
"if(innerWidth>1100){test(getComputedStyle(get('.ob-hero-team-logo')).position==='absolute','el PNG debe flotar sin empujar el título');test(rect('.ob-hero-copy').height>=logo.height-2,'el PNG principal se recorta dentro del encabezado');}",
"test(badge.right<=logo.left-6&&custom.right<=logo.left-6&&rank.right<=logo.left-6,'PNG solapa anuncio o ranking');",
"test(getComputedStyle(get('.ob-hero-head')).display==='grid','logo sin rejilla de seguridad');",
"if(innerWidth>820){test(Math.abs(cover.top-meta.top)<=5,'portada desalineada con el anuncio');test(meta.left-cover.right>=24&&meta.left-cover.right<=55,'portada y texto demasiado separados');test(title.top-meta.top<160,'el logo o los márgenes empujan el título');test(getComputedStyle(get('.ob-hero')).alignItems==='start','el hero vuelve a centrar verticalmente la portada');}",
"const logoSize=rect('.ob-hero-team-logo img'),expected=innerWidth<=380?64:innerWidth<=600?80:innerWidth<=1100?Math.max(78,Math.min(94,innerWidth*.08)):Math.max(170,Math.min(190,innerWidth*.102));",
"test(Math.abs(logoSize.width-expected)<=2&&Math.abs(logoSize.height-expected)<=2,'tamaño responsive del logo incorrecto: '+logoSize.width+' vs '+expected);",
"test(getComputedStyle(get('.ob-hero-team-logo img')).objectFit==='contain','imagen del equipo deformada o recortada');",
"test(badge.right<=max+tol&&custom.right<=max+tol&&rank.right<=max+tol,'avisos fuera del viewport');",
"test(Math.abs(badge.left-custom.left)<=tol&&Math.abs(badge.left-rank.left)<=tol,'metadatos desalineados');",
"test(title.right<=max+tol&&title.left>=-tol,'título desbordado');",
"test(actions.bottom<=pager.top+tol,'botones y controles superpuestos');",
"test(footer.bottom<=pager.top+tol,'footer y controles superpuestos');",
"test(pager.bottom<=hero.bottom+tol,'controles fuera de hero');",
"test(get('.ob-txt h2').scrollHeight<=get('.ob-txt h2').clientHeight+3,'titulo recortado');",
"test(['none','unset'].includes(getComputedStyle(get('.ob-txt h2')).webkitLineClamp),'el título no debe recortarse');",
"test(getComputedStyle(get('.ob-syn')).webkitLineClamp==='2','la sinopsis no tiene la longitud responsive esperada');",
"test(cover.width<=292,'portada demasiado ancha');",
"if(innerWidth>=701){test(getComputedStyle(get('.ob-hero')).maxHeight==='none','el carrusel vuelve a altura máxima fija');test(Math.abs(actions.bottom-footer.bottom)<=3,'acciones fuera del footer');}",
"if(innerWidth<=700){test(cover.width<=194,'portada desproporcionada en movil');test(pager.top>=cover.bottom-3,'controles aparecen encima de portada en móvil');}",
"const over=[...document.querySelectorAll('.ob-hero *')].filter(n=>n.getBoundingClientRect().right>max+tol).slice(0,3).map(n=>n.className||n.tagName).join(',');",
"test(document.documentElement.scrollWidth<=max+tol,'scroll horizontal: contenido '+document.documentElement.scrollWidth+' viewport '+max+' ['+over+']');",
"test(parseFloat(getComputedStyle(get('.ob-utag-hero')).fontSize)<=16,'aviso secundario desproporcionado');",
"test(parseFloat(getComputedStyle(get('.ob-txt h2')).fontSize)<=43,'título desproporcionado');",
"const link=get('.ob-hero-team-logo'), img=link.querySelector('img'), href=link.getAttribute('href');",
"test(!!img&&!link.querySelector('span'),'PNG y nombre aparecen al mismo tiempo');",
"const name=document.createElement('span');name.textContent='Equipo de traducción de prueba con nombre muy largo';link.classList.add('is-text');img.replaceWith(name);",
"const textRect=rect('.ob-hero-team-logo'),metaRect=rect('.ob-hero-meta'),titleRect=rect('.ob-txt h2');",
"test(link.getAttribute('href')===href&&!link.querySelector('img')&&!!link.querySelector('span'),'logo y texto no conservan el mismo hipervínculo');",
"test(getComputedStyle(name).display!=='none'&&name.getBoundingClientRect().height>0,'nombre oculto en móvil');",
"test(textRect.left>=metaRect.right-3&&rect('.ob-badge-vol').right<=textRect.left-6&&rect('.ob-utag-hero').right<=textRect.left-6&&rect('.ob-hero-rank').right<=textRect.left-6,'texto y aviso se superponen');",
"test(textRect.bottom<=titleRect.top-6,'nombre se superpone al título');",
"if(innerWidth>1100){test(textRect.width<=102,'el fallback textual no debe crecer con el PNG de escritorio');test(logoSize.width>=170&&logoSize.width<=190,'PNG principal fuera de escala en escritorio');test(getComputedStyle(link).position!=='absolute','el fallback de nombre sigue en el flujo del encabezado');}",
"test(document.documentElement.scrollWidth<=max+tol,'nombre desborda el viewport');",
"const H=get('.ob-txt h2'),HLink=H.querySelector('a');",
"for(const [len,titleText] of [['','Sayonara Princess'],['l','Los secretos de la Bruja del Silencio — Volumen 2'],['xl','Para crear una organización que actuará en secreto desde las sombras, crié y entrené a unas chicas con los más altos conocimientos de asesinato, y terminaron convirtiéndose en una gran potencia — Volumen 1']]){H.dataset.len=len;HLink.textContent=titleText;const tr=H.getBoundingClientRect(),lr=rect('.ob-hero-team-logo'),pr=rect('.ob-pager2');test(tr.left>=-tol&&tr.right<=max+tol,'título '+len+' sale del ancho');test(lr.bottom<=tr.top-6,'logo se superpone al título '+len);test(rect('.ob-acts').bottom<=pr.top+tol,'acciones invaden controles con título '+len);test(rect('.ob-hero-footer').bottom<=pr.top+tol,'footer invade controles con título '+len);test(document.documentElement.scrollWidth<=max+tol,'scroll horizontal con título '+len);}",
"const result=get('#result');result.dataset.status=err.length?'fail':'pass';result.textContent=err.join(' | ')||'OK';"
].join('\n');
const baseStyle=':root{--paper:#f3ecd9;--gold:#c25b28;--line:#3d3628;--mute:#ae9d81;--wrap:1160px}*{animation:none!important;transition:none!important}body{margin:0;min-width:0;background:#0d0c0a;color:var(--paper);font-family:Arial,sans-serif}';
const page='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css2+'\n'+homeCss+'\n'+baseStyle+'</style></head><body><main class="ob-page"><section class="ob-hero" id="hero"><span class="ob-vk" aria-hidden="true">新刊案内</span><div class="ob-cov"><div class="f"></div></div><div class="ob-txt"><div class="ob-hero-copy"><div class="ob-hero-head"><div class="ob-hero-meta"><span class="ob-kick">第二巻 · 新刊</span><div class="ob-hero-flags"><span class="ob-badge ob-badge-vol">¡NUEVO VOLUMEN! · VOL. 2</span><span class="ob-utag-hero" style="background:rgba(13,12,10,.6);color:#c25b28;border:2px solid #c25b28">¡NUEVO SECRETO! EDICIÓN ESPECIAL</span></div><div class="ob-hero-rank"><a class="rk-bdg" href="/ranking"><b>#2</b>Top de la semana</a></div></div><a class="ob-hero-team-logo" href="/equipo/ejemplo" aria-label="Visitar equipo de traducción de ejemplo"><img alt="" width="104" height="104" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5WQAAAABJRU5ErkJggg=="></a></div><h2 data-len="xl"><a class="ob-h1a" href="/serie/secretos">Los secretos de la bruja del silencio y el misterio de una noche eterna — Volumen 2</a></h2><p class="ob-syn">Una sinopsis suficientemente larga para comprobar la distribución del texto en dispositivos pequeños y en pantallas de escritorio de diferentes anchuras.</p></div><div class="ob-hero-footer"><div class="ob-acts"><a class="a1" href="/serie/secretos">Ver volumen 2</a><a class="a2" href="/leer/secretos/1">Empezar a leer</a></div></div></div><div class="ob-pager2" style="position:absolute;left:clamp(16px,4vw,56px);right:clamp(16px,4vw,56px);bottom:14px;z-index:2;display:flex;align-items:center;gap:10px"><button data-j="0" style="width:40px;height:40px">‹</button><span style="display:flex;flex:1;gap:6px"><button data-j="0" style="height:10px;min-width:10px"></button></span><button data-hp aria-label="Pausar" style="height:40px">Ⅱ Pausar</button><button data-j="1" style="width:40px;height:40px">›</button></div></section></main><p id="result" data-status="running"></p><script>'+checks+'</script></body></html>';
const parent='<!doctype html><html><body><p id="qa" data-status="running">RUNNING</p>'+viewport.map(w=>'<iframe title="QA '+w+'" width="'+w+'" height="800" src="/case" style="border:0"></iframe>').join('')+'<script>let count=0,errors=[];document.querySelectorAll("iframe").forEach(f=>f.addEventListener("load",()=>{const q=f.contentDocument.querySelector("#result");if(q?.dataset.status!=="pass")errors.push(f.width+": "+(q?.textContent||"sin resultado"));if(++count===6){const qa=document.querySelector("#qa");qa.dataset.status=errors.length?"fail":"pass";qa.textContent=errors.join(" | ")||"Carrusel: 320, 390, 768, 1024, 1440 y 1873 px OK";}}));</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(req.url==='/case'?page:parent)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(bin,'Chromium no disponible');
try {
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 const child=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--window-size=1680,1000','--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
 let out='',err='';
 child.stdout.on('data',b=>out+=String(b).slice(0,200000));
 child.stderr.on('data',b=>err+=String(b).slice(0,8000));
 const code=await new Promise((ok,no)=>{const timeout=setTimeout(()=>{child.kill('SIGKILL');no(Error('Chromium timeout'))},75000);child.once('error',e=>{clearTimeout(timeout);no(e)});child.once('close',c=>{clearTimeout(timeout);ok(c)})});
 assert.equal(code,0,err.slice(-500));
 const result=out.match(/<p id="qa" data-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(result,'Sin resultados de Chromium');
 assert.equal(result[1],'pass',result[2]);
 console.log(result[2]);
 // Capturas efímeras de Chromium para comparar móvil y PC en el mismo CI.
 mkdirSync('qa-capturas',{recursive:true});
 for(const w of [390,1440,1873]){
   const name='qa-capturas/carrusel-responsive-'+w+'.png';
   const snap=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars',
     '--window-size='+w+',1600','--virtual-time-budget=4500','--screenshot='+name,
     'http://127.0.0.1:'+server.address().port+'/case'],{stdio:['ignore','pipe','pipe']});
   let output='';
   snap.stdout.resume();snap.stderr.on('data',data=>output+=String(data).slice(0,800));
   const c=await new Promise((ok,no)=>{
     const timeout=setTimeout(()=>{snap.kill('SIGKILL');no(Error('Timeout captura '+w))},45000);
     snap.once('error',e=>{clearTimeout(timeout);no(e)});
     snap.once('close',code=>{clearTimeout(timeout);ok(code)});
   });
   assert.equal(c,0,'Fallo captura '+w+': '+output.slice(-400));
   assert(statSync(name).size>5000,'Imagen vacía '+w);
   console.log('Captura de QA '+name);
 }
} finally {
 await new Promise(ok=>server.close(ok));
}

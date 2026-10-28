// Estudio · QA responsive de Fase 2 con CSS y clases reales de la aplicación.
// Datos de prueba ficticios y Chromium sin acceso a Supabase/Vercel.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const css=readFileSync('src/styles.css','utf8')+'\n'+readFileSync('src/studio.css','utf8');
const source=readFileSync('src/studio.js','utf8');
for(const k of ['s2-work-primary','s2-work-recommend','s2-work-secondary','s2-feature-toggle','data-feature','team_feature_set'])assert(source.includes(k),'Falta función: '+k);
assert(!source.includes("'gold' : 'ghost'"),'No debe usarse la clase gold para el botón activo');
assert(css.includes('.s2 .s2-work .s2-feature-toggle[aria-pressed="true"]'),'Falta estilo de contraste');
const widths=[320,375,390,430,768,1024,1440,1690];
const title='¿Heroína? ¿Santa? ¡No, soy una sirvienta todoterreno con orgullo!';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const field=(label,value='')=>'<label>'+label+'<input value="'+esc(value)+'"></label>';
const nav=['Resumen','Anuncios','Obras','Glosario','Importar','Multimedia','Flujo de trabajo','Comunidad','Estadísticas','Descargas','Página del equipo','Preferencias'];
const actions='<button class="btn sm">＋ Nuevo capítulo</button><a class="btn ghost sm" href="#">Importar volumen</a><a class="btn ghost sm" href="#">Editar datos</a><a class="lnk" href="#">Ver en el sitio ↗</a>';
const genreNames=['Comedia','Fantasía','Nobleza','Reencarnación','Romance','Acción','Misterio','Aventura','Magia','Horror','Drama','Mecha','Suspenso','Supervivencia','Histórico'];
const panel1='<section class="wk-box"><h2>Ficha</h2>'+
  field('Título en español',title)+field('Título corto','¿Heroína, santa?')+
  field('Título original')+field('Lectura / rōmaji')+
  '<div class="wk-g2">'+field('Autor','Atekichi')+field('Ilustración','Yukiko')+
  '<label>Tipo<select><option>Novela ligera</option></select></label>'+
  '<label>Demografía<select><option>Sin asignar</option></select></label></div>'+
  '<label>Sinopsis<textarea rows="7">'+esc('Voy a convertirme en la mejor sirvienta del mundo. '.repeat(10))+'</textarea></label></section>';
const panel2='<div class="wk-col"><section class="wk-box"><h2>Géneros</h2>'+
  '<label>Buscar género<input type="search" placeholder="Filtrar géneros…"></label><div id="wk-gen" class="ed-chips">'+
  genreNames.map((g,i)=>'<button class="ed-chip'+(i<4?' on':'')+'">'+g+'</button>').join('')+
  '</div></section><section class="wk-box"><h2>Etiquetas</h2><div class="wk-tags">'+
  '<input value="sirvienta, nobleza"></div></section></div>';
const extras = '<div class="wk-flt"><input type="search" id="wk-q" placeholder="Buscar capítulos">'+
  '<span class="ed-chips" role="group" aria-label="Estado"><button class="ed-chip on" aria-pressed="true">Todos</button>'+
  '<button class="ed-chip" aria-pressed="false">Borradores</button></span>'+
  '<span class="ed-chips" role="group" aria-label="Etapa"><button class="ed-chip on" aria-pressed="true">Todas</button>'+
  '<button class="ed-chip" aria-pressed="false">Corrigiendo</button></span></div>'+
  '<section class="wk-vol"><button type="button" class="wk-vh" aria-expanded="true">'+
  '<span class="wk-vc"></span><span class="wk-vt"><small>VOLUMEN 1</small><b>Volumen inicial</b>'+
  '<span>57 capítulos · Publicado</span></span><span class="wk-va">▾</span></button>'+
  '<div class="wk-vbar"><span class="wk-syn">Sinopsis del volumen</span>'+
  '<button class="btn ghost sm">Editar volumen</button><button class="btn sm">Publicar volumen</button></div>'+
  '<div class="wk-tw"><div class="wk-t"><div class="wk-th">'+
  '<span></span><span>N.º</span><span>TÍTULO</span><span>ESTADO</span><span>FECHA</span><span>ACCIONES</span></div>'+
  '<div class="wk-tr"><span class="wk-sel">☑</span><span class="mono">57</span>'+
  '<span class="wk-tt">El larguísimo capítulo en el que la heroína descubre un secreto imposible y prepara una nueva aventura</span>'+
  '<span class="mono">Publicado</span><span class="mono">20 oct 2026</span>'+
  '<span class="wk-ra"><a class="btn ghost xs" href="#">Editar</a><button class="lnk danger">Borrar</button></span></div>'+
  '</div></div></section>'+
  '<div class="s2-works"><article class="s2-work" style="--c:#f2c230"><a class="cv" href="#"></a>'+
  '<div class="bd"><span class="tg"><small>2 vol. · 57 cap.</small></span><h2><a href="#">'+esc(title)+'</a></h2>'+
  '<p>Descripción editorial de una obra larga para comprobar tarjetas y bordes.</p>'+
  '<dl><div><dt>PRÓXIMO</dt><dd>Volumen 3</dd></div><div><dt>BORRADORES</dt><dd>2</dd></div></dl>'+
  '<div class="s2-work-actions"><div class="s2-work-primary"><button class="btn">Nuevo capítulo</button><a class="btn ghost" href="#">Abrir ficha</a></div>'+
  '<div class="s2-work-recommend"><span class="s2-work-recommend-info"><b>Recomendación del equipo</b><small>Una obra a la vez en Inicio</small></span>'+
  '<button class="btn s2-feature-toggle" type="button" aria-pressed="true" aria-label="Quitar recomendación"><span aria-hidden="true">★</span><span>Destacada · Quitar</span></button></div>'+
  '<div class="s2-work-secondary"><a class="btn ghost" href="#">Importar volumen</a><a class="lnk" href="#">Ver en el sitio ↗</a></div></div></div></article></div>';
const fixture='<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body class="in-studio"><main><div class="s2">'+
  '<aside class="s2-side"><div class="s2-mobile-head"><a class="s2-brand" href="#">Estudio Editorial</a>'+
  '<button class="s2-mobile-toggle">Secciones</button></div><div class="s2-team"><b>OX-MR TRADUCCIONES</b></div>'+
  '<nav class="s2-nav">'+nav.map(n=>'<a href="#">'+n+'</a>').join('')+'</nav></aside>'+
  '<section class="st-main s2-main"><header class="s2-head"><div class="s2-ht"><small>ESTUDIO · OX-MR TRADUCCIONES · OBRAS · FICHA</small><h1>'+esc(title)+'</h1></div>'+
  '<div class="s2-tools"><label class="s2-tz"><select><option>Mi dispositivo · Ciudad de México</option></select></label>'+
  '<button class="s2-bell">鈴</button><div class="s2-srch"><input placeholder="Buscar en Estudio…"></div></div></header>'+
  '<div class="wk"><div class="wk-top"><div class="wk-summary"><span class="pl">En traducción</span>'+
  '<span class="mono">2 volúmenes · 57 publicados · 0 programados · 0 borradores</span></div>'+
  '<span class="wk-acts">'+actions+'</span></div><div class="wk-tabs">'+
  ['Volúmenes y capítulos','Datos de la obra','Avisos','Anime y galería'].map(x=>'<a href="#">'+x+'</a>').join('')+
  '</div><div class="wk-dat">'+panel1+panel2+'</div>'+extras+'</div></section></div></main>'+
  '<p id="case-result" data-qa-status="running"></p>'+
  '<script>addEventListener("load",()=>{const err=[],w=document.documentElement.clientWidth;const r=x=>x.getBoundingClientRect();'+
  'if(document.documentElement.scrollWidth>w+2)err.push("scroll horizontal "+document.documentElement.scrollWidth+" > "+w);'+
  'const main=r(document.querySelector(".s2-main")),top=r(document.querySelector(".wk-top")),dat=r(document.querySelector(".wk-dat"));'+
  'for(const sel of [".s2-head",".s2-head h1",".wk-top",".wk-tabs",".wk-dat"]){const el=document.querySelector(sel),p=r(el);if(p.left< -2||p.right>w+2)err.push(sel+" fuera del viewport");}'+
  'for(const el of document.querySelectorAll(".wk-acts > *")){const p=r(el);if(p.left<top.left-2||p.right>top.right+2||p.bottom>top.bottom+2)err.push("acción recortada: "+el.textContent);}'+
  'const cols=[...document.querySelectorAll(".wk-dat > *")].map(r);'+
  'if(dat.width<main.width*.88)err.push("ficha no aprovecha ancho");'+
  'if(cols[0].top===cols[1].top&&cols[0].right>cols[1].left+2)err.push("columnas superpuestas");'+
  'if(w>=1200&&cols[1].top>cols[0].top+5)err.push("ficha no tiene dos columnas");'+
  'if(w<=1150&&Math.abs(cols[0].left-cols[1].left)>2)err.push("columnas desalineadas");'+
  'const box=document.querySelector(".wk-box input");if(parseFloat(getComputedStyle(box).minHeight)<40)err.push("input demasiado pequeño");'+
  'if(getComputedStyle(document.querySelector(".wk-tt")).whiteSpace!=="normal")err.push("titulo de capítulo truncado");'+
  'const tb=document.querySelector(".wk-tw"), tbrect=r(tb);if(tbrect.left< -2||tbrect.right>w+2)err.push("tabla fuera del viewport");'+
  'if(w<768&&tb.scrollWidth<=tb.clientWidth)err.push("tabla móvil sin scroll interno");'+
  'const filter=r(document.querySelector(".wk-flt"));if(filter.right>w+2)err.push("filtros fuera del viewport");'+
  'const card=r(document.querySelector(".s2-work"));if(card.left< -2||card.right>w+2)err.push("tarjeta fuera del viewport");'+
  'for(const b of document.querySelectorAll(".s2-work-actions button,.s2-work-actions a")){const x=r(b);if(x.left<card.left-2||x.right>card.right+2)err.push("acción fuera: "+b.textContent);}'+
  'const p1=r(document.querySelector(".s2-work-primary")),p2=r(document.querySelector(".s2-work-recommend")),p3=r(document.querySelector(".s2-work-secondary"));'+
  'if(p2.top<p1.bottom-2||p3.top<p2.bottom-2)err.push("acciones superpuestas");'+
  'const feature=document.querySelector(".s2-feature-toggle"),style=getComputedStyle(feature);'+
  'if(feature.textContent.trim().length<8||feature.getAttribute("aria-pressed")!=="true")err.push("Destacar no identificable");'+
  'if(style.color===style.backgroundColor||style.color==="rgb(0, 0, 0)")err.push("Destacar ilegible");'+
  'if(feature.scrollWidth>feature.clientWidth+2)err.push("texto Destacar recortado");'+
  'const p=document.getElementById("case-result");p.dataset.qaStatus=err.length?"fail":"pass";p.textContent=err.join(" | ")||"Estudio bien alineado a "+w+"px";});</script></body></html>';
const parent='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><p id="qa-root" data-qa-status="running">Esperando</p>'+
  widths.map(w=>'<iframe title="Viewport '+w+'" width="'+w+'" height="1050" src="/fixture"></iframe>').join('')+
  '<script>let n=0,bad=[];for(const f of document.querySelectorAll("iframe"))f.addEventListener("load",()=>{const p=f.contentDocument.getElementById("case-result");if(p.dataset.qaStatus!=="pass")bad.push(f.width+": "+p.textContent);if(++n===6){const r=document.getElementById("qa-root");r.dataset.qaStatus=bad.length?"fail":"pass";r.textContent=bad.join(" | ")||"6 anchos comprobados";}});</script></body></html>';
const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");
  res.end(req.url?.startsWith('/fixture')?fixture:parent);
});
const chrome=process.env.QA_CHROME||['google-chrome','chromium','chromium-browser','google-chrome-stable'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Chromium no instalado');
try {
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const cmd=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server','--incognito','--window-size=1900,1150','--virtual-time-budget=14000','--dump-dom','http://127.0.0.1:'+server.address().port];
  const p=spawn(chrome,cmd,{stdio:['ignore','pipe','pipe']});let output='',errors='';
  p.stdout.on('data',d=>output+=String(d).slice(0,350000));
  p.stderr.on('data',d=>errors+=String(d).slice(0,30000));
  const code=await new Promise((ok,fail)=>{const t=setTimeout(()=>{p.kill('SIGKILL');fail(new Error('Chromium timeout'))},50000);p.once('error',e=>{clearTimeout(t);fail(e)});p.once('close',c=>{clearTimeout(t);ok(c)})});
  assert.equal(code,0,errors.slice(-500));
  const result=output.match(/<p id="qa-root" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(result,'No se obtuvo resultado QA');
  assert.equal(result[1],'pass',result[2]);
  console.log('Fase visual Estudio 2: '+result[2]);
} finally {
  await new Promise(ok=>server.close(ok));
}

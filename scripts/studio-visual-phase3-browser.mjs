// Estudio · QA responsive de Fase 3 con CSS y clases reales de la aplicación.
// Datos de prueba ficticios y Chromium sin acceso a Supabase/Vercel.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const css=readFileSync('src/styles.css','utf8')+'\n'+readFileSync('src/studio.css','utf8');
const widths=[320,390,768,1024,1440,1690];
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
  '<span class="ac"><button class="btn">Nuevo capítulo</button><a class="btn ghost" href="#">Abrir ficha</a>'+
  '<a class="btn ghost" href="#">Importar volumen</a></span></div></article></div>';
// Vistas complementarias: estructuras equivalentes a Importar, Multimedia, Glosario, Equipo y Tablero.
const tools3='<section class="qa-panel"><h2>Importar EPUB / DOCX / PDF</h2>'+
 '<ol class="imp-steps"><li class="on"><span>1</span>Archivo</li><li><span>2</span>Revisar</li><li><span>3</span>Destino</li></ol>'+
 '<div class="imp-grid"><div class="imp-list"><div class="imp-lh"><b>Secciones</b><span class="mono">Elige capítulos</span></div><ol>'+
 '<li><input type="checkbox" checked><span class="imp-t"><input value="'+esc(title)+'"><small class="mono">38 capítulos</small></span>'+
 '<select aria-label="Tipo"><option>Capítulo</option></select><span class="imp-a"><button class="ed-btn">↑</button><button class="ed-btn">↓</button><button class="ed-btn">Unir</button></span></li></ol></div>'+
 '<div class="imp-pvw"><div class="imp-lh">Vista previa <button class="ed-btn">Dividir</button></div>'+
 '<div class="imp-pv"><article class="rd-ch"><h3>'+esc(title)+'</h3><p>Vista de texto en el lector</p></article></div></div></div>'+
 '<div class="imp-dest"><section class="imp-box"><h3>Datos de la obra</h3><label>Título<input value="'+esc(title)+'"></label></section>'+
 '<section class="imp-box"><h3>Portada</h3><div class="imp-covs"><button class="imp-c none">Sin portada</button></div></section></div>'+
 '<div class="imp-nav"><button class="btn ghost">Volver</button><button class="btn">Continuar</button></div></section>'+
 '<section class="qa-panel"><h2>Multimedia</h2>'+
 '<nav class="st-crumbs mono"><a href="#">Equipo</a> / <a href="#">obras</a> / <a href="#">vol-1</a></nav>'+
 '<div class="st-row st-media-actions"><button class="btn">Subir imágenes</button><button class="btn ghost">Seleccionar</button>'+
 '<button class="btn ghost">Borrar seleccionadas</button></div>'+
 '<div class="st-media"><a class="st-dir" href="#">📁 Carpeta del volumen</a>'+
 '<label class="st-file"><input type="checkbox"><span class="mono">ilustracion-una-sirvienta-todoterreno-japonesa.webp · 228 KB</span>'+
 '<button class="lnk">Copiar URL</button><button class="lnk">Usar como portada</button></label>'+
 '<label class="st-file"><input type="checkbox"><span class="mono">archivo-de-obra-ilustracion2.png</span><button class="lnk">Copiar URL</button></label>'+
 '</div></section>'+
 '<section class="qa-panel"><h2>Glosario</h2><div class="st-row"><select id="glser"><option>'+esc(title)+'</option></select></div>'+
 '<div class="st-card gl-form"><div class="st-row"><input id="glterm" placeholder="Término"><select><option>Personaje</option></select></div>'+
 '<textarea placeholder="Definición"></textarea><div class="st-row"><button class="btn">Añadir término</button></div></div>'+
 '<div class="st-row"><input id="glq" placeholder="Buscar"><select id="glf"><option>Todos los tipos</option></select></div>'+
 '<div class="st-card gl-row"><div><strong>Término muy largo</strong><p>'+esc(title)+'</p></div>'+
 '<span><button class="lnk">Editar</button><button class="lnk danger">Borrar</button></span></div></section>'+
 '<section class="qa-panel"><h2>Equipo y roles</h2><div class="tm"><section class="tm-box">'+
 '<div class="tm-bh"><h2>Integrantes</h2><form class="tm-inv"><input type="email" placeholder="Correo del integrante">'+
 '<select><option>Traductor</option></select><button class="btn">Agregar</button></form></div>'+
 '<div class="tm-row"><span class="tm-av">MM</span><span class="tm-n"><b>Usuario de traducción extenso</b></span>'+
 '<span><select><option>Traductor</option></select></span>'+
 '<span class="tm-a"><button class="lnk">Excepciones</button><button class="lnk danger">Retirar</button></span></div></section>'+
 '<div class="rl-grid"><div class="rl-card"><b>Traductor</b><button class="btn">Editar rol</button></div>'+
 '<div class="rl-card"><b>Corrector</b><p>Correcciones</p></div></div></div></section>'+
 '<section class="qa-panel"><h2>Flujo de trabajo</h2><p class="mono s2-scroll-tip">Desliza para cambiar de etapa</p>'+
 '<div class="tb-cols" tabindex="0" aria-label="Etapas del flujo" role="region">'+
 ['Traduciendo','En corrección','Listo','Programado'].map(n=>'<div class="tb-col"><h2>'+n+'</h2>'+
 '<article class="tb-card"><b>'+esc(title)+'</b><select><option>Sin asignar</option></select></article></div>').join('')+
 '</div></section>'+
 '<section class="qa-panel"><h2>Comunidad y estadísticas</h2><div class="cm-f"><select><option>'+esc(title)+'</option></select>'+
 '<span class="lg-chips"><button class="ed-chip on">Abiertas</button><button class="ed-chip">Corregidas</button></span></div>'+
 '<div class="lg-list"><div class="cm-row"><span class="cm-w"><span class="mono">CAPÍTULO 57</span>'+
 '<span class="cm-q">'+esc(title)+'</span></span><span class="cm-a"><button class="btn">Abrir</button>'+
 '<button class="btn ghost">Marcar corregida</button></span></div></div>'+
 '<div class="st-tw" tabindex="0" role="region" aria-label="Estadísticas de capítulos">'+
 '<table class="st-t"><thead><tr>'+Array.from({length:9},(_,i)=>'<th>Columna '+i+'</th>').join('')+
 '</tr></thead><tbody><tr>'+Array.from({length:9},(_,i)=>'<td>'+(i+1)*329+'</td>').join('')+
 '</tr></tbody></table></div></section>';

const fixture='<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body class="in-studio"><main><div class="s2">'+
  '<aside class="s2-side"><div class="s2-mobile-head"><a class="s2-brand" href="#">Estudio Editorial</a>'+
  '<button class="s2-mobile-toggle">Secciones</button></div><div class="s2-team"><b>OX-MR TRADUCCIONES</b></div>'+
  '<nav class="s2-nav">'+['PUBLICACIONES','GESTIÓN'].map(g=>'<div class="s2-nav-group"><span class="s2-nav-label">'+g+'</span>'+nav.map(n=>'<a href="#">'+n+'</a>').join('')+'</div>').join('')+'</nav><a class="s2-back" href="/">Volver al sitio</a></aside>'+
  '<section class="st-main s2-main"><header class="s2-head"><div class="s2-ht"><small>ESTUDIO · OX-MR TRADUCCIONES · OBRAS · FICHA</small><h1>'+esc(title)+'</h1></div>'+
  '<div class="s2-tools"><label class="s2-tz"><select><option>Mi dispositivo · Ciudad de México</option></select></label>'+
  '<button class="s2-bell">鈴</button><div class="s2-srch"><input placeholder="Buscar en Estudio…"></div></div></header>'+
  '<div class="wk"><div class="wk-top"><div class="wk-summary"><span class="pl">En traducción</span>'+
  '<span class="mono">2 volúmenes · 57 publicados · 0 programados · 0 borradores</span></div>'+
  '<span class="wk-acts">'+actions+'</span></div><div class="wk-tabs">'+
  ['Volúmenes y capítulos','Datos de la obra','Avisos','Anime y galería'].map(x=>'<a href="#">'+x+'</a>').join('')+
  '</div><div class="wk-dat">'+panel1+panel2+'</div>'+extras+tools3+'</div></section></div></main>'+
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
  'if(w<=700&&tb.scrollWidth>tb.clientWidth+2)err.push("capítulos siguen recortados a pesar de las tarjetas móviles");'+
  'const filter=r(document.querySelector(".wk-flt"));if(filter.right>w+2)err.push("filtros fuera del viewport");'+
  'const card=r(document.querySelector(".s2-work"));if(card.left< -2||card.right>w+2)err.push("tarjeta fuera del viewport");'+
  'for(const b of document.querySelectorAll(".s2-work .ac > *")){const x=r(b);if(x.left<card.left-2||x.right>card.right+2)err.push("acción de tarjeta fuera");}'+
  'for(const q of [".imp-grid",".imp-list",".imp-pvw",".imp-dest",".st-media",".gl-form",".gl-row",".tm",".rl-grid",".tb-cols",".cm-f",".cm-row",".st-tw"]){const e=document.querySelector(q),p=r(e);if(p.left< -2||p.right>w+2)err.push(q+" desbordado");}'+
  'const tbc=document.querySelector(".tb-cols"),stt=document.querySelector(".st-tw");'+
  'if(w<=860&&tbc.scrollWidth<=tbc.clientWidth)err.push("tablero sin scroll local");'+
  'if(w<=860&&stt.scrollWidth<=stt.clientWidth)err.push("estadísticas sin scroll local");'+
  'const as=document.querySelector(".s2-side"),nav=document.querySelector(".s2-nav"),back=document.querySelector(".s2-back");'+
  'if(w<=860){if(getComputedStyle(nav).display!=="none")err.push("menú móvil visible cerrado");as.classList.add("nav-open");if(getComputedStyle(nav).display==="none")err.push("menú móvil no abre");if(getComputedStyle(back).display==="none")err.push("volver al sitio oculto");as.classList.remove("nav-open");}'+
  'else if(getComputedStyle(document.querySelector(".s2-nav-label")).display==="none")err.push("grupos desktop ocultos");'+
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
  console.log('Fase visual Estudio 3: '+result[2]);
} finally {
  await new Promise(ok=>server.close(ok));
}

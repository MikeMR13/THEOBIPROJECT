// Fase 2 móvil: Chromium real, 320/375/390/430 px; datos ficticios, sin backend.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

const ui=readFileSync('src/ui.js','utf8'),styles=readFileSync('src/styles.css','utf8');
const studio=readFileSync('src/studio.css','utf8');
const tick=String.fromCharCode(96);
const cssPart=name=>{
 const from='const '+name+' = '+tick,a=ui.indexOf(from),b=ui.indexOf(tick+';',a+from.length);
 assert(a!==-1&&b>a,'CSS '+name);return ui.slice(a+from.length,b);
};
const css=styles+'\n'+studio+'\n'+cssPart('CSS')+'\n'+cssPart('HOME_CSS');
for (const [source,marker] of [
 [ui,'ob-swipe-hint'],[ui,'ui-filter-chevron'],
 [styles,'.ui-qvc .acts>.btn'],[styles,'body.in-studio .imp-steps'],
 [styles,'body.in-studio :is(.wk-save,.wk-bulk)']
])assert(source.includes(marker),'Falta cambio móvil: '+marker);
const widths=[320,375,390,430];
const cards=Array.from({length:5},(_,i)=>'<a class="ob-cc" href="/serie/demo'+i+'"><span class="cv"></span><b>¿Qué pasaría si salvara a una chica de preparatoria que está a punto de lanzarse al vacío?</b><small>Romance · Fantasía</small></a>').join('');
const home='<main class="ob-page" style="margin:auto;max-width:100%;padding:12px">'+
 '<section class="ob-sec"><div class="ob-st"><span class="k">推薦</span><h2>Para ti</h2>'+
 '<span class="r2"><span class="mono">porque lees Comedia y Escolar</span><span class="ob-arr"><button aria-label="Anterior">‹</button><button aria-label="Siguiente">›</button></span></span>'+
 '<span class="ob-swipe-hint" aria-hidden="true">Desliza para explorar →</span></div>'+
 '<div class="ob-car" role="region" aria-roledescription="carrusel" aria-label="Recomendaciones" tabindex="0">'+cards+'</div></section></main>';
const long='¿Qué pasaría si salvara a una chica de preparatoria que está a punto de lanzarse al vacío?';
const catalog='<main style="margin:auto;max-width:100%;padding:12px">'+
 '<div class="ui-cath"><div><h1>Catálogo</h1><p>Fichero de novelas del lector</p></div></div>'+
 '<div class="ui-filters" style="padding:12px"><input id="cat-q" type="search" placeholder="Buscar novelas" style="font-size:16px;max-width:100%;box-sizing:border-box">'+
 '<details class="ui-fdet"><summary>Filtros <b>3</b><span class="ui-filter-chevron" aria-hidden="true">▾</span></summary>'+
 '<div class="ui-fbody"><div class="ui-fcols"><div class="ui-fcol"><span class="ui-lbl">Géneros</span><div class="ui-chips"><button class="ui-chip">Romance</button><button class="ui-chip">Comedia</button></div></div></div></div></details>'+
 '<div class="ui-fend"><span>Ocultar +18</span><div class="r"><span class="ui-chips"><button class="ui-chip">Fichero</button><button class="ui-chip">Portadas</button></span><span class="cnt">9 obras</span></div></div></div>'+
 '<div class="ui-fich"><a href="/serie/demo" class="ui-fc" style="--c:#f2c230"><span class="cv"></span><span class="bd"><b class="t">'+long+'</b>'+
 '<span class="o">Autor japonés · Una novela con nombre extenso</span><p class="sy">'+long.repeat(3)+'</p><span class="m">55 secciones · Completa</span></span>'+
 '<span class="side"><span class="ui-seal">LEYENDO</span><span class="jp">第七号</span></span></a></div></main>'+
 '<div class="ui-qv" id="dialog" hidden><div class="ui-qvc" role="dialog" aria-modal="true" aria-labelledby="qtitle">'+
 '<span class="ui-book" style="display:block;width:100%;aspect-ratio:2/3;background:#59391b"></span><div><h2 id="qtitle">'+long+'</h2>'+
 '<p class="syn">'+long.repeat(6)+'</p><div class="acts"><a class="btn" href="/leer/demo/1">Leer desde el inicio</a>'+
 '<button class="btn ghost">Seguir serie</button><a class="btn ghost" href="/serie/demo">Ver ficha completa</a></div></div></div></div>';
const input=(label,type='text')=>'<label>'+label+'<input type="'+type+'" value="'+long+'"></label>';
const studioView='<main class="s2"><div class="s2-main"><header class="s2-head"><h1>Importar contenido</h1></header>'+
 '<ol class="imp-steps"><li class="done"><span>1</span>Archivo</li><li class="on"><span>2</span>Revisar</li><li><span>3</span>Destino</li></ol>'+
 '<div class="imp-sum"><span><b>'+long+'</b><small>5 secciones · EPUB</small></span></div>'+
 '<div class="imp-grid"><div class="imp-list"><ol><li><input type="checkbox" checked>'+
 '<span class="imp-t">'+input('Título')+'</span><select><option>Capítulo</option></select><span class="imp-a"><button class="ed-btn">↑</button><button class="ed-btn">↓</button></span></li></ol></div></div>'+
 '<div class="wk-dat"><div class="wk-col"><section class="wk-box"><h2>Ficha del volumen</h2>'+input('Título en español')+
 '<label>Fecha<input type="datetime-local"></label><label>Sinopsis<textarea rows="4">'+long.repeat(2)+'</textarea></label></section></div></div>'+
 '<div class="wk-save"><button class="btn">Guardar cambios</button><button class="btn ghost">Cancelar</button></div></div></main>';
const js=`addEventListener('load',()=>{
 const errors=[],w=document.documentElement.clientWidth,view=document.body.dataset.view;
 const rect=s=>document.querySelector(s)?.getBoundingClientRect();
 const widthOk=(r,label)=>{if(!r||r.width<105||r.right>w+3)errors.push(label+' '+(r?.width||0))};
 if(view==='home'){
  widthOk(rect('.ob-st h2'),'Encabezado');
  const hint=document.querySelector('.ob-swipe-hint'),car=document.querySelector('.ob-car');
  if(getComputedStyle(hint).display==='none')errors.push('Indicación de deslizamiento oculta');
  if(car.scrollWidth<=car.clientWidth)errors.push('Carrusel no desplazable');
  if(!getComputedStyle(car).scrollSnapType.includes('x'))errors.push('Sin scroll snap');
  if(rect('.ob-car').right>w+3)errors.push('Carrusel excede pantalla');
 }
 if(view==='catalog'){
  const d=document.querySelector('.ui-fdet'),sm=d.querySelector('summary');
  if(rect('.ui-fc .bd').width<100)errors.push('Ficha estrecha');
  if(rect('.ui-fc').right>w+3)errors.push('Ficha fuera de pantalla');
  if(sm.getBoundingClientRect().height<44)errors.push('Filtro difícil de tocar');
  sm.click();if(!d.open)errors.push('Filtro no abre');
  const q=document.querySelector('#dialog');q.hidden=false;
  if(rect('.ui-qvc').right>w+3)errors.push('Vista rápida fuera');
  if(rect('.ui-qvc').height>innerHeight+2)errors.push('Vista rápida demasiado alta');
  if([...q.querySelectorAll('.acts>.btn')].some(b=>b.getBoundingClientRect().height<42))errors.push('Botones de vista rápida pequeños');
 }
 if(view==='studio'){
  if(parseFloat(getComputedStyle(document.querySelector('.wk-box input')).fontSize)<16)errors.push('Zoom de iOS en formulario');
  if(parseFloat(getComputedStyle(document.querySelector('.imp-t input')).fontSize)<16)errors.push('Zoom de iOS en importador');
  if(rect('.wk-box').right>w+3)errors.push('Formulario excede pantalla');
  if(rect('.imp-sum').right>w+3)errors.push('Resumen de importación excede pantalla');
  if([...document.querySelectorAll('.imp-a button')].some(b=>b.getBoundingClientRect().height<42))errors.push('Botones del importador pequeños');
 }
 if(document.documentElement.scrollWidth>w+3)errors.push('Desbordamiento horizontal '+document.documentElement.scrollWidth+' > '+w);
 const out=document.querySelector('#result');out.dataset.qa=errors.length?'fail':'pass';out.textContent=errors.join(' | ')||'OK '+w+' '+view;
});`;
const page=view=>'<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+
 '\n:root{--gold:#f2c230;--paper:#f3ecd9;--line:#2f2a20;--mute:#a89f8a}'+
 '*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#0d0c0a;color:#f3ecd9;font-family:Arial,sans-serif;max-width:100%}'+
 '</style></head><body class="'+(view==='studio'?'in-studio':'')+'" data-view="'+view+'">'+
 (view==='home'?home:view==='catalog'?catalog:studioView)+
 '<p id="result" data-qa="running"></p><script>'+js+'</script></body></html>';
const cases=widths.flatMap(w=>['home','catalog','studio'].map(view=>({w,view})));
// Polling independiente de load: un iframe puede terminar antes de registrar el listener.
const parentScript=`(()=>{
 const frames=[...document.querySelectorAll('iframe')];
 const out=document.querySelector('#qa');let attempts=0;
 const inspect=()=>{
   const states=frames.map(f=>{
     try{const el=f.contentDocument?.querySelector('#result');return {frame:f,state:el?.dataset.qa||'running',label:el?.textContent||'sin respuesta'};}
     catch(e){return {frame:f,state:'running',label:String(e)};}
   });
   if(states.some(x=>x.state==='running') && ++attempts<600) return requestAnimationFrame(inspect);
   const bad=states.filter(x=>x.state!=='pass').map(x=>x.frame.title+': '+x.label);
   out.dataset.qa=bad.length?'fail':'pass';
   out.textContent=bad.join(' | ')||'Inicio, Catálogo y Studio móviles: 320,375,390,430 OK';
 };
 requestAnimationFrame(inspect);
})();`;
const parent='<!doctype html><html><body><output id="qa" data-qa="running">RUNNING</output>'+
 cases.map(({w,view})=>'<iframe width="'+w+'" height="900" title="'+view+' '+w+'" src="/case?view='+view+'"></iframe>').join('')+
 '<script>'+parentScript+'</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';frame-src 'self'");res.end(req.url.startsWith('/case')?page(new URL(req.url,'http://localhost').searchParams.get('view')):parent)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(bin,'Falta Chromium');
try{
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});

 // En runners compartidos a veces --dump-dom termina antes de que los 12 iframes
 // publiquen el resultado; reintentar solo cuando NO existe resultado, nunca ante un fallo real.
 let completed=false;
 for (const budget of [16000,32000]) {
   const c=spawn(bin,['--headless=new','--no-first-run','--no-sandbox','--disable-gpu',
     '--disable-dev-shm-usage','--disable-background-networking','--window-size=1660,1100',
     '--virtual-time-budget='+budget,'--dump-dom','http://127.0.0.1:'+server.address().port],
     {stdio:['ignore','pipe','pipe']});
   let out='',err='';
   c.stdout.on('data',x=>{out+=String(x)});
   c.stderr.on('data',x=>{err+=String(x).slice(0,12000)});
   const code=await new Promise((ok,fail)=>{
     const tm=setTimeout(()=>{c.kill('SIGKILL');fail(Error('Chromium timeout '+budget))},75000);
     c.once('error',e=>{clearTimeout(tm);fail(e)});
     c.once('close',n=>{clearTimeout(tm);ok(n)});
   });
   assert.equal(code,0,err.slice(-700));
   const m=out.match(/<output id="qa" data-qa="(pass|fail)">([\\s\\S]*?)<\\/output>/);
   if(m){assert.equal(m[1],'pass',m[2]);console.log(m[2]);completed=true;break;}
   if(budget===32000)throw Error('Sin resultado Chromium después de reintentar: '+out.slice(-900)+' / '+err.slice(-900));
 }
 assert(completed,'No se completó la prueba móvil');

}finally{await new Promise(ok=>server.close(ok))}

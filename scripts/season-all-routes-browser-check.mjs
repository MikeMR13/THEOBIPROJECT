// Matriz estacional sin backend: CSS y motor de temporada reales + controles representativos.
// Los resultados NO equivalen a recorrer cuentas autenticadas ni a capturas de producción.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {SEASONS} from '../src/anim.js';
import {normalize,render as renderTeam} from '../src/teampage.js';

const get=p=>readFileSync(p,'utf8');
const keys=Object.keys(SEASONS);
const app=get('src/app.js'),ui=get('src/ui.js'),season=get('src/season.js');
assert(keys.length>=20,'Catálogo de temporadas incompleto');
assert(season.includes('.obi-sea-layer.over{z-index:0'),'Partículas todavía encima de botones');
assert(season.includes('html[data-season] #app'),'El patrón puede cruzar el contenido');
const routes=[
['/','home','home'],['/catalogo','catalog','catalog'],['/buscar','catalog','page'],
['/calendario','calendar','releases'],['/lanzamientos','calendar','releases'],
['/ranking','ranking','page'],['/serie/obra-publica','series','series'],
['/serie/obra-preestreno','series','series'],['/equipo/equipo','team','team'],
['/lector/lector','account','page'],['/leer/obra/1','reader','reader'],
['/anotaciones/obra','reader','page'],['/biblioteca','library','page'],
['/apoyar','support','page'],['/entrar','account','page'],
['/registro','account','page'],['/perfil','account','page'],
['/preferencias','preferences','page'],['/solicitud','account','page'],
['/elige-nombre','account','page'],['/privacidad','legal','page'],
['/condiciones-servicio','legal','page'],['/invitacion','account','page'],
['/mi-equipo','team','page'],['/descargas','library','page'],
['/estudio','studio','studio'],['/estudio/obras','studio','studio'],
['/estudio/flujo','studio','studio'],['/estudio/preferencias','studio','studio'],
['/estudio/comunidad','studio','studio'],['/estudio/difusion','studio','studio'],
['/bibliotecario','admin','admin']
];
for(const [route] of routes){
  assert(app.includes("'"+route+"'") ||
    (route.startsWith('/serie/')&&app.includes("p.match(/^\\/serie\\/")) ||
    (route.startsWith('/equipo/')&&app.includes("p.match(/^\\/equipo\\/")) ||
    (route.startsWith('/lector/')&&app.includes("p.match(/^\\/lector\\/")) ||
    (route.startsWith('/leer/')&&app.includes("p.match(/^\\/leer\\/")) ||
    (route.startsWith('/anotaciones/')&&app.includes("p.match(/^\\/anotaciones\\/")) ||
    (route.startsWith('/estudio/')&&app.includes("p.startsWith('/estudio')")) ||
    (route==='/descargas'&&app.includes("p === '/descargas'")),
    'Ruta no encontrada en app: '+route);
}
const design=normalize({theme:'tinta',seasons:{manual:'halloween',deco:'full'}},'#ff7a1a');
const team={t:{id:'fake',slug:'equipo',name:'Equipo QA',color:'#ff7a1a',design,settings:{},langs:['ja']},works:[],mem:[],next:null};
for(const k of keys){
  const html=renderTeam(team,{...design,seasons:{...design.seasons,manual:k}},
    {esc:x=>String(x??''),media:x=>String(x??''),sim:k});
  assert(html.includes('data-season="'+k+'"'),'Equipo no representa la temporada: '+k);
}
const css2=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(css2,'No se encuentra CSS2 original');
const tick=String.fromCharCode(96);
function cssBlock(name){
  const marker='const '+name+' = '+tick, i=ui.indexOf(marker);
  assert(i>=0,'Falta CSS '+name);
  const j=ui.indexOf(tick+';',i+marker.length);
  assert(j>i,'CSS sin cierre '+name);
  return ui.slice(i+marker.length,j);
}
const css=get('src/styles.css')+'\n'+get('src/reader-a11y.css')+'\n'+
  JSON.parse(css2[1])+'\n'+['HOME_CSS','RK_CSS','SR_CSS','RV_CSS'].map(cssBlock).join('\n');
function checkPage(){
 const out=document.getElementById('audit'),problems=[],routes=window.ROUTES,
   keys=window.KEYS,SE=window.SE;
 let cells=0,buttons=0,tabs=0;
 const common='<div class="qa-tabs" role="tablist">'+
   '<button role="tab" aria-selected="true">General</button>'+
   '<button role="tab" aria-selected="false">Volúmenes</button>'+
   '<button role="tab" aria-selected="false">Historial</button></div>'+
   '<section class="qa-actions"><button class="btn qa-filled">Acción principal</button>'+
   '<a href="/catalogo" class="btn ghost">Acción secundaria</a>'+
   '<button class="qa-menu-btn" aria-expanded="false">Opciones</button>'+
   '<div class="qa-menu" hidden><a href="/ranking">Ranking</a><button>Cerrar</button></div>'+
   '<details class="qa-details"><summary>Mostrar detalles</summary><a href="/serie/obra">Obra</a></details>'+
   '<label>Buscar <input type="search" aria-label="Buscar"></label></section>';
 const templates={
  home:'<section id="hero" class="qa-hero"><div class="ob-acts"><a class="a1" href="/serie/obra">Ver volumen</a><a class="a2" href="/calendario">Ver calendario</a></div><a class="rk-bdg" href="/ranking">Top semanal</a></section>',
  catalog:'<div class="qa-filters"><button class="ui-chip">Nuevos</button><button class="ui-chip">Todos</button><a href="/serie/obra">Ver ficha</a></div>',
  calendar:'<div class="qa-filters"><button class="ag-btn">Semana</button><button class="ag-btn">Mes</button><a class="ag-btn" href="/calendario">Calendario</a></div>',
  ranking:'<nav class="qa-nav"><a href="/ranking">Semana</a><a href="/ranking">Mes</a></nav>',
  series:'<div class="ui-series-page"><nav class="ui-series-views"><button aria-pressed="true">Galería</button><button aria-pressed="false">Lista</button></nav><div class="ui-series-actions"><a class="btn" href="/leer/obra/1">Leer desde el inicio</a><a class="btn ghost" href="/calendario">Calendario</a></div></div>',
  team:'<div class="qa-nav"><a href="/equipo/equipo">Grupo</a><button class="btn">Seguir grupo</button></div>',
  reader:'<div class="rd"><div class="rd-bar"><div class="rd-tools"><button class="btn ghost">Opciones lectura</button><button class="btn">Continuar</button></div></div></div>',
  library:'<nav class="lb-tabs"><a href="/biblioteca">Leyendo</a><a href="/biblioteca?t=guardadas">Guardadas</a><a href="/biblioteca?t=finalizadas">Terminadas</a></nav><button class="btn">Continuar</button>',
  preferences:'<nav class="qa-nav"><a href="/preferencias?s=cuenta">Cuenta</a><a href="/preferencias?s=avisos">Avisos</a></nav><button class="btn">Guardar preferencias</button>',
  account:'<form><label>Correo <input type="email" value="qa@example.invalid"></label><button type="button" class="btn">Enviar</button></form>',
  support:'<a class="btn" href="/apoyar">Apoyar</a>',
  legal:'<a href="/privacidad">Privacidad</a>',
  studio:'<nav class="qa-nav"><a href="/estudio/obras">Obras</a><a href="/estudio/flujo">Tablero</a></nav><button class="btn">Guardar</button>',
  admin:'<button class="btn">Revisar</button>'
 };
 const err=(k,p,msg)=>problems.push(k+' '+p+' '+msg);
 const hit=el=>{
   el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
   const r=el.getBoundingClientRect();
   const x=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2));
   const y=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2));
   const target=document.elementFromPoint(x,y);
   return !!target&&(target===el||el.contains(target));
 };
 for(const k of keys){
   for(const [p,type,kind] of routes){
     const app=document.getElementById('app');
     app.innerHTML='<div class="qa-shell">'+(templates[type]||'')+common+'</div>';
     const tablist=app.querySelector('.qa-tabs');
     for(const tab of tablist.querySelectorAll('[role=tab]'))tab.onclick=()=>{
       for(const item of tablist.querySelectorAll('[role=tab]'))
         item.setAttribute('aria-selected',String(item===tab));
     };
     const toggle=app.querySelector('.qa-menu-btn'),menu=app.querySelector('.qa-menu');
     toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
     if(kind==='admin')SE.clear();else SE.apply(kind,{key:k,greet:''});
     cells++;
     const pat=document.querySelector('.obi-sea-pat'),part=document.querySelector('.obi-sea-layer');
     if(kind!=='admin'&&document.documentElement.dataset.season!==k)err(k,p,'tema no aplicado');
     if(kind==='admin'&&(pat||part))err(k,p,'decoración en panel excluido');
     if(pat){
       const mainStyle=getComputedStyle(app),patStyle=getComputedStyle(pat);
       if(mainStyle.position!=='relative'||Number(mainStyle.zIndex)<=Number(patStyle.zIndex))
         err(k,p,'patrón por encima del contenido');
       if(patStyle.pointerEvents!=='none')err(k,p,'patrón captura clics');
     }
     if(part){
       if(getComputedStyle(part).pointerEvents!=='none')err(k,p,'partículas capturan clics');
       if(Number(getComputedStyle(part).zIndex)>=Number(getComputedStyle(app).zIndex))
         err(k,p,'partículas cubren botones');
     }
     const interactives=[...app.querySelectorAll('a,button,summary,input')].filter(x=>!x.closest('[hidden]')&&(!x.closest('details:not([open])')||x.matches('summary')));
     for(const x of interactives){
       const style=getComputedStyle(x),rect=x.getBoundingClientRect();
       if(style.visibility==='hidden'||rect.width<1||rect.height<1||style.pointerEvents==='none')
         err(k,p,'control invisible: '+x.textContent.trim().slice(0,20));
       else if(!hit(x))err(k,p,'control obstruido: '+x.textContent.trim().slice(0,20));
       buttons++;
     }
     for(const x of app.querySelectorAll('.qa-filled,.ob-acts .a1,.ob-acts .a2')){
       const background=getComputedStyle(x).backgroundColor;
       if(background==='transparent'||background.endsWith(', 0)'))
         err(k,p,'botón sólido transparente: '+x.textContent.trim());
     }
     const target=[...tablist.querySelectorAll('[role=tab]')][1];target.click();
     if(target.getAttribute('aria-selected')!=='true')err(k,p,'pestaña inoperante');
     tabs++;
     const details=app.querySelector('.qa-details');details.querySelector('summary').click();
     if(!details.open)err(k,p,'desplegable inoperante');
     details.querySelector('summary').click();
     toggle.click();
     if(menu.hidden||toggle.getAttribute('aria-expanded')!=='true')err(k,p,'menú inoperante');
     toggle.click();
     if(problems.length>100)break;
   }
   if(problems.length>100)break;
 }
 out.dataset.qa=problems.length?'fail':'pass';
 out.dataset.cells=String(cells);out.dataset.buttons=String(buttons);out.dataset.tabs=String(tabs);
 out.textContent=problems.join(' | ')||'OK '+keys.length+' temas, '+routes.length+' rutas, '+buttons+' controles y '+tabs+' pestañas';
}
const fixture='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
 css+'\n.qa-shell{max-width:780px;min-height:220px;margin:65px auto 40px;padding:16px;background:#16140f;border:1px solid #3d3628}'+
 '.qa-shell a,.qa-shell button,.qa-shell summary{cursor:pointer}'+
 '.qa-tabs,.qa-nav,.qa-actions,.qa-filters,.qa-menu,.qa-shell form{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:10px 0}'+
 '.qa-tabs button,.qa-menu-btn{padding:10px;border:1px solid #776341;min-height:44px;background:#2c2115;color:#f3ecd9}'+
 '.qa-tabs button[aria-selected=true]{background:#ffa23a;color:#1e140a}'+
 '.qa-menu[hidden]{display:none}.qa-hero{padding:12px}.qa-hero .ob-acts{display:flex;margin:0;gap:10px}'+
 '.qa-hero .ob-acts a{display:inline-flex;padding:12px}.qa-hero .a1{background:#ffa23a;color:#1e140a}.qa-hero .a2{background:#2c2115;color:#fff4e5}'+
 '.qa-filled{background:#ffa23a!important;color:#1e140a!important}.qa-shell label{display:block}.qa-shell input{width:180px}'+
 '.qa-shell .rd{min-height:0}.qa-shell .rd-bar{position:relative}.qa-shell .ui-series-page{margin:0}'+
 '</style></head><body><header class="top"><a href="/" class="ob-brand">El Obi del Lector</a></header>'+
 '<main id="app"></main><footer class="foot">Pie de página</footer><div id="audit" data-qa="running">RUNNING</div>'+
 '<script type="module">import * as S from "/season.js?v=5";window.SE=S;window.KEYS='+JSON.stringify(keys)+';window.ROUTES='+JSON.stringify(routes)+';('+checkPage.toString()+')();</script></body></html>';
const chrome=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser']
 .map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Chromium no disponible');
const server=createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');
 if(/^\/[\w-]+\.js$/.test(p)){
   try{res.setHeader('Content-Type','text/javascript');res.end(get('src'+p));}
   catch{res.writeHead(404);res.end('not found');}
   return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);
});
async function browse(w,reduced){
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-background-networking','--no-first-run','--window-size='+w+',900',
   '--virtual-time-budget=20000','--dump-dom'];
 if(reduced)args.push('--force-prefers-reduced-motion=reduce');
 args.push('http://127.0.0.1:'+server.address().port);
 const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
 let out='',err='';
 child.stdout.on('data',x=>out+=String(x));
 child.stderr.on('data',x=>err+=String(x).slice(0,10000));
 const exit=await new Promise((ok,no)=>{
   const t=setTimeout(()=>{child.kill('SIGKILL');no(Error('Timeout Chromium '+w));},70000);
   child.once('error',e=>{clearTimeout(t);no(e)});
   child.once('close',c=>{clearTimeout(t);ok(c)});
 });
 assert.equal(exit,0,err.slice(-500));
 const match=out.match(/<div id="audit" data-qa="(pass|fail)"[^>]*>([\s\S]*?)<\/div>/);
 assert(match,'Sin resultado Chromium '+w);
 assert.equal(match[1],'pass',w+'px: '+match[2].slice(0,1800));
 const cells=Number(out.match(/data-cells="(\d+)"/)?.[1]);
 const buttons=Number(out.match(/data-buttons="(\d+)"/)?.[1]);
 assert.equal(cells,keys.length*routes.length,'Casos incompletos '+cells);
 console.log('✓',w,reduced?'reducido':'normal',cells,'casos',buttons,'controles');
 return {width:w,reduced,cells,buttons};
}
const reports=[];
try{
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 reports.push(await browse(390,true));
 reports.push(await browse(1440,true));
 reports.push(await browse(390,false));
}finally{server.closeAllConnections();await new Promise(ok=>server.close(ok))}
mkdirSync('qa-capturas',{recursive:true});
writeFileSync('qa-capturas/auditoria-todos-temas.json',JSON.stringify({
 description:'Motor estacional y CSS reales con controles representativos; NO es navegación autenticada de todas las rutas',
 seasons:keys,routes:routes.map(x=>x[0]),reports
},null,2));
console.log('✓ Auditoría de temporadas completada');

// Auditoría visual del sitio REAL, en navegador Chromium y sin credenciales.
// No usa datos ficticios; sólo lee páginas anónimas y genera capturas/diagnóstico.
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const BASE=process.env.AUDIT_BASE_URL||'https://elobidellector.com';
const OUT='qa-capturas/auditoria-real';
mkdirSync(OUT,{recursive:true});
const executable=process.env.QA_CHROME||['google-chrome','chromium','google-chrome-stable','chromium-browser']
  .map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
if(!executable)throw Error('Chromium no disponible');
const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const MAX=32;
const pages=[
 ['inicio','/'],['catalogo','/catalogo'],['calendario','/calendario'],['ranking','/ranking'],
 ['lanzamientos','/lanzamientos'],['buscar','/buscar?q=bruja'],['apoyar','/apoyar'],
 ['entrar','/entrar'],['registro','/registro'],['privacidad','/privacidad'],
 ['condiciones','/condiciones-servicio'],['biblioteca-anonima','/biblioteca'],
 ['preferencias-anonima','/preferencias'],['perfil-anonimo','/perfil']
];
const all=[],issues=[],captures=[],observed={series:null,team:null,reader:null};
const contexts=[
 {name:'movil390',width:390,height:844,isMobile:true,deviceScaleFactor:1},
 {name:'pc1440',width:1440,height:900,deviceScaleFactor:1},
 {name:'movil320',width:320,height:720,isMobile:true,deviceScaleFactor:1}
];
function clean(str){return String(str||'').replace(/\s+/g,' ').trim().slice(0,180)}
const inspect=()=> {
 const W=document.documentElement.clientWidth,H=innerHeight;
 const app=document.querySelector('#app');
 const visible=el=>{
  const r=el.getBoundingClientRect(),s=getComputedStyle(el);
  return s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity>.08&&r.width>4&&r.height>4
    &&r.right>0&&r.bottom>0&&r.top<H&&r.left<W;
 };
 const allcontrols=[...document.querySelectorAll('a[href],button,summary,input,select,[role="tab"],[role="button"]')];
 const bad=[],ui=[];
 for(const el of allcontrols.filter(visible).slice(0,MAX)){
  const r=el.getBoundingClientRect(),s=getComputedStyle(el);
  const x=Math.max(1,Math.min(W-1,r.left+r.width/2)),y=Math.max(1,Math.min(H-1,r.top+r.height/2));
  const hit=document.elementFromPoint(x,y);
  const accessible=!!hit&&(hit===el||el.contains(hit));
  const name=clean(el.innerText||el.getAttribute('aria-label')||el.getAttribute('title')||el.placeholder).slice(0,65);
  const bg=s.backgroundColor;
  const record={name,tag:el.tagName,cls:clean(el.className).slice(0,70),background:bg,opacity:s.opacity,
   w:Math.round(r.width),h:Math.round(r.height),hit:accessible,href:el.getAttribute('href')||''};
  ui.push(record);
  if(!accessible)bad.push('Control posiblemente tapado: '+name);
  if(el.tagName==='BUTTON' && r.height<28)bad.push('Botón visible de menos de 28px: '+name+' ('+Math.round(r.height)+'px)');
 }
 const images=[...document.images].filter(visible);
 const broken=images.filter(el=>el.complete && !el.naturalWidth && el.currentSrc).slice(0,12).map(el=>el.currentSrc);
 if(broken.length)bad.push('Imágenes visibles rotas: '+broken.length);
 const delta=document.documentElement.scrollWidth-W;
 if(delta>4)bad.push('Desbordamiento horizontal: '+delta+'px');
 const a=app&&getComputedStyle(app),pattern=document.querySelector('.obi-sea-pat'),layer=document.querySelector('.obi-sea-layer');
 const layerState={season:document.documentElement.dataset.season||null,appZ:a?.zIndex??null,
  patternZ:pattern&&getComputedStyle(pattern).zIndex,particlesZ:layer&&getComputedStyle(layer).zIndex};
 const hero=document.querySelector('#hero'),vitrina=document.querySelector('.vt-row');
 const hr=hero?.getBoundingClientRect(),vr=vitrina?.getBoundingClientRect();
 return {path:location.pathname,search:location.search,title:document.title,
  h1:[...document.querySelectorAll('h1')].slice(0,3).map(x=>clean(x.innerText)),
  appText:clean(app?.innerText).slice(0,180),appChildren:app?.children.length||0,
  width:W,height:H,scrollWidth:document.documentElement.scrollWidth,
  scrollHeight:document.documentElement.scrollHeight,heroHeight:hr&&Math.round(hr.height),
  vitrinaHeight:vr&&Math.round(vr.height),layerState,visibleControls:ui.length,controls:ui,
  broken,issues:bad};
};
async function shot(context,item,theme){
 const [name,route]=item,ctx=await browser.newContext({...context,locale:'es-MX',
  reducedMotion:theme?'reduce':'no-preference',serviceWorkers:'block'});
 const page=await ctx.newPage();page.setDefaultTimeout(15000);
 const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(clean(e.message)));
 page.on('requestfailed',r=>{if(failed.length<10)failed.push({url:r.url().slice(0,160),reason:r.failure()?.errorText})});
 const search=theme?(route.includes('?')?'&':'?')+'temporada='+theme:'';
 let status=0,navError=null;
 try{
  const res=await page.goto(BASE+route+search,{waitUntil:'domcontentloaded',timeout:22000});
  status=res?.status()||0;
  await page.waitForTimeout(name==='inicio'?4200:2600);
  // El script evalúa el DOM real, no una maqueta aislada.
  let result=await page.evaluate(inspect);
  const fname=[context.name,name,theme||'normal'].join('-').replace(/[^\w-]/g,'_')+'.png';
  await page.screenshot({path:OUT+'/'+fname,fullPage:false,animations:'disabled',timeout:12000});
  captures.push(fname);
  if(name==='inicio'&&context.width>=390&&!theme){
   const links=await page.locator('a[href^="/serie/"]').evaluateAll(els=>els.map(e=>e.getAttribute('href')).filter(Boolean));
   const teams=await page.locator('a[href^="/equipo/"]').evaluateAll(els=>els.map(e=>e.getAttribute('href')).filter(Boolean));
   const reads=await page.locator('a[href^="/leer/"]').evaluateAll(els=>els.map(e=>e.getAttribute('href')).filter(Boolean));
   observed.series ||=links.find(Boolean)||null;
   observed.team ||=teams.find(Boolean)||null;
   observed.reader ||=reads.find(Boolean)||null;
  }
  // Vista posterior al carrusel: importante para apreciar cuánto ocupa en PC.
  if(name==='inicio'&&!theme&&context.width>=390){
   await page.evaluate(()=>scrollTo(0,Math.round(innerHeight*.7)));
   await page.waitForTimeout(350);
   const scrolldown=context.name+'-inicio-tras-scroll.png';
   await page.screenshot({path:OUT+'/'+scrolldown,fullPage:false,animations:'disabled'});
   captures.push(scrolldown);
  }
  const row={viewport:context.name,name,route,theme:theme||'normal',status,
   ...result,jsErrors:errors.slice(0,8),requestFailures:failed.slice(0,8)};
  if(status>=400)row.issues.push('HTTP '+status);
  if(result.appChildren===0)row.issues.push('Contenido principal vacío');
  all.push(row);
  for(const issue of row.issues)issues.push({viewport:context.name,route,theme:theme||'normal',issue});
  console.log('AUDIT_CASE',JSON.stringify({viewport:context.name,route,theme:theme||'normal',
   status,heroHeight:row.heroHeight,vitrinaHeight:row.vitrinaHeight,
   h1:row.h1.slice(0,1),controls:row.visibleControls,issues:row.issues.slice(0,8),jsErrors:row.jsErrors.slice(0,3)}));
  if((name==='inicio'||name==='catalogo')&&!theme&&context.width!==320){
   const jpg=await page.screenshot({type:'jpeg',quality:27,fullPage:false});
   // Miniatura REAL del sitio en los logs; se puede inspeccionar sin confundirla con un fixture.
   console.log('THUMB_'+context.name+'_'+name+'='+jpg.toString('base64'));
  }
 }catch(e){
  navError=clean(String(e));issues.push({viewport:context.name,route,theme:theme||'normal',issue:navError});
  all.push({viewport:context.name,name,route,theme:theme||'normal',status,navError});
  console.log('AUDIT_ERROR',JSON.stringify({viewport:context.name,route,navError}));
 }finally{await ctx.close();}
}
try{
 for(const ctx of contexts){
  for(const item of pages)await shot(ctx,item);
  if(ctx.name==='movil320')continue;
  for(const name of ['inicio','catalogo','calendario']){
   const item=pages.find(p=>p[0]===name);
   for(const theme of ['halloween','navidad','hanami'])await shot(ctx,item,theme);
  }
  for(const key of ['series','team','reader'])if(observed[key])await shot(ctx,[key,observed[key]]);
 }
}finally{await browser.close();}
const summary={
 origin:BASE,kind:'Capturas reales de la web pública, navegador sin sesión; no se usaron fixtures.',
 timestamp:new Date().toISOString(),cases:all.length,brokenRoutes:all.filter(x=>x.status>=400||x.navError).length,
 findings:issues.length,observed,captures,issues,results:all
};
writeFileSync(OUT+'/resultado.json',JSON.stringify(summary,null,2));
const lines=['# Auditoría visual del sitio publicado','','**Origen:** '+BASE,
'**Capturas:** '+captures.length+' | **Páginas y estados:** '+all.length+' | **Incidencias detectadas automáticamente:** '+issues.length,
'','## Hallazgos automáticos',''];
for(const issue of issues.slice(0,90))lines.push('- '+issue.viewport+' · '+issue.route+' · '+issue.theme+': '+issue.issue);
lines.push('','## Límites','- Páginas anónimas: no se inició sesión como lector, editor ni Bibliotecario.',
'- Las comprobaciones de hit-testing no sustituyen el ensayo funcional de acciones privadas.',
'- El script visita producción; no compara cada píxel con una referencia artística.',
'','## Capturas');
for(const file of captures)lines.push('- '+file);
writeFileSync(OUT+'/informe.md',lines.join('\n'));
console.log('AUDIT_SUMMARY',JSON.stringify({cases:all.length,captures:captures.length,findings:issues.length,errors:issues.slice(0,30),observed}));

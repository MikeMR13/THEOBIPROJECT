// Fase 4 · integración del lector REAL en Chromium con backend falso y latencia controlada.
// No se autentica ni se consulta Supabase; los tiempos son sintéticos, no Core Web Vitals productivos.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const js = String.raw`
window.__qaStage='módulo iniciado';
// Cache Storage determinista para las carreras de navegación. La API real ya se prueba
// en pwa-offline-browser-check.mjs; aquí aislamos demoras de I/O ajenas al lector.
const syntheticCache = new Map();
const cacheKey = key => typeof key==='string' ? new URL(key,location.href).href : key.url;
const volumeCache = {
  match:async key => syntheticCache.get(cacheKey(key))?.clone() || null,
  keys:async () => [...syntheticCache.keys()].map(url=>({url})),
  delete:async key => syntheticCache.delete(cacheKey(key)),
  put:async (key,value) => { syntheticCache.set(cacheKey(key),value.clone()); }
};
Object.defineProperty(window,'caches',{configurable:true,value:{open:async()=>volumeCache}});
const sleep = ms => new Promise(r => setTimeout(r,ms));
const errors=[];
window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('unhandledrejection',e=>errors.push('Promesa: '+String(e.reason)));
const readings=new Map(), blocked=new Set([4]);
const chapters=[
  {id:'c1',num:1,vol:1,volume_id:'v1',title:'Primera luz',updated_at:'v1'},
  {id:'c2',num:2,vol:1,volume_id:'v1',title:'Segundo viaje',updated_at:'v1'},
  {id:'c3',num:3,vol:2,volume_id:'v2',title:'El siguiente volumen',updated_at:'v1'}
];
for(const c of chapters)readings.set(c.id,[
  {type:'paragraph',text:'Esta es la lectura original del capítulo '+c.num+'. '+
    'Una historia de ejemplo sin conectarse a cuentas reales. '.repeat(65)},
  {type:'paragraph',text:'El texto debe conservarse aun si llegan solicitudes atrasadas.'}
]);
const series={id:'serie-fixture',slug:'obra-fixture',title:'Obra de pruebas del lector',
  team_id:'equipo-fixture',teams:{name:'Equipo ficticio',slug:'equipo',status:'active',settings:{},reader_defaults:{}}};
const volumes=[{id:'v1',num:1,title:'Volumen uno',epub_fonts:[]},{id:'v2',num:2,title:'Volumen dos',epub_fonts:[]}];
const hits={meta:0,body:0,lock:0,credits:0};
window.__qaHits=hits;
function query(table) {
  const q={table,fields:'',params:{},_limit:0,
    select(fields){this.fields=fields;return this},
    eq(key,val){this.params[key]=val;return this},
    is(key,val){this.params[key]=val;return this},
    gte(key,val){this.params[key]=val;return this},
    order(){return this},
    limit(n){this._limit=n;return this},
    in(key,val){this.params[key]=val;return this},
    async run(single=false){
      let ms=110,data=null;
      if(table==='series'){hits.meta++;data=series}
      else if(table==='volumes'){hits.meta++;data=volumes}
      else if(table==='chapters'){
        if(this.fields.includes('body')){
          hits.body++;
          const c=chapters.find(c=>c.id===this.params.id ||
            c.num===this.params.num && this.params['series.slug']==='obra-fixture');
          ms=this.params.num===2 || this.params.id==='c2' ? 800 : 230;
          data=c && !blocked.has(c.num) ? {id:c.id,body:readings.get(c.id)} : null;
          if(this.fields==='body' && data)data={body:data.body};
        }else{hits.meta++;data=chapters}
      }else if(table==='reader_prefs')data=null;
      else if(table==='reading_progress')data=[];
      else if(table==='schedule')data=[];
      else if(table==='glossary_terms')data=[];
      else if(table==='annotations')data=[];
      else if(table==='reading_history')data=[];
      else if(table==='read_chapters')data=[];
      await sleep(ms);
      return {data,error:null};
    },
    maybeSingle(){return this.run(true)},
    then(ok,fail){return this.run(false).then(ok,fail)}
  };
  return q;
}
const sb={from:query,rpc:async (name,args)=>{
  if(name==='series_public_credits'){hits.credits++;await sleep(550);return {data:[],error:null}}
  if(name==='lock_info'){hits.lock++;await sleep(80);return {data:null,error:null}}
  return {data:null,error:null};
}};
const app=document.getElementById('app');
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errorsByCase=[];
const check=(ok,label)=>{if(!ok)errorsByCase.push(label)};
let reader;
const ctx={sb,app,$,esc,toast:()=>{},url:'https://fixture.invalid',getUser:()=>null,
  go(path){history.pushState({},'',path);const match=path.match(/^\/leer\/([^/]+)\/(\d+)/);
    if(match) reader.open(match[1],Number(match[2])).catch(e=>errors.push('go: '+e.message));}};
window.__qaStage='importando lector';
const {createReader}=await import('/reader.js?v=19');
window.__qaStage='creando lector';
reader=createReader(ctx);
window.__qaStage='abriendo capítulo 1';
const t0=performance.now();
await reader.open('obra-fixture',1);
window.__qaStage='capítulo 1 mostrado';
const first=performance.now()-t0;
check(first<1500,'Apertura ficticia demasiado lenta: '+Math.round(first)+'ms');
check($('.rd-ch')?.dataset.ch==='c1','No se abrió el primer capítulo');
check($('.rd-body')?.textContent.includes('lectura original'),'Texto ausente');
check(first<550,'Los créditos retrasaron el texto');
const originalText=$('.rd-body')?.textContent||'';
const settingsButton=$('.rd-settings-trigger');
check(settingsButton?.textContent.includes('Ajustes'),'El botón Aa carece de etiqueta visible');
check(settingsButton && getComputedStyle(settingsButton).display!=='none',
  'El acceso a los ajustes está oculto');
check($('.rd')?.dataset.controls==='fijo','La barra no permanece visible por defecto');
check($('.rd-ch-end .rd-to-series')?.getAttribute('href')==='/serie/obra-fixture',
  'Falta Regresar a la serie al final del capítulo');
$('.rd-bar [data-act="prefs"]')?.click();
check(!$('.rd-panel')?.hidden,'El menú Aa no abrió los ajustes');
check(getComputedStyle($('.rd-panel')).position==='fixed',
  'Los ajustes empujan el capítulo en vez de superponerse');
check($('.rd-body')?.textContent===originalText,'Los ajustes ocultaron o reemplazaron el texto');
const fixedButton=$('.rd-panel [data-k="controls"][data-v="fijo"]');
check(!!fixedButton,'No está la opción de barra siempre visible');
fixedButton?.click();
check($('.rd')?.dataset.controls==='fijo','No se aplicó en vivo la barra siempre visible');
check($('.rd-body')?.textContent===originalText,'Cambiar el modo borró el capítulo');
$('.rd-panel [data-panel-close]')?.click();
check($('.rd-panel')?.hidden,'El menú deslizable no se pudo cerrar');
// Comprobar el comportamiento que ve el usuario, no solo un atributo o clase CSS.
const fixedBar=$('.rd-bar');
const siteHeader=document.querySelector('body > header.top');
const visibleHeaderBottom=()=>Math.max(0,Math.min(innerHeight,Math.ceil(siteHeader.getBoundingClientRect().bottom)));
const barTopBefore=fixedBar?.getBoundingClientRect().top ?? -999;
const barBottomBefore=fixedBar?.getBoundingClientRect().bottom ?? -999;
check(getComputedStyle(fixedBar).position==='fixed','Siempre visible debe usar position:fixed, no sticky');
check(Math.abs(barTopBefore-visibleHeaderBottom())<3,'La barra no inicia pegada a la cabecera visible');
check($('.rd-body').getBoundingClientRect().top >= barBottomBefore - 2,
  'La barra fija está tapando el texto del capítulo');
// En escritorio la cabecera puede salir de pantalla en navegadores que no
// conservan el sticky. Simulamos exactamente la captura aportada.
if(innerWidth>700) siteHeader.style.position='relative';
const scrollAvailable=Math.max(0,document.documentElement.scrollHeight-innerHeight);
check(scrollAvailable>480,'El capítulo de prueba no tiene suficiente altura para comprobar scroll');
scrollTo(0,Math.min(750,scrollAvailable-40));
await sleep(75);
check(scrollY>200,'Chromium no desplazó la lectura de prueba');
check(visibleHeaderBottom()===0,'El escenario debe ocultar completamente la cabecera global');
check(Math.abs(fixedBar.getBoundingClientRect().top)<3,
  'La barra deja un hueco arriba cuando la cabecera ya desapareció');
check(getComputedStyle(fixedBar).opacity==='1' && fixedBar.getBoundingClientRect().bottom>0,
  'La barra fija queda oculta después del desplazamiento');
scrollTo(0,0);
await sleep(75);
check(Math.abs(fixedBar.getBoundingClientRect().top-visibleHeaderBottom())<3,
  'La barra no vuelve junto a la cabecera al subir: barra '+Math.round(fixedBar.getBoundingClientRect().top)+'px, cabecera '+visibleHeaderBottom()+'px, scroll '+Math.round(scrollY)+'px');
$('.rd-settings-trigger')?.click();
$('.rd-panel [data-k="controls"][data-v="deslizable"]')?.click();
check($('.rd')?.dataset.controls==='deslizable','La barra deslizable no se aplicó');
$('.rd-panel [data-panel-close]')?.click();
$('.rd').dataset.bar='hide';
check(getComputedStyle($('.rd-settings-dock')).display!=='none','No aparece el acceso flotante al ocultarse la barra');
$('.rd-settings-dock')?.click();
check(!$('.rd-panel')?.hidden && $('.rd').dataset.panelOpen==='prefs','El acceso flotante no abre Ajustes');
check($('.rd-body')?.textContent===originalText,'El menú flotante alteró el texto');
$('.rd-panel [data-panel-close]')?.click();

history.pushState({},'','/leer/obra-fixture/2');
window.__qaStage='navegación rápida';
const slow=reader.open('obra-fixture',2).catch(e=>errors.push('Capítulo abandonado: '+e.message));
await sleep(45);
history.pushState({},'','/leer/obra-fixture/3');
window.__qaStage='abriendo capítulo 3 sin esperar al 2';
const fast=reader.open('obra-fixture',3);
await fast; // la apertura descartada no tiene por qué finalizar para permitir navegar
window.__qaStage='capítulo 3 mostrado';
await sleep(1150); // margen para que un capítulo anterior lento intente responder
check($('.rd-ch')?.dataset.ch==='c3','La respuesta tardía del capítulo 2 reemplazó al 3');
check(!$('.rd-ch[data-ch="c2"]'),'Se montó el capítulo anterior tras cambiar la ruta');
check(document.querySelectorAll('.rd-ch').length===1,'Capítulos duplicados al navegar deprisa');
check(window.__obiReaderTTS.info('c3')?.next===null,'TTS intenta saltar fuera de la obra');
check(!window.__obiReaderTTS.nextChapter('c3',4),'TTS saltó a capítulo bloqueado');
history.pushState({},'','/leer/obra-fixture/4');
window.__qaStage='capítulo restringido';
await reader.open('obra-fixture',4);
window.__qaStage='bloqueo verificado';
check(hits.lock===1,'No se consultó lock_info para contenido no autorizado');
check(!$('.rd-ch'),'Se mostró un capítulo no publicado');
check(app.textContent.includes('Capítulo no disponible'),'Falta la pantalla segura para capítulo restringido');
history.pushState({},'','/leer/obra-fixture/1');
const t1=performance.now();
window.__qaStage='reapertura desde caché';
await reader.open('obra-fixture',1);
window.__qaStage='caché reabierta';
const cached=performance.now()-t1;
check(cached<700,'Reabrir desde memoria/caché ficticia demasiado lento: '+Math.round(cached)+'ms');
check($('.rd-body')?.textContent===originalText,'El contenido perdió integridad tras cambios de ruta');
check(!!$('.rd-bar [data-act="prefs"]')&&!!$('.rd-bar [data-act="toc"]')&&
  !!$('.rd-bar [data-act="zen"]')&&!!$('.rd-bar [data-act="offline"]'),'Se perdieron controles del lector');
check(hits.credits>=1,'No se verificaron créditos públicos');
window.__qaStage='resultado final';
const pending=errors.concat(errorsByCase);
const el=$('#qa-result');
el.dataset.qaStatus=pending.length?'fail':'pass';
el.textContent=pending.length?pending.join(' | '):'OK · inicio '+Math.round(first)+'ms; reapertura '+
  Math.round(cached)+'ms; capítulos consultados '+hits.body+'; crédito no bloqueante; bloqueo y TTS';
`;
function html(){
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/reader-a11y.css">'+
    '</head><body><header class="top" style="min-height:64px">El Obi del Lector</header><main id="app"></main><p id="qa-result" data-qa-status="running">Cargando</p>'+
    '<script>window.__qaStage="cargando módulo";window.addEventListener("error",e=>{const p=document.getElementById("qa-result");if(p?.dataset.qaStatus==="running"){p.dataset.qaStatus="fail";p.textContent="Error de módulo: "+e.message;}});'+
    'window.addEventListener("unhandledrejection",e=>{const p=document.getElementById("qa-result");if(p?.dataset.qaStatus==="running"){p.dataset.qaStatus="fail";p.textContent="Promesa no controlada: "+String(e.reason);}});'+
    'setTimeout(()=>{const p=document.getElementById("qa-result");if(p?.dataset.qaStatus==="running"){p.dataset.qaStatus="fail";p.textContent="No finalizó QA, etapa: "+(window.__qaStage||"desconocida")+" · solicitudes: "+JSON.stringify(window.__qaHits||{});}},9500);</script>'+
    '<script type="module" src="/qa-browser.js"></script></body></html>';
}
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const path=(req.url||'/').split('?')[0];
  if(path==='/qa-browser.js'){
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    res.end('try {\n'+js+'\n} catch (error) { const p=document.getElementById("qa-result"); p.dataset.qaStatus="fail"; p.textContent="Error del lector en QA: "+(error?.stack || error); }');
  }else if(/^\/[\w-]+\.js$/.test(path) && existsSync('src/'+path.slice(1))){
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    res.end(readFileSync('src/'+path.slice(1)));
  }else if(['/styles.css','/reader-a11y.css'].includes(path)){
    res.setHeader('Content-Type','text/css; charset=utf-8');
    res.end(readFileSync('src/'+path.slice(1)));
  }else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html())}
});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no disponible en CI');
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const url='http://127.0.0.1:'+server.address().port+'/leer/obra-fixture/1';
  const opts=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--no-proxy-server','--incognito','--window-size='+(process.env.OBI_READER_VIEWPORT==='desktop'?'1440,900':'390,850'),
    '--virtual-time-budget=11000','--dump-dom',url];
  const child=spawn(bin,opts,{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',chunk=>{out+=String(chunk).slice(0,350000)});
  child.stderr.on('data',chunk=>{err+=String(chunk).slice(0,50000)});
  const code=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium excedió 60 s'))},60000);
    child.once('error',e=>{clearTimeout(timer);reject(e)});
    child.once('close',c=>{clearTimeout(timer);resolve(c)});
  });
  assert.equal(code,0,err.slice(-1200));
  const match=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(match,'No se completó integración del lector. stderr: '+err.slice(-1100)+'; qa-result: '+(out.match(/<p id="qa-result"[^>]*>[^<]*/)?.[0] || 'ausente'));
  assert.equal(match[1],'pass',match[2]);
  console.log('Fase 4 · integración Chromium aislada: '+match[2]);
}finally{await new Promise(resolve=>server.close(resolve))}

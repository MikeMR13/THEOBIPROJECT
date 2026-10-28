// Fase 4 · integración del lector REAL en Chromium con backend falso y latencia controlada.
// No se autentica ni se consulta Supabase; los tiempos son sintéticos, no Core Web Vitals productivos.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const js = String.raw`
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
    'Una historia de ejemplo sin conectarse a cuentas reales. '.repeat(25)},
  {type:'paragraph',text:'El texto debe conservarse aun si llegan solicitudes atrasadas.'}
]);
const series={id:'serie-fixture',slug:'obra-fixture',title:'Obra de pruebas del lector',
  team_id:'equipo-fixture',teams:{name:'Equipo ficticio',slug:'equipo',status:'active',settings:{},reader_defaults:{}}};
const volumes=[{id:'v1',num:1,title:'Volumen uno',epub_fonts:[]},{id:'v2',num:2,title:'Volumen dos',epub_fonts:[]}];
const hits={meta:0,body:0,lock:0,credits:0};
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
const {createReader}=await import('/reader.js?v=19');
reader=createReader(ctx);
const t0=performance.now();
await reader.open('obra-fixture',1);
const first=performance.now()-t0;
check(first<1500,'Apertura ficticia demasiado lenta: '+Math.round(first)+'ms');
check($('.rd-ch')?.dataset.ch==='c1','No se abrió el primer capítulo');
check($('.rd-body')?.textContent.includes('lectura original'),'Texto ausente');
check(first<550,'Los créditos retrasaron el texto');
const originalText=$('.rd-body')?.textContent||'';
history.pushState({},'','/leer/obra-fixture/2');
const slow=reader.open('obra-fixture',2);
await sleep(45);
history.pushState({},'','/leer/obra-fixture/3');
const fast=reader.open('obra-fixture',3);
await Promise.all([slow,fast]);
await sleep(850);
check($('.rd-ch')?.dataset.ch==='c3','La respuesta tardía del capítulo 2 reemplazó al 3');
check(!$('.rd-ch[data-ch="c2"]'),'Se montó el capítulo anterior tras cambiar la ruta');
check(document.querySelectorAll('.rd-ch').length===1,'Capítulos duplicados al navegar deprisa');
check(window.__obiReaderTTS.info('c3')?.next===null,'TTS intenta saltar fuera de la obra');
check(!window.__obiReaderTTS.nextChapter('c3',4),'TTS saltó a capítulo bloqueado');
history.pushState({},'','/leer/obra-fixture/4');
await reader.open('obra-fixture',4);
check(hits.lock===1,'No se consultó lock_info para contenido no autorizado');
check(!$('.rd-ch'),'Se mostró un capítulo no publicado');
check(app.textContent.includes('Capítulo no disponible'),'Falta la pantalla segura para capítulo restringido');
history.pushState({},'','/leer/obra-fixture/1');
const t1=performance.now();
await reader.open('obra-fixture',1);
const cached=performance.now()-t1;
check(cached<700,'Reabrir desde memoria/caché ficticia demasiado lento: '+Math.round(cached)+'ms');
check($('.rd-body')?.textContent===originalText,'El contenido perdió integridad tras cambios de ruta');
check(!!$('.rd-bar [data-act="prefs"]')&&!!$('.rd-bar [data-act="toc"]')&&
  !!$('.rd-bar [data-act="zen"]')&&!!$('.rd-bar [data-act="offline"]'),'Se perdieron controles del lector');
check(hits.credits>=1,'No se verificaron créditos públicos');
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
    '</head><body><main id="app"></main><p id="qa-result" data-qa-status="running">Cargando</p>'+
    '<script type="module">'+js+'</script></body></html>';
}
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const path=(req.url||'/').split('?')[0];
  if(/^\/[\w-]+\.js$/.test(path) && existsSync('src/'+path.slice(1))){
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
    '--disable-background-networking','--no-proxy-server','--incognito','--window-size=390,850',
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
  assert(match,'No se completó integración del lector: '+out.slice(-1500));
  assert.equal(match[1],'pass',match[2]);
  console.log('Fase 4 · integración Chromium aislada: '+match[2]);
}finally{await new Promise(resolve=>server.close(resolve))}

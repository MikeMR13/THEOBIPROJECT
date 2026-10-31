// Chromium local, sin credenciales ni peticiones a Supabase real.
// Evalúa paginación, responsividad, navegación y controles del Mostrador.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn,execFileSync } from 'node:child_process';

const page=`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/styles.css"></head><body><main id="app"></main>
<output id="qa-result" data-qa-status="running">QA pendiente</output>
<script type="module">
const out=document.getElementById('qa-result'),app=document.getElementById('app');
try{
 const {createAdmin}=await import('/admin.js');
 const check=(ok,msg)=>{if(!ok)throw Error(msg)};
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await delay(25);}throw Error('Tiempo agotado en prueba');};
 const users=Array.from({length:135},(_,i)=>({id:'u'+i,username:'Usuario '+String(i).padStart(3,'0'),email:'cuenta'+i+'@qa.invalid',platform_role:'lector',teams:[],created_at:'2026-10-20T00:00:00Z',last_sign_in:null}));
 const chapters=Array.from({length:65},(_,i)=>({id:'c'+i,num:i+1,status:'published',publish_at:null}));
 const sb={
  auth:{getUser:async()=>({data:{user:{id:'bibliotecario-fixture'}}}),signOut:async()=>{}},
  rpc:async(name,args={})=>{
   if(name==='whoami')return {data:{platform_role:'bibliotecario',username:'admin_qa'},error:null};
   if(name==='admin_overview')return {data:{lectores:135,publicadores:2,equipos:1,obras:1,capitulos:65,reportes:0,solicitudes:0,nuevos7d:1},error:null};
   if(name==='admin_users_page')return {data:users.slice(args.p_offset,args.p_offset+args.p_limit),error:null};
   if(name==='admin_audit_page')return {data:[],error:null};
   throw Error('RPC ficticia desconocida '+name);
  },
  from:name=>{
   const query={
    select(){return this;},eq(){return this;},order(){return this;},gte(){return this;},lt(){return this;},not(){return this;},in(){return this;},
    single:async()=>({data:name==='platform_settings'?{seasons:{auto:['halloween','muertos','obon','otono'],greet:{},intensity:'sutil',density:'pocas'},updated_at:'2026-10-20T00:00:00Z'}:null,error:null}),
    limit:async n=>({data:name==='series'?[{id:'s1',title:'Obra QA',slug:'obra-qa',published:true,archived_at:null,team_id:'t1',teams:{name:'Equipo QA'}}]:name==='season_calendar'?[{key:'otono',starts:'2026-09-22',hemi:'norte',day:null},{key:'halloween',starts:'2026-10-25',hemi:null,day:null},{key:'muertos',starts:'2026-11-01',hemi:null,day:null}]:[],error:null}),
    range:async(start,end)=>({data:name==='chapters'?chapters.slice(start,end+1):[],error:null})
   };
   return query;
  }
 };
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const admin=createAdmin({sb,app,$:s=>document.querySelector(s),esc,toast:()=>{},go:()=>{},url:'http://127.0.0.1'});
 await admin.render();
 check(app.querySelectorAll('.bb-tabs [role="tab"]').length===15,'Faltan pestañas administrativas');
 check(app.querySelector('[aria-selected="true"]').textContent==='Resumen','Falta pestaña activa accesible');
 app.querySelector('[data-t="usuarios"]').click();
 await until(()=>app.querySelector('#bb-next') && app.querySelector('tbody')?.rows.length===50);
 check(app.querySelector('.bb-mini').getBoundingClientRect().height>=43,'Controles demasiado pequeños');
 app.querySelector('#bb-next').click();
 await until(()=>app.querySelector('[role="status"]')?.textContent.includes('Página 2'));
 check(app.querySelector('tbody')?.rows.length===50,'Página 2 no tiene 50 usuarios');
 app.querySelector('[data-t="supervision"]').click();
 await until(()=>app.querySelector('[data-series]'));
 app.querySelector('[data-series]').click();
 await until(()=>app.querySelector('[data-chapter-total]')?.textContent.includes('30 capítulo'));
 let button=app.querySelector('[data-more-chapters]');
 check(button&&!button.hidden,'Se deben mostrar más de 30 capítulos');
 button.click();
 await until(()=>app.querySelector('[data-chapter-total]')?.textContent.includes('60 capítulo'));
 app.querySelector('[data-more-chapters]').click();
 await until(()=>app.querySelector('[data-chapter-total]')?.textContent.includes('65 capítulo'));
 check(app.querySelector('[data-more-chapters]').hidden,'La paginación no termina tras 65 capítulos');
 const w=document.documentElement.clientWidth;
 if(w<=400)check(document.documentElement.scrollWidth<=w+2,'Desborde horizontal de la página');
 check(app.querySelector('.bb-tabs button.on')?.getAttribute('aria-selected')==='true','Foco/estado de pestaña desincronizado');
 app.querySelector('[data-t="temporadas"]').click();
 await until(()=>app.querySelector('[data-season-key="halloween"]'));
 check(app.querySelectorAll('[data-season-key]').length>=20,'No aparecen todas las temporadas');
 check(app.querySelector('[data-season-key="halloween"] .bb-se-state')?.textContent.trim().length>0,'Estado estacional sin etiqueta');
 check(app.querySelector('[data-season-key="muertos"] .bb-se-meta')?.textContent.includes('noviembre'),'No muestra fecha de fin/inicio');
 const buttons=[...app.querySelectorAll('.bb-se-actions .btn,.bb-se-filters button,.bb-seg button')];
 check(buttons.length>20,'No se muestran acciones y filtros');
 for(const b of buttons){const r=b.getBoundingClientRect();check(r.height>=43.5,'Botón estacional demasiado bajo: '+b.textContent.trim());}
 const opener=app.querySelector('[data-greet-toggle="halloween"]'),field=app.querySelector('#sea-greet-halloween');
 check(field.hidden,'Editor de saludo debe iniciar colapsado');opener.click();
 check(!field.hidden&&opener.getAttribute('aria-expanded')==='true','Editor de saludo no abre');
 const input=field.querySelector('input');input.value='Saludo QA';input.dispatchEvent(new Event('input',{bubbles:true}));
 check(!app.querySelector('#sea-save').disabled,'Cambio de saludo no habilita guardar');
 app.querySelector('[data-season-filter="finished"]').click();
 check(app.querySelector('[data-season-filter="finished"]').getAttribute('aria-pressed')==='true','Filtro no se selecciona');
 check(app.querySelectorAll('[data-season-key]').length>0,'El filtro Finalizadas no muestra periodos pasados');
 app.querySelector('[data-season-filter="all"]').click();
 const preview=app.querySelector('[data-pv="halloween"]');preview.click();
 check(app.querySelector('#sea-pv')?.value==='halloween','Vista previa no selecciona la temporada');
 check(app.querySelector('#sea-preview')!==null,'Falta destino de vista previa');
 if(w<=400)check(document.documentElement.scrollWidth<=w+2,'Temporadas desborda horizontalmente');

 out.dataset.qaStatus='pass';out.textContent='OK: 15 pestañas, usuarios 135, capítulos 65 y ancho '+w;
}catch(e){out.dataset.qaStatus='fail';out.textContent=String(e?.stack||e);}
</script></body></html>`;

const seasonStub="export {SEASONS,SGROUPS} from '/anim.js';export const INT={sutil:'Sutil',media:'Media',alta:'Alta'},DEN={pocas:'Pocas',normal:'Normal',muchas:'Muchas'},SUGGEST={};export const hemiOf=()=> 'norte', platformKey=()=> 'halloween',load=async()=>({});";
const files={'/admin.js':'src/admin.js','/admin-seo.js':'src/admin-seo.js',
'/obi-dialog.js':'src/obi-dialog.js','/seo-settings.js':'src/seo-settings.js','/styles.css':'src/styles.css',
'/season-admin-view.js':'src/season-admin-view.js','/season-periods.js':'src/season-periods.js','/anim.js':'src/anim.js'};
const server=createServer((req,res)=>{
 const path=(req.url||'').split('?')[0];
 res.setHeader('Cache-Control','no-store');
 if(path==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);return;}
 if(path==='/season.js'){res.setHeader('Content-Type','application/javascript');res.end(seasonStub);return;}
 if(!files[path]){res.writeHead(404);res.end('No disponible');return;}
 res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'application/javascript');
 res.end(readFileSync(files[path]));
});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{
 try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}
}).find(Boolean);
assert(bin,'Chromium no disponible');
const port=await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',()=>ok(server.address().port))});
try{
 for(const width of [320,390,768,1440]){
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--window-size='+width+',900',
    '--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+port+'/'];
  const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let output='',stderr='';
  p.stdout.on('data',d=>output+=String(d));p.stderr.on('data',d=>stderr+=String(d).slice(0,15000));
  const code=await new Promise((ok,fail)=>{
    const timer=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Chromium excedió 55s'))},55000);
    p.on('error',e=>{clearTimeout(timer);fail(e)});
    p.on('close',c=>{clearTimeout(timer);ok(c)});
  });
  assert.equal(code,0,stderr.slice(-900));
  const status=output.match(/<output id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/output>/);
  assert(status,'No se obtuvo resultado de Chromium');
  assert.equal(status[1],'pass',status[2].slice(0,1400));
  console.log('Mostrador Chromium '+width+'px: '+status[2]);
 }
}finally{await new Promise(ok=>server.close(ok))}

// Inicio y Catálogo REALES compilados con backend ficticio y red bloqueada.
// No realiza solicitudes a producción, ni pretende medir INP de usuarios.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';

assert(existsSync('dist/app.js')&&existsSync('dist/index.html'),'Ejecutar npm run build primero');
const date=n=>new Date(Date.now()-n*86400000).toISOString();
const series=Array.from({length:12},(_,i)=>({
 id:'s'+(i+1),team_id:'t'+(i+1),slug:'novela-'+(i+1),title:'Novela ligera de prueba '+(i+1),
 short:'Obra '+(i+1),original:'Original ficticio',author:'Autor de prueba',
 synopsis:'Una historia ficticia de aventuras creada para comprobar el rendimiento sin contactar al backend.',
 genres:[i%2?'Fantasía':'Aventura'],tags:['laboratorio'],
 theme:{color:'#37291a'},cover_path:'covers/'+(i+1)+'.svg',cover_thumb_path:'thumbs/'+(i+1)+'.svg',
 translation_status:'active',original_status:'ongoing',work_type:'Novela ligera',
 demographic:'General',published:true,adult:false,views:2000-i*70,
 teams:{name:'Equipo '+(i+1),slug:'equipo-'+(i+1),color:'#7d5b36'},
 chapters:[{count:10}],volumes:[{count:1}],firstPublishedAt:date(30)
}));
const latest=series.map((s,i)=>({series_id:s.id,num:10,title:'Capítulo 10',publish_at:date(i+1),status:'published'}));
const ranks=series.slice(0,8).map((s,i)=>({series_id:s.id,pos:i+1,score:100-i,list:'leidas',period:'semana'}));
const volumes=series.slice(0,3).map((s,i)=>({
 id:'v'+(i+1),series_id:s.id,num:1,title:'Volumen 1',status:'published',
 cover_path:s.cover_path,published_at:date(1),announced_at:date(1),is_final:false
}));
const feed={series,latest,rkW:ranks,rkH:ranks,top10:ranks,nextRel:[],featured:series.slice(0,8).map(s=>s.id),reviews:[],ann:[]};
const fixture={series,latest,ranks,volumes,feed,settings:{id:1,seasons:{},featured:feed.featured}};

function fakeCreateClient(){
 const Q=window.OBI_FIXTURE,reply=data=>({data,error:null});
 function table(name){
  let filters=[],page=null,limit=null,one=false,sortColumn=null,asc=true;
  const q={
   select(){return q},
   eq(k,v){filters.push([k,v]);return q},
   neq(){return q},gt(){return q},gte(){return q},lt(){return q},lte(){return q},
   or(){return q},is(){return q},not(){return q},in(){return q},contains(){return q},
   order(k,options){sortColumn=k;asc=options?.ascending!==false;return q},
   range(a,b){page=[a,b];return q},limit(n){limit=n;return q},
   maybeSingle(){one=true;return Promise.resolve(q.result())},
   single(){one=true;return Promise.resolve(q.result())},
   result(){
    let data=name==='series'?Q.series:name==='series_last'?Q.latest:
     name==='chapters'?Q.latest:name==='volumes'?Q.volumes:
     name==='rankings'?Q.ranks:name==='platform_settings'?[Q.settings]:[];
    data=data.filter(r=>filters.every(([k,v])=>String(r[k])===String(v)));
    if(sortColumn)data=[...data].sort((a,b)=>{
     const x=String(a[sortColumn]??''),y=String(b[sortColumn]??'');
     return (x<y?-1:x>y?1:0)*(asc?1:-1);
    });
    if(page)data=data.slice(page[0],page[1]+1);
    if(limit!==null)data=data.slice(0,limit);
    return reply(one?data[0]??null:data);
   },
   then(ok,bad){return Promise.resolve(q.result()).then(ok,bad)},
   catch(bad){return Promise.resolve(q.result()).catch(bad)}
  };
  return q;
 }
 return {
  auth:{
   getSession:async()=>({data:{session:null},error:null}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
  },
  from:table,
  rpc:async(name,opts)=>{
   if(name==='home_feed')return reply(Q.feed);
   if(name==='series_public_credits')return reply((opts?.p_series_ids||[]).map(id=>{
    const s=Q.series.find(x=>x.id===id);
    return s?{series_id:id,team_id:s.team_id,name:s.teams.name,slug:s.teams.slug,
     is_primary:true,status:'active',show_reader_logo:true}:null;
   }).filter(Boolean));
   if(name==='ranking_list')return reply(Q.ranks);
   if(name==='my_adult_ok')return reply(false);
   if(name==='prelaunch_calendar')return reply([]);
   return reply([]);
  },
  storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:'/mock/'+path}})})},
  channel:()=>({on(){return this},subscribe(){return this},unsubscribe(){}})
 };
}

function instrument(){
 const lab={route:location.pathname,viewport:innerWidth,fcpMs:null,lcpMs:null,cls:0,
  inpMs:null,syntheticInteractionToPaintMs:null,errors:[],readyMs:null};
 window.__fullRouteLab=lab;
 addEventListener('error',e=>lab.errors.push(String(e.message||e.error||'error').slice(0,150)));
 addEventListener('unhandledrejection',e=>lab.errors.push(String(e.reason?.message||e.reason).slice(0,150)));
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())lab.lcpMs=e.startTime;})
  .observe({type:'largest-contentful-paint',buffered:true})}catch{}
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)lab.cls+=e.value;})
  .observe({type:'layout-shift',buffered:true})}catch{}
 let ready=false,acted=false;
 const hasPage=()=>location.pathname==='/'?!!document.querySelector('#hero .vt'):
  !!document.querySelector('#cat-q');
 const check=()=>{
  const ok=hasPage();
  if(ok&&!ready){ready=true;lab.readyMs=performance.now();}
  return ok;
 };
 const click=()=>{
  if(acted||!check())return;acted=true;
  const t=performance.now();
  if(location.pathname==='/catalogo'){
   const q=document.getElementById('cat-q');
   q.value='Novela ligera de prueba 2';
   q.dispatchEvent(new Event('input',{bubbles:true}));
  }else{
   document.querySelector('#hero .ob-pager2 button[data-dir="1"]')?.click();
  }
  setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
   lab.syntheticInteractionToPaintMs=performance.now()-t;
  })),200);
 };
 const finish=()=>{
  const fcp=performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint');
  lab.fcpMs=fcp?Math.round(fcp.startTime):null;
  lab.lcpMs=lab.lcpMs===null?null:Math.round(lab.lcpMs);
  lab.cls=Number(lab.cls.toFixed(5));
  lab.syntheticInteractionToPaintMs=lab.syntheticInteractionToPaintMs===null?
   null:Math.round(lab.syntheticInteractionToPaintMs);
  lab.resourceCount=performance.getEntriesByType('resource').length;
  lab.rendered=check();
  lab.overflowX=document.documentElement.scrollWidth>document.documentElement.clientWidth+3;
  lab.sampleTitle=document.querySelector('main#app h1,main#app h2')?.textContent?.slice(0,85)||null;
  const el=document.getElementById('__lab_result');
  el.dataset.status=lab.rendered&&lab.readyMs!==null?'pass':'fail';
  el.textContent=JSON.stringify(lab);
 };
 addEventListener('load',()=>{
  const polling=setInterval(()=>{if(check()){clearInterval(polling);click()}},50);
  setTimeout(()=>{clearInterval(polling);finish()},3100);
 },{once:true});
}

const index=readFileSync('dist/index.html','utf8');
const fakeModule='export '+fakeCreateClient.toString().replace(/^function fakeCreateClient/,'function createClient');
const instrumentScript='('+instrument.toString()+')()';
const image=id=>'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">'+
 '<rect width="300" height="450" fill="#745338"/>'+
 '<text x="30" y="220" font-size="28" fill="white">OBI '+id+'</text></svg>';
let origin='';
const server=createServer((req,res)=>{
 const u=new URL(req.url||'/',origin||'http://127.0.0.1'),path=u.pathname;
 res.setHeader('Content-Security-Policy',
  "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; frame-src 'self'");
 if(path==='/__lab'){
  const w=Number(u.searchParams.get('w')||390),p=u.searchParams.get('route')==='catalogo'?'/catalogo':'/';
  res.setHeader('Content-Type','text/html');
  return res.end('<!doctype html><html><body><iframe id="f" width="'+w+'" height="1200" src="'+p+
   '?__lab=1"></iframe><pre id="qa" data-status="running"></pre><script>'+
   'setInterval(()=>{try{const a=document.querySelector("#f").contentDocument.querySelector("#__lab_result");'+
   'if(a&&(a.dataset.status==="pass"||a.dataset.status==="fail")){'+
   'const q=document.querySelector("#qa");q.dataset.status=a.dataset.status;q.textContent=a.textContent;'+
   '}}catch(e){}},100)</script></body></html>');
 }
 if(path.startsWith('/rest/v1/rpc/home_feed')){
  res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(feed));
 }
 if(path==='/supabase.js'){
  res.setHeader('Content-Type','application/javascript');return res.end(fakeModule);
 }
 if(path==='/config.js'){
  res.setHeader('Content-Type','application/javascript');
  return res.end('window.OBI_CONFIG='+JSON.stringify({url:origin,key:'sb_publishable_fake',preview:true})+';');
 }
 if(path==='/sw.js'){
  res.setHeader('Content-Type','application/javascript');return res.end('// Sin SW en laboratorio; PWA tiene pruebas separadas');
 }
 if(/^\/(?:covers|thumbs)\/\d+\.svg$/.test(path)){
  res.setHeader('Content-Type','image/svg+xml');return res.end(image(path.match(/\d+/)?.[0]));
 }
 if(path==='/'||path==='/catalogo'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  let html=index.replace(/<link[^>]+href="https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/g,'')
   .replace(/<link[^>]+href="https:\/\/qfllthjpjuaztppvpsrk\.supabase\.co"[^>]*>/g,'');
  html=html.replace('</head>','<script>window.OBI_FIXTURE='+JSON.stringify(fixture)+
   ';</script><script>'+instrumentScript+'</script></head>');
  html=html.replace('</body>','<pre id="__lab_result" data-status="running" hidden></pre></body>');
  return res.end(html);
 }
 const file=join('dist',path.replace(/^\/+/,''));
 if(file.includes('..')||!existsSync(file)){res.statusCode=404;return res.end('No existe '+path)}
 const mime={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml',
  '.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json',
  '.json':'application/json','.woff2':'font/woff2'};
 res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
 res.end(readFileSync(file));
});
const browser=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable']
 .map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(browser,'Chromium no disponible');
const run=url=>new Promise((resolve,reject)=>{
 const p=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--disable-extensions','--no-first-run',
  '--window-size=1600,1400','--virtual-time-budget=6500','--dump-dom',url],
  {stdio:['ignore','pipe','pipe']});
 let out='',err='',done=false;
 p.stdout.on('data',d=>out+=String(d));p.stderr.on('data',d=>err=(err+String(d)).slice(-800));
 const end=(e,value)=>{if(done)return;done=true;clearTimeout(timeout);e?reject(e):resolve(value)};
 const timeout=setTimeout(()=>{p.kill('SIGKILL');end(Error('Timeout Chromium '+err.slice(-300)))},45000);
 p.once('error',e=>end(e));
 p.once('close',code=>{
  if(code!==0)return end(Error('Chromium exit '+code+' '+err.slice(-300)));
  const m=out.match(/<pre id="qa" data-status="(pass|fail)">([^<]*)<\/pre>/);
  if(!m)return end(Error('Sin resultado en ruta, salida: '+out.slice(-650)));
  let data;try{data=JSON.parse(m[2])}catch(e){return end(Error('JSON inválido '+m[2].slice(0,100)))}
  if(m[1]!=='pass')return end(Error('Ruta no renderizada: '+JSON.stringify(data).slice(0,550)));
  end(null,data);
 });
});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 origin='http://127.0.0.1:'+server.address().port;
 const rows=[];
 for(const width of [390,1440])for(const route of ['inicio','catalogo']){
  const result=await run(origin+'/__lab?w='+width+'&route='+route);
  assert.equal(result.viewport,width,'Ancho incorrecto en iframe');
  assert(result.rendered,'Ruta no montada');
  assert(result.syntheticInteractionToPaintMs!==null,'No se midió interacción programática');
  assert(Number.isFinite(result.cls),'CLS inválido');
  rows.push({...result,requestedRoute:route,requestedWidth:width});
  console.log(route+' '+width+'px, render='+Math.round(result.readyMs)+' ms, FCP='+result.fcpMs+
    ', LCP='+result.lcpMs+', CLS='+result.cls+', interacción programática='+result.syntheticInteractionToPaintMs);
 }
 mkdirSync('qa-performance',{recursive:true});
 const report={version:1,scope:'Sitio completo compilado con mock Supabase + portadas locales',
  restrictions:['No son métricas de usuarios reales ni tráfico productivo.',
   'No mide INP: acciones por dispatchEvent/click programáticos más dos fotogramas.',
   'Sin CDN, sin latencia real de Supabase y sin descarga de fuentes externas.',
   'PWA se valida por separado; no se registra un Service Worker en esta prueba.'],results:rows};
 writeFileSync('qa-performance/validacion-rutas-cwv-lab.json',JSON.stringify(report,null,2)+'\n');
 const summary='### Auditoría de Inicio y Catálogo completos (Chromium con backend ficticio)\n\n'+
 '| Ruta | Ancho efectivo | Render | FCP | LCP | CLS | Interacción programática¹ |\n'+
 '|---|---:|---:|---:|---:|---:|---:|\n'+
 rows.map(x=>'| '+x.requestedRoute+' | '+x.viewport+' px | '+Math.round(x.readyMs)+' ms | '+
 (x.fcpMs===null?'n/d':x.fcpMs+' ms')+' | '+(x.lcpMs===null?'n/d':x.lcpMs+' ms')+
 ' | '+x.cls+' | '+x.syntheticInteractionToPaintMs+' ms |').join('\n')+
 '\n\n¹ No es INP; entorno sin red externa y contenido sintético. Core Web Vitals reales pendientes.\n';
 console.log(summary);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
}finally{server.closeAllConnections();await new Promise(ok=>server.close(ok))}

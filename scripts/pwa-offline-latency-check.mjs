// Pruebas de latencia de arranque/lectura OFFLINE con funciones reales de la app.
// Datos aislados, sin consultar Supabase ni cuentas reales. Prueba contra red colgada
// (más rigurosa que recibir un error inmediato al activar modo avión).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const reader = readFileSync('src/reader.js', 'utf8');
const app = readFileSync('src/app.js', 'utf8');
const slice = (src, begin, end) => {
  const a = src.indexOf(begin), b = src.indexOf(end, a + begin.length);
  assert(a !== -1 && b !== -1, 'No se encontró código original: ' + begin);
  return src.slice(a, b);
};
const cacheSeries = {
  series: { id: 'series-test', slug: 'obra-local', title: 'Obra local', teams: {} },
  chapters: [{id:'chapter-1', num:1, vol:1, volume_id:'vol-1',updated_at:'2026-10-21T00:00:00Z'}],
  vols: [{ id: 'vol-1', num:1 }],
  gloss: []
};
const block = [{ type:'paragraph', text:'Capítulo totalmente descargado' }];
const never = () => new Promise(() => {});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function deadline(promise, ms = 90) {
  const tag = Symbol('timeout');
  const start = performance.now();
  const settled = await Promise.race([Promise.resolve(promise).then(v=>({ok:true,value:v}),e=>({ok:false,error:String(e)})), sleep(ms).then(()=>tag)]);
  return { finished: settled !== tag, elapsedMs: Math.round(performance.now()-start), result: settled===tag?null:settled };
}
const rows = [];
async function probe(label, fn) {
  try { const out = await fn(); rows.push({label,...out}); }
  catch (e) { rows.push({label,pass:false,detail:'Error en prueba: '+e.stack}); }
}
// 1. Volumen previamente guardado: una lectura offline no debe depender de
// fetchMeta/Supabase, incluso si una promesa de red queda sin resolver.
await probe('ficha de volumen desde caché local', async () => {
  let remote=0, local=0;
  const S = { series:null, chapters:[], vols:[], bodies:new Map() };
  const snippet=slice(reader,'  async function loadSeries(slug, num){','  const early = new Map();');
  const ctx={
    navigator:{onLine:false},S,
    cachedMeta:()=>null,
    fetchMeta:()=>{remote++;return never();},
    offlineMeta:async()=>{local++;return cacheSeries;},
    setSeries:m=>{S.series=m.series;S.chapters=m.chapters;S.vols=m.vols;},
    sb:{from:()=>{throw Error('No consultar Supabase al estar offline')}},
    Date,Map
  };
  const loadSeries=vm.runInNewContext('(()=>{'+snippet+'return loadSeries})()',ctx);
  const measurement=await deadline(loadSeries('obra-local',1));
  return {pass:measurement.finished && measurement.result?.value===true && remote===0, ...{remote,local,elapsedMs:measurement.elapsedMs}, detail:measurement.finished?'Función terminó':'Quedó esperando fetchMeta remoto y nunca leyó offlineMeta'};
});
// 2. Texto descargado: debe consultarse Cache Storage antes de cualquier red.
await probe('capítulo descargado abre con red colgada', async () => {
  let remote=0, local=0;
  const S={series:cacheSeries.series,bodies:new Map()};
  const snippet=slice(reader,'  async function body(ch){','  // texto del siguiente capítulo');
  const ctx={
    S,early:new Map(),
    cacheGet:async()=>null,
    bKey:()=>'',cachePut:()=>{},
    offlineBody:async()=>{local++;return block;},
    sb:{from:()=>({select:()=>({eq:()=>({maybeSingle:()=>{remote++;return never();}})})})}
  };
  const body=vm.runInNewContext('(()=>{'+snippet+'return body})()',ctx);
  const measure=await deadline(body(cacheSeries.chapters[0]));
  return {pass:measure.finished && Array.isArray(measure.result?.value) && remote===0,
    remote,local,elapsedMs:measure.elapsedMs,
    detail:measure.finished?'Texto obtenido':'Sin caché temporal, esperaba PostgREST antes de leer el capítulo descargado'};
});
// 3. Preferencias deben aparecer desde localStorage sin esperar ninguna consulta.
await probe('preferencias locales offline sin espera remota', async()=>{
  let remote=0;
  const S={remote:null,prefsOwner:null,prefsVersion:0,prefsRequest:0};
  const snippet=slice(reader,'  async function loadPrefs(){','  const effective = volId');
  const local={global:{size:22},per_volume:{}};
  const getUser=()=>({id:'lector-test'});
  const ctx={S,getUser,loadLocal:()=>local,readerPrefsKey:id=>'local-'+id,sameReaderAccount:(a,b)=>a===b,
    localStorage:{setItem:()=>{}},
    sb:{from:()=>({select:()=>({eq:()=>({maybeSingle:()=>{remote++;return never();}})})})}
  };
  const loadPrefs=vm.runInNewContext('(()=>{'+snippet+'return loadPrefs})()',ctx);
  const result=await deadline(loadPrefs());
  return {pass:result.finished && remote===0 && S.remote===local,remote,elapsedMs:result.elapsedMs,
    detail:result.finished?'Configuración local disponible':'Se aplicó la copia local, pero la promesa no terminó al esperar reader_prefs'};
});
// 4. Posición de lectura local, aun con consulta remota sin resolver.
await probe('posición local offline sin esperar PostgREST', async()=>{
  let remote=0;
  const snippet=slice(reader,'  async function fetchPos(){','  // guardar ya al salir');
  const ctx={S:{series:cacheSeries.series},getUser:()=>({id:'lector-test'}),
    posKey:()=> 'obi-position-test',
    localStorage:{getItem:()=>JSON.stringify({chapter_id:'chapter-1',block:2,at:'2026-10-21T00:00:00Z'})},
    sb:{from:()=>({select:()=>({eq:()=>({eq:()=>({order:()=>({limit:()=>{remote++;return never();}})})})})})},Date
  };
  const fetchPos=vm.runInNewContext('(()=>{'+snippet+'return fetchPos})()',ctx);
  const result=await deadline(fetchPos());
  return {pass:result.finished && result.result?.value?.block===2 && remote===0, remote,
    elapsedMs:result.elapsedMs,detail:result.finished?'Progreso local disponible':'La función esperaba reading_progress remoto antes de devolver localStorage'};
});
// 5. Arranque sin red: si la autenticación se queda sin responder, la página
// no debería permanecer en blanco indefinidamente.
await probe('arranque con sesión remota bloqueada', async()=>{
  let sessionCalls=0,draws=0;
  const snippet=slice(app,'async function loadSession(){','function delBanner(){');
  const ctx={
    user:null,profile:null,me:null,meReady:Promise.resolve(),lastBar:'',
    sb:{auth:{getSession:()=>{sessionCalls++;return never();}}},
    drawSession:()=>{draws++},window:{obiSetBlocks:()=>{}},
    localStorage:{getItem:()=>null,setItem:()=>{}},
    console
  };
  const loadSession=vm.runInNewContext('(()=>{'+snippet+'return loadSession})()',ctx);
  const result=await deadline(loadSession());
  return {pass:result.finished && draws>0,sessionCalls,draws,elapsedMs:result.elapsedMs,
    detail:result.finished?'Sesión local resuelta':'Un getSession bloqueado impide incluso pintar la cabecera y arrancar la ruta offline'};
});
// 6. Inspección estática de rutas que no deben usar red ni detener el flujo.
await probe('Mis descargas usa ruta directa sin red',()=>{
  const p=app.indexOf("if (p === '/descargas' || (!navigator.onLine && !p.startsWith('/leer/'))) return offlinePage();");
  const q=app.indexOf('function offlinePage()');
  return {pass:p>=0&&q>=0,detail:p>=0&&q>=0?'Existe ruta local inmediata de descargas':'No existe escape local de navegación'};
});
await probe('precarga siguiente capítulo desactivada offline',()=>{
  const src=slice(reader,'  const canPrefetch = () =>','  const nextOf = ch =>');
  return {pass:/navigator\.onLine/.test(src),detail:/navigator\.onLine/.test(src)?'Precarga condicionada a red':'Se puede llamar body() para el capítulo siguiente aunque no haya conexión'};
});

for(const row of rows){console.log((row.pass?'PASS':'FAIL')+' '+row.label+
  ' ['+(row.elapsedMs??'-')+'ms, remoto='+ (row.remote??'-')+'] '+row.detail);}
const failures=rows.filter(x=>!x.pass);
console.log('RESULTADO: '+(rows.length-failures.length)+'/'+rows.length+' comprobaciones aprobadas. '+failures.length+' riesgos detectados.');
if(failures.length) process.exitCode=1;

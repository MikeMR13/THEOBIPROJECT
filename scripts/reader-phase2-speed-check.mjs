// Fase 2: funciones reales del lector con datos ficticios, sin backend ni gastos externos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const reader = readFileSync('src/reader.js', 'utf8');
const section = (begin, end) => {
  const a = reader.indexOf(begin), b = reader.indexOf(end, a + begin.length);
  assert(a >= 0 && b > a, 'Falta fragmento del lector: ' + begin);
  return reader.slice(a, b);
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = async (promise, ms) => Promise.race([promise, delay(ms).then(() => { throw Error('Lectura bloqueada'); })]);
const blocks = [{type:'paragraph',text:'Contenido del capítulo'}];

// Precargar y abrir simultáneamente una novela solicita una sola ficha (3 consultas).
{
  const pending = Promise.withResolvers(), calls = [];
  const sb = {from(table) {
    calls.push(table);
    return {
      select() { return this; },
      eq() { return this; },
      is() { return this; },
      order() { return Promise.resolve({data: table === 'chapters' ? [{id:'c1',num:1}] : [{id:'v1',num:1}], error:null}); },
      maybeSingle() { return pending.promise.then(() => ({data:{id:'s1',slug:'demo',title:'Demo'},error:null})); }
    };
  }};
  const stored = [];
  const ctx = {sb, Date, Map, localStorage:{setItem:(key,value)=>stored.push([key,value])},META_KEY:slug=>'test-'+slug};
  const snippet = section('  const metaFlights = new Map();', '  const cachedMeta');
  const api = vm.runInNewContext('(()=>{' + snippet + 'return {fetchMeta,metaFlights}})()',ctx);
  const a=api.fetchMeta('demo'), b=api.fetchMeta('demo');
  assert.equal(a,b,'Las aperturas simultáneas reutilizan exactamente la misma promesa');
  assert.equal(calls.length,3,'No repetir consultas de series, capítulos y volúmenes');
  pending.resolve();
  const [ma,mb] = await Promise.all([a,b]);
  assert.equal(ma,mb);
  await delay(0);
  assert.equal(api.metaFlights.size,0,'Liberar la promesa al finalizar');
  assert.equal(stored.length,1,'Metadatos guardados una sola vez');
}

// Una descarga iniciada con hover puede ganar a Cache Storage sin esperar al disco.
// Repetir peticiones de body() mientras hay una solicitud en curso no duplica la descarga.
{
  const ch={id:'c1',num:1,updated_at:'rev1'}, S={
    series:{id:'s1',slug:'demo'},chapters:[ch],bodies:new Map(),bodyVersions:new Map()
  };
  let disk=0, writes=0, backend=0;
  const early=new Map([['demo/1',Promise.resolve({id:'c1',body:blocks})]]);
  const ctx={S, navigator:{onLine:true},window:{},early,
    cacheGet:async()=>{disk++; await delay(200);return null;},
    cachePut:()=>{writes++;},
    offlineBody:async()=>null,
    sb:{from:()=>{backend++; throw Error('No repetir petición al backend');}},
    Map,Promise};
  const funcs=section('  async function body(ch){','  // texto del siguiente capítulo');
  const body=vm.runInNewContext('(()=>{' + funcs + 'return body})()',ctx);
  const [a,b]=await deadline(Promise.all([body(ch),body(ch)]),100);
  assert.equal(a,blocks);
  assert.equal(b,blocks);
  assert.equal(disk,1,'Solo una lectura de Cache Storage');
  assert.equal(writes,1,'La precarga gana y se guarda una sola vez');
  assert.equal(backend,0,'No duplicar petición remota');
  assert.equal(await body(ch),blocks,'Reabrir desde memoria sin E/S');
  assert.equal(disk,1);
  ch.updated_at='rev2'; // la revisión anterior ya no debe salir de memoria
  const old=await deadline(body(ch),350);
  assert.equal(old,null);
  assert.equal(backend,1,'Tras cambiar la revisión no reutilizar el texto obsoleto');
}

// La sincronización tardía mantiene la opción de retomar sin sobrescribir al usuario.
{
  const ch={id:'c1',num:1}, controls=[{},{}], banner={
    hidden:true,innerHTML:'',
    querySelectorAll:()=>controls,
    querySelector:()=>controls[0]
  };
  let restored=0,saved=0;
  const S={series:{slug:'demo'},chapters:[ch],resumePending:{chapterId:'c1',y:0}};
  const ctx={S,$:()=>banner,esc:x=>String(x),restorePosition:()=>{restored++;},
    saveProgress:()=>{saved++;}};
  const resumeBar=vm.runInNewContext('(()=>{' +
    section('  function resumeBar(ch, pos, synced = false){','  // se llama en el mismo cuadro') +
    'return resumeBar})()',ctx);
  resumeBar(ch,{chapter_id:'c1',block:8},true);
  assert.equal(banner.hidden,false);
  assert.match(banner.innerHTML,/posición de lectura más reciente/);
  controls[0].onclick();
  assert.equal(restored,1,'Se mantiene la restauración voluntaria de la posición');
  assert.equal(S.resumePending,null);
  S.resumePending={chapterId:'c1',y:0};
  resumeBar(ch,{chapter_id:'c1',block:12},true);
  controls[1].onclick();
  assert.equal(S.resumePending,null,'Seguir aquí confirma que se puede guardar esta lectura');
  assert.equal(saved,1);
}

// Guardas de diseño: ya no hay un máximo de 300 ms antes de pintar texto.
// Los campos privados de progreso no pasan a los metadatos públicos.
assert.doesNotMatch(reader,/quick\(fetchPos\(\), localPos\)/);
assert.doesNotMatch(reader,/Promise\.all\(\[body\(ch\), quick\(/);
assert.match(reader,/const pos = localPos\(\), posP = fetchPos\(\)/);
assert.match(reader,/const b = await body\(ch\)/);
assert.match(reader,/S\.resumePending\?\.chapterId === ch\.id/);
assert.match(reader,/S\.bodyFlights\.set\(key, request\)/);
assert.match(reader,/const metaFlights = new Map\(\)/);
assert.match(reader,/navigator\.connection\?\.saveData/);
assert.match(reader,/\('(^|-)2g/); // marcador de red lenta; mantener precarga selectiva
console.log('Fase 2 del lector: sincronización no bloqueante, solicitudes compartidas y recuperación segura OK');

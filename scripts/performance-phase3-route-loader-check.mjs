// Fase 3: pruebas aisladas del loader del lector y del shell PWA.
// No consulta Supabase ni requiere red, credenciales o despliegues externos.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync('src/app.js','utf8');
const html = readFileSync('src/index.html','utf8');
const swBuild = readFileSync('scripts/build.mjs','utf8');
const preloads = [...html.matchAll(/rel="modulepreload"\s+href="([^"]+)"/g)].map(m=>m[1]);
assert(preloads.some(x=>x.startsWith('/app.js?')) && preloads.some(x=>x.startsWith('/ui.js?')),
  'La ruta pública debe conservar la precarga de UI');
for (const module of ['reader.js','blocks.js']) {
  assert(!preloads.some(x=>x.startsWith('/'+module+'?')),
    'No descargar '+module+' en cada visita a Inicio o Catálogo');
}
assert(!/^\s*import\s*\{\s*createReader\s*\}\s*from\s*['"]/m.test(app),
  'reader.js sigue como dependencia estática del arranque');
assert(app.includes("import('/reader.js?v=26')"),
  'Falta importación dinámica del lector');
assert(swBuild.includes("'reader.js', 'blocks.js'"),
  'El lector debe mantenerse en el shell PWA incluso si no se precarga en HTML');
assert(app.includes('const reader = await rd(); if (location.pathname !== p) return; return reader.open('),
  'Navegar rápido no debe abrir un capítulo en una ruta anterior');
assert(app.includes('const slot = app.querySelector(\'#off\'), path = location.pathname;') &&
  app.includes('reader.bindOfflineList(slot, offlinePage)'),
  'Mis descargas deben mantener la representación offline y los enlaces');
assert(!/\brd\(\)\.(?:open|annotationsPage|offlineList|bindOfflineList|historyList|warm|syncPending)/.test(app),
  'Quedaron métodos síncronos de lector después de convertir rd() en Promise');

// Evaluar exactamente el loader original con un importador ficticio.
// Demuestra que dos rutas simultáneas comparten importación e instancia y
// que un fallo transitorio permite reintentar al abrir la ruta de nuevo.
const start = app.indexOf('let R, readerRequest;');
const end = app.indexOf('let U; const ui = ',start);
assert(start>=0 && end>start,'Falta bloque de loader del lector');
const original=app.slice(start,end);
assert(original.includes("import('/reader.js?v=26')"));
const source=original.replace("import('/reader.js?v=26')","fakeImport('/reader.js?v=26')");
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
let request=deferred(),calls=0,constructed=0;
const context={CTX:()=>({testContext:true}),fakeImport:spec=>{
  assert.equal(spec,'/reader.js?v=26');calls++;return request.promise;
}};
const loader=vm.runInNewContext('(()=>{\n'+source+'\nreturn {rd};})()',context);
const first=loader.rd(),second=loader.rd();
assert.equal(calls,1,'Las navegaciones simultáneas duplicaron la carga');
assert.equal(first,second,'Las navegaciones deben compartir la misma promesa de importación');
request.resolve({createReader:ctx=>{constructed++;assert(ctx.testContext);return {open(){return 'OK'}}}});
const [r1,r2]=await Promise.all([first,second]);
assert.equal(r1,r2,'La importación debe crear una sola instancia de lector');
assert.equal(constructed,1,'Se instanció el lector más de una vez');
assert.equal((await loader.rd()).open(),'OK','La instancia del lector debe reutilizarse');

let fails=deferred(),tries=0;
const fallback=vm.runInNewContext('(()=>{\n'+source+'\nreturn {rd};})()',{
  CTX:()=>({}),fakeImport:()=>{tries++;return fails.promise;}
});
const rejected=fallback.rd();
fails.reject(new Error('red transitoria'));
await assert.rejects(rejected,/red transitoria/);
fails=deferred();const retry=fallback.rd();
assert.equal(tries,2,'El lector debe poder reintentarse tras un fallo');
fails.resolve({createReader:()=>({offlineList:()=>'<p>guardado</p>'})});
assert.equal((await retry).offlineList(),'<p>guardado</p>');

// Después de build, confirmar precaché de la versión sellada del lector.
if (existsSync('dist/sw.js')) {
  const sandbox={self:{addEventListener(){}},URL,Response,console};
  vm.runInNewContext(readFileSync('dist/sw.js','utf8')+
    '\n;globalThis.__shell=SHELL;',sandbox);
  for(const file of ['reader.js','blocks.js']) {
    assert(sandbox.__shell.some(x=>x.startsWith('/'+file+'?v=')),
      'El build perdió '+file+' y rompería el lector offline');
  }
}
console.log('✓ Fase 3: lector diferido y compartido, fallos recuperables, navegación segura y PWA offline intacta');

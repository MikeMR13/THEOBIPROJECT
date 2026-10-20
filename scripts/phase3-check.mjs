// Contratos y pruebas de páginas reales en memoria sin dependencias nuevas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPages } from '../src/paging.js';
const all = Array.from({length:601}, (_,i)=>({id:i}));
const ranges = [];
const result = await readPages((a,b)=>{
  ranges.push([a,b]);return Promise.resolve({data:all.slice(a,b+1),error:null});
},{size:250});
assert.equal(result.data.length,601);
assert.deepEqual(ranges,[[0,249],[250,499],[500,749]]);
assert.deepEqual((await readPages(()=>Promise.resolve({data:[]}))).data, []);
await assert.rejects(readPages(()=>Promise.resolve({error:new Error('denied')})),/denied/);
await assert.rejects(readPages(()=>Promise.resolve({data:all.slice(0,250)}),{size:250,maxPages:1}),/límite seguro/);
const ui=readFileSync('src/ui.js','utf8');
assert(ui.includes("const festival = import('/season.js?v=4')"),'Falta carga de temporada no bloqueante');
assert(ui.includes("festival.then(fest =>"),'La temporada debe insertarse progresivamente');
assert(ui.includes("import('/paging.js?v=1')"),'Catálogo sin lectura paginada');
assert(ui.includes("const PAGE_SIZE = 24"),'Catálogo sin límite de renderizado');
assert(ui.includes("list.slice(pageStart, pageStart + PAGE_SIZE)"),'Catálogo dibuja todas las obras');
assert(ui.includes("aria-label=\"Paginación del catálogo\""),'Paginación sin etiqueta');
const studio=readFileSync('src/studio.js','utf8');
assert(studio.includes("is('deleted_at', null).order('id').range(from, to)"),'Studio sin rangos de capítulos');
assert(studio.includes("order('num').range(from, to)"),'Vista editorial sin rangos');
assert(!studio.includes('.limit(3000)'), 'Límite silencioso persistente');
assert(readFileSync('.github/workflows/ci.yml','utf8').includes('npm run phase3-check'));
console.log('Fase 3: Home no bloqueante, catálogo, Studio y páginas: OK');

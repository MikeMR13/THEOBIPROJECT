import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPages } from '../src/paging.js';
import { prepareLibrary, selectLibraryItems } from '../src/library-logic.js';

const now=Date.parse('2026-10-27T12:00:00Z');
const chapter=(id, series_id, num, publish_at, extra={})=>({id,series_id,num,publish_at,status:'published',deleted_at:null,...extra});
const chapters=[
  chapter('a1','a',1,'2026-10-01T00:00:00Z'),
  chapter('a2','a',2,'2026-10-10T00:00:00Z'),
  chapter('a3','a',3,'2026-10-20T00:00:00Z'),
  chapter('b1','b',1,'2026-10-18T00:00:00Z'),
  chapter('b2','b',2,'2026-11-01T00:00:00Z'),
  chapter('c1','c',1,'2026-10-15T00:00:00Z'),
  chapter('c2','c',2,'2026-10-19T00:00:00Z'),
  chapter('d1','d',1,'2026-10-20T00:00:00Z'),
  chapter('d2','d',2,'2026-10-24T00:00:00Z'),
  chapter('gone','a',7,'2026-10-05T00:00:00Z',{deleted_at:'2026-10-10'})
];
const series=[
 {id:'a',slug:'a',title:'Árbol de luz',translation_status:'active',teams:{name:'Equipo A'}},
 {id:'b',slug:'b',title:'Bosque del mañana',translation_status:'active'},
 {id:'c',slug:'c',title:'Canto eterno',translation_status:'completed'},
 {id:'d',slug:'d',title:'Diarios',translation_status:'active'}
];
const readRows=[
 {chapter_id:'a1',read_at:'2026-10-10T00:00:00Z',chapters:{series_id:'a',deleted_at:null}},
 {chapter_id:'a2',read_at:'2026-10-22T00:00:00Z',chapters:{series_id:'a',deleted_at:null}},
 {chapter_id:'b1',read_at:'2026-10-18T00:00:00Z',chapters:{series_id:'b',deleted_at:null}},
 {chapter_id:'c1',read_at:'2026-10-15T00:00:00Z',chapters:{series_id:'c',deleted_at:null}},
 {chapter_id:'c2',read_at:'2026-10-16T00:00:00Z',chapters:{series_id:'c',deleted_at:null}},
 {chapter_id:'gone',read_at:'2026-10-20T00:00:00Z',chapters:{series_id:'a',deleted_at:'2026-10-21'}}
];
const progress=[{series_id:'a',chapter_num:2,pct:.55,updated_at:'2026-10-25T00:00:00Z'}];
const follows=[{series_id:'a'},{series_id:'b'},{series_id:'c'},{series_id:'d'}];
const result=prepareLibrary({progress,follows,readRows,series,chapters,now});
assert.equal(result.read.size,5,'No se cuentan dos veces lecturas ni capítulos borrados');
assert.deepEqual(result.lists.leyendo.map(w=>w.s.id),['a','b'],'Obra con lectura sin progreso también aparece en Leyendo');
assert.deepEqual(result.lists.pendientes.map(w=>w.s.id),['d','a'],'Pendientes se ordenan por última fecha real de publicación disponible');
assert.deepEqual(result.lists.terminadas.map(w=>w.s.id),['c'],'Completa significa obra terminada y capítulos publicados leídos');
assert.equal(result.works.find(w=>w.s.id==='b').tot,1,'Capítulos con fecha futura no están disponibles');
assert.equal(result.works.find(w=>w.s.id==='b').totalPublished,2,'Se conserva el total publicado para el cálculo de completitud');
assert.equal(result.works.find(w=>w.s.id==='b').done,false,'Obras en publicación no se dan por terminadas');
assert.equal(result.works.find(w=>w.s.id==='c').done,true);
assert.equal(result.works.find(w=>w.s.id==='b').resume.num,1,'Lectura sin progreso puede reanudarse');
assert.equal(result.works.find(w=>w.s.id==='a').resume.num,2,'Se prefiere la posición de lectura del servidor');
assert.deepEqual(selectLibraryItems(result.lists.leyendo,{query:'arbol'}).map(w=>w.s.id),['a'],'Buscar sin exigir tildes');
assert.deepEqual(selectLibraryItems(result.lists.leyendo,{query:'equipo a'}).map(w=>w.s.id),['a'],'Buscar por equipo');
assert.deepEqual(selectLibraryItems(result.lists.pendientes,{order:'titulo',tab:'pendientes'}).map(w=>w.s.id),['a','d']);
assert.equal(selectLibraryItems(result.lists.leyendo,{query:'ningún título'}).length,0,'Vacío de búsqueda distinto de biblioteca vacía');

const mock=Array.from({length:1251},(_,i)=>({id:String(i+1).padStart(4,'0')}));
const ranges=[];
const pages=await readPages((from,to)=>{ranges.push([from,to]);return Promise.resolve({data:mock.slice(from,to+1),error:null})},{size:250,maxPages:7});
assert.equal(pages.data.length,1251,'No truncar bibliotecas mayores de mil registros');
assert.deepEqual(ranges,[[0,249],[250,499],[500,749],[750,999],[1000,1249],[1250,1499]]);
await assert.rejects(()=>readPages(async()=>({data:[],error:new Error('Fallo de red')})),/Fallo de red/,'Los errores no deben convertirse en bibliotecas vacías');
await assert.rejects(()=>readPages(async()=>({data:null,error:null})),/incompleta/,'Respuesta inválida no debe ocultarse');

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const reader=readFileSync(new URL('../src/reader.js',import.meta.url),'utf8');
for(const x of [
 "import { readPages } from './paging.js';",
 "import { prepareLibrary, selectLibraryItems } from './library-logic.js';",
 "select('chapter_id,read_at,chapters!inner(series_id,deleted_at)')",
 "box.querySelector('#lb-history-retry')",
 "No pudimos cargar la biblioteca completa.",
 "const live = () => seq === librarySeq",
 "aria-current=\"page\"",
 ".lb-cover-link img{display:block;width:100%;height:100%;object-fit:contain",
 "aria-label=\"Secciones de Mi biblioteca\"",
 "Desliza las pestañas para ver todas las secciones"
])assert(app.includes(x),'Contrato visual/datos de Mi biblioteca: '+x);
assert(reader.includes('.range(from, from + size - 1)'), 'Historial paginado por lotes');
assert(reader.includes('if (error) throw error;'), 'El historial informa los errores');
console.log('✓ Biblioteca: paginación 1,251 filas, progreso reconciliado, terminadas, búsqueda, interfaz y errores');

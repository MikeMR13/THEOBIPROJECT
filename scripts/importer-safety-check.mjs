// Regresión del importador sin credenciales, CDN ni escrituras reales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planVolumeReplacement,validateImportMedia} from '../src/import-safety.js';
import {galleryCoverPaths,loadVolumeCoverChoices} from '../src/volume-cover-gallery.js';

const all=[
 {id:'ch1',num:1,vol:1,volume_id:'v1'},
 {id:'ch2',num:2,vol:1,volume_id:'v1'},
 {id:'ch3',num:3,vol:1,volume_id:'v1'},
 {id:'ch4',num:4,vol:2,volume_id:'v2'},
 {id:'deleted',num:5,vol:1,volume_id:'v1',deleted_at:'2026-01-01'}
];
const plan=planVolumeReplacement(all,'v1',1,2);
assert.deepEqual(plan.update.map(x=>x.id),['ch1','ch2']);
assert.deepEqual(plan.update.map(x=>x.num),[1,2]);
assert.deepEqual(plan.remove.map(x=>x.id),['ch3']);
assert.throws(()=>planVolumeReplacement(all,'v1',1,4),/agreg|Agregar/i);
assert.throws(()=>planVolumeReplacement(all,'none',1,1),/no tiene capítulos activos/);

const images=new Map([
 ['cover.jpg',{blob:{size:1000},type:'image/jpeg',name:'cover.jpg'}],
 ['illus.png',{blob:{size:5500},type:'image/png',name:'illus.png'}],
 ['extra.jpg',{blob:{size:10e6},type:'image/jpeg',name:'extra.jpg'}]
]);
const chapters=[{blocks:[{type:'paragraph',text:'Texto'},{type:'image',url:'img:illus.png'}]}];
assert.deepEqual(validateImportMedia({chapters,images,cover:'img:cover.jpg',allImages:false,maxBytes:8e6}).sort(),
 ['cover.jpg','illus.png']);
assert.throws(()=>validateImportMedia({chapters,images,cover:'img:cover.jpg',allImages:true,maxBytes:8e6}),/supera/);
assert.throws(()=>validateImportMedia({chapters,images:new Map(),cover:null,allImages:false,maxBytes:8e6}),/Falta la ilustración/);
assert.deepEqual(validateImportMedia({chapters:[],images:new Map(),cover:null,allImages:true,maxBytes:8e6}),[]);

const root='team-id/obras/obra-demo/';
const valid=galleryCoverPaths({teamId:'team-id',slug:'obra-demo',
  gallery:[{path:root+'galeria/uno.webp'},{path:'otro/obras/obra-demo/mal.png'},{path:root+'galeria/uno.webp'}],
  files:[root+'vol-2/dos.jpg',root+'vol-2/../otro.jpg',root+'galeria/archivo.js','otro/obras/obra-demo/otra.jpg']});
assert.deepEqual(valid,[root+'galeria/uno.webp',root+'vol-2/dos.jpg']);
const folders=[];
const sb={storage:{from:bucket=>{
  assert.equal(bucket,'obi-media');
  return {list:async dir=>{folders.push(dir);return {data:dir.endsWith('/galeria')?
    [{id:'one',name:'uno.webp'},{id:null,name:'carpeta'}]:[{id:'two',name:'dos.jpg'}],error:null}}};
}}};
const gallery=await loadVolumeCoverChoices({sb,teamId:'team-id',slug:'obra-demo',volumeNum:2,
  gallery:[{path:root+'galeria/uno.webp'}]});
assert.deepEqual(gallery,[root+'galeria/uno.webp',root+'vol-2/dos.jpg']);
assert.deepEqual(folders,[root+'galeria',root+'vol-2']);
const importer=readFileSync('src/studio-importer.js','utf8');
const studio=readFileSync('src/studio.js','utf8');
const css=readFileSync('src/studio.css','utf8');
for(const marker of [
 'planVolumeReplacement(old,vol.id,D.vnum,inc.length)',
 'const plan=replacing?planVolumeReplacement(existing,vol.id,D.vnum,inc.length):null',
 "if(jobError||!createdJob?.id)",
 "if(finishError)toast(",
 'const keysToUpload = validateImportMedia(',
 'for(const old of [...updatedRows,...removedRows].reverse())',
 "pdfjs.GlobalWorkerOptions.workerSrc"
]) assert(importer.includes(marker),'Importador: contrato ausente '+marker);
assert(!importer.includes('globalThis.pdfjsWorker = await import('));
assert(!importer.includes('supera 8 MB y se omitió'),'No deben omitirse ilustraciones silenciosamente');
for(const marker of ['data-vgallery','data-vcoverpick','loadVolumeCoverChoices(', 'aria-pressed=','await setCover(path);showCover(path)'])
 assert(studio.includes(marker),'Editar volumen: contrato ausente '+marker);
assert(css.includes('.wk-vgallery-grid'),'Falta estilo responsive de portada');
console.log('Importador seguro y portada desde Multimedia: numeración, permisos, imágenes, rollback y selector OK');

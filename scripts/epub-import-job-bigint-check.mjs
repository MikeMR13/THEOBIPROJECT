// Regression: real public.import_jobs.id uses BIGINT, not UUID.
// Entire test is local, no Supabase connections, uploads, charges or external APIs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importJobStorageKey,makeImportUploadPath,uploadImportAsset} from '../src/import-upload-paths.js';

const base='11111111-1111-4111-8111-111111111111/obras/obra/vol-1/';
for(const [input,expected] of [
  [1,'j1'],[42,'j42'],['50','j50'],
  [9223372036854775807n,'j9223372036854775807'],
  ['9223372036854775807','j9223372036854775807'],
  ['11111111-1111-4111-8111-111111111111','11111111111141118111111111111111']
]){
  assert.equal(importJobStorageKey(input),expected);
  const p=makeImportUploadPath(base,input);
  assert.match(p('','cover.jpg'),new RegExp('-'+expected+'-1\\.jpg$'));
  assert.match(p('fuentes/','Regular.woff2'),new RegExp('-'+expected+'-2\\.woff2$'));
}
for(const bad of [undefined,null,0,-1,1.5,NaN,Infinity,
  Number.MAX_SAFE_INTEGER+1,'','01','-1','0','1.2','1e3','../../',
  '9223372036854775808',{},[],true]){
  assert.throws(()=>importJobStorageKey(bad),'Debe rechazar ID no válido: '+String(bad));
}
for(const bad of ['../otro/','directorio/../mal/','directorio']){
  assert.throws(()=>makeImportUploadPath(bad,1),'Directorio inseguro');
}
assert.notEqual(
  makeImportUploadPath(base,1)('','cover.jpg'),
  makeImportUploadPath(base,2)('','cover.jpg'),
  'Trabajos distintos jamás deben reutilizar la ruta'
);

const files=new Map(),attempted=[],uploaded=[];
const bucket={async upload(path,blob,options){
  assert.equal(options.upsert,false,'Sin sobrescribir multimedia existente');
  attempted.push(path);
  if(files.has(path))return {error:{code:'KeyAlreadyExist',statusCode:409,message:'Already exists'}};
  files.set(path,blob);return {data:{path},error:null};
}};
const path=makeImportUploadPath(base,50);
// 10 secciones importadas con 10 imágenes (incluidos nombres repetidos).
const chapters=Array.from({length:10},(_,i)=>({title:'Sección '+(i+1),image:'illustration.png'}));
const paths=[];
for(const chapter of chapters){
  const key=await uploadImportAsset(bucket,path,{
    filename:chapter.image,blob:new Blob([chapter.title]),contentType:'image/png'
  },uploaded);
  paths.push(key);
}
assert.equal(paths.length,10);
assert.equal(new Set(paths).size,10,'Mismo nombre de imagen, diferentes rutas');
assert.equal(attempted.length,10);
assert.deepEqual(uploaded,paths,'Rollback solo incluye lo realmente subido');
assert.ok(paths.every(x=>x.startsWith(base)));
assert.ok(paths.every(x=>x.includes('-j50-')));

// Simular un nombre ocupado y verificar que reintenta sin sobreescribir.
const retryPath=makeImportUploadPath(base,50);
files.set(retryPath('','cover.jpg'),new Blob(['antigua']));
const rescued=await uploadImportAsset(bucket,retryPath,{
  filename:'cover.jpg',blob:new Blob(['nueva']),contentType:'image/jpeg'
},uploaded);
assert.notEqual(rescued,base+'cover.jpg');
assert.equal(uploaded.length,11);

const importer=readFileSync(new URL('../src/studio-importer.js',import.meta.url),'utf8');
assert.ok(importer.includes('makeImportUploadPath(dir,job.id)'),
 'El importador debe usar el ID numérico real devuelto por import_jobs');
assert.ok(importer.includes("sb.from('import_jobs').insert("));
assert.ok(importer.includes('const uploaded = [],'));
assert.match(importer,/await sb\.storage\.from\('obi-media'\)\.remove\(uploaded\)/);
console.log('EPUB: ID BIGINT real, 10 secciones, rutas seguras y rollback — PASS');

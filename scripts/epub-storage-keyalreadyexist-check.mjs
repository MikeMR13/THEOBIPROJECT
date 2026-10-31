// Regresión KeyAlreadyExist: sin credenciales, Supabase, red ni escrituras reales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeImportUploadPath,uploadImportAsset,isImportStorageConflict} from '../src/import-upload-paths.js';

const base='equipo/obras/novela/vol-2/';
const id1='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
const plan1=makeImportUploadPath(base,id1);
const first=plan1('','portada.jpg');
const font1=plan1('fuentes/','Font-Regular.woff2');
const font2=plan1('fuentes/','Font-Regular.woff2');
assert.ok(first.startsWith(base));assert.match(first,/\.jpg$/);
assert.ok(font1.startsWith(base+'fuentes/'));assert.match(font1,/\.woff2$/);
assert.notEqual(font1,font2,'Dos fuentes con igual nombre deben tener claves distintas');
const second=makeImportUploadPath(base,id2)('fuentes/','Font-Regular.woff2');
assert.notEqual(font1,second,'Un nuevo trabajo debe tener rutas nuevas al importar el mismo EPUB');

assert.throws(()=>makeImportUploadPath('../malo/',id1));
assert.throws(()=>makeImportUploadPath(base,'not-a-uuid'));
assert.throws(()=>plan1('../','file.jpg'));
const longName=plan1('','x'.repeat(450)+'.png');
assert.ok(longName.split('/').pop().length<=180,'No crear claves demasiado largas');
assert.equal(isImportStorageConflict({code:'KeyAlreadyExist',message:'The resource already exists'}),true);
assert.equal(isImportStorageConflict({statusCode:'409',message:'The resource already exists'}),true);
assert.equal(isImportStorageConflict({code:'NotFound',message:'The resource is missing'}),false);
assert.equal(isImportStorageConflict({statusCode:'403',message:'Forbidden'}),false);

// Simular imágenes y fuentes anteriores dentro del mismo volumen sin sobrescribir.
const preexisting=new Set([base+'portada.jpg',base+'fuentes/Font-Regular.woff2']);
const written=new Map(),attempts=[];
const bucket={async upload(path,blob,opts){
 attempts.push(path);
 assert.equal(opts.upsert,false,'Nunca sobrescribir medios anteriores');
 if(preexisting.has(path)||written.has(path))
   return {error:{code:'KeyAlreadyExist',message:'The resource already exists',statusCode:'409'}};
 written.set(path,blob);
 return {data:{path},error:null};
}};
const uploaded=[];
const planner=makeImportUploadPath(base,id1);
const b1=await uploadImportAsset(bucket,planner,{filename:'portada.jpg',blob:'nueva portada',contentType:'image/jpeg'},uploaded);
const b2=await uploadImportAsset(bucket,planner,{subdir:'fuentes/',filename:'Font-Regular.woff2',blob:'nueva fuente',contentType:'font/woff2'},uploaded);
assert.deepEqual(uploaded,[b1,b2]);
assert.ok(!preexisting.has(b1)&&!preexisting.has(b2));
assert.equal(written.get(b1),'nueva portada');
assert.equal(written.get(b2),'nueva fuente');
assert.ok(preexisting.has(base+'portada.jpg')&&preexisting.has(base+'fuentes/Font-Regular.woff2'));
assert.equal(attempts.length,2);

// Choque real simulado: probar otro nombre; solo registrar el que se guardó.
let collisionCount=0;const retries=[];
const collisionBucket={async upload(path,blob,opts){
 retries.push(path);
 if(collisionCount++===0)return {error:{code:'KeyAlreadyExist',message:'The resource already exists'}};
 return {error:null,data:{path}};
}};
const done=[];
const stored=await uploadImportAsset(collisionBucket,makeImportUploadPath(base,id2),
 {subdir:'fuentes/',filename:'font.woff',blob:'bytes',contentType:'font/woff'},done);
assert.equal(retries.length,2);assert.notEqual(retries[0],retries[1]);
assert.deepEqual(done,[stored],'Rollback solo debe considerar archivos subidos correctamente');

// Errores no relativos a nombres y conflictos continuos deben detener sin guardar rutas.
const noChange=[];
await assert.rejects(()=>uploadImportAsset({upload:async()=>({error:{code:'Unauthorized',message:'No permitido'}})},
 makeImportUploadPath(base,id2),{filename:'a.jpg',blob:'x',contentType:'image/jpeg'},noChange),e=>e?.code==='Unauthorized');
assert.equal(noChange.length,0);
let tries=0;
await assert.rejects(()=>uploadImportAsset({upload:async()=>{tries++;return {error:{code:'KeyAlreadyExist'}};}},
 makeImportUploadPath(base,id2),{filename:'a.jpg',blob:'x',contentType:'image/jpeg'},noChange),e=>e?.code==='KeyAlreadyExist');
assert.equal(tries,3);assert.equal(noChange.length,0);

// Validación de integración: ni listar solo la raíz ni activar upsert.
const importer=readFileSync(new URL('../src/studio-importer.js',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/studio.js',import.meta.url),'utf8');
for(const item of ['makeImportUploadPath(dir,job.id)','uploadImportAsset(bucket,nextPath,',
 'uploaded.push(p)','for (const f of P.fonts)','for (const key of keys)']) {
 if(item==='uploaded.push(p)')assert.ok(!importer.includes(item),'Las rutas solo deben registrarse tras subirlas');
 else assert.ok(importer.includes(item),'Contrato de importación perdido: '+item);
}
assert.ok(!importer.includes('takenNames'),'No usar la lista de raíz para subcarpetas');
assert.ok(studio.includes('studio-importer.js?v=7'),'Actualizar versión de caché del importador');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
assert.ok(app.includes('/studio.js?v=63'),'La navegación debe invalidar el módulo Studio previo');
assert.ok(html.includes('/app.js?v=54'),'HTML debe invalidar el módulo app antiguo');
console.log('EPUB KeyAlreadyExist: rutas exclusivas, choque 409, reintento y rollback seguro — PASS');

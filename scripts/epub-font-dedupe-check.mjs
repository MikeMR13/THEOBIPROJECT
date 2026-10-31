// Fontes EPUB compartidas por equipo, solo con bytes idénticos, QA sin Supabase real.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTeamFontStore,fingerprintFont} from '../src/import-font-reuse.js';

const team='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const prefix='https://supabase.example/storage/v1/object/public/obi-media/';
const bytes=new TextEncoder().encode('wOF2-foo-font-version-one');
const different=new TextEncoder().encode('wOF2-foo-font-version-two');
const font={name:'Regular.woff2',family:'Ejemplo',style:'normal',weight:400,bytes};
const digest=(await fingerprintFont(bytes,'otrofichero.ttf'));
assert.equal(digest.extension,'woff2');
assert.equal(digest.sha256.length,64);
assert.equal((await fingerprintFont(bytes,'Regular.woff2')).sha256,digest.sha256);
assert.notEqual((await fingerprintFont(different,'Regular.woff2')).sha256,digest.sha256);

function fixture(initial=[],volumes=[]) {
 const files=new Map(initial),uploads=[],downloads=[],queries=[];
 const bucket={
  async download(path){
   downloads.push(path);
   return files.has(path)?{data:files.get(path),error:null}:
    {data:null,error:{statusCode:404,code:'not_found',message:'Object not found'}};
  },
  async upload(path,blob,options){
   uploads.push({path,options});
   if(files.has(path))return {error:{statusCode:409,code:'KeyAlreadyExist',message:'The resource already exists'}};
   files.set(path,blob);return {data:{path},error:null};
  }
 };
 const sb={from(table){
   assert.equal(table,'volumes');
   return {select(value){
     assert.equal(value,'epub_fonts,series!inner(team_id)');
     return {eq(name,id){
       queries.push([name,id]);
       return {async limit(n){
         assert.equal(n,250);
         return {data:volumes,error:null};
       }};
     }};
   }};
 }};
 return {bucket,sb,files,uploads,downloads,queries};
}

// Nueva fuente: una subida única en el equipo y fuera del rollback de imágenes.
const a=fixture();
const st1=createTeamFontStore({sb:a.sb,bucket:a.bucket,teamId:team,publicPrefix:prefix});
const one=await st1(font);
assert.equal(one.reused,false);assert.equal(a.uploads.length,1);
assert.equal(one.path,team+'/fuentes/sha256-'+digest.sha256+'.woff2');
assert.equal(a.uploads[0].options.upsert,false);
assert.equal(a.uploads[0].options.contentType,'font/woff2');
// Dos fuentes repetidas dentro del mismo EPUB.
const same=await st1({...font,name:'Renamed.woff2'});
assert.equal(same.path,one.path);assert.equal(a.uploads.length,1);
const b=createTeamFontStore({sb:a.sb,bucket:a.bucket,teamId:team,publicPrefix:prefix});
const future=await b(font);
assert.equal(future.path,one.path);
assert.equal(future.reused,true);
assert.equal(a.uploads.length,1,'Reimportar no debe volver a subir la fuente');

// Otra fuente con el MISMO nombre NO debe reutilizar bytes diferentes.
const newFile=await b({...font,bytes:different});
assert.notEqual(newFile.path,one.path);assert.equal(a.uploads.length,2);

// No se cruzan equipos aunque las fuentes sean idénticas.
const otherTeam=await createTeamFontStore({sb:a.sb,bucket:a.bucket,teamId:other,publicPrefix:prefix})(font);
assert.ok(otherTeam.path.startsWith(other+'/fuentes/'));
assert.notEqual(otherTeam.path,one.path);

// Fuente legacy de un volumen del mismo equipo: verificar bytes antes de usar.
const oldPath=team+'/obras/obra/vol-1/fuentes/Regular-old-job.woff2';
const old=fixture([[oldPath,new Blob([bytes])]],[
 {series:{team_id:other},epub_fonts:[{family:'Ejemplo',style:'normal',weight:400,url:prefix+other+'/fuentes/evil.woff2'}]},
 {series:{team_id:team},epub_fonts:[{family:'Ejemplo',style:'normal',weight:400,url:prefix+oldPath}]}
]);
const legacy=await createTeamFontStore({sb:old.sb,bucket:old.bucket,teamId:team,publicPrefix:prefix})(font);
assert.equal(legacy.path,oldPath);
assert.equal(legacy.reused,true);
assert.equal(old.uploads.length,0);
assert.deepEqual(old.queries,[['series.team_id',team]]);

// Nombre/familia iguales y bytes distintos nunca se reutilizan.
const mismatch=fixture([[oldPath,new Blob([different])]],[
 {series:{team_id:team},epub_fonts:[{family:'Ejemplo',style:'normal',weight:400,url:prefix+oldPath}]}
]);
const canonical=await createTeamFontStore({sb:mismatch.sb,bucket:mismatch.bucket,teamId:team,publicPrefix:prefix})(font);
assert.notEqual(canonical.path,oldPath);
assert.equal(mismatch.uploads.length,1);

// Colisión concurrente: verificar que el objeto existente es idéntico.
let wrote=false;const race=fixture();
const original=race.bucket.upload;
race.bucket.upload=async(path,blob,options)=>{
 if(!wrote){wrote=true;race.files.set(path,new Blob([bytes]));return {error:{code:'KeyAlreadyExist'}};}
 return original(path,blob,options);
};
const won=await createTeamFontStore({sb:race.sb,bucket:race.bucket,teamId:team,publicPrefix:prefix})(font);
assert.equal(won.reused,true);assert.equal(won.path,one.path);

// Nunca confiar en una colisión si contiene bytes diferentes.
const badKey=team+'/fuentes/sha256-'+digest.sha256+'.woff2';
const bad=fixture([[badKey,new Blob([different])]]);
await assert.rejects(
 ()=>createTeamFontStore({sb:bad.sb,bucket:bad.bucket,teamId:team,publicPrefix:prefix})(font),
 /contiene datos diferentes/
);

// Fallo no-404 del Storage: no asumir que la fuente falta.
const offline=fixture();
offline.bucket.download=async()=>({error:{statusCode:403,message:'Forbidden'}});
await assert.rejects(
 ()=>createTeamFontStore({sb:offline.sb,bucket:offline.bucket,teamId:team,publicPrefix:prefix})(font),
 e=>Number(e.statusCode)===403
);
assert.equal(offline.uploads.length,0);
assert.throws(()=>createTeamFontStore({bucket:a.bucket,teamId:'bad',publicPrefix:prefix}));
assert.throws(()=>createTeamFontStore({bucket:a.bucket,teamId:team,publicPrefix:'bad'}));

const importer=readFileSync(new URL('../src/studio-importer.js',import.meta.url),'utf8');
assert.ok(importer.includes('createTeamFontStore('));
assert.ok(importer.includes("const {path,sha256}=await reuseFont(f)"));
assert.ok(importer.includes('const uploaded = []'));
assert.ok(!importer.includes("await up('fuentes/'"),'No volver a subir todas las fuentes con claves por trabajo');
assert.match(importer,/await sb\.storage\.from\('obi-media'\)\.remove\(uploaded\)/);
const studio=readFileSync(new URL('../src/studio.js',import.meta.url),'utf8');
assert.ok(studio.includes("studio-importer.js?v=7"));
console.log('EPUB SHA-256 por equipo: nuevo, reuso, legacy, error 409, borrado y aislamiento — PASS');

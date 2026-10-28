// Pruebas sin costo: selección, permisos, carga segura y separación de portadas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSeriesCoverFile,loadSeriesCoverChoices,saveSeriesCover,uploadSeriesCover} from '../src/series-cover-editor.js';
const team='team-qa',slug='obra-qa',id='series-qa',base=team+'/obras/'+slug;
const items={
 [base]:[{id:'root',name:'portada-antigua.webp'},{id:null,name:'galeria'},{id:null,name:'vol-1'},{id:null,name:'vol-2'},{id:null,name:'otra-carpeta'}],
 [base+'/galeria']:[{id:'img1',name:'ilustracion.jpg'},{id:'x',name:'no-valido.svg'}],
 [base+'/vol-1']:[{id:'img2',name:'arte.png'},{id:'x',name:'archivo.txt'}],
 [base+'/vol-2']:[{id:'img3',name:'portada.webp'}]
};
let lists=[],wrote=[],uploads=[],removed=[],denied=false,brokenUpload=false;
const store={
 list:async (folder,{offset=0,limit=200}={})=>{lists.push(folder);return {data:(items[folder]||[]).slice(offset,offset+limit),error:null}},
 upload:async (path,file)=>{uploads.push({path,file});return {error:brokenUpload?Error('storage denied'):null}},
 remove:async paths=>{removed.push(...paths);return {error:null}}
};
const sb={
 storage:{from:(bucket)=>{assert.equal(bucket,'obi-media');return store}},
 from:table=>{
   assert.equal(table,'series','Solo se permite modificar la portada de la obra');
   return {
     update(patch){
       assert.deepEqual(Object.keys(patch),['cover_path'],'No cambiar datos ni volúmenes');
       wrote.push({patch,filters:{}});
       return this;
     },
     eq(k,v){wrote.at(-1).filters[k]=v;return this},
     select(k){assert.equal(k,'id,cover_path');return this},
     async maybeSingle(){const {patch,filters}=wrote.at(-1);
       assert.deepEqual(filters,{id,team_id:team},'Restringir la escritura por equipo y obra');
       return denied?{data:null,error:null}:{data:{id,cover_path:patch.cover_path},error:null};
     }
   }
 }
};
const candidate=await loadSeriesCoverChoices({sb,teamId:team,slug,
 gallery:[{path:base+'/galeria/ilustracion.jpg'},
  {path:'otro-team/obras/obra-qa/no.jpg'},{path:base+'/vol-2/../no.jpg'}]});
assert.deepEqual(candidate.sort(),[
 base+'/galeria/ilustracion.jpg',base+'/portada-antigua.webp',base+'/vol-1/arte.png',base+'/vol-2/portada.webp'].sort());
assert(!lists.includes(base+'/otra-carpeta'),'No abrir carpetas ajenas a la novela');
assert.equal(validateSeriesCoverFile({type:'image/png',size:1024}),'png');
assert.equal(validateSeriesCoverFile({type:'image/webp',size:1024}),'webp');
assert.equal(validateSeriesCoverFile({type:'image/jpeg',size:1024}),'jpg');
assert.throws(()=>validateSeriesCoverFile({type:'image/svg+xml',size:100}),/JPG, PNG o WebP/);
assert.throws(()=>validateSeriesCoverFile({type:'image/png',size:8*1024*1024+1}),/máximo 8 MB/);
assert.throws(()=>validateSeriesCoverFile({type:'image/png',size:0}),/8 MB/);
const saved=await saveSeriesCover({sb,seriesId:id,teamId:team,path:candidate[0]});
assert.equal(saved,candidate[0]);
assert.equal(await saveSeriesCover({sb,seriesId:id,teamId:team,path:null}),null);
denied=true;
await assert.rejects(saveSeriesCover({sb,seriesId:id,teamId:team,path:candidate[0]}),/permiso/);
denied=false;
const file={type:'image/webp',size:1200};
const uploaded=await uploadSeriesCover({sb,seriesId:id,teamId:team,slug,file});
assert.match(uploaded,new RegExp('^'+base+'/portada-[^/]+\\.webp$'));
assert(uploads.some(x=>x.path===uploaded));
assert.equal(wrote.at(-1).patch.cover_path,uploaded);
denied=true;
await assert.rejects(uploadSeriesCover({sb,seriesId:id,teamId:team,slug,file}),/permiso/);
assert.equal(removed.length,1,'Revertir imagen nueva si falla la escritura');
assert.notEqual(removed[0],uploaded,'Nunca borrar una portada previamente guardada');
denied=false;brokenUpload=true;
const priorWrites=wrote.length;
await assert.rejects(uploadSeriesCover({sb,seriesId:id,teamId:team,slug,file}),/storage denied/);
assert.equal(wrote.length,priorWrites,'No actualizar la obra si falla la subida');
const studio=readFileSync('src/studio.js','utf8');
const editor=readFileSync('src/series-cover-editor.js','utf8');
const css=readFileSync('src/series-cover-editor.css','utf8');
assert(studio.includes('id="wk-series-cover"'),'La portada debe aparecer en Datos');
assert(studio.includes("if (tab === 'datos') { bindSeriesPublication"));
assert(studio.includes('mountSeriesCoverEditor({ sb, series:s'));
assert(!studio.includes("if (tab === 'caps') mountSeriesCoverEditor"));
for(const token of ['Portada de la novela','Subir portada','Elegir de Multimedia','Quitar portada',
  'role="status"','aria-pressed','aria-expanded','canEdit','gallery'])
 assert(editor.includes(token),'Falta interacción '+token);
assert(css.includes('@media(max-width:520px)'),'Portada responsive');
assert(studio.length<280000,'Studio superó el presupuesto original');
console.log('Portada principal en Datos: catálogo multimedia, permisos, JPEG/PNG/WebP, subida, rollback, volumen intacto y móvil OK');

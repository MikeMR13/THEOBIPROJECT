// QA sin costo ni Supabase: botones en Obras/Biblioteca, restricciones, índice compartido y rollback.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOfflineDownloads, offlineSaved, readOfflineIndex } from '../src/offline-downloads.js';

const storage = new Map();
const store = {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
let requests=[], missingBody=null, failAsset=false, events=0;
const db={
 series:{id:'s1',slug:'obra-demo',title:'Obra demo',teams:{name:'Equipo ficticio'}},
 chapters:[
 {id:'c1',num:1,vol:1,status:'published',updated_at:'v1'},
 {id:'c2',num:2,vol:1,status:'published',updated_at:'v1'},
 {id:'c3',num:3,vol:2,status:'published',updated_at:'v1'},
 {id:'c4',num:4,vol:2,status:'draft',updated_at:'v1'},
 {id:'c5',num:5,vol:2,status:'published',publish_at:'2100-01-01T00:00:00Z'}
 ],
 volumes:[{id:'v1',num:1,epub_fonts:[]},{id:'v2',num:2,epub_fonts:[]}]
};
const query=table=>({
  filters:{},select(fields){this.fields=fields;return this;},
  eq(k,v){this.filters[k]=v;return this;},
  is(){return this;},order(){return this;},
  maybeSingle:async function(){
    requests.push({table,fields:this.fields,id:this.filters.id});
    if(table==='series')return {data:db.series,error:null};
    if(table==='chapters'&&this.fields==='body')return {data:this.filters.id===missingBody?null:{body:[{type:'paragraph',text:'Capítulo'},...(this.filters.id==='c3'?[{type:'image',url:'test.png'}]:[])]},error:null};
    return {data:null,error:null};
  },
  then:function(ok,fail){const data=table==='chapters'?db.chapters:table==='volumes'?db.volumes:table==='glossary_terms'?[]:[];
    requests.push({table,fields:this.fields});return Promise.resolve({data,error:null}).then(ok,fail);}
});
const sb={from:query};
const cacheMap = new Map();
const norm=k=>typeof k==='string'?k:k.url;
const cache={match:async k=>cacheMap.get(norm(k))?.clone()||null,
  put:async(k,r)=>cacheMap.set(norm(k),r.clone()),delete:async k=>cacheMap.delete(norm(k)),keys:async()=>[...cacheMap.keys()].map(url=>({url}))};
const cacheAPI={open:async name=>{assert.equal(name,'obi-offline-v1');return cache;}};
const notices=[];
const originalNav=globalThis.navigator, originalDoc=globalThis.document;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,storage:{persist:async()=>true}}});
globalThis.document={dispatchEvent:()=>events++,querySelectorAll:()=>[],documentElement:{dataset:{}}};
let fetchCount=0;
const downloader=createOfflineDownloads({sb,url:'https://example.test',store,cacheAPI,
 fetcher:async()=>{fetchCount++;if(failAsset)throw Error('Ilustración no disponible');return new Response('PNG',{headers:{'content-type':'image/png'}});},
 toast:x=>notices.push(x)});
try {
  const chButton=downloader.button({slug:'obra-demo',scope:'chapter',num:1});
  assert.match(chButton,/data-offline-num="1"/);
  assert.match(chButton,/Descargar capítulo/);
  assert.equal(offlineSaved(readOfflineIndex(store),'obra-demo','chapter',null,1),false);
  await downloader.download({slug:'obra-demo',scope:'chapter',num:1});
  assert.equal(offlineSaved(readOfflineIndex(store),'obra-demo','chapter',null,1),true);
  assert.match(downloader.button({slug:'obra-demo',scope:'chapter',num:1}),/✓ Descargado/);
  assert(cacheMap.has('/offline/meta/obra-demo'),'Los capítulos necesitan metadatos completos offline');
  assert(cacheMap.has('/offline/obra-demo/1'));
  assert.equal((await (await cache.match('/offline/obra-demo/1')).json())[0].text,'Capítulo');
  const savedIndex=store.getItem('obi-offline-index');
  // Permisos: un capítulo sin body no se guarda, ni se altera el capítulo anterior.
  missingBody='c2';
  await assert.rejects(downloader.download({slug:'obra-demo',scope:'volume',vol:1}),/no está disponible/);
  assert.equal(store.getItem('obi-offline-index'),savedIndex);
  assert(cacheMap.has('/offline/obra-demo/1'));
  assert(!cacheMap.has('/offline/obra-demo/2'));
  missingBody=null;
  await downloader.download({slug:'obra-demo',scope:'volume',vol:1});
  assert.equal(offlineSaved(readOfflineIndex(store),'obra-demo','volume',1),true);
  assert.equal(offlineSaved(readOfflineIndex(store),'obra-demo','chapter',null,2),true);
  // Una imagen fallida tampoco marca la novela completa; capítulos previos siguen.
  failAsset=true;
  await assert.rejects(downloader.download({slug:'obra-demo',scope:'series'}),/Ilustración no disponible/);
  assert.equal(offlineSaved(readOfflineIndex(store),'obra-demo','series'),false);
  assert(cacheMap.has('/offline/obra-demo/1'));
  assert(!cacheMap.has('/offline/obra-demo/3'));
  failAsset=false;
  await downloader.download({slug:'obra-demo',scope:'series'});
  assert.equal(offlineSaved(readOfflineIndex(store),'obra-demo','series'),true);
  assert(cacheMap.has('/offline/obra-demo/3'));
  assert(!cacheMap.has('/offline/obra-demo/4'),'No descargar borradores');
  assert(!cacheMap.has('/offline/obra-demo/5'),'No descargar futuros');
  assert(fetchCount>=2,'Incluir recursos multimedia');
  assert(events>0,'Notificar cambios de descarga a otras vistas');
  assert.equal((readOfflineIndex(store)['s1:ch:1']).nums[0],1);
  assert.equal(readOfflineIndex(store)['s1:1'].kind,'volume');
  const oldIndex=store.getItem('obi-offline-index');
  const again=await downloader.download({slug:'obra-demo',scope:'series'});
  assert.equal(again.already,true,'No descargar dos veces una novela completa');
  assert.equal(store.getItem('obi-offline-index'),oldIndex);
  const app=readFileSync('src/app.js','utf8'),ui=readFileSync('src/ui.js','utf8'),reader=readFileSync('src/reader.js','utf8'),html=readFileSync('src/index.html','utf8');
  assert.match(app,/offlineDownloads\.button\(\{slug:w\.s\.slug,scope:'series'\}\)/);
  assert.match(app,/offlineDownloads\.button\(\{slug:w\.s\.slug,scope:'chapter'/);
  assert.match(ui,/offlineButton\(\{slug:s\.slug,scope:'series'\}\)/);
  assert.match(ui,/offlineButton\(\{slug:s\.slug,scope:'volume'/);
  assert.match(ui,/offlineButton\(\{slug:s\.slug,scope:'chapter'/);
  assert.match(reader,/otherChapterKeys/,'Borrar un volumen no puede borrar otro capítulo compartido');
  assert.match(reader,/it\.kind === 'chapter'/,'Mis descargas distingue capítulos');
  assert.match(html,/reader-a11y\.css\?v=2/);
  console.log('QA offline Obras y Biblioteca: novela, volúmenes, capítulo, RLS, rollback, recursos e índice compartido OK');
} finally {
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:originalNav});
  globalThis.document=originalDoc;
}

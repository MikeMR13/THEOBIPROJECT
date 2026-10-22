// QA reproducible y sin servicios externos de los contratos de la PWA.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(file, 'utf8');
const workerSource = read('public/sw.js');
const readerSource = read('src/reader.js');
const origin = 'https://pwa-test.invalid';
class MemoryCache {
  constructor(){ this.entries = new Map(); this.failPut = false; }
  async match(key){ return this.entries.get(String(key))?.clone(); }
  async put(key,response){
    if(this.failPut) throw new Error('QuotaExceededError');
    this.entries.set(String(key),response.clone());
  }
  async delete(key){ return this.entries.delete(String(key)); }
}
function cacheStorage(){
  const all = new Map();
  return {
    all,
    async open(name){ if(!all.has(name)) all.set(name,new MemoryCache()); return all.get(name); },
    async match(key){ for(const c of all.values()){ const v=await c.match(key); if(v)return v; } },
    async keys(){ return [...all.keys()]; },
    async delete(name){ return all.delete(name); }
  };
}
function workerHarness(fetcher,shell=['/','/app.js?v=123','/styles.css?v=123']){
  const storage = cacheStorage(), events = new Map();
  let skipped=0;
  const self = {
    addEventListener: (name,fn)=>events.set(name,fn),
    skipWaiting: async()=>{skipped++;},
    clients:{claim:async()=>{}}
  };
  const code = workerSource.replace(/\/\*@shell\*\/[\s\S]*?\/\*@end\*\//,
    `const V='obi-pwa-test',SHELL=${JSON.stringify(shell)},LAZY=[];`);
  const ctx = {self,caches:storage,fetch:fetcher,Response,URL,location:{origin},console};
  vm.runInNewContext(code+'\n;globalThis.__nav=nav;',ctx);
  const lifecycle = async name => {
    let promise;
    events.get(name)({ waitUntil: p=>{promise=p;} });
    assert.ok(promise,'Evento '+name+' sin waitUntil');
    return promise;
  };
  return {storage,events,ctx,lifecycle,get skipped(){return skipped;}};
}
const okResponse=path=>new Response(path.startsWith('/app.js')?'export default 1':path.startsWith('/styles.css')?'body{}':'<!doctype html><title>Obi</title>',{
  status:200,headers:{'content-type':path.startsWith('/app.js')?'application/javascript':path.startsWith('/styles.css')?'text/css':'text/html'}
});
{
  const h=workerHarness(async path => path.startsWith('/app.js') ? Promise.reject(new Error('sin red')):okResponse(path));
  const old=await h.storage.open('obi-antiguo');
  await old.put('/',okResponse('/'));
  await assert.rejects(h.lifecycle('install'),/incompleta/);
  assert.equal(h.skipped,0,'Una instalación incompleta no debe tomar control');
  assert.ok(await old.match('/'),'La versión antigua debe conservarse');
}
{
  const h=workerHarness(async path => path.startsWith('/app.js')
    ? new Response('<!doctype html><title>Proxy</title>',{headers:{'content-type':'text/html'}})
    : okResponse(path));
  await assert.rejects(h.lifecycle('install'),/incompleta/);
}
{
  let requests=0;
  const h=workerHarness(async path => {requests++;return okResponse(path);});
  await h.lifecycle('install');
  assert.equal(h.skipped,1);
  const store=await h.storage.open('obi-pwa-test');
  assert.ok(await store.match('/app.js?v=123'));
  const initial=requests;
  const page=await h.ctx.__nav({}, {url:origin+'/catalogo'},new URL(origin+'/catalogo'));
  assert.ok((await page.text()).includes('Obi'));
  assert.equal(requests,initial,'El HTML precargado no debe sustituirse por otro sin sus módulos');
  await h.lifecycle('activate');
}
// Verificar que el artefacto compilado contiene todas las dependencias ES estáticas.
if (existsSync('dist/sw.js')) {
  const events=new Map(), sandbox={
    self:{ addEventListener:(name,fn)=>events.set(name,fn),clients:{claim:async()=>{}} },
    caches:cacheStorage(), fetch:async()=>{}, Response,URL, location:{origin}, console
  };
  vm.runInNewContext(read('dist/sw.js')+'\n;globalThis.__shell=SHELL;',sandbox);
  const shell=sandbox.__shell;
  const mandatory=new Set(['app.js','ui.js','reader.js','blocks.js','tts.js']);
  for(const file of mandatory){
    assert.ok(shell.some(s=>s.startsWith('/'+file+'?v=')),'Falta arranque: '+file);
  }
  for(const item of ['reader-a11y.css','styles.css']){
    assert.ok(shell.some(s=>s.startsWith('/'+item+'?v=')),'Falta estilo: '+item);
  }
  const queue=['app.js','ui.js','reader.js','blocks.js'], visited=new Set();
  while(queue.length){
    const file=queue.shift(); if(visited.has(file))continue; visited.add(file);
    const src=read('src/'+file);
    const regex=/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"](?:\.\/|\/)([\w-]+\.js)(?:\?v=[^'"]+)?['"]/g;
    for(const m of src.matchAll(regex))queue.push(m[1]);
  }
  for(const file of visited){
    assert.ok(shell.some(s=>s.startsWith('/'+file+'?v=')), 'Dependencia ES no precargada: '+file);
  }
}

const start=readerSource.indexOf('  const offIndex = () =>');
const end=readerSource.indexOf('  function offlineList(){',start);
assert.ok(start>=0&&end>start,'No se localizaron las funciones offline');
const offlineFunctions=readerSource.slice(start,end);
function localStore(){
  const m=new Map();
  return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>m.delete(k),
    key:i=>[...m.keys()][i]??null,get length(){return m.size;}};
}
function readerHarness({ missingChapter=false, missingAsset=false, quota=false }={}){
  const storage=cacheStorage(), localStorage=localStore(), notices=[];
  const buttons=[{textContent:'Descargar volumen',disabled:false}];
  const shared='https://media.invalid/imagen.png';
  const S={series:{id:'serie1',slug:'obra',title:'Obra'}, chapters:[
    {id:'c1',num:1,vol:1},{id:'c2',num:2,vol:1},{id:'c3',num:3,vol:2}],
    active:null, vols:[],gloss:[],extras:Promise.resolve()};
  S.active=S.chapters[0];
  const ctx={
    S, caches:storage,window:{caches:storage},Response,localStorage,
    document:{querySelectorAll:()=>buttons},
    navigator:{onLine:true,storage:{persist:async()=>true}},
    body:async ch => missingChapter && ch.num===2 ? null : [{type:'image',src:shared},{type:'paragraph',text:'texto'}],
    media:x=>x, volOf:()=>({epub_fonts:[]}),
    fetch:async()=>missingAsset?new Response('missing',{status:404}):new Response('binary',{status:200,headers:{'content-type':'image/png'}}),
    toast: msg=>notices.push(msg)
  };
  const functions=vm.runInNewContext(`(() => {const OFF_CACHE='obi-offline-v1',OFF_INDEX='obi-offline-index';${offlineFunctions};return {toggleOffline,removeVolume,offIndex};})()`,ctx);
  return {ctx,functions,S,storage,localStorage,buttons,notices,shared,quota};
}
{
  const h=readerHarness({missingChapter:true});
  await h.functions.toggleOffline();
  assert.equal(Object.keys(h.functions.offIndex()).length,0,'Capítulo omitido no debe marcar volumen descargado');
  assert.equal(h.buttons[0].disabled,false);
  const c=await h.storage.open('obi-offline-v1');
  assert.equal((await c.keys?.())?.length??c.entries.size,0,'Hay que eliminar capítulos parciales');
}
{
  const h=readerHarness({missingAsset:true});
  await h.functions.toggleOffline();
  assert.equal(Object.keys(h.functions.offIndex()).length,0,'Recurso fallido no debe marcar volumen descargado');
  assert.equal(h.buttons[0].disabled,false);
}
{
  const h=readerHarness();
  const c=await h.storage.open('obi-offline-v1');
  c.failPut=true;
  await h.functions.toggleOffline();
  assert.equal(Object.keys(h.functions.offIndex()).length,0,'Error de cuota no debe marcar volumen');
  assert.equal(h.buttons[0].disabled,false,'La interfaz debe recuperarse tras la cuota');
}
{
  const h=readerHarness();
  await h.functions.toggleOffline();
  assert.equal(Object.keys(h.functions.offIndex()).length,1,'Una descarga íntegra debe quedar registrada');
  h.S.active=h.S.chapters[2];
  await h.functions.toggleOffline();
  assert.equal(Object.keys(h.functions.offIndex()).length,2);
  const c=await h.storage.open('obi-offline-v1');
  await h.functions.removeVolume('serie1:1');
  assert.ok(await c.match(h.shared),'Al eliminar un volumen no se deben borrar recursos compartidos');
  assert.ok(await c.match('/offline/meta/obra'),'La ficha de la serie debe permanecer mientras otro volumen la usa');
  assert.ok(await c.match('/offline/obra/3'),'El otro volumen debe conservar sus capítulos');
}
console.log('QA PWA offline: caché íntegro, MIME, HTML estable, dependencias, descargas y recursos compartidos OK');

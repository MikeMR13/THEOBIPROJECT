// Fase 4: carrera de observadores y límites del modo continuo con funciones originales.
// Sin cuentas reales ni backend; comprueba transiciones imposibles de cubrir con aserciones de texto.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { adjacentChapter } from '../src/reader-navigation.js';

const source=readFileSync('src/reader.js','utf8');
function cut(a,b) {
  const i=source.indexOf(a),j=source.indexOf(b,i+a.length);
  assert(i>=0&&j>i,'No se localizó código real: '+a);
  return source.slice(i,j);
}
const chapter=(id,num,vol)=>({id,num,vol,title:'Capítulo '+num,volume_id:'v'+vol,updated_at:'rev'});
const c1=chapter('c1',1,1), c2=chapter('c2',2,1), c3=chapter('c3',3,2), chapters=[c1,c2,c3];
const S={series:{slug:'obra-qa'},chapters,vols:[],mounted:[c1],active:c1,openId:1,loadingNext:false,remote:{global:{},per_volume:{}}};
let mode='volume', bodyFn=()=>Promise.resolve([{type:'paragraph',text:'Contenido de prueba'}]), mounts=[], tracked=[],prefetched=[], annotations=[];
const articles=new Map(chapters.map(c=>[c.id,{dataset:{ch:c.id},isConnected:true}]));
const rd={style:{setProperty:()=>{}}};
const bar={getBoundingClientRect:()=>({height:92})};
const flow={isConnected:true,insertAdjacentHTML(_,html){
  const id=html.match(/data-ch="([^"]+)"/)?.[1];assert(id,'Capítulo sin ID');mounts.push(id);articles.set(id,{dataset:{ch:id},isConnected:true});
}};
const sentinel={};
const $=q=>q==='.rd'?rd:q==='.rd-bar'?bar:q==='#rd-flow'?flow:q==='#rd-sentinel'?sentinel:
  q.startsWith('[data-ch=')?articles.get(q.match(/"([^"]+)"/)?.[1]):null;
const document={querySelectorAll:()=>[articles.get('c1')]};
const listeners=[];
class IO {
  constructor(fn,options){this.callback=fn;this.options=options;this.disconnected=false;listeners.push(this)}
  observe(){} disconnect(){this.disconnected=true}
  fire(){return this.callback([{isIntersecting:true,target:{dataset:{ch:'c1'}}}])}
}
class RO {observe(){} disconnect(){}}
const ctx={S,$,document,ResizeObserver:RO,IntersectionObserver:IO,
  body:ch=>bodyFn(ch),effective:()=>({continuous:mode}),nextOf:ch=>adjacentChapter(chapters,ch,1),
  chapterHTML:ch=>'<article data-ch="'+ch.id+'"></article>',
  markTerms:()=>{},trackView:ch=>tracked.push(ch.id),prefetchNext:ch=>prefetched.push(ch.id),
  fetchAnnots:async()=>[],paintAnnots:()=>{},trimMounted:()=>{},
  history:{replaceState:()=>{}},logHistory:()=>{},footer:()=>{},
  removeEventListener:()=>{},addEventListener:()=>{},onScroll:()=>{},barRO:null,io:null,activeIo:null};
const api=vm.runInNewContext('(()=>{' +
  cut('  let io, activeIo, barRO;','  // lectura continua: máximo 3 capítulos')+
  'return {observe,getIo:()=>io}})()',ctx);
const getMain=()=>api.getIo();

// 1. Respeta frontera de volumen incluso si el observador ve el sentinel.
api.observe();
let gate={};gate.promise=new Promise(ok=>{gate.release=ok});
bodyFn=()=>gate.promise;
const delayed=getMain().fire();
S.openId=2;S.loadingNext=false;flow.isConnected=false; // open() reinicia el bloqueo al cambiar de capítulo
gate.release([{type:'paragraph',text:'No insertar'}]);
await delayed;
assert.equal(mounts.length,0,'Una respuesta antigua montó un capítulo después de abandonar el lector');
assert.deepEqual(S.mounted,[c1],'Una respuesta antigua alteró la lectura activa');
assert.equal(S.loadingNext,false,'La carga anterior no debe bloquear a la nueva vista');

// 2. Modo volumen sí permite un segundo capítulo dentro del mismo volumen.
S.openId=3;flow.isConnected=true;S.mounted=[c1];S.active=c1;mode='volume';
bodyFn=async()=>[{type:'paragraph',text:'Lectura'}];
api.observe();
await getMain().fire();
assert.deepEqual(mounts,['c2'],'Fallo al montar siguiente capítulo del mismo volumen');
assert.deepEqual(S.mounted.map(c=>c.id),['c1','c2']);
assert.deepEqual(prefetched,['c2']);
assert.deepEqual(tracked,['c2']);

// 3. Al final del volumen no se monta el primer capítulo del siguiente hasta cambiar a "all".
await getMain().fire();
assert.deepEqual(mounts,['c2'],'Modo volumen atravesó el límite a otro volumen');
mode='all';
await getMain().fire();
assert.deepEqual(mounts,['c2','c3'],'Modo continuo total debe permitir cruzar al volumen siguiente');
assert.equal(S.mounted.length,3,'No duplicar capítulos durante lectura continua');
await getMain().fire();
assert.equal(mounts.length,2,'No solicitar un capítulo inexistente');

// 4. El puente TTS solo navega al siguiente capítulo permitido.
const mockWin={};
const c={S,window:mockWin,$:()=>rd,nextOf:x=>adjacentChapter(chapters,x,1),
  effective:()=>({continuous:mode,autonext:true,autosecs:6}),getUser:()=>null,
  location:{pathname:'/leer/obra-qa/1'},go:path=>{c.lastGo=path}};
const fns=vm.runInNewContext('(()=>{' +
  cut('  function ttsInfo(chapterId){','  window.__obiReaderTTS =')+
  'return {ttsInfo,ttsNextChapter}})()',c);
assert.equal(fns.ttsInfo('c1').next.id,'c2');
assert.equal(fns.ttsInfo('c2').next.id,'c3');
assert.equal(fns.ttsInfo('c3').next,null);
assert.equal(fns.ttsNextChapter('c3',4),false,'TTS no debe llegar a contenido restringido');
assert.equal(fns.ttsNextChapter('c1',3),false,'TTS no debe saltarse capítulos');
assert.equal(fns.ttsNextChapter('c1',2),true);
assert.equal(c.lastGo,'/leer/obra-qa/2');
mode='volume';
assert.equal(fns.ttsInfo('c2').canContinue,false,'TTS no debe cruzar volúmenes en modo volumen');
assert.equal(fns.ttsInfo('c1').canContinue,true);
console.log('Fase 4 · observadores tardíos, continuidad por volumen, TTS y límite de capítulos: OK');

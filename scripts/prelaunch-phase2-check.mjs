import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { landing, bind } from '../src/prelaunch.js';
import { selectStudioWorks } from '../src/studio-works-utils.js';
import { createStudioWorkCard, createStudioWorksToolbar } from '../src/studio-works-view.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const oldDocument = globalThis.document, oldWindow = globalThis.window;
const oldSetInterval = globalThis.setInterval, oldClearInterval = globalThis.clearInterval;
const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pre = { series: {id:'s1',slug:'public-work',title:'Primer vistazo',team_slug:'equipo',team_name:'Equipo'}, volumes:[{id:'v1',num:1,published_at:'2027-01-01T12:00:00Z'}]};
try {
  globalThis.document = {getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}},addEventListener(){}};
  globalThis.window = {obiTZ:()=> 'America/Monterrey'};
  globalThis.setInterval = () => 1; globalThis.clearInterval=()=>{};
  let html = '', followAttrs = {}, messages=[], actions=[], uid={id:'me'}, hasFollow=false, followError=false;
  const follow = {isConnected:true,disabled:false,textContent:'',setAttribute(k,v){followAttrs[k]=v;}};
  const clock = {isConnected:true,dataset:{preTime:'2027-01-01T12:00:00Z'},textContent:''};
  const app = {innerHTML:'',querySelector:q=>q==='[data-pre-follow]'?follow:q==='[data-pre-time]'?clock:null,
    querySelectorAll:q=>q==='[data-pre-time]'?[clock]:[]};
  landing(pre,app,escape,x=>x);
  html=app.innerHTML;
  for(const tag of ['ui-series-page','ui-series-actions pre-actions','data-pre-follow','aria-pressed="false"','Primer vistazo','data-pre-rem']) assert.ok(html.includes(tag),'Landing: '+tag);
  assert.doesNotMatch(html,/href="\/leer\//,'No mostrar acceso a capítulos privados');
  const sb={from(table){
    assert.equal(table,'follows','El seguimiento solo escribe sobre follows');
    const state={filters:[],select(){return this;},eq(k,v){this.filters.push([k,v]);return this;},
      async maybeSingle(){return {data:hasFollow?{series_id:'s1'}:null,error:followError?new Error('fallo lectura'):null};},
      async upsert(row){actions.push(['upsert',row]);if(followError)return {error:new Error('fallo escritura')};hasFollow=true;return {error:null};},
      delete(){const filters=[];const q={error:null,eq(k,v){filters.push([k,v]);if(filters.length===2){actions.push(['delete',filters]);hasFollow=false;}return q;}};return q;}
    };
    return state;
  }};
  const toasts = text => messages.push(text);
  const go = path => actions.push(['login',path]);
  bind(pre,app,sb,()=>uid,go,toasts);
  for(let i=0;i<7;i++) await Promise.resolve();
  assert.equal(follow.disabled,false);
  assert.equal(followAttrs['aria-pressed'],'false');
  await follow.onclick(); assert.equal(hasFollow,true);
  assert.equal(followAttrs['aria-pressed'],'true');
  assert.deepEqual(actions[0],['upsert',{user_id:'me',series_id:'s1'}]);
  await follow.onclick(); assert.equal(hasFollow,false);
  assert.equal(followAttrs['aria-pressed'],'false');
  assert.ok(actions[1][1].some(([k,v])=>k==='user_id'&&v==='me'));
  uid=null;await follow.onclick();
  assert.deepEqual(actions[2],['login','/entrar']);
  uid={id:'me'};followError=true;
  await follow.onclick();assert.equal(followAttrs['aria-pressed'],'false','No anunciar éxito al fallar la escritura');
  assert.ok(messages.some(m=>m.includes('fallo escritura')));

  const pub = {id:'p',slug:'published',title:'Publicada',published:true,translation_status:'active',volumes:[]};
  const announced = {id:'s1',slug:'public-work',title:'Primer vistazo',published:false,translation_status:'active',volumes:[]};
  const draft = {id:'d',slug:'secret-draft',title:'Borrador secreto',published:false,translation_status:'active',volumes:[]};
  const ids = new Set(['s1']), rows=[pub,announced,draft];
  const choose = release => selectStudioWorks(rows,[],[],{release,prelaunchIds:ids}).map(r=>r.work.id);
  assert.deepEqual(choose('prelaunch'),['s1']);
  assert.deepEqual(choose('draft'),['d']);
  assert.deepEqual(choose('all').sort(),['d','p','s1']);
  const makeCard = createStudioWorkCard({chs:[],sched:[],prelaunchById:new Map([['s1',{series_id:'s1',slug:'public-work',at:'2027-01-01T12:00:00Z'}]]),featuredSeriesId:null,TLS:{active:['En traducción','#f2c230']},wcolor:()=> '#f2c230',esc:escape,media:x=>x,until:()=> 'en 1 mes',ago:()=> 'ayer',can:()=>false});
  const visible = makeCard(announced,{}),hidden = makeCard(draft,{});
  assert.match(visible,/En preestreno/);
  assert.match(visible,/data-pre-copy="public-work"/);
  assert.match(visible,/href="\/serie\/public-work"/);
  assert.doesNotMatch(hidden,/data-pre-copy|href="\/serie\/secret-draft"/,'No difundir un borrador no anunciado');
  assert.match(createStudioWorksToolbar({state:{q:'',attention:false},TLS:{active:['En traducción','#f2c230']},esc:escape,can:()=>false}),/s2-work-release/);
  assert.match(read('src/studio.js'),/loadPublicUpcoming\(sb\)/);
  assert.match(read('src/studio.js'),/r\.team_slug === T\.team\.slug/,'No mostrar preestrenos de equipos ajenos');
  assert.match(read('src/studio.js'),/prelaunchById\.has\(w\.id\)/,'Revalidación local antes de copiar');
  assert.match(read('src/share.js'),/\.ui-series-page \.ui-series-actions/,'Reutilizar menú unificado, no compartir borradores');
  assert.match(read('src/app.js'),/\/ui\.js\?v=61/);
  assert.match(read('src/app.js'),/\/studio\.js\?v=60/);
  assert.match(read('src/ui.js'),/\.\/prelaunch\.js\?v=4/);
  assert.match(read('src/index.html'),/\/app\.js\?v=51/);
  console.log('✓ Fase 2: seguimiento reversible, compartir público y Estudio sin enlaces a borradores.');
} finally {
  globalThis.document=oldDocument;globalThis.window=oldWindow;
  globalThis.setInterval=oldSetInterval;globalThis.clearInterval=oldClearInterval;
}

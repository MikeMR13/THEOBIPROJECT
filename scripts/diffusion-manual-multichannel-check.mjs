import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {manualTargets,manualChannelBatch,batchFeedback} from '../src/diffusion-manual-batch.js';

const c=[
 {id:'discord-A',provider:'discord',label:'Noticias',status:'active'},
 {id:'telegram-B',provider:'telegram',label:'General',status:'active'},
 {id:'telegram-C',provider:'telegram',label:'Privado',status:'pending'}
];
assert.equal(manualTargets(c,['discord-A','telegram-B']).length,2);
assert.deepEqual(manualTargets(c,['telegram-B','discord-A']).map(x=>x.provider),['telegram','discord']);
for(const selection of [[],['discord-A','discord-A'],['telegram-C'],['other'],
 Array.from({length:9},(_,i)=>'id'+i)]){
 assert.throws(()=>manualTargets(c,selection),/canales|activo/);
}
const targets=manualTargets(c,['discord-A','telegram-B']);
let calls=[];
const results=await manualChannelBatch(targets,async channel=>{
 calls.push(channel.id);
 if(channel.provider==='discord')return {status:'sent'};
 throw Error('Uncertain HTTP response: no automatic retry');
});
assert.deepEqual(calls,['discord-A','telegram-B']);
assert.deepEqual(results.map(x=>x.status),['sent','uncertain']);
assert.match(batchFeedback(results),/Discord · Noticias — Enviado/);
assert.match(batchFeedback(results),/Telegram · General — Sin confirmación/);
assert.match(batchFeedback(results),/NO se reintentan automáticamente/);
assert.equal((await manualChannelBatch(targets,async channel=>
 channel.provider==='discord'?{status:'scheduled'}:{status:'already'})).length,2);
assert.deepEqual((await manualChannelBatch(targets,async()=>undefined)).map(x=>x.status),
 ['uncertain','uncertain']);
const ui=readFileSync(new URL('../src/diffusion-panel.js',import.meta.url),'utf8');
assert.match(ui,/data-ann-target/,'El formulario debe mostrar las casillas multicanal');
assert.match(ui,/\[data-ann-target\]:checked/,'La selección debe recoger los destinos marcados');
assert.match(ui,/diffusion_'\+target\.provider\+'_announcement_preview/,'Vista previa por cada destino');
assert.match(ui,/previews\.some\(/,'Rechazar portadas o fichas inconsistentes');
assert.match(ui,/manualChannelBatch\(pending\.targets,async target=>/,'Enviar y programar independientemente desde destinos confirmados');
assert.match(ui,/target\.provider==='telegram'\?'diffusion-telegram':'diffusion-announcement'/);
assert.match(ui,/connection_id:target\.id/);
assert.match(ui,/id="df-ann-confirm-accept"/);
assert.match(ui,/dialog\.showModal\(\)/);
assert.match(ui,/id="df-ann-result-summary"/);
assert.doesNotMatch(ui.slice(ui.indexOf("root.querySelector('#df-ann-send')"),ui.indexOf("root.querySelector('#df-telegram-form')")),/if\(!confirm\(/,'Enviar no debe depender de diálogos nativos');
assert.match(ui,/batchFeedback\(results/);
assert.match(ui,/if\(pending\.scheduledId&&target\.id===pending\.primaryConnection\)/,'Mantener compatibilidad con agenda existente');
assert.ok(!ui.includes('id="df-ann-conn"'),'No mantener selector antiguo único');
assert.doesNotMatch(ui,/Promise\.all\(targets\.map\(async target=>\{\s*const \{data,error\}=await sb\.functions\.invoke/,'El envío inmediato no se dispara concurrentemente sin supervisión');
console.log('Difusión Anunciar multicanal: 2 destinos, dedupe delegado, estados independientes, sin reintentos — PASS');

// Contrato de embudo editorial: SOLO razones agregadas, sin inferir conversiones.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPrelaunchInterestFunnel,interestPerHundred,renderPrelaunchInterestFunnel} from '../src/prelaunch-funnel.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ids=new Set(['a','b']);
const works=[
 {id:'a',slug:'primera',title:'Primera novela'},
 {id:'b',slug:'segunda',title:'Segunda novela'},
 {id:'private',slug:'no-publicar',title:'Borrador secreto'}
];
const metrics={available:true,counts:new Map([
 ['a',{followers:100,reminders:10}],
 ['b',{followers:20,reminders:25}],
 ['private',{followers:999,reminders:999}]
])};
const views={available:true,counts:new Map([['a',500],['b',100],['private',999]])};
const result=buildPrelaunchInterestFunnel(ids,metrics,views,works);
assert.equal(result.status,'ready');
assert.deepEqual(result.totals,{opens:600,followers:120,reminders:35});
assert.equal(result.rows.length,2);
assert.deepEqual(result.rows.map(r=>r.id),['a','b']);
assert.equal(interestPerHundred(120,600),'20');
assert.equal(interestPerHundred(35,600),'5.8');
assert.equal(interestPerHundred(25,0),'—');
assert.equal(interestPerHundred(-1,100),'—');
assert.equal(interestPerHundred(120,100),'120','Razones pueden superar 100; no llamarlas conversión');
const html=renderPrelaunchInterestFunnel(ids,metrics,views,works);
for(const mark of [
 'Embudo de interés previo al estreno',
 'Comparativa por obra',
 'Aperturas · últimos 30 días',
 'Seguimientos actuales',
 'Recordatorios pendientes',
 'Seguimientos / 100 aperturas',
 'Recordatorios / 100 aperturas',
 '20 seguimientos y 5,8 recordatorios por cada 100 aperturas',
 'ni conversiones de personas',
 'no tienen necesariamente el mismo periodo',
 'role="region"',
 'tabindex="0"',
 'aria-hidden="true"',
 '/estudio/obra/primera',
 '/estudio/obra/segunda'
])assert.ok(html.includes(mark),'Expected accessible aggregate funnel marker: '+mark);
assert.ok(!html.includes('Borrador secreto') && !html.includes('no-publicar') && !html.includes('999'),
 'No filtrar obras privadas o contadores de otra obra');
const tr=renderPrelaunchInterestFunnel(new Set(['a']),{available:true,counts:metrics.counts},{available:true,counts:new Map([['a',0]])},works);
assert.match(tr,/Sin aperturas contabilizadas; no se calculan proporciones/);
assert.match(tr,/>—<\/td>/);
assert.ok(!tr.includes('Infinity') && !tr.includes('NaN'));
const blocked=renderPrelaunchInterestFunnel(ids,{available:false,counts:new Map()},views,works);
assert.match(blocked,/No se pudieron verificar todos los datos/);
assert.doesNotMatch(blocked,/600|120|35|500/);
assert.equal(buildPrelaunchInterestFunnel(ids,metrics,{available:true,counts:new Map([['a',5]])},works).status,'unavailable');
assert.equal(buildPrelaunchInterestFunnel(ids,metrics,views,works.slice(0,1)).status,'unavailable');
assert.equal(buildPrelaunchInterestFunnel(new Set(),metrics,views,works).status,'empty');
assert.equal(renderPrelaunchInterestFunnel(new Set(),metrics,views,works),'');
const unsafe=[{id:'a',slug:'foo" onclick="evil',title:'<img src=x onerror=alert(1)>'},{id:'b',slug:'fine',title:'B'}];
const safe=renderPrelaunchInterestFunnel(ids,metrics,views,unsafe);
assert.ok(!safe.includes('<img') && !safe.includes('onclick='));
assert.match(safe,/&lt;img src=x onerror=alert\(1\)&gt;/);
assert.match(safe,/foo%22%20onclick%3D%22evil/);
assert.doesNotMatch(read('src/prelaunch-funnel.js'),/\.rpc\(|localStorage|sessionStorage|navigator\.sendBeacon|user_id|session_id|ip_address|\.from\(/,'Sin nuevas consultas, almacenamiento ni identificadores');
const studio=read('src/studio.js');
assert.match(studio,/renderPrelaunchInterestFunnel\(prelaunchIds, prelaunchMetrics, prelaunchViews, list\)/);
assert.match(studio,/T\.team\?\.id !== metricsTeamId/);
assert.match(studio,/prelaunchById\.has\(w\.id\)/);
assert.match(studio,/\.\/prelaunch-funnel\.js\?v=1/);
assert.match(studio,/studio-obras\.css\?v=7/);
assert.match(read('src/app.js'),/studio\.js\?v=60/);
assert.match(read('src/index.html'),/app\.js\?v=51/);
assert.match(read('scripts/studio-browser-e2e.mjs'),/prelaunch-funnel\.js/);
const css=read('src/studio-obras.css');
for(const mark of ['s2-pre-funnel-stages','s2-pre-funnel-table-wrap','overflow-x:auto','@media(max-width:720px)','focus-visible'])
 assert.ok(css.includes(mark),'CSS responsive / teclado: '+mark);
console.log('✓ Embudo editorial: razones agregadas, no conversiones, comparación privada, datos faltantes y responsive.');

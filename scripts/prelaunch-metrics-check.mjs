// Contratos de métricas de preestreno: identidad del equipo y agregados sin PII.
// Ejecución local / GitHub Actions sin conectarse a Supabase.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadTeamPrelaunchMetrics,summarizePrelaunchMetrics} from '../src/prelaunch-metrics.js';
import {createPrelaunchMetricsPanel,createStudioWorkCard} from '../src/studio-works-view.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('sql/prelaunch-editorial-metrics.sql');
assert.equal(sql,read('supabase/migrations/20261030191500_prelaunch_team_editorial_metrics.sql'));
for(const rex of [
  /security definer/,
  /set search_path = ''/,
  /auth\.uid\(\) is null or p_team is null or not private\.team_can\(p_team, 'view'\)/,
  /raise exception 'forbidden_prelaunch_metrics' using errcode = '42501'/,
  /s\.team_id = p_team/,
  /private\.prelaunch_public_series\(s\.id\)/,
  /v\.announce_prelaunch is true/,/v\.status = 'scheduled'/,
  /v\.deleted_at is null/,/v\.access = 'public'/,
  /v\.published_at > now\(\)/,
  /r\.kind = 'volp'/,/r\.sent_at is null/,
  /v\.published_at = r\.at/,
  /revoke all on function public\.prelaunch_team_metrics\(uuid\) from public, anon, authenticated/,
  /grant execute on function public\.prelaunch_team_metrics\(uuid\) to authenticated/
]) assert.match(sql,rex,'SQL team-only, future public announcements');
assert.doesNotMatch(sql,/create table|alter table|cron\.schedule|user_id\s*(,|as)|select \* from public\.follows/i,'No new tracking or personal data');
let calls=[];
const ids=new Set(['a','b']);
const server={rpc(name,args){calls.push([name,args]);return Promise.resolve({data:[
 {series_id:'a',followers:12,pending_reminders:4},
 {series_id:'b',followers:'3',pending_reminders:'2'},
 {series_id:'private-other-team',followers:999,pending_reminders:999}
],error:null});}};
const ok=await loadTeamPrelaunchMetrics(server,'team-a',ids);
assert.equal(ok.available,true);
assert.deepEqual(calls,[['prelaunch_team_metrics',{p_team:'team-a'}]]);
assert.deepEqual([...ok.counts.keys()],['a','b']);
assert.deepEqual(summarizePrelaunchMetrics(ids,ok),{series:2,followers:15,reminders:6});
const panel=createPrelaunchMetricsPanel(ids,ok);
assert.match(panel,/Obras anunciadas/);
assert.match(panel,/Seguimientos registrados/);
assert.match(panel,/Recordatorios pendientes/);
assert.match(panel,/15/);
assert.match(panel,/no visitantes únicos/);
assert.doesNotMatch(panel,/999|private-other-team|user_id/);
assert.equal(createPrelaunchMetricsPanel(new Set(),ok),'');
const work={id:'a',slug:'ejemplo',title:'Obra futura',published:false,translation_status:'active',volumes:[],cover_path:null};
const card=createStudioWorkCard({
 chs:[],sched:[],prelaunchById:new Map([['a',{series_id:'a',slug:'ejemplo',at:'2027-01-01T12:00:00Z'}]]),
 prelaunchMetrics:ok,featuredSeriesId:null,TLS:{active:['En traducción','#f2c230']},
 wcolor:()=>'#ffcc00',esc:v=>String(v??''),media:v=>v,until:()=> 'pronto',
 ago:()=> 'ayer',can:()=>false
})(work,{});
assert.match(card,/SIGUEN ESTA OBRA/);
assert.match(card,/AVISOS DE ESTRENO/);
assert.match(card,/12/);
assert.match(card,/4/);
const rejected=await loadTeamPrelaunchMetrics({rpc:()=>({data:null,error:{message:'forbidden'}})},'team-a',ids);
assert.equal(rejected.available,false);assert.equal(rejected.counts.size,0);
assert.match(createPrelaunchMetricsPanel(ids,rejected),/No se pudieron verificar los totales/);
assert.doesNotMatch(createPrelaunchMetricsPanel(ids,rejected),/>0<\/dd>/);
const missing=await loadTeamPrelaunchMetrics({rpc:()=>Promise.resolve({data:[{series_id:'a',followers:0,pending_reminders:0}],error:null})},'team-a',ids);
assert.equal(missing.available,false,'No inventar 0 para una obra que ya no está autorizada');
const negative=await loadTeamPrelaunchMetrics({rpc:()=>Promise.resolve({data:[
 {series_id:'a',followers:-1,pending_reminders:0},{series_id:'b',followers:0,pending_reminders:0}
],error:null})},'team-a',ids);
assert.equal(negative.available,false);
const unloaded=await loadTeamPrelaunchMetrics(null,'team-a',ids);
assert.equal(unloaded.available,false);
let skipped=false;
const empty=await loadTeamPrelaunchMetrics({rpc(){skipped=true;throw Error('unexpected');}},'team-a',new Set());
assert.equal(empty.available,true);assert.equal(empty.counts.size,0);assert.equal(skipped,false);
const studio=read('src/studio.js');
assert.match(studio,/loadTeamPrelaunchMetrics\(sb, metricsTeamId, prelaunchIds\)/);
assert.match(studio,/T\.team\?\.id !== metricsTeamId/);
assert.match(studio,/createPrelaunchMetricsPanel\(prelaunchIds, prelaunchMetrics, prelaunchViews\)/);
assert.match(studio,/studio-obras\.css\?v=7/);
assert.match(read('src/app.js'),/studio\.js\?v=64/);
assert.match(read('src/index.html'),/app\.js\?v=55/);
assert.match(read('scripts/studio-browser-e2e.mjs'),/prelaunch-metrics\.js/);
console.log('✓ Métricas de preestreno: solo agregados autorizados, errores cerrados y vistas móviles compatibles.');

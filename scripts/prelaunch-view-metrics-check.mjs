// Aperturas agregadas de primeros vistazos: privacidad, límites, UI y errores.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordPrelaunchView,loadTeamPrelaunchViews} from '../src/prelaunch-views.js';
import {createPrelaunchMetricsPanel,createStudioWorkCard} from '../src/studio-works-view.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/prelaunch-view-metrics.sql');
assert.equal(sql,read('supabase/migrations/20261030203000_prelaunch_aggregated_view_metrics.sql'));
for(const p of [
 /create table if not exists private\.prelaunch_view_daily/,
 /create table if not exists private\.prelaunch_view_limits/,
 /primary key \(day, series_id\)/,
 /revoke all on table private\.prelaunch_view_daily from public, anon, authenticated/,
 /returns boolean language plpgsql security definer/,
 /p_slug !~ /,
 /s\.published is false/,
 /private\.prelaunch_public_series\(s\.id\)/,
 /v\.announce_prelaunch is true/,
 /v\.status = 'scheduled'/,
 /v\.published_at > v_now/,
 /lim\.accepted < 60/,
 /lim\.accepted < 2500/,
 /v\.opens < 500/,
 /create or replace function public\.prelaunch_team_view_metrics\(p_team uuid\)/,
 /not private\.team_can\(p_team, 'view'\)/,
 /and d\.day >= .*::date - 29/,
 /revoke all on function public\.prelaunch_team_view_metrics\(uuid\) from public, anon, authenticated/,
 /grant execute on function public\.prelaunch_team_view_metrics\(uuid\) to authenticated/,
 /grant execute on function public\.prelaunch_view_record\(text\) to anon, authenticated/,
 /delete from private\.prelaunch_view_daily/,
 /delete from private\.prelaunch_view_limits/,
 /delete from private\.carousel_metrics_daily/,
 /delete from private\.carousel_metric_limits/
]) assert.match(sql,p,'SQL must enforce bounded, non-personal metrics');
const sqlStatements=sql.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n');
assert.doesNotMatch(sqlStatements,/ip_address|session_id|visitor_id|user_agent|http_referer|create extension|cron\.schedule|create trigger/i,
 'Prohibido registrar identificadores o programar tareas nuevas');
const records=[];
const fake={rpc:(name,params)=>{records.push({name,params});return Promise.resolve({data:true,error:null});}};
const storageMap=new Map();
const storage={getItem:k=>storageMap.get(k),setItem:(k,v)=>storageMap.set(k,v)};
const pre={series:{slug:'metricstest_volume_1'},volumes:[{id:'v'}]};
assert.equal(await recordPrelaunchView(fake,pre,{storage,now:Date.parse('2026-10-30T15:30:00Z'),document:{hidden:false}}),true);
assert.equal(await recordPrelaunchView(fake,pre,{storage,now:Date.parse('2026-10-30T15:30:00Z'),document:{hidden:false}}),false);
assert.deepEqual(records,[{name:'prelaunch_view_record',params:{p_slug:'metricstest_volume_1'}}]);
assert.equal(storageMap.size,1);
assert.ok([...storageMap.keys()][0].includes('2026-10-30:metricstest_volume_1'));
assert.equal(await recordPrelaunchView(fake,{series:{slug:'secret/path'},volumes:[{}]},{storage}),false);
assert.equal(await recordPrelaunchView(fake,{series:{slug:'test-hidden'},volumes:[{}]},{document:{hidden:true},storage}),false);
assert.equal(await recordPrelaunchView(fake,{series:{slug:'test-no-volumes'},volumes:[]},{storage}),false);
assert.equal(records.length,1,'No registrar anuncios no visibles o no autorizables');
const refuser={rpc:()=>Promise.resolve({data:false,error:null})};
assert.equal(await recordPrelaunchView(refuser,{series:{slug:'noapproved_launch'},volumes:[{}]},{storage}),false);
const viewsIds=new Set(['a','b']);
const api={rpc:(name,params)=>{
 assert.equal(name,'prelaunch_team_view_metrics');
 assert.deepEqual(params,{p_team:'equipo-a'});
 return Promise.resolve({data:[
 {series_id:'a',view_opens_30d:'9'},
 {series_id:'b',view_opens_30d:0},
 {series_id:'other-private-work',view_opens_30d:900}
 ],error:null});
}};
const views=await loadTeamPrelaunchViews(api,'equipo-a',viewsIds);
assert.equal(views.available,true);
assert.deepEqual([...views.counts.entries()],[['a',9],['b',0]]);
const metrics={available:true,counts:new Map([['a',{followers:3,reminders:1}],['b',{followers:1,reminders:0}]])};
const panel=createPrelaunchMetricsPanel(viewsIds,metrics,views);
assert.match(panel,/Aperturas · 30 días/);
assert.match(panel,/>9<\/dd>/);
assert.match(panel,/no visitantes únicos/);
assert.doesNotMatch(panel,/other-private-work|900/);
const card=createStudioWorkCard({
 chs:[],sched:[],prelaunchById:new Map([['b',{series_id:'b',at:'2027-01-01T12:00:00Z'}]]),
 prelaunchMetrics:metrics,prelaunchViews:views,featuredSeriesId:null,
 TLS:{active:['Activo','#fff']},wcolor:()=>'#fff',
 esc:x=>String(x??''),media:x=>x,until:()=> 'próximo',ago:()=> 'hoy',can:()=>false
})({id:'b',slug:'ob',title:'Obra',published:false,volumes:[],translation_status:'active'},{});
assert.match(card,/APERTURAS · 30 DÍAS<\/dt><dd>0<\/dd>/);
const fail=await loadTeamPrelaunchViews({rpc:()=>Promise.resolve({data:null,error:{message:'forbidden'}})},'equipo-a',viewsIds);
assert.equal(fail.available,false);
const incomplete=await loadTeamPrelaunchViews({rpc:()=>Promise.resolve({data:[{series_id:'a',view_opens_30d:0}],error:null})},'equipo-a',viewsIds);
assert.equal(incomplete.available,false);
const invalid=await loadTeamPrelaunchViews({rpc:()=>Promise.resolve({data:[{series_id:'a',view_opens_30d:-1},{series_id:'b',view_opens_30d:0}],error:null})},'equipo-a',viewsIds);
assert.equal(invalid.available,false);
assert.match(createPrelaunchMetricsPanel(viewsIds,metrics,fail),/No se pudieron verificar las aperturas/);
assert.equal(createPrelaunchMetricsPanel(new Set(),metrics,views),'');
const st=read('src/studio.js'),prejs=read('src/prelaunch.js');
assert.match(st,/loadTeamPrelaunchViews\(sb, metricsTeamId, prelaunchIds\)/);
assert.match(st,/createPrelaunchMetricsPanel\(prelaunchIds, prelaunchMetrics, prelaunchViews\)/);
assert.match(prejs,/void recordPrelaunchView\(sb,pre\)/);
assert.match(read('src/ui.js'),/prelaunch\.js\?v=4/);
assert.match(read('src/app.js'),/ui\.js\?v=61/);
assert.match(read('src/index.html'),/app\.js\?v=51/);
assert.match(read('src/studio-obras.css'),/repeat\(4,minmax\(0,1fr\)\)/);
console.log('✓ Aperturas de primer vistazo: agregación limitada, sin identidades, ventanas de 30/90 días y errores cerrados.');

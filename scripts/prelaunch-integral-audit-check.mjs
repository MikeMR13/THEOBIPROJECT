// Auditoría final: contratos de estreno, privacy-by-default y recordatorios opt-in.
// No llama servicios externos, no requiere credenciales ni modifica datos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('sql/prelaunch-integral-audit.sql');
assert.equal(sql,read('supabase/migrations/20261030183000_prelaunch_integral_audit_notifications_cleanup.sql'),'La migración debe coincidir con su fuente revisable');
const s=read('sql/prelaunch-phase0-security.sql');
const ui=read('src/ui.js'),studio=read('src/studio.js'),pre=read('src/prelaunch.js'),reader=read('src/reader.js');
const sitemap=read('api/sitemap.js'),agenda=read('src/agenda.js'),app=read('src/app.js'),team=read('src/teampage.js');
function section(start,end){const a=sql.indexOf(start);assert.ok(a>=0,'Falta SQL: '+start);const b=end?sql.indexOf(end,a+start.length):-1;return sql.slice(a,b<0?undefined:b);}
const sync=section('create or replace function private.sync_prelaunch_reminders','create or replace function private.clear_published_prelaunch');
for(const pattern of [
  /old\.status <> 'scheduled'/,/old\.announce_prelaunch is not true/,
  /old\.published_at is null/,/r\.kind = 'volp'/,/r\.sent_at is null/,
  /new\.status not in \('scheduled','published'\)/,
  /with removed as \(\s*delete from public\.reminders/,
  /join public\.profiles p on p\.id = rem\.user_id/,
  /insert into public\.notifications\(user_id,kind,body,link\)/,
  /new\.status = 'scheduled' and new\.announce_prelaunch is true/,
  /new\.published_at > now\(\)/,
  /private\.prelaunch_public_series\(old\.series_id\)/,
  /from public\.reminders r\s*join public\.profiles p on p\.id = r\.user_id/,
  /case when new\.status = 'published' then now\(\) else new\.published_at end/,
  /where d\.user_id = r\.user_id and d\.series_id = r\.series_id/,
  /update public\.reminders r set at = next_at/
])assert.match(sync,pattern,'Control de recordatorios/reprogramación');
assert.doesNotMatch(sync,/from public\.team_follows|from public\.follows|http_post|net\.http/i,'No crear notificaciones masivas ni envíos externos');
assert.match(sync,/pg_catalog\.jsonb_build_object\('href','\/calendario'\)/);
const cleanup=section('create or replace function private.clear_published_prelaunch');
for(const pattern of [
  /if new\.status = 'published' and new\.announce_prelaunch is true/,
  /new\.announce_prelaunch := false/,
  /before update of status on public\.volumes/,
  /where status = 'published' and announce_prelaunch is true/
])assert.match(cleanup,pattern,'Limpiar solo el estado publicado');
assert.doesNotMatch(cleanup,/update public\.chapters|update public\.series|delete from public\.reminders/,'La limpieza nunca altera la publicación');
assert.match(s,/private\.prelaunch_public_series/);
assert.match(studio,/rpc\('schedule_prelaunch_volume'/);
assert.match(studio,/rpc\('unschedule_volume'/);
assert.match(ui,/prelaunch_series/);
assert.match(reader,/const blockedByPrelaunch = !isPubliclyReadableChapter/);
assert.match(agenda,/prelaunch_calendar/);
assert.match(sitemap,/getUpcomingPrelaunch/);
assert.match(pre,/data-pre-follow/);
assert.match(pre,/data-pre-rem/);
assert.match(app,/\.from\('notifications'\)/);
assert.match(team,/loadPublicUpcoming/);
assert.match(read('src/studio-works-view.js'),/data-pre-copy/);
for(const path of ['scripts/prelaunch-check.mjs','scripts/prelaunch-access-check.mjs',
 'scripts/prelaunch-phase0-check.mjs','scripts/prelaunch-phase1-check.mjs',
 'scripts/prelaunch-phase2-check.mjs','scripts/prelaunch-phase3-check.mjs'])assert.ok(read(path).length>100,path);
console.log('✓ Auditoría integral: programación, promoción, lectura bloqueada, SEO y avisos opt-in; limpieza acotada y auditable.');

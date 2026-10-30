import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sql = read('sql/prelaunch-phase0-security.sql');
const studio = read('src/studio.js');
const app = read('src/app.js');

const section = (start, end) => {
  const index = sql.toLowerCase().indexOf(start.toLowerCase());
  assert.ok(index >= 0, 'SQL missing: ' + start);
  const next = end ? sql.toLowerCase().indexOf(end.toLowerCase(), index + start.length) : -1;
  return sql.slice(index, next < 0 ? undefined : next);
};
const eligibility = section('create or replace function private.prelaunch_public_series', 'create or replace function public.prelaunch_series');
for (const rule of [
  /s\.access = 'public'/, /s\.adult is false/, /s\.archived_at is null/,
  /s\.translation_status not in \('abandoned','withdrawn'\)/,
  /t\.status = 'Activo'/, /revoke all on function private\.prelaunch_public_series/
]) assert.match(eligibility, rule, 'Required public-eligibility restriction');

for (const name of ['prelaunch_series', 'prelaunch_calendar', 'public_prelaunch_social']) {
  const start = 'create or replace function public.' + name;
  const i = sql.toLowerCase().indexOf(start);
  assert.ok(i >= 0, name + ' RPC must be defined');
  const end = sql.toLowerCase().indexOf('$body$;', i);
  assert.ok(end > i, name + ' RPC body terminator');
  const body = sql.slice(i, end);
  assert.match(body, /private\.prelaunch_public_series\(s\.id\)/, name + ' must use shared eligibility');
  assert.match(body, /v\.access = 'public'/, name + ' must not show gated volumes');
  assert.match(body, /v\.status = 'scheduled'/, name + ' must only show scheduled volumes');
  assert.match(body, /v\.announce_prelaunch is true/, name + ' requires opt-in');
  assert.match(body, /v\.published_at > now\(\)/, name + ' must be future-only');
  assert.doesNotMatch(body, /from public\.chapters\b/i, name + ' must not return chapters');
}
assert.match(sql, /s\.published is false/, 'SEO prelaunch only for unpublished works');
const cancel = section('create or replace function public.unschedule_volume', 'create or replace function private.guard_publish');
for (const restriction of [
  /auth\.uid\(\) is null/, /for update/, /private\.team_can\(t,'publish'\)/,
  /private\.team_can\(t,'schedule'\)/, /v\.status <> 'scheduled'/,
  /set status='draft', published_at=null, announce_prelaunch=false/,
  /revoke all on function public\.unschedule_volume\(uuid\) from public, anon/,
  /grant execute on function public\.unschedule_volume\(uuid\) to authenticated, service_role/
]) assert.match(cancel, restriction, 'Permission-checked cancellation');
assert.doesNotMatch(cancel, /update public\.chapters/i, 'Do not modify chapter dates when unscheduling');
const guard = section('create or replace function private.guard_publish', 'revoke all on function public.prelaunch_series');
for (const restriction of [
  /old\.status = 'scheduled'/, /new\.status = 'scheduled'/,
  /new\.published_at is distinct from old\.published_at/,
  /new\.announce_prelaunch is distinct from old\.announce_prelaunch/,
  /forbidden_unschedule/, /forbidden_reschedule/,
  /before update of status, published_at, announce_prelaunch/
]) assert.match(guard, restriction, 'Reject direct schedule edits by editor-only roles');
assert.match(studio, /rpc\('unschedule_volume', \{ p_volume: b\.dataset\.unsch \}\)/);
assert.match(studio, /can\('publish'\) \|\| can\('schedule'\)/);
assert.doesNotMatch(studio, /\.update\(\{ status: 'draft', published_at: null, announce_prelaunch: false \}\)/);
assert.match(app, /studio\.js\?v=55/, 'Invalidate stale Studio entry module');
console.log('✓ Phase 0: shared public eligibility, adult restrictions, grants and cancellation permissions.');

// Agenda 4A: contratos estáticos sin credenciales ni publicaciones reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
const sql=readFileSync('supabase/migrations/20261026045625_diffusion_phase4a_manual_schedule_20261025.sql','utf8');
const ui=readFileSync('src/diffusion-panel.js','utf8');
const qa=readFileSync('supabase/tests/diffusion_phase4a_schedule_rls.sql','utf8');
assert.ok(transformSync(ui,{loader:'js',format:'esm'}).code.includes('renderDiffusionPanel'));
for(const term of ['diffusion_schedule_create','diffusion_schedule_cancel','diffusion_schedule_reschedule','diffusion_schedule_finalize',
 'diffusion_scope_ok(conn.team_id,\'diffusion_schedule\')','diffusion_scope_ok(conn.team_id,\'diffusion_publish\')',
 'private.diffusion_manual_discord_data','private.diffusion_manual_telegram_data',
 'already_scheduled','already_announced','not_public','not_confirmed',"status='sent'"])
 assert.ok(sql.includes(term),'SQL no cumple contrato: '+term);
assert.match(sql,/create policy diffusion_schedule_read/);
assert.match(sql,/enable row level security/);
assert.match(sql,/create unique index diffusion_schedule_one_pending_per_target/);
assert.match(sql,/revoke all on function public\.diffusion_schedule_create/);
assert.match(sql,/grant execute on function public\.diffusion_schedule_create/);
assert.match(sql,/p_at<now\(\)\+interval '2 minutes'/);
assert.match(sql,/p_at>now\(\)\+interval '90 days'/);
assert.match(sql,/j\.status='sent'/);
assert.match(ui,/id="df-ann-schedule-at"/);
assert.match(ui,/id="df-ann-schedule"/);
assert.match(ui,/data-schedule-cancel/);
assert.match(ui,/data-schedule-save/);
assert.match(ui,/data-schedule-prepare/);
assert.match(ui,/data-schedule-finalize/);
assert.match(ui,/diffusion_schedule_finalize/);
assert.match(ui,/La agenda NO envía mensajes por sí sola cuando eliges modo manual|Ninguna regla se activa sin confirmación/);
assert.match(ui,/Fecha cumplida: pendiente de envío manual/);
assert.match(ui,/p_at:pending\.at/); assert.match(ui,/at:new Date\(whenMs\)\.toISOString\(\)/);
assert.doesNotMatch(sql,/cron\.schedule|net\.http_post|http_post|http_get/);
assert.doesNotMatch(ui,/setTimeout\(/); assert.match(ui,/tab!=='calendario'/); assert.match(ui,/delivery_mode==='automatic'/);
assert.match(qa,/Fuga de planes entre equipos/);
assert.match(qa,/Marcó entrega sin envío confirmado/);
console.log('Difusión agenda 4A: permisos, fechas, cancelación, estado y manualidad PASS');

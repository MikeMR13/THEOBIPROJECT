import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/diffusion-panel.js'),sql=read('sql/diffusion-4c-event-rules-candidate.sql');
for(const phrase of [
  "data-rule-activate","data-rule-pause","data-rule-destination",
  "Activar regla","Pausar regla","diffusion_rule_toggle",
  "volume.public","chapter.public","p_enabled:activate",
  "enabled,connection_id,enabled_at",
]) assert.ok(ui.includes(phrase),'Falta un control visible o un vínculo de regla: '+phrase);
assert.match(ui, /event_not_automatable_yet/,'No alertan los eventos no automatizables');
assert.match(ui, /value="automatic"/,'Modalidad automática desaparecida');
assert.match(ui, /value="team_review"/,'Modalidad revisión desaparecida');
assert.ok(!ui.includes("Guardar regla inactiva"),'Interfaz mantiene botón confuso');
for(const phrase of [
  "event_not_automatable_yet", "p_team uuid,p_id uuid,p_enabled boolean",
  "enabled=false", "status='cancelled'","for each row",
  "diffusion_rule_occurrences", "create trigger diffusion_4c_volume_published",
  "create trigger diffusion_4c_chapter_published","tg_op='UPDATE'",
  "if new.deleted_at is not null","return new;"
]) assert.ok(sql.toLowerCase().includes(phrase.toLowerCase()),'Falta control SQL: '+phrase);
assert.match(sql,/where rule\.enabled and rule\.enabled_at<=now\(\)/,'Solo próximas publicaciones');
assert.match(sql,/r\.team_id is null or r\.team_id=se\.team_id/,'Ámbito por equipo');
assert.match(sql,/diffusion_scope_ok\(p_team,'diffusion_manage'\)/,'Permiso de gestión');
assert.match(sql,/diffusion_scope_ok\(p_team,'diffusion_publish'\)/,'Permiso de publicación');
assert.match(sql,/diffusion_scope_ok\(p_team,'diffusion_schedule'\)/,'Permiso de calendario');
console.log('OK: Activar / Pausar, destinos, autorizaciones, dedupe, revisión y no retropublicaciones');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=get('src/diffusion-panel.js'), sql=get('sql/diffusion-prelaunch-rule-candidate.sql');
for(const token of ["prelaunch.announced","Nueva obra anunciada","data-rule-activate",
  "prelaunch.announced'].includes","value=\"prelaunch.announced\""]) {
 assert.ok(ui.includes(token),'Falta regla visible o activación: '+token);
}
assert.match(sql,/new\.announce_prelaunch is distinct from true/,'Solo opt-in positivo');
assert.match(sql,/old\.announce_prelaunch is true/,'No duplicar actualizaciones');
assert.match(sql,/se\.published is distinct from false/,'No enviar obras ya publicadas');
assert.match(sql,/se\.adult is true/,'Limitar adelantos adultos no comprobados');
assert.match(sql,/private\.diffusion_rule_occurrences/,'Registrar dedupe');
assert.match(sql,/select \* into vo from public\.volumes/,'Revalidación de volumen al envío');
assert.match(sql,/prelaunch_volume_id/,'Vincular anuncio a consentimiento real');
assert.match(sql,/then reason:='prelaunch_unavailable'/,'Bloquear contenido cancelado o vencido');
assert.match(sql,/se\.title\|\|' · Próximo estreno'/,'Título diferenciado');
assert.doesNotMatch(sql,/from public\.chapters/,'No consultar ni filtrar capítulos borradores');
assert.match(sql,/https:\/\/elobidellector\.com\//,'URL segura de la ficha');
assert.ok(sql.includes('token')===false,'No guardar secretos en migraciones');
console.log('OK: Nueva obra anunciada opt-in, deduplicación, privacidad y URL del primer vistazo');

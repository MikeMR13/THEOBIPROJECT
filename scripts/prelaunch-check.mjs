import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const studio = read('src/studio.js');
const agenda = read('src/agenda.js');
const ui = read('src/ui.js');
const preview = read('src/prelaunch.js');
const sql = read('sql/prelaunch-mode.sql');

for (const file of ['src/ui.js','src/studio.js','src/agenda.js','src/prelaunch.js']) {
  const result = spawnSync(process.execPath, ['--check', new URL('../'+file, import.meta.url).pathname], { encoding:'utf8' });
  assert.equal(result.status, 0, file+': '+result.stderr);
}
assert.match(sql, /announce_prelaunch boolean not null default false/i, 'preestreno debe ser opt-in');
assert.match(sql, /public\.prelaunch_series\(p_slug text\)/, 'RPC de ficha');
assert.match(sql, /public\.prelaunch_calendar\(/, 'RPC de calendario');
assert.match(sql, /public\.schedule_prelaunch_volume\(/, 'RPC de programación');
assert.match(sql, /private\.promote_prelaunch_series\(/, 'promoción al estreno');
assert.match(sql, /private\.sync_prelaunch_reminders\(/, 'sincronía de recordatorios');
assert.match(sql, /revoke execute on function public\.prelaunch_series/, 'cerrar permisos por defecto');
assert.match(sql, /where v\.announce_prelaunch is true/, 'filtrar solo anuncios autorizados');
const jsonPreview = sql.split('create or replace function public.prelaunch_series')[1].split('create or replace function public.prelaunch_calendar')[0];
assert.doesNotMatch(jsonPreview, /from public\.chapters\b/i, 'No exponer datos de capítulos en preestreno');
assert.match(studio, /schedule_prelaunch_volume/, 'Programación atómica desde Studio');
assert.match(studio, /data-ann=/, 'Selector voluntario en Studio');
assert.match(studio, /announce_prelaunch: false/, 'Cancelación elimina anuncio');
assert.match(agenda, /prelaunch_calendar/, 'Calendario conectado a anuncios');
assert.match(agenda, /filter\(r => r\.kind !== 'volp'\)/, 'Ocultar programación automática sin consentimiento');
assert.match(ui, /prelaunch_series/, 'Ficha pública con primer vistazo');
assert.doesNotMatch(ui, /id="ob-s-prelaunch"/, 'Inicio no debe crear una sección independiente para preestrenos');
assert.match(ui, /const previewIds = new Set\(previews.map/, 'El carrusel combina publicaciones y preestrenos sin duplicados');
assert.match(ui, /heroSlide\(feat, 0, prog, lastCh, top, newsBySeries, featReasons\)/, 'Los anuncios reutilizan el carrusel principal');
assert.match(ui, /slice\(0, 2\)/, 'Se limita el número de adelantos para no desplazar publicaciones');
assert.match(ui, /PRÓXIMO ESTRENO · VOL\./, 'Los próximos estrenos se identifican claramente en el carrusel');
assert.doesNotMatch(ui, /'PREESTRENO · '/, 'Evitar el término preestreno en la etiqueta del carrusel');
assert.match(preview, /PRÓXIMO ESTRENO · PRIMER VISTAZO/, 'La ficha utiliza el mismo nombre de anuncio');
assert.match(preview, /PRÓXIMO ESTRENO/, 'Las tarjetas usan Próximo estreno');
assert.match(agenda, /Próximo estreno · volumen/, 'El calendario anuncia un próximo estreno');
assert.match(studio, /Anunciar próximo estreno/, 'Studio presenta la misma etiqueta');
assert.match(ui, /Ver primer vistazo →/, 'La llamada a la acción abre la ficha, no el lector');
assert.match(ui, /pre \? `<p class="ob-prelaunch-timer"/, 'El carrusel muestra fecha y cuenta regresiva sin liberar lectura');
assert.match(ui, /\(adultOk \|\| !x.adult\) && !hidS\(x\)/, 'Se respetan edad y preferencias de contenido');
assert.match(preview, /data-pre-time/, 'Cuenta regresiva');
assert.match(preview, /data-pre-rem/, 'Recordatorios');
assert.doesNotMatch(preview, /\.from\('chapters'\)/, 'El módulo de preestreno no lee borradores');

console.log('✓ Preestrenos: contratos, permisos y sintaxis JS verificados (estático).');

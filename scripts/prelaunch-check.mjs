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

// Contrato editorial del calendario: etapas diferenciadas y navegación utilizable.
assert.match(agenda, /const PERIODS =/, 'Filtrar futuros y anteriores por separado');
assert.match(agenda, /const ACCESS =/, 'Diferenciar el tipo de evento del acceso efectivo');
assert.match(agenda, /const passAccess =/, 'Controlar disponibilidad con can_read');
assert.match(agenda, /const fut = ks\.filter\(k => k > t\)\.sort\(\)/, 'Próximos en orden cronológico');
assert.match(agenda, /countable = scoped\.filter/, 'Contadores ligados al periodo visible');
assert.match(agenda, /class="ag-milestones"/, 'Mostrar liberación de mecenas y público en tarjetas');
assert.match(agenda, /class="ag-chapters"/, 'Expandir capítulos sin repetir tarjetas');
assert.match(agenda, /matchMedia\?\./, 'Vista móvil prioriza agenda');

assert.match(ui, /prelaunch_series/, 'Ficha pública con primer vistazo');
assert.match(ui, /ob-s-prelaunch/, 'Próximos estrenos en Inicio');
assert.match(preview, /data-pre-time/, 'Cuenta regresiva');
assert.match(preview, /data-pre-rem/, 'Recordatorios');
assert.doesNotMatch(preview, /\.from\('chapters'\)/, 'El módulo de preestreno no lee borradores');

console.log('✓ Preestrenos: contratos, permisos y sintaxis JS verificados (estático).');

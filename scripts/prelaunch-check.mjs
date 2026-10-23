import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
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


// Regression: a previously announced scheduled volume and its chapters should
// share a launch card only when the scheduled instant and volume match.
const groupStart = agenda.indexOf('  const patronLaunch =');
const groupEnd = agenda.indexOf('  const passBase =', groupStart);
assert.ok(groupStart > -1 && groupEnd > groupStart, 'calendar grouping function boundaries');
const groupSource = agenda.slice(groupStart, groupEnd);
const releaseTime = '2026-11-02T18:00:00Z';
const releaseBase = { at: releaseTime, series_id: 'test', volume_id: 'v1', vnum: 1, acc: 'public', can_read: false };
const chapter = (id, num, at = releaseTime, vol = 'v1') => ({
  ...releaseBase, at, volume_id: vol, kind: 'prog', chapter_id: id, num,
  acc: 'donors', open_at: '2026-11-09T18:00:00Z'
});
const announced = { ...releaseBase, kind: 'volp', chapter_id: null, label: 'Vol. 1' };
const releaseGroups = rows => runInNewContext(groupSource + '\ngroups()', {
  D: { rows, series: { test: { id: 'test', slug: 'prueba', title: 'Prueba' } }, aniv: [] },
  ymd: value => value.slice(0, 10)
});
const combined = releaseGroups([announced, chapter('c1', 1), chapter('c2', 2)]);
assert.equal(combined.length, 1, 'same-time announced volume and chapters appear once');
assert.equal(combined[0].kind, 'volp', 'keep prelaunch reminder type');
assert.equal(combined[0].list.length, 2, 'preserve both chapter numbers');
assert.equal(combined[0].f.has('pat'), true, 'retain patron stage');
assert.equal(releaseGroups([announced, chapter('c1', 1, '2026-11-02T13:00:00Z')]).length, 2, 'different times remain separate');
assert.equal(releaseGroups([announced, chapter('c1', 1, releaseTime, 'another-volume')]).length, 2, 'different volumes remain separate');
assert.equal(releaseGroups([announced]).length, 1, 'private series with only an announcement remains valid');
console.log('✓ Calendario: preestreno, capítulos, horarios y recordatorios verificados (funcional aislado).');

console.log('✓ Preestrenos: contratos, permisos y sintaxis JS verificados (estático).');

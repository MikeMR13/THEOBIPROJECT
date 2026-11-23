import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Las pruebas sinteticas no sustituyen una base PostgreSQL ni una sesion real.
// Permiten ensayar las decisiones de acceso ANTES de una migracion.
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(base, 'sql/p0-schedule-visibility.sql'), 'utf8');
const now = Date.parse('2026-11-23T22:00:00.000Z');
const future = '2026-11-24T22:00:00.000Z';
const past = '2026-11-22T22:00:00.000Z';

function publicSchedule(row) {
  const {series:s,team:t,volume:v,chapter:c} = row;
  if (!s || !t || s.archived || s.adult || ['abandoned','withdrawn'].includes(s.translationStatus) || t.status !== 'Activo') return false;
  if (row.kind === 'volume') return !!v && v.seriesId === s.id && !v.deleted && v.status === 'scheduled' && v.announced === true && v.access === 'public' && s.access === 'public' && !!row.prelaunchEligible && Date.parse(v.at) > now && v.at === row.at;
  if (row.kind === 'chapter') return s.published === true && !!c && c.seriesId === s.id && !c.deleted && c.status === 'scheduled' && Date.parse(c.at) > now && c.at === row.at;
  return false;
}
function canRead(row, who) {
  return !!(who.admin || who.teamIds?.includes(row.team.id) || who.collabSeriesIds?.includes(row.series.id) || who.canEditSeriesIds?.includes(row.series.id) || publicSchedule(row));
}
const work = {id:'obra-1',teamId:'equipo-1',access:'public',published:false,archived:false,adult:false,translationStatus:'ongoing'};
const team = {id:'equipo-1',status:'Activo'};
const announcement = {series:work,team,kind:'volume',at:future,prelaunchEligible:true,volume:{seriesId:work.id,deleted:false,status:'scheduled',announced:true,access:'public',at:future}};
const anonymous = {};
const change = (obj, fields) => ({...obj, ...fields});

test('P0-1: la propuesta sustituye el SELECT irrestricto por una condicion de acceso', () => {
  assert.match(sql, /ALTER POLICY "schedule read" ON public\.schedule/);
  assert.doesNotMatch(sql, /USING\s*\(\s*true\s*\)/i);
  assert.match(sql, /private\.schedule_public_visible\(id\)/);
  assert.match(sql, /SET search_path TO ''/);
  assert.match(sql, /REVOKE ALL ON FUNCTION/);
});
test('P0-1: el preestreno legitimo anunciado se conserva visible', () => assert.equal(canRead(announcement, anonymous), true));
test('P0-1: programacion privada/no anunciada queda oculta', () => assert.equal(canRead(change(announcement,{volume:change(announcement.volume,{announced:false})}), anonymous), false));
test('P0-1: un estreno vencido sin publicar no aparece como futuro', () => assert.equal(canRead(change(announcement,{at:past,volume:change(announcement.volume,{at:past})}), anonymous), false));
test('P0-1: programaciones adultas quedan ocultas para anonimos', () => assert.equal(canRead(change(announcement,{series:change(work,{adult:true})}), anonymous), false));
test('P0-1: equipos inactivos quedan ocultos', () => assert.equal(canRead(change(announcement,{team:{status:'Suspendido'}}), anonymous), false));
test('P0-1: obras retiradas quedan ocultas', () => assert.equal(canRead(change(announcement,{series:change(work,{translationStatus:'withdrawn'})}), anonymous), false));
test('P0-1: una obra sin anuncio publico queda oculta', () => assert.equal(canRead(change(announcement,{prelaunchEligible:false}), anonymous), false));
test('P0-1: fecha inconsistente no permite mostrar estreno obsoleto', () => assert.equal(canRead(change(announcement,{at:past}), anonymous), false));
test('P0-1: capitulo programado en obra publicada aparece sin cuerpo del capitulo', () => {
  const row = {series:change(work,{published:true}),team,kind:'chapter',at:future,chapter:{seriesId:work.id,status:'scheduled',deleted:false,at:future}};
  assert.equal(canRead(row, anonymous), true);
  assert.equal(Object.hasOwn(row,'body'), false);
});
test('P0-1: capitulo de obra privada no aparece al publico', () => {
  const row = {series:work,team,kind:'chapter',at:future,chapter:{seriesId:work.id,status:'scheduled',deleted:false,at:future}};
  assert.equal(canRead(row, anonymous), false);
});
test('P0-1: integrantes y colaboradores autorizados conservan su agenda privada', () => {
  const privateRow=change(announcement,{prelaunchEligible:false,volume:change(announcement.volume,{announced:false})});
  assert.equal(canRead(privateRow, {teamIds:[team.id]}),true);
  assert.equal(canRead(privateRow, {collabSeriesIds:[work.id]}),true);
  assert.equal(canRead(privateRow, {admin:true}),true);
});

// Estos controles leen el codigo de la misma copia del repositorio cuando
// se ejecutan en CI. El modo aislado sin checkout solo ejecuta pruebas sinteticas.
const repoRoot=resolve(process.env.OBI_REPO_ROOT || base);
const realRepo=existsSync(join(repoRoot,'src/reader.js')) && existsSync(join(repoRoot,'src/studio.js'));
function source(path){return readFileSync(join(repoRoot,path),'utf8');}
test('P0-2 (checkout): Studio utiliza RPCs existentes de programacion y cancelacion', {skip:!realRepo}, () => {
  assert.match(source('src/studio.js'), /rpc\('schedule_prelaunch_volume'/);
  assert.match(source('src/studio.js'), /rpc\('unschedule_volume'/);
  assert.match(source('src/studio-importer.js'), /rpc\('series_publication_transition'/);
});
test('P0-2 (checkout): lector protege el preestreno incluso al entrar por URL', {skip:!realRepo}, () => {
  assert.match(source('src/reader.js'), /blockedByPrelaunch\s*=\s*!isPubliclyReadableChapter/);
});
test('P0-2 (checkout): calendario usa agenda_events_json con respaldo anterior', {skip:!realRepo}, () => {
  assert.match(source('src/agenda.js'), /rpc\('agenda_events_json'/);
  assert.match(source('src/agenda.js'), /rpc\('agenda_events'/);
});
test('P0-2 (checkout): difusion bloquea atrasos y utiliza job_id en confirmacion', {skip:!realRepo}, () => {
  const code=source('supabase/functions/diffusion-dispatch/handler.mjs');
  assert.match(code, /async function unreviewedOverdue/);
  assert.match(code, /overdue_plans_require_review/);
  assert.match(code, /async function callRpc/);
  assert.match(code, /p_job:item\.job_id/);
});

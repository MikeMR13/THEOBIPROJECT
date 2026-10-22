// Fase 3 de Preferencias: vistas explicativas, audiencias y estado de avisos.
// Pruebas de modelos reales, sin servicios ni usuarios de producción.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readingPreviewDescription, privacyPreviewModel, notificationPreviewSummary } from '../src/preferences-preview.js';

const byChapter = readingPreviewDescription({ continuous:'off', autonext:true, autosecs:8, cw:'show', illus:true });
assert.equal(byChapter.mode, 'Lectura por capítulo');
assert.match(byChapter.next, /8 segundos/);
assert.match(byChapter.warnings, /desplegar/);
assert.match(byChapter.illustration, /visibles/);
const noAuto = readingPreviewDescription({ continuous:'off', autonext:false, cw:'icon', illus:false });
assert.match(noAuto.next, /manualmente/);
assert.match(noAuto.warnings, /icono/);
assert.match(noAuto.illustration, /ocultas/);
assert.match(readingPreviewDescription({ continuous:'volume', cw:'hide' }).mode, /dentro del volumen/);
assert.match(readingPreviewDescription({ continuous:'all' }).mode, /entre volúmenes/);
assert.match(readingPreviewDescription({ continuous:'all' }).next, /modo elegido/);
assert.match(readingPreviewDescription({ continuous:'off', autosecs:900 }).next, /30 segundos/);

const sectionPrefs = { favs:true, seals:true, shelves:false, reviews:false };
const base = { profile_visibility:'all', public_activity:false, discoverable:true, show_since:true, hide_reading:true };
const guest = privacyPreviewModel(base, sectionPrefs, 'guest');
assert.equal(guest.accessible, true);
assert.deepEqual(guest.visible,['Favoritas','Sellos']);
assert.deepEqual(guest.hidden,['Estanterías','Reseñas','Estadísticas']);
assert.equal(guest.since,true);
assert.match(guest.reading,/no se muestra/);
assert.match(guest.search,/puede aparecer/);
const signed = privacyPreviewModel({ ...base, profile_visibility:'auth', public_activity:true },sectionPrefs,'auth');
assert.equal(signed.accessible,true);
assert(signed.visible.includes('Estadísticas'));
const anonymous = privacyPreviewModel({ ...base, profile_visibility:'auth' },sectionPrefs,'guest');
assert.equal(anonymous.accessible,false);
assert.equal(anonymous.visible.length,0);
assert.match(anonymous.note,/iniciar sesión/);
const privateForAuth = privacyPreviewModel({ ...base, profile_visibility:'none' },sectionPrefs,'auth');
assert.equal(privateForAuth.accessible,false);
assert.match(privateForAuth.note,/nombre y avatar/);
assert.equal(privacyPreviewModel({ ...base, discoverable:false },sectionPrefs,'guest').search.includes('no aparece'),true);

const types = [
 ['capitulo','Capítulos',null,true], ['respuesta','Respuestas',null,true],
 ['errata','Erratas',null,true], ['tablero','Estudio',null,false]
];
const paused = notificationPreviewSummary({ freq:'off', web:{respuesta:false}, email:{errata:false,tablero:true} },types);
assert.deepEqual(paused,{webCount:3,emailCount:3,total:4,mailEnabled:false,
 description:'El correo está pausado. Las opciones de correo se conservarán hasta que lo reactives.'});
const daily = notificationPreviewSummary({freq:'diario',email:{capitulo:false}},types);
assert.equal(daily.emailCount,2);
assert.equal(daily.mailEnabled,true);
assert.match(daily.description,/diario/);
assert.match(notificationPreviewSummary({freq:'semanal'},types).description,/semanal/);

const profile=readFileSync('src/profile.js','utf8'), cssStart=profile.indexOf('const CSS = `');
assert(cssStart>=0);
const requireText = needle => assert(profile.includes(needle),'Falta integración: '+needle);
for(const needle of [
  "from './preferences-preview.js?v=1'", 'readingPreviewDescription(G)',
  'aria-label="Vista previa de lectura"', 'id="lc-pv"', 'pv.mode','pv.next','pv.warnings',
  'pv.illustration', 'G.cw === \'hide\'', 'G.cw === \'icon\'',
  "next.focus({ preventScroll: true })",
  'privacyPreviewModel(P, S, viewAs)', 'id="pv-preview"', 'data-pv-audience="guest"',
  'data-pv-audience="auth"', 'app.__obiPrivacyView = viewAs',
  "const refreshPrivacyPreview = () =>", "refreshPrivacyPreview();",
  "const summary = notificationPreviewSummary(N, KINDS)",
  "tg('e-' + k, onE(k, de),", "off)}", 'disabled = false',
  "class=\"pf-preview\"", "pf-mail-pause"
]) requireText(needle);
assert(profile.includes('aria-live="polite"'),'Vistas y guardados requieren anuncios accesibles');
const css=profile.slice(cssStart, profile.indexOf('`;',cssStart));
assert(css.includes('.pf-preview-audience button[aria-pressed="true"]'));
assert(css.includes('.pf-reading-preview{position:static!important'));
console.log('Preferencias fase 3: lectura, audiencias, secciones y avisos — OK');

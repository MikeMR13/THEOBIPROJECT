// Fase visual 4: validación de fechas de novedades y componentes que NO se deben retirar.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicationDate, publicationAge, publicationDay } from '../src/publication-dates.js';
const ui = readFileSync('src/ui.js','utf8'), styles = readFileSync('src/styles.css','utf8');
const studio = readFileSync('src/studio.css','utf8');
const now = Date.parse('2026-10-20T18:30:00Z');
const valid = '2026-10-20T04:17:44.25349+00:00';
assert.equal(publicationDate(valid,now)?.getUTCFullYear(), 2026);
assert.match(publicationAge(valid,now), /^hace \d+ h$/);
assert.equal(publicationDay(valid,now).length>0,true);
for(const bad of ['96','1996','1996-06-18','1996-06-18T04:00:00Z','0096-06-18T04:00:00Z','not-a-date','',null,undefined,0,'2026-20-99T00:00:00Z','2028-01-01T00:00:00Z']){
  assert.equal(publicationDate(bad,now), null, 'No debe interpretar fecha anómala: '+String(bad));
  assert.equal(publicationAge(bad,now), '', 'No se debe mostrar un año falso');
  assert.equal(publicationDay(bad,now), 'Sin fecha');
}
assert.equal(publicationAge('2000-06-18T00:00:00Z',now).includes('2000'),true,'Años explícitos desde 2000 siguen siendo válidos');
assert.equal(publicationDate('2026-10-20T18:33:00Z',now)?.getUTCFullYear(),2026,'Tolerancia de 5 minutos');
assert.equal(publicationDate('2026-10-20T18:40:00Z',now),null,'No presentar un lanzamiento futuro como publicación antigua');
const markers=[
  'const ago = d => publicationAge(d)', 'const dayK = d => publicationDay(d)',
  'const fresh = byNew.filter(x => { const d = publicationDate',
  'const freshDate = publicationDate(pub?.at || lc?.publish_at)',
  'publicationDate(g.at) ? `<time datetime=',
  'homeReleaseOverview(latest || [], VR?.data || [], list)','obTicker','ob-track','ob-tick','heroSlide(feat','bindCars(app)',
  "fill('ob-s-ann'", 'ob-anns', 'ob-hero', 'ob-car', 'ob-s-rev',
  'ui-grid','ui-fich','ui-sh','ui-vol','ui-chl'
];
for(const mark of markers)assert(ui.includes(mark),'Se perdió un componente del Inicio o su protección de fecha: '+mark);
assert(styles.includes('.rd-team img{'),'Logotipo del lector eliminado');
assert(studio.includes('.s2-work{'),'Tarjetas de Studio eliminadas');
const p = JSON.parse(readFileSync('package.json','utf8'));
assert(p.scripts.verify.includes('visual-phase4-check.mjs'),'Las pruebas de fase visual 4 deben ejecutarse en CI');
console.log('Fase visual 4: fechas 1996 ocultas, fechas válidas intactas y componentes conservados.');

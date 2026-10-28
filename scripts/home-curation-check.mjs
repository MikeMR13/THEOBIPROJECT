import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const featured=readFileSync(new URL('../src/home-featured.js',import.meta.url),'utf8');
assert(ui.includes('s.firstPublishedAt = new Date(firstAt[s.id]).toISOString()'),
  'Inicio debe entregar al curador la antigüedad de publicación ya disponible');
assert(ui.includes("const heroKey = item => item?.__prelaunch"),
  'Un anuncio y una obra publicada no deben compartir identidad de diapositiva');
assert(ui.includes('el.dataset.heroKey = heroKey(feat[i])'),
  'El carrusel debe conservar qué diapositiva ve el lector');
assert.equal(ui.split('const selected = feat.findIndex(item => heroKey(item) === active)').length-1,2,
  'Los datos diferidos de preestrenos y equipos deben respetar la diapositiva activa');
assert(!ui.includes("if (!heroPaused && !heroEl.matches(':hover')) heroSlide(feat, 0,"),
  'Actualizar recomendaciones no debe volver automáticamente a la primera diapositiva');
assert(ui.includes('new Date(b.at)-now <= 14*864e5'),
  'Priorizar en Inicio estrenos dentro de los próximos 14 días');
assert(ui.includes('ESTRENO MAÑANA · VOL. ') && ui.includes('PRÓXIMO ESTRENO · VOL. '),
  'Respetar etiqueta pública y destacar las próximas 24 horas cuando se estrene mañana');
assert(featured.includes('const freshVolumes=updates.filter(') && featured.includes('<2*MS_DAY')
  && featured.includes('...freshVolumes,...freshDebuts'),
  'Los volúmenes recién publicados, no solo los debuts, deben liderar durante 48 horas');
assert(ui.includes('const lead = covers[0] || feat.find('),
  'Los datos diferidos no deben restaurar un destacado menos reciente');
assert(ui.includes('...published.slice(1)].slice(0, 8)') &&
  ui.includes('...previews, ...covers].filter(') && ui.includes('.slice(0, 8)'),
  'Carrusel mixto y preestrenos deben respetar el máximo de ocho diapositivas');
assert(featured.includes('const firstTeam=pool.team.find(') && featured.includes('teamRecommendations:pool.team'),
  'Rotar equipo destacado y conservar todos los equipos en la banda independiente');
console.log('✓ Carrusel: prioridad 48h, adelantos cercanos y selección activa estable.');

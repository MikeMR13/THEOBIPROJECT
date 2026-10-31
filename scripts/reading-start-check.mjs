import assert from 'node:assert/strict';
import { selectReadingStart } from '../src/reading-start.js';
import { SECTION_TYPES, inferSectionType } from '../src/section-types.js';
import { formatChapterIndex } from '../src/chapter-title-display.js';
import { readFileSync } from 'node:fs';

const volume = [
  { id: 'cover', num: 1, title: 'Portada', section_type: 'Portada' },
  { id: 'credits', num: 2, title: 'Créditos', section_type: 'Créditos' },
  { id: 'summary', num: 3, title: 'Sinopsis', section_type: 'Capítulo' }, // importación antigua
  { id: 'art', num: 4, title: 'Ilustraciones', section_type: 'Ilustraciones' },
  { id: 'prologue', num: 5, title: 'Prólogo', section_type: 'Prólogo' },
  { id: 'chapter1', num: 6, title: 'Capítulo 1: Inicio', section_type: 'Capítulo' }
];
assert.equal(selectReadingStart(volume)?.id, 'prologue', 'Sin preferencia se lee el prólogo');
assert.equal(selectReadingStart(volume, 'cover')?.id, 'cover', 'El equipo puede elegir portada');
assert.equal(selectReadingStart(volume, 'summary')?.id, 'summary', 'Puede elegir sinopsis');
assert.equal(selectReadingStart(volume, 'unpublished')?.id, 'prologue', 'Inicio no disponible usa una parte visible');
assert.equal(selectReadingStart(volume.filter(c => c.id !== 'prologue'))?.id, 'chapter1', 'Sin prólogo se lee capítulo 01');
assert.equal(selectReadingStart(volume.filter(c => c.id === 'summary' || c.id === 'chapter1'))?.id, 'chapter1');
assert.equal(selectReadingStart([{ id: 'a', num: 1, title: 'Introducción', section_type: 'Capítulo' }])?.id, 'a');
assert.equal(selectReadingStart([]), null);
assert.equal(selectReadingStart([volume[5], volume[4]])?.id, 'prologue', 'Respeta el orden interno');
for (const type of ['Portada', 'Sinopsis', 'Índice', 'Dedicatoria', 'Agradecimientos', 'Nota editorial', 'Prólogo']) {
  assert(SECTION_TYPES.includes(type), type + ' está disponible en el editor/importador');
  assert.equal(formatChapterIndex({ title: type, sectionType: type }).label, type);
}
assert.equal(inferSectionType('Prólogo: un nuevo comienzo'), 'Prólogo');
assert.equal(inferSectionType('Portada'), 'Portada');
assert.equal(inferSectionType('Sinopsis'), 'Sinopsis');
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../src/studio.js', import.meta.url), 'utf8');
assert.match(studio, /data-start-reading/);
assert.match(ui, /selectReadingStart\(allCh, s\.reading_start_chapter_id\)/);
assert.match(ui, /p\?\.chapter_num \|\| start\?\.num/);
assert.match(ui, /publicReadingStart\(s\)/);
assert.doesNotMatch(ui, /p\?\.chapter_num \|\| lc\?\.num \|\| 1/, 'Hero no debe iniciar en el último capítulo');
const sql = readFileSync(new URL('../supabase/migrations/20261031000000_editorial_reading_start.sql', import.meta.url), 'utf8');
assert.match(sql, /reading_start_chapter_id/);
assert.doesNotMatch(sql, /(?:update|delete)\s+public\.reading_progress/i);
console.log('OK: tipos editoriales, inicio manual/automático, lectura existente intacta');

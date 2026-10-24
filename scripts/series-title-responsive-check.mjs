// Regresión: ficha pública y editor admiten títulos largos completos sin pérdida.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorkData, workPayload, renderWorkFields } from '../src/studio-work-fields.js';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../src/studio.js', import.meta.url), 'utf8');
const work = readFileSync(new URL('../src/studio-work-fields.js', import.meta.url), 'utf8');
const title = 'Para crear una organización que actuara en secreto desde las sombras, crié y entrené a unas chicas con los más altos conocimientos de asesinato, y terminaron convirtiéndose en una gran potencia que me' + ' permitió recuperar sus historias y descubrir un secreto inesperado.';
assert(title.length > 200 && title.length < 500);
const payload = workPayload(createWorkData({title}));
assert.equal(payload.title, title, 'Nunca descartar el final del título en la creación');
assert.equal(payload.short.length, 26, 'El título corto sigue separado del título completo');
assert.throws(() => workPayload(createWorkData({title: 'X'.repeat(501)})), /500 caracteres/,
  'Los títulos demasiado largos se rechazan explícitamente, no se cortan');
const fields = renderWorkFields(createWorkData({title}), value => String(value));
assert.match(fields, /id="nw-title" maxlength="500"/, 'Crear obra admite 500 caracteres');
assert(fields.includes(title), 'Reabrir el formulario debe conservar un título de más de 200 caracteres');
assert(studio.includes(`inp('title', 'Título en español', 'maxlength="500"')`),
  'Editar una obra publicada también permite el título completo');
assert(!work.includes(".slice(0,200)"), 'Prohibido truncar el título en el guardado');
assert.equal((ui.match(/<h1 data-title-size="\$\{s\.title\.length > 120/g) || []).length, 2,
  'El render inicial y el definitivo deben usar el ajuste de tamaños');
assert(css.includes('.ui-series-page .ui-series-hero h1[data-title-size="xl"]'),
  'El estilo compacto se aplica únicamente a la ficha de obra');
assert(css.includes('overflow:visible;white-space:normal;overflow-wrap:anywhere'),
  'Las líneas del título deben ser visibles y saltar dentro de su columna');
assert(!css.includes('.ui-series-page .ui-series-hero h1{-webkit-line-clamp:'),
  'No limitar artificialmente el número de líneas del título');
console.log('✓ Fichas: título completo sin recortes, tipografía adaptable y editor hasta 500 caracteres.');

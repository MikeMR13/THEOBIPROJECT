// Contratos sin backend: fases 1, 3 y 4 del lector y vistas públicas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = p => readFileSync(p, 'utf8');
const reader = read('src/reader.js');
const css = read('src/styles.css');
const ui = read('src/ui.js');
const app = read('src/app.js');
const index = read('src/index.html');

for (const file of ['src/reader.js', 'src/ui.js', 'src/app.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}
assert.match(reader, /controls:\s*'fijo'/, 'Sin configuración predeterminada del lector');
assert.match(reader, /opt\('controls',[\s\S]*?\['fijo','Barra siempre visible'\]/, 'No existen ambos modos del lector');
assert.match(reader, /controls:\s*p\.controls === 'fijo'/, 'Los controles no responden a preferencias guardadas');
assert.match(reader, /rd-panel-close[^\n]*data-panel-close/, 'El panel carece de cierre accesible');
assert.match(reader, /aria-controls="rd-panel"/, 'Aa no controla el panel semánticamente');
assert.match(css, /\.rd-panel\{\s*position:fixed/, 'El panel sigue empujando el capítulo');
assert.match(css, /\.rd\[data-controls="fijo"\] \.rd-bar/, 'La barra fija no está implementada');
assert.match(reader, /<nav class="rd-ch-end"[^\n]*Regresar a la serie/, 'Falta regreso al terminar cada capítulo');
assert.match(reader, /function chapterHTML[\s\S]*?rd-ch-end[\s\S]*?function glossRe/, 'El enlace debe ser parte de cada capítulo, también en modo continuo');
assert.match(ui, /image = s\.cover_path \|\| s\.cover_thumb_path/, 'La estantería no prioriza miniaturas');
assert.match(ui, /alternativeShelf\.length >= Math\.min\(4, list\.length\)/, 'La estantería no evita repetición cuando puede');
assert.match(css, /#cat-filters>summary\{display:none\}/, 'El Catálogo muestra dos controles de filtros');
const capture = (name) => Number(index.match(new RegExp(name.replace('.', '\\.') + '\\?v=(\\d+)'))?.[1] || 0);
const appV = capture('app.js'), uiV = capture('ui.js'), readerV = capture('reader.js'), cssV = capture('styles.css');
assert(appV > 34 && uiV > 56 && readerV > 20 && cssV > 25, 'Recursos sin versión renovada');
assert(app.includes('/ui.js?v=' + uiV) && app.includes('/reader.js?v=' + readerV), 'Importaciones y precargas desincronizadas');
console.log('✓ Calidad 1→3→4: contratos, sintaxis, navegación y versiones de caché');

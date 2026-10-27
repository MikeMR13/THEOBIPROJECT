import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ui=readFileSync(new URL('../src/ui.js', import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css', import.meta.url),'utf8');
const js=spawnSync(process.execPath,['--check',new URL('../src/ui.js',import.meta.url).pathname],{encoding:'utf8'});
assert.equal(js.status,0,js.stderr||'src/ui.js debe compilar');

// Las miniaturas pueden estar recortadas: la portada visible debe provenir del original.
assert.match(ui,/const heroCover = media\(art\)/,
  'La portada destacada debe utilizar la imagen original');
assert.match(ui,/background-image:url\('\$\{esc\(heroCover\)\}'\)/,
  'El carrusel destacado debe consumir la portada original');
assert.match(css,/\.ob-page \.ob-hero \.ob-cov \.f\{[^}]*background-size:contain/,
  'La portada destacada debe verse entera sin recortes');
assert.match(ui,/const cover = \(s, tag\) =>[^\n]*image = s\.cover_path \|\| s\.cover_thumb_path/,
  'Las fichas de Inicio deben priorizar la portada original');
assert.match(ui,/class="cv"><img src="\$\{esc\(media\(image\)\)\}" alt="" loading="lazy" decoding="async"/,
  'Las fichas secundarias deben conservar lazy loading y decoding async');
assert.match(ui,/const coverUrl = media\(v\?\.cover_path \|\| s\.cover_path \|\| s\.cover_thumb_path\)/,
  'Novedades deben priorizar portadas originales de volumen y serie');
assert.match(css,/\.ob-page \.ob-car>\.ob-cc:not\(\.ob-continue-card\)>\.cv img\{[^}]*object-fit:contain/,
  'Las portadas de los carruseles deben caber completas en su marco');
assert.match(ui,/class="ob-ritem"[^\n]*<span class="c">\$\{s\.cover_path/,
  'Más leídas debe usar imágenes completas, no fondos recortados');
assert.match(css,/\.ob-page \.ob-rank \.ob-ritem>\.c img\{[^}]*object-fit:contain/,
  'Más leídas debe mostrar las portadas completas');
assert.match(css,/\.ob-page \.ob-rev>\.c img\{[^}]*object-fit:contain/,
  'Las reseñas deben conservar la proporción de sus miniportadas');

// Conservar la optimización crítica de Inicio y la seguridad del estado de navegación.
assert.match(ui,/const progressRequest = u \? progressMap\(\)\.catch\(\(\) => null\) : null/,
  'El progreso remoto debe quedar fuera de la ruta crítica');
assert.doesNotMatch(ui,/feed\(\),\s*progressMap\(\)/,
  'El inicio no debe esperar al progreso remoto');
assert.match(ui,/const \[FD, pr, VR\] = await Promise\.all/,
  'Mantener consultas de publicaciones y verificación +18 antes de renderizar Inicio');
assert.match(ui,/app\.querySelector\('#ob-continue-slot'\) !== myContinueSlot/,
  'No actualizar contenido de una navegación anterior');
assert.match(ui,/myContinueSlot\.innerHTML = continueHTML\(nextCont\)/,
  'Se debe hidratar «Continuar leyendo» al llegar el progreso remoto');
console.log('✓ Inicio: portadas originales completas, carga lazy, progreso diferido y seguridad +18 verificados.');

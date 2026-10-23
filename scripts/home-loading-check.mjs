import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ui=readFileSync(new URL('../src/ui.js', import.meta.url),'utf8');
const js=spawnSync(process.execPath,['--check',new URL('../src/ui.js',import.meta.url).pathname],{encoding:'utf8'});
assert.equal(js.status,0,js.stderr||'src/ui.js debe compilar');
assert.match(ui,/const heroCover = art && s\.cover_thumb_path && art === s\.cover_path \? thumb\(s\) : media\(art\)/,
  'La portada principal debe usar la miniatura existente si representa la misma imagen del volumen');
assert.match(ui,/background-image:url\('\$\{esc\(heroCover\)\}'\)/,
  'La portada del carrusel debe consumir el recurso optimizado');
assert.match(ui,/const progressRequest = u \? progressMap\(\)\.catch\(\(\) => null\) : null/,
  'El progreso remoto debe quedar fuera de la ruta crítica');
assert.doesNotMatch(ui,/feed\(\),\s*progressMap\(\)/,
  'El inicio no debe esperar al progreso remoto');
assert.match(ui,/const \[FD, pr, VR\] = await Promise\.all/,
  'Mantener consultas de publicaciones y verificación +18 antes de renderizar el Inicio');
assert.match(ui,/app\.querySelector\('#ob-continue-slot'\) !== myContinueSlot/,
  'No actualizar contenido de una navegación anterior');
assert.match(ui,/myContinueSlot\.innerHTML = continueHTML\(nextCont\)/,
  'Se debe hidratar «Continuar leyendo» al llegar el progreso remoto');
assert.match(ui,/class="cv"><img src="\$\{esc\(thumb\(s\)\)\}" alt="" loading="lazy" decoding="async"/,
  'No descargar todas las portadas inferiores al mismo tiempo');
assert.match(ui,/\.ob-cc \.cv img\{position:absolute;/,
  'Mantener el tamaño de portada al cambiar fondos CSS por imágenes lazy');
console.log('✓ Inicio: miniatura prioritaria, progreso diferido, imágenes lazy y seguridad +18 verificados.');

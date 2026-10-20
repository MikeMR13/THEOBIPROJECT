// Contratos visuales de fase 1: validaciones estáticas sin navegador ni red.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = p => readFileSync(p, 'utf8');
const studioCSS = read('src/studio.css');
const studioJS = read('src/studio.js');
const adminJS = read('src/admin.js');
const globalCSS = read('src/styles.css');
assert(!studioCSS.includes('.s2-brand,.s2-team,.s2-back{display:none}'), 'No ocultar el selector de equipo en móvil');
assert(studioCSS.includes('.s2-side .s2-team{display:flex'), 'El selector debe mostrarse en la barra compacta');
assert(studioCSS.includes('.s2-side .s2-team select{flex:1 1 180px'), 'El selector debe adaptarse al espacio disponible');
assert(studioJS.includes('<select id="tpick" aria-label="Equipo activo">'), 'Nombre accesible para el selector');
assert(studioJS.includes("$('#tpick')?.addEventListener('change'"), 'Conservar la lógica original de cambio de equipo');
assert(adminJS.includes('.bb #bbv{max-width:100%;min-width:0;overflow-x:auto'), 'Desplazamiento horizontal en el Mostrador');
assert(adminJS.includes('.bb #bbv .bb-tbl{min-width:720px}'), 'No comprimir todas las columnas de las tablas');
assert(globalCSS.includes('@media(pointer:coarse)'), 'Reglas para dispositivos táctiles');
assert(globalCSS.includes('.ob-pager2 button[aria-current]{height:44px!important'), 'Indicadores con área táctil');
assert(globalCSS.includes('.pf-oa button{width:44px;height:44px}'), 'Botones de ordenación accesibles al tacto');
console.log('Fase visual 1: selector, tablas y superficies táctiles OK');

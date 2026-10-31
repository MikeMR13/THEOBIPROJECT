// Contratos de la Entrega 2. Sin red, base productiva ni servicios de pago.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(p,'utf8');
const studio=src('src/studio.js'),newWork=src('src/studio-new-work.js');
const editor=src('src/studio-editor.js'),css=src('src/studio-productivity.css');
assert(studio.length<280000,'Studio debe mantenerse bajo el límite de 280 KB de caracteres');
assert(studio.includes("import { createNewWork } from './studio-new-work.js?v=1'"));
assert(studio.includes('const newWork = createNewWork('));
assert(!studio.includes('async function newWork(){'),'El formulario sigue dentro del módulo principal');
for(const label of [
  'export function createNewWork(deps)','async function newWork(){',
  'aria-current="step"','nw-sticky-actions','nw-cover-preview',
  'nw-syn-count','obi-new-work-v1:',"getUser()?.id",
  'createWorkData(savedDraft?.data || {})','storeDraft()',
  'discardDraft();','URL.createObjectURL(cover)','URL.revokeObjectURL',
  'workPayload(N)',"published: false","sb.from('series')",
  "sb.from('volumes')","sb.from('chapters')"
])assert(newWork.includes(label),'Nueva obra perdió: '+label);
assert(newWork.indexOf('discardDraft(); // La obra ya existe')>newWork.indexOf("sb.from('series')"),'No borrar borrador antes de confirmar creación');
for(const label of ['id="p-outline"','id="ed-outline-list"','data-outline-index',
  'id="p-glossary"','id="ed-gloss-search"','id="ed-gloss-cards"',
  'data-gloss-find','id="p-shortcuts"','renderOutline();',
  'renderGlossary();'])assert(editor.includes(label),'Editor perdió: '+label);
assert(editor.includes('esc(g.definition||'), 'No renderizar contenido del glosario sin escape HTML');
assert(editor.includes('slice(0,60)'), 'Limitar fichas en pantalla para no penalizar capítulos');
for(const label of ['.nw-sticky-actions','.nw-cover-preview','.ed-outline-list',
  '.ed-gloss-cards','.ed-shortcut-grid','prefers-reduced-motion'])
  assert(css.includes(label),'Sin estilos de entrega 2: '+label);
console.log('✓ Entrega 2: extracción, borradores por equipo, portada y herramientas del Editor');

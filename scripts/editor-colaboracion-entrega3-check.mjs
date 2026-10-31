// Entrega 3: QA aislado, sin redes ni escrituras externas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewTextCases,applyReviewCase,noteForParagraph,readParagraphNote} from '../src/editorial-review-cases.js';

const original='-Diálogo  con ... palabras , "cita" y Dragón.';
const cases=reviewTextCases(original,[{term:'dragón'}]);
const kinds=new Set(cases.map(c=>c.kind));
for(const kind of ['dash','dbl','dots','space','quotes','gloss'])
  assert(kinds.has(kind),'No se encuentra incidencia: '+kind);
for(const item of cases){
  assert.equal(original.slice(item.start,item.end),item.excerpt);
  const next=applyReviewCase(original,item);
  assert(next!==null && next!==original,'No se puede aplicar el caso '+item.kind);
  assert.equal(applyReviewCase(original+' cambiado', {...item,excerpt:'ya no existe'}),null,
    'Una coincidencia obsoleta no debe aplicarse');
}
assert.equal(original,'-Diálogo  con ... palabras , "cita" y Dragón.',
  'El escáner no debe cambiar el capítulo');
assert.deepEqual(readParagraphNote(noteForParagraph(11,'Revisar el tono')),
  {index:11,text:'Revisar el tono',anchored:true});
assert.equal(readParagraphNote('Sugerencia normal').anchored,false);
assert.throws(()=>noteForParagraph(-1,'Texto'));
assert.throws(()=>noteForParagraph(0,' '));
assert.throws(()=>noteForParagraph(0,'a'.repeat(921)));
const source=p=>readFileSync(p,'utf8');
const editor=source('src/studio-editor.js'),addon=source('src/editorial-advanced-editor.js');
const suggestion=source('src/editorial-suggestion-panel.js');
const css=source('src/studio-productivity.css'),fixture=source('scripts/studio-browser-e2e.mjs');
for(const token of ['attachAdvancedEditor','ed-inline-actions','ed-review-case','renderReview',
  'Alt + Mayús + S / N','Alt + Mayús + J / K','advanced?.dispose()'])
  assert(editor.includes(token),'El editor perdió '+token);
for(const token of ['reviewTextCases(node.data','applyReviewCase(x.node.data,x)',
  'getDirty()||getConflict()','collaboration.openWithSelection(text)',
  'collaboration.openParagraphNote(s.index,excerpt)','can(',
  'data-review-next','data-review-apply','data-review-find'])
  assert(addon.includes(token),'Falta interacción: '+token);
for(const token of ['noteForParagraph(prefill.index,note)','readParagraphNote(x.note)',
  'p_version:getVersion()','editor_create_suggestion','editor_review_suggestion',
  'getDirty()||getConflict()','data-sugpara=','focusParagraph?.('])
  assert(suggestion.includes(token),'Falta contrato colaborativo: '+token);
assert(css.includes('.ed-inline-actions[hidden]')&&css.includes('.ed-review-nav .btn'));
for(const path of ['/editorial-advanced-editor.js','/editorial-review-cases.js'])
  assert(fixture.includes(path),'El navegador de Studio debe cargar '+path);
const sql=source('supabase/migrations/20261030222055_editor_phase3_collaboration_20261030.sql');
assert(sql.includes('CREATE FUNCTION public.editor_create_suggestion('));
assert(sql.includes('p_replacement IS NULL OR char_length(p_replacement)>8000'));
assert(sql.includes('char_length(coalesce(p_note'),'Las notas deben respetar el límite existente');
assert(sql.includes('private.team_can(v_team,')&&sql.includes('self_review_forbidden'),
  'La revisión requiere permisos y no permite autocorrección');
console.log('✓ Entrega 3: casos individuales, versiones, sugerencias, notas y permisos sin migraciones');

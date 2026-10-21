// Regresión de tipos editoriales en Studio, importador, lector y SQL.
// No consulta ni escribe datos reales y no modifica notificaciones.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECTION_TYPES, SECTION_LABELS, inferSectionType } from '../src/section-types.js';

const legacy = ['Capítulo','Prólogo','Interludio','Epílogo','Afterword','Extra'];
const added = ['Créditos','Ilustraciones','Episodio corto','Avance'];
assert.deepEqual(SECTION_TYPES.slice(0,6),legacy, 'Los seis tipos anteriores deben mantener orden y nombre');
assert.deepEqual(SECTION_TYPES.slice(6),added, 'Faltan los cuatro tipos solicitados');
assert.equal(new Set(SECTION_TYPES).size, SECTION_TYPES.length, 'Hay tipos duplicados');
for(const type of SECTION_TYPES) assert(SECTION_LABELS[type], 'El lector no muestra: '+type);

for(const [title,type] of [
  ['Capítulo 1 — Comienzo','Capítulo'],
  ['Prólogo','Prólogo'], ['Epílogo — Final','Epílogo'],
  ['Palabras del autor','Afterword'], ['Interludio: otro día','Interludio'],
  ['Créditos de traducción','Créditos'], ['Colofón','Créditos'],
  ['Ilustraciones a color','Ilustraciones'],['Galería de ilustraciones','Ilustraciones'],
  ['Episodio corto: paseo','Episodio corto'],['Historia corta: verano','Episodio corto'],
  ['Avance del siguiente volumen','Avance'],['Preview: Volumen 2','Avance'],
  ['Capítulo 7 — Un avance inesperado','Capítulo'],
  ['Agradecimientos','Capítulo']
]) assert.equal(inferSectionType(title),type,'Clasificación incorrecta: '+title);

const files = Object.fromEntries(['src/studio.js','src/studio-editor.js','src/studio-importer.js','src/reader.js','scripts/studio-browser-e2e.mjs'].map(path=>[path,readFileSync(path,'utf8')]));
assert(files['src/studio.js'].includes("const SEC = SECTION_TYPES"),'Studio no usa catálogo central');
assert(files['src/studio-editor.js'].includes('SEC.map('),'El selector editorial del capítulo desapareció');
assert(files['src/studio-importer.js'].includes('SEC.map('),'Importador no ofrece estos tipos en revisión');
assert(files['src/studio-importer.js'].includes('type: inferSectionType(t)'),'EPUB no clasifica los tipos');
assert(files['src/studio-importer.js'].includes('type: inferSectionType(b.text)'),'PDF no clasifica los tipos');
assert(files['src/reader.js'].includes('const SEC_LABEL = SECTION_LABELS;'),'Lector no usa las nuevas etiquetas');
assert(files['src/reader.js'].includes("ch.section_type === 'Capítulo' || !ch.section_type ? ' ' + ch.num : ''"),'El lector debe mantener numeración solo en Capítulo');
assert(files['scripts/studio-browser-e2e.mjs'].includes("['/section-types.js','src/section-types.js']"),'La prueba de navegador no sirve el módulo');

const migration=readFileSync('supabase/migrations/20261021_chapters_section_types_expanded.sql','utf8');
for(const t of SECTION_TYPES)assert(migration.includes("'"+t+"'::text"),'La restricción SQL no permite '+t);
assert(migration.includes('drop constraint if exists chapters_section_type_check'), 'La migración no actualiza la restricción existente');
assert(!/\b(?:delete|truncate|update)\s+public\./i.test(migration),'La migración no debe alterar datos');
console.log('Tipos de sección: 6 originales + 4 nuevos, EPUB/PDF, Studio, lector y restricción SQL OK');

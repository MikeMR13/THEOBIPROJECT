// Regresión del índice editorial optativo por volumen (sin Supabase ni escrituras).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatChapterIndex} from '../src/chapter-title-display.js';

const original = 'Captiulo 1: Una nueva vida';
const off = formatChapterIndex({title:original,sectionType:'Capítulo',globalNum:24,enabled:false});
assert.deepEqual(off,{label:'',number:'24',heading:original,secondary:'',normalized:false,typo:false},'Sin consentimiento el índice permanece intacto');

const cases = [
 ['Capítulo 1: El comienzo','01','El comienzo'],
 ['Capitulo 01 - El despertar','01','El despertar'],
 ['Captiulo 1: Una nueva vida','01','Una nueva vida'],
 ['CAP. 02 — El encuentro','02','El encuentro'],
 ['Cap 3. La promesa','03','La promesa'],
 ['Capítulo 3','03',''],
 ['Capítulo número 12: El final','12','El final']
];
for (const [title,number,heading] of cases) {
 const got = formatChapterIndex({title,sectionType:'Capítulo',globalNum:24,enabled:true});
 assert.equal(got.label,'Capítulo',title);
 assert.equal(got.number,number,title);
 assert.equal(got.heading,heading,title);
 assert.equal(got.secondary,'Sección global 24',title);
 assert.equal(got.normalized,true,title);
}
assert(formatChapterIndex({title:original,enabled:true}).typo,'Detectar el error común «Captiulo»');
for (const title of ['El despertar de la bruja','Capítulo veinte','Capítulo 1.5 - parte 2','Capítulo 1a: Extra','Capítulo 10000: Fuera de rango']) {
 const got=formatChapterIndex({title,sectionType:'Capítulo',globalNum:33,enabled:true});
 assert.equal(got.heading,title,'No cambiar títulos ambiguos: '+title);
 assert.equal(got.number,'','No inventar numeración editorial: '+title);
 assert.equal(got.secondary,'Sección global 33');
}
for(const [type,title,heading] of [
 ['Prólogo','Prólogo: Una promesa','Una promesa'],
 ['Epílogo','Epílogo — Final','Final'],
 ['Ilustraciones','Ilustraciones',''],
 ['Créditos','Créditos: Equipo','Equipo'],
 ['Afterword','Afterword',''],
 ['Extra','Extra digital del autor','Extra digital del autor']
]) {
 const v=formatChapterIndex({title,sectionType:type,globalNum:7,enabled:true});
 assert.equal(v.label,type);
 assert.equal(v.heading,heading);
 assert.equal(v.number,'','Los materiales especiales no son capítulos numerados');
}
const ui=readFileSync('src/ui.js','utf8');
const imp=readFileSync('src/studio-importer.js','utf8');
const css=readFileSync('src/styles.css','utf8');
const sql=readFileSync('supabase/migrations/20261028190000_volume_chapter_index_opt_in.sql','utf8');
for (const marker of [
 "format_chapter_titles')", // consulta solo a volúmenes publicados
 "v.format_chapter_titles ? formatChapterIndex(",
 'data-chapter-title="${esc(c.title || \'\')}"', // búsqueda con título intacto
 'href="/leer/${esc(s.slug)}/${c.num}"', // ruta global conservada
 'ui-ch-global'
]) assert(ui.includes(marker),'Ficha pública: '+marker);
for (const marker of [
 'id="imp-format-titles"','D.formatChapterTitles = e.target.checked',
 'format_chapter_titles: !!D.formatChapterTitles',
 'patch.format_chapter_titles = !!D.formatChapterTitles',
 'title:(c.title||\'Sin título\').slice(0,300)',
 'if(volBefore&&vol)'
]) assert(imp.includes(marker),'Importación optativa y rollback: '+marker);
assert(css.includes('.imp-title-switch')&&css.includes('.ui-series-page .ui-ch-display'),'Faltan estilos móvil y táctiles');
assert(sql.includes('default false') && !/\b(?:delete|update|truncate)\s+public\./i.test(sql),'La migración no debe habilitar obras antiguas ni cambiar contenido');
console.log('Índice opcional: 7 prefijos, ambigüedad, secciones especiales, opt-in, rutas y rollback OK');

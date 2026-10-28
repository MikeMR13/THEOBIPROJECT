// Regresión del índice editorial universal + escaneo voluntario en Studio.
// Solo datos ficticios; no consulta Supabase ni escribe novelas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatChapterIndex,scanImportedChapterTitles} from '../src/chapter-title-display.js';

const cases=[
 ['Capítulo 1: El comienzo','01','El comienzo'],
 ['Capitulo 01 - El despertar','01','El despertar'],
 ['Captiulo 1: Una nueva vida','01','Una nueva vida'],
 ['CAP. 02 — El encuentro','02','El encuentro'],
 ['Cap 3. La promesa','03','La promesa'],
 ['Capítulo 0: Introducción','00','Introducción'],
 ['Capítulo 3','03',''],
 ['Capítulo número 12: El final','12','El final']
];
for(const [title,number,heading] of cases) {
 const got=formatChapterIndex({title,sectionType:'Capítulo',globalNum:24});
 assert.equal(got.label,'Capítulo',title);
 assert.equal(got.number,number,title);
 assert.equal(got.heading,heading,title);
 assert(!Object.values(got).some(x=>typeof x==='string'&&x.includes('global 24')),
   'Prohibido mostrar numeración global al lector: '+title);
}
assert(formatChapterIndex({title:'Captiulo 1: Una nueva vida'}).typo);
for(const title of ['El despertar de la bruja','Capítulo veinte','Capítulo 1.5 - parte 2',
 'Capítulo 1a: Extra','Capítulo 10000: Fuera de rango','Portada','Sinopsis']) {
 const got=formatChapterIndex({title,sectionType:'Capítulo',globalNum:33});
 assert.equal(got.label,'Sección',title);
 assert.equal(got.number,'','Nunca inventar número editorial: '+title);
 assert.equal(got.heading,title);
}
for(const [type,title,heading] of [
 ['Prólogo','Prólogo: Una promesa','Una promesa'],
 ['Epílogo','Epílogo — Final','Final'],
 ['Ilustraciones','Ilustraciones',''],
 ['Créditos','Créditos: Equipo','Equipo'],
 ['Afterword','Afterword',''],
 ['Extra','Extra digital del autor','Extra digital del autor']
]) {
 const v=formatChapterIndex({title,sectionType:type,globalNum:7});
 assert.equal(v.label,type);assert.equal(v.heading,heading);assert.equal(v.number,'');
}
assert.deepEqual(formatChapterIndex({title:'Prólogo: El bosque',sectionType:'Capítulo'}),
 {label:'Prólogo',number:'',heading:'El bosque',normalized:true,typo:false},
 'Detectar secciones especiales antiguas clasificadas como capítulo');
const original=[{title:'Captiulo 1: Una nueva vida',type:'Capítulo'},
 {title:'Capítulo 2: Otro día',type:'Capítulo'},{title:'Prólogo: Comienzo',type:'Prólogo'},
 {title:'El final',type:'Capítulo'},{title:'Capítulo 9',type:'Capítulo',skip:true}];
const snapshot=structuredClone(original);
const scan=scanImportedChapterTitles(original);
assert.equal(scan.total,4);assert.equal(scan.numbered,2);
assert.equal(scan.special,1);assert.equal(scan.typo,1);assert.equal(scan.unrecognized,1);
assert.equal(scan.findings[0].number,'01');
assert.deepEqual(original,snapshot,'El escáner no debe alterar ni títulos ni tipos');
assert.equal(scanImportedChapterTitles([]).total,0);

const ui=readFileSync('src/ui.js','utf8');
const imp=readFileSync('src/studio-importer.js','utf8');
const reader=readFileSync('src/reader.js','utf8');
const css=readFileSync('src/styles.css','utf8');
for(const marker of [
 'const shown = formatChapterIndex({title:c.title,sectionType:c.section_type})',
 'data-chapter-title="${esc(c.title || \'\')}"',
 'href="/leer/${esc(s.slug)}/${c.num}"',
 '<span class="n" aria-hidden="true">${shown.number',
 'data-chapter-display='
])assert(ui.includes(marker),'Ficha pública: '+marker);
assert(!ui.includes('v.format_chapter_titles')&&!ui.includes('ui-ch-global'),
 'La preferencia antigua o el número global no pueden controlar el índice público');
assert(reader.includes('const shown = formatChapterIndex({title:ch.title,sectionType:ch.section_type})'),
 'El lector debe usar la misma numeración editorial');
assert(!reader.includes("ch.section_type === 'Capítulo' || !ch.section_type ? ' ' + ch.num"),
 'El lector sigue mostrando el número global en su cabecera');
for(const marker of [
 'id="imp-scan-titles"','D.scanChapterTitles = e.target.checked',
 'const scanResults = () => scanImportedChapterTitles(ch)',
 'const a=scanImportedChapterTitles(inc)',
 "title:(c.title||'Sin título').slice(0,300)",
 'if(volBefore&&vol)'
])assert(imp.includes(marker),'Importador: '+marker);
assert(!imp.includes('format_chapter_titles')&&!imp.includes('formatChapterTitles'),
 'El escáner no debe guardar preferencias visuales en los volúmenes');
assert(css.includes('.imp-title-switch')&&css.includes('.ui-series-page .ui-ch-display'),
 'Faltan estilos del importador y del índice');
console.log('Índice editorial universal: prefijos, secciones, títulos ambiguos, lector, escaneo voluntario y rutas OK');

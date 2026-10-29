// Fase 1: coherencia editorial de TODAS las superficies públicas, sin escribir en DB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { editorialChapterLabel, editorialChapterDescription, editorialChapterGroup,
 editorialSectionSummary, editorialSectionCounts, genericSectionCount } from '../src/editorial-public-labels.js';

const v2=[
 {title:'Créditos: equipo',section_type:'Créditos',num:24,volume_id:'vol2'},
 {title:'Captiulo 1: La Bruja',section_type:'Capítulo',num:25,volume_id:'vol2'},
 {title:'Capitulo 02 — El encuentro',section_type:'Capítulo',num:26,volume_id:'vol2'},
 {title:'Epílogo: Final',section_type:'Epílogo',num:27,volume_id:'vol2'}
];
const snapshot=structuredClone(v2);
assert.equal(editorialChapterLabel(v2[1]),'Cap. 01');
assert.equal(editorialChapterDescription(v2[1]),'Cap. 01 · La Bruja');
assert.equal(editorialChapterLabel(v2[2]),'Cap. 02');
assert.equal(editorialChapterLabel(v2[0]),'Créditos');
assert.equal(editorialChapterDescription(v2[3]),'Epílogo · Final');
assert.equal(editorialChapterLabel({num:42}),'Sección','Nunca mostrar num sin título');
assert.equal(editorialChapterLabel({title:'El bosque',num:30}),'Sección');
assert.equal(editorialChapterGroup([v2[1],v2[2]]),'Caps. 01–02');
assert.equal(editorialChapterGroup(v2),'4 secciones','No mezclar material preliminar con rango editorial');
assert.equal(editorialChapterGroup([{...v2[1],volume_id:'v1'},{...v2[2],volume_id:'v2'}]),'2 secciones',
 'No unir capítulos de distintos volúmenes');
assert.equal(editorialSectionSummary(v2),'2 capítulos numerados · 2 secciones sin número');
assert.equal(editorialSectionSummary([v2[0]]),'1 sección');
assert.equal(editorialSectionCounts(v2).total,4);
assert.equal(genericSectionCount(268),'268 secciones');
assert.equal(genericSectionCount(1),'1 sección');
assert.deepEqual(v2,snapshot,'Nunca modificar los registros fuente');

const ui=readFileSync('src/ui.js','utf8');
const styles=readFileSync('src/styles.css','utf8');
for(const marker of [
 "const caps = chs => editorialChapterGroup(chs)",
 'continueLabel(p)',
 'Capítulo terminado · revisar lectura',
 'editorialChapterDescription(c)',
 'editorialChapterLabel(progressChapter)',
 'editorialChapterLabel(nextUnread)',
 'editorialSectionSummary(allCh)',
 'editorialSectionSummary(list)',
 'editorialSectionSummary(g.list)',
 'genericSectionCount(s.chapters?.[0]?.count)',
 'Ir al primer capítulo',
 'Leer desde el inicio',
 'Índice de capítulos y secciones'
])assert(ui.includes(marker),'Integración pública incompleta: '+marker);
for(const disallowed of [
 'CAP. ${esc(p.chapter_num)}',
 'Nuevo · cap. ${lc.num}',
 'Último: cap. ${lc.num}',
 'Cap. ${c.num}',
 'Cap. ${nextUnread.num}',
 'cap. ${p.chapter_num}'
])assert(!ui.includes(disallowed),'Número global visible: '+disallowed);
for(const marker of [
 '.ui-series-page .ui-v-actions>.btn:first-child',
 '.ui-series-page .ui-series-actions>.btn:first-child',
 '@media(max-width:370px)'
])assert(styles.includes(marker),'Acciones móviles sin jerarquía: '+marker);
assert(ui.includes('href="/leer/${s.slug}/${n}"') && ui.includes('href="/leer/${esc(s.slug)}/${c.num}"'),
 'No cambiar rutas globales que guardan progreso');
console.log('Fase 1: numeración editorial, secciones/contadores, CTA y rutas invariantes OK');

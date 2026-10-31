// Regresiones Entrega 2: código y datos ficticios; nunca llama a Supabase.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editorialChapterLabel} from '../src/editorial-public-labels.js';
import {normalizeSupportCopy} from '../src/support-display-copy.js';
import {prepareLibrary} from '../src/library-logic.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/entrega2-support-copy-review.sql',import.meta.url),'utf8');

// Ranking usa miniatura en tarjetas pequeñas; no reemplaza portadas principales.
const rankStart=ui.indexOf('id="ob-rank-car"'),rankEnd=ui.indexOf('</section>',rankStart);
assert.ok(rankStart>=0 && rankEnd>rankStart,'Ranking real debe conservarse');
const rank=ui.slice(rankStart,rankEnd);
assert.match(rank,/s\.cover_thumb_path \|\| s\.cover_path/);
assert.doesNotMatch(rank,/s\.cover_path \|\| s\.cover_thumb_path/);
assert.match(ui,/const heroCover = media\(art\)/,'Hero principal conserva portada original');
assert.match(ui,/const coverPath = s\.cover_path \|\| s\.cover_thumb_path/,'Carrusel Continuar conserva su arte');

// Capítulos: num global es ID de navegación/progreso; nunca etiqueta visible.
const samples=[
 [{id:'pre',num:24,title:'Prólogo: Inicio',section_type:'Prólogo',series_id:'s',status:'published'},'Prólogo'],
 [{id:'c1',num:25,title:'Capítulo 1: La Bruja',section_type:'Capítulo',series_id:'s',status:'published'},'Cap. 01'],
 [{id:'c2',num:26,title:'Captiulo 02 — El encuentro',section_type:'Capítulo',series_id:'s',status:'published'},'Cap. 02'],
 [{id:'epi',num:27,title:'Epílogo: Final',section_type:'Epílogo',series_id:'s',status:'published'},'Epílogo'],
 [{id:'none',num:28,title:'Sin prefijo editorial',section_type:'Capítulo',series_id:'s',status:'published'},'Sección']
];
for(const [c,label] of samples)assert.equal(editorialChapterLabel(c),label);
const chapters=samples.map(([c])=>structuredClone(c));
const snapshot=structuredClone(chapters);
const library=prepareLibrary({
 series:[{id:'s',slug:'obra',title:'Obra',published:true}],
 progress:[{series_id:'s',chapter_num:25,pct:.3,updated_at:'2026-10-30T00:00:00Z'}],
 follows:[{series_id:'s'}],readRows:[],chapters
});
assert.equal(library.works[0].resume.num,25,'Navegación se basa en número global');
assert.equal(editorialChapterLabel(library.works[0].resume),'Cap. 01');
assert.deepEqual(chapters,snapshot,'Solo presentación: no modificar registros');
assert.match(app,/\.select\('id,num,title,section_type,vol,volume_id,series_id,publish_at,status,deleted_at'\)/,
  'Biblioteca debe traer section_type sin nuevas consultas');
assert.match(app,/'\/leer\/'\+encodeURIComponent\(w\.s\.slug\)\+'\/'\+chapter\.num/,
  'La ruta conserva num interno');
assert.match(app,/esc\(editorialChapterLabel\(latestChapter\)\)/,'Spotlight utiliza etiqueta editorial');
assert.match(app,/const current=chapter \? editorialChapterLabel\(chapter\)/,'Tarjetas usan etiqueta editorial');
assert.doesNotMatch(app,/const current=chapter \? 'Capítulo '\+chapter\.num/);
assert.match(app,/continueChapterLabels/);
assert.match(app,/\.eq\('series_id', best\.sid\)\.eq\('num', best\.num\)/,
  'Cabecera consulta únicamente capítulo reanudado');
assert.match(app,/e\.href = `\/leer\/\$\{b\.slug\}\/\$\{b\.num\}`/,
  'Cabecera mantiene ruta global');
assert.match(app,/e\.title = `Continuar «\$\{b\.title\}» · \$\{editorialLabel\}`/);
assert.doesNotMatch(app,/e\.title = `Continuar «\$\{b\.title\}» · cap\. \$\{b\.num\}`/);
assert.match(app,/contador de Pendientes indica obras seguidas/);
assert.match(app,/const count = k => L\[k\]\?\.length \?\? null/,
  'Los contadores son obras y no se recalculan');

// Apoyar: cambios estrictamente de texto; dejar intactos los enlaces y Patreon.
const config={
 title:'Apoya a la El Obi del Lector',
 intro:'Si gustan apoyar a este ptoyecto les dejamos las opciones.',
 mode:'both',show:false,links:[{url:'https://example.org',label:'Canal de prueba'}]
};
const original=structuredClone(config);
const fixed=normalizeSupportCopy(config);
assert.equal(fixed.title,'Apoya a El Obi del Lector');
assert.equal(fixed.intro,'Si gustan apoyar a este proyecto les dejamos las opciones.');
assert.equal(fixed.mode,'both');assert.equal(fixed.show,false);
assert.deepEqual(fixed.links,config.links);assert.deepEqual(config,original,'Sin mutar ajustes de la plataforma');
assert.deepEqual(normalizeSupportCopy({title:'Apoya a la comunidad',intro:'Texto personalizado'}),{
 title:'Apoya a la comunidad',intro:'Texto personalizado'});
assert.match(app,/const C = normalizeSupportCopy\(ps\?\.support \|\| \{\}\)/);
assert.doesNotMatch(app,/grid \+ '<h2>Niveles de Patreon<\/h2>' \+ tiers/,
  'No mostrar dos títulos consecutivos de Patreon');
assert.match(app,/Patreon de El Obi del Lector · apoyo voluntario/);
assert.match(app,/sin desbloqueos editoriales/);
assert.match(sql,/where id = 1/);
assert.match(sql,/where id = 1 and position\('ptoyecto'/);
assert.match(sql,/NO ejecutarlo automáticamente/);
console.log('Entrega 2: Ranking, etiquetas editoriales, contadores y Apoyar — PASS, sin backend');

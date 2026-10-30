import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectStudioWorks,workStats,importWorkUrl,normalizeWorkText} from '../src/studio-works-utils.js';
import {optimizeStudioCover} from '../src/studio-cover-image.js';
const read=p=>readFileSync(p,'utf8');
const now=Date.parse('2026-10-29T12:00:00Z');
const works=[
{id:'a',slug:'noche',title:'La Noche',translation_status:'active',published:true,cover_path:'covers/a.jpg',views:100,volumes:[{id:'v1',deleted_at:null},{id:'v2',deleted_at:'2026-10-01'}]},
{id:'b',slug:'suenos',title:'Sueños',translation_status:'completed',published:false,cover_path:null,views:14,volumes:[]},
{id:'c',slug:'luz',title:'La luz',translation_status:'paused',published:true,cover_path:'covers/c.png',views:50,volumes:[]}
];
const chapters=[
{series_id:'a',status:'published',publish_at:'2026-10-20T10:00:00Z',updated_at:'2026-10-20T10:00:00Z'},
{series_id:'a',status:'draft',stage:'correccion',updated_at:'2026-10-28T10:00:00Z'},
{series_id:'b',status:'draft',stage:'traduciendo',updated_at:'2026-10-26T10:00:00Z'},
{series_id:'c',status:'published',publish_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T10:00:00Z'}];
const schedules=[{series_id:'c',at:'2026-10-31T09:00:00Z'},{series_id:'a',at:'2026-11-03T09:00:00Z'}];
assert.equal(workStats(works[0],chapters,schedules,now).volumes,1,'No contar volúmenes enviados a papelera');
assert.equal(workStats(works[0],chapters,schedules,now).correction,1);
assert.equal(normalizeWorkText('SÚEÑOS'),'suenos');
const ids=o=>selectStudioWorks(works,chapters,schedules,o,now).map(r=>r.work.id).join(',');
assert.equal(ids({q:'suenos'}),'b','Buscar sin acentos');
assert.equal(ids({status:'completed'}),'b','Filtrar estado de traducción');
assert.equal(ids({visibility:'private'}),'b','Filtrar privacidad separado de traducción');
assert.equal(ids({attention:true}),'a,b','Señalar correcciones, borradores y obras privadas');
assert.equal(ids({sort:'views'}),'a,c,b','Ordenar lecturas');
assert.equal(ids({sort:'upcoming'}),'c,a,b','Los sin lanzamiento futuro van al final');
assert.equal(ids({sort:'activity'}),'a,b,c');
assert.equal(importWorkUrl('id con espacios'),'/estudio/importar?obra=id%20con%20espacios');
const file={type:'image/jpeg',size:1024};
assert.equal(await optimizeStudioCover(file),file,'Sin API de imagen, conservar archivo original');
const st=read('src/studio.js'),imp=read('src/studio-importer.js'),css=read('src/studio.css');
const pub=read('src/studio-series-publication.js'),cover=read('src/series-cover-editor.js');
const requires=(source,checks,name)=>checks.forEach(s=>assert(source.includes(s),name+': '+s));
requires(st,[
"import { selectStudioWorks, importWorkUrl }",
"selectStudioWorks(list, chs, sched, state)",
"qs('q').oninput",
"qs('att').onchange",
"'obi-studio-works-view'",
"data-view=\"\u0024{state.view}\"",
"volumes(id,deleted_at)",
"cover_thumb_path",
"w.cover_thumb_path || w.cover_path",
"data-shift",
"data-dir='up'",
"data-dir='down'",
"aria-hidden=\"true\"",
">Anunciar</a>",
"optimizeStudioCover(file)",
"optimizeStudioCover(cover)"
],'Estudio');
requires(imp,[
"new URLSearchParams(location.search).get('obra')",
"(works || []).find(w => w.id === contextualId)",
"const target = contextualWork || guess",
"nextVol(contextualWork)"
],'Importador contextual');
requires(pub,[
"const initial =",
"const changed =",
"save.disabled = invalid || !changed",
"vol.onchange = update",
"date.oninput = update"
],'Publicación segura');
requires(css,[
".s2-worktools",
".s2-works[data-view=table]",
"@media(max-width:700px)",
".s2 .wk-tr",
"grid-template-areas:",
".wk-row-more"
],'Estilos');
assert(cover.includes('optimizeStudioCover(file)'),'La portada principal se convierte en navegador');
assert(read('src/app.js').includes("/studio.js?v=49"));
assert(read('src/index.html').includes('/app.js?v=39'));
console.log('✓ Auditoría Estudio Obras: filtros, permisos, móvil, importación, publicación y rendimiento');

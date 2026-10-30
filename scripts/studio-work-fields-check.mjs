// Contrato sin servicios externos: formulario de Nueva obra e Importar.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WORK_GENRES, WORK_DEMOGRAPHICS, WORK_REL_KINDS,
  createWorkData, renderWorkFields, workPayload
} from '../src/studio-work-fields.js';
import { loadRelatedWorks, searchRelatedWorks, normalizeRelatedText, relatedSearchHTML } from '../src/studio-related-works.js';

const demo = WORK_DEMOGRAPHICS.map(x => x[0]);
assert(['Kodomo','Shōnen','Shōjo','Seinen','Josei','Juvenil','Young Adult','New Adult','General'].every(x => demo.includes(x)));
assert(WORK_DEMOGRAPHICS.every(x => x.length === 3 && x[2].length >= 25));
assert(WORK_GENRES.includes('Romance') && WORK_GENRES.includes('Villana') && WORK_GENRES.includes('Dungeon'));
assert.equal(new Set(WORK_GENRES).size, WORK_GENRES.length,'No repetir géneros');
assert(WORK_REL_KINDS.some(x => x[0] === 'secuela') && WORK_REL_KINDS.some(x => x[0] === 'spinoff'));

const seed = createWorkData({
  title:'La novela nueva', original:'原題', demographic:'Josei',
  genres:['Romance','Drama','Fantasía'], tags:['amor','magia'],
  relations:[{id:'00000000-0000-4000-8000-000000000019',kind:'secuela'}],
  adult:true, original_status:'completed', publisher:'Editorial de prueba'
});
const data = workPayload(seed);
assert.equal(data.title,'La novela nueva');
assert.equal(data.demographic,'Josei');
assert.equal(data.translation_status,'active');
assert.equal(data.genres.length,3);
assert.equal(data.relations[0].kind,'secuela');
assert.equal(data.adult,true);
assert.equal(data.publisher,'Editorial de prueba');
assert.equal(data.title_romaji,null);
assert.equal(createWorkData().relations.length,0);
assert.throws(()=>workPayload(createWorkData({title:' '})),/título/);
assert.throws(()=>workPayload(createWorkData({title:'X',genres:['A','B','C','D','E']})),/4 géneros/);

const esc = x => String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const html = renderWorkFields(seed,esc,[{id:seed.relations[0].id,title:'Obra vinculada',teams:{name:'Otro equipo'}}]);
for (const field of ['title','short','original','author','illustrator','demographic','translation_status','original_status','synopsis','adult']) {
  assert(html.includes('data-w="'+field+'"'),'Campo ausente: '+field);
}
assert(html.includes('Tipo de relación') && html.includes('Máximo 1500'));
assert(html.includes('data-related-query') && html.includes('data-related-results'), 'El selector de relación debe permitir búsqueda');
assert(!html.includes('data-w-rel-pick'), 'No usar listas nativas gigantes en el editor de obra');
assert(relatedSearchHTML('test-related').includes('type="search"'), 'El campo debe permitir búsqueda por título o equipo');
assert(html.includes('id="nw-title"'),'La QA con navegador debe poder encontrar el título');
const creator=readFileSync('src/studio.js','utf8');
const importer=readFileSync('src/studio-importer.js','utf8');
assert(creator.includes('renderWorkFields(N,esc,related)'));
assert(importer.includes('renderWorkFields(NW, esc,'));
assert(importer.includes('workMeta = !w ? workPayload(NW) : null'));
assert(!importer.includes("id=\"dt\""),'No debe existir el formulario reducido anterior');

const rows = Array.from({ length: 621 }, (_, i) => ({
  id: 'work-' + i, title: i === 570 ? 'Magía del Fénix' : 'Obra ' + i, teams: { name: i === 570 ? 'Equipo Ónix' : 'Grupo ' + (i % 17) }
}));
const ranges = [];
let privacyFilter = '';
const mockSb = { from: table => {
  assert.equal(table, 'series');
  return {
    select() { return this; },
    or(value) { privacyFilter = value; return this; },
    is(column, value) { assert.equal(column, 'archived_at'); assert.equal(value, null); return this; },
    order() { return this; },
    async range(start, end) { ranges.push([start,end]); return { data: rows.slice(start, end + 1), error: null }; }
  };
}};
const allRelated = await loadRelatedWorks(mockSb, 'team-test');
assert.equal(allRelated.length, 621, 'No truncar el catálogo a 500 ni a una página');
assert.equal(ranges.length, 3, 'La carga debe paginar con rangos seguros');
assert.equal(privacyFilter, 'published.eq.true,team_id.eq.team-test', 'Solo obras públicas o del equipo');
assert.equal(normalizeRelatedText('MÁGIA'),'magia');
assert.equal(searchRelatedWorks(allRelated, 'magia fenix').items[0].id, 'work-570', 'Búsqueda sin acentos');
assert.equal(searchRelatedWorks(allRelated, 'onix').items[0].id, 'work-570', 'Búsqueda por equipo');
assert.equal(searchRelatedWorks(allRelated, 'magia', ['work-570']).total, 0, 'Excluir obras ya relacionadas');
assert.equal(searchRelatedWorks(allRelated, '').items.length, 12, 'Mostrar pocas opciones a la vez');
assert(creator.includes('loadRelatedWorks(sb, T.team.id)'), 'Nueva obra y Datos usan catálogo paginado');
assert(importer.includes('loadRelatedWorks(sb, T.team.id)'), 'Importación usa catálogo paginado');
assert(!creator.includes('.order(\'title\').limit(500)'), 'No truncar las obras nuevas');
console.log('✓ Relaciones: búsqueda accesible, paginación >500, RLS, edición y importación');
console.log('Contrato de ficha compartida: campos, demografías, géneros, relaciones y guardado OK');

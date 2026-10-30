// Contrato sin servicios externos: formulario de Nueva obra e Importar.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WORK_GENRES, WORK_DEMOGRAPHICS, WORK_REL_KINDS,
  createWorkData, renderWorkFields, workPayload
} from '../src/studio-work-fields.js';
import { loadRelatedWorks, searchRelatedWorks, normalizeRelatedText, relatedSearchHTML, sameRelatedWorks, saveWorkWithRelations } from '../src/studio-related-works.js';

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

const seriesId = '00000000-0000-4000-8000-000000000020';
const teamId = '00000000-0000-4000-8000-000000000001';
const relationship = { id: seed.relations[0].id, kind: 'secuela' };
assert(sameRelatedWorks([{kind:'secuela',id:relationship.id}], [relationship]),
  'El orden de las propiedades JSONB no debe causar falsos fallos de guardado');

function makeSeriesDb({ deny = false, wrongUpdate = false, wrongRead = false } = {}) {
  const state = { id:seriesId, team_id:teamId, title:'Antes', relations: [] };
  const writes = [], reads = [];
  const sb = { from(table) {
    assert.equal(table,'series');
    const query = { mode:'read', criteria:{}, fields:'' };
    const chain = {
      update(patch) { query.mode='update';query.patch=patch;return this; },
      select(fields) { query.fields=fields;return this; },
      eq(name, value) { query.criteria[name]=value;return this; },
      async maybeSingle() {
        const permitted = !deny && query.criteria.id === state.id && query.criteria.team_id === state.team_id;
        if (query.mode === 'update') {
          writes.push({ ...query });
          if (!permitted) return { data:null, error:null };
          Object.assign(state,query.patch);
          return { data:{ id:state.id,title:state.title,relations:wrongUpdate ? [] : state.relations },error:null };
        }
        reads.push({ ...query });
        if (!permitted) return {data:null,error:null};
        return { data:{id:state.id,relations:wrongRead ? [] : state.relations},error:null };
      }
    };
    return chain;
  }};
  return { sb, state, writes, reads };
}
{
  const db = makeSeriesDb();
  const saved = await saveWorkWithRelations(db.sb, seriesId, teamId, {title:'Después', relations:[relationship]});
  assert.equal(db.state.title,'Después', 'Los metadatos se guardan en la misma operación');
  assert.deepEqual(db.state.relations,[relationship], 'La relación se escribe en la tabla');
  assert.deepEqual(saved.relations,[relationship], 'La segunda lectura confirma persistencia real');
  assert.equal(db.writes.length,1, 'Una sola actualización atómica de metadatos y relaciones');
  assert.equal(db.reads.length,1, 'Se debe verificar con una segunda lectura independiente');
  assert.deepEqual(db.writes[0].criteria,{id:seriesId,team_id:teamId}, 'La actualización queda acotada al equipo');
}
await assert.rejects(saveWorkWithRelations(makeSeriesDb({deny:true}).sb,seriesId,teamId,{relations:[relationship]}),/permisos/);
await assert.rejects(saveWorkWithRelations(makeSeriesDb({wrongUpdate:true}).sb,seriesId,teamId,{relations:[relationship]}),/no confirmó/);
await assert.rejects(saveWorkWithRelations(makeSeriesDb({wrongRead:true}).sb,seriesId,teamId,{relations:[relationship]}),/no permanecieron/);
await assert.rejects(saveWorkWithRelations(makeSeriesDb().sb,seriesId,teamId,{relations:[relationship,relationship]}),/no es válida/);
assert(creator.includes('relations: RL.map('), 'El botón Guardar datos debe incluir las obras relacionadas');
assert(creator.includes('await saveWorkWithRelations(sb, s.id, T.team.id, patch)'), 'El botón guarda y verifica todas las relaciones');
assert(!creator.includes("id=\"rel-save\""), 'No debe existir un guardado de relaciones separado y confuso');
assert(creator.includes('id="rel-save-all"'), 'Las relaciones necesitan una acción local de guardar todos los cambios');
assert(creator.includes("$('#rel-save-all')?.addEventListener('click', () => $('#wk-savebtn')?.click())"), 'La acción local debe usar el mismo guardado que toda la ficha');
assert(creator.includes('RL.push({ id: x.id, kind: relKind }); mark();'),
  'Agregar una relación debe activar la advertencia de cambios sin guardar');
assert(creator.includes('RL.splice(+x.dataset.rx, 1); mark();'),
  'Quitar una relación debe activar la advertencia de cambios sin guardar');
assert(creator.includes("const pendingQuery = $('#wk-related-search')?.value?.trim()"),
  'Impedir guardar texto buscado sin elegir una obra');
assert(creator.includes("work.relatedSaved ="), 'La confirmación debe sobrevivir a la recarga de Editar datos');
assert(creator.includes('id="wk-rel-save-status"'), 'La ficha debe mostrar estado persistente del guardado');
const auditMigration = readFileSync('supabase/migrations/20261030071500_studio_related_relations_audit.sql','utf8');
assert(auditMigration.includes('after insert or update of relations on public.series'),
  'El registro debe dispararse con cambios de relaciones');
assert(auditMigration.includes('private.log(') && auditMigration.includes('old.relations is not distinct from new.relations'),
  'No registrar falsos movimientos, usar la bitácora existente');
assert(auditMigration.includes('revoke all on function private.audit_series_relations() from public, anon, authenticated'),
  'No exponer ejecución de función privilegiada a clientes');
console.log('✓ Guardado de relaciones: escritura, lectura posterior, RLS denegado y prevención de falsos éxitos');

console.log('Contrato de ficha compartida: campos, demografías, géneros, relaciones y guardado OK');

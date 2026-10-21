// Contrato sin servicios externos: formulario de Nueva obra e Importar.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WORK_GENRES, WORK_DEMOGRAPHICS, WORK_REL_KINDS,
  createWorkData, renderWorkFields, workPayload
} from '../src/studio-work-fields.js';

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
assert(html.includes('id="nw-title"'),'La QA con navegador debe poder encontrar el título');
const creator=readFileSync('src/studio.js','utf8');
const importer=readFileSync('src/studio-importer.js','utf8');
assert(creator.includes('renderWorkFields(N,esc,related)'));
assert(importer.includes('renderWorkFields(NW, esc,'));
assert(importer.includes('workMeta = !w ? workPayload(NW) : null'));
assert(!importer.includes("id=\"dt\""),'No debe existir el formulario reducido anterior');
console.log('Contrato de ficha compartida: campos, demografías, géneros, relaciones y guardado OK');

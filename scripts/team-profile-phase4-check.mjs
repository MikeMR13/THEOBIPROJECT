// Pruebas de Fase 4: composición por equipo, compatibilidad y secciones ordenables.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalize, render, compositionPreset, COMPOSITION_PRESETS,
  COMPOSITION_COLUMNS, SECTION_EMPHASIS, exportTheme, SECTIONS
} from '../src/teampage.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[ch]));
const now = new Date().toISOString();
const source = {
  t: { id:'g', slug:'grupo-demo', name:'Equipo editorial', color:'#f2c230',
    settings: { show_stats:true, show_members:true, show_works:true, show_featured:true } },
  works: [{ id:'w1', slug:'obra', title:'Obra', short:'Obra', chapters:[{count:1}], cover_path:'' }],
  mem: [{ role:'owner', profiles:{username:'Traductor 1'} }],
  recent: [{ id:'c1', kind:'chapter', series_id:'w1', series:{ slug:'obra',title:'Obra' }, chapter:1, title:'Capítulo 1', cover_path:'', at:now, href:'/leer/obra/1' }],
  next: { at:'2027-02-01T12:00:00Z', series:{slug:'obra',title:'Obra'} }
};
const helpers = { esc, media:v=>v, sim:'' };
const show = (design={})=>render(source, design, helpers);
const old = normalize({});
assert.equal(old.composition.columns,'una','Las páginas existentes siguen en una sola columna');
assert.equal(Object.keys(old.composition.emphasis).length,Object.keys(SECTIONS).length);
assert.ok(Object.values(old.composition.emphasis).every(x=>x==='normal'));
assert.deepEqual(old.savedCompositions,[]);
assert.deepEqual(Object.keys(COMPOSITION_PRESETS),['equilibrada','editorial','comunidad']);
assert.deepEqual(Object.keys(COMPOSITION_COLUMNS),['una','dos','auto']);
assert.deepEqual(Object.keys(SECTION_EMPHASIS),['normal','destacado','compacto']);
for (const template of ['revista','clasica','editorial']) {
  const legacy=show({template});
  assert.match(legacy, /class="tp2-composition" data-columns="una"/);
  assert.match(legacy, /data-section="works" data-emphasis="normal"/);
  assert.match(legacy, /data-section="members" data-emphasis="normal"/);
  assert.match(legacy, /href="#grupo-obras"/);
}
for (const key of Object.keys(COMPOSITION_PRESETS)) {
  const preset=compositionPreset(key);
  assert.ok(preset);
  assert.equal(new Set(preset.order).size,Object.keys(SECTIONS).length);
  assert.deepEqual([...preset.order].sort(),Object.keys(SECTIONS).sort());
  assert.match(show({...preset, template:'clasica'}), new RegExp('data-columns="'+preset.composition.columns+'"'));
}
assert.equal(compositionPreset('invalid'),null);
const corrupted=normalize({
  composition: { columns:'evil',emphasis:{works:'danger',featured:'destacado',nosuch:'compacto'} },
  savedCompositions:[
    {id:'c1',name:'  Mi diseño  ',order:['works','works','recent','script'],hidden:['members','bad'],composition:{columns:'dos',emphasis:{recent:'destacado'}}},
    {id:'<script>',name:'Malicioso',order:[],hidden:[]},
    ...Array.from({length:10},(_,i)=>({id:'comp'+i,name:'x'.repeat(100)}))
  ]
});
assert.equal(corrupted.composition.columns,'una');
assert.equal(corrupted.composition.emphasis.works,'normal');
assert.equal(corrupted.composition.emphasis.featured,'destacado');
assert.equal('nosuch' in corrupted.composition.emphasis,false);
assert.equal(corrupted.savedCompositions[0].name,'Mi diseño');
assert.equal(corrupted.savedCompositions[0].composition.columns,'dos');
assert.equal(corrupted.savedCompositions[0].name.length <= 40,true);
assert.equal(corrupted.savedCompositions.length <= 6,true);
assert.ok(corrupted.savedCompositions[0].order.every(k=>k in SECTIONS));
assert.ok(corrupted.savedCompositions[0].hidden.every(k=>k in SECTIONS));

const packed=show({composition:{columns:'dos',emphasis:{featured:'destacado',announce:'compacto'}},
  featured:['obra'],hidden:['members','stats']});
assert.match(packed,/data-columns="dos"/);
assert.match(packed,/data-section="featured" data-emphasis="destacado"/);
assert.doesNotMatch(packed,/data-section="members"/);
assert.doesNotMatch(packed,/data-section="stats"/);
assert.doesNotMatch(packed,/href="#grupo-integrantes"/);
const custom=show({order:['members','recent','works','featured','announce','next','stats'],composition:{columns:'auto',emphasis:{members:'destacado'}}});
assert.ok(custom.indexOf('data-section="members"')<custom.indexOf('data-section="recent"'));
assert.match(custom,/data-columns="auto"/);
const paired=show({featured:['obra'],order:['featured','next','works'],editorial:{featureStyle:'editorial'},composition:{columns:'dos'}});
assert.match(paired,/data-paired="true"/);
assert.equal((paired.match(/id="grupo-lanzamientos"/g)||[]).length,1);
assert.equal((paired.match(/id="grupo-destacadas"/g)||[]).length,1);

const owned=normalize({
  theme:'tinta',
  composition: {columns:'dos',emphasis:{members:'destacado'}},
  savedCompositions:[{id:'comp_owned',name:'Personal',order:['members','works'],hidden:['next'],composition:{columns:'auto',emphasis:{works:'compacto'}}}]
});
assert.equal(owned.savedCompositions[0].composition.emphasis.works,'compacto');
const exported=JSON.parse(exportTheme('Tema limpio',owned));
assert.equal(exported.design.composition,undefined);
assert.equal(exported.design.savedCompositions,undefined);

const studio=readFileSync('src/studio.js','utf8');
const stylesheet=readFileSync('src/studio.css','utf8');
for (const marker of ['data-comp-preset','data-comp-cols','data-comp-emphasis','data-comp-apply','data-comp-remove',
  'pf-comp-save','pf-comp-reset','savedCompositions: d.savedCompositions',
  "TP.compositionPreset('equilibrada')","TP.compositionPreset(b.dataset.compPreset)"]) {
  assert.ok(studio.includes(marker),'Studio sin control '+marker);
}
assert.ok(stylesheet.includes('.pf-comp-emphasis'));
assert.ok(stylesheet.includes('.pf-compose-presets'));
assert.ok(studio.includes("!['order', 'hidden', 'composition', 'savedCompositions'"));

console.log('Perfil grupal Fase 4: presets, columnas, énfasis, orden, guardados y compatibilidad OK');

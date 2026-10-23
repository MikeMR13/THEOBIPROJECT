// Fase 5: orden móvil, apariencia responsive, borradores y compatibilidad.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalize, render, exportTheme, compositionPreset,
  MOBILE_ORDER_MODE, MOBILE_HERO, MOBILE_CARDS, MOBILE_CATALOG, MOBILE_FOLLOW
} from '../src/teampage.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const source = {
  t: { id:'demo',slug:'demo',name:'Equipo móvil',color:'#f2c230',
    settings:{show_works:true,show_members:true,show_stats:true,show_featured:true} },
  works:[{id:'s1',slug:'libro',title:'Obra visible',short:'Obra',chapters:[{count:3}]}],
  mem:[{role:'owner',profiles:{username:'Traductor Uno'}}], recent:[],
  next:{at:'2027-01-01T12:00:00Z',series:{slug:'libro',title:'Obra visible'}}
};
const view = d => render(source,d,{esc,media:v=>v,sim:''});
const legacy=normalize(null);
assert.equal(legacy.mobile.orderMode,'escritorio');
assert.deepEqual(Object.keys(legacy.mobile.order).sort(),Object.keys(legacy.order).sort());
assert.equal(legacy.mobile.hero,'heredado');
assert.equal(legacy.mobile.cards,'heredado');
assert.equal(legacy.mobile.catalog,'heredado');
assert.equal(legacy.mobile.follow,'heredado');
assert.ok(MOBILE_ORDER_MODE.escritorio && MOBILE_HERO.compacto && MOBILE_CARDS.amplio && MOBILE_CATALOG.dos && MOBILE_FOLLOW.ocultar);

const invalid=normalize({ mobile: {
  orderMode:'X',order:['next','unknown','next','works'],
  hero:'javascript',cards:'fake',catalog:'invalid',follow:'inseguro'
}});
assert.equal(invalid.mobile.orderMode,'escritorio');
assert.equal(invalid.mobile.hero,'heredado');
assert.equal(invalid.mobile.cards,'heredado');
assert.equal(invalid.mobile.catalog,'heredado');
assert.equal(invalid.mobile.follow,'heredado');
assert.equal(invalid.mobile.order[0],'next');
assert.equal(invalid.mobile.order[1],'works');
assert.equal(new Set(invalid.mobile.order).size,legacy.order.length);

const custom=normalize({
  order:['featured','next','works','members','recent','announce','stats'],
  mobile:{
    orderMode:'propio',order:['members','works','next','featured','recent','announce','stats'],
    hero:'compacto',cards:'compacto',catalog:'una',follow:'ocultar'
  },
  featured:['libro']
});
assert.equal(custom.order[0],'featured');
assert.equal(custom.mobile.order[0],'members');
assert.equal(custom.mobile.orderMode,'propio');
const markup=view(custom);
assert.match(markup,/data-mobile-hero="compacto"/);
assert.match(markup,/data-mobile-cards="compacto"/);
assert.match(markup,/data-mobile-catalog="una"/);
assert.match(markup,/data-mobile-follow="ocultar"/);
assert.match(markup,/data-mobile-order="propio"/);
assert.match(markup,/data-section="members" data-emphasis="normal" style="--mobile-position:0"/);
assert.match(markup,/data-section="featured" data-emphasis="normal" style="--mobile-position:3"/);
assert.ok(markup.indexOf('data-section="featured"') < markup.indexOf('data-section="members"'), 'El DOM de escritorio no cambia por ordenar móvil');
assert.ok(markup.includes('class="tp2-fbar"'), 'La barra existe para que CSS la gobierne sin romper el seguimiento');

const inherited=view({mobile:{orderMode:'escritorio',hero:'heredado',follow:'heredado'}});
assert.match(inherited,/data-mobile-order="escritorio"/);
assert.match(inherited,/data-mobile-hero="heredado"/);
assert.match(inherited,/data-mobile-follow="heredado"/);
assert.match(inherited,/data-columns="una"/);

const paired=view({featured:['libro'],order:['featured','next','works','members'],
  editorial:{featureStyle:'editorial'},
  mobile:{orderMode:'propio',order:['next','members','featured','works']}});
assert.match(paired,/data-paired="true"/);
assert.match(paired,/--mobile-featured:2;--mobile-next:0/);
assert.equal((paired.match(/id="grupo-lanzamientos"/g)||[]).length,1);
assert.equal((paired.match(/id="grupo-destacadas"/g)||[]).length,1);

const hidden=view({hidden:['members','next'],mobile:{orderMode:'propio',order:['next','members','works','featured']}});
assert.doesNotMatch(hidden,/id="grupo-integrantes"/);
assert.doesNotMatch(hidden,/id="grupo-lanzamientos"/);
const restored=normalize({
  savedCompositions:[{
    id:'comp_mobile',name:'Para móvil',order:['works','members'],hidden:['next'],
    composition:{columns:'dos'},
    mobile:{orderMode:'propio',order:['members','works'],hero:'equilibrado',cards:'amplio',catalog:'dos',follow:'mostrar'}
  }]
});
assert.equal(restored.savedCompositions[0].mobile.hero,'equilibrado');
assert.equal(restored.savedCompositions[0].mobile.order[0],'members');
assert.equal(restored.savedCompositions[0].mobile.follow,'mostrar');
const older=normalize({
  savedCompositions:[{id:'comp_old',name:'Antes',order:['works'],hidden:[],composition:{columns:'dos'}}]
});
assert.equal(older.savedCompositions[0].mobile,undefined,'Las composiciones antiguas no fuerzan ajustes móviles');
assert.ok(compositionPreset('editorial')?.order.length);
assert.equal(JSON.parse(exportTheme('Tema',custom)).design.mobile,undefined);

const teampage=readFileSync('src/teampage.js','utf8');
const studio=readFileSync('src/studio.js','utf8');
const styles=readFileSync('src/studio.css','utf8');
for (const marker of [
  'data-mobile-hero=compacto','data-mobile-cards=compacto','data-mobile-catalog=una',
  'data-mobile-follow=ocultar','data-mobile-order=propio','--mobile-next',
  'data-mobile-key','data-mobile-up','data-mobile-down','pf-mobile-copy',
  'pf-mobile-preview','mobile: d.mobile','saved.mobile ? { mobile: saved.mobile }',
  "UI.dev = 'mobile'"
]) {
  assert.ok((teampage+studio).includes(marker),'Falta control responsive: '+marker);
}
assert.match(styles,/\.pf-mobile-order-buttons button/);
assert.match(studio,/data-dev="mobile"/);
assert.match(studio,/TP\.render\(D, previewDesign/);
console.log('Perfil grupal Fase 5: móvil independiente, vista previa, privacidad, guardados y legado OK');

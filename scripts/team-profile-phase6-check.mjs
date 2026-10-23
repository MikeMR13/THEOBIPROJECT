// Fase 6: pruebas de reconciliación DOM, lectura secuencial y compatibilidad.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindMobileComposition, mobileSequence, normalize, render, exportTheme } from '../src/teampage.js';

assert.deepEqual(mobileSequence(['a','b','c','d'], x => ({a:2,b:0,c:2,d:1}[x])),['b','d','a','c']);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const sample = { t:{name:'Grupo prueba',slug:'grupo',color:'#b57838',settings:{}}, works:[{id:'w',slug:'obra',title:'Obra',chapters:[{count:1}]}], mem:[{role:'owner',profiles:{username:'Traductor'}}], recent:[], next:{at:'2027-01-01T12:00:00Z',series:{slug:'obra',title:'Obra'}} };
const html=render(sample,{featured:['obra'],order:['works','featured','next','members'],editorial:{featureStyle:'editorial'},mobile:{orderMode:'propio',order:['members','featured','works','next']}},{esc,media:x=>x,sim:''});
assert.equal((html.match(/id="grupo-lanzamientos"/g)||[]).length,1);
assert.equal((html.match(/id="grupo-destacadas"/g)||[]).length,1);
assert.ok(html.includes('data-mobile-order="propio"'));

class Node {
  constructor(cls='', section='', props={}) {
    this.cls=cls;this.dataset={...props,section};this.children=[];this.parent=null;this.isConnected=true;
    const vals=new Map();
    this.style={getPropertyValue:key=>vals.get(key)||'',setProperty:(key,val)=>vals.set(key,String(val))};
  }
  detach(){if(this.parent){const list=this.parent.children;const index=list.indexOf(this);if(index>=0)list.splice(index,1);this.parent=null;}}
  append(...nodes){for(const node of nodes){node.detach();this.children.push(node);node.parent=this;}}
  replaceChildren(...nodes){for(const old of this.children)old.parent=null;this.children=[];this.append(...nodes);}
  querySelector(query){
    if(query==='.tp2-editorial-pair') return this.children.find(x=>x.cls==='tp2-editorial-pair')||null;
    if(query==='.tp2-feature-block') return this.children.find(x=>x.cls==='tp2-feature-block')||null;
    if(query==='.tp2-next') return this.children.find(x=>x.cls==='tp2-next')||null;
    return null;
  }
}
const works=new Node('tp2-unit','works'),members=new Node('tp2-unit','members');
const pairUnit=new Node('tp2-unit','featured',{paired:'true',emphasis:'destacado'});
const pair=new Node('tp2-editorial-pair'),featured=new Node('tp2-feature-block'),next=new Node('tp2-next');
pair.append(featured,next);pairUnit.append(pair);
works.style.setProperty('--mobile-position',2);
members.style.setProperty('--mobile-position',0);
pairUnit.style.setProperty('--mobile-featured',1);
pairUnit.style.setProperty('--mobile-next',3);
const comp=new Node('tp2-composition');
comp.dataset.mobileOrder='propio';
comp.append(works,pairUnit,members);
let width=390,observer;
const wrapper={getBoundingClientRect(){return {width}}};
const root={
  isConnected:true,querySelector(q){return q==='.tp2-composition'?comp:null;},
  closest(q){return q==='.tp2w'?wrapper:null;},
  getBoundingClientRect(){return {width}}
};
const origDoc=globalThis.document,origObserver=globalThis.ResizeObserver;
try {
  globalThis.document={createElement:()=>new Node('tp2-unit')};
  globalThis.ResizeObserver=class { constructor(callback){observer=this;this.cb=callback;} observe(node){this.node=node;} disconnect(){this.disconnected=true;} };
  bindMobileComposition(root);
  assert.deepEqual(comp.children.map(x=>x.dataset.section),['members','featured','works','next'],'Orden DOM móvil');
  assert.equal(new Set(comp.children).size,4);
  assert.equal(comp.children.find(x=>x.dataset.section==='featured').children[0],featured);
  assert.equal(comp.children.find(x=>x.dataset.section==='next').children[0],next);
  // Cambiar a escritorio debe restaurar orden y pareja originales, también el orden de TAB.
  width=1024;observer.cb();
  assert.deepEqual(comp.children,[works,pairUnit,members]);
  assert.deepEqual(pair.children,[featured,next]);
  assert.equal(comp.children.length,3);
  // Volver a móvil no debe perder nodos ni generar tarjetas duplicadas.
  width=320;observer.cb();
  assert.deepEqual(comp.children.map(x=>x.dataset.section),['members','featured','works','next']);
  assert.equal(comp.children.length,4);
  root.isConnected=false;observer.cb();assert.equal(observer.disconnected,true);
} finally {
  globalThis.document=origDoc;globalThis.ResizeObserver=origObserver;
}

const legacy=normalize(null);
assert.equal(legacy.mobile.orderMode,'escritorio');
assert.equal(legacy.composition.columns,'una');
const theme=JSON.parse(exportTheme('Solo aspecto',normalize({mobile:{orderMode:'propio'},composition:{columns:'dos'}})));
assert.equal(theme.design.mobile,undefined);
assert.equal(theme.design.composition,undefined);
const src=readFileSync('src/teampage.js','utf8');
assert.ok(!src.includes('.tp2-composition[data-mobile-order=propio] .tp2-unit{order:'),'No reordenar solo con CSS');
assert.ok(src.includes('ResizeObserver'),'Responsive DOM reflow');
assert.ok(src.includes('bindMobileComposition(root)'),'Reconciliación invocada en perfil');
assert.ok(src.includes('aria-label="Secciones del grupo"'),'Navegación etiquetada');
const longDesign=normalize({
  announce:{title:'Avisos de la semana',text:'Aviso de prueba repetido para ver el tamaño del borrador. '.repeat(4)},
  mobile:{orderMode:'propio',order:['next','recent','featured','works','members','announce','stats'],hero:'amplio',cards:'compacto',follow:'mostrar'},
  savedCompositions:Array.from({length:6},(_,i)=>({
    id:'comp_'+i,name:'Composición personalizada de grupo '+i,
    order:['featured','next','works','members','stats','recent','announce'],hidden:i%2?['members']:[],
    composition:{columns:i%2?'dos':'una',emphasis:{works:'destacado',members:'compacto',recent:'destacado'}},
    mobile:{orderMode:'propio',order:['next','recent','works','members','featured','announce','stats'],hero:'compacto',cards:'amplio',catalog:'dos',follow:'mostrar'}
  }))
});
assert.equal(longDesign.savedCompositions.length,6);
const estimatedBytes=new TextEncoder().encode(JSON.stringify(longDesign)).length;
assert.ok(estimatedBytes<19000,'Diseño de prueba excede el margen seguro de guardado: '+estimatedBytes);
const css=readFileSync('src/studio.css','utf8');
assert.ok(css.includes('.pf-oa button{min-width:40px;min-height:40px;'),'Flechas táctiles pequeñas');
assert.ok(src.includes('.tp2-car-nav button{width:44px;height:44px;'),'Carrusel debe tener botones de 44px');
assert.ok(src.includes('#grupo-novedades,#grupo-destacadas,#grupo-anuncios'),'Compensación del menú fijo en navegación');

console.log('Perfil grupal Fase 6: orden DOM, foco móvil, cambios de anchura, pareja editorial y compatibilidad OK');

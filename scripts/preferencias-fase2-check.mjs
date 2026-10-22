// Fase 2 Preferencias — grupos, rutas existentes y controles accesibles.
// Contrato del código real, sin consultas externas ni cuentas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('src/profile.js','utf8');
const extract = term => {
  const i=src.indexOf(term);
  assert(i>=0,'Falta definición: '+term);
  const start=i+term.length, end=src.indexOf(';', start);
  assert(end>start,'Definición incompleta: '+term);
  return vm.runInNewContext(src.slice(start,end));
};
const tabs = extract('const TABS = ');
const groups = extract('const NAV_GROUPS = ');
const keys = tabs.map(([k])=>k);
const flattened=groups.flatMap(([,items])=>items);
assert.equal(keys.length,8,'Conservar ocho rutas');
assert.equal(new Set(keys).size,8,'No duplicar rutas');
assert.deepEqual([...flattened].sort(),[...keys].sort(),'Cada apartado aparece una sola vez');
assert.deepEqual(Array.from(groups, ([l])=>l),['Mi identidad','Mi experiencia','Comunidad','Seguridad y cuenta']);
assert(keys.includes('adulto') && keys.includes('pantalla'),'Conservar slugs originales');
for(const part of [
  '<nav class="pf-nav" aria-label="Secciones de preferencias">',
  'class="pf-nav-group"', 'aria-current="page"',
  'class="pf-mobile-nav"', 'for="pf-mobile-tab"',
  'select id="pf-mobile-tab"', 'optgroup label=', 'k === tab ? \'selected\' : \'\'',
  'if (app.__obiPrefsNavGuard && !app.__obiPrefsNavGuard())',
  'e.target.value = tab', 'C.go(navHref(next))',
  'app.__obiPrefsDispose?.()', 'app.__obiPrefsDispose = cleanup',
  'app.addEventListener(\'change\', selectHandler)'
])assert(src.includes(part),'Falta navegación funcional: '+part);
const css=src.slice(src.indexOf('const CSS = `')+13,src.indexOf('`;',src.indexOf('const CSS = `')));
for(const part of [
  '.pf-nav-title{','.pf-nav a.on,.pf-nav a[aria-current="page"]',
  '@media(max-width:760px){', '.pf-nav{display:none}',
  '.pf-mobile-nav{display:grid;', '.pf-mobile-nav select{width:100%;min-height:48px;',
  '.pf-tg{flex:none;width:48px;height:44px;', '.pf-sw button{width:44px;height:44px;',
  '.pf-fav-remove{display:flex;', 'min-height:44px;',
  '.lc-tabs button{border:0;cursor:pointer;padding:10px 14px;',
  '.pf :is(a,button,input,select,textarea):focus-visible', '.pf-up label:focus-within'
])assert(css.includes(part),'Falta tratamiento táctil o responsive: '+part);
assert(src.includes('aria-pressed="${c === D.accent}"'),'El color activo se anuncia');
for(const part of ['const liveHTML = () =>', 'id="pf-live-card"', 'live.innerHTML = liveHTML()', 'class="pf-editor-preview"', 'D.favs.slice(0, 5)'])
  assert(src.includes(part),'Falta actualización del carnet en tiempo real: '+part);
// Sellos: preservar 32 kanjis distintos y su significado frente al apodo editorial.
const catalogMatch = src.match(/const SEAL_CATALOG = (\[[^\n]+\]);/);
assert(catalogMatch, 'Falta catálogo de sellos');
const catalog = vm.runInNewContext(catalogMatch[1]);
assert.equal(catalog.length,32,'El catálogo debe incluir 32 sellos');
assert.equal(new Set(catalog.map(x => x[0])).size,32,'Cada kanji debe ser único');
assert.equal(catalog.filter(x => x[4]==='Lectura').length,7);
assert.equal(catalog.filter(x => x[4]==='Fantasía').length,10);
assert.equal(catalog.filter(x => x[4]==='Aventura').length,8);
assert.equal(catalog.filter(x => x[4]==='Personalidad').length,7);
assert(catalog.some(([k,n,m])=>k==='魔' && n==='El Mago' && m==='Magia'));
assert(catalog.some(([k,n,m])=>k==='読' && n==='El Lector' && m==='Leer'));
for (const item of catalog) {
  assert.equal(item.length,5);
  assert(item.every(x=>typeof x==='string'&&x.length>0),'Ficha incompleta');
}
for (const required of [
 'const sealMarkup = (kanji, esc) =>', 'sealMarkup(r.kanji, esc)',
 'sealMarkup(D.kanji, esc)', 'data-seal-pick',
 'id="seal-query"', 'id="seal-category"', "normalizeSeal(sealQuery.trim())",
 'id="seal-custom-field"', 'id="kj"', "seal_kanji: D.kanji || null",
 'id="seal-clear"', 'max-height:380px', 'aria-pressed="${D.kanji === k}"',
 'details><summary class="lc-kj"'
]) assert(src.includes(required),'Falta componente de sellos: '+required);
console.log('Sellos: 32 kanjis, apodos, búsqueda, categorías, personalización y descripción — OK');

console.log('Preferencias fase 2: rutas, grupos, selector móvil, foco y objetivos táctiles — OK');

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
  '.pf-favs .pf-x{position:absolute;', 'min-width:44px;min-height:44px;',
  '.lc-tabs button{border:0;cursor:pointer;padding:10px 14px;',
  '.pf :is(a,button,input,select,textarea):focus-visible', '.pf-up label:focus-within'
])assert(css.includes(part),'Falta tratamiento táctil o responsive: '+part);
assert(src.includes('aria-pressed="${c === D.accent}"'),'El color activo se anuncia');
console.log('Preferencias fase 2: rutas, grupos, selector móvil, foco y objetivos táctiles — OK');

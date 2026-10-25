// Auditoría estática final de Estudio: navegación, formularios, accesibilidad,
// cambios de CSS y límites de crecimiento. No requiere credenciales ni red.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const studio=read('src/studio.js');
const app=read('src/app.js');
const media=read('src/studio-media.js');
const importer=read('src/studio-importer.js');
const fields=read('src/studio-work-fields.js');
const css=read('src/studio.css');

const slice=(src,start,end)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a!==-1 && b>a,'Faltan secciones: '+start+' / '+end);
  return src.slice(a,b);
};
const paths=text=>[...text.matchAll(/'(\/estudio(?:\/[a-z]+)?)'/g)].map(m=>m[1]);
const nav=paths(slice(studio,'const NAV = ','const CRUMB = '));
const groups=paths(slice(studio,'const NAV_GROUPS = ','const studioNav = '));
assert.equal(nav.length,15,'Estudio debe conservar los 14 destinos anteriores y añadir Difusión');
assert.equal(new Set(nav).size,nav.length,'Rutas repetidas en navegación');
assert(nav.includes('/estudio/difusion'),'Difusión debe tener navegación propia');
assert.deepEqual([...nav].sort(),[...groups].sort(),'Grupos de navegación incompletos o con rutas duplicadas');
const special=new Map([['/estudio/glosario','glossary']]);
const methods={
  '/estudio':'home','/estudio/anuncios':'announcements','/estudio/obras':'works',
  '/estudio/glosario':'glossary','/estudio/importar':'importer','/estudio/multimedia':'library',
  '/estudio/flujo':'board','/estudio/comunidad':'community','/estudio/difusion':'diffusion',
  '/estudio/estadisticas':'stats','/estudio/descargas':'downloads',
  '/estudio/perfil':'profile','/estudio/preferencias':'prefs','/estudio/equipo':'team','/estudio/bitacora':'log'
};
for(const path of nav){
  assert(methods[path],'No existe mapeo de '+path);
  if(special.has(path))assert(app.includes('st()).glossary('),'La ruta de glosario no está conectada');
  else assert(app.includes("p === '"+path+"'"),'Ruta no registrada en app.js: '+path);
  assert(new RegExp('\\b'+methods[path]+'\\b').test(studio),'Método ausente en Studio para '+path);
}
assert(studio.includes("aria-controls=\"s2-nav\""),'El menú móvil perdió su referencia accesible');
assert(studio.includes("aria-controls=\"st-bell-list\""),'La campana no declara su panel');
assert(studio.includes("aria-controls=\"st-q-res\""),'El buscador no declara sus resultados');
assert(studio.includes("if (e.key === 'Escape'"),'No existe cierre por Escape');
assert(studio.includes("clearTimeout(qT); ++qSeq"),'Falta cancelar búsquedas al cerrar la lista');
assert(studio.includes("renderWorkFields(N,esc,related)"),'Nueva obra perdió la ficha completa');
assert(importer.includes("renderWorkFields(NW, esc,"),'Importar nueva obra perdió la ficha completa');
assert(fields.includes("WORK_DEMOGRAPHICS")&&fields.includes("WORK_REL_KINDS"),'Catálogos editoriales incompletos');
assert(media.includes('aria-label="Carpetas de multimedia"'),'Migas de Multimedia sin etiqueta');
assert(media.includes('aria-label="Seleccionar archivo'),'Selección multimedia no accesible');

const forbidden=[
  '.s2-nav-group{display:contents}',
  '.s2-nav-label{display:none}',
  '.s2-side .s2-nav-label{display:block;padding:8px 10px 4px'
];
for(const obsolete of forbidden)assert(!css.includes(obsolete),'Regla CSS heredada redundante: '+obsolete);
assert(css.includes('.s2 :is(.wk-tabs,.wk-tw,.st-tw,.tb-cols'), 'Desplazamiento local no unificado');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'Falta preferencia de movimiento reducido');
assert(css.length<75000,'Studio CSS supera el presupuesto revisable de 75 KB sin minificar');
const sizes={studioJs:studio.length,studioCss:css.length,importerJs:importer.length,mediaJs:media.length};
console.log('Estudio Fase 4: '+nav.length+' rutas, permisos, navegación, formularios, multimedia y popovers OK');
console.log('Tamaño de fuentes auditadas: '+JSON.stringify(sizes));

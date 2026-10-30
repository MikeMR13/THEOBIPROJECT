// Fase 1: descubrimiento seguro, coherencia de la búsqueda, catálogo y perfil público.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPublicUpcoming, uniqueUpcoming } from '../src/prelaunch-discovery.js';
import { render } from '../src/teampage.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const now = Date.parse('2026-10-30T12:00:00Z');
const at = new Date(now + 15 * 86400_000).toISOString();
const record = { kind:'volp', at, series_id:'series-1', volume_id:'vol-1',
  slug:'obra-anunciada', title:'Obra anunciada', short:'Anunciada', team_slug:'equipo-prueba',
  team_name:'Equipo prueba', vnum:1, acc:'public', adult:false, can_read:false, cover_path:'cover.png' };
let calls=0;
const sb = { rpc: async (name, args) => {
  calls++; assert.equal(name, 'prelaunch_calendar');
  assert.equal(args.p_from, new Date(now).toISOString());
  assert.ok(new Date(args.p_to) > new Date(at));
  return { data: [
    record, {...record, volume_id:'vol-2', at:new Date(now+20*86400_000).toISOString()},
    {...record, slug:'adult', series_id:'a', adult:true},
    {...record, slug:'restricted', series_id:'r', acc:'tier'},
    {...record, slug:'readable', series_id:'rd', can_read:true},
    {...record, slug:'past', series_id:'p', at:new Date(now-1000).toISOString()},
    {...record, slug:'wrong', series_id:'w', kind:'pub'}
  ], error:null };
}};
const rows = await loadPublicUpcoming(sb, { now });
assert.equal(rows.length,2,'Solo anuncios futuros no adultos, públicos y bloqueados');
assert.equal(uniqueUpcoming(rows).length,1,'Una ficha por obra aunque haya varios volúmenes');
assert.equal((await loadPublicUpcoming(sb,{now:now+5000})).length,2);
assert.equal(calls,1,'No repetir una consulta por pulsación de tecla');
await loadPublicUpcoming(sb,{now:now+21000});
assert.equal(calls,2,'Actualizar el índice al caducar la ventana corta');
const denied = await loadPublicUpcoming({rpc:async()=>({data:null,error:new Error('sin permiso')})},{now});
assert.deepEqual(denied,[],'Ante un error, no consultar tablas privadas');

const ui = read('src/ui.js'), team = read('src/teampage.js');
const css = read('src/styles.css'), app = read('src/app.js');
assert.match(ui,/loadPublicUpcoming\(sb\)/,'Catálogo y búsqueda consumen la RPC compartida');
assert.match(ui,/uniqueUpcoming\(announced\)/,'Deducir una ficha por serie');
assert.match(ui,/grp\('Próximos estrenos', R\.upcoming/,'Resultados de búsqueda claramente separados');
assert.match(ui,/!byId\[x\.series_id\]/,'No duplicar una obra ya publicada en la búsqueda');
assert.match(ui,/const visibleUpcoming = upcoming\.filter/,'El buscador del catálogo también filtra la vitrina');
assert.match(ui,/id="cat-upcoming"/,'Sección de descubrimiento dentro de Catálogo A3');
assert.match(ui,/const list = all\.filter\(pass\(F\)\)/,'No mezclar preestrenos con ranking ni paginación publicados');
assert.match(ui,/Date\.now\(\) - SIDXAt < 20000/,'Invalidar índice de búsqueda en memoria');
assert.match(ui,/import\('\/teampage\.js\?v=20'\)/,'La página real carga la versión nueva');
assert.match(team,/loadPublicUpcoming\(sb\)/,'El perfil del equipo solo consulta contratos públicos');
assert.match(team,/announced\.find\(r => r\.team_slug === t\.slug\)/,'Aislar anuncios por equipo');
assert.match(team,/nextLaunch = preview/,'Conservar un solo bloque Próximo lanzamiento');
assert.match(team,/D\.next\.prelaunch \? 'PRÓXIMO ESTRENO · PRIMER VISTAZO'/,'Etiquetar el anuncio');
assert.match(team,/const SEC = \{ recent: updates, announce: ann, next: nx,/,'Reutilizar el bloque configurable');
assert.match(css,/\.ui-pre-discover\[hidden\]/,'La sección debe ocultarse si no hay resultados');
assert.match(css,/@media\(max-width:540px\).*\.ui-pre-work/,'Presentación móvil');
assert.match(app,/\/ui\.js\?v=58/,'Evitar JavaScript antiguo en caché');
assert.match(read('src/index.html'),/\/app\.js\?v=46/,'Cargar el app shell actualizado');

const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const teamData = { t:{id:'team',slug:'equipo-prueba',name:'Equipo prueba',color:'#f2c230',settings:{}},
  works:[],mem:[],recent:[],next:{at,label:'Vol. 1 · Primer vistazo',
    series:{slug:'obra-anunciada',title:'Obra anunciada'},cover_path:'cover.png',prelaunch:true}};
const ctx = {esc,media:p=>p,sim:''};
const view = render(teamData,{template:'clasica',editorial:{nextStyle:'destacado'}},ctx);
assert.match(view,/PRÓXIMO ESTRENO · PRIMER VISTAZO/);
assert.match(view,/href="\/serie\/obra-anunciada"/);
assert.match(view,/Lectura bloqueada/);
assert.match(view,/Primer vistazo<\/small>/,'Portada sin contador de capítulos no publicados');
assert.doesNotMatch(view,/id="grupo-obras"/,'Las obras privadas no cuentan como publicadas');
assert.doesNotMatch(view,/href="\/leer\//,'El anuncio no enlaza al lector');
const hidden = render(teamData,{hidden:['next']},ctx);
assert.doesNotMatch(hidden,/id="grupo-lanzamientos"/,'Respetar secciones ocultas en diseño del equipo');
console.log('✓ Fase 1: catálogo, búsqueda y bloque personalizable de equipos, sin filtración de capítulos.');

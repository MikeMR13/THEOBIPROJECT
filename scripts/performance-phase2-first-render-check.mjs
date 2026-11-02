// Fase 2 rendimiento: orden de primer render y carreras de conteos/créditos.
// Solo usa datos ficticios: jamás solicita el backend de producción.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicSectionCounts } from '../src/public-section-counts.js';
import { attachPublicCredits } from '../src/public-collaboration-credits.js';

const ui = readFileSync('src/ui.js', 'utf8');
const homeStart = ui.indexOf('  async function home(){');
const homeEnd = ui.indexOf('  function heroSlide(', homeStart);
const catStart = ui.indexOf('  async function catalog(){');
const catEnd = ui.indexOf('  // ---------- Lanzamientos ----------', catStart);
assert(homeStart >= 0 && homeEnd > homeStart && catStart > homeEnd && catEnd > catStart,
  'No se encontraron las vistas Inicio y Catálogo');
const home = ui.slice(homeStart, homeEnd), cat = ui.slice(catStart, catEnd);
const at = (src, str) => { const i = src.indexOf(str); assert(i >= 0, 'No se encontró: ' + str); return i; };
const painted = at(home, 'app.innerHTML = \x60<div class="ob-page">');
for (const req of [
  ['const festival = () => import(', 'festival().then('],
  ["const trendRequest = () => sb.from('rankings')", 'trendRequest()'],
  ['const teamRequest = () => teamHighlights()', 'teamRequest()']
]) {
  assert(at(home, req[0]) < painted && at(home, req[1]) > painted,
    'Consulta complementaria ejecutada antes del HTML de Inicio: ' + req[1]);
}
assert(at(home, 'const [FD, pr, VR] = await Promise.all([') < painted,
  'No se deben mostrar obras antes del permiso +18 y los volúmenes');
assert(at(home, 'await softWait(creditsRequest, null, 650);') < painted,
  'Los créditos deben comenzar antes del dibujo, pero no bloquearlo indefinidamente');
assert(at(home, 'void creditsRequest.then(() => {') > painted,
  'Los créditos de los colaboradores deben actualizarse después del primer dibujo');

assert(at(cat, '    draw();\n    // Mostrar primero las obras') < at(cat, 'const [counted] = await Promise.all(['),
  'Los conteos públicos nunca deben bloquear el primer dibujo del catálogo');
assert(cat.includes("SERIES.replace(',chapters(count),volumes(count)', '')"),
  'La primera consulta no debe depender de conteos costosos');
assert.match(cat, /const \[counted\] = await Promise\.all\(\[\s*publicSectionCounts\(sb, publicRows\),\s*attachPublicCredits\(sb, publicRows\)/,
  'Conteos y créditos deben ejecutarse en paralelo');
assert.match(cat, /publicCredits: publicRows\[i\]\.publicCredits, teams: publicRows\[i\]\.teams/,
  'Las copias del conteo deben preservar créditos de colaboración');
assert.match(cat, /let upcoming = \[\];/,
  'Próximamente no debe detener el primer render');
assert(at(cat, 'const paintUpcoming = () =>') < at(cat, 'const draw = () =>'),
  'Se debe aislar el pintado de próximos estrenos');
assert(at(cat, 'loadPublicUpcoming(sb).then(') > at(cat, "    draw();\n    // Mostrar primero las obras"),
  'Los estrenos deben consultarse después de dibujar las tarjetas');
assert.match(cat, /app\.querySelector\('#cat-upcoming'\) !== upcomingSlot/,
  'No hidratar el catálogo después de salir de la ruta');
assert.match(cat, /uniqueUpcoming\(announced\)\.filter\(x => !hidS\(x\)\)/,
  'Los estrenos deben conservar filtros de preferencias y deduplicación');
assert.doesNotMatch(cat.slice(0,at(cat, 'const [counted]')), /loadPublicUpcoming\(sb\)/,
  'Una consulta de preestrenos no puede formar parte de la espera inicial');

// Simular una RPC de conteo que termina antes que los créditos. Ambas tienen
// que arrancar juntas; los datos públicos finales deben ser correctos.
const deferred = () => { let resolve; const promise = new Promise(ok => { resolve = ok; }); return { promise, resolve }; };
const counts = deferred(), credits = deferred();
const requested = [];
const sb = { rpc(name) {
  requested.push(name);
  if (name === 'home_feed') return counts.promise;
  if (name === 'series_public_credits') return credits.promise;
  throw new Error('RPC inesperada: ' + name);
} };
const publicRows = [{ id:'a', chapters:[{count:100}], team_id:'primaria',
  teams:{name:'Equipo principal',slug:'principal'} }];
const joined = Promise.all([
  publicSectionCounts(sb, publicRows),
  attachPublicCredits(sb, publicRows)
]);
await Promise.resolve(); await Promise.resolve();
assert(requested.includes('home_feed') && requested.includes('series_public_credits'),
  'Conteos y créditos no se dispararon concurrentemente');
counts.resolve({data:{series:[{id:'a',chapters:[{count:8}]}]}});
await Promise.resolve(); await Promise.resolve();
credits.resolve({data:[{series_id:'a',team_id:'primaria',name:'Equipo principal',slug:'principal',is_primary:true},
  {series_id:'a',team_id:'colab',name:'Equipo invitado',slug:'invitado',is_primary:false}]});
const [counted] = await joined;
const all = counted.map((row,i) => row === publicRows[i] ? row :
  {...row,publicCredits:publicRows[i].publicCredits,teams:publicRows[i].teams});
assert.equal(all[0].chapters[0].count,8,'El conteo público debe prevalecer');
assert.equal(all[0].publicCredits.length,2,'El crédito de colaboración se perdió por la carrera');
assert.equal(all[0].teams.name,'Equipo principal','El crédito principal debe conservarse');
assert.equal(publicRows[0].chapters[0].count,100,'No se deben mutar conteos de la respuesta base');
console.log('✓ Fase 2: solicitudes no críticas diferidas; conteos y créditos concurrentes; +18, filtros y navegación conservados');

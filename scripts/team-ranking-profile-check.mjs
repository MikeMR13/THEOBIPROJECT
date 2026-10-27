// Pruebas de comportamiento real del ranking mostrado dentro de perfiles de equipo.
// Solo se simula el repositorio de datos; se ejecuta la función de ui.js sin red ni Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const start = source.indexOf('  async function teamRank(root, teamId, insertRanking){');
const end = source.indexOf('\n  // ---------- página pública del equipo', start);
assert(start >= 0 && end > start, 'Debe existir teamRank antes de la página pública');
const actualFunction = source.slice(start, end).trim();
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const factory = new Function('sb', 'rkCss', 'esc', 'ago', 'media', 'return (' + actualFunction + ');');

async function render(works, rankings, options = {}) {
  let output = '', cssCalls = 0, rankingColumns = '';
  const root = { isConnected: true };
  const sb = {
    from(table) {
      assert(['series', 'rankings'].includes(table), 'Solo se consultan obras y rankings');
      const chain = {
        select(cols) { if (table === 'rankings') rankingColumns = cols; return chain; },
        eq() { return chain; }, lte() { return chain; }, in() { return chain; },
        order() { return Promise.resolve({ data: rankings, error: options.rankingError || null }); },
        then(resolve, reject) {
          return Promise.resolve({ data: works, error: options.worksError || null }).then(resolve, reject);
        }
      };
      return chain;
    }
  };
  const fn = factory(sb, () => { cssCalls++; }, esc, () => 'hace 2 horas', x => '/covers/' + x);
  await fn(root, 'team-1', (_root, html) => { output = html; });
  return { html: output, cssCalls, rankingColumns };
}

const works = [
  { id: 'a', slug: 'obra-a', title: 'Primera obra', cover_path: 'a.jpg' },
  { id: 'b', slug: 'obra-b', title: 'Segunda & tercera', cover_path: 'b.jpg' },
  { id: 'c', slug: 'obra-c', title: 'Obra nueva', cover_path: '' },
  { id: 'd', slug: 'obra-d', title: 'Obra estable', cover_path: '' }
];
const rankings = [
  { series_id: 'a', pos: 8, prev_pos: 12, score: 1248, computed_at: '2026-10-27T12:00:00Z' },
  { series_id: 'b', pos: 23, prev_pos: 19, score: 37, computed_at: '2026-10-27T12:00:00Z' },
  { series_id: 'c', pos: 35, prev_pos: null, score: 1, computed_at: '2026-10-27T12:00:00Z' },
  { series_id: 'd', pos: 50, prev_pos: 50, score: 6, computed_at: '2026-10-27T12:00:00Z' }
];
const r = await render(works, rankings);
assert(r.rankingColumns.includes('prev_pos') && r.rankingColumns.includes('score') && r.rankingColumns.includes('computed_at'), 'Consultar movimiento, lecturas y actualización');
assert(r.html.includes('Nuestras obras en el Top 50'), 'Título accesible y sin ambigüedad');
assert(r.html.includes('Más leídas de la semana · Ranking general de El Obi'), 'El Top 50 es global, no interno');
assert(r.html.includes('/ranking'), 'Conservar enlace al ranking público');
assert(r.html.includes('1,248 lecturas · 7 días'), 'Mostrar lecturas semanales con formato es-MX');
assert(r.html.includes('1 lectura · 7 días'), 'Respetar singular');
assert(r.html.includes('▲ 4') && r.html.includes('Subió 4 puestos'), 'Movimiento ascendente desde la actualización anterior');
assert(r.html.includes('▼ 4') && r.html.includes('Bajó 4 puestos'), 'Movimiento descendente desde la actualización anterior');
assert(r.html.includes('tp2-rkmv new') && r.html.includes('Nuevo'), 'Distinguir entradas al Top 50');
assert(r.html.includes('tp2-rkmv same') && r.html.includes('Sin cambios'), 'Distinguir puestos estables');
assert(r.html.includes('Puesto 50 de 50 · general'), 'Mostrar siempre la posición global');
assert(r.html.includes('Segunda &amp; tercera'), 'Escapar los títulos');
assert(!r.html.includes('Segunda & tercera</b>'), 'Sin título crudo');
assert(r.html.includes('object-fit') === false, 'El CSS no se debe escribir dentro de HTML');
assert(r.html.includes('cargar') === false, 'No confundir posición con lectura');
assert(r.html.includes('se recalcula cada 6 horas'), 'Informar frecuencia de actualización');
assert(r.html.includes('Lecturas únicas por lector o dispositivo y día'), 'Precisar la métrica semanal');
assert(r.html.includes('loading="lazy" decoding="async"'), 'Conservar imágenes diferidas');
assert.equal(r.cssCalls, 1, 'Estilos cargados solo cuando hay posiciones');

const baseline = await render(works.slice(0, 1), [{ series_id:'a', pos: 1, prev_pos:null, score: 20 }]);
assert(!baseline.html.includes('tp2-rkmv new'), 'Sin instantánea anterior no se debe inventar una subida o entrada nueva');
assert(!baseline.html.includes('desde la última actualización'), 'No se presume historial inexistente');
const absent = await render(works, [{ series_id:'a', pos: 51, prev_pos:55, score: 5 }]);
assert.equal(absent.html, '', 'Solo se muestran los cincuenta primeros');
assert.equal((await render(works, [])).html, '', 'Sin obras en el Top 50 no aparece sección');
assert.equal((await render([], rankings)).html, '', 'Sin obras publicadas no aparece sección');
assert.equal((await render(works, rankings, { rankingError: new Error('network') })).html, '', 'Error de consulta no revela datos incoherentes');
assert.equal((await render(works, rankings, { worksError: new Error('network') })).html, '', 'Error en obras no revela datos incoherentes');

const cssStart = source.indexOf('const RK_CSS = `'), cssEnd = source.indexOf('`;', cssStart);
assert(cssStart >= 0 && cssEnd > cssStart, 'Existe CSS de ranking');
const css = source.slice(cssStart, cssEnd);
for (const selector of ['.tp2-rki-metrics', '.tp2-rkmv.up', '.tp2-rkmv.down', '.tp2-rkmv.new', '.tp2-rki .cv img']) {
  assert(css.includes(selector), 'Falta el selector visual ' + selector);
}
assert(css.includes('object-fit:contain'), 'Las portadas no deben quedar recortadas');
assert(css.includes('@container(max-width:700px)'), 'El ranking se adapta al ancho del equipo');
assert(source.includes("insertRanking(root, `<section class=\"tp2-sec tp2-rk\""), 'La nueva tarjeta reutiliza la inserción asíncrona corregida');
console.log('✓ Ranking del equipo: Top 50 global, lecturas, movimientos, historial vacío y responsive');

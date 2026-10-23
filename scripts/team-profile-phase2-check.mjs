// Regresiones editoriales para el perfil público del grupo.
import assert from 'node:assert/strict';
import { normalize, render, exportTheme } from '../src/teampage.js';
import { selectTeamUpdates, loadTeamUpdates } from '../src/team-updates.js';

const now = Date.parse('2026-10-23T16:00:00Z');
const pub = '2026-10-22T10:00:00Z', future = '2026-11-01T10:00:00Z';
const publicWorks = [
  { id: 's1', slug: 'obra-uno', title: 'Obra Uno', short: 'Uno', cover_path: 'public/uno.jpg', chapters: [{ count: 5 }] },
  { id: 's2', slug: 'obra-dos', title: 'Obra Dos', cover_path: 'public/dos.jpg', chapters: [{ count: 4 }] }
];
const chapters = [
  { id: 'c1', series_id: 's1', volume_id: 'v1', vol: 1, num: 1, title: 'Capítulo Uno', status: 'published', publish_at: '2026-10-22T10:04:00Z' },
  { id: 'c2', series_id: 's1', volume_id: 'v2', vol: 2, num: 2, title: 'Capítulo Dos', status: 'published', publish_at: '2026-10-21T10:00:00Z' },
  { id: 'c3', series_id: 's2', vol: 3, num: 7, title: 'Capítulo Tres', status: 'published', publish_at: '2026-10-20T10:00:00Z' },
  { id: 'c4', series_id: 's1', num: 99, title: 'Borrador', status: 'draft', publish_at: pub },
  { id: 'c5', series_id: 'hidden', num: 100, title: 'No público', status: 'published', publish_at: pub },
  { id: 'c6', series_id: 's1', num: 101, title: 'Futuro', status: 'published', publish_at: future },
  { id: 'c7', series_id: 's1', num: 102, title: 'Sin fecha', status: 'published', publish_at: null }
];
const volumes = [
  { id: 'v1', series_id: 's1', num: 1, title: 'Volumen 1', status: 'published', announced_at: pub, published_at: pub },
  { id: 'v2', series_id: 's1', num: 2, title: 'Volumen sin anuncio', status: 'published', announced_at: null, published_at: pub },
  { id: 'v3', series_id: 's2', num: 3, title: 'Programado', status: 'published', announced_at: pub, published_at: future },
  { id: 'v4', series_id: 'hidden', num: 4, title: 'Privado', status: 'published', announced_at: pub, published_at: pub },
  { id: 'v5', series_id: 's1', num: 5, title: 'Sin publicar', status: 'draft', announced_at: pub, published_at: pub },
  { id: 'v6', series_id: 's1', num: 6, title: 'Anuncio futuro', status: 'published', announced_at: future, published_at: pub }
];
const recent = selectTeamUpdates(chapters, volumes, publicWorks, now);
assert.deepEqual(recent.map(x => x.id), ['v1', 'c2', 'c3']);
assert.equal(recent[0].kind, 'volume');
assert.equal(recent[1].href, '/leer/obra-uno/2');
assert.ok(recent.every(x => x.series_id !== 'hidden'));
assert.ok(recent.every(x => x.time <= now));
assert.equal(selectTeamUpdates(chapters, volumes, [], now).length, 0);

// Comprobar contratos de consulta: filtrado del servidor y límite para equipos muy grandes.
function query(table) {
  const chain = {
    select(){ return this; }, in(){ return this; }, eq(){ return this; }, is(){ return this; },
    not(){ return this; }, lte(){ return this; }, order(){ return this; },
    limit(){ return Promise.resolve({ data: table === 'chapters' ? chapters : volumes }); }
  };
  return chain;
}
const sampleSb = { from(table){ assert.ok(['chapters', 'volumes'].includes(table)); return query(table); } };
assert.deepEqual((await loadTeamUpdates(sampleSb, publicWorks, new Date(now))).map(x => x.id), ['v1', 'c2', 'c3']);
assert.deepEqual(await loadTeamUpdates(sampleSb, [], new Date(now)), []);

const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = {
  t: { id: 'g', name: 'Grupo', slug: 'grupo', color: '#f2c230', settings: { show_featured: true } },
  works: publicWorks, mem: [], next: { at: future, series: { slug: 'obra-uno', title: 'Obra Uno' }, label: 'Volumen 2' },
  recent
};
const ctx = { esc, media: v => v, sim: '' };
const display = (design = {}, data = D) => render(data, design, ctx);
const def = normalize(null);
assert.deepEqual(def.editorial, { featureStyle: 'normal', nextStyle: 'normal', recentStyle: 'cuadricula', recentKind: 'ambos', recentCount: 4 });
assert.equal(def.layout.navRecent, true);
assert.equal(normalize({ editorial: { recentCount: 100, recentKind: 'fuera', recentStyle: 'x' } }).editorial.recentCount, 4);

for (const template of ['revista','clasica','editorial']) {
  const design = { template, featured: ['obra-uno'], editorial: { featureStyle: 'editorial', nextStyle: 'destacado', recentCount: 3, recentStyle: 'carrusel' } };
  const html = display(design);
  assert.match(html, /class="tp2-updates-sec" /); // no duplicación
  assert.match(html, /data-view="carrusel"/);
  assert.match(html, /href="#grupo-novedades"/);
  assert.match(html, /tp2-next-feature/);
  assert.match(html, /data-feature="editorial"/);
  assert.match(html, /class="tp2-feature-block"/);
}
const volumesOnly = display({ editorial: { recentKind: 'volumen', recentStyle: 'lista' } });
assert.match(volumesOnly, /data-view="lista"/);
assert.match(volumesOnly, /Volumen 1/);
assert.doesNotMatch(volumesOnly, /Capítulo Dos/);
const chaptersOnly = display({ editorial: { recentKind: 'capitulo' } });
assert.doesNotMatch(chaptersOnly, /Volumen 1/);
assert.match(chaptersOnly, /Capítulo Dos/);
const hidden = display({ hidden: ['recent','next'] });
assert.doesNotMatch(hidden, /id="grupo-novedades"/);
assert.doesNotMatch(hidden, /href="#grupo-novedades"/);
assert.doesNotMatch(hidden, /id="grupo-lanzamientos"/);
const empty = display({}, { ...D, recent: [], next: null });
assert.doesNotMatch(empty, /href="#grupo-novedades"/);
const featured = display({ featured: ['obra-uno'], order: ['featured','next','recent'], editorial: { featureStyle: 'editorial' } });
assert.match(featured, /class="tp2-editorial-pair"/);
const theme = JSON.parse(exportTheme('Grupo', normalize({ editorial: { recentCount: 8 } })));
assert.equal(theme.design.editorial, undefined);
console.log('Perfil grupal Fase 2: datos públicos, novedades, filtros, 3 plantillas, menú y temas OK');

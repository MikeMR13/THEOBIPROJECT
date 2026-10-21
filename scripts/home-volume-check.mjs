// Pruebas de regresión: inicio editorial, capítulos sueltos y volúmenes publicados completos.
import assert from 'node:assert/strict';
import { homeReleaseOverview } from '../src/home-releases.js';

const NOW = Date.parse('2026-10-21T18:00:00Z');
const series = ['a', 'b', 'c'].map(id => ({ id, title: id }));
const ch = (id, num, date) => ({ series_id: id, num, publish_at: date });
const vol = (id, num, date, announced = date, status = 'published') => ({ id: id + num, series_id: id, num, status, published_at: date, announced_at: announced });
const d1 = '2026-10-20T12:00:00Z', d2 = '2026-10-21T10:00:00Z', d3 = '2026-10-21T12:00:00Z';
{
  const out = homeReleaseOverview([ch('a', 2, d2), ch('a', 1, d2), ch('b', 3, d1)], [vol('a', 2, d2)], series, NOW);
  assert.equal(out.entries[0].kind, 'volume');
  assert.equal(out.entries[0].volume.num, 2);
  assert.equal(out.entries[0].chs.length, 0, 'el volumen no se desglosa en capítulos');
  assert.equal(out.bySeries.b.kind, 'chapter');
}
{
  const out = homeReleaseOverview([ch('a', 4, d3)], [vol('a', 2, d1)], series, NOW);
  assert.equal(out.bySeries.a.kind, 'chapter', 'un capítulo posterior se anuncia por separado');
}
{
  const out = homeReleaseOverview([], [vol('a', 1, d2)], series, NOW);
  assert.equal(out.bySeries.a.kind, 'volume', 'los volúmenes solo externos también aparecen');
}
{
  const out = homeReleaseOverview([ch('a', 3, d2)], [vol('a', 2, d2, null), vol('b', 1, d2, d2, 'draft'), vol('c', 1, '2026-11-01T10:00:00Z')], series, NOW);
  assert.equal(out.bySeries.a.kind, 'chapter', 'un volumen no anunciado no sustituye el capítulo');
  assert.equal(out.bySeries.b, undefined, 'no se anuncian borradores');
  assert.equal(out.bySeries.c, undefined, 'no se anuncian lanzamientos futuros');
}
{
  const out = homeReleaseOverview([ch('a', 7, d2), ch('a', 6, d1)], [], series, NOW);
  assert.deepEqual(out.bySeries.a.chs.map(c => c.num), [7], 'capítulos de distintos días no se agrupan');
}
console.log('home-volume-check: OK');

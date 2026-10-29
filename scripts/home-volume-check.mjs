// Pruebas de regresión: inicio editorial, capítulos sueltos y volúmenes publicados completos.
import assert from 'node:assert/strict';
import { homeReleaseOverview, homeReleaseHighlights } from '../src/home-releases.js';

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

{
  const out = homeReleaseOverview([ch('a', 7, d3), ch('b', 1, d2)], [vol('a', 3, d3), vol('b', 2, d2)], series, NOW);
  assert.equal(out.entries[0].id, 'a', 'los volúmenes se ordenan por lanzamiento');
  assert.equal(out.entries[1].kind, 'volume', 'más de un volumen puede anunciarse');
}
{
  const at = '2026-10-18T18:45:58Z', after = '2026-10-18T19:02:34Z';
  const out = homeReleaseOverview([ch('a', 29, after), ch('a', 30, after)], [vol('a', 17, at)], series, NOW);
  assert.equal(out.bySeries.a.kind, 'volume', 'el registro tardío de capítulos no debe ocultar el volumen completo');
}
{
  const first=homeReleaseOverview([ch('a',1,d3)], [vol('a',1,d3)], series, NOW);
  assert.equal(first.bySeries.a.isNewSeries,true,'El primer volumen publicado representa nuevo lanzamiento');
  const existing=homeReleaseOverview([ch('a',5,d3)], [vol('a',1,d1),vol('a',2,d3)], series, NOW);
  assert.equal(existing.bySeries.a.isNewSeries,false,'Volumen 2 es novedad de obra existente, no debut');
  const unannounced=homeReleaseOverview([ch('a',5,d3)], [vol('a',1,d1,null),vol('a',2,d3)], series, NOW);
  assert.equal(unannounced.bySeries.a.isNewSeries,false,'Un volumen anterior sin anuncio no convierte el segundo en debut');
}

{
  const t=Date.parse('2026-10-21T18:00:00Z'), h=n=>t-n*3600000;
  const rows=[
    {id:'chapter1',kind:'chapter',time:h(1)}, {id:'chapter2',kind:'chapter',time:h(2)},
    {id:'volume1',kind:'volume',volume:{num:2},time:h(4)}, {id:'chapter3',kind:'chapter',time:h(7)},
    {id:'volume2',kind:'volume',volume:{num:3},time:h(24)},
    {id:'old-volume',kind:'volume',volume:{num:1},time:h(240)},
    {id:'future',kind:'volume',volume:{num:1},time:t+100000}
  ];
  const original=rows.map(x=>x.id);
  const selected=homeReleaseHighlights(rows,{now:t,limit:5,maxVolumes:2,freshDays:7});
  assert.deepEqual(selected.map(x=>x.id),['volume1','volume2','chapter1','chapter2','chapter3'],'volúmenes recientes primero, capítulos conservados');
  assert.deepEqual(rows.map(x=>x.id),original,'no mutar lista original');
  assert.deepEqual(homeReleaseHighlights(rows,{now:t,limit:3,maxVolumes:0}).map(x=>x.id),['chapter1','chapter2','volume1'],'sin prioridad, cronología');
  assert.deepEqual(homeReleaseHighlights(rows,{now:t,limit:0}),[],'límite cero');
  const dedup=homeReleaseHighlights([...rows,rows[0]],{now:t,limit:10});
  assert.equal(new Set(dedup.map(x=>x.id)).size,dedup.length,'obras únicas');
  assert(!dedup.some(x=>x.id==='future'),'no mostrar volúmenes futuros');
}
console.log('home-volume-check: OK');

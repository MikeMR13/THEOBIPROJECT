// Las pestañas abiertas detectan novedades sin recargas ni llamadas reales.
import assert from 'node:assert/strict';
import {homeFeedRevision,homeFeedHasNewContent} from '../src/home-feed-freshness.js';
import {readFileSync} from 'node:fs';
const initial={series:[
 {id:'obra-a',cover_path:'a.webp',chapters:[{count:2}],translation_status:'active'},
 {id:'obra-b',cover_path:'b.webp',chapters:[{count:1}],translation_status:'active'}
],latest:[
 {series_id:'obra-a',num:2,publish_at:'2026-10-31T18:00:00Z'},
 {series_id:'obra-b',num:1,publish_at:'2026-10-30T18:00:00Z'}
]};
const same=structuredClone(initial);
same.series.reverse();same.latest.reverse();
assert.equal(homeFeedHasNewContent(homeFeedRevision(initial),same),false,'El reordenamiento no justifica reiniciar el carrusel');
same.series[0].views=200;
assert.equal(homeFeedHasNewContent(homeFeedRevision(initial),same),false,'Solo aumentar vistas no reinicia Inicio');
const newChapter=structuredClone(initial);
newChapter.series[0].chapters[0].count=3;
newChapter.latest[0]={series_id:'obra-a',num:3,publish_at:'2026-10-31T18:02:00Z'};
assert.equal(homeFeedHasNewContent(homeFeedRevision(initial),newChapter),true,'Nuevo capítulo debe actualizar Inicio');
const backfilled=structuredClone(initial);
backfilled.series[1].chapters[0].count++;
assert.equal(homeFeedHasNewContent(homeFeedRevision(initial),backfilled),true,'Capítulo importado con fecha antigua debe actualizar');
const newWork=structuredClone(initial);
newWork.series.push({id:'obra-c',cover_path:'c.webp',chapters:[{count:1}]});
assert.equal(homeFeedHasNewContent(homeFeedRevision(initial),newWork),true,'Una novela nueva debe aparecer');
assert.equal(homeFeedHasNewContent(homeFeedRevision(initial),{error:'timeout'}),false,'Error temporal no reinicia portada');
assert.equal(homeFeedHasNewContent(null,newWork),false);
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
assert.match(ui,/homeFeedHasNewContent\(initialFeedRevision, freshnessResult\?\.data\)/);
assert.match(ui,/Date\.now\(\) - lastFeedFreshnessCheck >= 5 \* 60 \* 1000/);
assert.match(ui,/changedTeam \|\| changedRelease \|\| changedChapters/);
assert.match(ui,/if\s*\(document\.hidden \|\| checkingNewRelease\)\s*return/);
console.log('OK: páginas abiertas detectan capítulos nuevos sin repintados por ranking/visitas ni consultas por minuto');

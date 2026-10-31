// Entrega 4: regresiones locales; no requiere sesión, Supabase, Vercel ni navegación exterior.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyViewsScale, viewsColumnMeaning, reviewCountsForWorks} from '../src/studio-stats-display.js';

assert.deepEqual(dailyViewsScale([]),{top:1,ticks:[1,1,0],empty:true});
assert.deepEqual(dailyViewsScale([{n:0},{n:'0'}]),{top:1,ticks:[1,1,0],empty:true});
assert.deepEqual(dailyViewsScale([{n:0},{n:8},{n:3}]),{top:8,ticks:[8,4,0],empty:false});
assert.deepEqual(dailyViewsScale([{n:'7'},{n:null},{n:2}]),{top:7,ticks:[7,4,0],empty:false});
assert.deepEqual(dailyViewsScale([{n:-2},{n:'NaN'},{n:0}]),{top:1,ticks:[1,1,0],empty:true});
const m=viewsColumnMeaning(7);
assert.match(m.views,/7 días/);
assert.match(m.total,/acumuladas/);
assert.match(m.caption,/«Vistas»/);
assert.match(m.caption,/«Total»/);
assert.equal(viewsColumnMeaning(90).views,'Vistas en los últimos 90 días');

const chapters=[
 {id:'a',series_id:'obra1',version:2},
 {id:'b',series_id:'obra1',version:1},
 {id:'c',series_id:'obra2',version:3},
 {id:'d',series_id:'obra2',version:4},
 {id:'e',series_id:'obra2',version:4}
];
const latest={
 a:{status:'pending',base_version:2},
 b:{status:'approved',base_version:0},
 c:{status:'approved',base_version:3},
 d:{status:'changes_requested',base_version:4},
 e:{status:'pending',base_version:4}
};
assert.deepEqual(reviewCountsForWorks(chapters,latest),{
 obra1:{pending:1,changes:0,approved:0,expired:1},
 obra2:{pending:1,changes:1,approved:1,expired:0}
});
assert.deepEqual(reviewCountsForWorks(chapters,{}),{});
assert.deepEqual(reviewCountsForWorks([{id:'c',series_id:'obra2',version:3}],latest),{
 obra2:{pending:0,changes:0,approved:1,expired:0}
});

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const studio=read('src/studio.js'),style=read('src/studio-stats-display.css'),
  reader=read('src/reader.js'),seo=read('src/studio-seo.js');
for(const token of [
 'dailyViewsScale(daily)','viewsColumnMeaning(F.days)','scale.ticks.map',
 'class="st-axis-y"','class="st-axis-x"',
 'meaning.caption','meaning.views','meaning.total','aria-describedby="st-metric-help"',
 'reviewCountsForWorks(list,latestReview)','Revisiones por obra',
 'editorialChapterLabel(c)','editorialChapterLabel(x)',
 "sb.rpc('series_feedback'"
])assert.ok(studio.includes(token),'Falta mejora de Estudio: '+token);
assert.ok(style.includes('.s2 .st-plot')&&style.includes('.s2 .tb-review-summary'));
assert.ok(studio.includes('/studio-stats-display.css?v=1'));
assert.match(reader,/pn\.scrollTop = 0; pn\.scrollLeft = 0/);
assert.match(reader,/const st = pn\.scrollTop; closePanel\(\); prefsPanel\(\); panel\(\)\.scrollTop = st/);
assert.match(reader,/on\.focus\(\{ preventScroll: true \}\)/);
assert.doesNotMatch(reader,/window\.scrollTo\(0, 0\).*pn\.scrollTop/);
for(const token of ['wk-seo-preview-title','wk-seo-preview-desc','-webkit-line-clamp:2','-webkit-line-clamp:4',
 'title:displayTitle','title:displayDescription','className:\'wk-seo-preview-url\'',
 'const nextSeo=cleanSeo(values()'])assert.ok(seo.includes(token),'Falta SEO de vista previa: '+token);
assert.match(seo,/allowedImages:images/);
assert.match(seo,/\.update\(\{theme\}\)/);
assert.doesNotMatch(read('src/studio-stats-display.js'),/\bfetch\s*\(|\.rpc\s*\(|\.from\s*\(/);
console.log('Entrega 4: ejes, significado de métricas, revisiones, SEO y scroll aislado — PASS');

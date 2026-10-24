// Pruebas aisladas: sitemap, robots, privacidad y salida XML. Sin credenciales reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sitemap from '../api/sitemap.js';
import robots from '../api/robots.js';
import meta from '../api/public-meta.js';
const env = { ...process.env }, fetchOriginal = globalThis.fetch;
process.env.VERCEL_ENV = 'production';
process.env.OBI_SUPABASE_URL = 'https://publica.supabase.co';
process.env.OBI_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
const fixtures = {
  series: [
    { id: 'serie-pub', slug: 'libro-a', published: true, archived_at: null, adult: false, access: 'public', title: 'Libro A', author: 'Autora', synopsis: 'Prueba' },
    { id: 'serie-nop', slug: 'borrador', published: false, archived_at: null, adult: false, access: 'public' },
    { id: 'serie-adult', slug: 'adulto', published: true, archived_at: null, adult: true, access: 'public' },
    { id: 'serie-pay', slug: 'patreon', published: true, archived_at: null, adult: false, access: 'patreon' },
    { id: 'serie-arch', slug: 'archivado', published: true, archived_at: '2026-01-01T00:00:00Z', adult: false, access: 'public' }
  ],
  teams: [
    { id:'t1',slug:'equipo-pub',status:'Activo' },
    { id:'t2',slug:'equipo-secreto',status:'Proyecto privado' }
  ],
  volumes: [
    { id:'v1',series_id:'serie-pub',num:1,status:'published',access:'public',deleted_at:null,published_at:'2026-01-01T00:00:00Z' },
    { id:'v2',series_id:'serie-pub',num:2,status:'draft',access:'public',deleted_at:null },
    { id:'v3',series_id:'serie-pub',num:3,status:'published',access:'patreon',deleted_at:null },
    { id:'v4',series_id:'serie-arch',num:4,status:'published',access:'public',deleted_at:null }
  ],
  chapters: [
    { id:'c1',series_id:'serie-pub',num:1,status:'published',access:'public',deleted_at:null,publish_at:'2026-01-01T00:00:00Z',updated_at:'2026-02-01T00:00:00Z' },
    { id:'c2',series_id:'serie-pub',num:2,status:'scheduled',access:'public',deleted_at:null },
    { id:'c3',series_id:'serie-pub',num:3,status:'published',access:'patreon',deleted_at:null },
    { id:'c4',series_id:'serie-arch',num:4,status:'published',access:'public',deleted_at:null },
    { id:'c5',series_id:'serie-pub',num:5,status:'published',access:'public',deleted_at:null,publish_at:'2099-01-01T00:00:00Z' }
  ]
};
let outage=false;
globalThis.fetch = async (raw, opts={}) => {
  const u = new URL(String(raw));
  if (u.pathname==='/index.html') return new Response('<html><head><title>El Obi del Lector</title><meta name="description" content="x"></head><body><main id="app"></main></body></html>');
  if (outage) throw new Error('offline');
  const table=u.pathname.split('/').at(-1);
  if (!fixtures[table]) throw new Error('URL no simulada ' + raw);
  let rows=fixtures[table];
  if(u.searchParams.get('slug'))rows=rows.filter(x=>x.slug===u.searchParams.get('slug').replace('eq.',''));
  // No confiar únicamente en estos filtros simulados; los handlers deben reforzar la privacidad.
  const range=opts.headers?.Range||'0-499';
  const [start,end]=range.split('-').map(Number);
  return new Response(JSON.stringify(rows.slice(start,end+1)),{headers:{'Content-Type':'application/json'}});
};
const response=()=>({statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(c){this.statusCode=c;return this;},send(v){this.body=v;return this;},end(){this.body='';return this;}});
async function run(fn,method='GET',url='/'){const res=response();await fn({method,url},res);return res;}
try {
  let r=await run(sitemap);
  assert.equal(r.statusCode,200);
  assert.match(r.headers['content-type'],/application\/xml/);
  for(const item of ['https://elobidellector.com/serie/libro-a','https://elobidellector.com/serie/libro-a?vol=1','https://elobidellector.com/leer/libro-a/1','https://elobidellector.com/equipo/equipo-pub','https://elobidellector.com/catalogo']) assert.ok(r.body.includes(item),item);
  for(const bad of ['/serie/borrador','/serie/adulto','/serie/patreon','/serie/archivado','/serie/libro-a?vol=2','/serie/libro-a?vol=3','/leer/libro-a/2','/leer/libro-a/3','/leer/libro-a/5','/equipo/equipo-secreto','/lector/']) assert.ok(!r.body.includes(bad),bad);
  assert.match(r.body,/<lastmod>2026-02-01T00:00:00.000Z<\/lastmod>/);
  assert.equal((r.body.match(/<loc>/g)||[]).length,new Set([...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1])).size);
  const h=await run(sitemap,'HEAD');assert.equal(h.statusCode,200);assert.equal(h.body,'');
  r=await run(robots);
  assert.equal(r.statusCode,200);
  assert.match(r.body,/Sitemap: https:\/\/elobidellector.com\/sitemap.xml/);
  assert.ok(r.body.includes('Disallow: /*?vista='));
  assert.match(r.body,/Disallow: \/estudio/);
  assert.doesNotMatch(r.body,/Disallow: \/serie/);
  r=await run(robots,'POST');assert.equal(r.statusCode,405);
  process.env.VERCEL_ENV='preview';
  r=await run(sitemap);
  assert.equal(r.statusCode,404);
  assert.match(r.headers['x-robots-tag'],/noindex/);
  r=await run(robots);
  assert.equal(r.body,'User-agent: *\nDisallow: /\n');
  r=await run(meta,'GET','/api/public-meta?kind=serie&slug=libro-a');
  assert.match(r.headers['x-robots-tag'],/noindex/);
  assert.doesNotMatch(r.body, /<script type="application\/ld\+json">/);
  process.env.VERCEL_ENV='production';
  outage=true;
  r=await run(sitemap);
  assert.equal(r.statusCode,503);
  assert.equal(r.headers['retry-after'],'300');
  const conf=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.ok(conf.rewrites.some(x=>x.source==='/robots.txt'));
  assert.ok(conf.rewrites.some(x=>x.source==='/sitemap.xml'));
  assert.ok(conf.functions?.['api/sitemap.js']);
  const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
  assert.match(html,/\"@type\":\"WebSite\"/);
  console.log('fase3-seo: sitemap, robots, privacidad, XML, estados y JSON-LD OK');
} finally {
  globalThis.fetch=fetchOriginal;
  process.env=env;
}

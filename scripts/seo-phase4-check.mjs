import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanSeo, cleanSiteSeo, editImages, applySeo } from '../src/seo-settings.js';
import handler from '../api/public-meta.js';

const novel = {
  id: 'work1', team_id: 'team1', slug: 'novela', title: 'Novela', synopsis: 'Aventura',
  author: 'Autora', genres: ['Fantasía'], published: true, archived_at: null,
  access: 'public', adult: false, cover_path: 'team1/obras/novela/cover.png',
  media: { gallery: [{path:'team1/obras/novela/social.png'}] },
  theme: { update_tag: { text: 'Volumen nuevo' }, seo: {
    title:'  Obra editorial SEO ',description:'Una gran aventura actualizada',
    socialTitle:'Compartir novela',socialDescription:'Ficha personalizada',
    imagePath:'team1/obras/novela/social.png',noindex:false } }
};
const images = editImages(novel);
assert.equal(images.length,2);
assert.equal(cleanSeo({title:'<script>peligro</script> '+ 'A'.repeat(90),imagePath:'https://evil.test/pixel.png',noindex:'true'}, {allowedImages:images}).imagePath,'');
assert.equal(cleanSeo({title:'<b>Hola</b>',noindex:'true'}).noindex,false);
assert.equal(cleanSeo({title:'<b>Hola</b>'}).title,'Hola');
assert.ok(cleanSeo({title:'A'.repeat(100)}).title.length<=70);
assert.equal(cleanSeo({imagePath:'team1/obras/novela/social.png'}, {allowedImages:images}).imagePath,'team1/obras/novela/social.png');
const applied=applySeo({title:'Automático',description:'Auto',image:'default',noindex:true},{title:'Custom',noindex:false});
assert.equal(applied.noindex,true,'SEO no debe levantar noindex legal/privado');
assert.equal(cleanSiteSeo({title:'<img src=x>',description:'x'.repeat(250)}).description.length,170);
const oldEnv={...process.env}, originalFetch=globalThis.fetch;
process.env.VERCEL_ENV='production';
process.env.OBI_SUPABASE_URL='https://qa-only.supabase.co';
process.env.OBI_SUPABASE_PUBLISHABLE_KEY='sb_publishable_ci_only';
const resp=(payload,status=200)=>new Response(JSON.stringify(payload), {status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async raw=>{
  const u=new URL(String(raw));
  if(u.pathname==='/index.html')return new Response('<!doctype html><html><head><title>Inicio</title><meta name="description" content="Auto"><link rel="canonical" href="https://elobidellector.com/"></head><body><main id="app"></main></body></html>');
  if(u.pathname.endsWith('/series'))return resp([novel]);
  if(u.pathname.endsWith('/teams'))return resp([{id:'team1',slug:'equipo',name:'Equipo',bio:'Equipo de traducción',status:'Activo',banner_path:'team1/profile/banner.png',avatar_path:'team1/profile/avatar.png',settings:{seo:{title:'Equipo SEO',socialTitle:'Compartir equipo',description:'Equipo visible',imagePath:'team1/profile/banner.png',noindex:false}}}]);
  if(u.pathname.endsWith('/platform_settings'))return resp([{seo:{
    title:'Inicio configurable',description:'Descripción administrada',socialTitle:'Obi en redes',
    socialDescription:'Una nueva tarjeta para compartir' }}]);
  throw new Error('Petición no prevista '+u.pathname);
};
function response(){
  return {statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k.toLowerCase()]=v;},
    status(code){this.statusCode=code;return this;},send(x){this.body=x;return this;},end(){return this;}};
}
async function run(url){const res=response();await handler({method:'GET',url},res);return res;}
try{
  let res=await run('/api/public-meta?kind=serie&slug=novela');
  assert.equal(res.statusCode,200);
  assert.match(res.body,/<title>Obra editorial SEO<\/title>/);
  assert.match(res.body,/property="og:title" content="Compartir novela"/);
  assert.match(res.body,/name="twitter:description" content="Ficha personalizada"/);
  assert.match(res.body,/team1\/obras\/novela\/social.png/);
  assert.match(res.body,/BreadcrumbList/);
  assert.match(res.body,/https:\/\/elobidellector.com\/serie\/novela/);
  novel.theme.seo.noindex=true;
  res=await run('/api/public-meta?kind=serie&slug=novela');
  assert.equal(res.statusCode,200);
  assert.match(res.headers['x-robots-tag'],/noindex/);
  assert.doesNotMatch(res.body,/application\/ld\+json/);
  novel.theme.seo.noindex=false;
  res=await run('/api/public-meta?kind=equipo&slug=equipo');
  assert.equal(res.statusCode,200);
  assert.match(res.body,/<title>Equipo SEO<\/title>/);
  assert.match(res.body,/property="og:title" content="Compartir equipo"/);
  assert.match(res.body,/team1\/profile\/banner.png/);
  res=await run('/api/public-meta?kind=home');
  assert.equal(res.statusCode,200);
  assert.match(res.body,/<title>Inicio configurable<\/title>/);
  assert.match(res.body,/property="og:title" content="Obi en redes"/);
  assert.match(res.body,/property="og:description" content="Una nueva tarjeta para compartir"/);
  const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.ok(cfg.rewrites.some(x=>x.source==='/'&&x.destination==='/api/public-meta?kind=home'));
  const studio=readFileSync(new URL('../src/studio.js',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/admin.js',import.meta.url),'utf8');
  const studioSeo=readFileSync(new URL('../src/studio-seo.js',import.meta.url),'utf8');
  const adminSeo=readFileSync(new URL('../src/admin-seo.js',import.meta.url),'utf8');
  assert.match(studio,/bindSeriesSeo/);
  assert.match(studio,/data-tseo/);
  assert.match(studio,/seo: cleanSeo\(D\.seo/);
  assert.match(studio,/\['seo', 'SEO y compartir'\]/);
  assert.match(studioSeo,/canEdit:?\s*[=,]/);
  assert.match(studioSeo,/\.select\('theme,team_id'\)/);
  assert.match(studioSeo,/\.eq\('team_id',series\.team_id\)/);
  assert.match(admin,/renderAdminSeo/);
  assert.match(adminSeo,/cleanSiteSeo/);
  assert.match(adminSeo,/\.update\(\{seo,updated_at:/);
  const migration=readFileSync(new URL('../supabase/migrations/20261024_seo_fase4.sql',import.meta.url),'utf8');
  assert.match(migration,/platform_settings_seo_safe/);
  console.log('seo-fase4: UI, permisos, metadatos SSR, noindex, HTML escapado y migración QA OK');
}finally{globalThis.fetch=originalFetch;process.env=oldEnv;}

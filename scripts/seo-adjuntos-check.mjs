// Verifica la integración de los dos adjuntos SEO sin sustituir los controles SSR.
// No consulta Supabase ni añade claves ni usa red.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveClientSeo,updateClientSeo,clipSeoText} from '../src/seo.js';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shell=src('src/index.html'), share=src('src/share.js');
const ssr=src('api/public-meta.js'),alias=src('api/meta.js');
const robot=src('api/robots.js'),sitemap=src('api/sitemap.js');

const ld=JSON.parse(shell.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'null');
assert.ok(ld?.['@graph']?.some(n=>n['@type']==='Organization'),'Organización original preservada');
const site=ld['@graph'].find(n=>n['@type']==='WebSite');
assert.equal(site.potentialAction.target,'https://elobidellector.com/buscar?q={q}');
assert.equal(site.publisher['@id'],'https://elobidellector.com/#organization');
assert.match(ssr,/if\(kind==='home'\)node\['@graph'\]\[1\]\.potentialAction/,
  'Home SSR dinámico incluye el SearchAction, no solo HTML estático');
assert.match(shell,/og:image" content="https:\/\/elobidellector.com\/api\/og-image\?kind=home"/,
  'La portada Open Graph dinámica no puede reemplazarse por icon-512');
assert.match(shell,/twitter:card" content="summary_large_image"/);
assert.match(shell,/reader-a11y\.css/,'No eliminar accesibilidad');
assert.match(shell,/Saltar al contenido principal/,'No eliminar saltar a contenido');
assert.match(shell,/tts\.js/,'No eliminar voz de lectura');
assert.match(shell,/app\.js\?v=30/,'No restaurar versiones de frontend antiguas');
assert.match(share,/import \{updateClientSeo\} from '.\/seo\.js\?v=1'/);
assert.match(share,/ENTRY_NOINDEX.*noindex/,'No eliminar noindex del SSR');
assert.match(share,/if\(clientNavigated\) updateClientSeo/,
  'No sobrescribir metadata SSR en primera carga');
assert.match(robot,/Allow: \/api\/og-image/,'Bots de redes pueden leer PNG de portada');
assert.match(sitemap,/validSeries[\s\S]*s\.theme\?\.seo\?\.noindex/,'Sitemap respeta noindex');
assert.match(sitemap,/process\.env\.VERCEL_ENV !== 'production'/,'Previews no tienen sitemap indexable');
assert.match(alias,/import publicMeta from '.\/public-meta\.js'/,
  'API meta heredada debe compartir políticas del SSR principal');
assert.doesNotMatch(alias,/sb_publishable_[A-Za-z0-9]/,'No agregar claves incrustadas');
assert.doesNotMatch(shell,/\/seo\.js\?v=1" defer/,'No cargar un observador SEO duplicado');

const read=(sel)=>({
 '.ui-series-page h1':'¡No existe una gyaru que no termine cayendo por un otaku!',
 '.ui-series-page .ui-syn, .ui-series-page .ob-syn':'Novela romántica de prueba.',
 '.rd-ch .rd-head h2, .rd h1, .rd-title':'Capítulo 36: Una decisión',
 '.rd-back, .rd-where a':'‹ Gyaru',
 '.tp2-page h1, .tp2-page .tp2 h1':'OX-MR Traducciones'
})[sel]||'';
assert.equal(deriveClientSeo('/serie/obra',read).kind,'serie');
assert.equal(deriveClientSeo('/leer/obra/36',read).chapter,'36');
assert.equal(deriveClientSeo('/equipo/ox-mr',read).kind,'equipo');
assert.equal(deriveClientSeo('/catalogo',read).kind,'static');
assert.equal(deriveClientSeo('/ruta-privada',read),null);
assert.equal(clipSeoText('  A    B  '),'A B');

function mockDocument(){
 const elements=new Map();
 const doc={
   title:'Anterior',
   head:{appendChild(el){elements.set('meta['+el._attr+'="'+el._key+'"]',el);}},
   createElement(tag){assert.equal(tag,'meta');return{
     _attr:'',_key:'',content:'',
     setAttribute(a,k){this._attr=a;this._key=k;}
   };},
   querySelector(sel){
     if(sel==='link[rel="canonical"]')return {href:'https://elobidellector.com/serie/obra'};
     if(sel==='meta[name="robots"]')return {content:'noindex,nofollow'};
     if(sel==='meta[name="description"]')return elements.get(sel)||
       (elements.set(sel,{content:'Texto anterior'}),elements.get(sel));
     if(elements.has(sel))return elements.get(sel);
     const t=read(sel);
     return t?{textContent:t}:null;
   }
 };
 return doc;
}
const doc=mockDocument();
assert.equal(updateClientSeo({doc,loc:{pathname:'/serie/obra'}}),true);
assert.match(doc.title,/Novela ligera en español/);
assert.equal(doc.querySelector('meta[property="og:image"]').content,
 'https://elobidellector.com/api/og-image?kind=serie&slug=obra');
assert.equal(doc.querySelector('meta[name="robots"]').content,'noindex,nofollow',
 'El SEO SPA nunca elimina ni relaja robots');
assert.equal(doc.querySelector('meta[property="og:url"]').content,
 'https://elobidellector.com/serie/obra');
assert.equal(updateClientSeo({doc,loc:{pathname:'/perfil'},blocked:true}),false);
assert.equal(doc.querySelector('meta[property="og:image"]').content,
 'https://elobidellector.com/icon-512.png','Perfil privado no hereda portada pública');
assert.equal(doc.querySelector('meta[name="robots"]').content,'noindex,nofollow');

console.log('seo-adjuntos: SPA sin colisiones, SearchAction, SSR/OG, noindex, sitemap, robots y lector intactos OK');

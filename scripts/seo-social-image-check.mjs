// Pruebas reales del encoder PNG y de los permisos públicos. Sin red ni credenciales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
import {Resvg} from '@resvg/resvg-js';
import imageHandler from '../api/og-image.js';
import pageHandler from '../api/public-meta.js';
import {safeSocialAsset,cardTitle,titleLayout,overlaySVG,socialFontOptions,CARD_WIDTH,CARD_HEIGHT} from '../lib/social-card.js';

const old={...process.env}, originalFetch=globalThis.fetch;
process.env.VERCEL_ENV='preview';
process.env.VERCEL_URL='theobiproject-qa.vercel.app';
process.env.OBI_SUPABASE_URL='https://qa-only.supabase.co';
process.env.OBI_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qa_test';
const backend=process.env.OBI_SUPABASE_URL;
const imagePath='team1/obras/novela/portada.png';
const imageURL=backend+'/storage/v1/object/public/obi-media/'+imagePath;
const image=await sharp({create:{width:540,height:760,channels:4,background:'#a45131'}}).png().toBuffer();
let imageRequests=0, backendDown=false, prelaunchEnabled=false, allowLogo=true;
const series={id:'one',team_id:'team1',slug:'novela',title:'La biblioteca de los nueve libros y una joven extraordinaria',synopsis:'Lee la historia en español.',
  author:'Autora',genres:['Fantasía'],access:'public',published:true,adult:false,
  cover_path:imagePath,cover_thumb_path:null,theme:{seo:{socialTitle:'Gran descubrimiento',socialDescription:'Una nueva historia',noindex:false}},media:{gallery:[]}};
const team={id:'team1',slug:'equipo',name:'Grupo de traducción',bio:'Traducciones a español',status:'Activo',
  avatar_path:'team1/profile/logo.png',banner_path:null,settings:{seo:{noindex:false}}};
const chapter={num:36,title:'El camino de los sueños',teaser:'La aventura continúa',status:'published',access:'public',publish_at:null,public_at:null};
const payload=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (raw,opts={})=>{
  const u=new URL(String(raw));
  if(u.pathname.endsWith('/series') && backendDown)return payload({message:'QA database unreachable'},503);
  if(u.pathname.endsWith('/rpc/public_prelaunch_social')){
    const slug=JSON.parse(opts.body||'{}').p_slug;
    if(!prelaunchEnabled||series.published||series.access!=='public'||series.adult||slug!==series.slug)return payload(null);
    return payload({id:series.id,team_id:series.team_id,slug:series.slug,title:series.title,
      synopsis:series.synopsis,cover_path:series.cover_path,cover_thumb_path:series.cover_thumb_path,
      author:series.author,genres:series.genres,seo:series.theme.seo,team_name:team.name});
  }
  if(u.pathname.endsWith('/rpc/series_public_credits')){
    const ids=JSON.parse(opts.body||'{}').p_series_ids||[];
    return payload(ids.includes(series.id)?[{series_id:series.id,team_id:team.id,name:team.name,
      status:team.status,show_reader_logo:allowLogo,avatar_path:team.avatar_path,is_primary:true}]:[]);
  }
  if(u.pathname.endsWith('/series'))return payload(u.searchParams.get('slug')==='eq.inexistente' || (u.searchParams.has('access') && u.searchParams.get('access')!=='eq.'+series.access) || (u.searchParams.has('published') && !series.published) ? [] : [series]);
  if(u.pathname.endsWith('/chapters'))return payload([chapter]);
  if(u.pathname.endsWith('/teams'))return payload([team]);
  if(u.pathname.endsWith('/platform_settings'))return payload([{seo:{title:'El Obi del Lector',socialTitle:'Descubre historias'}}]);
  if(u.pathname.endsWith('/obi-media/'+imagePath)){imageRequests++;return new Response(image,{headers:{'content-type':'image/png','content-length':String(image.length)}});}
  if(u.pathname.endsWith('/obi-media/team1/profile/logo.png')){imageRequests++;return new Response(image,{headers:{'content-type':'image/png'}});}
  if(u.pathname==='/index.html')return new Response('<!doctype html><html><head><title>Inicio</title><meta name="description" content="Inicio"></head><body><main id="app"></main></body></html>');
  throw new Error('Solicitud inesperada: '+u.href);
};
const response=()=>({statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[name.toLowerCase()]=value;},
  removeHeader(name){delete this.headers[name.toLowerCase()]},status(s){this.statusCode=s;return this;},
  send(content){this.body=content;return this;},end(){this.body=null;return this;}});
const run=async (fn,url,method='GET')=>{const res=response();await fn({method,url},res);return res;};
const okPNG=async (res,label)=>{
  assert.equal(res.statusCode,200,label+' HTTP');
  assert.equal(res.headers['content-type'],'image/png',label+' MIME');
  assert.equal(res.headers['cache-control'],'private, no-store',label+' acceso fresco');
  assert.ok(Buffer.isBuffer(res.body),label+' debe enviar Buffer');
  const meta=await sharp(res.body).metadata();
  assert.equal(meta.width,CARD_WIDTH);
  assert.equal(meta.height,CARD_HEIGHT);
  assert.equal(meta.format,'png');
  assert.ok(res.body.length<6_000_000,'No exceder 6 MB');
};
try {
  assert.equal(cardTitle({heading:'Título de la novela',socialTitle:'Compartir novela'},'serie'),'Compartir novela');
  assert.match(cardTitle({heading:'Obra · Capítulo 36',bookTitle:'Obra'},'leer'),/Capítulo 36/);
  assert.equal(cardTitle({title:'El Obi del Lector — Novelas ligeras en español latino'},'home'),'Novelas ligeras en español latino');
  assert.equal(safeSocialAsset(imageURL,{backend,origin:'https://theobiproject-qa.vercel.app'}),true);
  for(const url of ['https://evil.example/photo.jpg','https://qa-only.supabase.co@evil.example/photo.jpg',
    'https://qa-only.supabase.co/rest/v1/series','http://qa-only.supabase.co/storage/v1/object/public/obi-media/a.png',
    'https://qa-only.supabase.co/storage/v1/object/public/obi-media/x.png?token=PRIVATE']){
    assert.equal(safeSocialAsset(url,{backend,origin:'https://theobiproject-qa.vercel.app'}),false,'No permitir '+url);
  }
  await okPNG(await run(imageHandler,'/api/og-image?kind=home'),'Inicio');
  await okPNG(await run(imageHandler,'/api/og-image?kind=serie&slug=novela'),'Novela');
  await okPNG(await run(imageHandler,'/api/og-image?kind=leer&slug=novela&chapter=36'),'Capítulo');
  await okPNG(await run(imageHandler,'/api/og-image?kind=equipo&slug=equipo'),'Equipo');
  assert.ok(imageRequests>=3,'Usar portada y logo reales del bucket permitido');
  const editorial={heading:series.title,description:series.synopsis,credits:[{name:team.name,logo:imageURL}]};
  const visual=overlaySVG(editorial,'serie',editorial.credits,true,[true]);
  // Compare SVG glyph shapes, not just an SVG string: this catches font
  // fallbacks that render every accented letter as the same missing-glyph box.
  const raster=title=>new Resvg(overlaySVG({heading:title,description:'Prueba visual'},'serie'),{
    font:socialFontOptions}).render().asPng();
  assert.notDeepEqual(raster('AAAA'),raster('BBBB'),'El render debe dibujar letras distintas');
  assert.notDeepEqual(raster('AAAA'),raster('ÁÁÁÁ'),'Tildes españolas con glifos reales');
  assert.match(visual,/Grupo de traducción/,'Se muestra el equipo real en la tarjeta');
  assert.match(visual,/EL OBI DEL LECTOR/,'El diseño tiene sello editorial');
  assert.ok(titleLayout(editorial,'serie').lines.length<=4,'Título ocupa como máximo 4 líneas');
  assert.doesNotMatch(visual,/NekoTL|LunaScans|Kitsune/,'No inventar traductores');
  const withoutLogo=overlaySVG(editorial,'serie',editorial.credits,true,[false]);
  assert.match(withoutLogo,/Grupo de traducción/,'Sin PNG permanece el nombre real');
  allowLogo=false;
  await okPNG(await run(imageHandler,'/api/og-image?kind=serie&slug=novela'),'Novela sin logo');
  allowLogo=true;
  const html=await run(pageHandler,'/api/public-meta?kind=serie&slug=novela');
  assert.equal(html.statusCode,200);
  assert.match(html.body,/og:image:width" content="1200"/);
  assert.match(html.body,/og:image:height" content="630"/);
  assert.match(html.body,/api\/og-image\?kind=serie&amp;slug=novela&amp;v=/);
  assert.match(html.body,/twitter:image:alt/);
  backendDown=true;
  const outage=await run(pageHandler,'/api/public-meta?kind=serie&slug=novela');
  assert.equal(outage.statusCode,503,'Fallo del backend debe devolver 503');
  assert.doesNotMatch(outage.body,/og:image" content="[^"]*\/api\/og-image/,
    'Ante un 503 no se puede anunciar una imagen que también fallará');
  assert.match(outage.body,/icon-512\.png/,'Recurso genérico seguro');
  backendDown=false;
  series.published=false;prelaunchEnabled=true;
  const advance=await run(pageHandler,'/api/public-meta?kind=serie&slug=novela');
  assert.equal(advance.statusCode,200,'La ficha de preestreno anunciada debe compartirse');
  assert.match(advance.body,/Próximo estreno/,'Metadatos de preestreno');
  assert.match(advance.body,/api\/og-image\?kind=serie/);
  await okPNG(await run(imageHandler,'/api/og-image?kind=serie&slug=novela'),'Preestreno sin liberar');
  assert.equal((await run(imageHandler,'/api/og-image?kind=leer&slug=novela&chapter=36')).statusCode,404,'No liberar capítulos');
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela&vol=1')).statusCode,404,'No liberar volumen');
  prelaunchEnabled=false;
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela')).statusCode,404,'Borrador privado sin anuncio');
  prelaunchEnabled=true;series.access='tier';
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela')).statusCode,404,'Preestreno restringido');
  series.access='public';series.published=true;prelaunchEnabled=false;
  const head=await run(imageHandler,'/api/og-image?kind=serie&slug=novela','HEAD');
  assert.equal(head.statusCode,200);
  assert.equal(head.body,null);
  series.theme.seo.noindex=true;
  const count=imageRequests;
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela')).statusCode,404,'noindex');
  assert.equal(imageRequests,count,'No descargar portada noindex');
  series.theme.seo.noindex=false;
  series.adult=true;
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela')).statusCode,404,'+18 no se renderiza');
  series.adult=false;
  series.access='tier';
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela')).statusCode,404,'No filtrar portada de Patreon');
  series.access='public';
  chapter.status='scheduled';
  assert.equal((await run(imageHandler,'/api/og-image?kind=leer&slug=novela&chapter=36')).statusCode,404,'No filtrar capítulos programados');
  chapter.status='published';
  team.status='Proyecto privado';
  assert.equal((await run(imageHandler,'/api/og-image?kind=equipo&slug=equipo')).statusCode,404,'Equipo privado');
  assert.equal((await run(imageHandler,'/api/og-image?kind=lector&slug=lector')).statusCode,404,'No exponer lectores en generador');
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=inexistente')).statusCode,404,'Obra no existe');
  assert.equal((await run(imageHandler,'/api/og-image?kind=serie&slug=novela&vista=1')).statusCode,404,'Bloquear vistas privadas');
  assert.equal((await run(imageHandler,'/api/og-image?kind=home','POST')).statusCode,405);
  const editor=readFileSync(new URL('../src/studio-seo.js',import.meta.url),'utf8');
  const bibliotecario=readFileSync(new URL('../src/admin-seo.js',import.meta.url),'utf8');
  assert.match(editor,/Ver tarjeta final PNG/,'Studio enlaza a la imagen real');
  assert.match(editor,/Ver tarjeta PNG del equipo/,'Equipo enlaza a la imagen real');
  assert.match(bibliotecario,/Ver tarjeta social PNG/,'Bibliotecario enlaza a la imagen real');
  const src=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
  assert.match(src,/api\/og-image\?kind=home/);
  const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.match(vercel.functions['api/og-image.js'].includeFiles,/@ibm\/plex-sans-variable/);
  assert.match(readFileSync(new URL('../supabase/migrations/20261024_public_prelaunch_social.sql',import.meta.url),'utf8'),/announce_prelaunch is true/,'Preestreno exige anuncio explícito');
  console.log('seo-social-image: PNG 1200×630 real, portada grande, traductor y logo reales, fuentes, preestreno sin lectura, privacidad y SSR OK');
}finally{
  globalThis.fetch=originalFetch;
  process.env=old;
}

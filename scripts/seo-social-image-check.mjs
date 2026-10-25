// Pruebas reales del encoder PNG y de los permisos públicos. Sin red ni credenciales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
import {Resvg} from '@resvg/resvg-js';
import imageHandler from '../api/og-image.js';
import pageHandler,{publicData} from '../api/public-meta.js';
import {safeSocialAsset,safeTranslatorAsset,cardTitle,titleLayout,overlaySVG,prepareTranslatorLogo,creditGeometry,socialFontOptions,CARD_WIDTH,CARD_HEIGHT} from '../lib/social-card.js';

const old={...process.env}, originalFetch=globalThis.fetch;
process.env.VERCEL_ENV='preview';
process.env.VERCEL_URL='theobiproject-qa.vercel.app';
process.env.OBI_SUPABASE_URL='https://qa-only.supabase.co';
process.env.OBI_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qa_test';
const backend=process.env.OBI_SUPABASE_URL;
const imagePath='team1/obras/novela/portada.png';
const imageURL=backend+'/storage/v1/object/public/obi-media/'+imagePath;
const image=await sharp({create:{width:540,height:760,channels:4,background:'#a45131'}}).png().toBuffer();
// Caso realista: un wordmark muy horizontal, oscuro y con mucho margen transparente.
const wordmark=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="570" height="65"><rect width="570" height="65" rx="8" fill="#171514"/><text x="16" y="45" font-size="35" fill="#f8f8f8" font-family="sans-serif">OX-MR TRADUCCIONES</text></svg>');
const paddedLogo=await sharp({create:{width:1060,height:640,channels:4,background:'#00000000'}})
  .composite([{input:wordmark,left:245,top:265}]).png().toBuffer();
const legacy='https://hfbpsizgwzvvznrktiuq.supabase.co/storage/v1/object/public/nlobi-media/teams/4a354d87-cf97-4edd-9c72-0be569db5077/profile/reader-logo-1791692334590.png';
let imageRequests=0, backendDown=false, prelaunchEnabled=false, allowLogo=true, useReaderLogo=false, hideCredits=false;
let legacyRequests=0;
const series={id:'one',team_id:'team1',slug:'novela',title:'La biblioteca de los nueve libros y una joven extraordinaria',synopsis:'Lee la historia en español.',
  author:'Autora',genres:['Fantasía'],access:'public',published:true,adult:false,
  cover_path:imagePath,cover_thumb_path:null,theme:{seo:{socialTitle:'Gran descubrimiento',socialDescription:'Una nueva historia',noindex:false}},media:{gallery:[]},volumes:[{count:3}]};
const team={id:'team1',slug:'equipo',name:'Grupo de traducción',bio:'Traducciones a español',status:'Activo',
  avatar_path:'team1/profile/logo.png',banner_path:null,settings:{seo:{noindex:false}}};
const chapter={num:36,vol:2,title:'El camino de los sueños',teaser:'La aventura continúa',status:'published',access:'public',publish_at:null,public_at:null};
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
    return payload(!hideCredits&&ids.includes(series.id)?[{series_id:series.id,team_id:team.id,name:team.name,
      status:team.status,show_reader_logo:allowLogo,avatar_path:team.avatar_path,is_primary:true}]:[]);
  }
  if(u.pathname.endsWith('/series')){
    assert.equal(u.searchParams.get('volumes.status'),'eq.published','Conteo sin borradores');
    assert.equal(u.searchParams.get('volumes.access'),'eq.public','Conteo sin Patreon');
    assert.equal(u.searchParams.get('volumes.deleted_at'),'is.null','Conteo sin eliminados');
    assert.match(u.searchParams.get('volumes.or')||'',/published_at\.is\.null,published_at\.lte\./,
      'Conteo sin volúmenes todavía programados');
  }
  if(u.pathname.endsWith('/series'))return payload(u.searchParams.get('slug')==='eq.inexistente' || (u.searchParams.has('access') && u.searchParams.get('access')!=='eq.'+series.access) || (u.searchParams.has('published') && !series.published) ? [] : [series]);
  if(u.pathname.endsWith('/chapters'))return payload([chapter]);
  if(u.pathname.endsWith('/teams'))return payload([{...team,settings:{
    ...team.settings,show_reader_logo:allowLogo,reader_logo_url:useReaderLogo?legacy:''
  }}]);
  if(u.pathname.endsWith('/platform_settings'))return payload([{seo:{title:'El Obi del Lector',socialTitle:'Descubre historias'}}]);
  if(u.pathname.endsWith('/obi-media/'+imagePath)){imageRequests++;return new Response(image,{headers:{'content-type':'image/png','content-length':String(image.length)}});}
  if(u.href===legacy){legacyRequests++;return new Response(paddedLogo,{headers:{'content-type':'image/png'}});}
  if(u.pathname.endsWith('/obi-media/team1/profile/logo.png')){imageRequests++;return new Response(paddedLogo,{headers:{'content-type':'image/png'}});}
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
  assert.equal(safeSocialAsset(legacy,{backend,origin:'https://theobiproject-qa.vercel.app'}),false,'Cover no permite origen legacy');
  assert.equal(safeTranslatorAsset(legacy,{backend,origin:'https://theobiproject-qa.vercel.app'}),true,'Logo reader nativo sí permitido');
  assert.equal(safeTranslatorAsset('https://evil.test/storage/v1/object/public/nlobi-media/teams/x/profile/a.png',
    {backend,origin:'https://theobiproject-qa.vercel.app'}),false);
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
  assert.doesNotMatch(visual,/Grupo de traducción/,'PNG visible EXCLUYE nombre duplicado');
  assert.match(visual,/NOVELA LIGERA/,'La faja editorial identifica la obra');
  assert.match(visual,/<rect x="168" y="76" width="588" height="58"/,'La faja no invade la portada');
  assert.match(visual,/<rect x="56" y="[0-9.]+" width="[0-9.]+" height="[0-9.]+" fill="#f2c230"/,
    'El subrayado dorado se dibuja detrás del título');
  assert.equal(cardTitle({cardTitle:'OX-MR TRADUCCIONES',heading:'Capítulo 36'},'leer'),
    'OX-MR TRADUCCIONES','El título explícito tiene prioridad en tarjeta de capítulo');
  assert.match(overlaySVG({cardKicker:'Volumen 2 · Nuevo capítulo',cardTitle:'Obra'},'leer'),
    /VOLUMEN 2 · NUEVO CAPÍTULO/,'Faja editorial para capítulos de volúmenes');
  // Se conserva la tarjeta de cuatro elementos principales y se añade la faja editorial.
  // Cualquier texto de SEO continúa en el HTML, pero no se dibuja en el PNG.
  const minimum=overlaySVG({
    heading:'La prueba minimalista',description:'SINOPSIS_SECRETA',
    socialDescription:'EXTRACTO_SECRETO',author:'AUTOR_DE_PRUEBA',
    genres:['GENERO_DE_PRUEBA'],prelaunch:true
  },'serie',editorial.credits,true,[true]);
  assert.match(minimum,/PRÓXIMO ESTRENO/,'La faja se adapta al preestreno público');
  assert.match(minimum,/>La prueba<\/text>/,'Dibujar primera línea del título');
  assert.match(minimum,/>minimalista<\/text>/,'Dibujar segunda línea del título');
  for(const forbidden of ['SINOPSIS_SECRETA','EXTRACTO_SECRETO','AUTOR_DE_PRUEBA',
    'GENERO_DE_PRUEBA','PRÓXIMAMENTE','TRADUCCIÓN',
    'ELOBIDELLECTOR.COM','El Obi del Lector']){
    assert.ok(!minimum.includes(forbidden),'No dibujar texto accesorio '+forbidden);
  }
  assert.ok(!/font-size="(?:1[0-9]|2[0-9])"[^>]*>La prueba/.test(minimum),
    'El título no debe aparecer pequeño');
  assert.match(minimum,/<rect x="21" y="22"[^>]*fill="#f3ecd9"/,
    'Usar panel marfil de la web');
  assert.ok(titleLayout(editorial,'serie').lines.length<=3,'Título ocupa como máximo 3 líneas');
  assert.equal(cardTitle({heading:'¡No existe una gyaru que no termine cayendo por un otaku! Consideración: ◎, sinceridad: ◎'},'serie'),
    '¡No existe una gyaru que no termine cayendo por un otaku!','Extraer título editorial sin subtítulo repetido');
  assert.equal(cardTitle({heading:'Clasificación ◎ y ○ con △ y ×'},'serie'),
    'Clasificación excelente y buena con regular y baja','Normalizar glifos en imagen, nunca en BD');
  const trimmed=await prepareTranslatorLogo(paddedLogo,creditGeometry(1,0,true).tile.width,creditGeometry(1,0,true).tile.height);
  const trimmedMeta=await sharp(trimmed).metadata();
  assert.ok(trimmedMeta.width>=95,'El PNG ancho recorta márgenes y utiliza todo el espacio de logo');
  assert.ok(trimmedMeta.height>=9&&trimmedMeta.height<=creditGeometry(1,0,true).tile.height,'El logo conserva proporción');
  const g1=creditGeometry(1,0,true),g2=creditGeometry(2,1,true),g3=creditGeometry(3,2,true);
  assert.ok(g1.tile.width>g2.tile.width&&g2.tile.width>g3.tile.width,'Logo más grande con un solo traductor');
  assert.ok(g1.textX<g1.tile.x+g1.tile.width,'El texto SOLO ocupa el mismo espacio cuando no hay logo');
  assert.ok(g2.textX+g2.textWidth<745&&g3.textX+g3.textWidth<745,'Chips de hasta 3 equipos no invaden la portada');
  assert.doesNotMatch(visual,/NekoTL|LunaScans|Kitsune/,'No inventar traductores');
  const withoutLogo=overlaySVG(editorial,'serie',editorial.credits,true,[false]);
  assert.match(withoutLogo,/Grupo de traducción/,'Sin PNG permanece SOLO el nombre real');
  // Comparación de regiones rasterizadas: no basta con que una URL de logo exista.
  const withLogo=await run(imageHandler,'/api/og-image?kind=serie&slug=novela');
  await okPNG(withLogo,'Con logo real y recortado');
  useReaderLogo=true;
  const fromPublic=await publicData('serie','novela',null,null,'https://theobiproject-qa.vercel.app');
  assert.equal(fromPublic.credits[0].logo,legacy,'La preferencia reader_logo_url domina el avatar general');
  assert.equal(fromPublic.cardKicker,'Novela ligera · 3 volúmenes','Se usan los volúmenes del catálogo visible');
  const chapterData=await publicData('leer','novela','36',null,'https://theobiproject-qa.vercel.app');
  assert.equal(chapterData.cardKicker,'Volumen 2 · Nuevo capítulo');
  assert.equal(chapterData.cardTitle,series.title,'Capítulo destaca el nombre de la obra');
  assert.match(chapterData.title,/^El camino de los sueños · /,'El HTML utiliza el título real del capítulo');
  const actualReader=await run(imageHandler,'/api/og-image?kind=serie&slug=novela');
  await okPNG(actualReader,'Logo oficial del lector (no avatar genérico)');
  assert.ok(legacyRequests>0,'La tarjeta utiliza reader_logo_url real del perfil');
  hideCredits=true;
  const primary=await publicData('serie','novela',null,null,'https://theobiproject-qa.vercel.app');
  assert.equal(primary.credits[0].name,team.name,'Sin filas RPC usar equipo público principal');
  hideCredits=false;
  useReaderLogo=false;
  allowLogo=false;
  const textOnly=await publicData('serie','novela',null,null,'https://theobiproject-qa.vercel.app');
  assert.equal(textOnly.credits[0].logo,'','show_reader_logo=false prohíbe PNG');
  const noLogo=await run(imageHandler,'/api/og-image?kind=serie&slug=novela');
  await okPNG(noLogo,'Novela sin logo');
  const tile=creditGeometry(1,0,true).tile;
  const box={left:tile.x,top:tile.y,width:tile.width,height:tile.height};
  // Visual miniatura: WhatsApp puede dibujar a ~360px de ancho.
  const thumbnail=await sharp(withLogo.body).resize({width:360}).png().toBuffer();
  const previewMeta=await sharp(thumbnail).metadata();
  assert.equal(previewMeta.width,360);
  assert.equal(previewMeta.height,189);
  const titleRegion=await sharp(thumbnail).extract({left:19,top:72,width:202,height:68}).stats();
  assert.ok(titleRegion.channels[0].stdev>9,'En miniatura el título no debe ser una zona plana');
  const creditsRegion=await sharp(thumbnail).extract({left:20,top:141,width:201,height:36}).stats();
  assert.ok(creditsRegion.channels[0].stdev>12,'El área de traductores debe tener contraste visible incluso a 360 px');
  const regionWith=await sharp(withLogo.body).extract(box).raw().toBuffer();
  const regionWithout=await sharp(noLogo.body).extract(box).raw().toBuffer();
  assert.notDeepEqual(regionWith,regionWithout,'El logo debe producir píxeles visibles en la tarjeta');
  // Logos claros necesitan fondo oscuro, logos oscuros necesitan marfil.
  // La media global de brillo no demuestra contraste: comparar píxeles reales.
  let changed=0;
  for(let i=0;i<regionWith.length;i+=4){
    if(Math.abs(regionWith[i]-regionWithout[i])+
       Math.abs(regionWith[i+1]-regionWithout[i+1])+
       Math.abs(regionWith[i+2]-regionWithout[i+2])>36)changed++;
  }
  assert.ok(changed>box.width*box.height*.15,
    'El logo debe ocupar una superficie visual apreciable en la tarjeta');
  allowLogo=true;
  const html=await run(pageHandler,'/api/public-meta?kind=serie&slug=novela');
  assert.equal(html.statusCode,200);
  assert.match(html.body,/og:image:width" content="1200"/);
  assert.match(html.body,/og:image:height" content="630"/);
  assert.match(html.body,/api\/og-image\?kind=serie&amp;slug=novela&amp;v=/);
  assert.match(html.body,/twitter:image:alt/);
  const chHtml=await run(pageHandler,'/api/public-meta?kind=leer&slug=novela&chapter=36');
  assert.match(chHtml.body,/<meta property="og:title" content="El camino de los sueños · /,
    'Las redes reciben el título real del capítulo');
  assert.doesNotMatch(chHtml.body,/<meta property="og:title" content="[^"]* — El Obi del Lector"/,
    'Solo el title HTML conserva el sufijo institucional');
  assert.match(readFileSync(new URL('../api/public-meta.js',import.meta.url),'utf8'),/obi-social-obi-subrayado-v5/,'Renovar hash por nueva faja y subrayado');
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
  console.log('seo-social-image: minimalista de 4 elementos, sin textos accesorios, PNG O nombre, seguridad y 1200x630 OK');
}finally{
  globalThis.fetch=originalFetch;
  process.env=old;
}

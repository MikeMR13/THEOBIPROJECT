// Imagen Open Graph pública: comparte exactamente los criterios de privacidad de
// api/public-meta.js y consulta Supabase con la clave pública, jamás service_role.
import {publicData,hostOrigin} from './public-meta.js';
import {renderSocialCard,CARD_WIDTH,CARD_HEIGHT} from '../lib/social-card.js';

const paramsAllowed=new Set(['home','serie','leer','equipo']);
const validSlug=v=>/^[a-z0-9_-]{1,100}$/i.test(v||'');
const fail=(res,status)=>res.status(status).end();

export default async function handler(req,res) {
  if(req.method!=='GET' && req.method!=='HEAD')return fail(res,405);
  const origin=hostOrigin();
  const q=new URL(req.url||'/',origin).searchParams;
  const kind=q.get('kind')||'',slug=q.get('slug')||'',chapter=q.get('chapter')||'',vol=q.get('vol')||'';
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag',process.env.VERCEL_ENV==='production'?'noindex':'noindex,nofollow');
  // Nunca cachear sin revalidar RLS/visibilidad: una obra puede despublicarse.
  res.setHeader('Cache-Control','private, no-store');
  if(!paramsAllowed.has(kind) || (kind!=='home' && !validSlug(slug)) ||
    (kind==='leer' && !/^[1-9]\d{0,7}$/.test(chapter)) ||
    (kind==='serie' && vol && !/^[1-9]\d{0,2}$/.test(vol)) ||
    q.has('vista') || q.has('preview') || q.has('token'))return fail(res,404);
  // El contenido se valida exactamente como las páginas SSR: publicación, acceso,
  // fecha de apertura, equipo privado, prohibición de compartir +18 y noindex.
  let data;
  try{data=await publicData(kind,slug,chapter,vol,origin);}
  catch(e){console.warn('OG: datos públicos no disponibles',e.cause?.code||e.code||'unknown');return fail(res,503);}
  if(!data || data.noindex)return fail(res,404);
  res.setHeader('Content-Type','image/png');
  if(req.method==='HEAD')return res.status(200).end();
  try{
    const png=await renderSocialCard({
      kind,data,origin,
      backend:(process.env.OBI_SUPABASE_URL||'').replace(/\/+$/,'')
    });
    if(!png || png.length>6_000_000)throw new Error('PNG supera el límite aceptado');
    res.setHeader('Content-Length',String(png.length));
    return res.status(200).send(png);
  }catch(e){
    console.error('OG: renderizado falló',e.cause?.code||e.code||e.message);
    res.removeHeader?.('Content-Type');
    return fail(res,503);
  }
}

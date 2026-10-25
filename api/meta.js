// Compatibilidad con enlaces SEO antiguos. La fuente de verdad y las reglas
// de visibilidad son las mismas que utiliza el sitio público y las tarjetas OG.
// Nunca consultar directamente datos sin filtrar ni incrustar credenciales.
import publicMeta from './public-meta.js';

export default async function handler(req,res) {
  const u=new URL(req.url||'/', 'https://elobidellector.com');
  // Vercel puede pasar el query como req.query y añadir parámetros internos
  // de enrutamiento a req.url; aceptar solo los campos funcionales conocidos.
  const field=k=>{
    const value=req.query?.[k];
    return typeof value==='string'?value:(u.searchParams.get(k)||'');
  };
  const t=field('t'),slug=field('s'),chapter=field('n');
  const kind=({serie:'serie',leer:'leer',equipo:'equipo'})[t];
  if(!kind||!(/^[a-z0-9_-]{1,100}$/i).test(slug)||
      (kind==='leer'&&!(/^[1-9]\d{0,7}$/).test(chapter))||
      ['vista','preview','token'].some(k=>req.query?.[k]!==undefined||u.searchParams.has(k))) {
    res.setHeader('Cache-Control','private, no-store');
    return res.status(404).end();
  }
  const q=new URLSearchParams({kind,slug});
  if(kind==='leer')q.set('chapter',chapter);
  req.url='/api/public-meta?'+q.toString();
  return publicMeta(req,res);
}

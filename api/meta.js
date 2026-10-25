// Compatibilidad con enlaces SEO antiguos. La fuente de verdad y las reglas
// de visibilidad son las mismas que utiliza el sitio público y las tarjetas OG.
// Nunca consultar directamente datos sin filtrar ni incrustar credenciales.
import publicMeta from './public-meta.js';

export default async function handler(req,res) {
  const u=new URL(req.url||'/', 'https://elobidellector.com');
  const t=u.searchParams.get('t'), slug=u.searchParams.get('s')||'';
  const chapter=u.searchParams.get('n')||'';
  const kind=({serie:'serie',leer:'leer',equipo:'equipo'})[t];
  if(!kind||!(/^[a-z0-9_-]{1,100}$/i).test(slug)||
      (kind==='leer'&&!(/^[1-9]\\d{0,7}$/).test(chapter))||
      [...u.searchParams.keys()].some(k=>!['t','s','n'].includes(k))) {
    res.setHeader('Cache-Control','private, no-store');
    return res.status(404).end();
  }
  const q=new URLSearchParams({kind,slug});
  if(kind==='leer')q.set('chapter',chapter);
  req.url='/api/public-meta?'+q.toString();
  return publicMeta(req,res);
}

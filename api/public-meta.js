// Metadatos públicos renderizados en la respuesta HTTP para bots y navegadores.
// La aplicación SPA original sigue siendo la encargada de la navegación y la lectura.
const SITE = 'El Obi del Lector';
const DESC = 'Biblioteca de novelas ligeras traducidas al español latino por grupos de fans. Lee en línea, sigue tus obras y descubre nuevos capítulos.';
const FALLBACK_IMAGE = '/icon-512.png';
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const plain = v => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const limit = (v, n) => plain(v).slice(0, n);
const validSlug = v => /^[a-z0-9_-]{1,100}$/i.test(v || '');
const validReader = v => /^[\p{L}\p{N}_.-]{1,60}$/u.test(v || '');
const hostOrigin = () => process.env.VERCEL_ENV === 'production'
  ? 'https://elobidellector.com'
  : process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://elobidellector.com';
function media(path, backend, origin) {
  if (!path) return origin + FALLBACK_IMAGE;
  if (/^https:\/\//i.test(path)) {
    try { const u = new URL(path); if (u.hostname === new URL(backend).hostname || u.hostname === 'elobidellector.com') return u.toString(); } catch {}
    return origin + FALLBACK_IMAGE;
  }
  return backend + '/storage/v1/object/public/obi-media/' + String(path).split('/').map(encodeURIComponent).join('/');
}
async function query(table, params, backend, key) {
  if (!backend || !key) throw new Error('Falta configuración pública de Supabase');
  const u = new URL(backend + '/rest/v1/' + table);
  Object.entries(params).forEach(([name, val]) => u.searchParams.set(name, val));
  const ctrl = new AbortController();
  const stop = setTimeout(() => ctrl.abort(), 2200);
  try {
    const r = await fetch(u, { headers: { apikey: key, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) throw new Error('Consulta pública ' + table + ': ' + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] || null : rows;
  } finally { clearTimeout(stop); }
}
async function publicData(kind, slug, chapter, origin) {
  const backend = (process.env.OBI_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.OBI_SUPABASE_PUBLISHABLE_KEY || '';
  if (kind === 'serie' || kind === 'leer') {
    if (!validSlug(slug)) return null;
    const s = await query('series', { slug: 'eq.' + slug, published: 'eq.true', archived_at: 'is.null', select: 'id,slug,title,synopsis,cover_path,cover_thumb_path' }, backend, key);
    if (!s) return null;
    const base = { title: s.title + ' — ' + SITE, description: limit(s.synopsis || ('Lee ' + s.title + ' en español latino.'), 170), image: media(s.cover_path || s.cover_thumb_path, backend, origin), heading: s.title };
    if (kind === 'serie') return base;
    if (!/^\d{1,8}$/.test(chapter || '')) return null;
    const c = await query('chapters', { series_id: 'eq.' + s.id, num: 'eq.' + String(Number(chapter)), deleted_at: 'is.null', select: 'num,title,teaser' }, backend, key);
    if (!c) return null; // RLS debe ocultar cualquier capítulo no público.
    return { ...base, title: s.title + ' · Capítulo ' + c.num + ' — ' + SITE,
      description: limit((c.title ? c.title + '. ' : '') + (c.teaser || 'Lee este capítulo en El Obi del Lector.'), 170),
      heading: s.title + ' · Capítulo ' + c.num };
  }
  if (kind === 'equipo') {
    if (!validSlug(slug)) return null;
    const t = await query('teams', { slug: 'eq.' + slug, select: 'slug,name,bio,banner_path,avatar_path' }, backend, key);
    if (!t) return null;
    return { title: t.name + ' — ' + SITE, description: limit(t.bio || ('Conoce las traducciones y novedades de ' + t.name + '.'), 170), image: media(t.banner_path || t.avatar_path, backend, origin), heading: t.name };
  }
  if (kind === 'lector') {
    if (!validReader(slug)) return null;
    const p = await query('rpc/reader_public', { }, backend, key).catch(() => null);
    // El RPC de lectores requiere argumento por POST. Hasta disponer de una respuesta
    // anónima verificable, nunca incluir datos ni indexar carnets desde el servidor.
    void p;
    return { title: 'Carnet de lector — ' + SITE, description: 'Carnet de lector en El Obi del Lector.', image: origin + FALLBACK_IMAGE, heading: 'Carnet de lector', noindex: true };
  }
  return null;
}
function tags(data, canonical, origin, noindex) {
  const title = esc(data.title), desc = esc(data.description), image = esc(data.image || origin + FALLBACK_IMAGE);
  return [
    '<link rel="canonical" href="' + esc(canonical) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + SITE + '">',
    '<meta property="og:locale" content="es_419">',
    '<meta property="og:title" content="' + title + '">',
    '<meta property="og:description" content="' + desc + '">',
    '<meta property="og:url" content="' + esc(canonical) + '">',
    '<meta property="og:image" content="' + image + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + title + '">',
    '<meta name="twitter:description" content="' + desc + '">',
    '<meta name="twitter:image" content="' + image + '">',
    noindex ? '<meta name="robots" content="noindex,nofollow">' : ''
  ].join('\n');
}
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const origin = hostOrigin();
  const q = new URL(req.url || '/', origin).searchParams;
  const kind = String(q.get('kind') || '');
  const slug = String(q.get('slug') || '');
  const chapter = String(q.get('chapter') || '');
  const isDraft = q.has('vista');
  let path = '/';
  if (kind === 'serie') path = '/serie/' + encodeURIComponent(slug);
  else if (kind === 'leer') path = '/leer/' + encodeURIComponent(slug) + '/' + encodeURIComponent(chapter);
  else if (kind === 'equipo') path = '/equipo/' + encodeURIComponent(slug);
  else if (kind === 'lector') path = '/lector/' + encodeURIComponent(slug);
  else return res.status(404).end();
  const canonical = origin + path;
  let item = null, unavailable = false;
  try { item = await publicData(kind, slug, chapter, origin); }
  catch (e) { unavailable = true; console.warn('SEO pública temporalmente indisponible:', e.message); }
  const noindex = isDraft || !item || !!item.noindex || unavailable;
  const data = item || { title: SITE, description: DESC, image: origin + FALLBACK_IMAGE, heading: SITE };
  try {
    // Se solicita el HTML compilado, para conservar sellos de caché y todas las funciones SPA.
    const shell = await fetch(origin + '/index.html', { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(3500) });
    if (!shell.ok) throw new Error('HTML público: ' + shell.status);
    let html = await shell.text();
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + esc(data.title) + '</title>');
    html = html.replace(/<meta name="description"[^>]*>/i, '<meta name="description" content="' + esc(data.description) + '">');
    html = html.replace('</head>', tags(data, canonical, origin, noindex) + '</head>');
    if (item && !noindex) {
      const teaser = '<section aria-label="Presentación pública" style="padding:24px;max-width:920px;margin:auto"><h1>' + esc(data.heading) + '</h1><p>' + esc(data.description) + '</p></section>';
      html = html.replace(/(<main id="app"[^>]*>)(<\/main>)/, '$1' + teaser + '$2');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', noindex ? 'private, no-store' : 'public, s-maxage=120, stale-while-revalidate=300');
    if (noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    // Sólo una página inexistente confirmada es 404. Un backend caído no produce falsas bajas.
    return res.status(!item && !unavailable ? 404 : 200).send(req.method === 'HEAD' ? '' : html);
  } catch (e) {
    console.error('No se pudo componer el HTML SEO', e.message);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.status(503).send('Página temporalmente no disponible');
  }
}

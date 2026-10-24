// Sitemap público. La clave publishable de Supabase aplica RLS anónima.
// Ninguna página programada, archivada, retirada, privada o de acceso restringido.
const CANON = 'https://elobidellector.com';
const BATCH = 500;
const MAX_URLS = 40000; // margen bajo 50 000 entradas y 50 MB sin comprimir
const API_TIMEOUT_MS = 4000;
const goodSlug = v => /^[a-z0-9_-]{1,100}$/i.test(v || '');
const xml = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const iso = v => {
  if (!v) return '';
  const date = new Date(v);
  return Number.isNaN(date.valueOf()) || date.valueOf() > Date.now() ? '' : date.toISOString();
};
const validSeries = s => s && goodSlug(s.slug) && s.published === true && s.archived_at === null &&
  s.access === 'public' && s.adult !== true;
const validStatus = s => s && s.status === 'published' && s.access === 'public' && s.deleted_at === null;
const validPublishedTime = v => !v || (Number.isFinite(Date.parse(v)) && Date.parse(v) <= Date.now());
function client() {
  const base = String(process.env.OBI_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.OBI_SUPABASE_PUBLISHABLE_KEY || '';
  if (!/^https:\/\//.test(base) || !key) throw new Error('Falta configuración pública para sitemap');
  return { base, key };
}
async function getAll(table, filters, select) {
  const { base, key } = client();
  const rows = [];
  for (let offset = 0; offset <= MAX_URLS; offset += BATCH) {
    const target = new URL(base + '/rest/v1/' + table);
    target.searchParams.set('select', select);
    target.searchParams.set('order', 'id.asc');
    for (const [k,v] of Object.entries(filters)) target.searchParams.set(k,v);
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    let batch;
    try {
      const r = await fetch(target, {
        headers: { apikey: key, Accept: 'application/json', Range: offset + '-' + (offset + BATCH - 1) },
        signal: ctrl.signal
      });
      if (!r.ok) throw new Error(table + ': HTTP ' + r.status);
      batch = await r.json();
      if (!Array.isArray(batch)) throw new Error(table + ': respuesta no válida');
    } finally { clearTimeout(timer); }
    rows.push(...batch);
    if (rows.length > MAX_URLS) throw new Error('Sitemap demasiado grande: dividir en índices paginados');
    if (batch.length < BATCH) break;
  }
  return rows;
}
function entry(loc, lastmod) {
  const date = iso(lastmod);
  return '<url><loc>' + xml(CANON + loc) + '</loc>' + (date ? '<lastmod>' + date + '</lastmod>' : '') + '</url>';
}
async function generate() {
  const now = new Date().toISOString();
  // Consultar la identidad de la serie para validar RLS y evitar publicar slugs huérfanos.
  const [series, teams] = await Promise.all([
    getAll('series', { published: 'eq.true', archived_at: 'is.null', access: 'eq.public', adult: 'eq.false' },
      'id,slug,published,archived_at,access,adult'),
    getAll('teams', { status: 'neq.Proyecto privado' }, 'id,slug,status')
  ]);
  const safe = new Map(series.filter(validSeries).map(s => [s.id, s.slug]));
  const links = new Map();
  const add = (path, changed = null) => { if (!links.has(path)) links.set(path, entry(path,changed)); };
  for (const path of ['/', '/catalogo', '/calendario', '/lanzamientos', '/ranking', '/apoyar']) add(path);
  for (const s of series) if (safe.has(s.id)) add('/serie/' + encodeURIComponent(s.slug));
  for (const t of teams) if (goodSlug(t.slug) && t.status !== 'Proyecto privado')
    add('/equipo/' + encodeURIComponent(t.slug));
  if (safe.size) {
    const [volumes, chapters] = await Promise.all([
      getAll('volumes', { status: 'eq.published', deleted_at: 'is.null', access: 'eq.public' },
        'id,series_id,num,status,access,deleted_at,published_at'),
      getAll('chapters', { status: 'eq.published', deleted_at: 'is.null', access: 'eq.public',
        or: '(publish_at.is.null,publish_at.lte.' + now + ')' },
        'id,series_id,num,status,access,deleted_at,publish_at,updated_at')
    ]);
    for (const v of volumes) {
      const slug = safe.get(v.series_id);
      if (slug && validStatus(v) && Number.isInteger(v.num) && v.num > 0 && v.num < 1000 &&
          validPublishedTime(v.published_at)) add('/serie/' + encodeURIComponent(slug) + '?vol=' + v.num, v.published_at);
    }
    for (const c of chapters) {
      const slug = safe.get(c.series_id);
      if (slug && validStatus(c) && Number.isInteger(c.num) && c.num >= 1 &&
          validPublishedTime(c.publish_at)) add('/leer/' + encodeURIComponent(slug) + '/' + c.num, c.updated_at);
    }
  }
  if (links.size > MAX_URLS) throw new Error('Sitemap demasiado grande para un archivo');
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...links.values()].join('\n') + '\n</urlset>\n';
  if (Buffer.byteLength(body) > 45 * 1024 * 1024) throw new Error('Sitemap > 45 MB');
  return body;
}
export default async function handler(req,res) {
  if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return res.status(405).end(); }
  if (process.env.VERCEL_ENV !== 'production') {
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Cache-Control','private, no-store');
    return res.status(404).end();
  }
  try {
    const body = await generate();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=900');
    return res.status(200).send(req.method === 'HEAD' ? '' : body);
  } catch (e) {
    console.error('sitemap temporalmente indisponible', e.message);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Retry-After','300');
    return res.status(503).end();
  }
}

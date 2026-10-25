// /sitemap.xml en vivo desde Supabase: portada, páginas públicas, obras, capítulos y equipos.
export const config = { runtime: 'edge' };
const SITE = (process.env.OBI_SITE_URL || 'https://elobidellector.com').replace(/\/$/, '');
const SB = process.env.OBI_SUPABASE_URL || 'https://qfllthjpjuaztppvpsrk.supabase.co';
const KEY = process.env.OBI_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IiHzG1Jn2je075uuYVHTAg_dBVAAUf5';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const x = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

async function all(path, max = 45000){ // pagina de 1000 en 1000
  const out = [];
  for (let from = 0; from < max; from += 1000){
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error('supabase ' + r.status);
    const rows = await r.json(); out.push(...rows); if (rows.length < 1000) break;
  }
  return out;
}

export default async function handler(){
  const now = new Date().toISOString();
  const [series, chapters, teams] = await Promise.all([
    all('series?select=slug,adult,translation_status,created_at&order=created_at'),
    all(`chapters?select=num,publish_at,series!inner(slug,adult,translation_status)&publish_at=lte.${now}&series.adult=is.false&order=series_id,num`),
    all('teams?select=slug,status,created_at'),
  ]);
  const ok = s => s && !s.adult && s.translation_status !== 'withdrawn';
  const last = {}; const urls = [];
  for (const c of chapters){
    if (!ok(c.series)) continue;
    const d = c.publish_at?.slice(0, 10); if (d && (!last[c.series.slug] || d > last[c.series.slug])) last[c.series.slug] = d;
    urls.push([`/leer/${c.series.slug}/${c.num}`, d, '0.6']);
  }
  const top = [['/', null, '1.0'], ['/catalogo', null, '0.9'], ['/lanzamientos', null, '0.8'], ['/calendario', null, '0.7'], ['/ranking', null, '0.7'], ['/apoyar', null, '0.4'], ['/privacidad', null, '0.2'], ['/condiciones-servicio', null, '0.2']];
  const ser = series.filter(ok).map(s => [`/serie/${s.slug}`, last[s.slug] || s.created_at?.slice(0, 10), '0.9']);
  const tms = teams.filter(t => !t.status || /^(active|activo)$/i.test(t.status)).map(t => [`/equipo/${t.slug}`, t.created_at?.slice(0, 10), '0.5']);
  const body = [...top, ...ser, ...tms, ...urls].slice(0, 50000)
    .map(([p, d, pr]) => `<url><loc>${x(SITE + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${pr}</priority></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-cache', 'vercel-cdn-cache-control': 'max-age=3600, stale-while-revalidate=86400' },
  });
}

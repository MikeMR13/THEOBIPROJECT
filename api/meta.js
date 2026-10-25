// SEO en el servidor: devuelve el mismo index.html con <head> propio para /serie, /leer y /equipo.
// La app no cambia; solo ganan los buscadores y las vistas previas (WhatsApp, Discord, X, Telegram).
export const config = { runtime: 'edge' };
const SITE = (process.env.OBI_SITE_URL || 'https://elobidellector.com').replace(/\/$/, '');
const SB = process.env.OBI_SUPABASE_URL || 'https://qfllthjpjuaztppvpsrk.supabase.co';
const KEY = process.env.OBI_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IiHzG1Jn2je075uuYVHTAg_dBVAAUf5';
const BRAND = 'El Obi del Lector';
const MED = p => !p ? '' : /^https?:/.test(p) ? p : `${SB}/storage/v1/object/public/obi-media/${encodeURI(p)}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = (s, n = 155) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1) > 60 ? s.lastIndexOf(' ', n - 1) : n - 1).replace(/[,;:.\s]+$/, '') + '…'; };
const SLUG = /^[\w-]{1,120}$/;

async function q(path){
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}

async function serie(slug){
  const [s] = await q(`series?select=slug,title,original,author,illustrator,synopsis,genres,adult,cover_path,translation_status,teams(name,slug),chapters(count)&slug=eq.${slug}&limit=1`);
  if (!s || s.translation_status === 'withdrawn') return null;
  const url = `${SITE}/serie/${s.slug}`, team = s.teams?.name;
  return {
    url, adult: s.adult, type: 'book',
    title: `${s.title} — Novela ligera en español | ${BRAND}`,
    ogTitle: s.title,
    desc: s.adult ? `Contenido para adultos · ${s.title}` : clip((team ? `Traducción de ${team}. ` : '') + (s.synopsis || `Lee ${s.title} en español latino.`)),
    image: s.adult ? '' : MED(s.cover_path),
    ld: [{ '@context': 'https://schema.org', '@type': 'Book', name: s.title, ...(s.original ? { alternateName: s.original } : {}), url, inLanguage: 'es-419', bookFormat: 'https://schema.org/EBook',
      ...(s.author ? { author: { '@type': 'Person', name: s.author } } : {}), ...(s.illustrator ? { illustrator: { '@type': 'Person', name: s.illustrator } } : {}),
      ...(team ? { translator: { '@type': 'Organization', name: team, url: `${SITE}/equipo/${s.teams.slug}` } } : {}),
      ...(s.genres?.length ? { genre: s.genres } : {}), ...(!s.adult && s.cover_path ? { image: MED(s.cover_path) } : {}),
      ...(s.synopsis && !s.adult ? { description: clip(s.synopsis, 300) } : {}), ...(s.adult ? { isFamilyFriendly: false } : {}) },
      crumbs([['Catálogo', '/catalogo'], [s.title, `/serie/${s.slug}`]])]
  };
}

async function capitulo(slug, n){
  const [[c], [v]] = await Promise.all([
    q(`chapters?select=num,title,vol,publish_at,series!inner(slug,title,adult,cover_path,translation_status,teams(name))&series.slug=eq.${slug}&num=eq.${n}&limit=1`),
    q(`volumes?select=num,cover_path,series!inner(slug)&series.slug=eq.${slug}&order=num&limit=50`).then(r => [r]),
  ]);
  if (!c || c.series.translation_status === 'withdrawn') return null;
  const s = c.series, url = `${SITE}/leer/${slug}/${c.num}`, team = s.teams?.name;
  const ct = (c.title || '').trim(), t = !ct || /^cap[ií]tulo\s*\d+$/i.test(ct) ? `Capítulo ${c.num}` : /^(cap[ií]tulo|pr[oó]logo|ep[ií]logo|interludio|extra)\b/i.test(ct) ? ct : `Capítulo ${c.num}: ${ct}`;
  const lc = x => /^(cap[ií]tulo|pr[oó]logo|ep[ií]logo|interludio)\b/i.test(x) ? 'el ' + x[0].toLowerCase() + x.slice(1) : `«${x}»`;
  const volCover = (v || []).find(x => x.num === c.vol)?.cover_path;
  return {
    url, adult: s.adult, type: 'article',
    title: `${t} · ${s.title} | ${BRAND}`,
    ogTitle: `${t} · ${s.title}`,
    desc: s.adult ? `Contenido para adultos · ${s.title}` : clip(`Lee ${lc(t)} de ${s.title} en español latino.${c.vol ? ` Volumen ${c.vol}.` : ''}${team ? ` Traducción de ${team}.` : ''}`),
    image: s.adult ? '' : MED(volCover || s.cover_path),
    published: c.publish_at,
    ld: [{ '@context': 'https://schema.org', '@type': 'Chapter', name: t, url, position: c.num, inLanguage: 'es-419', ...(c.publish_at ? { datePublished: c.publish_at } : {}),
      isPartOf: { '@type': 'Book', name: s.title, url: `${SITE}/serie/${slug}` }, ...(s.adult ? { isFamilyFriendly: false } : {}) },
      crumbs([['Catálogo', '/catalogo'], [s.title, `/serie/${slug}`], [t, `/leer/${slug}/${c.num}`]])]
  };
}

async function equipo(slug){
  const [t] = await q(`teams?select=slug,name,bio,avatar_path,status,motto:design->>motto,series(count)&slug=eq.${slug}&limit=1`);
  if (!t || (t.status && !/^(active|activo)$/i.test(t.status))) return null;
  const url = `${SITE}/equipo/${t.slug}`, n = t.series?.[0]?.count || 0;
  return {
    url, type: 'profile',
    title: `${t.name} · Grupo traductor | ${BRAND}`,
    ogTitle: t.name,
    desc: clip(t.motto || t.bio || `Grupo traductor en ${BRAND}${n ? ` · ${n} ${n === 1 ? 'obra' : 'obras'} en español latino` : ''}.`),
    image: MED(t.avatar_path),
    ld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: t.name, url, ...(t.avatar_path ? { logo: MED(t.avatar_path) } : {}) }]
  };
}

const crumbs = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + p })) });

function head(m){
  const img = m.image || `${SITE}/icon-512.png`, card = m.image ? 'summary_large_image' : 'summary';
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.desc)}">`,
    `<link rel="canonical" href="${esc(m.url)}">`,
    m.adult ? '<meta name="robots" content="noindex,nofollow"><meta name="rating" content="adult">' : m.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">',
    `<meta property="og:site_name" content="${BRAND}">`, '<meta property="og:locale" content="es_LA">',
    `<meta property="og:type" content="${m.type}">`, `<meta property="og:url" content="${esc(m.url)}">`,
    `<meta property="og:title" content="${esc(m.ogTitle)}">`, `<meta property="og:description" content="${esc(m.desc)}">`,
    `<meta property="og:image" content="${esc(img)}">`, `<meta property="og:image:alt" content="${esc(m.ogTitle)}">`,
    m.published ? `<meta property="article:published_time" content="${esc(m.published)}">` : '',
    `<meta name="twitter:card" content="${card}">`, `<meta name="twitter:title" content="${esc(m.ogTitle)}">`,
    `<meta name="twitter:description" content="${esc(m.desc)}">`, `<meta name="twitter:image" content="${esc(img)}">`,
    ...(m.ld || []).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].filter(Boolean).join('\n');
}

export default async function handler(req){
  const u = new URL(req.url), t = u.searchParams.get('t'), s = u.searchParams.get('s') || '', n = u.searchParams.get('n') || '';
  const shell = await fetch(new URL('/index.html', req.url)).then(r => r.text());
  let m = null, status = 200;
  try {
    if (!SLUG.test(s)) m = null;
    else if (t === 'serie') m = await serie(s);
    else if (t === 'leer' && /^\d{1,5}$/.test(n)) { m = await capitulo(s, +n); if (!m && (m = await serie(s))) { m.url = `${SITE}/leer/${s}/${n}`; m.noindex = true; } } // capítulo privado o de mecenas: vista previa de la obra, sin indexar
    else if (t === 'equipo') m = await equipo(s);
    if (!m) status = 404;
  } catch { return send(shell, 200, 60); } // si Supabase falla, la página sigue funcionando con el head genérico
  const html = m
    ? shell.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, head(m))
    : shell.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, `<title>No encontrado | ${BRAND}</title><meta name="robots" content="noindex">`);
  return send(html, status, status === 200 ? 300 : 60);
}
const send = (html, status, ttl) => new Response(html, { status, headers: {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-cache',
  'vercel-cdn-cache-control': `max-age=${ttl}, stale-while-revalidate=86400`,
} });

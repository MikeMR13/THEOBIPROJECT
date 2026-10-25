import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {applySeo, cleanSiteSeo, editImages} from '../src/seo-settings.js';
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
const publishable = row => row?.access === 'public';
const validPublishedTime = stamp => !stamp || (Number.isFinite(Date.parse(stamp)) && Date.parse(stamp) <= Date.now());
export const hostOrigin = () => process.env.VERCEL_ENV === 'production'
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
async function rpc(name, data, backend, key) {
  if (!backend || !key) throw new Error('Falta configuración pública de Supabase');
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 2200);
  try {
    const r = await fetch(backend + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: { apikey: key, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(data), signal: ctrl.signal
    });
    if (!r.ok) throw new Error('RPC pública ' + name + ': ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
// Reproducir la preferencia que ya utiliza el lector de la plataforma:
// reader_logo_url (PNG del lector) > avatar de equipo > SOLO nombre.
const LEGACY_READER = /^https:\/\/hfbpsizgwzvvznrktiuq\.supabase\.co\/storage\/v1\/object\/public\/nlobi-media\/teams\/[a-f0-9-]{36}\/profile\/reader-logo-[0-9]+\.(?:png|webp|jpe?g)$/i;
function chosenReaderLogo(team, credit, backend, origin) {
  if (credit.show_reader_logo === false || team?.settings?.show_reader_logo === false) return '';
  const selected = team?.settings?.reader_logo_url;
  if (typeof selected === 'string' && LEGACY_READER.test(selected)) return selected;
  const candidate = typeof credit.avatar_path === 'string' ? credit.avatar_path : team?.avatar_path;
  const owner = credit.team_id || team?.id;
  return typeof candidate === 'string' && owner && candidate.startsWith(owner + '/') &&
    !candidate.includes('..') && !/[?#]/.test(candidate) ? media(candidate,backend,origin) : '';
}
async function socialCredits(id, teamId, backupName, backend, key, origin) {
  let rows = [];
  try {
    const result = await rpc('series_public_credits', {p_series_ids:[id]}, backend, key);
    if (Array.isArray(result)) rows = result;
  } catch (e) { console.warn('Créditos públicos no disponibles:',e.message); }
  const visible = rows.filter(r=>r && r.series_id===id && r.status!=='Proyecto privado' && r.name)
    .sort((a,b)=>Number(!!b.is_primary)-Number(!!a.is_primary)).slice(0,3);
  if (!visible.length && backupName && teamId)
    visible.push({team_id:teamId,name:backupName,is_primary:true,show_reader_logo:true});
  // Solo consultamos equipos que el RPC confirmó públicos; los datos de
  // preferencias son públicos pero no se permite ninguna URL arbitraria.
  const credits = await Promise.all(visible.map(async r=>{
    let team = null;
    try {
      team = await query('teams',{id:'eq.'+r.team_id,status:'neq.Proyecto privado',
        select:'id,name,avatar_path,settings'},backend,key);
    } catch {/* degradar siempre a nombre sin exponer borradores */}
    return {name:limit(r.name,42),
      logo:chosenReaderLogo(team,r,backend,origin),
      primary:!!r.is_primary};
  }));
  if (!credits.length && backupName)
    credits.push({name:limit(backupName,42),logo:'',primary:true});
  return credits.filter(c=>c.name);
}
export async function publicData(kind, slug, chapter, volume, origin) {
  const backend = (process.env.OBI_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.OBI_SUPABASE_PUBLISHABLE_KEY || '';
  if (kind === 'home') {
    const basic = { type: 'WebSite', title: 'El Obi del Lector — Novelas ligeras en español latino',
      description: DESC, image: origin + FALLBACK_IMAGE, heading: SITE };
    // Home falla abierto al HTML predeterminado: una base QA ausente no causa
    // caída de la página de Inicio. No se modifican permisos ni se publica nada.
    try {
      const row = await query('platform_settings', { id: 'eq.1',
        select: 'seo' }, backend, key);
      const cfg = cleanSiteSeo(row?.seo);
      return { ...basic, title: cfg.title || basic.title, description: cfg.description || basic.description,
        socialTitle: cfg.socialTitle || cfg.title || basic.title,
        socialDescription: cfg.socialDescription || cfg.description || basic.description };
    } catch { return basic; }
  }
  if (kind === 'serie' || kind === 'leer') {
    if (!validSlug(slug)) return null;
    const s = await query('series', { slug: 'eq.' + slug, published: 'eq.true', archived_at: 'is.null', access: 'eq.public', select: 'id,slug,title,synopsis,cover_path,cover_thumb_path,author,genres,access,adult,theme,media,team_id' }, backend, key);
    if (!s) {
      // Solo la ficha base, nunca un volumen ni un capítulo, admite preestreno.
      if (kind !== 'serie' || volume) return null;
      const p = await rpc('public_prelaunch_social', {p_slug:slug}, backend, key);
      if (!p?.id || p.slug !== slug) return null;
      const raw = {type:'Book',prelaunch:true,noindex:false,author:p.author||'',genres:p.genres||[],
        title:p.title+' — Próximamente en '+SITE,
        description:limit('Próximo estreno. '+(p.synopsis||('Descubre '+p.title+'.')),170),
        image:media(p.cover_path||p.cover_thumb_path,backend,origin),heading:p.title};
      const base = applySeo(raw,p.seo,{allowedImages:[p.cover_path,p.cover_thumb_path].filter(Boolean),
        media:path=>media(path,backend,origin)});
      return {...base,prelaunch:true,credits:await socialCredits(p.id,p.team_id,p.team_name,backend,key,origin)};
    }
    const raw = { type: 'Book', noindex: s.adult === true, author: s.author || '', genres: s.genres || [], title: s.title + ' — ' + SITE, description: limit(s.synopsis || ('Lee ' + s.title + ' en español latino.'), 170), image: media(s.cover_path || s.cover_thumb_path, backend, origin), heading: s.title };
    const base = {...applySeo(raw, s.theme?.seo, {allowedImages: editImages(s), media: p => media(p, backend, origin)}),
      credits: await socialCredits(s.id,s.team_id,'',backend,key,origin)};
    if (kind === 'serie') {
      if (!volume) return base;
      if (!/^\d{1,3}$/.test(volume) || Number(volume) < 1) return null;
      const v = await query('volumes', {
        series_id: 'eq.' + s.id, num: 'eq.' + String(Number(volume)),
        status: 'eq.published', access: 'eq.public', deleted_at: 'is.null',
        select: 'num,title,synopsis,cover_path,access,published_at'
      }, backend, key);
      if (!v || !publishable(v) || !validPublishedTime(v.published_at)) return null;
      const name = s.title + ' · Volumen ' + v.num;
      return { type: 'Book', noindex: base.noindex, credits: base.credits, author: s.author || '', genres: s.genres || [], title: name + ' — ' + SITE,
        description: limit(v.synopsis || ('Descubre el volumen ' + v.num + ' de ' + s.title + '.'), 170),
        image: media(v.cover_path || s.cover_path || s.cover_thumb_path, backend, origin),
        heading: name };
    }
    if (!/^\d{1,8}$/.test(chapter || '')) return null;
    const c = await query('chapters', { series_id: 'eq.' + s.id, num: 'eq.' + String(Number(chapter)), status: 'eq.published', access: 'eq.public', deleted_at: 'is.null', or: '(publish_at.is.null,publish_at.lte.' + new Date().toISOString() + ')', select: 'num,title,teaser,status,access,publish_at,public_at' }, backend, key);
    if (!c || c.status !== 'published' || !publishable(c) || !validPublishedTime(c.publish_at) || !validPublishedTime(c.public_at)) return null; // RLS + estado público
    return { ...base, type: 'Chapter', socialTitle: '', socialDescription: '', bookTitle: s.title, title: s.title + ' · Capítulo ' + c.num + ' — ' + SITE,
      description: limit((c.title ? c.title + '. ' : '') + (c.teaser || 'Lee este capítulo en El Obi del Lector.'), 170),
      heading: s.title + ' · Capítulo ' + c.num };
  }
  if (kind === 'equipo') {
    if (!validSlug(slug)) return null;
    const t = await query('teams', { slug: 'eq.' + slug, status: 'neq.Proyecto privado', select: 'id,slug,name,bio,banner_path,avatar_path,status,settings' }, backend, key);
    if (!t || t.status === 'Proyecto privado') return null;
    const base = { type: 'Organization', title: t.name + ' — ' + SITE, description: limit(t.bio || ('Conoce las traducciones y novedades de ' + t.name + '.'), 170), image: media(t.banner_path || t.avatar_path, backend, origin), heading: t.name };
    return applySeo(base,t.settings?.seo,{allowedImages:[t.banner_path,t.avatar_path].filter(p => typeof p === 'string' && p.startsWith(t.id+'/')),
      media:p => media(p,backend,origin)});
  }
  if (kind === 'lector') {
    if (!validReader(slug)) return null;
    // Reutilizar exclusivamente el RPC público que respeta los ajustes del carnet.
    const ctrl = new AbortController();
    const stop = setTimeout(() => ctrl.abort(), 2200);
    let r;
    try {
      const resp = await fetch(backend + '/rest/v1/rpc/reader_public', {
        method: 'POST', headers: { apikey: key, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_username: slug }), signal: ctrl.signal
      });
      if (!resp.ok) throw new Error('reader_public: ' + resp.status);
      r = await resp.json();
    } finally { clearTimeout(stop); }
    if (!r) return null;
    if (r.private) return { title: 'Carnet privado — ' + SITE, description: 'Perfil privado de lector.', image: origin + FALLBACK_IMAGE, heading: 'Carnet privado', noindex: true };
    const nickname = limit(r.username || slug, 60);
    return { type: 'ProfilePage', title: 'Carnet de ' + nickname + ' — ' + SITE,
      description: limit(r.bio || ('Conoce el carnet público de ' + nickname + ' en El Obi del Lector.'), 170),
      image: media(r.banner_url || r.avatar_url, backend, origin), heading: 'Carnet de ' + nickname };
  }
  return null;
}
function structuredData(data, canonical, kind, origin) {
  const site = { '@type': 'Organization', '@id': origin + '/#organization', name: SITE, url: origin + '/' };
  const trail = [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: origin + '/' }];
  if (kind === 'leer') {
    const parts = canonical.match(/\/leer\/([^/]+)\/\d+$/);
    if (parts) trail.push({ '@type': 'ListItem', position: 2, name: data.bookTitle || data.heading, item: origin + '/serie/' + parts[1] });
  }
  const node = {
    '@context': 'https://schema.org',
    '@graph': [
      site,
      { '@type': 'WebSite', '@id': origin + '/#website', name: SITE, url: origin + '/', inLanguage: 'es-419', publisher: { '@id': origin + '/#organization' } },
      {
        '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: data.title,
        description: data.description, inLanguage: 'es-419', isPartOf: { '@id': origin + '/#website' }
      }
    ]
  };
  // Book describe la obra, sin atribuir la autoría al grupo traductor ni prometer
  // prestaciones especiales de Google Books.
  if (data.type === 'Book') {
    const book = { '@type': 'Book', '@id': canonical + '#book', name: data.heading, url: canonical,
      inLanguage: 'es', description: data.description, image: data.image, isAccessibleForFree: true };
    if (data.author) book.author = { '@type': 'Person', name: data.author };
    if (data.genres?.length) book.genre = data.genres.slice(0,12);
    node['@graph'].push(book);
  } else if (data.type === 'Chapter') {
    node['@graph'].push({ '@type': 'Chapter', '@id': canonical + '#chapter', name: data.heading,
      url: canonical, inLanguage: 'es', isPartOf: { '@type': 'Book', name: data.bookTitle } });
  } else if (data.type === 'Organization') {
    node['@graph'].push({ '@type': 'Organization', '@id': canonical + '#team',
      name: data.heading, url: canonical, description: data.description, image: data.image });
  } else if (data.type === 'ProfilePage') {
    node['@graph'].push({ '@type': 'ProfilePage', '@id': canonical + '#profile',
      name: data.title, url: canonical, description: data.description });
  }
  trail.push({ '@type': 'ListItem', position: trail.length + 1, name: data.heading, item: canonical });
  node['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: trail });
  // Evitar que una cadena inserte </script> en HTML.
  return '<script type="application/ld+json">' +
    JSON.stringify(node).replace(/</g, '\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026') +
    '</script>';
}
function tags(data, canonical, origin, noindex, {kind,slug,chapter,volume,isDraft,publicItem=false}={}) {
  const title = esc(data.title), desc = esc(data.description);
  const socialTitle = esc(data.socialTitle || data.title), socialDesc = esc(data.socialDescription || data.description);
  // La URL solo incorpora parámetros verificables. Un cambio editorial
  // altera el hash y evita una imagen antigua en las cachés de redes.
  const socialKinds = new Set(['home','serie','leer','equipo']);
  const eligible = publicItem && socialKinds.has(kind) && !isDraft && !data.noindex && (kind === 'home' || !!slug);
  const key = createHash('sha256').update(JSON.stringify([
    data.title,data.description,data.socialTitle,data.socialDescription,data.image,
    'obi-site-brand-logo-exclusive-v3',data.heading,data.prelaunch,data.credits,kind,slug,chapter,volume
  ])).digest('hex').slice(0,12);
  const qs = new URLSearchParams({kind});
  if(slug) qs.set('slug',slug);
  if(chapter)qs.set('chapter',chapter);
  if(volume)qs.set('vol',volume);
  qs.set('v',key);
  const rawImage = eligible ? origin+'/api/og-image?'+qs.toString() : origin+FALLBACK_IMAGE;
  const image = esc(rawImage);
  return [
    '<link rel="canonical" href="' + esc(canonical) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + SITE + '">',
    '<meta property="og:locale" content="es_419">',
    '<meta property="og:title" content="' + socialTitle + '">',
    '<meta property="og:description" content="' + socialDesc + '">',
    '<meta property="og:url" content="' + esc(canonical) + '">',
    '<meta property="og:image" content="' + image + '">',
    ...(eligible ? [
      '<meta property="og:image:type" content="image/png">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="' + esc('Tarjeta editorial de '+(data.heading||SITE)) + '">'
    ] : []),
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + socialTitle + '">',
    '<meta name="twitter:description" content="' + socialDesc + '">',
    '<meta name="twitter:image" content="' + image + '">',
    ...(eligible ? ['<meta name="twitter:image:alt" content="' + esc('Tarjeta editorial de '+(data.heading||SITE)) + '">'] : []),
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
  const volume = String(q.get('vol') || '');
  const isDraft = q.has('vista');
  let path = '/';
  if (kind === 'home') path = '/';
  else if (kind === 'serie') path = '/serie/' + encodeURIComponent(slug);
  else if (kind === 'leer') path = '/leer/' + encodeURIComponent(slug) + '/' + encodeURIComponent(chapter);
  else if (kind === 'equipo') path = '/equipo/' + encodeURIComponent(slug);
  else if (kind === 'lector') path = '/lector/' + encodeURIComponent(slug);
  else return res.status(404).end();
  const volumeKey = kind === 'serie' && /^\d{1,3}$/.test(volume) && Number(volume) > 0 ? String(Number(volume)) : '';
  const canonical = origin + path + (volumeKey ? '?vol=' + volumeKey : '');
  let item = null, unavailable = false;
  try { item = await publicData(kind, slug, chapter, volume, origin); }
  catch (e) { unavailable = true; console.warn('SEO pública temporalmente indisponible:', e.message, 'code:', e.cause?.code || e.code || 'unknown'); }
  const preview = process.env.VERCEL_ENV !== 'production';
  const noindex = preview || isDraft || (!item && !unavailable) || !!item?.noindex;
  const data = item || { title: SITE, description: DESC, image: origin + FALLBACK_IMAGE, heading: SITE };
  try {
    // Se solicita el HTML compilado, para conservar sellos de caché y todas las funciones SPA.
    let html;
    try {
      // Este archivo viaja dentro de la función Vercel: funciona también tras SSO.
      html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
    } catch {
      // Alternativa útil en desarrollo local; no se usa en deploy normal.
      const shell = await fetch(origin + '/index.html', { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(3500) });
      if (!shell.ok) throw new Error('HTML público: ' + shell.status);
      html = await shell.text();
    }
    // El shell contiene las etiquetas por defecto del Inicio: eliminarlas antes
    // de insertar las específicas para evitar dos canonicals u Open Graph.
    html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');
    html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
    html = html.replace(/<meta\s+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\s*/gi, '');
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + esc(data.title) + '</title>');
    html = html.replace(/<meta name="description"[^>]*>/i, '<meta name="description" content="' + esc(data.description) + '">');
    html = html.replace('</head>', tags(data, canonical, origin, noindex, {kind,slug,chapter,volume:volumeKey,isDraft,publicItem:!!item}) + (item && !noindex ? structuredData(data, canonical, kind, origin) : '') + '</head>');
    if (item && !noindex && kind !== 'home') {
      const teaser = '<section aria-label="Presentación pública" style="padding:24px;max-width:920px;margin:auto"><h1>' + esc(data.heading) + '</h1><p>' + esc(data.description) + '</p></section>';
      html = html.replace(/(<main id="app"[^>]*>)(<\/main>)/, '$1' + teaser + '$2');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', noindex || unavailable ? 'private, no-store' : 'public, s-maxage=120, stale-while-revalidate=300');
    if (unavailable) res.setHeader('Retry-After', '60');
    if (noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    // Sólo una página inexistente confirmada es 404. Un backend caído no produce falsas bajas.
    return res.status(unavailable ? 503 : !item ? 404 : 200).send(req.method === 'HEAD' ? '' : html);
  } catch (e) {
    console.error('No se pudo componer el HTML SEO', e.message);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.status(503).send('Página temporalmente no disponible');
  }
}

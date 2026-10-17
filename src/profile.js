// Perfil público de lector (carnet) y página /preferencias. Se carga solo al visitar esas rutas.
const ICON = {
  discord: ['Discord', 'M7 7c3-1.5 7-1.5 10 0l2 9c-2 2-4 2.5-5 2.5l-1-2h-2l-1 2C9 18.5 7 18 5 16z M9.5 12.5h.01 M14.5 12.5h.01', 'https://discord.gg/…'],
  x: ['X', 'M5 5l14 14M19 5L5 19', 'https://x.com/usuario'],
  instagram: ['Instagram', 'M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3z M12 9a3 3 0 110 6 3 3 0 010-6z M17 7h.01', 'https://instagram.com/usuario'],
  tiktok: ['TikTok', 'M14 4v10a3.5 3.5 0 11-3.5-3.5 M14 4c.5 2.5 2 4 4.5 4', 'https://tiktok.com/@usuario'],
  web: ['Sitio web', 'M12 3a9 9 0 110 18 9 9 0 010-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18', 'https://…'],
  youtube: ['YouTube', 'M4 7.5C4 6 5 5 6.5 5h11C19 5 20 6 20 7.5v9c0 1.5-1 2.5-2.5 2.5h-11C5 19 4 18 4 16.5z M10 9l5 3-5 3z', 'https://youtube.com/@usuario'],
  twitch: ['Twitch', 'M5 4h14v10l-4 4h-3l-3 3v-3H5z M11 8v4 M15 8v4', 'https://twitch.tv/usuario'],
  facebook: ['Facebook', 'M15 4h-2a4 4 0 00-4 4v3H7v3h2v7h3v-7h2.5l.5-3h-3V8a1 1 0 011-1h2z', 'https://facebook.com/usuario'],
  threads: ['Threads', 'M16 11c-.5-3-2.5-4-4.5-4C9 7 7 9 7 12s2 5 5 5c2.5 0 4.5-1.5 4.5-3.5S15 10.5 12.5 10.5 10 12 10 13s1 1.5 2 1.5c2 0 3-2 3-5', 'https://threads.net/@usuario'],
  bluesky: ['Bluesky', 'M12 11c-1.5-3-5-6-7-6-1 0-1 1.5-1 2.5 0 2 1 4 3.5 4.5C5 12.5 4 14 6 16s4 0 6-4c2 4 4 6 6 4s1-3.5-1.5-4C19 11.5 20 9.5 20 7.5 20 6.5 20 5 19 5c-2 0-5.5 3-7 6z', 'https://bsky.app/profile/usuario'],
  reddit: ['Reddit', 'M12 9c4 0 7 2 7 5s-3 5-7 5-7-2-7-5 3-5 7-5z M12 9l1-5 4 1 M17.5 5h.01 M9.5 13.5h.01 M14.5 13.5h.01 M9.5 16c1.5 1 3.5 1 5 0', 'https://reddit.com/u/usuario'],
  telegram: ['Telegram', 'M20 4L3 11l6 2 2 6 3-4 5 4z M9 13l11-9', 'https://t.me/usuario'],
  patreon: ['Patreon', 'M14.5 4a5.5 5.5 0 110 11 5.5 5.5 0 010-11z M5 4v16', 'https://patreon.com/usuario'],
  kofi: ['Ko-fi', 'M4 8h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4z M16 9h2a2 2 0 010 4h-2 M10 11l-1.5-1.2a1 1 0 011.5-1.2 1 1 0 011.5 1.2z', 'https://ko-fi.com/usuario'],
  wattpad: ['Wattpad', 'M4 7l3 10 3-7 2 7 3-10 M17 7l1.5 5L20 7', 'https://wattpad.com/user/usuario'],
  goodreads: ['Goodreads', 'M15 5v10a4 4 0 01-8 0 M11 5a4 4 0 110 8 4 4 0 010-8z', 'https://goodreads.com/usuario'],
  anilist: ['AniList', 'M4 19L9 5h3l5 14 M6.5 13h5 M15 5h3v9.5h2', 'https://anilist.co/user/usuario'],
  myanimelist: ['MyAnimeList', 'M3 16V8l3 4 3-4v8 M12 16l2.5-8L17 16 M13 13h3 M19 8v8h2', 'https://myanimelist.net/profile/usuario'],
  pixiv: ['Pixiv', 'M7 20V5 M7 6h5a4.5 4.5 0 010 9H7', 'https://pixiv.net/users/…'],
  spotify: ['Spotify', 'M12 3a9 9 0 110 18 9 9 0 010-18z M7 9.5c3.5-1 7-.7 10 1 M7.5 12.5c3-.8 6-.5 8.5 1 M8 15.5c2.5-.6 4.5-.4 6.5.7', 'https://open.spotify.com/user/…'],
  steam: ['Steam', 'M12 3a9 9 0 110 18 9 9 0 010-18z M15 7a2.5 2.5 0 110 5 2.5 2.5 0 010-5z M3.5 13l5 2 M8.5 15a2 2 0 103.5-1.5l1.5-2', 'https://steamcommunity.com/id/usuario'],
  github: ['GitHub', 'M9 19c-4 1.5-4-2-6-2.5 M15 21v-3.5c0-1 .1-1.5-.5-2 2.5-.3 5-1.2 5-5.5a4.2 4.2 0 00-1.2-3 4 4 0 00-.1-3s-1-.3-3.2 1.2a11 11 0 00-6 0C6.8 3.7 5.8 4 5.8 4a4 4 0 00-.1 3 4.2 4.2 0 00-1.2 3c0 4.3 2.5 5.2 5 5.5-.6.5-.6 1.2-.5 2V21', 'https://github.com/usuario']
};
const GROUPS = [['Redes', ['discord', 'x', 'instagram', 'tiktok', 'facebook', 'threads', 'bluesky', 'reddit', 'telegram']], ['Video y streaming', ['youtube', 'twitch']], ['Lectura y anime', ['goodreads', 'anilist', 'myanimelist', 'wattpad']], ['Apoyo', ['patreon', 'kofi']], ['Otros', ['pixiv', 'spotify', 'steam', 'github', 'web']]];
const svg = (k, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[k][1]}"/></svg>`;
const SWATCH = ['#f2c230', '#d9922b', '#f59e7a', '#c9a8f2', '#8cc3f2', '#a9d18e', '#e3dccb'];
const SECS = [['favs', 'Favoritas', true], ['seals', 'Sellos', true], ['shelves', 'Estanterías', false], ['reviews', 'Reseñas', false]];
const SHELF = [['reading', 'Leyendo'], ['done', 'Terminadas'], ['plan', 'Pendientes']];
const KANJI = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]$/;

const CSS = `
.lc{display:grid;gap:44px}
.lc-card{position:relative;overflow:hidden;border:1px solid var(--line);min-height:340px;display:grid;align-items:end}
.lc-bg{position:absolute;inset:0;display:grid;grid-template-columns:repeat(var(--n,5),1fr);opacity:.75;background:var(--ac) center/cover}
.lc-bg span{background:center/cover}
.lc-sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,12,10,.05) 0%,rgba(13,12,10,.55) 45%,rgba(13,12,10,.94) 85%)}
.lc-kj{position:absolute;top:18px;right:18px;z-index:1;width:52px;height:52px;border:2px solid #c8402e;background:#0d0c0a;color:#e2604b;display:grid;place-items:center;font:800 30px 'Shippori Mincho B1',serif;border-radius:4px}
.lc-in{position:relative;display:flex;flex-wrap:wrap;gap:20px 24px;align-items:flex-end;padding:clamp(20px,3vw,36px)}
.lc-av{flex:none;width:112px;height:112px;border-radius:50%;border:3px solid var(--ac);background:#2a2519;display:grid;place-items:center;font:800 48px 'Shippori Mincho B1',serif;color:var(--ac);overflow:hidden}
.lc-av img{width:100%;height:100%;object-fit:cover}
.lc-tx{display:grid;gap:8px;min-width:0;flex:1 1 300px}
.lc-tx .k{font:11px 'IBM Plex Mono',monospace;letter-spacing:.16em;color:var(--ac)}
.lc-tx h1{margin:0;font:800 clamp(32px,4.4vw,54px)/1 'Shippori Mincho B1',serif;overflow-wrap:anywhere}
.lc-tx p{margin:0;font:16px/1.55 Literata,serif;max-width:60ch;color:#e3dccb;text-wrap:pretty;white-space:pre-line}
.lc-ln{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.lc-ln a{display:flex;gap:7px;align-items:center;font:12px 'IBM Plex Mono',monospace;padding:6px 12px 6px 9px;border:1px solid #5a503b;background:rgba(13,12,10,.7);color:var(--paper);text-decoration:none;border-radius:999px}
.lc-ln a:hover{border-color:var(--ac);color:var(--ac)}
.lc-se{display:flex;gap:10px}
.lc-se span{width:62px;height:62px;border-radius:50%;border:2px solid #c8402e;color:#e2604b;display:grid;place-items:center;font:800 26px 'Shippori Mincho B1',serif;transform:rotate(-8deg);background:#0d0c0a}
.lc h2{margin:0;font:800 26px 'Shippori Mincho B1',serif}
.lc-sec{display:grid;gap:16px}
.lc-fav{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}
.lc-fav a,.lc-shg a{display:grid;gap:8px;text-decoration:none;color:var(--paper);font-size:14px;font-weight:600}
.lc-cv{aspect-ratio:3/4;background:var(--c,#2a2519) center/cover;box-shadow:0 14px 30px rgba(0,0,0,.45);display:grid;align-items:end;padding:10px;font:800 14px 'Shippori Mincho B1',serif;color:#0d0c0a}
.lc-cv[style*="url"]{color:transparent}
.lc-hd{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between}
.lc-tabs{display:flex;gap:4px;border:1px solid var(--line);padding:3px;flex-wrap:wrap}
.lc-tabs button{border:0;cursor:pointer;padding:8px 14px;font:600 13px 'IBM Plex Sans',sans-serif;background:transparent;color:var(--paper);min-height:36px}
.lc-tabs button.on{background:var(--ac);color:#0d0c0a}
.lc-shg{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px}
.lc-shg a{font-size:13px}
.lc-more{font:12px 'IBM Plex Mono',monospace;color:var(--mute)}
.lc-rv{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px}
.lc-rv article{border:1px solid var(--line);background:#1c1a14;padding:16px;display:grid;grid-template-columns:72px minmax(0,1fr);gap:16px;align-items:start}
.lc-rv article>div{display:grid;gap:8px;min-width:0}
.lc-rv .t{font-weight:700;text-decoration:none}
.lc-rv p{margin:0;font:15px/1.6 Literata,serif;color:#e3dccb;text-wrap:pretty}
.lc-rv .sp{filter:blur(5px);cursor:pointer}
.lc-rv small{font:12px 'IBM Plex Mono',monospace;color:var(--mute)}
.lc-empty{color:var(--mute);font:13px 'IBM Plex Mono',monospace}
@media(max-width:640px){.lc-av{width:84px;height:84px;font-size:36px}.lc-se span{width:48px;height:48px;font-size:20px}.lc-kj{width:42px;height:42px;font-size:24px}}

.pf{display:flex;flex-wrap:wrap;border:1px solid var(--line);background:#14120e;margin-top:20px}
.pf-nav{flex:1 1 200px;max-width:240px;border-right:1px solid var(--line);padding:18px 0;display:grid;align-content:start}
.pf-nav a{padding:11px 20px;text-decoration:none;font-size:14px;font-weight:600;color:var(--mute);border-left:3px solid transparent}
.pf-nav a.on{color:var(--paper);background:#1f1c15;border-left-color:var(--gold)}
.pf-body{flex:999 1 420px;padding:clamp(18px,3vw,32px);display:grid;gap:28px;min-width:0}
.pf-body h2{margin:0;font:800 26px 'Shippori Mincho B1',serif}
.pf-body h3{margin:0;font-size:16px}
.pf-note{margin:0;color:var(--mute);font-size:14px}
.pf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px}
.pf-f{display:grid;gap:6px;font-size:13px;font-weight:600}
.pf-f textarea,.pf-f input,.pf-row input,.pf-row select,.pf-q{background:#0d0c0a;border:1px solid var(--line);color:var(--paper);padding:10px;font:15px/1.5 'IBM Plex Sans',sans-serif;min-height:44px;box-sizing:border-box}
.pf-f textarea{font-family:Literata,serif;resize:vertical}
.pf-kj{width:64px!important;text-align:center;border:2px solid #c8402e!important;color:#e2604b!important;font:800 28px 'Shippori Mincho B1',serif!important}
.pf-sw{display:flex;gap:8px;flex-wrap:wrap}
.pf-sw button{width:34px;height:34px;border-radius:50%;border:2px solid transparent;cursor:pointer}
.pf-sw button.on{border-color:var(--paper);box-shadow:0 0 0 2px #0d0c0a inset}
.pf-up{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pf-up label{flex:none;white-space:nowrap;cursor:pointer}
.pf-up input{display:none}
.pf-ban{width:160px;height:60px;background:#1c1a14 center/cover;border:1px solid var(--line)}
.pf-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 12px;border:1px solid #2c281e;background:#0d0c0a}
.pf-row input{flex:1 1 180px;min-width:0;font:13px 'IBM Plex Mono',monospace}
.pf-row select{flex:0 0 150px}
.pf-row .ic{display:grid;place-items:center;width:20px;flex:none}
.pf-row.off{opacity:.55}
.pf-x{background:none;border:0;color:var(--mute);cursor:pointer;font-size:20px;min-width:44px;min-height:44px}
.pf-x:hover{color:#f59e7a}
.pf-tg{flex:none;width:44px;height:26px;border-radius:999px;border:1px solid #5a503b;background:#2c281e;padding:2px;cursor:pointer;display:flex;justify-content:flex-start}
.pf-tg[aria-pressed="true"]{background:var(--gold);justify-content:flex-end}
.pf-tg i{width:20px;height:20px;border-radius:50%;background:var(--paper)}
.pf-sl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}
.pf-sl>div{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border:1px solid #2c281e;background:#0d0c0a}
.pf-favs{display:flex;flex-wrap:wrap;gap:12px}
.pf-favs>span{position:relative;width:84px;display:grid;gap:6px;font-size:12px}
.pf-favs .pf-x{position:absolute;top:-10px;right:-10px;min-width:28px;min-height:28px;width:28px;height:28px;border-radius:50%;background:#0d0c0a;border:1px solid var(--line);font-size:14px}
.pf-res{display:grid;gap:4px;max-width:420px}
.pf-res button{display:flex;gap:10px;align-items:center;text-align:left;background:#0d0c0a;border:1px solid var(--line);color:var(--paper);padding:6px 10px;cursor:pointer;min-height:44px;font:14px 'IBM Plex Sans',sans-serif}
.pf-res button:hover{border-color:var(--gold)}
.pf-res i{width:28px;height:38px;flex:none;background:var(--c) center/cover}
.pf-save{position:sticky;bottom:0;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:flex-end;padding:14px 0 0;border-top:1px solid var(--line);background:#14120e}
.pf-save .mono{margin-right:auto}
@media(max-width:700px){.pf-nav{max-width:none;flex-basis:100%;border-right:0;border-bottom:1px solid var(--line);display:flex;overflow-x:auto;padding:0}.pf-nav a{border-left:0;border-bottom:3px solid transparent;white-space:nowrap}.pf-nav a.on{border-bottom-color:var(--gold)}}
`;
const css = () => { if (document.getElementById('lc-css')) return; const s = document.createElement('style'); s.id = 'lc-css'; s.textContent = CSS; document.head.appendChild(s); };

export async function publicProfile(C, name){
  const { sb, app, esc, url, statsHTML } = C; css();
  const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
  const cov = s => MED(s.cover_thumb_path || s.cover_path);
  app.innerHTML = '<p class="mono">Cargando perfil…</p>';
  const { data: r } = await sb.rpc('reader_public', { p_username: name });
  if (!r) { app.innerHTML = '<h1>Lector no encontrado</h1><p><a href="/">Volver al inicio</a></p>'; return; }
  const ac = r.accent || '#f2c230', favs = r.favorites || [], se = r.seals;
  const seals = se ? [se.donor && ['援', 'Apoya a los traductores en Patreon'],
    se.chapters >= 1000 ? ['千', 'Más de 1000 capítulos leídos'] : se.chapters >= 100 ? ['百', 'Más de 100 capítulos leídos'] : se.chapters >= 10 ? ['十', 'Más de 10 capítulos leídos'] : null,
    se.useful && ['評', 'Escribió una reseña útil']].filter(Boolean) : [];
  const bg = r.banner_url ? `<div class="lc-bg" style="background-image:url('${esc(r.banner_url)}')"></div>`
    : favs.length ? `<div class="lc-bg" style="--n:${favs.length}">${favs.map(f => `<span style="background-color:${esc(f.color)};${f.cover_path ? `background-image:url('${esc(cov(f))}')` : ''}"></span>`).join('')}</div>`
    : '<div class="lc-bg" style="opacity:.35"></div>';
  const card = s => `<span class="lc-cv" style="--c:${esc(s.color || '#2a2519')};${s.cover_path ? `background-image:url('${esc(cov(s))}')` : ''}">${esc(s.title)}</span>`;
  const sh = r.shelves || {}, firstShelf = (SHELF.find(([k]) => sh[k]?.n) || SHELF[0])[0];
  const shelfBody = k => { const x = sh[k]; if (!x?.n) return '<p class="lc-empty">Nada en este estante todavía.</p>';
    return `<div class="lc-shg">${x.items.map(s => `<a href="/serie/${esc(s.slug)}">${card(s)}<span>${esc(s.title)}</span></a>`).join('')}</div>${x.n > 6 ? `<span class="lc-more">+${x.n - 6} más</span>` : ''}`; };
  const stars = n => '★'.repeat(n || 0) + '☆'.repeat(Math.max(0, 5 - (n || 0)));
  app.innerHTML = `<div class="lc" style="--ac:${esc(ac)}">
    <section class="lc-card">${bg}<div class="lc-sh"></div>${r.kanji ? `<span class="lc-kj" title="Sello de ${esc(r.username)}">${esc(r.kanji)}</span>` : ''}
      <div class="lc-in">
        <span class="lc-av">${r.avatar_url ? `<img src="${esc(r.avatar_url)}" alt="">` : esc((r.username || '?')[0].toUpperCase())}</span>
        <div class="lc-tx"><span class="k">CARNET DE LECTOR · 読者証 · DESDE ${new Date(r.since).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
          <h1>${esc(r.username)}</h1>${r.bio ? `<p>${esc(r.bio)}</p>` : ''}
          ${r.links?.length ? `<div class="lc-ln">${r.links.filter(l => ICON[l.k]).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener nofollow ugc">${svg(l.k)}${ICON[l.k][0]}</a>`).join('')}</div>` : ''}
        </div>
        ${seals.length ? `<div class="lc-se">${seals.map(([k, t]) => `<span title="${t}" aria-label="${t}">${k}</span>`).join('')}</div>` : ''}
      </div></section>
    ${favs.length ? `<section class="lc-sec"><h2>Favoritas</h2><div class="lc-fav">${favs.map(s => `<a href="/serie/${esc(s.slug)}">${card(s)}<span>${esc(s.title)}</span></a>`).join('')}</div></section>` : ''}
    ${r.shelves ? `<section class="lc-sec"><div class="lc-hd"><h2>Estanterías</h2><div class="lc-tabs" role="tablist">${SHELF.map(([k, l]) => `<button role="tab" data-sh="${k}" class="${k === firstShelf ? 'on' : ''}" aria-selected="${k === firstShelf}">${l} · ${sh[k]?.n || 0}</button>`).join('')}</div></div><div id="lc-shb">${shelfBody(firstShelf)}</div></section>` : ''}
    ${r.reviews?.length ? `<section class="lc-sec"><h2>Reseñas más votadas</h2><div class="lc-rv">${r.reviews.map(v => `<article>
        <a href="/serie/${esc(v.series.slug)}" aria-label="${esc(v.series.title)}">${card(v.series)}</a>
        <div><a class="t" href="/serie/${esc(v.series.slug)}">${esc(v.series.title)}</a><span style="color:var(--ac);letter-spacing:2px" aria-label="${v.stars} de 5">${stars(v.stars)}</span>
        ${v.title ? `<b>${esc(v.title)}</b>` : ''}<p class="${v.spoiler ? 'sp' : ''}" ${v.spoiler ? 'title="Contiene spoilers · toca para ver" tabindex="0"' : ''}>${esc(v.body)}${v.body?.length >= 400 ? '…' : ''}</p>
        <small>▲ ${v.votes} ${v.votes === 1 ? 'útil' : 'útiles'}</small></div></article>`).join('')}</div></section>` : ''}
    ${r.public_activity && r.stats ? `<section class="lc-sec"><h2>Estadísticas</h2>${statsHTML(r.stats)}</section>` : ''}
  </div>`;
  app.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { app.querySelectorAll('[data-sh]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); app.querySelector('#lc-shb').innerHTML = shelfBody(b.dataset.sh); });
  app.querySelectorAll('.lc-rv .sp').forEach(p => p.onclick = p.onkeydown = () => p.classList.remove('sp'));
}

export async function preferences(C){
  const { sb, app, esc, url, toast, getUser, uploadAvatar, reload } = C; css();
  const user = getUser(); if (!user) return C.go('/entrar');
  const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
  const TABS = [['perfil', 'Perfil público'], ['adulto', 'Contenido +18'], ['cuenta', 'Cuenta']];
  const tab = TABS.some(t => t[0] === new URLSearchParams(location.search).get('s')) ? new URLSearchParams(location.search).get('s') : 'perfil';
  app.innerHTML = '<p class="mono">Cargando preferencias…</p>';
  const { data: P, error } = await sb.from('profiles').select('username,avatar_url,bio,banner_url,seal_kanji,accent,links,favorites,profile_sections,public_activity,adult_ok').eq('id', user.id).single();
  if (error) { app.innerHTML = `<h1>Preferencias</h1><p class="mono">No se pudieron cargar: ${esc(error.message)}</p>`; return; }
  const shell = body => `<h1>Preferencias</h1><div class="pf"><nav class="pf-nav">${TABS.map(([k, l]) => `<a href="/preferencias${k === 'perfil' ? '' : '?s=' + k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav><div class="pf-body">${body}</div></div>`;
  const tg = (id, on, label) => `<button type="button" class="pf-tg" id="${id}" aria-pressed="${!!on}" aria-label="${esc(label)}"><i></i></button>`;
  const flip = b => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');

  if (tab === 'adulto') {
    app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Contenido +18</h2><p class="pf-note">Las obras marcadas +18 están ocultas en el inicio, el catálogo, la búsqueda y los perfiles hasta que lo actives.</p></div>
      <div class="pf-row" style="max-width:560px"><span style="flex:1">Tengo 18 años o más y quiero ver obras +18</span>${tg('ad', P.adult_ok, 'Mostrar obras +18')}</div>`);
    const b = app.querySelector('#ad'); b.onclick = async () => { const v = b.getAttribute('aria-pressed') !== 'true';
      if (v && !confirm('Confirma que tienes 18 años o más.')) return;
      const { error } = await sb.from('profiles').update({ adult_ok: v }).eq('id', user.id); if (error) return toast(error.message);
      flip(b); toast(v ? 'Obras +18 visibles' : 'Obras +18 ocultas'); };
    return;
  }
  if (tab === 'cuenta') {
    app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Cuenta</h2><p class="pf-note">Correo: <b>${esc(user.email)}</b></p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" id="pw">Cambiar contraseña</button><a class="btn ghost" href="/perfil">Mis estadísticas</a><a class="btn ghost" href="/lector/${encodeURIComponent(P.username)}">Ver mi perfil público</a></div>`);
    app.querySelector('#pw').onclick = async () => { const { error } = await sb.auth.resetPasswordForEmail(user.email, { redirectTo: location.origin + '/restablecer' }); toast(error ? error.message : 'Te enviamos un enlace a tu correo para cambiarla'); };
    return;
  }

  const D = { bio: P.bio || '', kanji: P.seal_kanji || '', accent: P.accent || '#f2c230', banner: P.banner_url, links: (P.links || []).map(l => ({ on: true, ...l })),
    sec: Object.fromEntries(SECS.map(([k, , d]) => [k, P.profile_sections?.[k] ?? d])), pub: !!P.public_activity, favs: [] };
  if (P.favorites?.length) { const { data } = await sb.from('series').select('id,title,slug,cover_path,cover_thumb_path,theme').in('id', P.favorites); D.favs = P.favorites.map(id => (data || []).find(s => s.id === id)).filter(Boolean); }
  let dirty = false; const mark = () => { dirty = true; const s = app.querySelector('#pf-st'); if (s) s.textContent = 'Cambios sin guardar'; };
  const favHTML = () => D.favs.map((s, i) => `<span><span class="lc-cv" style="--c:${esc(s.theme?.color || '#2a2519')};${s.cover_path ? `background-image:url('${esc(MED(s.cover_thumb_path || s.cover_path))}')` : ''}">${esc(s.title)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.title)}</span><button type="button" class="pf-x" data-rf="${i}" aria-label="Quitar ${esc(s.title)}">×</button></span>`).join('') || '<p class="pf-note">Aún no eliges favoritas.</p>';
  const linkRow = (l, i) => `<div class="pf-row ${l.on ? '' : 'off'}"><span class="ic">${svg(l.k, 18)}</span>
    <select data-lk="${i}" aria-label="Red">${GROUPS.map(([g, ks]) => `<optgroup label="${g}">${ks.map(k => `<option value="${k}" ${k === l.k ? 'selected' : ''}>${ICON[k][0]}</option>`).join('')}</optgroup>`).join('')}</select>
    <input data-lu="${i}" value="${esc(l.url || '')}" placeholder="${ICON[l.k][2]}" inputmode="url" aria-label="Enlace de ${ICON[l.k][0]}">
    <button type="button" class="pf-tg" data-lo="${i}" aria-pressed="${l.on}" aria-label="Mostrar en el perfil"><i></i></button>
    <button type="button" class="pf-x" data-lx="${i}" aria-label="Quitar enlace">×</button></div>`;
  const draw = () => {
    app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Perfil público</h2><p class="pf-note">Así te ven los demás en <a href="/lector/${encodeURIComponent(P.username)}">/lector/${esc(P.username)}</a>.</p></div>
      <div class="pf-grid">
        <div class="pf-f">Foto<span class="pf-up"><span class="lc-av" style="--ac:${esc(D.accent)};width:60px;height:60px;font-size:26px">${P.avatar_url ? `<img src="${esc(P.avatar_url)}" alt="">` : esc((P.username || '?')[0].toUpperCase())}</span><label class="btn ghost sm">Cambiar foto<input type="file" id="fav" accept="image/jpeg,image/png,image/webp"></label></span></div>
        <div class="pf-f">Portada del carnet<span class="pf-up"><span class="pf-ban" style="${D.banner ? `background-image:url('${esc(D.banner)}')` : ''}"></span><label class="btn ghost sm">${D.banner ? 'Cambiar' : 'Subir'}<input type="file" id="fban" accept="image/jpeg,image/png,image/webp"></label>${D.banner ? '<button type="button" class="btn ghost sm" id="noban">Quitar</button>' : ''}</span><small class="pf-note" style="font-size:12px">Sin portada se usa un collage de tus favoritas.</small></div>
        <label class="pf-f" style="grid-column:1/-1">Bio<textarea id="bio" rows="3" maxlength="280">${esc(D.bio)}</textarea></label>
        <label class="pf-f">Kanji del sello<input id="kj" class="pf-kj" maxlength="1" value="${esc(D.kanji)}" placeholder="月" aria-describedby="kjh"><small id="kjh" class="pf-note" style="font-size:12px">Un solo kanji. Déjalo vacío para no mostrar sello.</small></label>
        <div class="pf-f">Color de acento<div class="pf-sw">${SWATCH.map(c => `<button type="button" data-ac="${c}" class="${c === D.accent ? 'on' : ''}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
      </div>
      <div style="display:grid;gap:10px"><h3>Favoritas <small class="pf-note">(${D.favs.length}/5)</small></h3><div class="pf-favs">${favHTML()}</div>
        ${D.favs.length < 5 ? '<input class="pf-q" id="fq" placeholder="Busca una obra para añadirla…" autocomplete="off" style="max-width:420px"><div class="pf-res" id="fr"></div>' : ''}</div>
      <div style="display:grid;gap:10px"><h3>Enlaces</h3>${D.links.map(linkRow).join('')}
        ${D.links.length < 12 ? '<button type="button" class="btn ghost sm" id="addl" style="justify-self:start">+ Añadir enlace</button>' : ''}</div>
      <div style="display:grid;gap:10px"><h3>Secciones visibles</h3><div class="pf-sl">${SECS.map(([k, l]) => `<div><span>${l}</span>${tg('s-' + k, D.sec[k], l)}</div>`).join('')}<div><span>Estadísticas</span>${tg('s-pub', D.pub, 'Estadísticas')}</div></div></div>
      <div class="pf-save"><span class="mono" id="pf-st">${dirty ? 'Cambios sin guardar' : ''}</span><a class="btn ghost" href="/lector/${encodeURIComponent(P.username)}">Ver perfil</a><button class="btn" id="save">Guardar cambios</button></div>`);
    const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);
    $('#bio').oninput = e => { D.bio = e.target.value; mark(); };
    $('#kj').oninput = e => { D.kanji = e.target.value.trim(); mark(); };
    $$('[data-ac]').forEach(b => b.onclick = () => { D.accent = b.dataset.ac; mark(); draw(); });
    $$('[data-rf]').forEach(b => b.onclick = () => { D.favs.splice(+b.dataset.rf, 1); mark(); draw(); });
    $$('[data-lk]').forEach(s => s.onchange = () => { D.links[+s.dataset.lk].k = s.value; mark(); draw(); });
    $$('[data-lu]').forEach(i => i.oninput = () => { D.links[+i.dataset.lu].url = i.value.trim(); mark(); });
    $$('[data-lo]').forEach(b => b.onclick = () => { const l = D.links[+b.dataset.lo]; l.on = !l.on; mark(); draw(); });
    $$('[data-lx]').forEach(b => b.onclick = () => { D.links.splice(+b.dataset.lx, 1); mark(); draw(); });
    $('#addl')?.addEventListener('click', () => { const used = new Set(D.links.map(l => l.k)); D.links.push({ k: Object.keys(ICON).find(k => !used.has(k)) || 'web', url: '', on: true }); mark(); draw(); app.querySelector(`[data-lk="${D.links.length - 1}"]`)?.focus(); });
    SECS.forEach(([k]) => $('#s-' + k).onclick = e => { D.sec[k] = !D.sec[k]; flip(e.currentTarget); mark(); });
    $('#s-pub').onclick = e => { D.pub = !D.pub; flip(e.currentTarget); mark(); };
    let qt; $('#fq')?.addEventListener('input', e => { clearTimeout(qt); const q = e.target.value; qt = setTimeout(async () => {
      const box = $('#fr'); if (q.trim().length < 2) { box.innerHTML = ''; return; }
      const { data } = await sb.rpc('favorite_candidates', { p_q: q }); const have = new Set(D.favs.map(f => f.id));
      box.innerHTML = (data || []).filter(s => !have.has(s.id)).map(s => `<button type="button" data-af='${esc(JSON.stringify(s))}'><i style="--c:${esc(s.color)};${s.cover_path ? `background-image:url('${esc(MED(s.cover_path))}')` : ''}"></i>${esc(s.title)}</button>`).join('') || '<p class="pf-note">Sin resultados.</p>';
      box.querySelectorAll('[data-af]').forEach(b => b.onclick = () => { const s = JSON.parse(b.dataset.af); D.favs.push({ id: s.id, title: s.title, slug: s.slug, cover_thumb_path: s.cover_path, theme: { color: s.color } }); mark(); draw(); app.querySelector('#fq')?.focus(); });
    }, 250); });
    $('#fav').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { await uploadAvatar(f); P.avatar_url = C.getProfile()?.avatar_url || P.avatar_url; toast('Foto guardada'); draw(); } catch (er) { toast(er.message); } };
    $('#fban').onchange = async e => { const f = e.target.files[0]; if (!f) return;
      try { if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error('Usa una imagen JPG, PNG o WebP.'); if (f.size > 3 * 1024 * 1024) throw new Error('La portada pesa más de 3 MB.');
        const path = user.id + '/banner-' + Date.now() + '.' + f.type.split('/')[1];
        const { error } = await sb.storage.from('avatars').upload(path, f, { upsert: true, contentType: f.type, cacheControl: '31536000' }); if (error) throw error;
        D.banner = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl; mark(); draw(); } catch (er) { toast(er.message); } };
    $('#noban')?.addEventListener('click', () => { D.banner = null; mark(); draw(); });
    $('#save').onclick = async e => { const b = e.currentTarget;
      if (D.kanji && !KANJI.test(D.kanji)) return toast('El sello debe ser un solo kanji');
      const links = []; for (const l of D.links) { if (!l.url) continue; let u = l.url; if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, ''); u = u.replace(/^http:/i, 'https:');
        if (!/^https:\/\/[^\s<>"]{3,200}$/.test(u)) return toast(`Revisa el enlace de ${ICON[l.k][0]}`); links.push({ k: l.k, url: u, on: !!l.on }); }
      b.disabled = true; b.textContent = 'Guardando…';
      const { error } = await sb.from('profiles').update({ bio: D.bio.trim() || null, seal_kanji: D.kanji || null, accent: D.accent, banner_url: D.banner, links, favorites: D.favs.map(f => f.id), profile_sections: D.sec, public_activity: D.pub }).eq('id', user.id);
      b.disabled = false; b.textContent = 'Guardar cambios';
      if (error) return toast(/links/.test(error.message) ? 'Revisa los enlaces' : /seal_kanji/.test(error.message) ? 'El sello debe ser un solo kanji' : error.message);
      D.links = links; dirty = false; toast('Perfil guardado'); reload?.(); draw(); };
  };
  draw();
  const leave = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', leave);
  addEventListener('popstate', () => removeEventListener('beforeunload', leave), { once: true });
}

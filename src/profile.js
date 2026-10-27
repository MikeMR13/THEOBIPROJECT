import { readReaderPrefs, readPendingReaderPrefs, stageReaderPrefs, acknowledgeReaderPrefs, sameReaderAccount } from './reader-pref-cache.js?v=1';
import { readingPreviewDescription, privacyPreviewModel, notificationPreviewSummary } from './preferences-preview.js?v=1';
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
// Géneros editoriales: selección explícita del lector (máximo tres).
const GENRE_CATALOG = ["Fantasía","Romance","Misterio","Aventura","Ciencia ficción","Acción","Comedia","Drama","Isekai","Vida cotidiana","Terror","Histórico"];
const selectedGenres = value => Array.isArray(value) ? [...new Set(value.filter(g => typeof g === 'string' && GENRE_CATALOG.includes(g)))].slice(0, 3) : [];

const KANJI = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]$/;

// Apodos editoriales, no traducciones literales del kanji.
const SEAL_CATALOG = [["読","El Lector","Leer","Descubre universos enteros entre las páginas.","Lectura"],["書","El Escriba","Escribir","Encuentra poder en las palabras y las historias.","Lectura"],["本","El Bibliófilo","Libro","Siempre encuentra un hogar entre los libros.","Lectura"],["文","El Literato","Literatura","Aprecia la belleza de cada palabra.","Lectura"],["詩","El Poeta","Poesía","Descubre emociones donde otros solo ven palabras.","Lectura"],["語","El Narrador","Relato","Cada historia merece una voz.","Lectura"],["章","El Cronista","Capítulo","Atesora cada capítulo de sus aventuras.","Lectura"],["魔","El Mago","Magia","Encuentra lo extraordinario en cada historia.","Fantasía"],["夢","El Soñador","Sueño","Vive aventuras que solo la imaginación permite.","Fantasía"],["龍","El Dragón","Dragón","Su espíritu es tan indomable como una leyenda.","Fantasía"],["星","El Astral","Estrella","Encuentra su camino siguiendo las estrellas.","Fantasía"],["月","El Lunar","Luna","Prefiere las historias bajo la luz de la luna.","Fantasía"],["光","El Luminoso","Luz","Incluso en la oscuridad encuentra esperanza.","Fantasía"],["闇","El Nocturno","Oscuridad","Se aventura donde las historias se vuelven misteriosas.","Fantasía"],["炎","El Ígneo","Llama","Lee con una pasión que nunca se apaga.","Fantasía"],["氷","El Glacial","Hielo","Mantiene la calma aun frente a las mayores amenazas.","Fantasía"],["雷","El Relámpago","Trueno","Su entusiasmo aparece con la fuerza de una tormenta.","Fantasía"],["探","El Explorador","Buscar","Siempre está en busca de nuevos mundos.","Aventura"],["旅","El Viajero","Viaje","Recorre mil destinos a través de la lectura.","Aventura"],["武","El Guerrero","Artes marciales","No teme enfrentarse a grandes desafíos.","Aventura"],["守","El Guardián","Proteger","Atesora las historias que merecen conservarse.","Aventura"],["剣","El Espadachín","Espada","En cada aventura encuentra una batalla digna de contar.","Aventura"],["風","El Errante","Viento","Sigue el viento hacia historias desconocidas.","Aventura"],["海","El Navegante","Mar","Ningún horizonte es demasiado lejano.","Aventura"],["森","El Silvestre","Bosque","Encuentra maravillas en los rincones ocultos del mundo.","Aventura"],["知","El Sabio","Conocer","Cada lectura es una oportunidad para aprender.","Personalidad"],["心","El Sensible","Corazón","Vive cada historia con el corazón.","Personalidad"],["勇","El Valiente","Valentía","No teme comenzar una nueva aventura.","Personalidad"],["静","El Sereno","Calma","Encuentra paz en el silencio de las páginas.","Personalidad"],["絆","El Compañero","Vínculo","Cree en los lazos que unen a los personajes.","Personalidad"],["和","El Armonioso","Armonía","Busca equilibrio entre mundos y emociones.","Personalidad"],["影","La Sombra","Sombra","Observa los misterios desde las sombras.","Personalidad"]];
const SEAL_LOOKUP = new Map(SEAL_CATALOG.map(([kanji,name,meaning,description,category]) => [kanji,{name,meaning,description,category}]));
const sealMarkup = (kanji, esc) => {
  if (!kanji) return '';
  const seal = SEAL_LOOKUP.get(kanji);
  if (!seal) return `<span class="lc-kj" title="Sello personalizado" aria-label="Sello personalizado: ${esc(kanji)}">${esc(kanji)}</span>`;
  return `<div class="lc-seal-pop"><details><summary class="lc-kj" aria-label="${esc(seal.name)}. Ver descripción del sello">${esc(kanji)}</summary><div class="lc-seal-info"><strong>${esc(seal.name)}</strong><span>${esc(seal.description)}</span><small>Kanji: ${esc(seal.meaning)}</small></div></details><span class="lc-seal-name">${esc(seal.name)}</span></div>`;
};

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
.lc-tabs button{border:0;cursor:pointer;padding:10px 14px;font:600 13px 'IBM Plex Sans',sans-serif;background:transparent;color:var(--paper);min-height:44px}
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
.pf-nav{flex:0 0 238px;max-width:238px;border-right:1px solid var(--line);padding:14px 0;display:grid;align-content:start;gap:12px}
.pf-nav-group{display:grid;align-content:start}
.pf-nav-title{font:700 10px 'IBM Plex Mono',monospace;color:var(--mute);letter-spacing:.11em;text-transform:uppercase;margin:12px 18px 6px}
.pf-nav a{display:flex;align-items:center;min-height:44px;padding:8px 16px;text-decoration:none;font-size:14px;font-weight:600;color:var(--mute);border-left:3px solid transparent;box-sizing:border-box}
.pf-nav a:hover{color:var(--paper);background:#1b1913}
.pf-nav a.on,.pf-nav a[aria-current="page"]{color:var(--paper);background:#242017;border-left-color:var(--gold)}
.pf-mobile-nav{display:none}
.pf :is(a,button,input,select,textarea):focus-visible{outline:3px solid var(--gold);outline-offset:3px}
.pf :is(button,input,select,textarea):disabled{cursor:not-allowed}
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
.pf-sw button{width:44px;height:44px;border:0;background:transparent;display:grid;place-items:center;cursor:pointer;position:relative;border-radius:50%}
.pf-sw button::before{content:"";width:30px;height:30px;border:2px solid rgba(255,255,255,.22);border-radius:50%;background:var(--swatch);box-sizing:border-box}
.pf-sw button.on::before,.pf-sw button[aria-pressed="true"]::before{box-shadow:0 0 0 2px #0d0c0a,0 0 0 4px var(--paper)}
.pf-up{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pf-up label{flex:none;white-space:nowrap;cursor:pointer}
.pf-up input[type="file"]{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip-path:inset(50%)} 
.pf-up label:focus-within{outline:3px solid var(--gold);outline-offset:3px}
.pf-ban{width:160px;height:60px;background:#1c1a14 center/cover;border:1px solid var(--line)}
.pf-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 12px;border:1px solid #2c281e;background:#0d0c0a}
.pf-row input{flex:1 1 180px;min-width:0;font:13px 'IBM Plex Mono',monospace}
.pf-row select{flex:0 0 150px}
.pf-row .ic{display:grid;place-items:center;width:20px;flex:none}
.pf-row.off{opacity:.55}
.pf-x{background:none;border:0;color:var(--mute);cursor:pointer;font-size:20px;min-width:44px;min-height:44px}
.pf-x:hover{color:#f59e7a}
.pf-tg{flex:none;width:48px;height:44px;border:0;background:transparent;padding:0;cursor:pointer;position:relative;display:flex;align-items:center}
.pf-tg::before{content:"";position:absolute;left:2px;top:9px;width:44px;height:26px;box-sizing:border-box;border-radius:999px;border:1px solid #70634b;background:#2c281e}
.pf-tg[aria-pressed="true"]::before{background:var(--gold);border-color:var(--gold)}
.pf-tg i{position:relative;z-index:1;width:20px;height:20px;margin-left:5px;border-radius:50%;background:var(--paper);transition:transform .15s ease}
.pf-tg[aria-pressed="true"] i{transform:translateX(18px)}
@media(prefers-reduced-motion:reduce){.pf-tg i{transition:none}}
.pf-sl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}
.pf-sl>div{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border:1px solid #2c281e;background:#0d0c0a}
.pf-favs{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
.pf-fav{width:148px;max-width:100%;min-width:0;display:grid;grid-template-rows:auto minmax(2.8em,auto) auto;gap:8px}
.pf-fav-cover{display:grid;width:100%;box-sizing:border-box;overflow:hidden;overflow-wrap:anywhere}
.pf-fav-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;line-height:1.4;font-size:13px;font-weight:600;min-height:2.8em}
.pf-fav-remove{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;padding:8px 10px;background:#1c1a14;border:1px solid var(--line);color:var(--paper);font:600 13px 'IBM Plex Sans',sans-serif;cursor:pointer}
.pf-fav-remove:hover{border-color:#f59e7a;color:#f59e7a}
.pf-fav-remove:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
@media(max-width:480px){.pf-favs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.pf-fav{width:auto}}
.pf-res{display:grid;gap:4px;max-width:420px}
.pf-res button{display:flex;gap:10px;align-items:center;text-align:left;background:#0d0c0a;border:1px solid var(--line);color:var(--paper);padding:6px 10px;cursor:pointer;min-height:44px;font:14px 'IBM Plex Sans',sans-serif}
.pf-res button:hover{border-color:var(--gold)}
.pf-res i{width:28px;height:38px;flex:none;background:var(--c) center/cover}
.pf-save{position:sticky;bottom:0;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:flex-end;padding:14px 0 0;border-top:1px solid var(--line);background:#14120e}
.pf-save .mono{margin-right:auto}
@media(max-width:760px){
.pf{display:block}
.pf-nav{display:none}
.pf-mobile-nav{display:grid;gap:7px;padding:16px;border-bottom:1px solid var(--line);background:#1b1812}
.pf-mobile-nav label{font:700 11px 'IBM Plex Mono',monospace;letter-spacing:.11em;text-transform:uppercase;color:var(--paper)}
.pf-mobile-nav select{width:100%;min-height:48px;box-sizing:border-box;border:1px solid #766543;background:#0d0c0a;color:var(--paper);padding:9px 12px;font:600 15px 'IBM Plex Sans',sans-serif}
.pf-body{padding:18px;min-width:0}
.pf-save{padding-bottom:max(12px,env(safe-area-inset-bottom))}
}
@media(max-width:390px){.pf-body{padding:14px}.pf-row{gap:8px}.pf-sl{grid-template-columns:minmax(0,1fr)}}


/* Editor del carnet: vista previa local y adaptable, sin guardado implícito. */
.pf-editor-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,340px);gap:clamp(18px,2.5vw,32px);align-items:start;min-width:0}
.pf-editor-fields{display:grid;gap:28px;min-width:0}
.pf-editor-preview{position:sticky;top:84px;display:grid;gap:10px;min-width:0}
.pf-editor-preview-head{display:grid;gap:6px}
.pf-editor-preview-head h3{font:800 20px 'Shippori Mincho B1',serif;margin:0}
.pf-live-card{min-width:0}
.pf-live-card .lc{gap:16px}
.pf-live-card .lc-card{min-height:290px}
.pf-live-card .lc-in{padding:18px;gap:12px;align-items:start}
.pf-live-card .lc-av{width:68px;height:68px;font-size:28px}
.pf-live-card .lc-tx{flex:1 1 100%;gap:7px}
.pf-live-card .lc-tx h1{font-size:clamp(22px,2vw,30px);line-height:1.15}
.pf-live-card .lc-tx .k{font-size:9px}
.pf-live-card .lc-tx p{font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.pf-live-card .lc-kj{top:12px;right:12px;width:40px;height:40px;font-size:22px}
.pf-live-card .lc-ln{gap:6px}
.pf-live-link{display:inline-flex;gap:5px;align-items:center;max-width:100%;border:1px solid #5a503b;border-radius:999px;background:rgba(13,12,10,.7);color:var(--paper);padding:5px 8px;font:11px 'IBM Plex Mono',monospace}
.pf-live-link svg{flex:none}
.pf-live-placeholder{color:#b7ad98!important;font-style:italic}
.pf-live-fav-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.pf-live-fav-list .lc-cv{padding:0;min-width:0;box-shadow:none}
.pf-live-fav-list .lc-cv:not([style*="url"]){font-size:9px;padding:4px;overflow:hidden;overflow-wrap:anywhere}
.pf-live-card .lc-sec{gap:8px}
.pf-live-card .lc-sec h2{font:700 15px 'Shippori Mincho B1',serif}
.pf-editor-preview-note{font-size:12px}
@media(max-width:1180px){.pf-editor-layout{grid-template-columns:minmax(0,1fr)}.pf-editor-preview{position:static;max-width:470px}}
@media(max-width:760px){.pf-editor-preview{max-width:none}.pf-live-card .lc-card{min-height:270px}.pf-live-fav-list{gap:8px}}


/* Sellos temáticos y apodos seleccionables */
.lc-seal-pop{position:absolute;top:18px;right:18px;z-index:3;display:grid;justify-items:end;gap:6px}
.lc-seal-pop .lc-kj{position:static;cursor:pointer;list-style:none;user-select:none}
.lc-seal-pop details{display:grid;justify-items:end}
.lc-seal-pop summary::-webkit-details-marker{display:none}
.lc-seal-pop summary::marker{content:''}
.lc-seal-pop .lc-kj:focus-visible{outline:3px solid var(--gold);outline-offset:3px}
.lc-seal-name{padding:4px 8px;background:rgba(13,12,10,.8);color:var(--paper);font:600 11px 'IBM Plex Sans',sans-serif;text-align:right}
.lc-seal-info{position:absolute;top:59px;right:0;width:min(230px,calc(100vw - 64px));box-sizing:border-box;background:#17130e;border:1px solid #866946;box-shadow:0 8px 32px rgba(0,0,0,.65);padding:12px;display:grid;gap:7px;color:var(--paper);font:13px/1.45 'IBM Plex Sans',sans-serif;text-align:left}
.lc-seal-pop details:not([open]) .lc-seal-info{display:none}
.lc-seal-info strong{font:800 17px 'Shippori Mincho B1',serif}
.lc-seal-info small{color:var(--mute)}
.pf-live-card .lc-seal-pop{top:12px;right:12px}
.pf-seal-panel{display:grid;gap:12px;min-width:0;grid-column:1/-1}
.pf-seal-controls{display:flex;gap:10px;flex-wrap:wrap}
.pf-seal-controls input,.pf-seal-controls select{background:#0d0c0a;border:1px solid var(--line);color:var(--paper);font:14px 'IBM Plex Sans',sans-serif;min-height:44px;padding:9px 10px;min-width:0}
.pf-seal-controls input{flex:1 1 190px}
.pf-seal-controls select{flex:1 1 145px}
.pf-seal-catalog{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,130px),1fr));gap:9px;max-height:380px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:2px}
.pf-seal-choice{min-width:0;min-height:94px;cursor:pointer;border:1px solid #544731;background:#1b1812;color:var(--paper);padding:9px 7px;display:grid;justify-items:center;align-content:center;gap:5px;text-align:center}
.pf-seal-choice:hover{border-color:var(--gold)}
.pf-seal-choice[aria-pressed="true"]{border:2px solid var(--gold);background:#272115}
.pf-seal-choice .kanji{font:800 29px 'Shippori Mincho B1',serif;color:#e2604b}
.pf-seal-choice .name{font:700 12px 'IBM Plex Sans',sans-serif;overflow-wrap:anywhere}
.pf-seal-choice .meaning{font:11px 'IBM Plex Sans',sans-serif;color:var(--mute)}
.pf-seal-selected{border-left:3px solid var(--gold);background:#221e16;padding:11px 13px;display:grid;gap:5px;font-size:13px;line-height:1.5}
.pf-seal-selected strong{font:800 16px 'Shippori Mincho B1',serif}
.pf-seal-selected small{color:var(--mute)}
.pf-seal-actions{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.pf-seal-actions button{min-height:44px}
.pf-seal-custom{display:grid;gap:8px;align-items:start;justify-items:start;padding:12px;border:1px solid var(--line);background:#1b1812}
.pf-seal-custom[hidden]{display:none}
.pf-seal-custom label{display:grid;gap:6px}
@media(max-width:640px){.lc-seal-pop{right:12px;top:12px}.pf-seal-catalog{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* Carnet público: portada sin texto superpuesto, sello integrado y ritmo editorial. */
.lc-public{gap:clamp(24px,3.5vw,40px);min-width:0}
.lc-public-card{display:grid;grid-template-rows:auto auto;min-height:0;align-items:stretch;overflow:visible;background:#16130f}
.lc-public-card .lc-cover-stage{height:clamp(172px,22vw,280px);position:relative;overflow:hidden;background:#0d0c0a}
.lc-public-card .lc-cover-stage .lc-bg{opacity:.82}
/* La portada subida ocupa todo el ancho como una sola imagen, sin capas de relleno. */
.lc-public-card .lc-cover-stage.is-user-banner .lc-bg{background-size:cover;background-position:center center;background-repeat:no-repeat;background-color:transparent;opacity:1}
.lc-public-card .lc-cover-stage.is-user-banner .lc-sh{display:none}
.lc-public-card .lc-cover-stage .lc-sh{background:linear-gradient(180deg,transparent 65%,rgba(13,12,10,.28) 100%)}
.lc-public-card .lc-in{display:flex;align-items:flex-start;flex-wrap:wrap;gap:16px 22px;background:#16130f;padding:0 clamp(16px,3vw,30px) clamp(20px,3vw,30px)}
.lc-public-card .lc-av{position:relative;z-index:2;width:96px;height:96px;font-size:38px;margin-top:-40px;box-shadow:0 5px 16px rgba(0,0,0,.4);background:#211c13}
.lc-public-card .lc-tx{padding-top:17px;flex:1 1 230px;gap:10px}
.lc-public-card .lc-tx h1{font-size:clamp(26px,3.3vw,44px);line-height:1.12}
.lc-public-card .lc-name-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;min-width:0}
.lc-public-card .lc-name-row h1{min-width:0;max-width:100%;flex:0 1 auto}
.lc-public-card .lc-name-row .lc-seal-pop{flex:none;max-width:100%}
.lc-public-card .lc-tx p{font-size:15px;max-width:70ch}
.lc-public-card .lc-seal-pop{position:relative;top:auto;right:auto;display:inline-flex;align-items:center;justify-items:start;justify-content:flex-start;gap:10px;width:fit-content;max-width:100%;z-index:5}
.lc-public-card .lc-seal-pop details{display:block;flex:none}
.lc-public-card .lc-seal-pop .lc-kj{width:44px;height:44px;font-size:24px}
.lc-public-card .lc-seal-name{font:700 14px 'IBM Plex Sans',sans-serif;color:var(--paper);background:transparent;padding:0;text-align:left}
.lc-public-card .lc-seal-pop .lc-seal-info{top:calc(100% + 8px);right:auto;left:0}
.lc-public-card .lc-tx>.lc-kj{position:static;width:44px;height:44px;font-size:24px}
.lc-public-card .lc-se{align-self:center}
.lc-public .lc-fav{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,184px));gap:20px;justify-content:center;max-width:1120px;width:100%;margin-inline:auto}
.lc-public .lc-fav a{min-width:0;align-content:start;gap:9px}
.lc-public .lc-fav .lc-cv{width:100%;box-sizing:border-box;overflow:hidden;overflow-wrap:anywhere;box-shadow:0 10px 24px rgba(0,0,0,.3)}
.lc-public .lc-fav .lc-fav-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;line-height:1.45;min-height:2.9em;font-size:13px}
.lc-public .lc-stats .st-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,174px),1fr));gap:14px}
.lc-public .lc-stats .st-k{min-width:0;display:flex;flex-direction:column;gap:10px;background:#1a1712;border:1px solid #524632;border-top:2px solid var(--ac);padding:18px 16px;align-items:flex-start}
.lc-public .lc-stats .st-k b{display:block;font:800 clamp(26px,2.8vw,38px)/1 'Shippori Mincho B1',serif;color:var(--ac);font-variant-numeric:tabular-nums}
.lc-public .lc-stats .st-k span{display:block;color:var(--paper);font:600 13px/1.5 'IBM Plex Sans',sans-serif;overflow-wrap:anywhere;text-transform:none}
.pf-live-card .lc-public-card{min-height:0}
.pf-live-card .lc-public-card .lc-cover-stage{height:124px}
.pf-live-card .lc-public-card .lc-in{padding:0 14px 18px;gap:8px 12px}
.pf-live-card .lc-public-card .lc-av{width:60px;height:60px;font-size:26px;margin-top:-25px}
.pf-live-card .lc-public-card .lc-tx{padding-top:7px}
.pf-live-card .lc-public-card .lc-tx h1{font-size:clamp(21px,2vw,27px)}
.pf-live-card .lc-public-card .lc-seal-name{font-size:12px}
@media(max-width:760px){
 .lc-public-card .lc-cover-stage{height:clamp(160px,32vw,228px)}
 .lc-public-card .lc-in{gap:10px 16px}
 .lc-public-card .lc-tx{padding-top:10px}
 .lc-public .lc-stats .st-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
}
@media(max-width:480px){
 .lc-public-card .lc-av{width:76px;height:76px;margin-top:-30px;font-size:30px}
 .lc-public-card .lc-tx{flex-basis:100%;padding-top:0}
 .lc-public-card .lc-tx h1{font-size:clamp(25px,7.5vw,34px)}
 .lc-public-card .lc-in{padding:0 16px 20px}
 .lc-public .lc-fav{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
 .lc-public .lc-stats .st-k{padding:14px 12px}
 .lc-public .lc-stats .st-k b{font-size:28px}
 .pf-live-card .lc-public-card .lc-av{width:60px;height:60px}
 .pf-live-card .lc-public-card .lc-in{padding:0 14px 18px}
}

/* Fase 2 — identidad literaria, estanterías visibles y reseñas. */
.lc-public .lc-about{border:1px solid #544733;border-left:3px solid var(--ac);background:#1a1712;padding:clamp(18px,2.6vw,26px);gap:13px}
.lc-public .lc-about-heading{display:flex;gap:11px;align-items:center}
.lc-public .lc-about-mark{font:800 27px 'Shippori Mincho B1',serif;color:var(--ac)}
.lc-public .lc-about p{margin:0;max-width:75ch;font:15px/1.8 Literata,serif;color:#e9dfcf;white-space:pre-line;overflow-wrap:anywhere}
.lc-public .lc-about .lc-empty{font:13px/1.7 'IBM Plex Sans',sans-serif;color:var(--mute)}
.lc-public .lc-about .lc-empty a{color:var(--ac)}
.lc-public .lc-reading-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.lc-public .lc-reading-count{font:11px 'IBM Plex Mono',monospace;color:var(--mute)}
.lc-public .lc-reading-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}
.lc-public .lc-reading-item{display:grid;grid-template-columns:90px minmax(0,1fr);gap:14px;align-items:start;min-width:0;border:1px solid #544733;background:#1b1813;padding:13px}
.lc-public .lc-reading-cover{display:block;min-width:0;align-self:start}
.lc-public .lc-reading-cover .lc-cv{width:100%;padding:6px;box-sizing:border-box;overflow-wrap:anywhere;font-size:11px}
.lc-public .lc-reading-copy{display:grid;align-content:start;gap:11px;min-width:0}
.lc-public .lc-reading-copy a{font:700 14px/1.5 'IBM Plex Sans',sans-serif;color:var(--paper);text-decoration:none;overflow-wrap:anywhere}
.lc-public .lc-reading-copy a:hover{color:var(--ac)}
.lc-public .lc-reading-state{display:inline-flex;align-items:center;width:fit-content;border:1px solid #70603b;background:#272114;color:var(--ac);font:600 11px 'IBM Plex Sans',sans-serif;padding:5px 10px}
.lc-public .lc-shelf-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.lc-public .lc-shelf-tile{border:1px solid #50442f;border-top:2px solid var(--ac);background:#1b1812;padding:15px;display:grid;align-content:start;gap:9px;min-width:0}
.lc-public .lc-shelf-tile b{font:800 clamp(24px,3vw,36px)/1 'Shippori Mincho B1',serif;color:var(--ac);font-variant-numeric:tabular-nums}
.lc-public .lc-shelf-tile span{color:var(--paper);font:600 13px/1.4 'IBM Plex Sans',sans-serif}
.lc-public .lc-shelf-nav{display:grid;gap:13px}
.lc-public .lc-shelf-nav .lc-tabs{width:fit-content;max-width:100%}
.lc-public .lc-rv{grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.lc-public .lc-rv article{grid-template-columns:78px minmax(0,1fr);gap:14px;border:1px solid #554733;background:#1b1812;padding:16px;min-width:0}
.lc-public .lc-rv .lc-review-cover{min-width:0}
.lc-public .lc-rv .lc-review-cover .lc-cv{box-sizing:border-box;min-width:0;width:100%;padding:5px;font-size:9px;overflow-wrap:anywhere}
.lc-public .lc-rv .lc-review-main{display:grid;align-content:start;gap:9px;min-width:0}
.lc-public .lc-rv .lc-review-main .t{font:700 15px/1.4 'IBM Plex Sans',sans-serif;overflow-wrap:anywhere}
.lc-public .lc-rv .lc-review-rating{color:var(--ac);letter-spacing:.08em;font-size:16px}
.lc-public .lc-rv .lc-review-meta{color:var(--mute)}
.lc-public .lc-rv .lc-review-spoiler{border:1px solid #7d6040;padding:10px 12px;background:#282015}
.lc-public .lc-rv .lc-review-spoiler summary{cursor:pointer;font:600 13px 'IBM Plex Sans',sans-serif;color:var(--ac);min-height:28px}
.lc-public .lc-rv .lc-review-spoiler p{margin-top:9px}
.pf-live-card .lc-about{padding:12px;gap:8px}
.pf-live-card .lc-about h2{font-size:15px}
.pf-live-card .lc-about p{font-size:12px;line-height:1.65}
@media(max-width:760px){.lc-public .lc-shelf-summary{gap:9px}.lc-public .lc-shelf-tile{padding:12px 10px}.lc-public .lc-reading-grid{grid-template-columns:1fr}}
@media(max-width:480px){.lc-public .lc-reading-item{grid-template-columns:76px minmax(0,1fr);gap:11px;padding:11px}.lc-public .lc-shelf-summary{gap:7px}.lc-public .lc-shelf-tile{padding:10px 8px;gap:6px}.lc-public .lc-shelf-tile b{font-size:25px}.lc-public .lc-shelf-tile span{font-size:11px;overflow-wrap:anywhere}.lc-public .lc-rv article{grid-template-columns:65px minmax(0,1fr);padding:12px;gap:12px}}

/* Fase 3: gustos elegidos, compartir carnet y significado de sellos. */
.lc-public .lc-share-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:4px}
.lc-public .lc-share-btn{min-height:44px;padding:9px 16px;border:1px solid #79633e;background:#241e14;color:var(--paper);font:600 13px 'IBM Plex Sans',sans-serif;cursor:pointer}
.lc-public .lc-share-btn:hover{border-color:var(--ac);color:var(--ac)}
.lc-public .lc-share-btn:focus-visible{outline:3px solid var(--ac);outline-offset:2px}
.lc-public .lc-share-status{color:var(--ac);font:12px 'IBM Plex Sans',sans-serif}
.lc-public .lc-genres{display:grid;gap:13px}
.lc-public .lc-genre-chips{display:flex;flex-wrap:wrap;gap:9px}
.lc-public .lc-genre-chip{display:inline-flex;align-items:center;min-height:36px;padding:8px 13px;border:1px solid #7b633d;background:#211c14;color:var(--paper);font:600 13px 'IBM Plex Sans',sans-serif;max-width:100%;overflow-wrap:anywhere}
/* Estadísticas del carnet: no depender de los estilos de Mi biblioteca.
   Antes .st-gen solo existía en LB_CSS y se perdía al entrar directamente a /perfil. */
.lc-public .lc-stats .st-gen{display:grid;gap:9px;max-width:720px;margin-top:12px}
.lc-public .lc-stats .st-gen-row{display:grid;grid-template-columns:minmax(105px,160px) minmax(0,1fr) 40px;align-items:center;gap:12px;min-width:0;box-sizing:border-box;padding:11px 13px;background:#181510;border:1px solid #453826;border-radius:5px}
.lc-public .lc-stats .st-gen-name{min-width:0;color:var(--paper);font:600 14px/1.4 'IBM Plex Sans',sans-serif;overflow-wrap:anywhere}
.lc-public .lc-stats .st-gen-track{display:block;min-width:0;height:9px;overflow:hidden;border-radius:8px;background:#372c1c}
.lc-public .lc-stats .st-gen-track i{display:block;height:100%;max-width:100%;border-radius:8px;background:var(--ac);min-width:0;box-shadow:0 0 7px rgba(242,194,48,.15)}
.lc-public .lc-stats .st-gen-count{text-align:right;color:var(--ac);font:700 14px/1 'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}
.lc-public .lc-stats .st-gen-help{margin:0 0 12px;max-width:66ch;font:12px/1.55 'IBM Plex Sans',sans-serif;color:#c4b8a3}
@media(max-width:480px){.lc-public .lc-badges-grid{grid-template-columns:minmax(0,1fr)}.lc-public .lc-stats .st-gen-row{grid-template-columns:minmax(84px,118px) minmax(0,1fr) 30px;gap:8px;padding:9px 10px}.lc-public .lc-stats .st-gen-name{font-size:12px}}
.lc-public .lc-badges-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),400px));gap:12px;justify-content:start}
.lc-public .lc-badge-card{display:flex;align-items:flex-start;gap:12px;min-width:0;border:1px solid #51432c;background:#1b1812;padding:16px;border-left:3px solid var(--ac)}
.lc-public .lc-badge-glyph{flex:none;display:grid;place-items:center;width:54px;height:54px;background:#110f0b;border:2px solid #b74f38;color:#e67a60;font:800 26px 'Shippori Mincho B1',serif}
.lc-public .lc-badge-card .lc-badge-glyph.is-earned{border-color:var(--ac);color:var(--ac)}
.lc-public .lc-badge-info{display:grid;gap:6px;min-width:0}
.lc-public .lc-badge-info strong{font:800 16px 'Shippori Mincho B1',serif}
.lc-public .lc-badge-info p{font:13px/1.55 'IBM Plex Sans',sans-serif;color:#c8bda7;margin:0;overflow-wrap:anywhere}
.lc-public .lc-badge-info small{font:11px 'IBM Plex Mono',monospace;color:var(--mute)}
.pf-genre-picker{display:grid;gap:11px;min-width:0;grid-column:1/-1}
.pf-genre-options{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,130px),1fr));gap:8px}
.pf-genre-option{min-height:44px;min-width:0;padding:8px 10px;border:1px solid #5a4c32;background:#1b1812;color:var(--paper);font:600 12px 'IBM Plex Sans',sans-serif;cursor:pointer;overflow-wrap:anywhere}
.pf-genre-option[aria-pressed="true"]{border:2px solid var(--gold);background:#322719;color:var(--gold)}
.pf-genre-option:hover{border-color:var(--gold)}
.pf-genre-option:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.pf-genre-count{font:12px 'IBM Plex Mono',monospace;color:var(--mute)}
.pf-live-card .lc-badges-grid{grid-template-columns:1fr}
.pf-live-card .lc-badge-card{padding:10px;gap:10px}
.pf-live-card .lc-badge-glyph{width:40px;height:40px;font-size:19px}
.pf-live-card .lc-genre-chip{font-size:11px;min-height:32px;padding:6px 9px}
@media(max-width:480px){.pf-genre-options{grid-template-columns:repeat(2,minmax(0,1fr))}.lc-public .lc-badge-card{padding:13px}}

.pf-preview{border:1px solid #6b5a39;background:#1c1913;padding:14px;display:grid;gap:12px;min-width:0}
.pf-preview h3{margin:0;font-size:16px}
.pf-preview-guide{display:grid;gap:8px;font:13px/1.5 'IBM Plex Sans',sans-serif;color:#e3dccb}
.pf-preview-guide p{margin:0}
.pf-preview-note{color:var(--mute);font:12px/1.5 'IBM Plex Sans',sans-serif;margin:0}
.pf-preview-list{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:0}
.pf-preview-list li{border:1px solid #61563f;background:#282319;padding:5px 9px;font:600 12px 'IBM Plex Sans',sans-serif}
.pf-preview-list li.off{color:var(--mute);border-color:#3d3529;background:#17140f}
.pf-preview-audience{display:flex;gap:8px;flex-wrap:wrap}
.pf-preview-audience button{min-height:44px;border:1px solid #6b5a39;background:#100f0c;color:var(--paper);padding:8px 12px;cursor:pointer;font:600 13px 'IBM Plex Sans',sans-serif}
.pf-preview-audience button[aria-pressed="true"]{background:var(--gold);color:#0d0c0a;border-color:var(--gold)}
.pf-preview-sample{min-width:0;border:1px solid #514735;background:#14120e;padding:14px;display:grid;gap:10px}
.pf-preview-sample p{margin:0}
.pf-preview-sample strong{overflow-wrap:anywhere}
.pf-mail-pause{border-left:3px solid var(--gold);padding:10px 12px;background:#201b12;font:13px/1.5 'IBM Plex Sans',sans-serif}
.pf-mail-off{opacity:.65}
.pf .pf-tg:disabled{opacity:.6;cursor:not-allowed}
@media(max-width:760px){.pf-reading-preview{position:static!important;max-width:none!important}.pf-preview{padding:12px}}
`;
const css = () => { if (document.getElementById('lc-css')) return; const s = document.createElement('style'); s.id = 'lc-css'; s.textContent = CSS; document.head.appendChild(s); };

export async function publicProfile(C, name, opt = {}){
  const { sb, app, esc, url, statsHTML } = C; css();
  const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
  const cov = s => MED(s.cover_thumb_path || s.cover_path);
  app.innerHTML = '<p class="mono">Cargando perfil…</p>';
  const [{ data: r }, own] = await Promise.all([sb.rpc('reader_public', { p_username: name }), opt.owner ? sb.rpc('reader_stats') : { data: null }]);
  if (!r && !opt.alias) { const { data: nn } = await sb.rpc('username_resolve', { p_name: name }); if (nn) { history.replaceState({}, '', '/lector/' + encodeURIComponent(nn)); return publicProfile(C, nn, { ...opt, alias: true }); } }
  if (!r) { app.innerHTML = '<h1>Lector no encontrado</h1><p><a href="/">Volver al inicio</a></p>'; return; }
  if (r.private) { app.innerHTML = `<div class="lc" style="--ac:#5a503b"><section style="border:1px solid var(--line);background:#14120e;padding:40px 22px;display:grid;justify-items:center;gap:12px;text-align:center;max-width:520px;margin:20px auto">
      <span class="lc-av" style="width:96px;height:96px;font-size:40px;color:var(--mute)">${r.avatar_url ? `<img src="${esc(r.avatar_url)}" alt="">` : esc((r.username || '?')[0].toUpperCase())}</span>
      <h1 style="margin:0;font:800 30px 'Shippori Mincho B1',serif">${esc(r.username)}</h1>
      <p style="margin:0;color:var(--mute)">${r.private === 'auth' ? 'Inicia sesión para ver el carnet de este lector.' : 'Este lector mantiene su perfil privado.'}</p>
      ${r.private === 'auth' ? '<a class="btn" href="/entrar">Entrar</a>' : ''}</section></div>`; return; }
  const ac = r.accent || '#f2c230', favs = r.favorites || [], se = r.seals;
  const PPAT = r.username ? await sb.rpc('platform_patron', { p_username: r.username }).then(x => !!x.data, () => false) : false;
  const seals = se ? [se.donor && ['援', 'Apoya a los traductores en Patreon'], PPAT && ['惠', 'Apoya a la plataforma en Patreon'],
    se.chapters >= 1000 ? ['千', 'Más de 1000 capítulos leídos'] : se.chapters >= 100 ? ['百', 'Más de 100 capítulos leídos'] : se.chapters >= 10 ? ['十', 'Más de 10 capítulos leídos'] : null,
    se.reviews >= 3 && ['評', 'Ha escrito 3 reseñas o más']].filter(Boolean) : [];
  const bg = r.banner_url ? `<div class="lc-bg" style="background-image:url('${esc(r.banner_url)}')"></div>`
    : favs.length ? `<div class="lc-bg" style="--n:${favs.length}">${favs.map(f => `<span style="background-color:${esc(f.color)};${f.cover_path ? `background-image:url('${esc(cov(f))}')` : ''}"></span>`).join('')}</div>`
    : '<div class="lc-bg" style="opacity:.35"></div>';
  const card = s => `<span class="lc-cv" style="--c:${esc(s.color || '#2a2519')};${s.cover_path ? `background-image:url('${esc(cov(s))}')` : ''}">${esc(s.title)}</span>`;
  const SHV = SHELF.filter(([k]) => !(k === 'reading' && r.hide_reading)), sh = r.shelves || {}, firstShelf = (SHV.find(([k]) => sh[k]?.n) || SHV[0])[0];
  const shelfBody = k => { const x = sh[k]; if (!x?.n) return '<p class="lc-empty">Nada en este estante todavía.</p>';
    return `<div class="lc-shg">${x.items.map(s => `<a href="/serie/${esc(s.slug)}">${card(s)}<span>${esc(s.title)}</span></a>`).join('')}</div>${x.n > 6 ? `<span class="lc-more">+${x.n - 6} más</span>` : ''}`; };
  // Solo datos visibles proporcionados por reader_public. No consultar estanterías privadas.
  const readingItems = !r.hide_reading && Array.isArray(sh.reading?.items) ? sh.reading.items.slice(0, 3) : [];
  const about = r.bio ? `<section class="lc-sec lc-about" aria-labelledby="lc-about-heading"><div class="lc-about-heading"><span class="lc-about-mark" aria-hidden="true">文</span><h2 id="lc-about-heading">Sobre mí</h2></div><p>${esc(r.bio)}</p></section>`
    : opt.owner ? '<section class="lc-sec lc-about" aria-labelledby="lc-about-heading"><h2 id="lc-about-heading">Sobre mí</h2><p class="lc-empty">Presenta tus gustos y lecturas. <a href="/preferencias">Añade una biografía en Preferencias</a>.</p></section>' : '';
  const readingSection = readingItems.length ? `<section class="lc-sec lc-reading" aria-labelledby="lc-reading-heading"><div class="lc-reading-head"><h2 id="lc-reading-heading">Leyendo actualmente</h2><span class="lc-reading-count">Hasta tres lecturas destacadas</span></div>
    <div class="lc-reading-grid">${readingItems.map(s => `<article class="lc-reading-item"><a class="lc-reading-cover" href="/serie/${esc(s.slug)}" aria-label="Abrir ${esc(s.title)}">${card(s)}</a>
      <div class="lc-reading-copy"><a href="/serie/${esc(s.slug)}">${esc(s.title)}</a><span class="lc-reading-state">En lectura</span></div></article>`).join('')}</div></section>` : '';
  const shelfSummary = r.shelves && SHV.length ? `<div class="lc-shelf-summary" aria-label="Resumen de estanterías">${SHV.map(([k,l]) => `<div class="lc-shelf-tile"><b>${Math.max(0,Number(sh[k]?.n)||0).toLocaleString('es-MX')}</b><span>${l}</span></div>`).join('')}</div>` : '';
  const favGenres = selectedGenres(r.sections?.favorite_genres);
  const genreSection = favGenres.length ? `<section class="lc-sec lc-genres" aria-labelledby="lc-genres-title"><h2 id="lc-genres-title">Géneros favoritos</h2><div class="lc-genre-chips">${favGenres.map(g => `<span class="lc-genre-chip">${esc(g)}</span>`).join('')}</div></section>` : '';
  const customSeal = r.kanji ? SEAL_LOOKUP.get(r.kanji) : null;
  const sealCard = r.kanji ? `<article class="lc-badge-card"><span class="lc-badge-glyph" aria-hidden="true">${esc(r.kanji)}</span><div class="lc-badge-info"><strong>${esc(customSeal?.name || 'Sello personalizado')}</strong><p>${esc(customSeal?.description || 'Un símbolo propio para tu carnet de lector.')}</p>${customSeal ? `<small>Kanji: ${esc(customSeal.meaning)} · Apodo editorial</small>` : ''}</div></article>` : '';
  const sealSection = (sealCard || seals.length) ? `<section class="lc-sec lc-badges" aria-labelledby="lc-badges-title"><h2 id="lc-badges-title">Mis sellos</h2><div class="lc-badges-grid">${sealCard}${seals.map(([k,title]) => `<article class="lc-badge-card"><span class="lc-badge-glyph is-earned" aria-hidden="true">${esc(k)}</span><div class="lc-badge-info"><strong>Reconocimiento</strong><p>${esc(title)}</p></div></article>`).join('')}</div></section>` : '';
  const shareAction = `<div class="lc-share-row"><button type="button" class="lc-share-btn" id="lc-share">Compartir carnet</button><span class="lc-share-status" id="lc-share-status" role="status" aria-live="polite"></span></div>`;
  const stars = n => '★'.repeat(n || 0) + '☆'.repeat(Math.max(0, 5 - (n || 0)));
  const VIS = { all: 'Visible para todos', auth: 'Visible solo con cuenta', none: 'Privado: solo tú lo ves' };
  const bar = opt.owner ? `<div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between"><span style="display:grid;gap:2px"><h1 style="margin:0;font:800 30px 'Shippori Mincho B1',serif">Mi perfil</h1><span class="mono" style="font-size:12px">${VIS[opt.visibility] || ''} · <a href="/lector/${encodeURIComponent(r.username)}" id="lc-cp" title="Copiar enlace público">/lector/${esc(r.username)} ⧉</a></span></span><span style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="/preferencias">Editar carnet</a><a class="btn ghost" href="/preferencias?s=privacidad">Privacidad</a></span></div>` : '';
  const meU = C.getUser?.(), blk = !opt.owner && meU && r.username ? [...(window.__obiBlocks?.values() || [])].find(b => b.username === r.username) : null;
  const act = !opt.owner && meU && r.username && C.getProfile?.()?.username !== r.username ? `<div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;align-items:center">${blk ? `<span class="mono" style="font-size:11px;color:var(--mute)">${blk.kind === 'block' ? 'LO BLOQUEASTE' : 'LO SILENCIASTE'}</span><button type="button" class="btn ghost sm" id="lc-unb">${blk.kind === 'block' ? 'Desbloquear' : 'Quitar silencio'}</button>` : '<button type="button" class="btn ghost sm" data-blk="mute">Silenciar</button><button type="button" class="btn ghost sm" data-blk="block">Bloquear</button>'}</div>` : '';
  const mine = opt.owner && !(r.public_activity && r.stats) && own.data ? `<section class="lc-sec lc-stats"><div class="lc-hd"><h2>Mis estadísticas</h2><span class="mono" style="font-size:11px">SOLO TÚ VES ESTO · <a href="/preferencias?s=privacidad">HACERLAS PÚBLICAS</a></span></div>${statsHTML(own.data) || '<p class="lc-empty">Aún no hay lecturas registradas.</p>'}</section>` : '';
  const empty = opt.owner && !r.bio && !r.kanji && !favs.length && !r.links?.length ? `<p class="lc-empty" style="border:1px dashed var(--line);padding:14px 16px">Tu carnet está vacío. <a href="/preferencias">Añade bio, kanji, favoritas y enlaces</a>.</p>` : '';
  app.innerHTML = `<div class="lc lc-public" style="--ac:${esc(ac)}">${bar}${act}
    <section class="lc-card lc-public-card"><div class="lc-cover-stage ${r.banner_url ? 'is-user-banner' : 'is-collage'}">${bg}<div class="lc-sh"></div></div>
      <div class="lc-in">
        <span class="lc-av">${r.avatar_url ? `<img src="${esc(r.avatar_url)}" alt="">` : esc((r.username || '?')[0].toUpperCase())}</span>
        <div class="lc-tx"><span class="k">CARNET DE LECTOR · 読者証${r.since ? ' · DESDE ' + new Date(r.since).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).toUpperCase() : ''}</span>
          <div class="lc-name-row"><h1>${esc(r.username)}</h1>${sealMarkup(r.kanji, esc)}</div>
          ${r.links?.length ? `<div class="lc-ln">${r.links.filter(l => ICON[l.k]).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener nofollow ugc">${svg(l.k)}${ICON[l.k][0]}</a>`).join('')}</div>` : ''}${shareAction}
        </div>
        ${seals.length ? `<div class="lc-se">${seals.map(([k, t]) => `<span title="${t}" aria-label="${t}">${k}</span>`).join('')}</div>` : ''}
      </div></section>${empty}${about}${genreSection}${readingSection}
    ${favs.length ? `<section class="lc-sec"><h2>Favoritas</h2><div class="lc-fav">${favs.map(s => `<a href="/serie/${esc(s.slug)}" title="${esc(s.title)}">${card(s)}<span class="lc-fav-title">${esc(s.title)}</span></a>`).join('')}</div></section>` : ''}
    ${r.shelves ? `<section class="lc-sec lc-shelf-nav"><h2>Mis estanterías</h2>${shelfSummary}<div class="lc-hd"><span class="lc-more">Explora las obras de cada estantería</span><div class="lc-tabs" role="tablist" aria-label="Estanterías">${SHV.map(([k, l]) => `<button role="tab" data-sh="${k}" class="${k === firstShelf ? 'on' : ''}" aria-selected="${k === firstShelf}" aria-controls="lc-shb">${l} · ${sh[k]?.n || 0}</button>`).join('')}</div></div><div id="lc-shb" role="tabpanel">${shelfBody(firstShelf)}</div></section>` : ''}
    ${r.reviews?.length ? `<section class="lc-sec"><h2>Reseñas recientes</h2><div class="lc-rv">${r.reviews.map(v => `<article>
        <a class="lc-review-cover" href="/serie/${esc(v.series.slug)}" aria-label="Abrir ${esc(v.series.title)}">${card(v.series)}</a>
        <div class="lc-review-main"><a class="t" href="/serie/${esc(v.series.slug)}">${esc(v.series.title)}</a>
        ${v.stars ? `<span class="lc-review-rating" aria-label="${v.stars} de 5 estrellas">${stars(v.stars)}</span>` : ''}
        ${v.spoiler || v.is_spoiler || v.has_spoilers ? `<details class="lc-review-spoiler"><summary>Mostrar opinión con spoilers</summary><p>${esc(v.body || '')}${v.body?.length >= 400 ? '…' : ''}</p></details>`
          : `<p>${esc(v.body || '')}${v.body?.length >= 400 ? '…' : ''}</p>`}
        <small class="lc-review-meta">${new Date(v.at).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</small></div></article>`).join('')}</div></section>` : ''}
    ${sealSection}
    ${r.public_activity && r.stats ? `<section class="lc-sec lc-stats"><h2>Estadísticas</h2>${statsHTML(r.stats)}</section>` : ''}${mine}
  </div>`;
  app.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { app.querySelectorAll('[data-sh]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); app.querySelector('#lc-shb').innerHTML = shelfBody(b.dataset.sh); });
  app.querySelectorAll('.lc-rv .sp').forEach(p => p.onclick = p.onkeydown = () => p.classList.remove('sp'));
  const reBlk = async () => { const { data } = await sb.rpc('my_blocks'); if (Array.isArray(data)) window.obiSetBlocks?.(data); publicProfile(C, name, opt); };
  app.querySelectorAll('[data-blk]').forEach(b => b.onclick = async () => { const k = b.dataset.blk;
    if (!confirm(k === 'block' ? `¿Bloquear a ${r.username}? No verás sus comentarios ni reseñas y no podrá responder a los tuyos.` : `¿Silenciar a ${r.username}? Dejarás de ver sus comentarios y reseñas.`)) return;
    const { error } = await sb.rpc('block_user', { p_username: r.username, p_kind: k }); if (error) return C.toast?.(error.message); C.toast?.(k === 'block' ? 'Lector bloqueado' : 'Lector silenciado'); reBlk(); });
  const ub = app.querySelector('#lc-unb'); if (ub) ub.onclick = async () => { const { error } = await sb.rpc('unblock_user', { p_id: blk.id }); if (error) return C.toast?.(error.message); C.toast?.('Quitado de tu lista'); reBlk(); };
  const share = app.querySelector('#lc-share');
  if (share) share.onclick = async () => {
    const shareUrl = location.origin + '/lector/' + encodeURIComponent(r.username);
    const status = app.querySelector('#lc-share-status');
    const say = t => { if (status) status.textContent = t; };
    try {
      if (navigator.share) { await navigator.share({ title: 'Carnet de ' + r.username, url: shareUrl }); say('Compartido'); return; }
    } catch (error) { if (error?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(shareUrl); say('Enlace copiado'); }
    catch { say('Copia el enlace de tu carnet'); window.prompt?.('Enlace del carnet', shareUrl); }
  };
  const cp = app.querySelector('#lc-cp'); if (cp) cp.onclick = async e => { e.preventDefault(); e.stopPropagation(); try { await navigator.clipboard.writeText(location.origin + cp.getAttribute('href')); cp.textContent = 'Enlace copiado ✓'; } catch { cp.textContent = location.origin + cp.getAttribute('href'); } };
}

export async function preferences(C){
  const { sb, app, esc, url, toast, getUser, uploadAvatar, reload } = C; css();
  const user = getUser(); if (!user) return C.go('/entrar');
  const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
  const TABS = [['perfil', 'Perfil público'], ['privacidad', 'Privacidad'], ['lectura', 'Lectura'], ['avisos', 'Avisos'], ['adulto', 'Contenido'], ['pantalla', 'Accesibilidad'], ['bloqueos', 'Bloqueos'], ['cuenta', 'Cuenta']];
  const NAV_GROUPS = [
    ['Mi identidad', ['perfil', 'privacidad']],
    ['Mi experiencia', ['lectura', 'adulto', 'pantalla']],
    ['Comunidad', ['avisos', 'bloqueos']],
    ['Seguridad y cuenta', ['cuenta']]
  ];
  const TAB_NAMES = Object.fromEntries(TABS);
  app.__obiPrefsDispose?.();
  app.__obiPrefsNavGuard = null;
  const tab = TABS.some(t => t[0] === new URLSearchParams(location.search).get('s')) ? new URLSearchParams(location.search).get('s') : 'perfil';
  app.innerHTML = '<p class="mono">Cargando preferencias…</p>';
  const { data: P, error } = await sb.rpc('my_profile');
  if (error) { app.innerHTML = `<h1>Preferencias</h1><p class="mono">No se pudieron cargar: ${esc(error.message)}</p>`; return; }
  const navHref = k => '/preferencias' + (k === 'perfil' ? '' : '?s=' + k);
  const shell = body => `<h1>Preferencias</h1><div class="pf">
    <nav class="pf-nav" aria-label="Secciones de preferencias">
      ${NAV_GROUPS.map(([group, keys]) => `<div class="pf-nav-group"><p class="pf-nav-title">${group}</p>${keys.map(k =>
        `<a href="${navHref(k)}" class="${k === tab ? 'on' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${TAB_NAMES[k]}</a>`).join('')}</div>`).join('')}
    </nav>
    <div class="pf-mobile-nav">
      <label for="pf-mobile-tab">Sección de preferencias</label>
      <select id="pf-mobile-tab" aria-label="Ir a otra sección de preferencias">
        ${NAV_GROUPS.map(([group, keys]) => `<optgroup label="${group}">${keys.map(k =>
          `<option value="${k}" ${k === tab ? 'selected' : ''}>${TAB_NAMES[k]}</option>`).join('')}</optgroup>`).join('')}
      </select>
    </div>
    <div class="pf-body">${body}</div></div>`;
  if (app.__obiPrefsSelectHandler) app.removeEventListener('change', app.__obiPrefsSelectHandler);
  const selectHandler = e => {
    if (e.target?.id !== 'pf-mobile-tab') return;
    const next = e.target.value;
    if (!TAB_NAMES[next] || next === tab) return;
    if (app.__obiPrefsNavGuard && !app.__obiPrefsNavGuard()) { e.target.value = tab; return; }
    C.go(navHref(next));
  };
  app.__obiPrefsSelectHandler = selectHandler;
  app.addEventListener('change', selectHandler);
  const tg = (id, on, label, disabled = false) => `<button type="button" class="pf-tg" id="${id}" aria-pressed="${!!on}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''}><i></i></button>`;
  const flip = b => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  // La configuración de otra sesión nunca es el valor inicial de la cuenta actual.
  // La respuesta del perfil autenticado es la única fuente para este formulario.
  const UI = { motion: 'system', hour: 'auto', hide: [], ...(P.ui_prefs || {}) };
  const saveUI = async patch => { const prev = { ...UI }; Object.assign(UI, patch); window.obiSetUI?.({ ...UI }); const upd = { ui_prefs: UI }; if ('tz' in patch && P.notify) upd.notify = { ...P.notify, tz: UI.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
    const { error } = await sb.from('profiles').update(upd).eq('id', user.id); if (error) { Object.assign(UI, prev); window.obiSetUI?.({ ...UI }); toast(error.message); return false; } P.ui_prefs = { ...UI }; if (upd.notify) P.notify = upd.notify; C.setProfile?.(upd.notify ? { ui_prefs: P.ui_prefs, notify: upd.notify } : { ui_prefs: P.ui_prefs }); return true; };
  const card = (name, k, cur, l, d) => `<label style="display:grid;gap:4px;padding:14px 16px;border:2px solid ${cur === k ? 'var(--gold)' : '#2c281e'};background:${cur === k ? '#1f1c15' : '#0d0c0a'};cursor:pointer"><span style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="radio" name="${name}" value="${k}" ${cur === k ? 'checked' : ''} style="accent-color:var(--gold);width:18px;height:18px">${l}</span>${d ? `<span class="pf-note" style="font-size:13px">${d}</span>` : ''}</label>`;
  const optRow = (id, on, l, d) => `<div class="pf-row" style="justify-content:space-between"><span style="display:grid;gap:3px;flex:1 1 240px"><b style="font-size:14px">${l}</b>${d ? `<span class="pf-note" style="font-size:13px">${d}</span>` : ''}</span>${tg(id, on, l)}</div>`;

  if (tab === 'lectura') {
    const DEF = { theme: 'oscuro', size: 20, font: 'original', width: 'normal', lh: 'comodo', align: 'izquierda', illus: true, continuous: 'off', cw: 'show', autonext: true, autosecs: 5 };
    let R = readReaderPrefs(localStorage, user.id);
    // Un borrador pendiente (por ejemplo, tras cerrar la pestaña sin red) gana a
    // una copia antigua de Supabase. Nunca se consulta el borrador de otra cuenta.
    const pending = readPendingReaderPrefs(localStorage, user.id);
    const { data: rp, error: loadError } = await sb.from('reader_prefs').select('global,per_volume').eq('user_id', user.id).maybeSingle();
    if (!sameReaderAccount(getUser()?.id, user.id)) return;
    if (pending) R = pending;
    else if (!loadError && rp) R = { global: rp.global || {}, per_volume: rp.per_volume || {} };
    const vids = Object.keys(R.per_volume || {});
    const { data: vols } = vids.length ? await sb.from('volumes').select('id,num,series:series_id(title,theme)').in('id', vids) : { data: [] };
    let G = { ...DEF, ...R.global }, pt, saving = false;
    let syncStatus = pending ? 'Cambios locales pendientes de sincronizar' : loadError ? 'No se pudo verificar la sincronización' : 'Ajustes cargados';
    const showSync = text => { syncStatus = text; const el = app.querySelector('#lc-sync'); if (el) el.textContent = text; };
    const flush = async () => {
      if (saving || !sameReaderAccount(getUser()?.id, user.id)) return;
      saving = true;
      try {
        // Una sola escritura en vuelo: las ediciones rápidas posteriores se envían
        // después, en orden. Solo se reconoce la revisión confirmada por Supabase.
        while (sameReaderAccount(getUser()?.id, user.id)) {
          const snapshot = readPendingReaderPrefs(localStorage, user.id);
          if (!snapshot) break;
          showSync('Guardando en tu cuenta…');
          const { error } = await sb.from('reader_prefs').upsert({ user_id: user.id, global: snapshot.global, per_volume: snapshot.per_volume, updated_at: new Date().toISOString() });
          if (error) { showSync('Guardado en este dispositivo; pendiente de sincronizar'); toast('No se pudo sincronizar lectura: ' + error.message); break; }
          acknowledgeReaderPrefs(localStorage, user.id, snapshot);
          if (!readPendingReaderPrefs(localStorage, user.id)) showSync('Guardado en tu cuenta');
        }
      } catch (error) { showSync('Guardado en este dispositivo; pendiente de sincronizar'); toast('No se pudo sincronizar lectura: ' + error.message); }
      finally { saving = false; }
    };
    const persist = () => {
      if (!stageReaderPrefs(localStorage, user.id, R)) { showSync('No se pudo guardar en este dispositivo'); toast('No se pudo guardar el cambio localmente'); return; }
      showSync('Guardando…');
      clearTimeout(pt); pt = setTimeout(() => { void flush(); }, 150);
    };
    if (pending && navigator.onLine) void flush();
    addEventListener('online', () => { if (readPendingReaderPrefs(localStorage, user.id)) void flush(); }, { once: true });
    const set = (k, v) => { G[k] = v; R.global = { ...R.global, [k]: v }; persist(); draw(); };
    const seg = (k, l, o) => `<div style="display:grid;gap:8px"><span style="font-size:13px;font-weight:600;color:#e3dccb">${l}</span><div class="lc-tabs" style="justify-self:start">${o.map(([v, t]) => `<button type="button" data-k="${k}" data-v="${v}" class="${String(G[k]) === v ? 'on' : ''}" aria-pressed="${String(G[k]) === v}" style="--ac:var(--gold)">${t}</button>`).join('')}</div></div>`;
    const TH = { claro: ['#f6f1e5', '#1e1b15', '#e3dccb'], sepia: ['#efe2c6', '#3b2f1e', '#d8c7a2'], oscuro: ['#16140f', '#e9e1cd', '#2a2519'] };
    const FF = { original: 'Literata, serif', Literata: 'Literata, serif', serif: "Georgia, 'Times New Roman', serif", sans: "'IBM Plex Sans', sans-serif" };
    const sumV = v => [v.theme, v.font && v.font !== 'original' ? v.font : '', v.size ? v.size + ' px' : '', v.align === 'justificada' ? 'justificada' : ''].filter(Boolean).join(' · ').toUpperCase() || 'AJUSTES PROPIOS';
    const draw = () => {
      const th = TH[G.theme] || TH.oscuro, auto = G.continuous === 'off', season = localStorage.getItem('obi-season') !== 'off';
      const pv = readingPreviewDescription(G);
      app.innerHTML = shell(`<div style="display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;min-width:0">
        <div style="flex:1 1 340px;display:grid;gap:30px;min-width:0">
          <div style="display:grid;gap:6px"><h2>Lectura</h2><p class="pf-note">Tus ajustes se aplican a todas las obras, aunque el equipo haya definido otro estilo. Se guardan al momento en este dispositivo y se sincronizan con tu cuenta.</p><p id="lc-sync" class="pf-note" role="status" aria-live="polite">${esc(syncStatus)}</p></div>
          <div style="display:grid;gap:14px"><h3>Texto</h3>
            ${seg('theme', 'Tema', [['claro', 'Claro'], ['sepia', 'Sepia'], ['oscuro', 'Oscuro']])}
            ${seg('font', 'Tipografía', [['original', 'Original del EPUB'], ['Literata', 'Literata'], ['serif', 'Serif'], ['sans', 'Sans']])}
            ${seg('width', 'Ancho', [['estrecho', 'Estrecho'], ['normal', 'Normal'], ['amplio', 'Amplio']])}
            ${seg('lh', 'Interlineado', [['compacto', 'Compacto'], ['comodo', 'Cómodo'], ['amplio', 'Amplio']])}
            ${seg('align', 'Alineación', [['izquierda', 'Izquierda'], ['justificada', 'Justificada']])}
            <label style="display:grid;gap:8px;max-width:360px"><span style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#e3dccb">Tamaño<span class="mono" style="color:var(--gold)" id="lc-sz">${G.size} px</span></span><input type="range" id="lc-size" min="14" max="30" value="${G.size}" style="accent-color:var(--gold)"></label></div>
          <div style="display:grid;gap:12px"><h3>Al terminar un capítulo</h3>
            ${seg('continuous', 'Modo', [['off', 'Por capítulo'], ['volume', 'Continua en el volumen'], ['all', 'Continua entre volúmenes']])}
            ${auto ? `<div class="pf-row" style="display:grid;gap:12px"><div style="display:flex;gap:16px;align-items:center;justify-content:space-between"><span style="display:grid;gap:3px"><b style="font-size:14px">Pasar solo al siguiente capítulo</b><span class="pf-note" style="font-size:13px">Con cuenta atrás; puedes detenerla.</span></span>${tg('lc-auto', G.autonext !== false, 'Pasar solo al siguiente')}</div>
              <label style="display:grid;gap:8px;opacity:${G.autonext !== false ? 1 : .45}"><span style="display:flex;justify-content:space-between;font-size:13px;font-weight:600">Espera<span class="mono" style="color:var(--gold)" id="lc-sc">${G.autosecs} s</span></span><input type="range" id="lc-secs" min="3" max="30" value="${G.autosecs}" ${G.autonext !== false ? '' : 'disabled'} style="accent-color:var(--gold)"></label></div>` : ''}</div>
          <div style="display:grid;gap:10px"><h3>Contenido</h3>
            <div class="pf-row" style="justify-content:space-between"><span style="display:grid;gap:3px;flex:1 1 220px"><b style="font-size:14px">Mostrar ilustraciones</b><span class="pf-note" style="font-size:13px">Las imágenes dentro del capítulo.</span></span>${tg('lc-illus', G.illus !== false, 'Mostrar ilustraciones')}</div>
            <div class="pf-row" style="justify-content:space-between"><span style="display:grid;gap:3px;flex:1 1 220px"><b style="font-size:14px">Temas de temporada</b><span class="pf-note" style="font-size:13px">Decoración de festivales y estaciones en la plataforma.</span></span>${tg('lc-season', season, 'Temas de temporada')}</div>
            ${seg('cw', 'Avisos de contenido', [['show', 'Mostrar plegable'], ['icon', 'Solo icono'], ['hide', 'No mostrar']])}</div>
          <div style="display:grid;gap:10px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h3>Ajustes guardados por volumen</h3><span class="mono" style="font-size:11px">SE CREAN DESDE EL LECTOR</span></div>
            ${Object.keys(R.per_volume || {}).length ? Object.entries(R.per_volume).map(([id, v]) => { const vo = (vols || []).find(x => x.id === id); return `<div class="pf-row"><span style="width:34px;height:46px;flex:none;background:${esc(vo?.series?.theme?.color || '#2a2519')}"></span><span style="display:grid;gap:3px;flex:1 1 200px;min-width:0"><b style="font-size:14px">${esc(vo ? vo.series?.title + ' · Vol. ' + vo.num : 'Volumen eliminado')}</b><span class="mono" style="font-size:12px">${esc(sumV(v))}</span></span><button type="button" class="btn ghost sm" data-delv="${esc(id)}" style="flex:none;white-space:nowrap">Borrar</button></div>`; }).join('') : '<p class="pf-note">No tienes ajustes por volumen.</p>'}</div>
          <div class="pf-up" style="padding-top:16px;border-top:1px solid var(--line)"><button type="button" class="btn ghost" id="lc-reset">Restablecer valores</button><span class="pf-note" style="font-size:13px">Vuelve a los ajustes originales. No borra los de cada volumen.</span></div>
        </div>
        <aside class="pf-reading-preview" aria-label="Vista previa de lectura" style="flex:1 1 320px;max-width:460px;position:sticky;top:80px;display:grid;gap:10px"><h3>Vista previa de lectura</h3><p class="pf-preview-note">Texto de ejemplo para comprobar cómo se vería un capítulo. No modifica el contenido de ninguna obra.</p>
          <div id="lc-pv" style="background:${th[0]};color:${th[1]};border:1px solid var(--line);padding:28px ${{ estrecho: 48, normal: 30, amplio: 16 }[G.width] || 30}px;display:grid;gap:14px">
            <span class="mono" style="font-size:11px;letter-spacing:.14em;opacity:.7;color:inherit">VOL. 2 · CAP. 14</span>
            <h4 style="margin:0;font:800 ${Math.round(G.size * 1.3)}px/1.2 'Shippori Mincho B1',serif">El archivo de las horas</h4>
            ${['La bibliotecaria dejó la lámpara sobre el mostrador y abrió el registro. Nadie había pedido ese libro en cuarenta años, y sin embargo la ficha tenía una fecha de hoy escrita con su propia letra.', '—¿Quién lo devolvió? —preguntó, aunque ya sabía la respuesta.'].map(t => `<p class="lc-pp" style="margin:0;font-family:${FF[G.font] || FF.original};font-size:${G.size}px;line-height:${{ compacto: 1.45, comodo: 1.7, amplio: 1.95 }[G.lh] || 1.7};text-align:${G.align === 'justificada' ? 'justify' : 'left'};hyphens:auto">${t}</p>`).join('')}
            ${G.illus !== false ? `<div style="aspect-ratio:16/9;background:${th[2]};display:grid;place-items:center;font:11px 'IBM Plex Mono',monospace;opacity:.8">ILUSTRACIÓN DE EJEMPLO</div>` : ''}
            ${G.cw === 'hide' ? '' : G.cw === 'icon' ? '<p style="margin:0;font-size:13px">⚠ Aviso de contenido (icono)</p>' : '<details style="font-size:13px"><summary>Aviso de contenido (ejemplo)</summary><p style="margin:8px 0 0">Este capítulo puede incluir temas sensibles.</p></details>'}
          </div>
          <div class="pf-preview" aria-live="polite" aria-atomic="true">
            <strong>${esc(pv.mode)}</strong>
            <div class="pf-preview-guide"><p>${esc(pv.next)}</p><p>${esc(pv.warnings)}</p><p>${esc(pv.illustration)}</p></div>
          </div></aside></div>`);
      const $ = s => app.querySelector(s);
      app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k, v = b.dataset.v;
        set(k, v);
        app.querySelectorAll('[data-k]').forEach(next => {
          if (next.dataset.k === k && next.dataset.v === v) next.focus({ preventScroll: true });
        });
      });
      $('#lc-size').oninput = e => { G.size = +e.target.value; $('#lc-sz').textContent = G.size + ' px'; app.querySelectorAll('.lc-pp').forEach(x => x.style.fontSize = G.size + 'px'); $('#lc-pv h4').style.fontSize = Math.round(G.size * 1.3) + 'px'; };
      $('#lc-size').onchange = () => set('size', G.size);
      $('#lc-secs')?.addEventListener('input', e => { G.autosecs = +e.target.value; $('#lc-sc').textContent = G.autosecs + ' s'; });
      $('#lc-secs')?.addEventListener('change', () => set('autosecs', G.autosecs));
      $('#lc-auto')?.addEventListener('click', () => set('autonext', G.autonext === false));
      $('#lc-illus').onclick = () => set('illus', G.illus === false);
      $('#lc-season').onclick = () => { localStorage.getItem('obi-season') === 'off' ? localStorage.removeItem('obi-season') : (localStorage.setItem('obi-season-mig1', '1'), localStorage.setItem('obi-season', 'off')); dispatchEvent(new Event('obi-season')); draw(); };
      app.querySelectorAll('[data-delv]').forEach(b => b.onclick = () => { delete R.per_volume[b.dataset.delv]; persist(); draw(); });
      $('#lc-reset').onclick = () => { if (!confirm('¿Volver a los ajustes originales de lectura?')) return; G = { ...DEF }; R.global = {}; persist(); draw(); };
    };
    draw(); return;
  }
  if (tab === 'privacidad') {
    const S = Object.fromEntries(SECS.map(([k, , d]) => [k, P.profile_sections?.[k] ?? d]));
    const [{ data: hs }, { data: rvs }, { data: prev }] = await Promise.all([
      P.hidden_series?.length ? sb.from('series').select('id,title,cover_path,cover_thumb_path,theme').in('id', P.hidden_series) : { data: [] },
      sb.from('series_reviews').select('anonymous').eq('user_id', user.id), sb.rpc('deletion_preview')]);
    const save = async (patch, msg) => { const { error } = await sb.from('profiles').update(patch).eq('id', user.id); if (error) { toast(error.message); return false; } Object.assign(P, patch); C.setProfile?.(patch); if (msg) toast(msg); return true; };
    const VIS = [['all', 'Todos', 'Cualquiera con el enlace, aunque no tenga cuenta.'], ['auth', 'Solo con cuenta', 'Lectores que hayan iniciado sesión.'], ['none', 'Nadie', 'Solo tú. Los demás ven tu nombre y avatar.']];
    const OPT = [['discoverable', 'Aparecer en la búsqueda de lectores', 'Otros pueden encontrarte por tu nombre en Buscar.'], ['show_since', 'Mostrar «miembro desde» en el carnet', 'La fecha en que creaste tu cuenta.'], ['hide_reading', 'Ocultar qué estoy leyendo ahora', 'El estante «Leyendo» desaparece de tu carnet.']];
    const nRv = (rvs || []).length, nAn = (rvs || []).filter(r => r.anonymous).length, pend = prev?.requested_at || P.delete_requested_at;
    const endDate = d => new Date(new Date(d).getTime() + 30 * 864e5).toLocaleDateString('es-MX', { dateStyle: 'long' });
    const teamsHTML = (prev?.teams || []).length ? `<div class="pf-row" style="display:grid;gap:4px"><span class="mono" style="color:var(--gold);font-size:11px;letter-spacing:.12em">ERES PROPIETARIO DE ${prev.teams.length} ${prev.teams.length === 1 ? 'EQUIPO' : 'EQUIPOS'}</span>${prev.teams.map(t => `<span>«${esc(t.name)}» ${t.heir ? `pasará a <b>@${esc(t.heir)}</b>, su admin más antiguo.` : 'no tiene otro admin: quedará <b>en pausa</b> hasta que el Bibliotecario lo asigne.'}</span>`).join('')}</div>` : '';
    const MED2 = s => MED(s.cover_thumb_path || s.cover_path);
    let viewAs = app.__obiPrivacyView === 'auth' ? 'auth' : 'guest';
    const privacyPreview = () => {
      const m = privacyPreviewModel(P, S, viewAs);
      return `<div class="pf-preview">
        <h3 id="pv-preview-heading">Así puede verse tu carnet</h3>
        <p class="pf-preview-note">Vista orientativa, calculada con las opciones guardadas. No publica cambios ni sustituye una visita real con otra cuenta.</p>
        <div class="pf-preview-audience" role="group" aria-label="Simular tipo de visitante">
          <button type="button" data-pv-audience="guest" aria-pressed="${viewAs === 'guest'}">Sin iniciar sesión</button>
          <button type="button" data-pv-audience="auth" aria-pressed="${viewAs === 'auth'}">Con cuenta</button>
        </div>
        <div class="pf-preview-sample">
          <strong>${esc(P.username)}</strong>
          <strong>${esc(m.headline)}</strong>
          <p class="pf-preview-note">${esc(m.note)}</p>
          ${m.accessible ? `<p class="pf-preview-note">Secciones visibles para este visitante:</p>
            ${m.visible.length ? `<ul class="pf-preview-list">${m.visible.map(name => `<li>${esc(name)}</li>`).join('')}</ul>` : '<p class="pf-preview-note">No hay secciones públicas activadas.</p>'}
            ${m.hidden.length ? `<p class="pf-preview-note">Ocultas: ${esc(m.hidden.join(', '))}.</p>` : ''}
            <p class="pf-preview-note">${esc(m.reading)}</p>
            ${m.since ? '<p class="pf-preview-note">Aparecerá la fecha «miembro desde».</p>' : ''}` : ''}
          <p class="pf-preview-note">${esc(m.search)}</p>
        </div>
      </div>`;
    };
    app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Privacidad</h2><p class="pf-note">Decide quién ve tu carnet y qué se muestra en él. Se guarda al momento.</p></div>
      <div style="display:grid;gap:12px"><h3>¿Quién ve mi perfil?</h3><div class="pf-sl" role="radiogroup" aria-label="Quién ve mi perfil">${VIS.map(([k, l, d]) => `<label style="display:grid;gap:4px;padding:14px 16px;border:2px solid ${P.profile_visibility === k ? 'var(--gold)' : '#2c281e'};background:${P.profile_visibility === k ? '#1f1c15' : '#0d0c0a'};cursor:pointer"><span style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="radio" name="vis" value="${k}" ${P.profile_visibility === k ? 'checked' : ''} style="accent-color:var(--gold);width:18px;height:18px">${l}</span><span class="pf-note" style="font-size:13px">${d}</span></label>`).join('')}</div></div>
      <div style="display:grid;gap:10px"><h3>Visibilidad</h3>${OPT.map(([k, l, d]) => `<div class="pf-row" style="justify-content:space-between"><span style="display:grid;gap:3px;flex:1 1 240px"><b style="font-size:14px">${l}</b><span class="pf-note" style="font-size:13px">${d}</span></span>${tg('o-' + k, P[k], l)}</div>`).join('')}</div>
      <div style="display:grid;gap:10px"><h3>Secciones del carnet</h3><div class="pf-sl">${SECS.map(([k, l]) => `<div><span>${l}</span>${tg('s-' + k, S[k], l)}</div>`).join('')}<div><span>Estadísticas</span>${tg('s-pub', P.public_activity, 'Estadísticas')}</div></div></div>
      <section id="pv-preview" aria-labelledby="pv-preview-heading" aria-live="polite" aria-atomic="true">${privacyPreview()}</section>
      <div style="display:grid;gap:10px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h3>Obras ocultas de mis estantes</h3><a class="mono" style="font-size:11px" href="/biblioteca">SE OCULTAN DESDE MI BIBLIOTECA</a></div>
        <div id="pv-hid">${(hs || []).length ? hs.map(s => `<div class="pf-row"><span style="width:34px;height:46px;flex:none;background:${esc(s.theme?.color || '#2a2519')} center/cover ${s.cover_path ? `url('${esc(MED2(s))}')` : ''}"></span><span style="flex:1;min-width:0;font-weight:600">${esc(s.title)}</span><button type="button" class="btn ghost sm" data-unhide="${s.id}" style="flex:none;white-space:nowrap">Mostrar de nuevo</button></div>`).join('') : '<p class="pf-note">No tienes obras ocultas.</p>'}</div></div>
      <div style="display:grid;gap:8px"><h3>Reseñas</h3><p class="pf-note" style="color:#e3dccb;max-width:62ch">Al publicar cada reseña eliges si va con tu nombre o como <b>Lector anónimo</b>. Las anónimas no aparecen en tu carnet ni cuentan para el sello 評.</p><span class="mono" style="font-size:12px">${nRv} ${nRv === 1 ? 'RESEÑA' : 'RESEÑAS'} · ${nAn} ${nAn === 1 ? 'ANÓNIMA' : 'ANÓNIMAS'}</span></div>
      <div style="display:grid;gap:10px"><h3>Tus datos</h3><div class="pf-up"><button type="button" class="btn ghost" id="pv-exp">Descargar mis datos (JSON)</button><span class="pf-note" style="font-size:13px">Perfil, biblioteca, progreso, reseñas, calificaciones y preferencias.</span></div></div>
      <div style="display:grid;gap:12px;border:1px solid #6b2a20;background:#1a0f0c;padding:18px" id="pv-del">
        <h3 style="color:#f59e7a">Eliminar mi cuenta</h3>
        ${pend ? `<p style="margin:0;font-size:14px;line-height:1.55">Tu cuenta se eliminará el <b>${endDate(pend)}</b>. Mientras tanto tu perfil no es visible.</p><button type="button" class="btn" id="pv-undel" style="justify-self:start">Cancelar eliminación</button>`
        : `<p style="margin:0;font-size:14px;line-height:1.55;color:#e3dccb;max-width:62ch">Tu perfil desaparece al momento. Tienes <b>30 días</b> para arrepentirte entrando de nuevo; después se borra todo de forma definitiva.</p>
        <button type="button" class="btn ghost" id="pv-open" style="justify-self:start;border-color:#c8402e;color:#f59e7a">Eliminar mi cuenta…</button>
        <div id="pv-conf" hidden style="gap:12px;border-top:1px dashed #6b2a20;padding-top:14px">${teamsHTML}
          <label class="pf-f"><span>Escribe <span class="mono" style="color:#f59e7a">ELIMINAR</span> para confirmar</span><input id="pv-word" autocomplete="off" style="max-width:260px;border-color:#6b2a20"></label>
          <span style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn" id="pv-go" disabled style="background:#c8402e;color:#fff">Eliminar en 30 días</button><button type="button" class="btn ghost" id="pv-cancel">Cancelar</button></span></div>`}
      </div>`);
    const $ = s => app.querySelector(s);
    const refreshPrivacyPreview = () => { const region = $('#pv-preview'); if (region) region.innerHTML = privacyPreview(); };
    $('#pv-preview').onclick = e => {
      const b = e.target.closest('[data-pv-audience]');
      if (!b) return;
      viewAs = b.dataset.pvAudience;
      app.__obiPrivacyView = viewAs;
      refreshPrivacyPreview();
      $('#pv-preview [data-pv-audience="' + viewAs + '"]')?.focus({ preventScroll: true });
    };
    app.querySelectorAll('[name="vis"]').forEach(i => i.onchange = async () => { if (await save({ profile_visibility: i.value }, 'Visibilidad actualizada')) preferences(C); });
    OPT.forEach(([k]) => $('#o-' + k).onclick = async e => { const b = e.currentTarget, v = !P[k]; if (await save({ [k]: v })) { flip(b); refreshPrivacyPreview(); } });
    SECS.forEach(([k]) => $('#s-' + k).onclick = async e => { const b = e.currentTarget; S[k] = !S[k]; if (await save({ profile_sections: { ...P.profile_sections, ...S } })) { flip(b); refreshPrivacyPreview(); } else S[k] = !S[k]; });
    $('#s-pub').onclick = async e => { const b = e.currentTarget; if (await save({ public_activity: !P.public_activity })) { flip(b); refreshPrivacyPreview(); } };
    app.querySelectorAll('[data-unhide]').forEach(b => b.onclick = async () => { if (await save({ hidden_series: (P.hidden_series || []).filter(x => x !== b.dataset.unhide) }, 'Vuelve a verse en tu perfil')) preferences(C); });
    $('#pv-exp').onclick = async e => { const b = e.currentTarget; b.disabled = true; const { data, error } = await sb.rpc('export_my_data'); b.disabled = false; if (error) return toast(error.message);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'obi-mis-datos-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
    $('#pv-open')?.addEventListener('click', () => { $('#pv-conf').hidden = false; $('#pv-conf').style.display = 'grid'; $('#pv-open').hidden = true; $('#pv-word').focus(); });
    $('#pv-cancel')?.addEventListener('click', () => { $('#pv-conf').hidden = true; $('#pv-conf').style.display = ''; $('#pv-open').hidden = false; });
    $('#pv-word')?.addEventListener('input', e => { $('#pv-go').disabled = e.target.value.trim().toUpperCase() !== 'ELIMINAR'; });
    $('#pv-go')?.addEventListener('click', async () => { const { error } = await sb.rpc('request_account_deletion'); if (error) return toast(error.message);
      C.setProfile?.({ delete_requested_at: new Date().toISOString() }); C.delBanner?.(); toast('Tu cuenta se eliminará en 30 días'); preferences(C); });
    $('#pv-undel')?.addEventListener('click', async () => { const { error } = await sb.rpc('cancel_account_deletion'); if (error) return toast(error.message);
      C.setProfile?.({ delete_requested_at: null }); C.delBanner?.(); toast('Eliminación cancelada'); preferences(C); });
    return;
  }
  if (tab === 'avisos') {
    const KINDS = [['capitulo', 'Capítulos nuevos', 'De las obras que sigues.', true], ['respuesta', 'Respuestas a tus comentarios', 'Cuando alguien contesta lo que escribiste.', true], ['errata', 'Erratas que reportaste', 'Cuando el equipo revisa tu reporte.', true], ['tablero', 'Estudio y equipos', 'Tablero, temporadas y ranking. Solo si formas parte de un equipo.', false]];
    const FREQ = [['off', 'Nunca', 'Solo en la campana.'], ['inmediato', 'Al momento', 'Un correo en cuanto llega el aviso.'], ['diario', 'Resumen diario', 'Un solo correo a las 9:00, si hay novedades.'], ['semanal', 'Resumen semanal', 'Los lunes a las 9:00, si hay novedades.']];
    const N = { web: {}, email: {}, freq: 'off', ...(P.notify || {}) }; N.web = { ...N.web }; N.email = { ...N.email };
    const onW = k => N.web[k] !== false, onE = (k, d) => N.email[k] ?? d;
    const [{ data: fol }] = await Promise.all([sb.from('follows').select('series_id,channels').eq('user_id', user.id)]);
    const { data: ser } = (fol || []).length ? await sb.from('series').select('id,slug,title').in('id', fol.map(f => f.series_id)) : { data: [] };
    const FL = (fol || []).map(r => ({ r, s: (ser || []).find(x => x.id === r.series_id) })).filter(x => x.s).sort((x, y) => x.s.title.localeCompare(y.s.title, 'es'));
    const save = async () => { N.tz = window.obiTZ?.() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; const v = { web: N.web, email: N.email, freq: N.freq, tz: N.tz }; const { error } = await sb.from('profiles').update({ notify: v }).eq('id', user.id); if (error) { toast(error.message); return false; } P.notify = v; return true; };
    const lbl = 'font-size:11px;letter-spacing:.1em;color:var(--mute);display:grid;justify-items:center;gap:4px';
    const draw = () => {
      const off = N.freq === 'off';
      const summary = notificationPreviewSummary(N, KINDS);
      app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Avisos</h2><p class="pf-note">Elige qué te avisamos y por dónde. Se guarda al momento.</p></div>
      <div style="display:grid;gap:12px"><h3>Correo</h3><p class="pf-note">Se envía a <b>${esc(user.email)}</b>.</p><div class="pf-sl" role="radiogroup" aria-label="Frecuencia de correo">${FREQ.map(([k, l, d]) => `<label style="display:grid;gap:4px;padding:14px 16px;border:2px solid ${N.freq === k ? 'var(--gold)' : '#2c281e'};background:${N.freq === k ? '#1f1c15' : '#0d0c0a'};cursor:pointer"><span style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="radio" name="fq" value="${k}" ${N.freq === k ? 'checked' : ''} style="accent-color:var(--gold);width:18px;height:18px">${l}</span><span class="pf-note" style="font-size:13px">${d}</span></label>`).join('')}</div></div>
      <section class="pf-preview" aria-label="Resumen de configuración de avisos">
        <h3>Tu configuración de avisos</h3>
        <p class="pf-note">Campana: ${summary.webCount} de ${summary.total} tipos activos · Correo: ${summary.emailCount} de ${summary.total} seleccionados.</p>
        <p class="${off ? 'pf-mail-pause' : 'pf-preview-note'}" role="status">${esc(summary.description)}</p>
      </section>
      <div style="display:grid;gap:10px"><h3>Qué te avisamos</h3>${KINDS.map(([k, l, d, de]) => `<div class="pf-row" style="justify-content:space-between"><span style="display:grid;gap:3px;flex:1 1 240px"><b style="font-size:14px">${l}</b><span class="pf-note" style="font-size:13px">${d}</span></span><span style="display:flex;gap:18px"><span class="mono" style="${lbl}">CAMPANA${tg('w-' + k, onW(k), l + ' en la campana')}</span><span class="mono ${off ? 'pf-mail-off' : ''}" style="${lbl}">CORREO${tg('e-' + k, onE(k, de), l + ' por correo' + (off ? ', pausado hasta activar correo' : ''), off)}</span></span></div>`).join('')}
      <p class="pf-note" style="font-size:13px">Los avisos de moderación sobre tu cuenta siempre llegan a la campana.</p></div>
      <div style="display:grid;gap:10px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h3>Obras que sigues</h3><span class="mono" style="font-size:11px">${FL.length} ${FL.length === 1 ? 'OBRA' : 'OBRAS'}</span></div>
      ${!onW('capitulo') && off ? '<p class="pf-note" style="font-size:13px">Tienes desactivados los avisos de capítulos nuevos: estos interruptores no tendrán efecto hasta que los actives arriba.</p>' : ''}
      ${FL.length ? `<div style="display:grid;gap:8px">${FL.map(({ r, s }) => `<div class="pf-row" style="justify-content:space-between"><a href="/serie/${esc(s.slug)}" style="flex:1 1 200px;font-weight:600">${esc(s.title)}</a><span style="display:flex;gap:12px;align-items:center"><button type="button" class="ui-lnk" data-unf="${s.id}" style="font-size:12px;color:var(--mute)">Dejar de seguir</button>${tg('f-' + s.id, r.channels?.web !== false, 'Avisos de ' + s.title)}</span></div>`).join('')}</div>` : '<p class="pf-note">Aún no sigues ninguna obra. Usa «Seguir serie» en la ficha de una obra.</p>'}</div>`);
      const $ = s => app.querySelector(s);
      app.querySelectorAll('[name="fq"]').forEach(i => i.onchange = async () => { const prev = N.freq; N.freq = i.value; if (await save()) { toast(i.value === 'off' ? 'Ya no recibirás correos' : 'Frecuencia de correo guardada'); draw(); } else N.freq = prev; });
      KINDS.forEach(([k, , , de]) => {
        $('#w-' + k).onclick = async e => { const b = e.currentTarget; N.web[k] = !onW(k); if (await save()) { flip(b); draw(); } else N.web[k] = !N.web[k]; };
        $('#e-' + k).onclick = async e => { if (off) return; const b = e.currentTarget; N.email[k] = !onE(k, de); if (await save()) { flip(b); draw(); } else N.email[k] = !N.email[k]; };
      });
      FL.forEach(({ r, s }) => { $('#f-' + s.id).onclick = async e => { const b = e.currentTarget, ch = { ...(r.channels || {}), web: r.channels?.web === false };
        const { error } = await sb.from('follows').update({ channels: ch }).eq('user_id', user.id).eq('series_id', s.id); if (error) return toast(error.message); r.channels = ch; flip(b); }; });
      app.querySelectorAll('[data-unf]').forEach(b => b.onclick = async () => { if (!confirm('¿Dejar de seguir esta obra?')) return; const id = b.dataset.unf; const { error } = await sb.from('follows').delete().eq('user_id', user.id).eq('series_id', id); if (error) return toast(error.message); FL.splice(FL.findIndex(x => x.s.id === id), 1); toast('Ya no sigues esta obra'); draw(); });
    };
    draw(); return;
  }
  if (tab === 'adulto') {
    const { data: gs } = await sb.from('series').select('genres,tags').eq('published', true);
    const opts = [...new Set((gs || []).flatMap(x => [...(x.genres || []), ...(Array.isArray(x.tags) ? x.tags : [])]).filter(Boolean).map(String))].sort((x, y) => x.localeCompare(y, 'es'));
    const has = g => UI.hide.some(h => h.toLowerCase() === g.toLowerCase());
    const draw = () => {
      app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Contenido</h2><p class="pf-note">Decide qué obras aparecen cuando exploras. Se guarda al momento.</p></div>
      <div style="display:grid;gap:10px"><h3>Obras +18</h3>${optRow('ad', P.adult_ok, 'Tengo 18 años o más y quiero ver obras +18', 'Si está apagado, se ocultan en el inicio, el catálogo, la búsqueda y los perfiles.')}</div>
      <div style="display:grid;gap:10px"><h3>Géneros y etiquetas ocultos</h3><p class="pf-note" style="font-size:13px">Las obras con alguno de estos no aparecen en el inicio, el catálogo ni la búsqueda. Si llegas por un enlace, la ficha sigue abierta; y en el catálogo vuelven a salir si filtras por ese género.</p>
        ${UI.hide.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${UI.hide.map((g, i) => `<span class="pf-row" style="padding:2px 2px 2px 14px;gap:2px;font-size:14px">${esc(g)}<button type="button" class="pf-x" data-hx="${i}" aria-label="Volver a mostrar ${esc(g)}">×</button></span>`).join('')}</div>` : '<p class="pf-note">No ocultas nada por ahora.</p>'}
        <form id="hf" class="pf-row" style="gap:10px;max-width:560px"><input id="hq" list="hl" placeholder="Escribe un género o etiqueta…" aria-label="Género o etiqueta a ocultar" style="flex:1 1 220px" autocomplete="off"><datalist id="hl">${opts.filter(o => !has(o)).map(o => `<option value="${esc(o)}"></option>`).join('')}</datalist><button class="btn">Ocultar</button></form></div>
      <p class="pf-note" style="font-size:13px">Los avisos de contenido dentro de los capítulos se eligen en <a href="/preferencias?s=lectura">Lectura</a>.</p>`);
      const b = app.querySelector('#ad'); b.onclick = async () => { const v = b.getAttribute('aria-pressed') !== 'true';
        if (v && !confirm('Confirma que tienes 18 años o más.')) return;
        const { error } = await sb.from('profiles').update({ adult_ok: v }).eq('id', user.id); if (error) return toast(error.message);
        P.adult_ok = v; C.setProfile?.({ adult_ok: v }); flip(b); toast(v ? 'Obras +18 visibles' : 'Obras +18 ocultas'); };
      app.querySelectorAll('[data-hx]').forEach(x => x.onclick = async () => { const g = UI.hide[+x.dataset.hx]; if (await saveUI({ hide: UI.hide.filter((_, i) => i !== +x.dataset.hx) })) { toast('«' + g + '» vuelve a mostrarse'); draw(); } });
      app.querySelector('#hf').onsubmit = async e => { e.preventDefault(); const q = app.querySelector('#hq').value.trim(); if (!q) return;
        const g = opts.find(o => o.toLowerCase() === q.toLowerCase()); if (!g) return toast('Ese género o etiqueta no está en el catálogo');
        if (has(g)) return toast('Ya está oculto'); if (UI.hide.length >= 40) return toast('Puedes ocultar hasta 40');
        if (await saveUI({ hide: [...UI.hide, g] })) { toast('Obras con «' + g + '» ocultas'); draw(); app.querySelector('#hq')?.focus(); } };
    };
    draw(); return;
  }
  if (tab === 'pantalla') {
    const MOT = [['system', 'Como mi dispositivo', 'Sigue el ajuste «reducir movimiento» de tu sistema.'], ['reduce', 'Reducir movimiento', 'Sin animaciones de temporada, carrusel del inicio ni transiciones.']];
    const HR = [['auto', 'Automático', ''], ['24', '24 horas', '18:30'], ['12', '12 horas', '6:30 p. m.']];
    const DEV = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    let TZS = []; try { TZS = Intl.supportedValuesOf('timeZone'); } catch { TZS = ['America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Caracas', 'America/New_York', 'America/Los_Angeles', 'Europe/Madrid', 'Asia/Tokyo', 'Asia/Seoul', 'UTC']; }
    if (UI.tz && !TZS.includes(UI.tz)) TZS = [UI.tz, ...TZS];
    const OPT = [['contrast', 'Más contraste', 'Textos secundarios y bordes más claros.'], ['underline', 'Subrayar los enlaces', 'Distingue los enlaces sin depender del color.'], ['focus', 'Resaltar el foco del teclado', 'Un borde dorado grueso al navegar con Tab.']];
    const draw = () => {
      app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Accesibilidad</h2><p class="pf-note">Se guarda en tu cuenta y se aplica al momento en todos tus dispositivos. El tamaño y la tipografía de los capítulos están en <a href="/preferencias?s=lectura">Lectura</a>.</p></div>
      <div style="display:grid;gap:12px"><h3>Movimiento</h3><div class="pf-sl" role="radiogroup" aria-label="Movimiento">${MOT.map(([k, l, d]) => card('mo', k, UI.motion, l, d)).join('')}</div></div>
      <div style="display:grid;gap:10px"><h3>Lectura de la interfaz</h3>${OPT.map(([k, l, d]) => optRow('a-' + k, UI[k], l, d)).join('')}</div>
      <div style="display:grid;gap:12px"><h3>Formato de hora</h3><div class="pf-sl" role="radiogroup" aria-label="Formato de hora">${HR.map(([k, l, d]) => card('hr', k, UI.hour, l, d)).join('')}</div></div>
      <div style="display:grid;gap:10px"><h3>Zona horaria</h3><p class="pf-note" style="font-size:13px">Para el calendario de estrenos, las horas de publicación y tus resúmenes por correo.</p>
        <div class="pf-row" style="gap:10px;max-width:560px"><select id="tz" aria-label="Zona horaria" style="flex:1 1 260px"><option value="">Automática · ${esc(DEV.replace(/_/g, ' '))}</option>${TZS.map(z => `<option value="${esc(z)}" ${UI.tz === z ? 'selected' : ''}>${esc(z.replace(/_/g, ' '))}</option>`).join('')}</select></div>
        <p class="pf-note" style="font-size:13px">Ahora mismo: ${esc(new Date().toLocaleString('es-MX', { weekday: 'long', hour: 'numeric', minute: '2-digit' }))}.</p></div>`);
      app.querySelectorAll('[name="mo"]').forEach(i => i.onchange = async () => { if (await saveUI({ motion: i.value })) { toast(i.value === 'reduce' ? 'Movimiento reducido' : 'Movimiento según tu dispositivo'); draw(); } });
      app.querySelector('#tz').onchange = async e => { if (await saveUI({ tz: e.target.value })) { toast(e.target.value ? 'Zona horaria: ' + e.target.value.replace(/_/g, ' ') : 'Zona horaria automática'); draw(); } };
      app.querySelectorAll('[name="hr"]').forEach(i => i.onchange = async () => { if (await saveUI({ hour: i.value })) { toast('Formato de hora guardado'); draw(); } });
      OPT.forEach(([k]) => app.querySelector('#a-' + k).onclick = async e => { const b = e.currentTarget; if (await saveUI({ [k]: !UI[k] })) flip(b); });
    };
    draw(); return;
  }
  if (tab === 'bloqueos') {
    let L = []; const load = async () => { const { data, error } = await sb.rpc('my_blocks'); if (error) { toast(error.message); return; } L = data || []; window.obiSetBlocks?.(L); };
    await load();
    const KL = { mute: 'Silenciado', block: 'Bloqueado' };
    const draw = () => {
      app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Bloqueos</h2><p class="pf-note">Nadie se entera de que lo silenciaste o bloqueaste.</p></div>
      <div class="pf-sl"><div style="display:grid;gap:4px;padding:14px 16px;border:1px solid #2c281e;background:#0d0c0a"><b>Silenciar</b><span class="pf-note" style="font-size:13px">Dejas de ver sus comentarios y reseñas.</span></div><div style="display:grid;gap:4px;padding:14px 16px;border:1px solid #2c281e;background:#0d0c0a"><b>Bloquear</b><span class="pf-note" style="font-size:13px">Además, no puede responder a tus comentarios.</span></div></div>
      <form id="bf" class="pf-row" style="gap:10px"><input id="bq" placeholder="Nombre de usuario" aria-label="Nombre de usuario" autocomplete="off" style="flex:1 1 200px"><select id="bk" aria-label="Tipo"><option value="mute">Silenciar</option><option value="block">Bloquear</option></select><button class="btn">Añadir</button></form>
      <div style="display:grid;gap:10px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h3>Tu lista</h3><span class="mono" style="font-size:11px">${L.length} ${L.length === 1 ? 'LECTOR' : 'LECTORES'}</span></div>
      ${L.length ? `<div style="display:grid;gap:8px">${L.map(b => `<div class="pf-row" style="justify-content:space-between"><span style="display:flex;gap:10px;align-items:center;flex:1 1 200px"><span class="lc-av" style="width:36px;height:36px;font-size:15px">${b.avatar_url ? `<img src="${esc(b.avatar_url)}" alt="">` : esc((b.username || '?')[0].toUpperCase())}</span><a href="/lector/${encodeURIComponent(b.username)}">${esc(b.username)}</a></span><span style="display:flex;gap:10px;align-items:center"><select data-bk="${b.id}" aria-label="Tipo para ${esc(b.username)}">${Object.entries(KL).map(([k, l]) => `<option value="${k}" ${b.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="btn ghost sm" data-ub="${b.id}">Quitar</button></span></div>`).join('')}</div>` : '<p class="pf-note">No has silenciado ni bloqueado a nadie. También puedes hacerlo desde el carnet de cualquier lector.</p>'}</div>`);
      app.querySelector('#bf').onsubmit = async e => { e.preventDefault(); const n = app.querySelector('#bq').value.trim().replace(/^@/, ''), k = app.querySelector('#bk').value; if (!n) return;
        const { error } = await sb.rpc('block_user', { p_username: n, p_kind: k }); if (error) return toast(error.message); await load(); toast(k === 'block' ? 'Lector bloqueado' : 'Lector silenciado'); draw(); };
      app.querySelectorAll('[data-bk]').forEach(s => s.onchange = async () => { const b = L.find(x => x.id === s.dataset.bk); const { error } = await sb.rpc('block_user', { p_username: b.username, p_kind: s.value }); if (error) return toast(error.message); await load(); toast(s.value === 'block' ? 'Ahora está bloqueado' : 'Ahora está silenciado'); draw(); });
      app.querySelectorAll('[data-ub]').forEach(x => x.onclick = async () => { const { error } = await sb.rpc('unblock_user', { p_id: x.dataset.ub }); if (error) return toast(error.message); await load(); toast('Quitado de tu lista'); draw(); });
    };
    draw(); return;
  }
  if (tab === 'cuenta') {
    const nextU = P.username_changed_at ? new Date(new Date(P.username_changed_at).getTime() + 30 * 864e5) : null, lockU = nextU && nextU > new Date();
    const last = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : '';
    const { data: idd } = await sb.auth.getUserIdentities().catch(() => ({ data: null }));
    const IDS = idd?.identities || [], gid = IDS.find(i => i.provider === 'google'), hasPw = IDS.some(i => i.provider === 'email');
    const qs = new URLSearchParams(location.search + '&' + location.hash.slice(1)), lerr = qs.get('error_description');
    if (lerr || qs.get('error')) history.replaceState({}, '', '/preferencias?s=cuenta');
    const LERR = lerr ? (/already|exist|linked/i.test(lerr) ? 'Esa cuenta de Google ya está enlazada a otro lector de El Obi del Lector.' : /manual linking/i.test(lerr) ? 'El enlace con Google no está activado todavía en el servidor.' : lerr) : '';
    const G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
    const gBox = gid
      ? `<div class="pf-row" style="justify-content:space-between"><span style="display:flex;gap:12px;align-items:center;flex:1 1 240px">${G}<span style="display:grid;gap:2px"><b style="font-size:14px">Enlazada con Google</b><span class="pf-note" style="font-size:13px">${esc(gid.identity_data?.email || '')}</span></span></span>${IDS.length > 1 ? '<button type="button" class="btn ghost sm" id="g-un">Desvincular</button>' : '<span class="pf-note" style="font-size:12px;max-width:220px">Es tu única forma de entrar: crea una contraseña antes de desvincularla.</span>'}</div>`
      : `<div class="pf-row" style="justify-content:space-between"><span style="display:flex;gap:12px;align-items:center;flex:1 1 240px">${G}<span class="pf-note" style="font-size:13px">Entra con un clic usando tu cuenta de Google. Tu biblioteca, tu carnet y tus avisos siguen siendo los mismos.</span></span><button type="button" id="g-ln" style="display:flex;align-items:center;gap:10px;min-height:44px;padding:0 16px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;border-radius:4px;font:600 14px 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer">${G}Enlazar con Google</button></div>`;
    const blk = (t, d, body) => `<div style="display:grid;gap:10px"><h3>${t}</h3>${d ? `<p class="pf-note" style="font-size:13px">${d}</p>` : ''}${body}</div>`;
    setTimeout(() => import('/patreon.js?v=1').then(m => m.accountBox(document.getElementById('pt-acc'), { sb, url, esc, toast })), 0);
    app.innerHTML = shell(`<div style="display:grid;gap:6px"><h2>Cuenta</h2><p class="pf-note">Tus datos de acceso. Nadie más ve tu correo.</p></div>
      ${blk('Patreon', 'Vincula tu cuenta para activar lo que es solo para mecenas.', '<div id="pt-acc"><p class="mono">Cargando…</p></div>')}
      ${blk('Nombre de usuario', `Es tu dirección pública: /lector/${esc(P.username)}. Si lo cambias, el enlace anterior seguirá llevando a tu carnet durante 90 días. Puedes cambiarlo una vez cada 30 días.`,
        `<form id="fu" class="pf-row" style="gap:10px"><input id="un" value="${esc(P.username)}" minlength="2" maxlength="32" autocomplete="username" aria-label="Nombre de usuario" style="flex:1 1 220px" ${lockU ? 'disabled' : ''}><button class="btn" ${lockU ? 'disabled' : ''}>Guardar</button></form>${lockU ? `<p class="pf-note" style="font-size:13px">Podrás cambiarlo de nuevo el ${nextU.toLocaleDateString('es-MX', { dateStyle: 'long' })}.</p>` : ''}<p id="un-err" role="alert" style="color:#f59e7a;margin:0;font-size:13px"></p>`)}
      ${blk('Correo', user.new_email ? `Cambio pendiente a <b>${esc(user.new_email)}</b>: confirma el enlace que enviamos a los dos correos.` : `Ahora: <b>${esc(user.email)}</b>. Te enviaremos un enlace al correo actual y otro al nuevo; el cambio se aplica al confirmar ambos.`,
        `<form id="fe" class="pf-row" style="gap:10px"><input id="em" type="email" autocomplete="email" placeholder="nuevo@correo.com" aria-label="Nuevo correo" style="flex:1 1 220px" required><button class="btn">Cambiar correo</button></form><p id="em-err" role="alert" style="color:#f59e7a;margin:0;font-size:13px"></p>`)}
      ${blk('Inicio de sesión con Google', gid ? 'Puedes entrar con Google o con tu correo y contraseña.' : '', gBox + (LERR ? `<p role="alert" style="color:#f59e7a;margin:0;font-size:13px">${esc(LERR)}</p>` : ''))}
      ${blk(hasPw ? 'Contraseña' : 'Crear contraseña', hasPw ? 'Te enviaremos un enlace a tu correo para elegir una nueva.' : 'Entraste con Google. Si quieres entrar también con tu correo, te enviamos un enlace para crear una contraseña.', '<button class="btn ghost" id="pw" style="justify-self:start">Cambiar contraseña</button>')}
      ${blk('Sesiones', last ? `Último inicio de sesión: ${last}.` : '', '<div class="pf-row" style="justify-content:space-between"><span class="pf-note" style="flex:1 1 240px;font-size:13px">¿Entraste desde un equipo ajeno o perdiste un dispositivo? Cierra todas las demás sesiones; esta seguirá abierta.</span><button class="btn ghost" id="so">Cerrar las demás sesiones</button></div>')}
      <p class="pf-note" style="font-size:13px">Para descargar tus datos o eliminar tu cuenta, ve a <a href="/preferencias?s=privacidad">Privacidad</a>.</p>`);
    const $ = s => app.querySelector(s), EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    $('#fu').onsubmit = async e => { e.preventDefault(); const v = $('#un').value.trim(); $('#un-err').textContent = '';
      if (v === P.username) return; if (v.length < 2 || v.length > 32) return $('#un-err').textContent = 'Entre 2 y 32 caracteres.';
      if (!/^[\p{L}\p{N}_.-]+$/u.test(v)) return $('#un-err').textContent = 'Usa solo letras, números, punto, guion y guion bajo (sin espacios).';
      if (!confirm(`¿Cambiar tu nombre a «${v}»? Tu enlace pasará a ser /lector/${v}.`)) return;
      const { data, error } = await sb.rpc('change_username', { p_new: v }); if (error) return $('#un-err').textContent = error.message;
      P.username = data; P.username_changed_at = new Date().toISOString(); C.setProfile?.({ username: data, username_changed_at: P.username_changed_at }); toast('Nombre de usuario actualizado'); preferences(C); };
    $('#fe').onsubmit = async e => { e.preventDefault(); const v = $('#em').value.trim().toLowerCase(); $('#em-err').textContent = '';
      if (!EMAIL_RE.test(v)) return $('#em-err').textContent = 'Escribe un correo válido.'; if (v === user.email) return $('#em-err').textContent = 'Ese ya es tu correo.';
      const { error } = await sb.auth.updateUser({ email: v }, { emailRedirectTo: location.origin + '/preferencias?s=cuenta' }); if (error) return $('#em-err').textContent = error.message;
      toast('Revisa los dos correos para confirmar el cambio'); $('#em').value = ''; };
    $('#g-ln')?.addEventListener('click', async e => { const b = e.currentTarget; b.disabled = true;
      const { error } = await sb.auth.linkIdentity({ provider: 'google', options: { redirectTo: location.origin + '/preferencias?s=cuenta&enlazada=1', queryParams: { prompt: 'select_account' } } });
      if (error) { b.disabled = false; toast(/manual linking/i.test(error.message) ? 'El enlace con Google no está activado todavía en el servidor.' : error.message); } });
    $('#g-un')?.addEventListener('click', async () => { if (!confirm('¿Desvincular tu cuenta de Google? Seguirás entrando con tu correo y contraseña.')) return;
      const { error } = await sb.auth.unlinkIdentity(gid); if (error) return toast(error.message); toast('Cuenta de Google desvinculada'); preferences(C); });
    if (new URLSearchParams(location.search).get('enlazada') && gid) { history.replaceState({}, '', '/preferencias?s=cuenta'); toast('¡Listo! Ya puedes entrar con Google'); }
    $('#pw').onclick = async () => { let captchaToken; try { captchaToken = await (await import('/captcha.js?v=1')).once('reset'); } catch (e) { return toast(e.message); } const { error } = await sb.auth.resetPasswordForEmail(user.email, { redirectTo: location.origin + '/restablecer', captchaToken }); toast(error ? error.message : 'Te enviamos un enlace a tu correo para cambiarla'); };
    $('#so').onclick = async () => { if (!confirm('¿Cerrar sesión en todos los demás dispositivos?')) return; const { error } = await sb.auth.signOut({ scope: 'others' }); toast(error ? error.message : 'Listo: las demás sesiones se cerraron'); };
    return;
  }

  const D = { bio: P.bio || '', kanji: P.seal_kanji || '', accent: P.accent || '#f2c230', banner: P.banner_url, links: (P.links || []).map(l => ({ on: true, ...l })),
    sec: Object.fromEntries(SECS.map(([k, , d]) => [k, P.profile_sections?.[k] ?? d])), genres: selectedGenres(P.profile_sections?.favorite_genres), pub: !!P.public_activity, favs: [] };
  if (P.favorites?.length) { const { data } = await sb.from('series').select('id,title,slug,cover_path,cover_thumb_path,theme').in('id', P.favorites); D.favs = P.favorites.map(id => (data || []).find(s => s.id === id)).filter(Boolean); }
  // La navegación dentro del SPA no dispara beforeunload. Mantener un borrador
  // local por usuario evita perder bio, enlaces y favoritas si cambia la ruta.
  const draftKey = 'obi-profile-draft:user:' + user.id;
  let dirty = false, recovered = false, editVersion = 0, saveInFlight = false;
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (saved?.version === 1 && saved.data && typeof saved.data === 'object') {
      const d = saved.data;
      if (typeof d.bio === 'string') D.bio = d.bio.slice(0, 280);
      if (typeof d.kanji === 'string') D.kanji = d.kanji.slice(0, 2);
      if (SWATCH.includes(d.accent)) D.accent = d.accent;
      if (typeof d.banner === 'string' || d.banner === null) D.banner = d.banner;
      if (Array.isArray(d.links)) D.links = d.links.filter(l => l && ICON[l.k] && typeof l.url === 'string').slice(0, 12);
      if (Array.isArray(d.favs)) D.favs = d.favs.filter(x => x && typeof x.id === 'string' && typeof x.title === 'string').slice(0, 5);
      if (Array.isArray(d.genres)) D.genres = selectedGenres(d.genres);
      dirty = true; recovered = true;
    }
  } catch {}
  const mark = () => {
    editVersion++; dirty = true; recovered = false;
    try { localStorage.setItem(draftKey, JSON.stringify({ version: 1, data: D })); }
    catch { toast('No se pudo conservar el borrador en este dispositivo'); }
    const s = app.querySelector('#pf-st'); if (s) s.textContent = 'Borrador sin guardar';
    const live = app.querySelector('#pf-live-card'); if (live) live.innerHTML = liveHTML();
  };
  const favHTML = () => D.favs.map((s, i) => `<article class="pf-fav">
    <span class="lc-cv pf-fav-cover" aria-hidden="true" style="--c:${esc(s.theme?.color || '#2a2519')};${s.cover_thumb_path || s.cover_path ? `background-image:url('${esc(MED(s.cover_thumb_path || s.cover_path))}')` : ''}">${esc(s.title)}</span>
    <span class="pf-fav-title" title="${esc(s.title)}">${esc(s.title)}</span>
    <button type="button" class="pf-fav-remove" data-rf="${i}" aria-label="Quitar ${esc(s.title)} de favoritas">Quitar</button>
  </article>`).join('') || '<p class="pf-note">Aún no eliges favoritas.</p>';
  const linkRow = (l, i) => `<div class="pf-row ${l.on ? '' : 'off'}"><span class="ic">${svg(l.k, 18)}</span>
    <select data-lk="${i}" aria-label="Red">${GROUPS.map(([g, ks]) => `<optgroup label="${g}">${ks.map(k => `<option value="${k}" ${k === l.k ? 'selected' : ''}>${ICON[k][0]}</option>`).join('')}</optgroup>`).join('')}</select>
    <input data-lu="${i}" value="${esc(l.url || '')}" placeholder="${ICON[l.k][2]}" inputmode="url" aria-label="Enlace de ${ICON[l.k][0]}">
    <button type="button" class="pf-tg" data-lo="${i}" aria-pressed="${l.on}" aria-label="Mostrar en el perfil"><i></i></button>
    <button type="button" class="pf-x" data-lx="${i}" aria-label="Quitar enlace">×</button></div>`;

  // Vista previa de cliente: refleja solo los datos del borrador.
  const liveHTML = () => {
    const favs = D.favs.slice(0, 5);
    const enabled = D.links.filter(l => l.on && ICON[l.k] && typeof l.url === 'string' && l.url.trim());
    const cover = s => "--c:" + esc(s.theme?.color || '#2a2519') + ";" +
      (s.cover_thumb_path || s.cover_path ? "background-image:url(&quot;" + esc(MED(s.cover_thumb_path || s.cover_path)) + "&quot;)" : "");
    const bg = D.banner
      ? "<div class='lc-bg' style='background-image:url(&quot;" + esc(D.banner) + "&quot;)'></div>"
      : favs.length
        ? "<div class='lc-bg' style='--n:" + favs.length + "'>" +
          favs.map(s => "<span style='background-color:" + esc(s.theme?.color || '#2a2519') + ";" +
            (s.cover_thumb_path || s.cover_path ? "background-image:url(&quot;" + esc(MED(s.cover_thumb_path || s.cover_path)) + "&quot;)" : "") + "'></span>").join('') + "</div>"
        : "<div class='lc-bg' style='opacity:.35'></div>";
    const avatar = P.avatar_url ? "<img src='" + esc(P.avatar_url) + "' alt=''>" : esc((P.username || '?')[0].toUpperCase());
    const stamp = sealMarkup(D.kanji, esc);
    const genres = D.genres.length ? "<section class='lc-sec lc-genres'><h2>Géneros favoritos</h2><div class='lc-genre-chips'>" +
      D.genres.map(g => "<span class='lc-genre-chip'>" + esc(g) + "</span>").join('') + "</div></section>" : "";
    const sealInfo = SEAL_LOOKUP.get(D.kanji);
    const badges = D.kanji ? "<section class='lc-sec lc-badges'><h2>Mi sello</h2><div class='lc-badges-grid'><article class='lc-badge-card'><span class='lc-badge-glyph'>" + esc(D.kanji) +
      "</span><div class='lc-badge-info'><strong>" + esc(sealInfo?.name || 'Sello personalizado') + "</strong><p>" + esc(sealInfo?.description || 'Un símbolo propio para tu carnet de lector.') + "</p></div></article></div></section>" : "";
    const bio = "<section class='lc-sec lc-about'><h2>Sobre mí</h2>" +
      (D.bio ? "<p>" + esc(D.bio) + "</p>" : "<p class='pf-live-placeholder'>Tu biografía aparecerá aquí.</p>") +
      "</section>";
    const links = enabled.length ? "<div class='lc-ln'>" + enabled.map(l =>
      "<span class='pf-live-link'>" + svg(l.k, 14) + esc(ICON[l.k][0]) + "</span>").join('') + "</div>" : "";
    const covers = favs.length ? "<section class='lc-sec'><h2>Favoritas</h2><div class='pf-live-fav-list'>" +
      favs.map(s => "<span class='lc-cv' role='img' aria-label='" + esc(s.title) + "' style='" + cover(s) + "'>" + esc(s.title) + "</span>").join('') +
      "</div></section>" : "";
    return "<div class='lc lc-public' style='--ac:" + esc(D.accent) + "'><section class='lc-card lc-public-card'><div class='lc-cover-stage " + (D.banner ? "is-user-banner" : "is-collage") + "'>" + bg +
      "<div class='lc-sh'></div></div><div class='lc-in'><span class='lc-av' aria-hidden='true'>" + avatar +
      "</span><div class='lc-tx'><span class='k'>CARNET DE LECTOR · 読者証</span><div class='lc-name-row'><h1>" + esc(P.username || 'Lector') +
      "</h1>" + stamp + "</div>" + links + "</div></div></section>" + bio + genres + covers + badges + "</div>";
  };
  let sealQuery = '', sealCategory = 'Todas', sealCustom = !!D.kanji && !SEAL_LOOKUP.has(D.kanji);
  const normalizeSeal = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sealChoices = () => SEAL_CATALOG.filter(([k,n,m,d,c]) =>
    (sealCategory === 'Todas' || c === sealCategory) &&
    normalizeSeal([k,n,m,d].join(' ')).includes(normalizeSeal(sealQuery.trim()))
  ).map(([k,n,m]) => `<button type="button" class="pf-seal-choice" data-seal-pick="${esc(k)}" aria-pressed="${D.kanji === k}"><span class="kanji">${esc(k)}</span><span class="name">${esc(n)}</span><span class="meaning">${esc(m)}</span></button>`).join('') ||
    '<p class="pf-note">No encontramos sellos con esa búsqueda.</p>';
  const sealSelected = () => {
    const x = SEAL_LOOKUP.get(D.kanji);
    return x
      ? `<strong>${esc(x.name)} · ${esc(D.kanji)}</strong><span>${esc(x.description)}</span><small>Significado del kanji: ${esc(x.meaning)}. El apodo es una interpretación editorial.</small>`
      : D.kanji
        ? `<strong>Sello personalizado · ${esc(D.kanji)}</strong><span>Tu kanji personalizado aparecerá en el carnet sin apodo predeterminado.</span>`
        : '<span>Elige un sello para descubrir su apodo y descripción, o escribe tu propio kanji.</span>';
  };
  const draw = () => {
    app.innerHTML = shell(`<div class="pf-editor-layout"><div class="pf-editor-fields"><div style="display:grid;gap:6px"><h2>Perfil público</h2><p class="pf-note">Así te ven los demás en <a href="/perfil">/lector/${esc(P.username)}</a>.</p></div>
      <div class="pf-grid">
        <div class="pf-f">Foto<span class="pf-up"><span class="lc-av" style="--ac:${esc(D.accent)};width:60px;height:60px;font-size:26px">${P.avatar_url ? `<img src="${esc(P.avatar_url)}" alt="">` : esc((P.username || '?')[0].toUpperCase())}</span><label class="btn ghost sm">Cambiar foto<input type="file" id="fav" accept="image/jpeg,image/png,image/webp"></label></span></div>
        <div class="pf-f">Portada del carnet<span class="pf-up"><span class="pf-ban" style="${D.banner ? `background-image:url('${esc(D.banner)}')` : ''}"></span><label class="btn ghost sm">${D.banner ? 'Cambiar' : 'Subir'}<input type="file" id="fban" accept="image/jpeg,image/png,image/webp"></label>${D.banner ? '<button type="button" class="btn ghost sm" id="noban">Quitar</button>' : ''}</span><small class="pf-note" style="font-size:12px">Sin portada se usa un collage de tus favoritas.</small></div>
        <label class="pf-f" style="grid-column:1/-1">Bio<textarea id="bio" rows="3" maxlength="280">${esc(D.bio)}</textarea></label>
        <section class="pf-seal-panel" aria-label="Catálogo de sellos de lector">
          <div style="display:grid;gap:4px"><h3>Tu sello de lector</h3><p class="pf-note">Elige entre 32 sellos temáticos. Cada apodo es creativo; el significado del kanji se muestra por separado.</p></div>
          <div class="pf-seal-controls"><input type="search" id="seal-query" value="${esc(sealQuery)}" placeholder="Buscar apodo, kanji o significado…" aria-label="Buscar sello">
            <select id="seal-category" aria-label="Filtrar sellos por categoría">${['Todas','Lectura','Fantasía','Aventura','Personalidad'].map(c => `<option value="${c}" ${c === sealCategory ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="pf-seal-catalog" id="seal-results">${sealChoices()}</div>
          <div class="pf-seal-selected" id="seal-selected" role="status" aria-live="polite">${sealSelected()}</div>
          <div class="pf-seal-actions"><button type="button" class="btn ghost sm" id="seal-custom-toggle" aria-expanded="${sealCustom}" aria-controls="seal-custom-field">Usar mi propio kanji</button>
            <button type="button" class="btn ghost sm" id="seal-clear">Sin sello</button></div>
          <div class="pf-seal-custom" id="seal-custom-field" ${sealCustom ? '' : 'hidden'}><label>Kanji personalizado<input id="kj" class="pf-kj" maxlength="1" value="${esc(D.kanji)}" placeholder="月" aria-describedby="kjh" ${sealCustom ? '' : 'disabled'}></label>
          <small class="pf-note" id="kjh">Un solo kanji. Déjalo vacío para no mostrar sello.</small></div>
        </section>
        <section class="pf-genre-picker" aria-labelledby="pf-genre-title"><h3 id="pf-genre-title">Mis géneros favoritos</h3><p class="pf-note">Elige hasta tres géneros que te representan. Serán visibles en tu carnet cuando tu perfil sea accesible.</p>
          <p class="pf-genre-count" id="pf-genre-count" role="status" aria-live="polite">${D.genres.length} de 3 seleccionados</p>
          <div class="pf-genre-options" role="group" aria-label="Elegir géneros">${GENRE_CATALOG.map(g => `<button type="button" class="pf-genre-option" data-genre="${esc(g)}" aria-pressed="${D.genres.includes(g)}">${esc(g)}</button>`).join('')}</div>
        </section>
        <div class="pf-f">Color de acento<div class="pf-sw">${SWATCH.map(c => `<button type="button" data-ac="${c}" class="${c === D.accent ? 'on' : ''}" style="--swatch:${c}" aria-label="Color ${c}" aria-pressed="${c === D.accent}"></button>`).join('')}</div></div>
      </div>
      <div style="display:grid;gap:10px"><h3>Favoritas <small class="pf-note">(${D.favs.length}/5)</small></h3><div class="pf-favs">${favHTML()}</div>
        ${D.favs.length < 5 ? '<input class="pf-q" id="fq" placeholder="Busca una obra para añadirla…" autocomplete="off" style="max-width:420px"><div class="pf-res" id="fr"></div>' : ''}</div>
      <div style="display:grid;gap:10px"><h3>Enlaces</h3>${D.links.map(linkRow).join('')}
        ${D.links.length < 12 ? '<button type="button" class="btn ghost sm" id="addl" style="justify-self:start">+ Añadir enlace</button>' : ''}</div>
      <p class="pf-note">Qué secciones se muestran y quién ve tu carnet se elige en <a href="/preferencias?s=privacidad">Privacidad</a>.</p>
      <div class="pf-save"><span class="mono" id="pf-st" role="status" aria-live="polite">${dirty ? (recovered ? 'Borrador recuperado: revisa y guarda' : 'Borrador sin guardar') : ''}</span><a class="btn ghost" href="/perfil">Ver mi perfil</a><button class="btn" id="save">Guardar cambios</button></div></div>
      <aside class="pf-editor-preview" aria-label="Vista previa del carnet">
        <div class="pf-editor-preview-head"><h3>Vista previa del carnet</h3><p class="pf-note pf-editor-preview-note">Se actualiza mientras editas. Es una simulación, no un perfil publicado.</p></div>
        <div id="pf-live-card" class="pf-live-card">${liveHTML()}</div>
        <p class="pf-note pf-editor-preview-note">Los cambios del carnet se publican al guardar. La foto de perfil se guarda al subirla.</p>
      </aside></div>`);
    const $ = s => app.querySelector(s), $$ = s => app.querySelectorAll(s);
    $('#bio').oninput = e => { D.bio = e.target.value; mark(); };
    const updateSealPanel = () => {
      const choices = $('#seal-results'); if (choices) choices.innerHTML = sealChoices();
      const info = $('#seal-selected'); if (info) info.innerHTML = sealSelected();
      app.querySelectorAll('[data-seal-pick]').forEach(b => b.onclick = () => {
        D.kanji = b.dataset.sealPick; sealCustom = false; mark(); draw();
        app.querySelector('[data-seal-pick="' + D.kanji + '"]')?.focus({ preventScroll: true });
      });
    };
    $('#seal-query').oninput = e => { sealQuery = e.target.value; updateSealPanel(); };
    $('#seal-category').onchange = e => { sealCategory = e.target.value; updateSealPanel(); };
    $('#seal-custom-toggle').onclick = () => {
      sealCustom = !sealCustom;
      if (sealCustom && SEAL_LOOKUP.has(D.kanji)) { D.kanji = ''; mark(); }
      draw();
      (sealCustom ? $('#kj') : $('#seal-custom-toggle'))?.focus({ preventScroll: true });
    };
    $('#seal-clear').onclick = () => {
      if (D.kanji) { D.kanji = ''; mark(); }
      sealCustom = false; draw(); $('#seal-clear')?.focus({ preventScroll: true });
    };
    $('#kj').oninput = e => {
      D.kanji = e.target.value.trim(); mark();
      const info = $('#seal-selected'); if (info) info.innerHTML = sealSelected();
    };
    updateSealPanel();
    app.querySelectorAll('[data-genre]').forEach(b => b.onclick = () => {
      const genre = b.dataset.genre;
      if (!GENRE_CATALOG.includes(genre)) return;
      if (D.genres.includes(genre)) D.genres = D.genres.filter(g => g !== genre);
      else {
        if (D.genres.length >= 3) return toast('Puedes seleccionar un máximo de tres géneros');
        D.genres.push(genre);
      }
      app.querySelectorAll('[data-genre]').forEach(choice => choice.setAttribute('aria-pressed', String(D.genres.includes(choice.dataset.genre))));
      $('#pf-genre-count').textContent = D.genres.length + ' de 3 seleccionados';
      mark();
    });
    app.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => { D.accent = b.dataset.ac; mark(); draw(); });
    $$('[data-rf]').forEach(b => b.onclick = () => { D.favs.splice(+b.dataset.rf, 1); mark(); draw(); });
    $$('[data-lk]').forEach(s => s.onchange = () => { D.links[+s.dataset.lk].k = s.value; mark(); draw(); });
    $$('[data-lu]').forEach(i => i.oninput = () => { D.links[+i.dataset.lu].url = i.value.trim(); mark(); });
    $$('[data-lo]').forEach(b => b.onclick = () => { const l = D.links[+b.dataset.lo]; l.on = !l.on; mark(); draw(); });
    $$('[data-lx]').forEach(b => b.onclick = () => { D.links.splice(+b.dataset.lx, 1); mark(); draw(); });
    $('#addl')?.addEventListener('click', () => { const used = new Set(D.links.map(l => l.k)); D.links.push({ k: Object.keys(ICON).find(k => !used.has(k)) || 'web', url: '', on: true }); mark(); draw(); app.querySelector(`[data-lk="${D.links.length - 1}"]`)?.focus(); });
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
      if (saveInFlight) return;
      if (D.kanji && !KANJI.test(D.kanji)) return toast('El sello debe ser un solo kanji');
      const links = []; for (const l of D.links) { if (!l.url) continue; let u = l.url; if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, ''); u = u.replace(/^http:/i, 'https:');
        if (!/^https:\/\/[^\s<>"]{3,200}$/.test(u)) return toast(`Revisa el enlace de ${ICON[l.k][0]}`); links.push({ k: l.k, url: u, on: !!l.on }); }
      saveInFlight = true; const submittedVersion = editVersion;
      b.disabled = true; b.textContent = 'Guardando…';
      let error;
      try {
        const response = await sb.from('profiles').update({ bio: D.bio.trim() || null, seal_kanji: D.kanji || null, accent: D.accent, banner_url: D.banner, links, favorites: D.favs.map(f => f.id), profile_sections: { ...P.profile_sections, ...D.sec, favorite_genres: selectedGenres(D.genres) } }).eq('id', user.id);
        error = response.error;
      } catch (cause) { error = cause; }
      saveInFlight = false; b.disabled = false; b.textContent = 'Guardar cambios';
      if (error) return toast(/links/.test(error.message) ? 'Revisa los enlaces' : /seal_kanji/.test(error.message) ? 'El sello debe ser un solo kanji' : error.message);
      // Una edición hecha durante la petición no se puede marcar como guardada.
      if (editVersion !== submittedVersion) {
        toast('Se guardaron los cambios anteriores; quedan cambios nuevos sin guardar');
        draw(); return;
      }
      D.links = links; P.profile_sections = { ...P.profile_sections, ...D.sec, favorite_genres: selectedGenres(D.genres) }; C.setProfile?.({ profile_sections: P.profile_sections }); dirty = false; recovered = false;
      try { localStorage.removeItem(draftKey); } catch {}
      toast('Perfil guardado'); reload?.(); draw(); };
  };
  draw();
  const leave = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  const cleanup = () => {
    removeEventListener('beforeunload', leave);
    document.removeEventListener('click', navigate, true);
    removeEventListener('popstate', onBack);
    if (app.__obiPrefsNavGuard === canLeave) app.__obiPrefsNavGuard = null;
    if (app.__obiPrefsDispose === cleanup) app.__obiPrefsDispose = null;
  };
  const canLeave = () => {
    if (dirty && !confirm('Tienes cambios sin guardar en tu perfil. El borrador se conservará para volver después. ¿Salir?')) return false;
    cleanup();
    return true;
  };
  const navigate = e => {
    const a = e.target.closest?.('a[href^="/"]');
    if (!a || a.target || a.getAttribute('href') === location.pathname + location.search) return;
    if (!canLeave()) { e.preventDefault(); e.stopImmediatePropagation(); }
  };
  const onBack = () => {
    // Atrás tampoco atraviesa el controlador de enlaces. El borrador se conserva.
    cleanup();
  };
  app.__obiPrefsNavGuard = canLeave;
  app.__obiPrefsDispose = cleanup;
  addEventListener('beforeunload', leave);
  document.addEventListener('click', navigate, true);
  addEventListener('popstate', onBack);
}

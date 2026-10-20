import { SEASONS, PARTS, ANIMS, INTENS, DENS, activeSeason, ornURL, motifURL, stripURL, CSS as ACSS } from './anim.js?v=8';
export { SEASONS, PARTS, ANIMS, INTENS, DENS, activeSeason };
// Página pública del equipo: diseño compartido entre el sitio y el editor de Preferencias (vista previa idéntica).
export const BGS = {
  oscuro: { l: 'Oscuro', bg: '#0d0c0a', sf: '#16140f', fg: '#f3ecd9', mu: '#a89f8a', ln: '#2f2a20' },
  claro: { l: 'Claro', bg: '#f7f3ea', sf: '#fffdf8', fg: '#1b1813', mu: '#6b6252', ln: '#ddd4c2' },
  sepia: { l: 'Sepia', bg: '#efe2c8', sf: '#f7ecd6', fg: '#3b2e1e', mu: '#76603f', ln: '#d6c39e' },
  propio: { l: 'Propio', bg: '#101820', sf: '#18232e', fg: '#eef3f7', mu: '#9fb0bf', ln: '#2a3846' }
};
export const TFONTS = {
  shippori: ['Shippori Mincho', "'Shippori Mincho B1',serif", 500],
  notoserif: ['Noto Serif JP', "'Noto Serif JP',serif", 600],
  zenkaku: ['Zen Kaku Gothic', "'Zen Kaku Gothic New',sans-serif", 700],
  klee: ['Klee One', "'Klee One',cursive", 600],
  literata: ['Literata', "Literata,serif", 500],
  plexsans: ['IBM Plex Sans', "'IBM Plex Sans',sans-serif", 700],
  zenold: ['Zen Old Mincho', "'Zen Old Mincho',serif", 700],
  hina: ['Hina Mincho', "'Hina Mincho',serif", 400],
  mplus: ['M PLUS Rounded', "'M PLUS Rounded 1c',sans-serif", 800],
  kosugi: ['Kosugi Maru', "'Kosugi Maru',sans-serif", 400],
  dela: ['Dela Gothic', "'Dela Gothic One',sans-serif", 400],
  yusei: ['Yusei Magic', "'Yusei Magic',sans-serif", 400],
  rocknroll: ['RocknRoll One', "'RocknRoll One',sans-serif", 400],
  reggae: ['Reggae One', "'Reggae One',cursive", 400],
  cormorant: ['Cormorant Garamond', "'Cormorant Garamond',serif", 700],
  spectral: ['Spectral', "Spectral,serif", 600]
};
export const TEMPLATES = { revista: ['Revista', 'Banner a lo ancho con el nombre encima'], clasica: ['Clásica', 'Banner, logo y cuadrícula de obras'], editorial: ['Editorial', 'Texto a la izquierda, imagen a la derecha y obras en lista'] };
export const COVERS = { portada: 'Portada', bolsillo: 'Libro de bolsillo', obi: 'Bolsillo con obi' };
const COVER_OLD = { recta: 'portada', redondeada: 'portada', libro: 'bolsillo' };
export const BUTTONS = { solido: 'Sólido', contorno: 'Contorno', pildora: 'Píldora' };
export const LOGOS = { cuadrado: 'Cuadrado', circulo: 'Círculo', hanko: 'Sello hanko' };
export const PATTERNS = { none: 'Sin patrón', seigaiha: 'Seigaiha · olas', asanoha: 'Asanoha · cáñamo', washi: 'Papel washi', shippo: 'Shippo · círculos', kikko: 'Kikkō · caparazón', ichimatsu: 'Ichimatsu · cuadros', sakura: 'Sakura · flores', uroko: 'Uroko · escamas', kagome: 'Kagome · cestería', hishi: 'Hishi · rombos', yagasuri: 'Yagasuri · flechas', tatewaku: 'Tatewaku · vapor', nami: 'Nami · ondas', same: 'Same · puntos', kanoko: 'Kanoko · moteado', shima: 'Shima · rayas' };
export const THEMES = {
  tinta: { l: 'Tinta', d: { template: 'revista', bg: 'oscuro', accent: '#f2c230', font: 'shippori', cover: 'bolsillo', button: 'solido', logo: 'cuadrado', pattern: 'none', patternOp: 8 } },
  sakura: { l: 'Sakura', d: { template: 'clasica', bg: 'claro', accent: '#d9668a', font: 'klee', cover: 'portada', button: 'pildora', logo: 'circulo', pattern: 'asanoha', patternOp: 10 } },
  biblioteca: { l: 'Biblioteca', d: { template: 'editorial', bg: 'sepia', accent: '#3f7a4f', font: 'literata', cover: 'obi', button: 'contorno', logo: 'cuadrado', pattern: 'washi', patternOp: 14 } },
  neon: { l: 'Neón Tokio', d: { template: 'revista', bg: 'oscuro', accent: '#ff3fa4', font: 'zenkaku', cover: 'portada', button: 'solido', logo: 'cuadrado', pattern: 'ichimatsu', patternOp: 6 } },
  washi: { l: 'Washi', d: { template: 'editorial', bg: 'claro', accent: '#c8102e', font: 'notoserif', cover: 'obi', button: 'contorno', logo: 'hanko', pattern: 'washi', patternOp: 16 } },
  noche: { l: 'Noche estrellada', d: { template: 'clasica', bg: 'oscuro', accent: '#b8c4d9', font: 'notoserif', cover: 'bolsillo', button: 'contorno', logo: 'circulo', pattern: 'shippo', patternOp: 7 } }
};
export const SECTIONS = { announce: 'Anuncio', next: 'Próximo lanzamiento', stats: 'Estadísticas', featured: 'Obras destacadas', works: 'Obras', members: 'Integrantes' };
const SEC_KEYS = Object.keys(SECTIONS);
export const DEFAULT = { theme: 'tinta', ...THEMES.tinta.d, motto: '' };
const pick = (v, o, d) => Object.prototype.hasOwnProperty.call(o, v) ? v : d;
export function normalize(x, teamColor){
  const s = x && typeof x === 'object' ? x : {}, base = { ...DEFAULT, accent: teamColor || DEFAULT.accent };
  return {
    theme: /^mine:\d+$/.test(s.theme || '') ? s.theme : pick(s.theme, { ...THEMES, custom: 1 }, base.theme), template: pick(s.template, TEMPLATES, base.template), bg: pick(s.bg, BGS, base.bg),
    accent: /^#[0-9a-f]{6}$/i.test(s.accent || '') ? s.accent.toLowerCase() : base.accent, font: pick(s.font, TFONTS, base.font),
    cover: pick(COVER_OLD[s.cover] || s.cover, COVERS, base.cover), button: pick(s.button, BUTTONS, base.button), logo: pick(s.logo, LOGOS, base.logo),
    pattern: pick(s.pattern, PATTERNS, base.pattern), patternOp: Math.max(0, Math.min(30, Math.round(+s.patternOp || 0))) || (s.patternOp === 0 ? 0 : base.patternOp),
    motto: String(s.motto || '').slice(0, 120),
    order: [...new Set([...(Array.isArray(s.order) ? s.order.filter(k => SEC_KEYS.includes(k)) : []), ...SEC_KEYS])],
    hidden: Array.isArray(s.hidden) ? s.hidden.filter(k => SEC_KEYS.includes(k)) : [],
    featured: Array.isArray(s.featured) ? s.featured.filter(x => typeof x === 'string' && /^[\w-]{1,80}$/.test(x)).slice(0, 3) : [],
    announce: { title: String(s.announce?.title || '').slice(0, 80), text: String(s.announce?.text || '').slice(0, 300), label: String(s.announce?.label || '').slice(0, 30), url: /^(https:\/\/|\/)[^\s"'<>]{0,400}$/.test(s.announce?.url || '') ? s.announce.url : '', until: /^\d{4}-\d{2}-\d{2}$/.test(s.announce?.until || '') ? s.announce.until : '' },
    anim: Object.fromEntries(Object.keys(ANIMS).map(k => [k, !!s.anim?.[k]])),
    intensity: pick(s.intensity, INTENS, 'sutil'),
    part: { type: pick(s.part?.type, PARTS, 'sakura'), mode: s.part?.mode === 'custom' ? 'custom' : 'accent', color: /^#[0-9a-f]{6}$/i.test(s.part?.color || '') ? s.part.color.toLowerCase() : '#ffffff', density: pick(s.part?.density, DENS, 'normal'), where: s.part?.where === 'page' ? 'page' : 'banner' },
    seasons: { deco: s.seasons?.deco === 'min' ? 'min' : 'full', auto: Array.isArray(s.seasons?.auto) ? s.seasons.auto.filter(k => SEASONS[k]) : [], noOrn: Array.isArray(s.seasons?.noOrn) ? s.seasons.noOrn.filter(k => SEASONS[k]) : [], manual: SEASONS[s.seasons?.manual] ? s.seasons.manual : '', hemi: s.seasons?.hemi === 'sur' ? 'sur' : 'norte',
      greet: Object.fromEntries(Object.entries(s.seasons?.greet || {}).filter(([k, v]) => SEASONS[k] && typeof v === 'string' && v.trim()).map(([k, v]) => [k, v.slice(0, 140)])),
      orn: Object.fromEntries(Object.entries(s.seasons?.orn || {}).filter(([k, v]) => SEASONS[k] && typeof v === 'string' && /^[\w./%-]{1,300}$/.test(v))) },
    custom: ['bg', 'sf', 'fg'].reduce((o, k) => (o[k] = /^#[0-9a-f]{6}$/i.test(s.custom?.[k] || '') ? s.custom[k].toLowerCase() : BGS.propio[k], o), {})
  };
}
const GF = { notoserif: 'Noto+Serif+JP:wght@600', zenkaku: 'Zen+Kaku+Gothic+New:wght@700', zenold: 'Zen+Old+Mincho:wght@700', hina: 'Hina+Mincho', mplus: 'M+PLUS+Rounded+1c:wght@800', kosugi: 'Kosugi+Maru', dela: 'Dela+Gothic+One', yusei: 'Yusei+Magic', rocknroll: 'RocknRoll+One', reggae: 'Reggae+One', cormorant: 'Cormorant+Garamond:wght@700', spectral: 'Spectral:wght@600' };
const loaded = new Set();
// keys: lista de tipografías a cargar; sin argumento carga solo los estilos
export function ensureFonts(keys = []){
  if (!document.getElementById('tp2-css')) { const s = document.createElement('style'); s.id = 'tp2-css'; s.textContent = CSS + ACSS; document.head.appendChild(s); }
  const need = keys.filter(k => GF[k] && !loaded.has(k)); if (!need.length) return;
  need.forEach(k => loaded.add(k));
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + need.map(k => 'family=' + GF[k]).join('&') + '&display=swap'; document.head.appendChild(l);
}
export const ALL_FONTS = Object.keys(TFONTS);
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const WASHI = new Map();
function washiURL(c){
  if (WASHI.has(c)) return WASHI.get(c);
  if (typeof document === 'undefined') return null;
  try {
    const N = 160, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), im = x.createImageData(N, N);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const grid = 8, G = Array.from({ length: (N / grid + 1) ** 2 }, rnd), at = (i, j) => G[(j % (N / grid)) * (N / grid + 1) + (i % (N / grid))];
    for (let y = 0; y < N; y++) for (let X = 0; X < N; X++) { const gx = X / grid, gy = y / grid, i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, v = (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy, n = v * .7 + rnd() * .3, k = (y * N + X) * 4; im.data[k] = r; im.data[k + 1] = g; im.data[k + 2] = b; im.data[k + 3] = Math.max(0, n - .45) * 330; }
    x.putImageData(im, 0, 0); x.strokeStyle = c; x.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const x0 = rnd() * N, y0 = rnd() * N, l = 10 + rnd() * 28, a = rnd() * Math.PI; x.lineWidth = .4 + rnd() * .8; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 * 2 + Math.cos(a) * l) / 2 + (rnd() - .5) * 12, (y0 * 2 + Math.sin(a) * l) / 2 + (rnd() - .5) * 12, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke(); }
    const u = `url('${cv.toDataURL('image/png')}')`; WASHI.set(c, u); return u;
  } catch { return null; }
}
function washiSVG(c){
  const [r, g, b] = [1, 3, 5].map(i => (parseInt(c.slice(i, i + 2), 16) / 255).toFixed(3));
  let s = 7, rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280, fib = '';
  for (let i = 0; i < 26; i++) { const x = rnd() * 160, y = rnd() * 160, l = 10 + rnd() * 28, a = rnd() * Math.PI, bx = x + Math.cos(a) * l, by = y + Math.sin(a) * l, cx = (x + bx) / 2 + (rnd() - .5) * 12, cy = (y + by) / 2 + (rnd() - .5) * 12; fib += `<path d='M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}' stroke-width='${(.4 + rnd() * .8).toFixed(2)}'/>`; }
  return `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1.6 -.55'/></filter><rect width='160' height='160' filter='url(#n)'/><g fill='none' stroke='${c}' stroke-linecap='round' opacity='.9'>${fib}</g></svg>`;
}
function patternURL(p, c){
  const e = s => `url('data:image/svg+xml,${encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}')`, st = `fill='none' stroke='${c}' stroke-width='1.4'`;
  return {
    seigaiha: e(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><g ${st}>${[18, 13, 8].map(r => `<circle cx='0' cy='20' r='${r}'/><circle cx='40' cy='20' r='${r}'/><circle cx='20' cy='10' r='${r}'/>`).join('')}</g></svg>`),
    asanoha: e(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='62'><g ${st}><path d='M18 0v62M0 10.4l36 41.2M36 10.4L0 51.6M0 10.4L18 31 36 10.4M0 51.6L18 31l18 20.6M18 0L0 10.4M18 0l18 10.4M18 62L0 51.6M18 62l18-10.4'/></g></svg>`),
    washi: washiURL(c) || e(washiSVG(c)),
    shippo: e(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><g ${st}><circle cx='16' cy='0' r='16'/><circle cx='16' cy='32' r='16'/><circle cx='0' cy='16' r='16'/><circle cx='32' cy='16' r='16'/></g></svg>`),
    kikko: e(`<svg xmlns='http://www.w3.org/2000/svg' width='42' height='48'><g ${st}><path d='M21 4l14 8v16l-14 8-14-8V12zM21 36v12M7 28L0 32M35 28l7 4M7 12L0 8M35 12l7-4M21 4V0'/></g></svg>`),
    ichimatsu: e(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><rect width='14' height='14' fill='${c}'/><rect x='14' y='14' width='14' height='14' fill='${c}'/></svg>`),
    sakura: e(`<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'><g fill='${c}'>${[[18, 18, 1], [54, 52, .7]].map(([x, y, s]) => [0, 72, 144, 216, 288].map(r => `<ellipse cx='${x}' cy='${y - 6 * s}' rx='${3.4 * s}' ry='${6 * s}' transform='rotate(${r} ${x} ${y})'/>`).join('')).join('')}</g><circle cx='40' cy='12' r='1.6' fill='${c}'/><circle cx='10' cy='56' r='1.2' fill='${c}'/></svg>`),
    uroko: e(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='24'><path d='M0 24L7 12L14 24ZM14 24L21 12L28 24ZM7 12L14 0L21 12Z' fill='${c}'/></svg>`),
    kagome: e(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='41.57'><g ${st}><path d='M0 0L24 41.57M24 0L0 41.57M0 20.78H24'/></g></svg>`),
    hishi: e(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='16'><g ${st}><path d='M12 0L24 8L12 16L0 8Z'/><path d='M12 4L18 8L12 12L6 8Z'/></g></svg>`),
    yagasuri: e(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='40'><path d='M0 0L12 10V30L0 20Z' fill='${c}'/><path d='M24 0L12 10V30L24 20Z' fill='${c}' opacity='.45'/></svg>`),
    tatewaku: e(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='40'><g ${st}><path d='M7 0C16 10 16 30 7 40M21 0C12 10 12 30 21 40'/></g></svg>`),
    nami: e(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='14'><g ${st}><path d='M0 7Q10 0 20 7T40 7'/></g></svg>`),
    same: e(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><g fill='${c}'><circle cx='2.5' cy='2.5' r='1'/><circle cx='7.5' cy='7.5' r='1'/></g></svg>`),
    kanoko: e(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect x='4.5' y='4.5' width='7' height='7' fill='${c}' transform='rotate(45 8 8)'/><circle cx='8' cy='8' r='1.4' fill='#000' fill-opacity='.55'/></svg>`),
    shima: e(`<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><rect width='4' height='14' fill='${c}'/><rect x='7' width='1.5' height='14' fill='${c}'/></svg>`)
  }[p] || 'none';
}
export const palette = d => d.bg === 'propio' ? { ...d.custom, mu: mix(d.custom.fg, d.custom.bg, .38), ln: mix(d.custom.fg, d.custom.bg, .82) } : BGS[d.bg];
export const textContrast = d => { const B = palette(d); return contrast(B.fg, B.bg); };
// Se ajusta solo el color visual, sin modificar los datos del tema guardado.
const legibleText = (color, bg) => {
  if (contrast(color, bg) >= 4.5) return color;
  const target = contrast('#0d0c0a', bg) > contrast('#ffffff', bg) ? '#0d0c0a' : '#ffffff';
  let low = 0, high = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (contrast(mix(color, target, mid), bg) >= 4.5) high = mid;
    else low = mid;
  }
  return mix(color, target, high);
}
export function vars(d){
  const B = palette(d), F = TFONTS[d.font], a = d.accent;
  const aText = legibleText(a, B.bg);
  const fgText = legibleText(B.fg, B.bg), mutedText = legibleText(B.mu, B.bg);
  const onA = contrast('#0d0c0a', a) >= 4.5 ? '#0d0c0a' : contrast('#ffffff', a) >= 4.5 ? '#ffffff' : '#000000';
  return `--bg:${B.bg};--sf:${B.sf};--fg:${fgText};--mu:${mutedText};--ln:${B.ln};--ac:${a};--act:${aText};--on:${onA};--tf:${F[1]};--tw:${F[2]};--pat:${patternURL(d.pattern, a)};--pop:${d.patternOp / 100}`;
}

export async function loadTeamData(sb, slug){
  const { data: t } = await sb.from('teams').select('id,slug,name,bio,color,langs,settings,design,avatar_path,banner_path,status').eq('slug', slug).maybeSingle();
  if (!t) return null;
  const S = t.settings || {};
  const [{ data: works }, { data: mem }, { data: next }] = await Promise.all([
    sb.from('series').select('id,slug,title,short,synopsis,cover_path,translation_status,views,chapters(count)').eq('team_id', t.id).eq('published', true).is('archived_at', null).order('title'),
    S.show_members !== false ? sb.from('team_members').select('role,profiles(username),team_roles(name,color)').eq('team_id', t.id) : { data: [] },
    sb.from('schedule').select('at,label,series!inner(team_id,slug,title)').eq('series.team_id', t.id).gte('at', new Date().toISOString()).order('at').limit(1)]);
  return { t, works: works || [], mem: mem || [], next: next?.[0] || null };
}

// Diseño con el tema de temporada aplicado (si hay uno vigente). sim = clave para simular en la vista previa.
export function effective(design, color, sim){
  const d = normalize(design, color), k = sim === '' ? null : sim || activeSeason(d.seasons);
  if (!k || !SEASONS[k]) return { ...d, season: null };
  const s = SEASONS[k];
  const full = d.seasons.deco !== 'min';
  return { ...d, season: k, bg: s.bg, accent: s.ac, anim: { ...d.anim, particles: full }, part: { ...d.part, type: s.p, mode: 'accent' }, ...(full && s.pat ? { pattern: s.pat, patternOp: Math.max(8, d.pattern === 'none' ? 10 : d.patternOp) } : {}) };
}
const TLS = { active: 'En traducción', paused: 'En pausa', completed: 'Completa', dropped: 'Abandonada', licensed: 'Licenciada' };
export function render(D, design, h){
  const { esc, media } = h, d = effective(design, D.t.color, h.sim), t = D.t, S = t.settings || {}, on = k => S[k] !== false;
  const LG = { ja: 'japonés', ko: 'coreano', zh: 'chino', en: 'inglés' }, langs = (t.langs || []).map(l => LG[l]).filter(Boolean);
  const LK = [['website', 'Sitio web'], ['patreon', 'Patreon'], ['kofi', 'Ko-fi'], ['discord', 'Discord'], ['twitter', 'X / Twitter']].filter(([k]) => /^https:\/\//.test(S[k] || ''));
  const W = D.works, caps = W.reduce((a, w) => a + (w.chapters?.[0]?.count || 0), 0);
  const featList = (d.featured.length ? d.featured : [S.featured_works]).map(sl => W.find(w => w.slug === sl)).filter(Boolean);
  const ban = t.banner_path ? `background-image:url('${esc(media(t.banner_path))}')` : '';
  const logo = `<span class="tp2-logo">${t.avatar_path ? `<img src="${esc(media(t.avatar_path))}" alt="">` : `<b>${esc(t.name.slice(0, 2).toUpperCase())}</b>`}</span>`;
  const meta = [langs.length ? 'Traducimos del ' + langs.join(', ') : '', W.length + (W.length === 1 ? ' obra' : ' obras'), t.status && t.status !== 'Activo' ? t.status : ''].filter(Boolean).join(' · ');
  const SN0 = d.season && SEASONS[d.season], stamp0 = SN0 && d.seasons.deco !== 'min' ? `<span class="tp2-stamp"><i></i>${esc(SN0.l.toUpperCase())}</span>` : '';
  const name = `<h1 class="tp2-name">${esc(t.name)}</h1>${d.motto ? `<p class="tp2-motto">${esc(d.motto)}</p>` : ''}<p class="tp2-meta">${esc(meta)}</p>${stamp0}`;
  const links = `<div class="tp2-links"><span class="tp2-fslot"></span>${LK.map(([k, l]) => `<a class="tp2-btn" href="${esc(S[k])}" target="_blank" rel="noopener">${l} ↗</a>`).join('')}</div>`;
  const cover = w => `<span class="tp2-cv"${w.cover_path ? ` style="background-image:url('${esc(media(w.cover_path))}')"` : ''}>${w.cover_path ? '' : `<i>${esc(w.short || w.title)}</i>`}<span class="tp2-obi" aria-hidden="true"><b>${esc(w.short || w.title)}</b><small>${w.chapters?.[0]?.count || 0} cap.</small></span></span>`;
  const stats = on('show_stats') ? `<div class="tp2-stats">${[[W.length, 'obras'], [caps, 'capítulos'], [W.reduce((a, w) => a + (w.views || 0), 0), 'lecturas']].map(([v, k]) => `<span><b>${(+v).toLocaleString('es-MX')}</b><small>${k}</small></span>`).join('')}</div>` : '';
  const nx = D.next ? `<a class="tp2-next" data-at="${esc(D.next.at)}" href="/serie/${esc(D.next.series.slug)}"><small>PRÓXIMO LANZAMIENTO</small><b>${esc(D.next.series.title)}${D.next.label ? ' · ' + esc(D.next.label) : ''}</b><span>${new Date(D.next.at).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span></a>` : '';
  const featCard = f => `<a class="tp2-feat" href="/serie/${esc(f.slug)}">${cover(f)}<span><b>${esc(f.title)}</b><span class="tp2-syn">${esc(f.synopsis || '')}</span><span class="tp2-btn solid">Empezar a leer</span></span></a>`;
  const featH = featList.length ? `<section class="tp2-sec"><div class="tp2-sh"><h2>${featList.length > 1 ? 'Obras destacadas' : 'Obra destacada'}</h2>${featList.length > 1 ? `<span class="tp2-car-nav"><button type="button" data-car="-1" aria-label="Anterior">‹</button><button type="button" data-car="1" aria-label="Siguiente">›</button></span>` : ''}</div><div class="tp2-car" tabindex="0" aria-label="Obras destacadas">${featList.map(featCard).join('')}</div>${featList.length > 1 ? `<div class="tp2-dots">${featList.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</section>` : '';
  const today = new Date().toISOString().slice(0, 10), A = d.announce;
  const ann = (A.title || A.text) && (!A.until || A.until >= today) ? `<aside class="tp2-ann"><small>AVISO DEL EQUIPO</small>${A.title ? `<b>${esc(A.title)}</b>` : ''}${A.text ? `<p>${esc(A.text)}</p>` : ''}${A.url ? `<a class="tp2-btn" href="${esc(A.url)}"${/^https/.test(A.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(A.label || 'Ver más')}${/^https/.test(A.url) ? ' ↗' : ''}</a>` : ''}</aside>` : '';
  const grid = on('show_works') && W.length ? `<section class="tp2-sec"><h2>Obras</h2><div class="tp2-works">${W.map(w => `<a href="/serie/${esc(w.slug)}" class="tp2-w">${cover(w)}<b>${esc(w.short || w.title)}</b><small>${w.chapters?.[0]?.count || 0} cap. · ${TLS[w.translation_status] || TLS.active}</small></a>`).join('')}</div></section>` : '';
  const list = on('show_works') && W.length ? `<section class="tp2-sec"><h2>Obras</h2><div class="tp2-list">${W.map(w => `<a href="/serie/${esc(w.slug)}" class="tp2-li">${cover(w)}<span><b>${esc(w.title)}</b><small>${w.chapters?.[0]?.count || 0} capítulos · ${TLS[w.translation_status] || TLS.active}</small><span class="tp2-syn">${esc(w.synopsis || '')}</span></span></a>`).join('')}</div></section>` : '';
  const mem = on('show_members') && D.mem.length ? `<section class="tp2-sec"><h2>Integrantes</h2><div class="tp2-mem">${D.mem.map(m => `<span>${esc(m.profiles?.username || '—')}<small>${m.role === 'owner' ? 'Propietario' : esc(m.team_roles?.name || 'Integrante')}</small></span>`).join('')}</div></section>` : '';
  const bio = t.bio ? `<p class="tp2-bio">${esc(t.bio)}</p>` : '';
  const SEC = { announce: ann, next: nx, stats, featured: on('show_featured') ? featH : '', works: d.template === 'editorial' ? list : grid, members: mem };
  const SN = d.season && SEASONS[d.season], greet = SN && d.seasons.greet[d.season] ? `<div class="tp2-greet"><small>${esc(SN.l.toUpperCase())}</small><span>${esc(d.seasons.greet[d.season])}</span></div>` : '';
  const ornSrc = SN && d.seasons.deco !== 'min' && !d.seasons.noOrn.includes(d.season) ? (d.seasons.orn[d.season] ? media(d.seasons.orn[d.season]) : ornURL(SN.p, d.accent)) : '';
  const orn = ornSrc ? `<span class="tp2-orn${d.seasons.orn[d.season] ? '' : ' def'}" style="background-image:url('${esc(ornSrc)}')"></span>` : '';
  const full = SN && d.seasons.deco !== 'min', mot = full && SN.m ? motifURL(SN.m, d.accent, SN.c2) : '';
  const corners = mot ? `<span class="tp2-cor l" style="background-image:url('${mot}')"></span><span class="tp2-cor r" style="background-image:url('${motifURL(SN.m, SN.c2, d.accent)}')"></span>` : '';
  const stamp = full ? `<span class="tp2-stamp"><i></i>${esc(SN.l.toUpperCase())}</span>` : '';
  const flow = greet + d.order.filter(k => !d.hidden.includes(k)).map(k => SEC[k] || '').join('');
  let body;
  if (d.template === 'revista') body = `<header class="tp2-hero" style="${ban}">${orn}${corners}<div class="tp2-heroin">${logo}<div>${name}</div></div></header><div class="tp2-in">${bio}${links}${flow}</div>`;
  else if (d.template === 'editorial') body = `<div class="tp2-in"><header class="tp2-ed"><div class="tp2-edt">${logo}${name}${bio}${links}</div><div class="tp2-edi" style="${ban};position:relative">${orn}${corners}</div></header>${flow}</div>`;
  else body = `<header class="tp2-ban" style="${ban};position:relative">${orn}${corners}</header><div class="tp2-in"><div class="tp2-head">${logo}<div>${name}</div></div>${bio}${links}${flow}</div>`;
  const fbar = `<div class="tp2-fbar"><span>${esc(t.name)}</span><span class="tp2-fslot2"></span></div>`;
  return `<div class="tp2w"><div class="tp2" data-tpl="${d.template}" data-cover="${d.cover}" data-btn="${d.button}" data-logo="${d.logo}" data-pat="${d.pattern}"${full ? ` data-season="${d.season}"` : ''} style="${vars(d)}${full ? `;--mot:url('${mot}');--motstrip:url('${stripURL(SN.m, d.accent, SN.c2)}');--c2:${SN.c2}` : ''}">${h.top || ''}${body}${fbar}</div></div>`;
}

const CSS = `
.tp2w{container-type:inline-size}
.tp2{position:relative;isolation:isolate;background:var(--bg);color:var(--fg);font-family:'IBM Plex Sans',system-ui,sans-serif;min-height:100%;padding-bottom:56px}
.tp2::before{content:'';position:absolute;inset:0;z-index:-1;background-image:var(--pat);opacity:var(--pop);pointer-events:none}.tp2[data-pat=none]::before{display:none}
.tp2 a{color:inherit;text-decoration:none}.tp2 h2{font-family:var(--tf);font-weight:var(--tw);font-size:24px;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid var(--ac)}
.tp2-in{display:grid;gap:30px;max-width:1120px;margin:0 auto;padding:28px clamp(16px,4cqi,48px) 0}
.tp2-name{font-family:var(--tf);font-weight:var(--tw);font-size:clamp(30px,6cqi,60px);line-height:1.05;margin:0;text-wrap:balance}
.tp2-motto{margin:8px 0 0;font-family:var(--tf);font-size:clamp(15px,2cqi,19px);color:var(--act);text-wrap:pretty}.tp2-meta{margin:8px 0 0;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mu)}
.tp2-bio{margin:0;max-width:68ch;font-family:Literata,serif;font-size:17px;line-height:1.65;white-space:pre-line;text-wrap:pretty}
.tp2-logo{flex:none;width:clamp(84px,14cqi,128px);aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--sf);border:4px solid var(--bg);overflow:hidden}.tp2-logo img{width:100%;height:100%;padding:clamp(4px,1cqi,10px);object-fit:contain;display:block}.tp2-logo b{font-family:var(--tf);font-size:34px;color:var(--act)}
.tp2[data-logo=circulo] .tp2-logo{border-radius:50%}
.tp2[data-logo=hanko] .tp2-logo{border:3px double #c8321f;outline:2px solid #c8321f;outline-offset:3px;border-radius:10px;transform:rotate(-3deg);background:color-mix(in srgb,#c8321f 8%,var(--sf))}.tp2[data-logo=hanko] .tp2-logo b{color:#c8321f}
.tp2-links{display:flex;gap:8px;flex-wrap:wrap}
.tp2-btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;font-weight:600;font-size:14px;background:var(--ac);color:var(--on)!important;border:2px solid var(--ac)}
.tp2[data-btn=contorno] .tp2-btn{background:transparent;color:var(--act)!important}.tp2[data-btn=pildora] .tp2-btn{border-radius:999px}
.tp2-btn.solid{background:var(--ac)!important;color:var(--on)!important;justify-self:start}
.tp2-stats{display:grid;grid-template-columns:repeat(3,minmax(0,170px));gap:10px}.tp2-stats span{display:grid;gap:2px;padding:12px;background:var(--sf);border-top:3px solid var(--ac);text-align:center}.tp2-stats b{font-family:var(--tf);font-weight:var(--tw);font-size:26px}.tp2-stats small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mu)}
.tp2-next{display:grid;gap:4px;padding:16px 18px;background:var(--sf);border:1px solid var(--ln);border-left:5px solid var(--ac);max-width:560px}.tp2-next small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--act)}.tp2-next b{font-family:var(--tf);font-weight:var(--tw);font-size:20px}.tp2-next span{color:var(--mu);font-size:14px}
.tp2-cv{display:block;aspect-ratio:2/3;background:var(--sf) center/cover;border:1px solid var(--ln);position:relative;overflow:hidden}.tp2-cv i{position:absolute;inset:auto 8px 10px;font-style:normal;font-family:var(--tf);font-size:14px;color:var(--mu)}
.tp2-obi{display:none}
.tp2:is([data-cover=bolsillo],[data-cover=obi]) .tp2-cv i{left:calc(7% + 8px);z-index:2}.tp2[data-cover=obi] .tp2-cv i{inset:14px 10px auto calc(7% + 8px);font-size:15px;line-height:1.2}
.tp2[data-cover=portada] .tp2-cv{aspect-ratio:2/3;border:none;border-radius:4px;box-shadow:0 10px 24px -8px rgba(0,0,0,.55),0 0 0 1px color-mix(in srgb,var(--fg) 8%,transparent)}
.tp2[data-cover=bolsillo] .tp2-cv,.tp2[data-cover=obi] .tp2-cv{aspect-ratio:105/148;overflow:visible;border:none;border-radius:1px 3px 3px 1px;margin-right:6px;box-shadow:1px 0 0 #f4efe3,2px 0 0 #d9d2c1,3px 0 0 #f4efe3,4px 0 0 #cfc7b4,5px 0 0 #ece6d8,6px 1px 0 #bdb5a2,10px 12px 22px -6px rgba(0,0,0,.55)}
.tp2[data-cover=bolsillo] .tp2-cv::before,.tp2[data-cover=obi] .tp2-cv::before{content:'';position:absolute;inset:0 auto 0 0;width:7%;background:linear-gradient(90deg,rgba(0,0,0,.4),rgba(255,255,255,.18) 55%,rgba(0,0,0,.08));z-index:1}
.tp2[data-cover=bolsillo] .tp2-cv::after,.tp2[data-cover=obi] .tp2-cv::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.14),transparent 38%);pointer-events:none;z-index:1}
.tp2[data-cover=obi] .tp2-obi{display:grid;align-content:center;gap:1px;position:absolute;left:0;right:0;bottom:7%;height:24%;padding:0 8% 0 11%;background:var(--ac);color:var(--on);z-index:2;box-shadow:0 -1px 0 rgba(0,0,0,.15),0 2px 6px rgba(0,0,0,.25)}
.tp2-obi b{font-family:var(--tf);font-weight:var(--tw);font-size:clamp(10px,1.3cqi,14px);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tp2-obi small{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.08em;opacity:.8}
.tp2-feat .tp2-obi b{font-size:clamp(12px,1.8cqi,17px)}
.tp2-works{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:20px}.tp2-w{display:grid;gap:7px}.tp2-w b{font-size:15px}.tp2-w small,.tp2-li small{font-size:12px;color:var(--mu)}
.tp2-feat{display:grid;grid-template-columns:clamp(120px,22cqi,200px) minmax(0,1fr);gap:22px;padding:18px;background:var(--sf);border:1px solid var(--ln)}.tp2-feat>span{display:grid;gap:10px;align-content:start}.tp2-feat b{font-family:var(--tf);font-weight:var(--tw);font-size:clamp(22px,3cqi,30px)}
.tp2-syn{font-family:Literata,serif;font-size:15px;line-height:1.6;color:var(--fg);opacity:.85;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.tp2-list{display:grid;gap:0}.tp2-li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:18px;padding:16px 0;border-bottom:1px solid var(--ln)}.tp2-li>span{display:grid;gap:4px;align-content:start}.tp2-li b{font-family:var(--tf);font-weight:var(--tw);font-size:21px}
.tp2-mem{display:flex;gap:8px;flex-wrap:wrap}.tp2-mem span{display:grid;padding:8px 12px;background:var(--sf);border:1px solid var(--ln);font-weight:600;font-size:14px}.tp2-mem small{font-weight:400;font-size:12px;color:var(--act)}
.tp2-hero{min-height:clamp(260px,40cqi,440px);display:flex;align-items:flex-end;background:linear-gradient(135deg,var(--ac),var(--sf)) center/cover;position:relative}.tp2-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 30%,var(--bg))}
.tp2-heroin{position:relative;z-index:1;display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;width:100%;max-width:1120px;margin:0 auto;padding:0 clamp(16px,4cqi,48px) 8px}
.tp2-ban{height:clamp(140px,24cqi,260px);background:linear-gradient(135deg,var(--ac),var(--sf)) center/cover}.tp2-head{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap;margin-top:calc(-1 * clamp(70px,10cqi,96px))}
.tp2-ed{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:28px;align-items:stretch;padding-top:12px}.tp2-edt{display:grid;gap:16px;align-content:center}.tp2-edi{min-height:320px;background:linear-gradient(160deg,var(--ac),var(--sf)) center/cover;border:1px solid var(--ln)}
.tp2-sh{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;border-bottom:2px solid var(--ac);margin-bottom:14px}.tp2-sh h2{border:none;margin:0;padding-bottom:8px}
.tp2-car-nav{display:flex;gap:6px;padding-bottom:8px}.tp2-car-nav button{width:36px;height:36px;background:var(--sf);border:1px solid var(--ln);color:var(--fg);font-size:20px;cursor:pointer}.tp2-car-nav button:hover{border-color:var(--ac)}
.tp2-car{display:grid;grid-auto-flow:column;grid-auto-columns:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.tp2-car::-webkit-scrollbar{display:none}.tp2-car>*{scroll-snap-align:start}
.tp2-dots{display:flex;gap:6px;justify-content:center;margin-top:10px}.tp2-dots i{width:8px;height:8px;background:var(--ln)}.tp2-dots i.on{background:var(--ac)}
.tp2-ann{display:grid;gap:8px;padding:18px 20px;background:var(--sf);border:1px solid var(--ln);border-top:4px solid var(--ac);max-width:720px}.tp2-ann small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--act)}.tp2-ann b{font-family:var(--tf);font-weight:var(--tw);font-size:22px}.tp2-ann p{margin:0;font-size:15px;line-height:1.6;white-space:pre-line}.tp2-ann .tp2-btn{justify-self:start}
.tp2-follow{cursor:pointer;font:inherit}.tp2-follow.on{background:transparent!important;color:var(--act)!important}
.tp2-fbar{display:none}
/* piezas nuevas siguiendo el tema: radio según portadas, forma de botones, colores del fondo */
.tp2{--r:0px}.tp2[data-cover=portada]{--r:6px}.tp2[data-cover=bolsillo],.tp2[data-cover=obi]{--r:3px}
.tp2-ann,.tp2-next,.tp2-feat,.tp2-stats span,.tp2-mem span,.tp2-fbar,.tp2-draft{border-radius:var(--r)}
.tp2[data-cover=bolsillo] .tp2-ann,.tp2[data-cover=bolsillo] .tp2-next,.tp2[data-cover=obi] .tp2-ann,.tp2[data-cover=obi] .tp2-next{box-shadow:4px 6px 14px rgba(0,0,0,.18)}
.tp2-ann{background:linear-gradient(color-mix(in srgb,var(--ac) 9%,var(--sf)),var(--sf))}.tp2-ann b{color:var(--fg)}
.tp2-car-nav button{border-radius:var(--r);color:var(--act)}.tp2[data-btn=pildora] .tp2-car-nav button{border-radius:50%}.tp2[data-btn=solido] .tp2-car-nav button{background:var(--ac);color:var(--on);border-color:var(--ac)}
.tp2-dots i{border-radius:var(--r)}.tp2[data-btn=pildora] .tp2-dots i{border-radius:50%}.tp2-dots i.on{width:22px}
.tp2-follow.on{border-color:var(--ac)}.tp2[data-btn=solido] .tp2-follow.on,.tp2[data-btn=pildora] .tp2-follow.on{background:color-mix(in srgb,var(--ac) 14%,transparent)!important}
.tp2-top{position:absolute;top:14px;right:clamp(16px,4cqi,48px);z-index:5;display:flex;gap:8px}
.tp2-edit{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 14px;background:var(--sf);border:1px solid var(--ac);color:var(--act)!important;font-weight:600;font-size:13px;border-radius:var(--r);box-shadow:0 4px 14px rgba(0,0,0,.2)}.tp2[data-btn=pildora] .tp2-edit{border-radius:999px}.tp2-edit:hover{background:var(--ac);color:var(--on)!important}
.tp2-draft{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px clamp(16px,4cqi,48px) 0;padding:10px 14px;background:color-mix(in srgb,var(--ac) 16%,var(--sf));border:1px dashed var(--ac);color:var(--fg);font-size:13px}.tp2-draft b{color:var(--act)}
.tp2-fbar{background:color-mix(in srgb,var(--sf) 92%,transparent);backdrop-filter:blur(8px)}
@container (max-width:640px){.tp2-top{display:none}.tp2-fbar{display:flex;position:sticky;bottom:0;z-index:4;gap:10px;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--sf);border-top:1px solid var(--ln);margin-top:30px}.tp2-fbar span{font-size:13px;color:var(--mu)}.tp2-links .tp2-fslot{display:none}}
@container (max-width:640px){.tp2-ed{grid-template-columns:1fr}.tp2-edi{min-height:180px;order:-1}.tp2-feat{grid-template-columns:110px minmax(0,1fr);gap:14px;padding:12px}.tp2-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.tp2-works{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tp2-li{grid-template-columns:72px minmax(0,1fr)}.tp2 h2{font-size:21px}}
`;

export const followBtn = (on, n) => `<button type="button" class="tp2-btn tp2-follow${on ? ' on' : ''}" data-follow aria-pressed="${!!on}">${on ? '✓ Siguiendo' : '＋ Seguir al equipo'}${n ? ` · ${n.toLocaleString('es-MX')}` : ''}</button>`;
export function fillFollow(root, on, n){ root.querySelectorAll('.tp2-fslot,.tp2-fslot2').forEach(s => { s.innerHTML = followBtn(on, n); }); }
// carrusel de destacadas (manual)
export function bind(root){
  const car = root.querySelector('.tp2-car'); if (!car) return;
  const dots = [...root.querySelectorAll('.tp2-dots i')], idx = () => Math.round(car.scrollLeft / car.clientWidth);
  root.querySelectorAll('[data-car]').forEach(b => b.onclick = e => { e.preventDefault(); const n = car.children.length, i = (idx() + +b.dataset.car + n) % n; car.scrollTo({ left: i * car.clientWidth, behavior: 'smooth' }); });
  car.addEventListener('scroll', () => { const i = idx(); dots.forEach((d, j) => d.classList.toggle('on', i === j)); }, { passive: true });
}
export function exportTheme(name, design){ const { motto, theme, featured, announce, order, hidden, seasons, ...look } = design; return JSON.stringify({ obi_theme: 1, name, design: look }, null, 2); }
export function importTheme(text){ const j = JSON.parse(text); if (!j || j.obi_theme !== 1 || typeof j.design !== 'object') throw new Error('El archivo no es un tema del Obi'); return { name: String(j.name || 'Tema importado').slice(0, 40), design: j.design }; }

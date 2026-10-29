import { attachPublicCredits, creditsHTML, installCreditImageFallback } from './public-collaboration-credits.js?v=1';
import { publicSectionCounts } from './public-section-counts.js?v=1';
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
export const HERO_SIZES = { original: 'Original', compacto: 'Compacto', destacado: 'Destacado' };
export const HERO_ALIGN = { natural: 'Según plantilla', izquierda: 'Izquierda', centro: 'Centrado' };
export const FOLLOW_LABELS = { equipo: 'Seguir al equipo', grupo: 'Seguir grupo', publicaciones: 'Seguir publicaciones' };
export const STATS_LOCATION = { secciones: 'En su sección', cabecera: 'Debajo de la cabecera' };
export const LAYOUT_DEFAULT = { header: 'original', align: 'natural', showBio: true, showMeta: true, showLinks: true, nav: true, navWorks: true, navNext: true, navMembers: true, stats: 'secciones', followLabel: 'equipo' };
export const FEATURE_STYLES = { normal: 'Clásica', editorial: 'Editorial', compacto: 'Compacta' };
export const NEXT_STYLES = { normal: 'Clásico', destacado: 'Destacado con portada' };
export const UPDATE_STYLES = { lista: 'Lista', cuadricula: 'Cuadrícula', carrusel: 'Carrusel' };
export const UPDATE_KINDS = { ambos: 'Ambos', volumen: 'Volúmenes', capitulo: 'Capítulos' };
export const UPDATE_COUNTS = { 3: '3', 4: '4', 6: '6', 8: '8' };
export const EDITORIAL_DEFAULT = { featureStyle: 'normal', nextStyle: 'normal', recentStyle: 'cuadricula', recentKind: 'ambos', recentCount: 4 };
export const MEMBER_STYLES = { tarjetas: 'Tarjetas', lista: 'Lista', etiquetas: 'Compacto' };
export const MEMBER_COUNTS = { 4: '4', 6: '6', 8: '8', 12: '12' };
export const ANNOUNCE_STYLES = { clasico: 'Clásico', editorial: 'Editorial', compacto: 'Compacto' };
export const COMMUNITY_DEFAULT = {
  memberStyle: 'tarjetas', memberCount: 6, showRoles: true,
  announceStyle: 'editorial', showCta: true,
  ctaText: 'Gracias por apoyar nuestras traducciones'
};
export const SECTIONS = { recent: 'Novedades recientes', announce: 'Anuncio', next: 'Próximo lanzamiento', stats: 'Estadísticas', featured: 'Obras destacadas', works: 'Obras', members: 'Integrantes' };
const SEC_KEYS = Object.keys(SECTIONS);
export const COMPOSITION_COLUMNS = { una: 'Una columna', dos: 'Dos columnas', auto: 'Adaptable' };
export const SECTION_EMPHASIS = { normal: 'Normal', destacado: 'Protagonista', compacto: 'Compacto' };
export const COMPOSITION_PRESETS = {
  equilibrada: {
    label: 'Equilibrada', description: 'Identidad, obras y comunidad',
    order: ['featured', 'next', 'recent', 'works', 'announce', 'members', 'stats'],
    columns: 'una', emphasis: { featured: 'destacado', recent: 'normal' }
  },
  editorial: {
    label: 'Revista editorial', description: 'Obras y novedades protagonistas',
    order: ['featured', 'next', 'recent', 'works', 'stats', 'announce', 'members'],
    columns: 'dos', emphasis: { featured: 'destacado', recent: 'destacado', works: 'destacado' }
  },
  comunidad: {
    label: 'Comunidad', description: 'Equipo y anuncios visibles',
    order: ['announce', 'members', 'recent', 'featured', 'works', 'next', 'stats'],
    columns: 'dos', emphasis: { members: 'destacado', announce: 'destacado' }
  }
};
export const MOBILE_ORDER_MODE = { escritorio: 'Como escritorio', propio: 'Orden personalizado' };
export const MOBILE_HERO = { heredado: 'Como escritorio', compacto: 'Compacto', equilibrado: 'Equilibrado', amplio: 'Amplio' };
export const MOBILE_CARDS = { heredado: 'Como escritorio', compacto: 'Compactas', amplio: 'Cómodas' };
export const MOBILE_CATALOG = { heredado: 'Automáticas', una: 'Una columna', dos: 'Dos columnas' };
export const MOBILE_FOLLOW = { heredado: 'Actual', mostrar: 'Mostrar barra', ocultar: 'Ocultar barra' };
const sanitizeOrder = value => [...new Set([...(Array.isArray(value) ? value.filter(k => SEC_KEYS.includes(k)) : []), ...SEC_KEYS])];
const cleanMobile = value => ({
  orderMode: pick(value?.orderMode, MOBILE_ORDER_MODE, 'escritorio'),
  order: sanitizeOrder(value?.order),
  hero: pick(value?.hero, MOBILE_HERO, 'heredado'),
  cards: pick(value?.cards, MOBILE_CARDS, 'heredado'),
  catalog: pick(value?.catalog, MOBILE_CATALOG, 'heredado'),
  follow: pick(value?.follow, MOBILE_FOLLOW, 'heredado')
});
const cleanEmphasis = value => Object.fromEntries(SEC_KEYS.map(key => [key, pick(value?.[key], SECTION_EMPHASIS, 'normal')]));
const cleanComposition = obj => ({
  columns: pick(obj?.columns, COMPOSITION_COLUMNS, 'una'),
  emphasis: cleanEmphasis(obj?.emphasis)
});
export function compositionPreset(name){
  const preset = COMPOSITION_PRESETS[name];
  if (!preset) return null;
  return { order: [...preset.order], composition: cleanComposition(preset) };
}

export const DEFAULT = { theme: 'tinta', ...THEMES.tinta.d, motto: '' };
const pick = (v, o, d) => Object.prototype.hasOwnProperty.call(o, v) ? v : d;
export function normalize(x, teamColor){
  const s = x && typeof x === 'object' ? x : {}, base = { ...DEFAULT, accent: teamColor || DEFAULT.accent };
  const L = s.layout && typeof s.layout === 'object' && !Array.isArray(s.layout) ? s.layout : {};
  const E = s.editorial && typeof s.editorial === 'object' && !Array.isArray(s.editorial) ? s.editorial : {};
  const C = s.community && typeof s.community === 'object' && !Array.isArray(s.community) ? s.community : {};
  const comp = s.composition && typeof s.composition === 'object' && !Array.isArray(s.composition) ? s.composition : {};
  const mobile = s.mobile && typeof s.mobile === 'object' && !Array.isArray(s.mobile) ? s.mobile : {};
  return {
    theme: /^mine:\d+$/.test(s.theme || '') ? s.theme : pick(s.theme, { ...THEMES, custom: 1 }, base.theme), template: pick(s.template, TEMPLATES, base.template), bg: pick(s.bg, BGS, base.bg),
    accent: /^#[0-9a-f]{6}$/i.test(s.accent || '') ? s.accent.toLowerCase() : base.accent, font: pick(s.font, TFONTS, base.font),
    cover: pick(COVER_OLD[s.cover] || s.cover, COVERS, base.cover), button: pick(s.button, BUTTONS, base.button), logo: pick(s.logo, LOGOS, base.logo),
    pattern: pick(s.pattern, PATTERNS, base.pattern), patternOp: Math.max(0, Math.min(30, Math.round(+s.patternOp || 0))) || (s.patternOp === 0 ? 0 : base.patternOp),
    motto: String(s.motto || '').slice(0, 120),
    layout: {
      header: pick(L.header, HERO_SIZES, LAYOUT_DEFAULT.header),
      align: pick(L.align, HERO_ALIGN, LAYOUT_DEFAULT.align),
      showBio: L.showBio !== false, showMeta: L.showMeta !== false, showLinks: L.showLinks !== false,
      nav: L.nav !== false, navWorks: L.navWorks !== false, navNext: L.navNext !== false, navRecent: L.navRecent !== false, navMembers: L.navMembers !== false,
      stats: pick(L.stats, STATS_LOCATION, LAYOUT_DEFAULT.stats),
      followLabel: pick(L.followLabel, FOLLOW_LABELS, LAYOUT_DEFAULT.followLabel)
    },
    editorial: {
      featureStyle: pick(E.featureStyle, FEATURE_STYLES, EDITORIAL_DEFAULT.featureStyle),
      nextStyle: pick(E.nextStyle, NEXT_STYLES, EDITORIAL_DEFAULT.nextStyle),
      recentStyle: pick(E.recentStyle, UPDATE_STYLES, EDITORIAL_DEFAULT.recentStyle),
      recentKind: pick(E.recentKind, UPDATE_KINDS, EDITORIAL_DEFAULT.recentKind),
      recentCount: Number(pick(String(E.recentCount ?? ''), UPDATE_COUNTS, String(EDITORIAL_DEFAULT.recentCount)))
    },
    community: {
      memberStyle: pick(C.memberStyle, MEMBER_STYLES, COMMUNITY_DEFAULT.memberStyle),
      memberCount: Number(pick(String(C.memberCount ?? ''), MEMBER_COUNTS, String(COMMUNITY_DEFAULT.memberCount))),
      showRoles: C.showRoles !== false,
      announceStyle: pick(C.announceStyle, ANNOUNCE_STYLES, COMMUNITY_DEFAULT.announceStyle),
      showCta: C.showCta !== false,
      ctaText: String(C.ctaText ?? COMMUNITY_DEFAULT.ctaText).trim().slice(0, 120)
    },
    composition: cleanComposition(comp),
    mobile: cleanMobile(mobile),
    savedCompositions: Array.isArray(s.savedCompositions) ? s.savedCompositions.slice(0, 6).filter(x => x && typeof x === 'object' && /^[a-z0-9_-]{1,48}$/i.test(x.id || '') && typeof x.name === 'string' && x.name.trim()).map(x => ({
      id: x.id, name: x.name.trim().slice(0, 40),
      order: [...new Set([...(Array.isArray(x.order) ? x.order.filter(k => SEC_KEYS.includes(k)) : []), ...SEC_KEYS])],
      hidden: Array.isArray(x.hidden) ? [...new Set(x.hidden.filter(k => SEC_KEYS.includes(k)))] : [],
      composition: cleanComposition(x.composition),
      ...(x.mobile && typeof x.mobile === 'object' ? { mobile: cleanMobile(x.mobile) } : {})
    })) : [],
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
  const [{ data: rawWorks }, { data: mem }, { data: next }] = await Promise.all([
    sb.from('series').select('id,slug,title,short,synopsis,cover_path,translation_status,views,chapters(count)').eq('team_id', t.id).eq('published', true).is('archived_at', null).order('title'),
    S.show_members !== false ? sb.rpc('team_public_members', { p_team: t.id }) : { data: [] },
    sb.from('schedule').select('at,label,series!inner(team_id,slug,title)').eq('series.team_id', t.id).gte('at', new Date().toISOString()).order('at').limit(1)]);
  const works = await publicSectionCounts(sb, rawWorks || []);
  // Preservar el contrato del render sin exponer la tabla privada profiles.
  const members=(mem||[]).map(m=>({
    role:m.role,
    profiles:{ username:m.username },
    team_roles:m.role_name ? { name:m.role_name, color:m.role_color } : null
  }));
  // El feed solo consulta publicaciones de obras públicas; un error no bloquea el perfil.
  const recent = await import('./team-updates.js?v=1').then(m => m.loadTeamUpdates(sb, works || [])).catch(e => { console.warn('team updates', e); return []; });
  // Mostrar únicamente obras públicas con colaboración aceptada.
  let collaborations = [];
  try {
    const { data: accepted, error } = await sb.rpc('team_public_collaboration_series', { p_team_id: t.id });
    if (error) throw error;
    const ids = [...new Set((accepted || []).map(row => row.series_id).filter(Boolean))].slice(0, 200);
    if (ids.length) {
      const { data: shared, error: sharedError } = await sb.from('series')
        .select('id,team_id,slug,title,short,synopsis,cover_path,translation_status,views,chapters(count),teams(name,slug,avatar_path)')
        .in('id', ids).eq('published', true).is('archived_at', null).order('title');
      if (sharedError) throw sharedError;
      collaborations = await publicSectionCounts(sb, (shared || []).filter(w => !(works || []).some(o => o.id === w.id)));
      await attachPublicCredits(sb, collaborations);
    }
  } catch (e) { console.warn('Créditos públicos de colaboración no disponibles:', e?.message || e); }
  installCreditImageFallback();
  return { t, works: works || [], collaborations, mem: members, next: next?.[0] || null, recent };
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
  const { esc, media } = h, d = effective(design, D.t.color, h.sim), t = D.t, S = t.settings || {}, on = k => S[k] !== false, L = d.layout;
  const LG = { ja: 'japonés', ko: 'coreano', zh: 'chino', en: 'inglés' }, langs = (t.langs || []).map(l => LG[l]).filter(Boolean);
  const LK = [['website', 'Sitio web'], ['patreon', 'Patreon'], ['kofi', 'Ko-fi'], ['discord', 'Discord'], ['twitter', 'X / Twitter']].filter(([k]) => /^https:\/\//.test(S[k] || ''));
  const W = D.works, SHARED = D.collaborations || [], E = d.editorial, C = d.community, caps = [...W,...SHARED].reduce((a, w) => a + (w.chapters?.[0]?.count || 0), 0);
  const featList = (d.featured.length ? d.featured : [S.featured_works]).map(sl => W.find(w => w.slug === sl)).filter(Boolean);
  const ban = t.banner_path ? `background-image:url('${esc(media(t.banner_path))}')` : '';
  const logo = `<span class="tp2-logo">${t.avatar_path ? `<img src="${esc(media(t.avatar_path))}" alt="">` : `<b>${esc(t.name.slice(0, 2).toUpperCase())}</b>`}</span>`;
  const meta = [langs.length ? 'Traducimos del ' + langs.join(', ') : '', (W.length + SHARED.length) + (W.length + SHARED.length === 1 ? ' obra' : ' obras'), t.status && t.status !== 'Activo' ? t.status : ''].filter(Boolean).join(' · ');
  const SN0 = d.season && SEASONS[d.season], stamp0 = SN0 && d.seasons.deco !== 'min' ? `<span class="tp2-stamp"><i></i>${esc(SN0.l.toUpperCase())}</span>` : '';
  const name = `<h1 class="tp2-name">${esc(t.name)}</h1>${d.motto ? `<p class="tp2-motto">${esc(d.motto)}</p>` : ''}${L.showMeta ? `<p class="tp2-meta">${esc(meta)}</p>` : ''}${stamp0}`;
  const links = L.showLinks ? `<div class="tp2-links"><span class="tp2-fslot"></span>${LK.map(([k, l]) => `<a class="tp2-btn" href="${esc(S[k])}" target="_blank" rel="noopener">${l} ↗</a>`).join('')}</div>` : '<div class="tp2-links"><span class="tp2-fslot"></span></div>';
  const cover = w => `<span class="tp2-cv"${w.cover_path ? ` style="background-image:url('${esc(media(w.cover_path))}')"` : ''}>${w.cover_path ? '' : `<i>${esc(w.short || w.title)}</i>`}<span class="tp2-obi" aria-hidden="true"><b>${esc(w.short || w.title)}</b><small>${w.chapters?.[0]?.count || 0} cap.</small></span></span>`;
  const stats = on('show_stats') ? `<div class="tp2-stats">${[[(W.length + SHARED.length), 'obras'], [caps, 'capítulos']].map(([v, k]) => `<span><b>${(+v).toLocaleString('es-MX')}</b><small>${k}</small></span>`).join('')}<span><b data-follow-count>—</b><small>seguidores</small></span><span><b>${D.mem.length.toLocaleString('es-MX')}</b><small>integrantes públicos</small></span></div>` : '';
  const nextWork = D.next && W.find(w => w.slug === D.next.series?.slug);
  const nx = D.next ? `<a class="tp2-next${E.nextStyle === 'destacado' ? ' tp2-next-feature' : ''}" id="grupo-lanzamientos" data-at="${esc(D.next.at)}" href="/serie/${esc(D.next.series.slug)}">${E.nextStyle === 'destacado' && nextWork ? `<span class="tp2-next-cv">${cover(nextWork)}</span>` : ''}<span class="tp2-next-copy"><small>PRÓXIMO LANZAMIENTO</small><b>${esc(D.next.series.title)}${D.next.label ? ' · ' + esc(D.next.label) : ''}</b><span>${new Date(D.next.at).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span></span></a>` : '';
  const featCard = f => `<a class="tp2-feat" href="/serie/${esc(f.slug)}">${cover(f)}<span><b>${esc(f.title)}</b><span class="tp2-syn">${esc(f.synopsis || '')}</span><span class="tp2-btn solid">Ver ficha de la obra</span></span></a>`;
  const featH = featList.length ? `<section class="tp2-sec tp2-feature-block" id="grupo-destacadas"><div class="tp2-sh"><h2>${featList.length > 1 ? 'Obras destacadas' : 'Obra destacada'}</h2>${featList.length > 1 ? `<span class="tp2-car-nav"><button type="button" data-car="-1" aria-label="Anterior">‹</button><button type="button" data-car="1" aria-label="Siguiente">›</button></span>` : ''}</div><div class="tp2-car" tabindex="0" aria-label="Obras destacadas">${featList.map(featCard).join('')}</div>${featList.length > 1 ? `<div class="tp2-dots">${featList.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</section>` : '';
  const today = new Date().toISOString().slice(0, 10), A = d.announce;
  const ann = (A.title || A.text) && (!A.until || A.until >= today) ? `<aside class="tp2-ann tp2-ann-${C.announceStyle}" id="grupo-anuncios" aria-label="Aviso del equipo"><small>AVISO DEL EQUIPO</small>${A.title ? `<b>${esc(A.title)}</b>` : ''}${A.text ? `<p>${esc(A.text)}</p>` : ''}${A.until ? `<time datetime="${esc(A.until)}">Visible hasta el ${new Date(A.until + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</time>` : ''}${A.url ? `<a class="tp2-btn" href="${esc(A.url)}"${/^https/.test(A.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(A.label || 'Ver más')}${/^https/.test(A.url) ? ' ↗' : ''}</a>` : ''}</aside>` : '';
  const grid = on('show_works') && W.length ? `<section class="tp2-sec" id="grupo-obras"><h2>Obras</h2><div class="tp2-works">${W.map(w => `<a href="/serie/${esc(w.slug)}" class="tp2-w">${cover(w)}<b>${esc(w.short || w.title)}</b><small>${w.chapters?.[0]?.count || 0} cap. · ${TLS[w.translation_status] || TLS.active}</small></a>`).join('')}</div></section>` : '';
  const list = on('show_works') && W.length ? `<section class="tp2-sec" id="grupo-obras"><h2>Obras</h2><div class="tp2-list">${W.map(w => `<a href="/serie/${esc(w.slug)}" class="tp2-li">${cover(w)}<span><b>${esc(w.title)}</b><small>${w.chapters?.[0]?.count || 0} capítulos · ${TLS[w.translation_status] || TLS.active}</small><span class="tp2-syn">${esc(w.synopsis || '')}</span></span></a>`).join('')}</div></section>` : '';
  const sharedBlock = on('show_works') && SHARED.length ? `<section class="tp2-sec tp2-collab" id="grupo-colaboraciones"><h2>Obras en colaboración</h2><p class="tp2-syn">Obras en las que participa este equipo junto a otros traductores.</p><div class="tp2-works">${SHARED.map(w => `<a href="/serie/${esc(w.slug)}" class="tp2-w">${cover(w)}<b>${esc(w.short || w.title)}</b><small>${w.chapters?.[0]?.count || 0} cap. · ${TLS[w.translation_status] || TLS.active}</small>${creditsHTML(w, { esc, media, mode: 'carousel' })}</a>`).join('')}</div></section>` : '';
  const memberCard = m => {
    const username = String(m.profiles?.username || 'Integrante').trim();
    const role = m.role === 'owner' ? 'Propietario' : String(m.team_roles?.name || 'Integrante');
    const roleColor = /^#[a-f0-9]{6}$/i.test(m.team_roles?.color || '') ? m.team_roles.color : '';
    return `<article class="tp2-person"${roleColor ? ` style="--role-ac:${roleColor}"` : ''}><i class="tp2-person-avatar" aria-hidden="true">${esc(Array.from(username).slice(0, 2).join('').toUpperCase())}</i><div class="tp2-person-copy"><b>${esc(username)}</b>${C.showRoles ? `<small>${esc(role)}</small>` : ''}</div></article>`;
  };
  const memberList = (list, extraClass = '') => `<div class="tp2-mem${extraClass ? ' ' + extraClass : ''}" data-view="${C.memberStyle}">${list.map(memberCard).join('')}</div>`;
  const publicMembers = Array.isArray(D.mem) ? D.mem : [], visibleMembers = publicMembers.slice(0, C.memberCount), overflowMembers = publicMembers.slice(C.memberCount);
  const mem = on('show_members') && publicMembers.length ? `<section class="tp2-sec tp2-members-sec" id="grupo-integrantes"><div class="tp2-sh"><h2>Nuestro equipo</h2><span class="tp2-team-count">${publicMembers.length} integrantes públicos</span></div>${memberList(visibleMembers)}${overflowMembers.length ? `<details class="tp2-member-more"><summary>Ver ${overflowMembers.length} integrante${overflowMembers.length === 1 ? '' : 's'} más</summary>${memberList(overflowMembers, 'tp2-mem-extra')}</details>` : ''}</section>` : '';
  const feed = (Array.isArray(D.recent) ? D.recent : []).filter(item => E.recentKind === 'ambos' || item.kind === (E.recentKind === 'volumen' ? 'volume' : 'chapter')).slice(0, E.recentCount);
  const hasUpdatesCarousel = E.recentStyle === 'carrusel' && feed.length > 1;
  const updates = feed.length ? `<section class="tp2-sec tp2-updates-sec" id="grupo-novedades"><div class="tp2-sh"><h2>Novedades recientes</h2>
    <span class="tp2-updates-actions"><span class="tp2-updates-hint">${feed.length} publicaciones</span>${hasUpdatesCarousel ? `<span class="tp2-car-nav" role="group" aria-label="Navegar novedades"><button type="button" data-updates-scroll="-1" aria-controls="tp2-updates-carousel" aria-label="Novedades anteriores">‹</button><button type="button" data-updates-scroll="1" aria-controls="tp2-updates-carousel" aria-label="Siguientes novedades">›</button></span>` : ''}</span></div>
    <div class="tp2-updates" data-view="${E.recentStyle}"${E.recentStyle === 'carrusel' ? ' id="tp2-updates-carousel" role="region" aria-roledescription="carrusel" aria-label="Novedades recientes" tabindex="0"' : ''}>
      ${feed.map(item => `<a class="tp2-update" href="${esc(item.href)}"><span class="tp2-upcover">${item.cover_path ? `<img src="${esc(media(item.cover_path))}" alt="" loading="lazy" decoding="async">` : `<span class="tp2-upcover-fallback">${esc(item.series?.short || item.series?.title || 'Obra')}</span>`}</span><span class="tp2-upbody"><small class="tp2-upkind">${item.kind === 'volume' ? 'VOLUMEN ' + (+item.volume || '') : 'CAPÍTULO ' + (+item.chapter || '')}</small><b>${esc(item.series?.short || item.series?.title || 'Obra')}</b><span class="tp2-uptitle">${esc(item.title)}</span><time datetime="${esc(item.at)}">${new Date(item.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</time></span></a>`).join('')}</div></section>` : '';
  const bio = L.showBio && t.bio ? `<p class="tp2-bio">${esc(t.bio)}</p>` : '';
  const SEC = { recent: updates, announce: ann, next: nx, stats: L.stats === 'cabecera' ? '' : stats, featured: on('show_featured') ? featH : '', works: d.template === 'editorial' ? list : grid, members: mem };
  const SN = d.season && SEASONS[d.season], greet = SN && d.seasons.greet[d.season] ? `<div class="tp2-greet"><small>${esc(SN.l.toUpperCase())}</small><span>${esc(d.seasons.greet[d.season])}</span></div>` : '';
  const ornSrc = SN && d.seasons.deco !== 'min' && !d.seasons.noOrn.includes(d.season) ? (d.seasons.orn[d.season] ? media(d.seasons.orn[d.season]) : ornURL(SN.p, d.accent)) : '';
  const orn = ornSrc ? `<span class="tp2-orn${d.seasons.orn[d.season] ? '' : ' def'}" style="background-image:url('${esc(ornSrc)}')"></span>` : '';
  const full = SN && d.seasons.deco !== 'min', mot = full && SN.m ? motifURL(SN.m, d.accent, SN.c2) : '';
  const corners = mot ? `<span class="tp2-cor l" style="background-image:url('${mot}')"></span><span class="tp2-cor r" style="background-image:url('${motifURL(SN.m, SN.c2, d.accent)}')"></span>` : '';
  const stamp = full ? `<span class="tp2-stamp"><i></i>${esc(SN.l.toUpperCase())}</span>` : '';
  const visibleOrder = d.order.filter(k => !d.hidden.includes(k));
  const mobileSequence = (d.mobile.orderMode === 'propio' ? d.mobile.order : d.order).filter(k => !d.hidden.includes(k));
  const mobilePos = key => Math.max(0, mobileSequence.indexOf(key));
  const composedUnit = (key, html, joined = false) => html ? `<div class="tp2-unit" data-section="${key}" data-emphasis="${d.composition.emphasis[key]}"${key === 'recent' ? ' data-feed-style="' + E.recentStyle + '"' : ''}${joined ? ' data-paired="true"' : ''} style="--mobile-position:${mobilePos(key)}${joined ? ';--mobile-featured:' + mobilePos('featured') + ';--mobile-next:' + mobilePos('next') : ''}">${html}</div>` : '';
  const orderedContent = visibleOrder.reduce((out, key, i) => {
    if (key === 'next' && visibleOrder[i - 1] === 'featured' && E.featureStyle === 'editorial' && featH && nx) return out;
    if (key === 'featured' && visibleOrder[i + 1] === 'next' && E.featureStyle === 'editorial' && featH && nx) return out + composedUnit(key, `<div class="tp2-editorial-pair">${featH}${nx}</div>`, true);
    return out + composedUnit(key, SEC[key] || '');
  }, '');
  const composition = `<div class="tp2-composition" data-columns="${d.composition.columns}" data-mobile-order="${d.mobile.orderMode}">${orderedContent}</div>`;
  const closeText = C.ctaText || COMMUNITY_DEFAULT.ctaText;
  const closeCta = C.showCta ? `<aside class="tp2-community-cta" aria-label="Seguir al equipo"><div class="tp2-community-note"><small>COMUNIDAD DEL GRUPO</small><h2>${esc(closeText)}</h2><p>Sigue a ${esc(t.name)} para mantenerte al día de sus publicaciones.</p></div><span class="tp2-fslot3"></span></aside>` : '';
  const flow = greet + composition + sharedBlock + closeCta;
  const tabItems = [
    ['grupo-inicio', 'Inicio', true],
    ['grupo-obras', 'Obras', L.navWorks && on('show_works') && W.length > 0 && !d.hidden.includes('works')],
    ['grupo-lanzamientos', 'Lanzamientos', L.navNext && !!D.next && !d.hidden.includes('next')],
    ['grupo-novedades', 'Novedades', L.navRecent && !!updates && !d.hidden.includes('recent')],
    ['grupo-integrantes', 'Integrantes', L.navMembers && on('show_members') && D.mem.length > 0 && !d.hidden.includes('members')]
  ].filter(([, , enabled]) => enabled);
  const tabs = L.nav && tabItems.length > 1 ? `<nav class="tp2-tabs" aria-label="Secciones del grupo">${tabItems.map(([id, label], i) => `<a href="#${id}"${i === 0 ? ' class="on" aria-current="location"' : ''}>${label}</a>`).join('')}</nav>` : '';
  const summary = stats && L.stats === 'cabecera' && !d.hidden.includes('stats') ? `<div class="tp2-summary">${stats}</div>` : '';
  let body;
  if (d.template === 'revista') body = `<header class="tp2-hero" style="${ban}">${orn}${corners}<div class="tp2-heroin">${logo}<div>${name}</div></div></header><div class="tp2-in">${bio}${links}${tabs}${summary}${flow}</div>`;
  else if (d.template === 'editorial') body = `<div class="tp2-in"><header class="tp2-ed"><div class="tp2-edt">${logo}${name}${bio}${links}</div><div class="tp2-edi" style="${ban};position:relative">${orn}${corners}</div></header>${tabs}${summary}${flow}</div>`;
  else body = `<header class="tp2-ban" style="${ban};position:relative">${orn}${corners}</header><div class="tp2-in"><div class="tp2-head">${logo}<div>${name}</div></div>${bio}${links}${tabs}${summary}${flow}</div>`;
  const fbar = `<div class="tp2-fbar"><span>${esc(t.name)}</span><span class="tp2-fslot2"></span></div>`;
  return `<div class="tp2w"><div class="tp2" id="grupo-inicio" data-tpl="${d.template}" data-feature="${E.featureStyle}" data-next="${E.nextStyle}" data-hero="${L.header}" data-align="${L.align}" data-follow-label="${L.followLabel}" data-mobile-hero="${d.mobile.hero}" data-mobile-cards="${d.mobile.cards}" data-mobile-catalog="${d.mobile.catalog}" data-mobile-follow="${d.mobile.follow}" data-cover="${d.cover}" data-btn="${d.button}" data-logo="${d.logo}" data-pat="${d.pattern}"${full ? ` data-season="${d.season}"` : ''} style="${vars(d)}${full ? `;--mot:url('${mot}');--motstrip:url('${stripURL(SN.m, d.accent, SN.c2)}');--c2:${SN.c2}` : ''}">${h.top || ''}${body}${fbar}</div></div>`;
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
.tp2-btn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;font-weight:600;font-size:14px;background:var(--ac);color:var(--on)!important;border:2px solid var(--ac)}
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
.tp2-car-nav{display:flex;gap:6px;padding-bottom:8px} .tp2-car-nav button{width:44px;height:44px;background:var(--sf);border:1px solid var(--ln);color:var(--fg);font-size:20px;cursor:pointer}.tp2-car-nav button:hover{border-color:var(--ac)}
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

/* Fase 1: controles de cabecera y navegación, adaptados al tema activo. */
.tp2 :is(#grupo-obras,#grupo-lanzamientos,#grupo-integrantes,#grupo-novedades,#grupo-destacadas,#grupo-anuncios){scroll-margin-top:calc(var(--top-h,64px) + 88px)}
.tp2[id=grupo-inicio]{scroll-margin-top:var(--top-h,64px)}
.tp2-tabs{display:flex;gap:2px;align-items:stretch;overflow-x:auto;scrollbar-width:thin;scrollbar-color:var(--ln) transparent;position:sticky;top:var(--top-h,64px);z-index:7;border:1px solid var(--ln);background:var(--sf);box-shadow:0 4px 16px rgba(0,0,0,.12);max-width:100%}
.tp2-tabs a{display:inline-flex;align-items:center;justify-content:center;padding:9px clamp(12px,2cqi,22px);min-height:44px;min-width:max-content;font:600 13px/1.25 'IBM Plex Sans',sans-serif;border-bottom:3px solid transparent;color:var(--fg);white-space:nowrap}
.tp2-tabs a:hover,.tp2-tabs a.on{color:var(--act);border-bottom-color:var(--ac);background:color-mix(in srgb,var(--ac) 7%,var(--sf))}
.tp2-tabs a:focus-visible{outline:3px solid var(--act);outline-offset:-3px}
.tp2-summary{min-width:0}.tp2-stats{grid-template-columns:repeat(4,minmax(0,1fr));max-width:760px}
.tp2-stats span{min-width:0}.tp2-stats b{font-size:clamp(18px,2.5cqi,26px)}.tp2-stats small{overflow-wrap:anywhere}
.tp2[data-hero=compacto] .tp2-hero{min-height:clamp(190px,28cqi,300px)}
.tp2[data-hero=compacto] .tp2-ban{height:clamp(110px,18cqi,180px)}
.tp2[data-hero=compacto] .tp2-edi{min-height:230px}
.tp2[data-hero=destacado] .tp2-hero{min-height:clamp(340px,48cqi,500px)}
.tp2[data-hero=destacado] .tp2-ban{height:clamp(220px,34cqi,370px)}
.tp2[data-hero=destacado] .tp2-edi{min-height:400px}
.tp2[data-align=centro] .tp2-heroin,.tp2[data-align=centro] .tp2-head{justify-content:center;text-align:center}
.tp2[data-align=centro] .tp2-in>.tp2-bio,.tp2[data-align=centro] .tp2-in>.tp2-links{justify-self:center;text-align:center}
.tp2[data-align=centro] .tp2-edt{text-align:center;justify-items:center}
.tp2[data-align=centro] .tp2-links{justify-content:center}
.tp2[data-align=izquierda] .tp2-heroin,.tp2[data-align=izquierda] .tp2-head{justify-content:flex-start;text-align:left}
.tp2[data-align=izquierda] .tp2-edt{text-align:left;justify-items:start}
@container (max-width:640px){
 .tp2-tabs{gap:0;top:var(--top-h,56px);margin-inline:-8px}
 .tp2-tabs a{flex:1 0 auto;font-size:12px;padding-inline:13px}
 .tp2-stats{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none}
 .tp2-stats span{padding:9px 6px}
 .tp2[data-hero=destacado] .tp2-hero{min-height:300px}
 .tp2[data-hero=compacto] .tp2-hero{min-height:185px}
 .tp2[data-hero=compacto] .tp2-edi{min-height:150px}
}

/* Fase 2 — portada editorial y novedades, respeta variables del tema. */
.tp2-feature-block{min-width:0}
.tp2[data-feature=editorial] .tp2-feat{min-height:290px;grid-template-columns:minmax(132px,34%) 1fr;gap:clamp(12px,3cqi,28px);align-items:center;background:linear-gradient(110deg,color-mix(in srgb,var(--ac) 14%,var(--sf)),var(--sf));border-top:3px solid var(--ac)}
.tp2[data-feature=editorial] .tp2-feat .tp2-cv{max-width:240px}
.tp2[data-feature=editorial] .tp2-feat>span:last-child b{font-size:clamp(24px,3.6cqi,38px)}
.tp2[data-feature=compacto] .tp2-feat{grid-template-columns:92px minmax(0,1fr);padding:12px;gap:14px}
.tp2[data-feature=compacto] .tp2-feat .tp2-cv{width:92px}
.tp2[data-feature=compacto] .tp2-feat .tp2-syn{-webkit-line-clamp:2}
.tp2-next-feature{display:grid;grid-template-columns:minmax(90px,130px) 1fr;gap:16px;max-width:none;align-items:center;min-width:0;border-left:5px solid var(--ac);background:linear-gradient(115deg,color-mix(in srgb,var(--ac) 10%,var(--sf)),var(--sf))}
.tp2-next-feature .tp2-next-cv{width:100%;max-width:130px}
.tp2-next-copy{display:grid;gap:6px;min-width:0}
.tp2-next-copy b{overflow-wrap:anywhere}
.tp2-editorial-pair{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:18px;align-items:start;min-width:0}
.tp2-editorial-pair .tp2-next{max-width:none;height:100%;align-content:center}
.tp2-editorial-pair .tp2-feature-block{min-width:0}
.tp2-editorial-pair .tp2-next-feature{grid-template-columns:100px minmax(0,1fr);gap:12px}
.tp2-updates-hint{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mu);padding-bottom:7px}
.tp2-updates-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.tp2-updates-actions .tp2-updates-hint{padding-bottom:0}
.tp2-updates-actions .tp2-car-nav{padding-bottom:6px}
.tp2-updates{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,205px),1fr));gap:14px;min-width:0;max-width:100%}
.tp2-updates[data-view=cuadricula]{grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.tp2-update{display:grid;grid-template-columns:clamp(82px,10cqi,104px) minmax(0,1fr);gap:12px;min-width:0;padding:12px;background:var(--sf);border:1px solid var(--ln);border-radius:var(--r);transition:border-color .2s ease,transform .2s ease}
.tp2-update:hover{border-color:var(--ac);transform:translateY(-2px)}
.tp2-update:focus-visible{outline:3px solid var(--act);outline-offset:2px}
.tp2-upcover{width:100%;aspect-ratio:2/3;min-width:0;align-self:start;box-sizing:border-box;background:var(--bg);border:1px solid var(--ln);border-radius:var(--r);display:flex;align-items:center;justify-content:center;overflow:hidden}
.tp2-upcover img{display:block;width:100%;height:100%;object-fit:contain;object-position:center}
.tp2-upcover-fallback{font-family:var(--tf);font-size:11px;line-height:1.25;color:var(--mu);padding:6px}
.tp2-upcover-fallback{overflow-wrap:anywhere}
.tp2-upbody{display:grid;gap:5px;align-content:center;min-width:0}
.tp2-upbody b{font-family:var(--tf);font-weight:var(--tw);line-height:1.3;font-size:clamp(15px,1.6cqi,19px);overflow-wrap:break-word;hyphens:auto;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.tp2-upkind{font:600 10px/1.4 'IBM Plex Mono',monospace;color:var(--act);letter-spacing:.07em}
.tp2-uptitle{font-size:13px;line-height:1.35;color:var(--fg);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tp2-upbody time{font-size:11px;color:var(--mu)}
.tp2-updates[data-view=lista]{grid-template-columns:minmax(0,1fr);gap:0}
.tp2-updates[data-view=lista] .tp2-update{grid-template-columns:64px 1fr;padding:12px 8px;border-width:0 0 1px;border-radius:0;background:transparent}
.tp2-updates[data-view=lista] .tp2-upcover{width:64px}
.tp2-updates[data-view=carrusel]{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(280px,35%,430px);grid-template-columns:none;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:3px;scrollbar-width:thin;scrollbar-color:var(--ln) transparent;overscroll-behavior-x:contain;padding:5px 3px 10px}
.tp2-updates[data-view=carrusel]::-webkit-scrollbar{height:6px}
.tp2-updates[data-view=carrusel]::-webkit-scrollbar-thumb{background:var(--ln);border-radius:8px}
.tp2-updates[data-view=carrusel]::-webkit-scrollbar-track{background:transparent}
.tp2-updates[data-view=carrusel]:focus-visible{outline:2px solid var(--act);outline-offset:2px}
.tp2-updates[data-view=carrusel] .tp2-update{scroll-snap-align:start}
@container (max-width:760px){
 .tp2-editorial-pair{grid-template-columns:1fr}
 .tp2-updates{grid-template-columns:repeat(2,minmax(0,1fr))}
 .tp2-updates[data-view=carrusel]{grid-template-columns:none;grid-auto-columns:minmax(210px,70%)}
}
@container (max-width:420px){
 .tp2[data-feature=editorial] .tp2-feat{grid-template-columns:105px minmax(0,1fr);padding:12px;min-height:0}
 .tp2[data-feature=editorial] .tp2-feat>span:last-child b{font-size:21px}
 .tp2-next-feature{grid-template-columns:90px minmax(0,1fr);padding:12px;gap:10px}
 .tp2-updates{grid-template-columns:1fr}
 .tp2-updates[data-view=carrusel]{grid-template-columns:none;grid-auto-columns:84%}
}
@media(prefers-reduced-motion:reduce){.tp2-update{transition:none}.tp2-update:hover{transform:none}}

/* Fase 3: miembros públicos, anuncio configurable y cierre comunitario. */
.tp2-team-count{color:var(--mu);font-size:12px;font-family:'IBM Plex Mono',monospace;padding-bottom:8px}
.tp2-mem[data-view]{min-width:0;display:grid;gap:12px}
.tp2-mem[data-view=tarjetas]{grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr))}
.tp2-person{min-width:0;background:var(--sf);border:1px solid var(--ln);border-radius:var(--r);padding:15px;display:flex;gap:12px;align-items:center}
.tp2-person-avatar{font-style:normal;flex:none;display:grid;place-items:center;width:48px;height:48px;border:2px solid var(--role-ac,var(--ac));border-radius:50%;font-family:var(--tf);font-size:15px;color:var(--act);background:color-mix(in srgb,var(--role-ac,var(--ac)) 12%,var(--sf))}
.tp2-person-copy{min-width:0;display:grid;gap:3px}
.tp2-person-copy b{font-weight:650;font-size:14px;line-height:1.3;overflow-wrap:anywhere}
.tp2-person-copy small{font-size:12px;line-height:1.3;color:var(--mu)}
.tp2-mem[data-view=lista]{grid-template-columns:1fr}
.tp2-mem[data-view=lista] .tp2-person{padding:9px 14px}
.tp2-mem[data-view=lista] .tp2-person-avatar{width:40px;height:40px;font-size:13px}
.tp2-mem[data-view=etiquetas]{display:flex;flex-wrap:wrap;gap:8px}
.tp2-mem[data-view=etiquetas] .tp2-person{padding:8px 12px;gap:8px;max-width:100%;flex:0 1 auto}
.tp2-mem[data-view=etiquetas] .tp2-person-avatar{width:30px;height:30px;border-width:1px;font-size:11px}
.tp2-member-more{margin-top:14px}
.tp2-member-more>summary{cursor:pointer;display:list-item;width:max-content;max-width:100%;font-size:13px;color:var(--act);padding:10px 8px;min-height:44px}
.tp2-member-more>summary:focus-visible{outline:3px solid var(--act);outline-offset:2px}
.tp2-mem-extra{margin-top:12px}
.tp2-ann-editorial{max-width:100%;border-left:5px solid var(--ac);border-top:1px solid var(--ln);padding:clamp(18px,3cqi,30px);background:linear-gradient(120deg,color-mix(in srgb,var(--ac) 15%,var(--sf)),var(--sf))}
.tp2-ann-editorial>b{font-size:clamp(22px,3cqi,30px);max-width:56ch}
.tp2-ann-compacto{max-width:none;padding:12px 16px;gap:5px;border-top:0;border-left:3px solid var(--ac)}
.tp2-ann-compacto>b{font-size:17px}
.tp2-ann-compacto>p{font-size:13px}
.tp2-ann>time{font-size:11px;color:var(--mu)}
.tp2-community-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;padding:clamp(20px,3cqi,38px);background:linear-gradient(125deg,color-mix(in srgb,var(--ac) 17%,var(--sf)),var(--sf));border:1px solid var(--ln);border-top:4px solid var(--ac);border-radius:var(--r);min-width:0}
.tp2-community-note{min-width:0;display:grid;gap:7px}
.tp2-community-note small{font-size:11px;letter-spacing:.1em;font-family:'IBM Plex Mono',monospace;color:var(--act)}
.tp2-community-note h2{font-size:clamp(21px,3cqi,31px);border:0;padding:0;margin:0;text-wrap:balance;overflow-wrap:anywhere}
.tp2-community-note p{font-size:13px;line-height:1.5;color:var(--mu);margin:0}
.tp2-community-cta .tp2-fslot3{display:flex;justify-content:flex-end}
.tp2-community-cta .tp2-btn{min-height:44px;white-space:normal;text-align:center}
@container (max-width:650px){
 .tp2-community-cta{grid-template-columns:1fr;gap:14px}
 .tp2-community-cta .tp2-fslot3{justify-content:stretch}
 .tp2-community-cta .tp2-fslot3 .tp2-btn{width:100%;justify-content:center}
}
@container (max-width:420px){
 .tp2-mem[data-view=tarjetas]{grid-template-columns:1fr}
 .tp2-person{padding:12px}
 .tp2-team-count{font-size:11px}
 .tp2-ann-editorial{padding:16px}
}


/* Compositor Fase 4: el valor antiguo es una columna; las nuevas opciones respetan cada tema. */
.tp2-composition{display:grid;grid-template-columns:minmax(0,1fr);gap:30px;min-width:0}
.tp2-composition[data-columns=dos],.tp2-composition[data-columns=auto]{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px;row-gap:28px}
.tp2-composition[data-columns=auto] .tp2-unit[data-section=featured],.tp2-composition[data-columns=auto] .tp2-unit[data-section=works]{grid-column:1/-1}
/* Las tarjetas y el carrusel de novedades necesitan ancho de lectura, también en composiciones a dos columnas.
   El modo Lista conserva el diseño compacto elegido por el equipo. */
.tp2-composition .tp2-unit[data-section=recent][data-feed-style=cuadricula],.tp2-composition .tp2-unit[data-section=recent][data-feed-style=carrusel]{grid-column:1/-1}
.tp2-unit{min-width:0;align-self:start}
.tp2-composition .tp2-unit[data-emphasis=destacado]{grid-column:1/-1}
.tp2-composition .tp2-unit[data-emphasis=destacado]>.tp2-sec{border-top:3px solid var(--ac);padding:clamp(12px,2.3cqi,22px);background:color-mix(in srgb,var(--ac) 7%,var(--sf));border-radius:var(--r)}
.tp2-composition .tp2-unit[data-emphasis=destacado]>.tp2-next{max-width:none}
.tp2-composition .tp2-unit[data-emphasis=destacado]>.tp2-ann{max-width:none}
.tp2-composition .tp2-unit[data-emphasis=compacto]>.tp2-sec{padding:8px 0}
.tp2-composition .tp2-unit[data-emphasis=compacto]>.tp2-sec>h2,.tp2-composition .tp2-unit[data-emphasis=compacto] .tp2-sh h2{font-size:20px}
.tp2-composition .tp2-unit[data-emphasis=compacto] .tp2-works{grid-template-columns:repeat(auto-fit,minmax(min(100%,105px),1fr));gap:12px}
.tp2-composition .tp2-unit[data-emphasis=compacto] .tp2-feat{grid-template-columns:92px minmax(0,1fr);gap:12px;padding:12px}
.tp2-composition .tp2-unit[data-emphasis=compacto] .tp2-feat .tp2-cv{max-width:92px}
.tp2-composition .tp2-unit[data-emphasis=compacto] .tp2-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.tp2-composition .tp2-unit[data-emphasis=compacto]>.tp2-next,.tp2-composition .tp2-unit[data-emphasis=compacto]>.tp2-ann{padding:12px}
.tp2-composition .tp2-unit[data-paired=true]{grid-column:1/-1}
.tp2-composition .tp2-unit[data-paired=true] .tp2-editorial-pair{width:100%}
.tp2-composition .tp2-unit[data-emphasis=destacado]>.tp2-editorial-pair{border-top:3px solid var(--ac);padding:12px;background:color-mix(in srgb,var(--ac) 7%,var(--sf))}
.tp2-composition .tp2-unit[data-emphasis=compacto]>.tp2-editorial-pair{gap:10px}
@container (max-width:760px){
 .tp2-composition[data-columns=dos],.tp2-composition[data-columns=auto]{grid-template-columns:minmax(0,1fr);row-gap:24px}
 .tp2-composition .tp2-unit{grid-column:1/-1}
}


/* En móvil el nombre del equipo no debe tapar el texto o logotipo del banner.
   Separar la identidad del fondo respeta la imagen que subió el equipo. */
@container (max-width:640px){
 .tp2[data-tpl=revista] .tp2-hero{
  display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;
  min-height:clamp(225px,68cqi,320px);background-position:center top
 }
 .tp2[data-tpl=revista] .tp2-hero::after{
  background:linear-gradient(to bottom,transparent 30%,rgba(0,0,0,.3) 65%,var(--bg) 100%)
 }
 .tp2[data-tpl=revista] .tp2-heroin{
  display:grid;grid-template-columns:70px minmax(0,1fr);
  align-items:center;gap:12px;padding:12px 16px;
  background:color-mix(in srgb,var(--bg) 94%,transparent);
  border-top:2px solid var(--ac);max-width:100%;margin:0
 }
 .tp2[data-tpl=revista] .tp2-heroin .tp2-logo{width:70px;min-width:0}
 .tp2[data-tpl=revista] .tp2-heroin .tp2-name{
  font-size:clamp(22px,6.2cqi,34px);line-height:1.18;
  overflow-wrap:break-word;word-break:normal;min-width:0
 }
}

/* Fase 5: orden móvil independiente, tarjetas y cabecera sin alterar escritorio. */
@container (max-width:640px){
 /* El orden personalizado se aplica también al DOM: teclado y lectores de pantalla siguen la misma secuencia. */
 .tp2-composition[data-mobile-order=propio] .tp2-unit[data-paired=true] .tp2-editorial-pair{grid-template-columns:1fr}
 .tp2-composition .tp2-unit[data-section=next]>.tp2-next{max-width:none}
 .tp2[data-mobile-hero=compacto] .tp2-hero{min-height:172px}
 .tp2[data-mobile-hero=compacto] .tp2-ban{height:100px}
 .tp2[data-mobile-hero=compacto] .tp2-edi{min-height:130px}
 .tp2[data-mobile-hero=compacto] .tp2-in{gap:18px;padding-top:18px}
 .tp2[data-mobile-hero=compacto] .tp2-logo{width:74px}
 .tp2[data-mobile-hero=equilibrado] .tp2-hero{min-height:240px}
 .tp2[data-mobile-hero=equilibrado] .tp2-ban{height:152px}
 .tp2[data-mobile-hero=equilibrado] .tp2-edi{min-height:195px}
 .tp2[data-mobile-hero=amplio] .tp2-hero{min-height:340px}
 .tp2[data-mobile-hero=amplio] .tp2-ban{height:230px}
 .tp2[data-mobile-hero=amplio] .tp2-edi{min-height:285px}
 .tp2[data-mobile-cards=compacto] .tp2-feat{grid-template-columns:84px minmax(0,1fr);gap:10px;padding:10px}
 .tp2[data-mobile-cards=compacto] .tp2-feat .tp2-cv{max-width:84px}
 .tp2[data-mobile-cards=compacto] .tp2-feat b{font-size:18px}
 .tp2[data-mobile-cards=compacto] .tp2-update{grid-template-columns:64px minmax(0,1fr);gap:9px;padding:9px}
 .tp2[data-mobile-cards=compacto] .tp2-update .tp2-upcover{width:64px}
 .tp2[data-mobile-cards=compacto] .tp2-person{padding:9px}
 .tp2[data-mobile-cards=amplio] .tp2-feat{grid-template-columns: minmax(120px,38%) minmax(0,1fr);gap:18px;padding:18px}
 .tp2[data-mobile-cards=amplio] .tp2-update{padding:16px;gap:15px}
 .tp2[data-mobile-cards=amplio] .tp2-person{padding:18px}
 .tp2[data-mobile-catalog=una] .tp2-works{grid-template-columns:minmax(0,1fr)}
 .tp2[data-mobile-catalog=dos] .tp2-works{grid-template-columns:repeat(2,minmax(0,1fr))}
 .tp2[data-mobile-catalog=una] .tp2-w{grid-template-columns:80px minmax(0,1fr);align-items:center}
 .tp2[data-mobile-catalog=una] .tp2-w .tp2-cv{grid-row:span 2}
 .tp2[data-mobile-follow=ocultar] .tp2-fbar{display:none}
 .tp2[data-mobile-follow=mostrar] .tp2-fbar{display:flex}
 .tp2[data-mobile-follow=mostrar] .tp2-fbar .tp2-btn{min-height:44px}
 .tp2[data-mobile-follow=ocultar] .tp2-community-cta{margin-bottom:10px}
}
/* Fase 2: adaptar contenido real sin modificar el diseño elegido por el equipo. */
@container (max-width:640px){
 .tp2,.tp2-in,.tp2-composition,.tp2-composition .tp2-unit{min-width:0;max-width:100%}
 .tp2 :is(.tp2-head,.tp2-heroin,.tp2-edt,.tp2-next-copy,.tp2-upbody){min-width:0}
 .tp2 .tp2-name{overflow-wrap:break-word;word-break:normal;text-wrap:pretty}
 .tp2 .tp2-motto,.tp2 .tp2-meta,.tp2 .tp2-bio{overflow-wrap:break-word;word-break:normal;line-height:1.5}
 .tp2 .tp2-links{gap:8px;min-width:0}
 .tp2 .tp2-links .tp2-btn{box-sizing:border-box;max-width:100%;min-height:44px;overflow-wrap:break-word;justify-content:center}
 .tp2 .tp2-tabs{scroll-padding-inline:12px;overscroll-behavior-x:contain}
 .tp2 .tp2-tabs a{min-height:46px}
 .tp2 .tp2-works,.tp2 .tp2-list,.tp2 .tp2-updates{min-width:0;max-width:100%}
 .tp2 .tp2-w,.tp2 .tp2-li,.tp2 .tp2-update,.tp2 .tp2-feat{min-width:0;max-width:100%;box-sizing:border-box}
 .tp2 .tp2-w b,.tp2 .tp2-li b,.tp2 .tp2-feat b,.tp2 .tp2-update b{overflow-wrap:break-word;word-break:normal}
 .tp2[data-mobile-follow=mostrar] .tp2-fbar{padding-bottom:calc(10px + env(safe-area-inset-bottom));min-width:0}
 .tp2 .tp2-fbar span{min-width:0;overflow-wrap:break-word}
}
@container (max-width:390px){
 .tp2[data-tpl=revista] .tp2-heroin{grid-template-columns:60px minmax(0,1fr);gap:10px;padding:10px 12px}
 .tp2[data-tpl=revista] .tp2-heroin .tp2-logo{width:60px}
 .tp2[data-tpl=revista] .tp2-heroin .tp2-name{font-size:clamp(21px,6.1cqi,28px)}
 .tp2[data-mobile-catalog=dos] .tp2-works{gap:9px}
 .tp2 .tp2-links .tp2-btn{flex:1 1 120px;text-align:center}
 .tp2 .tp2-meta{font-size:11px}
}

`;

export const followBtn = (on, n, label = 'equipo') => `<button type="button" class="tp2-btn tp2-follow${on ? ' on' : ''}" data-follow aria-pressed="${!!on}">${on ? '✓ Siguiendo' : '＋ ' + FOLLOW_LABELS[label]}${n ? ` · ${n.toLocaleString('es-MX')}` : ''}</button>`;
// El ranking llega después de inicializar las animaciones del perfil.
// Debe insertarse antes del cierre comunitario y revelarse de inmediato:
// de otro modo una sección invisible conserva su altura y separa el footer.
export function insertTeamRanking(root, markup) {
  const content = root?.querySelector?.('.tp2-in');
  if (!content || !root.isConnected) return null;
  const existing = content.querySelector('.tp2-rk');
  if (existing) return existing;
  const community = content.querySelector('.tp2-community-cta');
  if (community) community.insertAdjacentHTML('beforebegin', markup);
  else content.insertAdjacentHTML('beforeend', markup);
  const ranking = content.querySelector('.tp2-rk');
  ranking?.classList.add('in');
  return ranking;
}

export function fillFollow(root, on, n){ root.querySelectorAll('.tp2-fslot,.tp2-fslot2,.tp2-fslot3').forEach(s => { s.innerHTML = followBtn(on, n, root.dataset.followLabel); }); root.querySelectorAll('[data-follow-count]').forEach(el => { el.textContent = (+n || 0).toLocaleString('es-MX'); }); }
// carrusel de destacadas (manual)
// Fase 6: el orden de lectura y de tabulación coincide con el orden visual en móvil.
// Al cambiar de anchura se restauran los mismos nodos, sin clonar datos ni duplicar IDs.
export function mobileSequence(items, getPosition){
  return items.map((item, index) => ({ item, index, position: getPosition(item) })).sort((a,b) => a.position - b.position || a.index - b.index).map(x => x.item);
}
export function bindMobileComposition(root){
  const container = root?.querySelector?.('.tp2-composition');
  if (!container) return;
  const originalUnits = Array.from(container.children);
  const pairedUnit = originalUnits.find(el => el.dataset?.paired === 'true');
  const editorialPair = pairedUnit?.querySelector('.tp2-editorial-pair');
  const featured = editorialPair?.querySelector('.tp2-feature-block');
  const upcoming = editorialPair?.querySelector('.tp2-next');
  let splitUnits = null, currentMode = '';
  const splitPair = () => {
    if (!pairedUnit || !editorialPair || !featured || !upcoming || splitUnits) return;
    const create = (section, content, position, emphasis) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tp2-unit';
      wrapper.dataset.section = section;
      wrapper.dataset.emphasis = emphasis;
      wrapper.style.setProperty('--mobile-position', position || '0');
      wrapper.append(content);
      return wrapper;
    };
    splitUnits = [
      create('featured', featured, pairedUnit.style.getPropertyValue('--mobile-featured'), pairedUnit.dataset.emphasis),
      create('next', upcoming, pairedUnit.style.getPropertyValue('--mobile-next'), 'normal')
    ];
  };
  const reconcile = () => {
    if (!root.isConnected) return;
    const width = root.closest('.tp2w')?.getBoundingClientRect().width || root.getBoundingClientRect().width;
    const mobile = width <= 640 && container.dataset.mobileOrder === 'propio';
    const mode = mobile ? 'mobile' : 'desktop';
    if (mode === currentMode) return;
    currentMode = mode;
    if (!mobile) {
      if (splitUnits) {
        editorialPair.append(featured, upcoming);
        splitUnits = null;
      }
      container.replaceChildren(...originalUnits);
      return;
    }
    splitPair();
    const units = originalUnits.flatMap(unit => unit === pairedUnit && splitUnits ? splitUnits : [unit]);
    const ordered = mobileSequence(units, unit => Number.parseInt(unit.style.getPropertyValue('--mobile-position'), 10) || 0);
    container.replaceChildren(...ordered);
  };
  reconcile();
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      if (!root.isConnected) { observer.disconnect(); return; }
      reconcile();
    });
    observer.observe(root.closest('.tp2w') || root);
  } else if (typeof window !== 'undefined') {
    const onResize = () => {
      if (!root.isConnected) return window.removeEventListener('resize', onResize);
      reconcile();
    };
    window.addEventListener('resize', onResize, { passive: true });
  }
}
export function bind(root){
  const tabs = [...root.querySelectorAll('.tp2-tabs a')];
  const activate = active => tabs.forEach(a => { const on = a === active; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  tabs.forEach(a => a.addEventListener('click', () => activate(a)));
  if (tabs.length && typeof IntersectionObserver !== 'undefined') {
    const targets = tabs.map(a => a.hash === '#grupo-inicio' ? root : root.querySelector(a.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      if (!root.isConnected) return observer.disconnect();
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) { const link = tabs.find(a => a.hash === '#' + visible[0].target.id); if (link) activate(link); }
    }, { rootMargin: '-15% 0px -65% 0px' });
    targets.forEach(el => observer.observe(el));
  }
  bindMobileComposition(root);
  const updatesCar = root.querySelector('.tp2-updates[data-view=carrusel]');
  if (updatesCar) {
    const scrollStep = () => Math.max(220, Math.round(updatesCar.clientWidth * .8));
    const scroll = direction => updatesCar.scrollBy({
      left: direction * scrollStep(),
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth'
    });
    root.querySelectorAll('[data-updates-scroll]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      scroll(Number(button.dataset.updatesScroll) || 0);
    }));
    updatesCar.addEventListener('keydown', event => {
      if (event.target !== updatesCar || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
      event.preventDefault();
      scroll(event.key === 'ArrowRight' ? 1 : -1);
    });
  }
  const car = root.querySelector('.tp2-car'); if (!car) return;
  const dots = [...root.querySelectorAll('.tp2-dots i')], idx = () => Math.round(car.scrollLeft / car.clientWidth);
  root.querySelectorAll('[data-car]').forEach(b => b.onclick = e => { e.preventDefault(); const n = car.children.length, i = (idx() + +b.dataset.car + n) % n; car.scrollTo({ left: i * car.clientWidth, behavior: 'smooth' }); });
  car.addEventListener('scroll', () => { const i = idx(); dots.forEach((d, j) => d.classList.toggle('on', i === j)); }, { passive: true });
}
export function exportTheme(name, design){ const { motto, theme, featured, announce, order, hidden, seasons, layout, editorial, community, composition, savedCompositions, mobile, ...look } = design; return JSON.stringify({ obi_theme: 1, name, design: look }, null, 2); }
export function importTheme(text){ const j = JSON.parse(text); if (!j || j.obi_theme !== 1 || typeof j.design !== 'object') throw new Error('El archivo no es un tema del Obi'); return { name: String(j.name || 'Tema importado').slice(0, 40), design: j.design }; }

// Temas de temporada de toda la plataforma (los configura el Bibliotecario). Las páginas de equipo con temporada propia mandan.
import { SEASONS, SGROUPS, activeSeason, motifURL, ornURL, particles } from './anim.js?v=8';
import { vars, normalize } from './teampage.js?v=12';
export { SEASONS, SGROUPS };
export const SUGGEST = {
  halloween: '¡Feliz Halloween! Hoy es buen día para una historia que dé escalofríos.', muertos: 'Día de Muertos: recordamos con cariño a quienes ya no están.',
  navidad: '¡Feliz Navidad! Que no falten buenas historias junto al árbol.', anonuevo: '¡Feliz Año Nuevo! Gracias por leer con nosotros un año más.',
  valentin: 'San Valentín: ¿tienes ya tu romance para esta semana?', pascua: '¡Felices Pascuas! Busca entre las novedades como quien busca huevos.',
  shogatsu: 'あけましておめでとう · ¡Feliz Shōgatsu!', setsubun: 'Setsubun: ¡fuera los demonios, adentro la buena suerte (y los capítulos)!',
  hinamatsuri: 'Hinamatsuri: un día para las heroínas de todas las historias.', hanami: 'Temporada de hanami: lee bajo los cerezos, aunque sea en pantalla.',
  tanabata: 'Tanabata: escribe tu deseo en un tanzaku… y en los comentarios.', obon: 'Obon: faroles encendidos para guiar a quienes vuelven a casa.',
  tsukimi: 'Tsukimi: noche de luna llena, té y una buena novela.', shichigosan: 'Shichi-Go-San: celebramos a los pequeños lectores.',
  seollal: '새해 복 많이 받으세요 · ¡Feliz Seollal!', chuseok: 'Chuseok: luna de cosecha y familia reunida.', dano: 'Dano: agua de iris y buena fortuna para el verano.',
  buda: 'Día de Buda: faroles de loto para iluminar el camino.', pepero: 'Pepero Day: comparte un palito… y una recomendación.',
  primavera: 'Llegó la primavera: historias nuevas para empezar.', verano: 'Verano: días largos para maratones de lectura.', otono: 'Otoño: hojas que caen y páginas que vuelan.', invierno: 'Invierno: mantita, bebida caliente y un volumen entero.'
};
const SOUTH = /^(America\/(Argentina|Santiago|Montevideo|Asuncion|Sao_Paulo|La_Paz|Lima|Punta_Arenas)|Australia\/|Pacific\/(Auckland|Fiji|Chatham)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka|Gaborone)|Antarctica\/)/;
export const hemiOf = tz => SOUTH.test(tz || '') ? 'sur' : 'norte';
export const INT = { sutil: 'Sutil', media: 'Media', alta: 'Alta' }, DEN = { pocas: 'Pocas', normal: 'Normal', muchas: 'Muchas' };
let CFG = null, loading = null, stops = [];
export function load(sb, force){ if (loading && !force) return loading; loading = sb.from('platform_settings').select('seasons').eq('id', 1).maybeSingle().then(({ data }) => (CFG = data?.seasons || {}), () => (CFG = {})); return loading; }
export const config = () => CFG || {};
export const isOff = () => { try { return localStorage.getItem('obi-season') === 'off'; } catch { return false; } };
export const setOff = v => { try { v ? localStorage.setItem('obi-season', 'off') : localStorage.removeItem('obi-season'); } catch {} dispatchEvent(new Event('obi-season')); };
const sim = () => { const q = new URLSearchParams(location.search).get('temporada'); return q && SEASONS[q] ? q : null; };
export function platformKey(date = new Date()){ return sim() || activeSeason({ auto: config().auto || [], hemi: hemiOf(Intl.DateTimeFormat().resolvedOptions().timeZone) }, date); }
export function clear(){ stops.splice(0).forEach(f => { try { f(); } catch {} }); }
const mk = (cls, parent, html = '') => { const e = document.createElement(cls.startsWith('<') ? 'div' : 'span'); e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); stops.push(() => e.remove()); return e; };
const css = () => { if (document.getElementById('obi-sea-css')) return; const s = document.createElement('style'); s.id = 'obi-sea-css'; s.textContent = CSS; document.head.appendChild(s); };
// kind: home | catalog | releases | series | team | reader. o.key fuerza una temporada (la del equipo en la ficha); o.greet su saludo.
export function apply(kind, o = {}){
  clear(); css();
  if (isOff() && !sim()) return;
  const k = o.key !== undefined ? o.key : platformKey(); if (!k || !SEASONS[k]) return;
  const s = SEASONS[k], C = config(), it = C.intensity || 'sutil', de = C.density || 'normal', esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const v = vars(normalize({ accent: s.ac, bg: 'oscuro', pattern: s.pat || 'none', patternOp: 8 }, s.ac));
  const act = (v.match(/--act:(#[0-9a-f]{6})/i) || [])[1] || s.ac, pat = (v.match(/--pat:(url\('[^']*'\)|none)/) || [])[1] || 'none';
  const mot = s.m ? motifURL(s.m, s.ac, s.c2) : '', mob = matchMedia('(max-width:700px)').matches, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H = document.documentElement; H.dataset.season = k; H.style.setProperty('--sea', act); stops.push(() => { delete H.dataset.season; H.style.removeProperty('--sea'); });
  if (kind === 'reader') {
    const bar = document.querySelector('.rd-bar'); if (!bar) return;
    if (mot) mk('obi-sea-rd', bar.querySelector('.rd-tools') || bar).innerHTML = `<i style="background-image:url('${mot}')"></i>${esc(s.l)}`;
    const pg = mk('obi-sea-pg', bar), i = document.createElement('i'); pg.appendChild(i);
    const up = () => { const h = document.documentElement.scrollHeight - innerHeight; i.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
    addEventListener('scroll', up, { passive: true }); up(); stops.push(() => removeEventListener('scroll', up));
    return;
  }
  const brand = document.querySelector('header.top .brand');
  if (brand && mot) { const st = mk('obi-sea-stamp', brand); st.title = s.l; st.style.backgroundImage = `url('${mot}')`; }
  if (kind !== 'team') {
    H.style.setProperty('--gold', act); stops.push(() => H.style.removeProperty('--gold'));
    if (pat !== 'none') { const p = mk('obi-sea-pat', document.body); p.style.backgroundImage = pat; }
  }
  const txt = o.greet !== undefined ? o.greet : (C.greet?.[k] ?? SUGGEST[k] ?? '');
  const app = document.getElementById('app');
  if (txt && app) { const g = document.createElement('div'); g.className = 'obi-sea-greet'; g.innerHTML = `<i style="background-image:url('${mot}')"></i><span><small>${esc(s.l.toUpperCase())}</small>${esc(txt)}</span><button type="button" aria-label="Ocultar temas de temporada" title="Ocultar temas de temporada">×</button>`; app.prepend(g); stops.push(() => g.remove()); g.querySelector('button').onclick = () => setOff(true); }
  if (kind === 'home' && mot) {
    const hero = document.getElementById('hero');
    if (hero) { const put = () => { if (hero.querySelector('.obi-sea-cor')) return; hero.insertAdjacentHTML('beforeend', `<span class="obi-sea-cor l" style="background-image:url('${mot}')"></span><span class="obi-sea-cor r" style="background-image:url('${motifURL(s.m, s.c2, s.ac)}')"></span><span class="obi-sea-orn" style="background-image:url('${ornURL(s.p, s.ac)}')"></span>`); };
      put(); const mo = new MutationObserver(put); mo.observe(hero, { childList: true }); stops.push(() => { mo.disconnect(); hero.querySelectorAll('.obi-sea-cor,.obi-sea-orn').forEach(e => e.remove()); }); }
  }
  if (!still) { const layer = mk('obi-sea-layer' + (kind === 'team' ? ' over' : ''), document.body); stops.push(particles(layer, { type: s.p, color: s.ac, density: de, where: 'page', intensity: it, mobile: mob })); }
}
const CSS = `
.obi-sea-layer{position:fixed;inset:0;pointer-events:none;z-index:-1}.obi-sea-layer.over{z-index:40;opacity:.6}.obi-sea-layer>canvas{position:absolute;inset:0;width:100%;height:100%}
.obi-sea-pat{position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.07;background-repeat:repeat}
.obi-sea-stamp{display:inline-block;width:26px;height:26px;margin-left:2px;background:center/contain no-repeat;transform:rotate(8deg);filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}
.obi-sea-greet{display:flex;gap:12px;align-items:center;margin:0 0 22px;padding:10px 12px 10px 14px;background:color-mix(in srgb,var(--sea) 14%,#16140f);border:1px solid var(--sea);font-family:'Shippori Mincho B1',serif;font-size:17px;line-height:1.35}
.obi-sea-greet i{width:34px;height:34px;flex:none;background:center/contain no-repeat}.obi-sea-greet span{flex:1;display:grid;gap:2px}.obi-sea-greet small{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--sea)}
.obi-sea-greet button{flex:none;width:32px;height:32px;background:none;border:1px solid #3d3628;color:#a89f8a;font-size:18px;cursor:pointer}.obi-sea-greet button:hover{border-color:var(--sea);color:var(--paper)}
.obi-sea-cor{position:absolute;top:0;width:clamp(48px,6vw,84px);aspect-ratio:1;background:center/contain no-repeat;pointer-events:none;z-index:0;opacity:.9;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}.obi-sea-cor.l{left:0;transform:translate(-28%,-28%) rotate(-10deg)}.obi-sea-cor.r{right:0;transform:translate(28%,-28%) rotate(12deg) scaleX(-1)}
html[data-season] #hero{overflow:visible}html[data-season] #hero>:not(.obi-sea-cor):not(.obi-sea-orn){position:relative;z-index:1}
.obi-sea-orn{position:absolute;left:0;right:0;bottom:0;height:clamp(34px,5vw,56px);background:center bottom/auto 100% repeat-x;pointer-events:none;z-index:0;opacity:.75}
.obi-sea-rd{display:inline-flex;align-items:center;gap:6px;padding:0 10px 0 4px;height:32px;border:1px solid var(--ln);font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mt,#a89f8a)}.obi-sea-rd i{width:22px;height:22px;background:center/contain no-repeat}
.obi-sea-pg{position:absolute;left:0;right:0;bottom:-1px;height:3px;pointer-events:none}.obi-sea-pg i{display:block;height:100%;background:var(--sea);transform-origin:left;transform:scaleX(0)}
.rd-bar{position:sticky}
@media(max-width:700px){.obi-sea-cor.r{display:none}.obi-sea-rd{font-size:0;padding:0 4px;gap:0}.obi-sea-greet{font-size:15px}}
`;

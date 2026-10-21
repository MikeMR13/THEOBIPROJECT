// Importaciones estáticas: el navegador descarga app, ui y reader a la vez (más modulepreload en index.html).
import { createClient } from '/supabase.js?v=1';
import { createReader } from '/reader.js?v=18';
import { createUI } from '/ui.js?v=45';
const { url, key } = window.OBI_CONFIG;
const ASSET = n => url + '/storage/v1/object/public/obi-app/' + n + '?v=' + (window.OBI_ASSET_V || '5');
export const sb = createClient(url, key, { auth: { persistSession: true } });
const $ = s => document.querySelector(s), app = $('#app');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', 2800); };
let user = null, profile = null, me = null;
const CTX = () => ({ sb, app, $, esc, toast, go, getUser: () => user, getMe: () => me, url });
let LG; const lg = async () => LG ||= await import('/legal.js?v=1');
let PF; const pf = async () => PF ||= await import('/profile.js?v=10');
const PCTX = () => ({ ...CTX(), statsHTML, uploadAvatar, delBanner, setProfile: p => { profile = { ...profile, ...p }; try { localStorage.setItem('obi-me', JSON.stringify({ id: user.id, profile, me })); } catch {} }, getProfile: () => profile, reload: async () => { await loadSession(); await meReady; } });
let ST; const st = async () => ST ||= (await import('/studio.js?v=39')).createStudio(CTX());
let AG; const ag = async () => AG ||= await import('/agenda.js?v=1');
let AD; const ad = async () => AD ||= (await import('/admin.js?v=10')).createAdmin(CTX());
let R; const rd = () => R ||= createReader(CTX());
let U; const ui = () => U ||= createUI(CTX());

// Preferencias de pantalla (Accesibilidad) y lectores silenciados/bloqueados: se aplican al instante desde el almacenamiento local.
const readJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const A11Y_CSS = 'html.a11y-still *,html.a11y-still *::before,html.a11y-still *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}html.a11y-hc{--paper:#fffaf0;--mute:#ddd4bf;--line:#5f5745}html.a11y-ul a:not(.btn){text-decoration:underline!important;text-underline-offset:3px}html.a11y-fc :focus-visible{outline:3px solid var(--gold)!important;outline-offset:3px!important}';
function applyUI(P = readJ('obi-ui', {})){ P = { ...(P || {}) }; if (P.tz) { try { new Intl.DateTimeFormat('es', { timeZone: P.tz }); } catch { delete P.tz; } } window.__obiUI = P; const H = document.documentElement;
  H.classList.toggle('a11y-still', P?.motion === 'reduce'); H.classList.toggle('a11y-hc', !!P?.contrast); H.classList.toggle('a11y-ul', !!P?.underline); H.classList.toggle('a11y-fc', !!P?.focus);
  if (!document.getElementById('a11y-css')) { const s = document.createElement('style'); s.id = 'a11y-css'; s.textContent = A11Y_CSS; document.head.appendChild(s); } }
window.obiSetUI = P => { try { localStorage.setItem('obi-ui', JSON.stringify(P || {})); } catch {} applyUI(P || {}); };
window.obiSetBlocks = L => { window.__obiBlocks = new Map((L || []).map(b => [b.id, b])); try { localStorage.setItem('obi-blocks', JSON.stringify(L || [])); } catch {} };
applyUI(); window.obiSetBlocks(readJ('obi-blocks', []));
{ const MM = window.matchMedia.bind(window); window.matchMedia = q => /prefers-reduced-motion:\s*reduce/.test(q) && window.__obiUI?.motion === 'reduce' ? MM('all') : MM(q); }
// Formato de hora (12/24 h) y zona horaria elegidos en Preferencias › Accesibilidad se aplican a todas las fechas mostradas.
{ const hc = o => { const U = window.__obiUI || {}, h = U.hour; let r = o; if ((h === '12' || h === '24') && !(o && (o.hour12 !== undefined || o.hourCycle))) r = { ...(r || {}), hour12: h === '12' }; if (U.tz && !(o && o.timeZone)) r = { ...(r || {}), timeZone: U.tz }; return r; };
  for (const k of ['toLocaleString', 'toLocaleTimeString', 'toLocaleDateString']) { const f = Date.prototype[k]; Date.prototype[k] = function(l, o){ return f.call(this, l, hc(o)); }; } }
window.obiTZ = () => window.__obiUI?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const RL = { bibliotecario: 'Bibliotecario', publicador: 'Publicador', lector: 'Lector' };
// La sesión sale del almacenamiento local (sin red) y se pinta al instante con el perfil guardado;
// perfil y whoami llegan en paralelo y actualizan la barra. meReady avisa cuándo `me` es definitivo.
let meReady = Promise.resolve(), lastBar = '';
async function loadSession(){
const { data } = await sb.auth.getSession(); user = data.session?.user || null;
if (!user) { profile = me = null; window.obiSetBlocks([]); drawSession(); meReady = Promise.resolve(); return; }
try { const c = JSON.parse(localStorage.getItem('obi-me') || 'null'); if (c?.id === user.id) ({ profile, me } = c); else profile = me = null; } catch {}
drawSession();
const uid = user.id;
meReady = Promise.all([sb.from('profiles').select('*').eq('id', uid).maybeSingle(), sb.rpc('whoami')]).then(([p, w]) => {
  if (user?.id !== uid) return; profile = p.data; me = w.data || null;
  if (profile?.ui_prefs && Object.keys(profile.ui_prefs).length) window.obiSetUI(profile.ui_prefs);
  sb.rpc('my_blocks').then(({ data }) => { if (user?.id === uid && Array.isArray(data)) window.obiSetBlocks(data); });
  try { localStorage.setItem('obi-me', JSON.stringify({ id: uid, profile, me })); } catch {}
  drawSession(); bell(); delBanner();
  if (profile?.needs_username && !['/elige-nombre', '/privacidad', '/condiciones-servicio'].includes(location.pathname)) go('/elige-nombre');
}).catch(e => console.warn('perfil', e));
}
function delBanner(){
  document.getElementById('obi-del')?.remove(); const d = profile?.delete_requested_at; if (!d) return;
  const end = new Date(new Date(d).getTime() + 30 * 864e5).toLocaleDateString('es-MX', { dateStyle: 'long' });
  const b = document.createElement('div'); b.id = 'obi-del'; b.setAttribute('role', 'alert');
  b.style.cssText = 'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:50;max-width:min(92vw,620px);display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;padding:12px 16px;background:#1a0f0c;border:1px solid #c8402e;color:#f3ecd9;font-size:14px;box-shadow:0 12px 30px rgba(0,0,0,.5)';
  b.innerHTML = `<span style="flex:1 1 260px">Tu cuenta se eliminará el <b>${end}</b>. Tu perfil ya no es visible.</span><button class="btn" id="obi-undel">Cancelar eliminación</button>`;
  document.body.appendChild(b);
  b.querySelector('#obi-undel').onclick = async () => { const { error } = await sb.rpc('cancel_account_deletion'); if (error) return toast(error.message); profile.delete_requested_at = null; try { localStorage.setItem('obi-me', JSON.stringify({ id: user.id, profile, me })); } catch {} b.remove(); toast('Eliminación cancelada. ¡Qué bueno que te quedas!'); };
}
function drawSession(){
const pr = me?.platform_role || 'lector';
const ini = esc((profile?.username || user?.email || '?')[0].toUpperCase());
const cont = `<a class="ob-cont" id="ob-cont" href="/biblioteca" hidden><span class="k" aria-hidden="true">続</span><span class="t"><small>Continuar</small><b></b></span></a>`;
const h = cont + (user
? `<details class="ob-bell"><summary aria-label="Avisos"><span aria-hidden="true">鈴</span><em id="bell-n" hidden></em></summary><div class="ob-menu ob-nt" id="bell-list"><p class="mono">Cargando…</p></div></details><details class="ob-user"><summary aria-label="Menú de cuenta"><span class="ob-av">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : ini}</span></summary><div class="ob-menu"><div class="who2"><strong>${esc(profile?.username || user.email)}</strong><small>${RL[pr]}${profile?.donor_tier ? ' · 援 Donador' : ''}</small></div><a href="/perfil">Mi perfil</a><a href="/biblioteca">Mi biblioteca</a><a href="/preferencias">Preferencias</a><button type="button" data-install ${canInstall() ? '' : 'hidden'}>Instalar la app</button>${pr === 'bibliotecario' ? '<a href="/bibliotecario">Mostrador del Bibliotecario</a>' : ''}${pr !== 'lector' ? '<a href="/estudio">Estudio</a>' : '<a href="/solicitud">Crear mi grupo traductor</a>'}<button id="out">Salir</button></div></details>`
: `<button class="btn" id="in">Entrar</button>`);
if (h === lastBar) return contBtn(); lastBar = h; $('#session').innerHTML = h;
const dd = $('#session .ob-user'); if (dd) dd.querySelector('.ob-menu').addEventListener('click', e => { if (e.target.closest('a')) dd.open = false; });
$('#out')?.addEventListener('click', async () => { try { localStorage.removeItem('obi-me'); } catch {} await sb.auth.signOut(); location.href = '/'; });
$('#in')?.addEventListener('click', () => go('/entrar'));
contBtn(true);
}
// botón «Continuar» de la barra: lo último leído (servidor o este dispositivo, lo más reciente)
let CB = { t: 0, v: null, u: null };
// ---------- instalar la app (Android/escritorio: aviso del navegador · iPhone/iPad: guía paso a paso) ----------
let BIP = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canInstall = () => !isStandalone() && (!!BIP || isIOS() || /android/i.test(navigator.userAgent));
const showInstall = () => document.querySelectorAll('[data-install]').forEach(b => { b.hidden = !canInstall(); });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); BIP = e; showInstall(); });
addEventListener('appinstalled', () => { BIP = null; showInstall(); toast('¡Listo! El Obi ya está en tu pantalla de inicio'); });
document.addEventListener('click', e => { const b = e.target.closest('[data-install]'); if (!b) return; e.preventDefault(); document.querySelectorAll('.ob-user[open]').forEach(d => d.open = false); installApp(); });
async function installApp(){
  if (isStandalone()) return toast('Ya estás usando la app instalada');
  if (BIP) { BIP.prompt(); const r = await BIP.userChoice.catch(() => null); if (r?.outcome === 'accepted') BIP = null; showInstall(); return; }
  const ua = navigator.userAgent, ios = isIOS(), safari = ios && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const steps = ios ? (safari
      ? ['Toca el botón <b>Compartir</b> <span aria-hidden="true">(el cuadro con la flecha ↑, abajo en iPhone o arriba en iPad)</span>.', 'Desplázate y elige <b>Agregar a pantalla de inicio</b>.', 'Toca <b>Agregar</b>. El sello 帯 aparecerá con tus otras apps.']
      : ['Abre el menú <b>Compartir</b> de este navegador (o el menú ⋯).', 'Elige <b>Agregar a pantalla de inicio</b>.', 'Si no aparece, abre esta página en <b>Safari</b> y repite los pasos.'])
    : /android/i.test(ua) ? ['Toca el menú <b>⋮</b> del navegador (arriba a la derecha).', 'Elige <b>Instalar app</b> o <b>Agregar a pantalla principal</b>.', 'Confirma con <b>Instalar</b>.']
    : ['En la barra de direcciones, pulsa el ícono de <b>instalar</b> (una pantalla con flecha).', 'O abre el menú del navegador y elige <b>Instalar El Obi del Lector</b>.'];
  const d = document.createElement('dialog'); d.setAttribute('aria-labelledby', 'ins-t');
  d.style.cssText = 'max-width:min(420px,92vw);padding:22px;background:#14120d;color:var(--paper,#f3ecd9);border:2px solid var(--gold);display:grid;gap:14px';
  d.innerHTML = `<div style="display:flex;gap:14px;align-items:center"><img src="/apple-touch-icon.png" alt="" width="56" height="56" style="flex:none"><div><h2 id="ins-t" style="margin:0;font:800 20px 'Shippori Mincho B1',serif">Instala El Obi</h2><span class="mono" style="font-size:11px;color:var(--mute)">Abre más rápido, a pantalla completa y lee sin conexión</span></div></div>
    <ol style="margin:0;padding-left:20px;display:grid;gap:8px;line-height:1.45">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <button class="btn" type="button" style="justify-self:end">Entendido</button>`;
  document.body.appendChild(d); d.querySelector('button').onclick = () => d.close(); d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d) d.close(); });
  d.showModal();
}
async function contBtn(force){
  const el = $('#ob-cont'); if (!el) return;
  if (location.pathname.startsWith('/leer/') || location.pathname.startsWith('/estudio') || location.pathname.startsWith('/bibliotecario')) { el.hidden = true; return; }
  if (force || Date.now() - CB.t > 20000 || CB.u !== (user?.id || null)) {
    CB = { t: Date.now(), v: null, u: user?.id || null }; let best = null;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k?.startsWith('obi-pos-')) continue; const l = JSON.parse(localStorage.getItem(k)); if (l?.num && (!best || new Date(l.at || 0) > new Date(best.at || 0))) best = { sid: k.slice(8), num: l.num, pct: l.pct, at: l.at || 0 }; } } catch {}
    try { if (user) { const { data } = await sb.from('reading_progress').select('series_id,chapter_num,pct,updated_at,series(slug,title)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1); const r = data?.[0]; if (r && (!best || new Date(r.updated_at) >= new Date(best.at || 0))) best = { sid: r.series_id, num: r.chapter_num, pct: r.pct, at: r.updated_at, slug: r.series?.slug, title: r.series?.title }; }
      if (best && !best.slug) { const { data } = await sb.from('series').select('slug,title').eq('id', best.sid).maybeSingle(); Object.assign(best, data || {}); } } catch {}
    CB.v = best?.slug ? best : null;
  }
  const b = CB.v, e = $('#ob-cont'); if (!e) return; if (!b) { e.hidden = true; return; }
  e.href = `/leer/${b.slug}/${b.num}`; e.title = `Continuar «${b.title}» · cap. ${b.num}`; e.setAttribute('aria-label', e.title);
  if (navigator.onLine && !navigator.connection?.saveData) (window.requestIdleCallback || setTimeout)(() => rd().warm(b.slug, b.num)); // «Continuar» ya listo antes del clic
  e.querySelector('b').textContent = b.title; e.querySelector('small').textContent = 'Continuar · cap. ' + b.num + (b.pct > 0.02 && b.pct < 0.98 ? ' · ' + Math.round(b.pct * 100) + ' %' : ''); e.hidden = false;
}
async function bell(){
if (!document.getElementById('nt-css')) { const st = document.createElement('style'); st.id = 'nt-css'; st.textContent = '.nt-ln{cursor:pointer}.nt-ln small{display:flex;justify-content:space-between;gap:10px}.nt-ln em{font-style:normal;color:var(--gold)}.nt-ln:hover span{text-decoration:underline;text-underline-offset:3px}'; document.head.appendChild(st); }
const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
const n = $('#bell-n'); if (n) { n.hidden = !count; n.textContent = count > 9 ? '9+' : count; }
const d = $('.ob-bell'); if (!d || d.dataset.b) return; d.dataset.b = '1';
d.addEventListener('toggle', async () => { if (!d.open) return; const { data } = await sb.from('notifications').select('id,kind,body,link,read,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
const ago = x => { const m = Math.round((Date.now() - new Date(x)) / 60000); return m < 60 ? 'hace ' + Math.max(1, m) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
$('#bell-list').innerHTML = (data || []).length ? '<strong class="nt-h">Avisos</strong>' + data.map(x => { const h = typeof x.link === 'string' ? x.link : x.link?.href || '', ok = /^\/(?!\/)[\w\/\-.?=&%#,]*$/.test(h); return ok ? `<a href="${esc(h)}" class="nt-it nt-ln${x.read ? '' : ' new'}"><span>${esc(x.body)}</span><small>${ago(x.created_at)}<em>Abrir →</em></small></a>` : `<div class="nt-it${x.read ? '' : ' new'}"><span>${esc(x.body)}</span><small>${ago(x.created_at)}</small></div>`; }).join('') : '<p class="mono" style="padding:10px">Sin avisos por ahora.</p>';
$('#bell-list').onclick = e => { if (e.target.closest('a')) d.open = false; };
if ((data || []).some(x => !x.read)) { await sb.rpc('notifications_read_all'); $('#bell-n').hidden = true; } });
}
const routes = {
'/': () => ui().home(), '/catalogo': () => ui().catalog(), '/calendario': async () => (await ag()).agenda(CTX()), '/ranking': () => ui().ranking(), '/lanzamientos': async () => (await ag()).agenda(CTX()), '/biblioteca': library, '/apoyar': support, '/entrar': () => login('in'), '/registro': () => login('up'), '/restablecer': resetPassword, '/perfil': perfil, '/preferencias': async () => (await pf()).preferences(PCTX()), '/buscar': () => ui().search(), '/solicitud': solicitud, '/elige-nombre': chooseName, '/privacidad': async () => (await lg()).privacy(app), '/condiciones-servicio': async () => (await lg()).terms(app),
'/bibliotecario': async () => (await ad()).render(), '/admin': async () => { history.replaceState({}, '', '/bibliotecario'); (await ad()).render(); },
};
export function go(path){ history.pushState({}, '', path); render(); }
document.addEventListener('click', e => { const a = e.target.closest('a[href^="/"]'); if (a && !a.target) { e.preventDefault(); go(a.getAttribute('href')); } });
addEventListener('popstate', render);
document.addEventListener('click', e => { document.querySelectorAll('.ob-user[open],.ob-bell[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
let PS = null; const seasons = async () => PS ||= await import('/season.js?v=4');
addEventListener('obi-season', () => { afterRender(); });
// Se dibuja la página sin esperar la temporada; afterRender la aplica cuando llega.
function render(){ seasons().then(S => { S.clear(); S.load(sb); }); return render0().catch(e => { if (!navigator.onLine || /Failed to fetch|NetworkError|Load failed|network/i.test(e?.message || '')) return offlinePage(); throw e; }).then(r => { contBtn(); return afterRender(r); }); }
// ---------- sin conexión ----------
function offlinePage(){
  const on = navigator.onLine; lbCss();
  app.innerHTML = `<div class="ui-cath"><div><h1>${on ? 'Mis descargas' : 'Sin conexión'}</h1><p>${on ? 'Volúmenes guardados en este dispositivo para leer sin internet.' : 'Puedes seguir leyendo lo que descargaste. El resto de la biblioteca vuelve cuando tengas internet.'}</p></div><span class="kj" aria-hidden="true">${on ? '保存' : '圏外'}</span></div><div id="off">${rd().offlineList()}</div>${on ? `<p style="margin-top:18px"><button class="btn ghost" type="button" data-install ${canInstall() ? '' : 'hidden'}>Instalar la app para leer sin conexión</button></p>` : '<p style="margin-top:18px"><button class="btn ghost" id="off-retry">Reintentar conexión</button></p>'}`;
  rd().bindOfflineList($('#off'), offlinePage);
  $('#off-retry')?.addEventListener('click', () => navigator.onLine ? render() : toast('Todavía sin conexión'));
}
function netBanner(){
  let b = document.getElementById('obi-net');
  if (navigator.onLine) { if (b) { b.dataset.on = '1'; b.textContent = 'Conexión recuperada'; setTimeout(() => b.remove(), 2500); } return; }
  if (!b) { b = document.createElement('div'); b.id = 'obi-net'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
  delete b.dataset.on; b.innerHTML = 'Sin conexión · <a href="/descargas">ver mis descargas</a>';
}
addEventListener('offline', netBanner);
addEventListener('online', () => { netBanner(); if (user) rd().syncPending().then(n => { if (n) toast('Tu progreso sin conexión ya se guardó en tu cuenta'); }); });
if (!navigator.onLine) netBanner();
async function afterRender(){
  const S = await seasons(); await S.load(sb); const p = location.pathname; let m;
  try {
    if (p === '/') return S.apply('home');
    if (p === '/catalogo') return S.apply('catalog');
    if (p === '/lanzamientos' || p === '/calendario') return S.apply('releases');
    if ((m = p.match(/^\/leer\/([\w-]+)\/(\d+)$/))) return S.apply('reader');
    if ((m = p.match(/^\/serie\/([\w-]+)$/))) { const { data } = await sb.from('series').select('teams(design)').eq('slug', m[1]).maybeSingle(); const T = data?.teams?.design?.seasons, { activeSeason } = await import('/anim.js?v=8'); const k = T ? activeSeason(T) : null; if (location.pathname !== p) return; return k ? S.apply('series', { key: k, greet: T.greet?.[k] || '' }) : S.apply('series'); }
    if ((m = p.match(/^\/equipo\/([\w-]+)$/))) { const { data } = await sb.from('teams').select('design').eq('slug', m[1]).maybeSingle(); const { activeSeason } = await import('/anim.js?v=8'); if (location.pathname !== p) return; if (data?.design?.seasons && activeSeason(data.design.seasons)) return S.clear(); return S.apply('team'); }
    // El resto de páginas públicas (Apoyar, Entrar, Registro, Perfil, Biblioteca, Calendario…) también llevan la temporada; el Estudio y el Mostrador no.
    if (p.startsWith('/estudio')) { S.clear(); return S.apply('studio'); }
    if (p.startsWith('/bibliotecario') || p === '/admin') return S.clear();
    return S.apply('page');
  } catch (e) { console.warn('temporada', e); }
}
async function render0(){
const p = location.pathname; let m;
scrollTo(0, 0); document.body.classList.remove('in-studio');
if (p === '/descargas' || (!navigator.onLine && !p.startsWith('/leer/'))) return offlinePage();
if (p.startsWith('/estudio') || p === '/perfil' || p === '/preferencias' || p === '/solicitud') await meReady;
if ((m = p.match(/^\/serie\/([\w-]+)$/))) return ui().series(m[1]);
if ((m = p.match(/^\/leer\/([\w-]+)\/(\d+)$/))) return rd().open(m[1], +m[2]);
if ((m = p.match(/^\/anotaciones\/([\w-]+)$/))) return rd().annotationsPage(m[1]);
if ((m = p.match(/^\/equipo\/([\w-]+)$/))) return ui().team(m[1]);
if ((m = p.match(/^\/lector\/([^/]+)$/))) return lector(decodeURIComponent(m[1]));
if (p.startsWith('/estudio')) {
  if (!user) return go('/entrar');
  if (!me || me.platform_role === 'lector') { app.innerHTML = '<h1>El Estudio es para Publicadores</h1><p>Tu cuenta es de Lector. Para publicar, solicita crear tu grupo traductor; el Bibliotecario revisa cada solicitud.</p><p style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/solicitud">Solicitar mi grupo traductor</a><a class="btn ghost" href="/">Volver al inicio</a></p>'; return; }
}
if (p === '/estudio') return (await st()).home();
if (p === '/estudio/obras') return (await st()).works();
if (p === '/estudio/nueva') return (await st()).newWork();
if ((m = p.match(/^\/estudio\/obra\/([\w-]+)$/))) return (await st()).work(m[1]);
if ((m = p.match(/^\/estudio\/editar\/([\w-]+)$/))) return (await st()).editor(m[1]);
if (p === '/estudio/importar') return (await st()).importer();
if (p === '/estudio/multimedia') return (await st()).library();
if (p === '/estudio/equipo') return (await st()).team();
if (p === '/estudio/flujo') return (await st()).board();
if (p === '/estudio/bitacora') return (await st()).log();
if (p === '/estudio/perfil') return (await st()).profile();
if (p === '/estudio/preferencias') return (await st()).prefs();
if (p === '/estudio/anuncios') return (await st()).announcements();
if (p === '/estudio/comunidad') return (await st()).community();
if (p === '/estudio/estadisticas') return (await st()).stats();
if (p === '/estudio/descargas') return (await st()).downloads();
if ((m = p.match(/^\/estudio\/glosario(?:\/([\w-]+))?$/))) return (await st()).glossary(m[1]);
return (routes[p] || notFound)();
}
const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
const LB_CSS = `
.lb-tabs{display:flex;gap:0;overflow-x:auto;border-bottom:1px solid #2f2a20;margin:0 0 24px;scrollbar-width:none}.lb-tabs a{flex:none;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;color:#a89f8a;text-decoration:none;border-bottom:2px solid transparent;font-weight:600}
.lb-tabs a.on{color:var(--paper);border-color:var(--gold)}.lb-tabs a em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:1px 6px;background:#2f2a20;color:var(--paper)}.lb-tabs a.on em{background:var(--gold);color:#0d0c0a}
.lb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:26px 18px}
.lb-c{display:grid;gap:8px;align-content:start;color:var(--paper);text-decoration:none}.lb-c:hover{color:var(--paper)}.lb-c .cv{position:relative;aspect-ratio:2/3;background:#1c1a14 center/cover no-repeat;border:1px solid #2f2a20;transition:transform .25s}.lb-c:hover .cv{transform:translateY(-4px)}
.lb-c .cv.no{display:flex;align-items:flex-end;padding:10px;font-family:'Shippori Mincho B1',serif;background:linear-gradient(160deg,var(--c),#16140f)}
.lb-c .cv em{position:absolute;top:8px;right:0;padding:2px 8px;background:var(--gold);color:#0d0c0a;font:700 11px/1.3 'IBM Plex Mono',monospace;font-style:normal}.lb-c .cv em.ok{background:#a9d18e}
.lb-c .bar{height:3px;background:#2f2a20}.lb-c .bar i{display:block;height:100%;background:var(--gold)}.lb-c b{font-size:14px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lb-c small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}
.lb-av{display:grid;max-width:720px}.lb-ai{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid #221f18}.lb-ai a{color:var(--paper);font-weight:600;text-decoration:none}.lb-ai a:hover{color:var(--gold)}@media(max-width:560px){.lb-ai{grid-template-columns:1fr auto}.lb-ai a{grid-column:1/-1}}
.lb-empty{padding:28px;border:1px dashed #3d3628;color:#a89f8a;display:grid;gap:12px;justify-items:start}.lb-h{display:grid;gap:0}.lb-h a{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:10px 0;border-bottom:1px solid #221f18;color:var(--paper);text-decoration:none;font-size:14px}.lb-h a:hover{color:var(--gold)}.lb-h .mono{font-size:12px}
.st-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin:14px 0}.st-k{padding:16px;border:1px solid #2f2a20;background:#16140f;display:grid;gap:4px}.st-k b{font-family:'Shippori Mincho B1',serif;font-size:32px;font-weight:500;color:var(--gold);line-height:1}.st-k span{font-size:13px;color:#a89f8a}
.st-gen{display:grid;gap:8px;max-width:520px}.st-gen div{display:grid;grid-template-columns:140px minmax(0,1fr) 40px;gap:10px;align-items:center;font-size:14px}.st-gen i{height:8px;background:var(--gold)}.st-gen small{font-family:'IBM Plex Mono',monospace;color:#a89f8a;text-align:right}
`;
const lbCss = () => { if (document.getElementById('lb-css')) return; const s = document.createElement('style'); s.id = 'lb-css'; s.textContent = LB_CSS; document.head.appendChild(s); };
async function library(){
if (!user) return go(new URLSearchParams(location.search).get('t') === 'offline' ? '/descargas' : '/entrar');
lbCss(); app.innerHTML = '<p class="mono">Cargando tu biblioteca…</p>';
const TABS = [['leyendo', 'Leyendo'], ['pendientes', 'Pendientes'], ['terminadas', 'Terminadas'], ['avisos', 'Avisos'], ['offline', 'Sin conexión'], ['historial', 'Historial']];
const tab = TABS.some(t => t[0] === new URLSearchParams(location.search).get('t')) ? new URLSearchParams(location.search).get('t') : 'leyendo';
const [{ data: prog }, { data: fol }, { data: rc }] = await Promise.all([
  sb.from('reading_progress').select('series_id,chapter_num,pct,updated_at').eq('user_id', user.id),
  sb.from('follows').select('series_id,channels').eq('user_id', user.id),
  sb.from('read_chapters').select('chapter_id').eq('user_id', user.id)]);
const ids = [...new Set([...(prog || []), ...(fol || [])].map(r => r.series_id))];
const [{ data: ser }, { data: chs }] = ids.length ? await Promise.all([
  sb.from('series').select('id,slug,title,short,cover_path,translation_status,theme,teams(color)').in('id', ids),
  sb.from('chapters').select('id,num,series_id,publish_at').eq('status', 'published').is('deleted_at', null).in('series_id', ids).order('num')]) : [{ data: [] }, { data: [] }];
const read = new Set((rc || []).map(r => r.chapter_id)), P = Object.fromEntries((prog || []).map(r => [r.series_id, r])), F = new Set((fol || []).map(r => r.series_id));
const now = Date.now(), by = {}; (chs || []).forEach(c => { if (c.publish_at && new Date(c.publish_at) > now) return; (by[c.series_id] ||= []).push(c); });
const W = (ser || []).map(s => { const list = by[s.id] || [], nr = list.filter(c => read.has(c.id)).length, nu = list.find(c => !read.has(c.id));
  return { s, p: P[s.id], tot: list.length, nr, unread: list.length - nr, nextU: nu, done: s.translation_status === 'completed' && list.length > 0 && nr >= list.length, fol: F.has(s.id), lastAt: list.length ? list[list.length - 1].publish_at : null }; });
const L = {
  leyendo: W.filter(w => w.p && !w.done).sort((a, b) => new Date(b.p.updated_at) - new Date(a.p.updated_at)),
  pendientes: W.filter(w => w.fol && w.unread > 0 && !w.done).sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0)),
  terminadas: W.filter(w => w.done).sort((a, b) => a.s.title.localeCompare(b.s.title, 'es'))};
const cv = (w, badge) => { const c = w.s.theme?.color || w.s.teams?.color || '#f2c230'; return w.s.cover_path ? `<span class="cv" style="background-image:url('${esc(MED(w.s.cover_path))}')">${badge}</span>` : `<span class="cv no" style="--c:${esc(c)}">${badge}${esc(w.s.short || w.s.title)}</span>`; };
const card = (w, k) => { const href = k === 'pendientes' && w.nextU ? `/leer/${w.s.slug}/${w.nextU.num}` : k === 'leyendo' ? `/leer/${w.s.slug}/${w.p.chapter_num}` : `/serie/${w.s.slug}`;
  const badge = k === 'pendientes' ? `<em>${w.unread} sin leer</em>` : k === 'terminadas' ? '<em class="ok">✓ Completa</em>' : '';
  const sub = k === 'leyendo' ? `Cap. ${w.p.chapter_num}${w.p.pct > .02 && w.p.pct < .95 ? ' · ' + Math.round(w.p.pct * 100) + '%' : ''} · ${w.nr}/${w.tot}` : k === 'pendientes' ? (w.nextU ? 'Sigue en el cap. ' + w.nextU.num : '') : w.tot + ' capítulos';
  return `<a class="lb-c" href="${href}">${cv(w, badge)}${w.tot ? `<span class="bar"><i style="width:${Math.round(w.nr / w.tot * 100)}%"></i></span>` : ''}<b>${esc(w.s.title)}</b><small>${sub}</small></a>`; };
const HID = new Set(profile?.hidden_series || []);
const cardW = (w, k) => `<div style="display:grid;gap:4px;align-content:start">${card(w, k)}<button type="button" class="ui-lnk" data-hide="${w.s.id}" style="justify-self:start;font-size:12px;color:#a89f8a;min-height:32px">${HID.has(w.s.id) ? 'Mostrar en mi perfil' : 'Ocultar del perfil'}</button></div>`;
const EMPTY = { leyendo: 'Abre cualquier capítulo y aparecerá aquí.', pendientes: 'Sigue una obra desde su ficha: cuando salga un capítulo que no has leído, aparecerá aquí.', terminadas: 'Aquí aparecen las obras completas que leíste de principio a fin.' };
const n = k => L[k] ? L[k].length : null;
app.innerHTML = `<div class="ui-cath"><div><h1>Mi biblioteca</h1><p>${read.size} capítulos leídos · ${F.size} obras seguidas</p></div><span class="kj" aria-hidden="true">書庫</span></div>
<nav class="lb-tabs">${TABS.map(([k, l]) => `<a href="/biblioteca${k === 'leyendo' ? '' : '?t=' + k}" class="${k === tab ? 'on' : ''}">${l}${n(k) ? `<em>${n(k)}</em>` : ''}</a>`).join('')}</nav><div id="lb-body"></div>`;
const box = $('#lb-body');
if (L[tab]) { box.innerHTML = L[tab].length ? `<div class="lb-grid">${L[tab].map(w => cardW(w, tab)).join('')}</div>` : `<div class="lb-empty"><span>${EMPTY[tab]}</span><a class="btn ghost" href="/catalogo">Explorar el catálogo</a></div>`;
  box.querySelectorAll('[data-hide]').forEach(b => b.onclick = async () => { const id = b.dataset.hide, on = !HID.has(id); on ? HID.add(id) : HID.delete(id);
    const { error } = await sb.from('profiles').update({ hidden_series: [...HID] }).eq('id', user.id); if (error) { on ? HID.delete(id) : HID.add(id); return toast(error.message); }
    if (profile) profile.hidden_series = [...HID]; b.textContent = on ? 'Mostrar en mi perfil' : 'Ocultar del perfil'; toast(on ? 'Oculta de tu perfil público' : 'Visible en tu perfil público'); }); }
else if (tab === 'avisos') {
  const FL = (fol || []).map(r => ({ r, s: (ser || []).find(x => x.id === r.series_id) })).filter(x => x.s).sort((a, b) => a.s.title.localeCompare(b.s.title, 'es'));
  box.innerHTML = FL.length ? `<p class="mono" style="margin:0 0 14px;font-size:13px">Elige de qué obras quieres aviso en la campana cuando salga un capítulo nuevo. <a href="/preferencias?s=avisos">Más opciones de avisos y correo</a>.</p><div class="lb-av">${FL.map(({ r, s }) => { const on = r.channels?.web !== false; return `<div class="lb-ai"><a href="/serie/${s.slug}">${esc(s.title)}</a><label class="ui-tog"><input type="checkbox" data-av="${s.id}" ${on ? 'checked' : ''}> Avisarme</label><button class="ui-lnk" data-unf="${s.id}">Dejar de seguir</button></div>`; }).join('')}</div>`
    : '<div class="lb-empty">Aún no sigues ninguna obra. Usa «Seguir serie» en la ficha de una obra.</div>';
  box.querySelectorAll('[data-av]').forEach(i => i.onchange = async () => { const r = (fol || []).find(x => x.series_id === i.dataset.av), ch = { ...(r.channels || {}), web: i.checked };
    const { error } = await sb.from('follows').update({ channels: ch }).eq('user_id', user.id).eq('series_id', i.dataset.av); if (error) { i.checked = !i.checked; return toast(error.message); } r.channels = ch; toast(i.checked ? 'Recibirás avisos de esta obra' : 'Ya no recibirás avisos de esta obra'); });
  box.querySelectorAll('[data-unf]').forEach(b => b.onclick = async () => { if (!confirm('¿Dejar de seguir esta obra?')) return; const { error } = await sb.from('follows').delete().eq('user_id', user.id).eq('series_id', b.dataset.unf); if (error) return toast(error.message); toast('Ya no sigues esta obra'); library(); });
}
else if (tab === 'offline') { box.innerHTML = `<div id="off">${rd().offlineList()}</div>`; rd().bindOfflineList($('#off'), library); }
else { const hist = await rd().historyList(); box.innerHTML = hist.length ? `<div class="lb-h">${hist.map(h => `<a href="/leer/${h.chapters.series.slug}/${h.chapters.num}"><span class="mono">${new Date(h.opened_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span><span>${esc(h.chapters.series.title)} · ${esc(h.chapters.title)}</span></a>`).join('')}</div>` : '<div class="lb-empty">Sin historial todavía.</div>'; }
}
const statsHTML = st => st ? `<div class="st-grid"><div class="st-k"><b>${(+st.chapters).toLocaleString('es-MX')}</b><span>capítulos leídos</span></div><div class="st-k"><b>${st.month}</b><span>en los últimos 30 días</span></div><div class="st-k"><b>${st.series}</b><span>obras empezadas</span></div><div class="st-k"><b>${st.finished}</b><span>obras terminadas</span></div><div class="st-k"><b>${st.following}</b><span>obras seguidas</span></div></div>
${(st.genres || []).length ? `<h3 style="margin:22px 0 10px">Géneros favoritos</h3><div class="st-gen">${st.genres.map(g => `<div><span>${esc(g.g)}</span><i style="width:${Math.max(4, Math.round(g.n / st.genres[0].n * 100))}%"></i><small>${g.n}</small></div>`).join('')}</div>` : ''}` : '';
async function lector(name){ await meReady; if (user && profile?.username && profile.username.toLowerCase() === name.toLowerCase()) { history.replaceState({}, '', '/perfil'); return perfil(); } return (await pf()).publicProfile(PCTX(), name); }
const SUP_KIND = { paypal: ['PayPal', '#8cc3f2'], kofi: ['Ko-fi', '#f59e7a'], patreon: ['Patreon', '#f29bb0'], bmac: ['Buy Me a Coffee', '#f2c230'], mercadopago: ['Mercado Pago', '#8cc3f2'], otro: ['Enlace', '#a9d18e'] };
async function support(){
app.innerHTML = '<p class="mono">Cargando…</p>';
const [{ data: ps }, { data }] = await Promise.all([sb.from('platform_settings').select('support').eq('id', 1).maybeSingle(), sb.from('patreon_tiers').select('*').order('price_usd')]);
const C = ps?.support || {}, mode = C.mode || 'patreon', links = (C.links || []).filter(l => /^https:\/\//.test(l.url || ''));
const tiers = (data||[]).map(t => `<div style="border:2px solid var(--line);padding:18px;margin:10px 0"><h2 style="margin:0">${esc(t.name)}</h2><p class="mono">$${t.price_usd} USD/mes · ${t.early_weeks ? t.early_weeks + ' semana(s) de adelanto' : 'sin adelanto'}</p></div>`).join('') || '<p class="mono">Los niveles aparecerán cuando un equipo conecte Patreon.</p>';
const cards = links.map(l => { const [kn, kc] = SUP_KIND[l.kind] || SUP_KIND.otro; return `<a href="${esc(l.url)}" target="_blank" rel="noopener" style="display:grid;gap:6px;padding:18px;background:#14120d;border:1px solid #2f2a20;border-top:4px solid ${kc};color:var(--paper);text-decoration:none"><span class="mono" style="font-size:11px;letter-spacing:.12em;color:${kc}">${esc(kn.toUpperCase())}</span><b style="font-size:18px">${esc(l.label || kn)}</b>${l.note ? `<span style="font-size:14px;line-height:1.5;color:#cfc6b0">${esc(l.note)}</span>` : ''}<span style="font-weight:600;color:${kc}">Abrir →</span></a>`; }).join('');
const grid = cards ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:14px;margin:18px 0 28px">${cards}</div>` : '';
app.innerHTML = `<h1>${esc(C.title || 'Apoya a los traductores')}</h1><p style="max-width:68ch">${esc(C.intro || (mode === 'links' ? 'Elige cómo quieres apoyar.' : 'Tu membresía de Patreon activa el acceso anticipado y el sello 援 automáticamente.'))}</p>`
  + (mode === 'links' ? (grid || '<p class="mono">Aún no hay enlaces de apoyo.</p>') : mode === 'both' ? grid + '<h2>Niveles de Patreon</h2>' + tiers : tiers) + '<section id="wall"></section>';
sb.rpc('platform_patrons_wall').then(({ data: W }) => { const el = document.getElementById('wall'); if (!el || !W?.length) return; el.innerHTML = `<h2 style="margin-top:36px">惠 Muro de agradecimientos</h2><p class="mono" style="margin:0 0 14px">Gracias a quienes sostienen El Obi del Lector.</p><div style="display:flex;flex-wrap:wrap;gap:10px">${W.map(w => `<a href="/lector/${esc(w.username)}" style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border:1px solid var(--line);background:#16140f;color:var(--paper);text-decoration:none;font-weight:600;font-size:14px"><span style="width:28px;height:28px;flex:none;background:#2f2a20 center/cover;${w.avatar_url ? `background-image:url('${esc(w.avatar_url)}')` : ''}"></span>${esc(w.username)}</a>`).join('')}</div>`; }, () => {});
}
const AUTH_ERR = { 'Invalid login credentials':'Correo o contraseña incorrectos.', 'Email not confirmed':'Confirma tu correo antes de entrar (revisa tu bandeja).', 'User already registered':'Ese correo ya tiene cuenta. Inicia sesión.', 'Password should be at least 8 characters.':'La contraseña debe tener al menos 8 caracteres.' };
const authMsg = e => /captcha/i.test(e?.message || '') ? 'No pudimos comprobar que no eres un bot. Espera un momento e inténtalo otra vez.' : AUTH_ERR[e?.message] || e?.message || 'Algo salió mal. Intenta de nuevo.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
async function login(mode = 'in'){
const up = mode === 'up';
app.innerHTML = `<h1>${up ? 'Crear cuenta' : 'Entrar'}</h1>
<div style="display:grid;gap:14px;max-width:380px;margin:0 0 14px"><button type="button" id="gg" style="display:flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:0 16px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;border-radius:4px;font:600 15px 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>${up ? 'Registrarte con Google' : 'Continuar con Google'}</button><button type="button" id="pt-in" style="display:flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:0 16px;background:#16140f;color:var(--paper);border:1px solid var(--line);border-radius:4px;font:600 15px 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="14.5" cy="9.5" r="5.5"/><rect x="4" y="4" width="3" height="16"/></svg>Continuar con Patreon</button>
<div class="mono" style="display:flex;align-items:center;gap:12px;color:var(--mute);font-size:11px;letter-spacing:.1em"><span style="flex:1;height:1px;background:var(--line)"></span>O CON TU CORREO<span style="flex:1;height:1px;background:var(--line)"></span></div></div>
<form id="f" novalidate style="display:grid;gap:10px;max-width:380px">
${up ? '<label>Nombre de usuario<input name="username" autocomplete="username" minlength="2" maxlength="32" required></label>' : ''}
<label>Correo<input name="email" type="email" autocomplete="email" required placeholder="correo@ejemplo.com"></label>
<label>Contraseña<input name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="8" maxlength="128" required></label>
<p id="err" role="alert" style="color:#f59e7a;margin:0;min-height:1.2em"></p>
<div id="cf-ts" style="min-height:65px;max-width:380px"></div>
<button class="btn" id="go">${up ? 'Crear cuenta' : 'Entrar'}</button>
${up ? '<p style="margin:0;font-size:13px;color:var(--mute)">Al crear una cuenta aceptas las <a href="/condiciones-servicio">Condiciones del servicio</a> y la <a href="/privacidad">Política de privacidad</a>.</p>' : ''}
</form>
<p style="display:flex;gap:16px;flex-wrap:wrap"><a href="#" id="sw">${up ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate'}</a>${up ? '' : '<a href="#" id="fg">¿Olvidaste tu contraseña?</a>'}</p>`;
const f = $('#f'), err = $('#err'), btn = $('#go');
const CF = await import('/captcha.js?v=1'), cap = CF.mount($('#cf-ts'), { action: up ? 'signup' : 'login' });
const capTok = async () => { try { return await cap.token(); } catch (e) { err.textContent = e.message; return null; } };
$('#gg').onclick = async () => { const b = $('#gg'); b.disabled = true; err.textContent = '';
const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/', queryParams: { prompt: 'select_account' } } });
if (error) { b.disabled = false; err.textContent = authMsg(error); } };
$('#pt-in').onclick = async () => { $('#pt-in').disabled = true; (await import('/patreon.js?v=1')).start(sb, url, 'login', null, m => { $('#pt-in').disabled = false; err.textContent = m; }); };
import('/patreon.js?v=1').then(P => { const n = P.returnNotice(() => {}); if (n) err.textContent = n.msg; });
$('#sw').onclick = e => { e.preventDefault(); history.replaceState({}, '', up ? '/entrar' : '/registro'); login(up ? 'in' : 'up'); };
$('#fg')?.addEventListener('click', async e => {
e.preventDefault(); const email = f.email.value.trim();
if (!EMAIL_RE.test(email)) { err.textContent = 'Escribe tu correo para enviarte el enlace.'; return; }
const captchaToken = await capTok(); if (CF.enabled() && !captchaToken) return;
const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/restablecer', captchaToken }); cap.reset();
error ? err.textContent = authMsg(error) : toast('Te enviamos un enlace para restablecer la contraseña');
});
f.onsubmit = async e => {
e.preventDefault(); err.textContent = '';
const email = f.email.value.trim(), password = f.password.value, username = f.username?.value.trim();
if (up && (!username || username.length < 2)) { err.textContent = 'Elige un nombre de usuario (mínimo 2 caracteres).'; return; }
if (!EMAIL_RE.test(email)) { err.textContent = 'Escribe un correo válido.'; return; }
if (password.length < 8 || password.length > 128) { err.textContent = 'La contraseña debe tener entre 8 y 128 caracteres.'; return; }
btn.disabled = true; btn.textContent = 'Verificando…';
const captchaToken = await capTok(); if (CF.enabled() && !captchaToken) { btn.disabled = false; btn.textContent = up ? 'Crear cuenta' : 'Entrar'; return; }
btn.textContent = 'Un momento…';
const { data, error } = up
? await sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin + '/?bienvenida=1', captchaToken } })
: await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
cap.reset();
btn.disabled = false; btn.textContent = up ? 'Crear cuenta' : 'Entrar';
if (error) { err.textContent = authMsg(error); return; }
if (up && !data.session) { toast('Cuenta creada. Revisa tu correo y pulsa «Confirmar mi cuenta».'); history.replaceState({}, '', '/entrar'); return login('in'); }
toast('¡Bienvenido!'); go('/');
};
}
// Lectores que entraron con Google: eligen su nombre de usuario la primera vez.
async function chooseName(){
if (!user) return go('/entrar');
await meReady;
if (!profile?.needs_username) return go('/');
const meta = user.user_metadata || {}, pic = meta.avatar_url || meta.picture || '';
const sug = (meta.full_name || meta.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, 24) || profile.username;
app.innerHTML = `<div style="display:grid;gap:18px;max-width:460px"><h1 style="margin:0">¡Bienvenido a la biblioteca!</h1>
<p style="margin:0">Elige cómo te verán los demás lectores. También será tu dirección pública: <span class="mono">/lector/<b id="cn-prev" style="color:var(--gold)">${esc(sug)}</b></span></p>
<form id="cn" style="display:grid;gap:12px"><label>Nombre de usuario<input id="cn-u" value="${esc(sug)}" minlength="2" maxlength="32" autocomplete="username" required></label>
${pic && !profile.avatar_url ? `<label style="display:flex;gap:12px;align-items:center;cursor:pointer"><input type="checkbox" id="cn-pic" checked style="width:18px;height:18px;accent-color:var(--gold)"><img src="${esc(pic)}" alt="" width="40" height="40" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover">Usar mi foto de Google</label>` : ''}
<p id="cn-err" role="alert" style="color:#f59e7a;margin:0;min-height:1.2em"></p><button class="btn" style="justify-self:start">Guardar y entrar</button></form>
<p style="margin:0;font-size:13px;color:var(--mute)">Podrás cambiarlo después en Preferencias › Cuenta. <a href="#" id="cn-keep">Mantener «${esc(profile.username)}»</a></p></div>`;
$('#cn-u').oninput = e => { $('#cn-prev').textContent = e.target.value.trim(); };
const done = async () => {
  if ($('#cn-pic')?.checked) { const { error } = await sb.from('profiles').update({ avatar_url: pic }).eq('id', user.id); if (!error) profile.avatar_url = pic; }
  profile.needs_username = false; try { localStorage.setItem('obi-me', JSON.stringify({ id: user.id, profile, me })); } catch {}
  lastBar = ''; drawSession(); toast('¡Listo! Ya eres parte de la biblioteca'); go('/'); };
$('#cn').onsubmit = async e => { e.preventDefault(); const v = $('#cn-u').value.trim(); $('#cn-err').textContent = '';
  if (v.length < 2 || v.length > 32) { $('#cn-err').textContent = 'Entre 2 y 32 caracteres.'; return; }
  if (!/^[\p{L}\p{N}_.-]+$/u.test(v)) { $('#cn-err').textContent = 'Usa solo letras, números, punto, guion y guion bajo (sin espacios).'; return; }
  const b = e.submitter; if (b) b.disabled = true;
  const { data, error } = await sb.rpc('set_initial_username', { p_new: v }); if (b) b.disabled = false;
  if (error) { $('#cn-err').textContent = error.message; return; } profile.username = data; done(); };
$('#cn-keep').onclick = async e => { e.preventDefault(); const { error } = await sb.rpc('keep_username'); if (error) return toast(error.message); done(); };
}
function resetPassword(){
app.innerHTML = `<h1>Nueva contraseña</h1><form id="f" style="display:grid;gap:10px;max-width:380px"><label>Contraseña nueva<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><p id="err" role="alert" style="color:#f59e7a;margin:0"></p><button class="btn">Guardar</button></form>`;
$('#f').onsubmit = async e => { e.preventDefault(); const pw = e.target.password.value; if (pw.length < 8 || pw.length > 128) { $('#err').textContent = 'Entre 8 y 128 caracteres.'; return; } const { error } = await sb.auth.updateUser({ password: pw }); error ? $('#err').textContent = authMsg(error) : (toast('Contraseña actualizada'), go('/')); };
}
async function uploadAvatar(file){
if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Usa una imagen JPG, PNG o WebP.');
if (file.size > 2 * 1024 * 1024) throw new Error('La foto pesa más de 2 MB.');
const path = user.id + '/avatar-' + Date.now() + '.' + file.type.split('/')[1];
const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
if (error) throw error;
const { data } = sb.storage.from('avatars').getPublicUrl(path);
const { error: e2 } = await sb.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
if (e2) throw e2;
await loadSession(); await meReady;
}
function avatarBox(title, sub){
const cur = profile?.avatar_url;
return `<section class="avatar-box"><div class="av">${cur ? `<img src="${esc(cur)}" alt="Tu foto">` : esc((profile?.username || '?')[0].toUpperCase())}</div>
<div style="display:grid;gap:8px"><strong>${title}</strong><span class="mono">${sub}</span>
<label class="btn" style="justify-self:start">${cur ? 'Cambiar foto' : 'Subir foto de perfil'}<input id="av" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
<p id="averr" role="alert" style="color:#f59e7a;margin:0"></p></div></section>`;
}
function bindAvatar(after){
$('#av').onchange = async e => { const f = e.target.files[0]; if (!f) return; $('#averr').textContent = ''; try { await uploadAvatar(f); toast('Foto de perfil guardada'); after(); } catch (er) { $('#averr').textContent = authMsg(er); } };
}
function welcome(){
app.innerHTML = `<h1>¡Bienvenido a la biblioteca!</h1><p>Tu correo quedó confirmado y tu cuenta ya está activa.</p>${avatarBox('Ponle cara a tu ficha de socio', 'JPG, PNG o WebP · máx. 2 MB · puedes cambiarla luego en tu perfil')}<p style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/catalogo">Explorar el catálogo</a><a class="btn ghost" href="/">Ahora no</a></p>`;
bindAvatar(welcome);
}
async function perfil(){
if (!user) return go('/entrar');
if (!profile?.username) { app.innerHTML = '<p class="mono">Cargando perfil…</p>'; return; }
return (await pf()).publicProfile(PCTX(), profile.username, { owner: true, visibility: profile.profile_visibility });
}
const LANGS = ['Japonés', 'Inglés', 'Coreano', 'Chino'];
async function solicitud(){
if (!user) return go('/entrar');
if (me && me.platform_role !== 'lector') { app.innerHTML = '<h1>Ya eres Publicador</h1><p>Tu cuenta ya pertenece a un equipo traductor.</p><p><a class="btn" href="/estudio">Ir al Estudio</a></p>'; return; }
const { data: reqs } = await sb.from('translator_requests').select('id,alias,team_name,langs,links,message,status,note,created_at,updated_at,teams(name)').eq('user_id', user.id).order('created_at', { ascending: false });
const open = (reqs || []).find(x => x.status === 'pending' || x.status === 'info'), last = (reqs || [])[0];
const box = (c, t, b) => `<div style="border:2px solid ${c};border-left-width:8px;padding:16px 18px;display:grid;gap:6px;max-width:640px"><strong>${t}</strong>${b}</div>`;
let head = '';
if (open?.status === 'pending') head = box('var(--gold)', 'Tu solicitud está en revisión', `<span class="mono">Enviada ${new Date(open.updated_at || open.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' })} · grupo «${esc(open.team_name || '')}»</span><span>El Bibliotecario te responderá aquí. Puedes corregir los datos mientras tanto.</span>`);
else if (open?.status === 'info') head = box('#8cc3f2', 'El Bibliotecario necesita más información', `<p style="margin:0;white-space:pre-line">«${esc(open.note || '')}»</p><span class="mono">Responde en «Mensaje para el Bibliotecario» y vuelve a enviar.</span>`);
else if (last?.status === 'rejected') head = box('#f59e7a', 'Tu solicitud anterior no fue aprobada', `${last.note ? `<p style="margin:0;white-space:pre-line">«${esc(last.note)}»</p>` : ''}<span class="mono">Puedes enviar una nueva con más información.</span>`);
else if (last?.status === 'approved') head = box('#a9d18e', '¡Solicitud aprobada!', `<span>Tu grupo ${last.teams?.name ? '«' + esc(last.teams.name) + '» ' : ''}ya está dado de alta.</span><a class="btn" href="/estudio" style="justify-self:start">Ir al Estudio</a>`);
const v = open || {};
app.innerHTML = `<h1>Crear mi grupo traductor</h1><p style="max-width:640px">Cuéntale al Bibliotecario quién eres y qué quieres traducir. Al aprobarte, se crea tu grupo contigo como propietario y entras al Estudio.</p>${head}
<form id="rq" novalidate style="display:grid;gap:12px;max-width:640px;margin-top:20px">
<label>Tu alias como traductor<input name="alias" maxlength="40" required value="${esc(v.alias || profile?.username || '')}"></label>
<label>Nombre del grupo traductor<input name="team" maxlength="60" required placeholder="Ej. Linterna Traducciones" value="${esc(v.team_name || '')}"></label>
<fieldset style="border:1px solid var(--line);padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap"><legend>Traduces desde</legend>${LANGS.map(l => `<label style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" name="lang" value="${l}" ${(v.langs || []).includes(l) ? 'checked' : ''}> ${l}</label>`).join('')}<label style="display:flex;gap:6px;align-items:center">Otro <input name="other" maxlength="30" style="width:140px" value="${esc((v.langs || []).filter(l => !LANGS.includes(l)).join(', '))}"></label></fieldset>
<label>Enlaces a trabajos previos (opcional)<textarea name="links" rows="3" maxlength="1000" placeholder="Un enlace por línea">${esc(v.links || '')}</textarea></label>
<label>Mensaje para el Bibliotecario${open?.status === 'info' ? ' · responde aquí' : ' (opcional)'}<textarea name="msg" rows="4" maxlength="1500" placeholder="Qué obras quieres traducir, cada cuánto publicarías…">${esc(open?.status === 'info' ? '' : v.message || '')}</textarea></label>
<p id="rqerr" role="alert" style="color:#f59e7a;margin:0;min-height:1.2em"></p>
<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="rqgo">${open ? (open.status === 'info' ? 'Enviar respuesta' : 'Guardar cambios') : 'Enviar solicitud'}</button>${open ? '<button type="button" class="btn ghost" id="rqcancel">Retirar solicitud</button>' : ''}</div>
</form>`;
const f = $('#rq');
f.onsubmit = async e => {
e.preventDefault(); $('#rqerr').textContent = '';
const langs = [...f.querySelectorAll('[name=lang]:checked')].map(x => x.value).concat(f.other.value.split(',').map(x => x.trim()).filter(Boolean));
if (open?.status === 'info' && !f.msg.value.trim()) { $('#rqerr').textContent = 'Responde lo que te pidió el Bibliotecario.'; return; }
const b = $('#rqgo'); b.disabled = true;
const { error } = await sb.rpc('submit_translator_request', { p_alias: f.alias.value, p_team_name: f.team.value, p_langs: langs, p_links: f.links.value, p_message: f.msg.value });
b.disabled = false;
if (error) { $('#rqerr').textContent = error.message; return; }
toast(open ? 'Solicitud actualizada' : 'Solicitud enviada · te avisaremos aquí'); solicitud();
};
$('#rqcancel')?.addEventListener('click', async () => { if (!confirm('¿Retirar tu solicitud?')) return; const { error } = await sb.rpc('cancel_translator_request'); if (error) return toast(error.message); toast('Solicitud retirada'); solicitud(); });
}
function notFound(){ app.innerHTML = '<h1>Esta página no está en el estante</h1><p><a href="/">Volver al inicio</a></p>'; }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
// precarga del capítulo al apuntar o tocar cualquier enlace al lector (Continuar, índice, fichas…)
let warmT = 0; const warmOn = e => { const l = e.target.closest?.('a[href^="/leer/"]'); if (!l) return; const m = l.getAttribute('href').match(/^\/leer\/([\w-]+)\/(\d+(?:\.\d+)?)/); if (!m) return; clearTimeout(warmT); warmT = setTimeout(() => rd().warm(m[1], +m[2]), e.type === 'pointerover' ? 80 : 0); };
document.addEventListener('pointerover', warmOn, { passive: true }); document.addEventListener('touchstart', warmOn, { passive: true }); document.addEventListener('focusin', warmOn);
addEventListener('load', () => setTimeout(() => { if (user && navigator.onLine) rd().syncPending(); }, 5000));
let authEv = null;
sb.auth.onAuthStateChange(ev => { if (ev !== 'INITIAL_SESSION') loadSession().then(() => ui().refreshBadge()); if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(ev) && authEv !== null) seasons().then(S => S.load(sb, true)).then(() => afterRender()); authEv = ev; });
loadSession().then(() => {
const qs = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('error_description')) { history.replaceState({}, '', '/entrar'); render(); return toast(hash.get('error_description').includes('expired') ? 'El enlace expiró. Inicia sesión para recibir otro.' : hash.get('error_description')); }
if (qs.has('bienvenida') && user) { history.replaceState({}, '', '/'); return meReady.then(welcome); }
render(); ui().refreshBadge();
});

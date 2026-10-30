import { installPublicShare } from './share.js?v=1';
import { confirmObi, inputObi } from './obi-dialog.js';
import { readPages } from './paging.js';
import { prepareLibrary, selectLibraryItems } from './library-logic.js';
import { createOfflineDownloads } from './offline-downloads.js?v=1';
import { readingGroups, planReadingChanges, undoReadingChanges, applyReadingChanges, persistReadingChanges } from './library-read-actions.js';
// Importaciones estáticas: el navegador descarga app, ui y reader a la vez (más modulepreload en index.html).
import { createClient } from '/supabase.js?v=1';
import { createReader } from '/reader.js?v=24';
import { createUI } from '/ui.js?v=57';
import { attachPublicCredits, creditsHTML, installCreditImageFallback } from '/public-collaboration-credits.js?v=1';
import { reportHomeRead } from '/home-metrics.js?v=1';
import { sameReaderAccount, readingProgressPrefix, readerProgressKeys } from '/reader-pref-cache.js?v=1';
const { url, key } = window.OBI_CONFIG;
const ASSET = n => url + '/storage/v1/object/public/obi-app/' + n + '?v=' + (window.OBI_ASSET_V || '5');
export const sb = createClient(url, key, { auth: { persistSession: true } });
const $ = s => document.querySelector(s), app = $('#app');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', 2800); };
let user = null, profile = null, me = null;
let teamMemberships = [];
const offlineDownloads = createOfflineDownloads({ sb, url, toast });
offlineDownloads.bind();
const CTX = () => ({ sb, app, $, esc, toast, go, getUser: () => user, getMe: () => me, url, offlineButton: offlineDownloads.button });
let LG; const lg = async () => LG ||= await import('/legal.js?v=1');
let PF; const pf = async () => PF ||= await import('/profile.js?v=11');
const PCTX = () => ({ ...CTX(), statsHTML, uploadAvatar, delBanner, setProfile: p => { profile = { ...profile, ...p }; try { localStorage.setItem('obi-me', JSON.stringify({ id: user.id, email: user.email, profile, me })); } catch {} }, getProfile: () => profile, reload: async () => { await loadSession(); await meReady; } });
let ST; const st = async () => ST ||= (await import('/studio.js?v=55')).createStudio(CTX());
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
teamMemberships = [];
// La identidad de la última sesión verificada solo sirve para preferencias y lectura
// local en modo avión. Al recuperar internet se valida la sesión real de Supabase.
if (!navigator.onLine) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('obi-me') || 'null'); } catch {}
  user = saved?.id ? { id: saved.id, email: saved.email || 'Cuenta sin conexión' } : null;
  profile = user ? saved.profile || null : null;
  me = user ? saved.me || null : null;
  meReady = Promise.resolve();
  window.obiSetUI(profile?.ui_prefs || {});
  if (!user) window.obiSetBlocks([]);
  drawSession();
  return;
}
const { data } = await sb.auth.getSession(); user = data.session?.user || null;
if (!user) { profile = me = null; window.obiSetUI({}); window.obiSetBlocks([]); drawSession(); meReady = Promise.resolve(); return; }
try { const c = JSON.parse(localStorage.getItem('obi-me') || 'null'); if (c?.id === user.id) ({ profile, me } = c); else profile = me = null; } catch {}
// Aplicar solo los ajustes de la identidad verificada, incluso si no tiene ajustes.
window.obiSetUI(profile?.ui_prefs || {});
drawSession();
const uid = user.id;
meReady = Promise.all([sb.rpc('my_profile'), sb.rpc('whoami'), sb.from('team_members').select('teams(id,slug)').eq('user_id', uid)]).then(([p, w, memberships]) => {
  if (user?.id !== uid) return; profile = p.data; me = w.data || null;
  teamMemberships = (memberships.data || []).map(m => m.teams).filter(t => t?.id && t?.slug);
  if (profile?.ui_prefs && Object.keys(profile.ui_prefs).length) window.obiSetUI(profile.ui_prefs);
  else window.obiSetUI({});
  sb.rpc('my_blocks').then(({ data }) => { if (user?.id === uid && Array.isArray(data)) window.obiSetBlocks(data); });
  try { localStorage.setItem('obi-me', JSON.stringify({ id: uid, email: user.email, profile, me })); } catch {}
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
const currentGroup = () => teamMemberships.find(t => t.id === localStorage.getItem('obi-team')) || teamMemberships[0];
function drawSession(){
const pr = me?.platform_role || 'lector';
const ini = esc((profile?.username || user?.email || '?')[0].toUpperCase());
const cont = `<a class="ob-cont" id="ob-cont" href="/biblioteca" hidden><span class="k" aria-hidden="true">続</span><span class="t"><small>Continuar</small><b></b></span></a>`;
const h = cont + (user
? `<details class="ob-bell"><summary aria-label="Avisos"><span aria-hidden="true">鈴</span><em id="bell-n" hidden></em></summary><div class="ob-menu ob-nt" id="bell-list"><p class="mono">Cargando…</p></div></details><details class="ob-user"><summary aria-label="Menú de cuenta"><span class="ob-av">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : ini}</span></summary><div class="ob-menu"><div class="who2"><strong>${esc(profile?.username || user.email)}</strong><small>${RL[pr]}${profile?.donor_tier ? ' · 援 Donador' : ''}</small></div><a href="/perfil">Mi perfil</a>${teamMemberships.length ? '<a href="/mi-equipo">Perfil grupal</a>' : ''}<a href="/biblioteca">Mi biblioteca</a><a href="/preferencias">Preferencias</a><button type="button" data-install ${canInstall() ? '' : 'hidden'}>Instalar la app</button>${pr === 'bibliotecario' ? '<a href="/bibliotecario">Mostrador del Bibliotecario</a>' : ''}${pr !== 'lector' ? '<a href="/estudio">Estudio</a>' : '<a href="/solicitud">Crear mi grupo traductor</a>'}<button id="out">Salir</button></div></details>`
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
  if (CB.u !== (user?.id || null)) el.hidden = true;
  if (force || Date.now() - CB.t > 20000 || CB.u !== (user?.id || null)) {
    const requester = user?.id || null, request = { t: Date.now(), v: null, u: requester };
    CB = request; let best = null;
    try { const prefix=readingProgressPrefix(requester); for (const k of readerProgressKeys(localStorage, requester)) { const l = JSON.parse(localStorage.getItem(k)); if (l?.num && (!best || new Date(l.at || 0) > new Date(best.at || 0))) best = { sid: k.slice(prefix.length), num: l.num, pct: l.pct, at: l.at || 0 }; } } catch {}
    try { if (requester) { const { data } = await sb.from('reading_progress').select('series_id,chapter_num,pct,updated_at,series(slug,title)').eq('user_id', requester).order('updated_at', { ascending: false }).limit(1); const r = data?.[0]; if (r && (!best || new Date(r.updated_at) >= new Date(best.at || 0))) best = { sid: r.series_id, num: r.chapter_num, pct: r.pct, at: r.updated_at, slug: r.series?.slug, title: r.series?.title }; }
      if (best && !best.slug && CB === request && sameReaderAccount(user?.id, requester)) { const { data } = await sb.from('series').select('slug,title').eq('id', best.sid).maybeSingle(); Object.assign(best, data || {}); } } catch {}
    if (CB !== request || (user?.id || null) !== requester) return;
    CB.v = best?.slug ? best : null;
  }
  if (CB.u !== (user?.id || null)) return;
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
async function groupProfile(){
  if (!user) return go('/entrar');
  await meReady;
  const group = currentGroup();
  if (!group) { app.innerHTML = '<h1>Perfil grupal</h1><p>Aún no perteneces a ningún grupo traductor.</p><p><a class="btn ghost" href="/">Volver al inicio</a></p>'; return; }
  history.replaceState({}, '', '/equipo/' + encodeURIComponent(group.slug));
  return render();
}
const routes = {
'/mi-equipo': groupProfile,
'/': () => ui().home(), '/catalogo': () => ui().catalog(), '/calendario': async () => (await ag()).agenda(CTX()), '/ranking': () => ui().ranking(), '/lanzamientos': async () => (await ag()).agenda(CTX()), '/biblioteca': library, '/apoyar': support, '/entrar': () => login('in'), '/registro': () => login('up'), '/restablecer': resetPassword, '/perfil': perfil, '/preferencias': async () => (await pf()).preferences(PCTX()), '/buscar': () => ui().search(), '/solicitud': solicitud, '/elige-nombre': chooseName, '/privacidad': async () => (await lg()).privacy(app), '/condiciones-servicio': async () => (await lg()).terms(app),
'/invitacion': async () => (await import('/team-invitations.js?v=1')).renderTeamInvitation({ sb, app, esc, toast, go }),
'/bibliotecario': async () => (await ad()).render(), '/admin': async () => { history.replaceState({}, '', '/bibliotecario'); (await ad()).render(); },
};
export function go(path){ history.pushState({}, '', path); render(); }
document.addEventListener('click', e => { const a = e.target.closest('a[href^="/"]'); if (a && !a.target) { e.preventDefault(); go(a.getAttribute('href')); } });
addEventListener('popstate', render);
document.addEventListener('click', e => { document.querySelectorAll('.ob-user[open],.ob-bell[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
let PS = null; const seasons = async () => PS ||= await import('/season.js?v=5');
addEventListener('obi-season', () => { afterRender(); });
// Se dibuja la página sin esperar la temporada; afterRender la aplica cuando llega.
function render(){
  // En la lectura offline no iniciar cargas decorativas ni peticiones a Supabase.
  if (navigator.onLine) seasons().then(S => { S.clear(); S.load(sb); }).catch(() => {});
  return render0().catch(e => { if (!navigator.onLine || /Failed to fetch|NetworkError|Load failed|network/i.test(e?.message || '')) return offlinePage(); throw e; })
    .then(r => { installPublicShare(); if (navigator.onLine) { contBtn(); return afterRender(r); } return r; });
}
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
addEventListener('online', () => { netBanner();
  // Revalidar la identidad antes de sincronizar cualquier progreso pendiente.
  loadSession().then(() => { ui().refreshBadge(); if (user) return rd().syncPending().then(n => { if (n) toast('Tu progreso sin conexión ya se guardó en tu cuenta'); }); }).catch(e => console.warn('sesión reconectada', e));
});
if (!navigator.onLine) netBanner();
let seasonApplySeq = 0;
async function afterRender(){
  const seq = ++seasonApplySeq, route = location.pathname + location.search;
  const S = await seasons(); await S.load(sb);
  if (seq !== seasonApplySeq || route !== location.pathname + location.search) return;
  const p = location.pathname; let m;
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
// Al regresar a Safari desde segundo plano, la configuración del Bibliotecario
// pudo cambiar en otra pestaña. Refrescar solo los adornos, sin volver a pintar la página.
let seasonResumeAt = 0;
async function resumeSeasonTheme(){
  if (!navigator.onLine || document.hidden || Date.now() - seasonResumeAt < 30000) return;
  seasonResumeAt = Date.now();
  try {
    const S = await seasons();
    await S.load(sb, true);
    await afterRender();
  } catch (e) { console.warn('temporada al regresar', e); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) void resumeSeasonTheme(); });
addEventListener('pageshow', e => { if (e.persisted) void resumeSeasonTheme(); });

async function render0(){
const p = location.pathname; let m;
scrollTo(0, 0); document.body.classList.remove('in-studio');
if (p === '/descargas' || (!navigator.onLine && !p.startsWith('/leer/'))) return offlinePage();
if (p.startsWith('/estudio') || p === '/perfil' || p === '/preferencias' || p === '/solicitud') await meReady;
if ((m = p.match(/^\/serie\/([\w-]+)$/))) return ui().series(m[1]);
if ((m = p.match(/^\/leer\/([\w-]+)\/(\d+)$/))) { reportHomeRead(sb,p); return rd().open(m[1], +m[2]); }
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
if (p === '/estudio/difusion') return (await st()).diffusion();
if (p === '/estudio/estadisticas') return (await st()).stats();
if (p === '/estudio/descargas') return (await st()).downloads();
if ((m = p.match(/^\/estudio\/glosario(?:\/([\w-]+))?$/))) return (await st()).glossary(m[1]);
return (routes[p] || notFound)();
}
const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
const LB_CSS = `
.lb-tabs{display:flex;gap:12px;overflow-x:auto;border-bottom:1px solid #2f2a20;margin:0 0 18px;scrollbar-width:none}
.lb-tab-group{display:flex;align-items:stretch;gap:0;flex:none;min-width:0}
.lb-tab-tools{border-left:1px solid #58472f;padding-left:12px}
.lb-pending-explain{margin:0 0 18px;padding:11px 14px;border-left:3px solid var(--gold);background:#201a11;color:#e4d8bd;font:14px/1.6 'IBM Plex Sans',sans-serif}
.lb-pending-explain[hidden]{display:none!important}
@media(max-width:700px){.lb-tabs{gap:8px;margin-bottom:10px}.lb-tab-tools{padding-left:8px}}.lb-tabs a{flex:none;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;color:#a89f8a;text-decoration:none;border-bottom:2px solid transparent;font-weight:600}
.lb-tabs a.on{color:var(--paper);border-color:var(--gold)}.lb-tabs a em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:1px 6px;background:#2f2a20;color:var(--paper)}.lb-tabs a.on em{background:var(--gold);color:#0d0c0a}
.lb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:26px 18px}
.lb-c{display:grid;gap:8px;align-content:start;color:var(--paper);text-decoration:none}.lb-c:hover{color:var(--paper)}.lb-c .cv{position:relative;aspect-ratio:2/3;background:#1c1a14 center/cover no-repeat;border:1px solid #2f2a20;transition:transform .25s}.lb-c:hover .cv{transform:translateY(-4px)}
.lb-c .cv.no{display:flex;align-items:flex-end;padding:10px;font-family:'Shippori Mincho B1',serif;background:linear-gradient(160deg,var(--c),#16140f)}
.lb-c .cv em{position:absolute;top:8px;right:0;padding:2px 8px;background:var(--gold);color:#0d0c0a;font:700 11px/1.3 'IBM Plex Mono',monospace;font-style:normal}.lb-c .cv em.ok{background:#a9d18e}
.lb-c .bar{height:3px;background:#2f2a20}.lb-c .bar i{display:block;height:100%;background:var(--gold)}.lb-c b{font-size:14px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lb-c small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}
.lb-av{display:grid;max-width:720px}.lb-ai{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid #221f18}.lb-ai a{color:var(--paper);font-weight:600;text-decoration:none}.lb-ai a:hover{color:var(--gold)}@media(max-width:560px){.lb-ai{grid-template-columns:1fr auto}.lb-ai a{grid-column:1/-1}}
.lb-ai{grid-template-columns:minmax(0,1fr) auto auto auto}
@media(max-width:560px){.lb-ai{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}.lb-ai>a{grid-column:1/-1}.lb-ai>[data-unf]{grid-column:1/-1;justify-self:start}}
.lb-empty{padding:28px;border:1px dashed #3d3628;color:#a89f8a;display:grid;gap:12px;justify-items:start}.lb-h{display:grid;gap:0}.lb-h a{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:10px 0;border-bottom:1px solid #221f18;color:var(--paper);text-decoration:none;font-size:14px}.lb-h a:hover{color:var(--gold)}.lb-h .mono{font-size:12px}
.st-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin:14px 0}.st-k{padding:16px;border:1px solid #2f2a20;background:#16140f;display:grid;gap:4px}.st-k b{font-family:'Shippori Mincho B1',serif;font-size:32px;font-weight:500;color:var(--gold);line-height:1}.st-k span{font-size:13px;color:#a89f8a}
.st-gen{display:grid;gap:8px;max-width:520px}.st-gen div{display:grid;grid-template-columns:140px minmax(0,1fr) 40px;gap:10px;align-items:center;font-size:14px}.st-gen i{height:8px;background:var(--gold)}.st-gen small{font-family:'IBM Plex Mono',monospace;color:#a89f8a;text-align:right}

/* Mi biblioteca: el mismo lenguaje editorial de Inicio y Ranking, con portadas completas. */
.lb-tabs{position:relative;flex-wrap:nowrap;align-items:stretch;scrollbar-width:thin;scrollbar-color:#67512e transparent;scroll-padding-inline:12px;margin-bottom:8px}
.lb-tabs a{white-space:nowrap;gap:7px;min-height:48px}.lb-tabs a:focus-visible{outline:2px solid var(--gold);outline-offset:-3px}
.lb-navhelp{display:none;font:11px/1.5 'IBM Plex Mono',monospace;color:var(--mute);margin:0 0 21px}
.lb-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(155px,205px);gap:12px;align-items:end;margin:0 0 16px;max-width:950px}
.lb-toolbar label{display:grid;gap:7px;font-size:12px;font-weight:600;color:var(--mute);min-width:0}
.lb-toolbar input,.lb-toolbar select{width:100%;min-height:45px;min-width:0;background:#16140f;border:1px solid #5f4e32;color:var(--paper);padding:9px 12px;border-radius:4px;font:inherit;font-size:14px}
.lb-toolbar :is(input,select):focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.lb-match-count{margin:0 0 14px;font:12px 'IBM Plex Mono',monospace;color:var(--mute)}
.lb-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,285px),1fr));gap:16px;align-items:stretch}
.lb-card{display:grid;grid-template-columns:clamp(86px,10vw,116px) minmax(0,1fr);gap:14px;align-items:start;padding:14px;background:#19160f;border:1px solid #4a3b27;border-left:3px solid #b9913b;border-radius:5px;min-width:0;container-type:inline-size}
.lb-card:hover{border-color:#a88b54}
.lb-cover-link{display:block;min-width:0;border:1px solid #514029;background:#100e0b;overflow:hidden;aspect-ratio:2/3;text-decoration:none}
.lb-cover-link img{display:block;width:100%;height:100%;object-fit:contain;object-position:center}
.lb-cover-fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:8px;overflow-wrap:anywhere;text-align:center;font-family:'Shippori Mincho B1',serif;font-size:12px;background:linear-gradient(145deg,var(--c,#483c2b),#100e0b);color:var(--paper)}
.lb-card-body{min-width:0;display:grid;gap:8px;align-content:start}
.lb-title{font-size:15px;font-weight:650;line-height:1.35;color:var(--paper);text-decoration:none;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.lb-title:hover,.lb-title:focus-visible{color:var(--gold)}
.lb-card .ui-credits{max-width:100%}
.lb-label{display:inline-flex;align-items:center;min-height:22px;max-width:max-content;padding:2px 7px;border:1px solid #826b41;color:#d8c296;font:600 10px/1.4 'IBM Plex Mono',monospace}
.lb-label.finished{border-color:#6b9270;color:#addbb0}
.lb-label.pending{border-color:#a78954;color:#f2c230}
.lb-card-sub{color:#d0c3a8;font:12px/1.5 'IBM Plex Sans',sans-serif;overflow-wrap:anywhere}
.lb-progress{display:grid;gap:5px;min-width:0}
.lb-progress-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 8px;color:#c9b99a;font:11px/1.4 'IBM Plex Mono',monospace}
.lb-progress-track{display:block;height:6px;background:#3c3122;border-radius:8px;overflow:hidden}
.lb-progress-track i{display:block;height:100%;max-width:100%;background:var(--gold);border-radius:8px}
.lb-card-cta{display:inline-flex;align-items:center;justify-content:center;min-height:42px;text-align:center;padding:9px 12px;color:#14110b!important;background:var(--gold);border:1px solid var(--gold);border-radius:3px;font:700 12px/1.3 'IBM Plex Sans',sans-serif;text-decoration:none}
.lb-card-cta:hover{background:#f6d875}
.lb-card-hide{justify-self:start;min-height:36px;padding:5px 0;border:0;background:none;color:#bcb19e;font:12px 'IBM Plex Sans',sans-serif;cursor:pointer;text-align:left}
.lb-card-hide:hover{text-decoration:underline;color:var(--gold)}
.lb-card :is(a,button):focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.lb-empty{max-width:720px;padding:22px;border:1px dashed #6d5833;border-radius:4px}
.lb-history-more{margin:18px 0;min-height:44px}
.lb-error{max-width:760px;padding:20px;border:1px solid #c67d52;background:#211810;display:grid;gap:11px}
.lb-error strong{color:#ffd2b8}.lb-error p{margin:0;font-size:14px;color:#e0cfb9;line-height:1.5}
.lb-av .lb-ai{min-height:65px}.lb-av :is(button,input):focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.lb-read-toggle{justify-self:start;min-height:44px;padding:9px 13px;border:1px solid #a88b54;border-radius:3px;background:#251d10;color:#f3cd78;text-align:left;font:700 12px/1.35 'IBM Plex Sans',sans-serif;cursor:pointer}
.lb-read-toggle:hover:not(:disabled),.lb-read-toggle:focus-visible{background:#3b2a13;border-color:var(--gold);outline:2px solid var(--gold);outline-offset:2px}
.lb-read-toggle.is-read{color:#b1d8aa;border-color:#6e926b;background:#1a2b1c}
.lb-read-toggle:disabled{opacity:.55;cursor:progress}
.lb-read-feedback{display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px;margin:5px 0 16px;padding:12px 14px;background:#282112;border:1px solid #8e7239;color:#f1e5cc;font:13px/1.45 'IBM Plex Sans',sans-serif}
.lb-read-feedback[hidden]{display:none}
.lb-read-feedback button{min-height:44px;padding:8px 14px;border:1px solid var(--gold);border-radius:3px;color:#17120a;background:var(--gold);font:700 13px 'IBM Plex Sans',sans-serif;cursor:pointer}
.lb-read-feedback button:focus-visible{outline:2px solid var(--paper);outline-offset:3px}
@media(max-width:700px){.lb-navhelp{display:block}.lb-tabs{margin-bottom:7px}}
@media(max-width:480px){.lb-toolbar{grid-template-columns:1fr}.lb-grid{grid-template-columns:1fr;gap:13px}.lb-card{grid-template-columns:92px minmax(0,1fr);padding:12px;gap:12px}.lb-title{font-size:15px}.lb-cover-link{max-width:92px}}
@media(prefers-reduced-motion:reduce){.lb-card,.lb-cover-link img{transition:none}}
/* Vista editorial C/S3: solo Mi biblioteca. */
.lb-spotlight{display:grid;grid-template-columns:clamp(112px,14vw,172px) minmax(0,1fr);gap:clamp(14px,2.4vw,26px);align-items:center;padding:clamp(14px,2.5vw,24px);margin:4px 0 18px;background:linear-gradient(115deg,#291f12,#17120c);border:1px solid #806236;min-width:0}
.lb-spotlight-cover{display:block;max-width:172px;width:100%;aspect-ratio:2/3;border:1px solid #a18348;background:#130e09;overflow:hidden}
.lb-spotlight-cover img{display:block;width:100%;height:100%;object-fit:contain}
.lb-spotlight-fallback{display:grid;place-items:center;width:100%;height:100%;color:var(--gold);font:48px 'Shippori Mincho B1',serif}
.lb-spotlight-info{display:grid;gap:10px;min-width:0}
.lb-spotlight-kicker{font:700 11px/1.45 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--gold)}
.lb-spotlight-info h2{font:500 clamp(22px,2.8vw,33px)/1.2 'Shippori Mincho B1',serif;margin:0;overflow-wrap:anywhere}
.lb-spotlight-info h2 a{color:var(--paper);text-decoration:none}
.lb-spotlight-info p{font:13px/1.6 'IBM Plex Sans',sans-serif;color:#d1c5ab;margin:0}
.lb-spotlight-progress{height:7px;background:#4a3824;overflow:hidden}
.lb-spotlight-progress span{display:block;height:100%;background:var(--gold)}
.lb-spotlight-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;max-width:420px;background:var(--gold);color:#17120a!important;font:700 13px/1.4 'IBM Plex Sans',sans-serif;text-decoration:none;padding:10px 14px}
.lb-shelf-showcase{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:0 0 24px}
.lb-shelf-summary{position:relative;display:grid;gap:5px;align-content:center;min-width:0;min-height:125px;padding:16px;background:#19140e;border:1px solid #564328;color:var(--paper);text-decoration:none;overflow:hidden}
.lb-shelf-summary.on,.lb-shelf-summary:hover{border-color:var(--gold);background:#231a0e}
.lb-shelf-summary:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.lb-shelf-kanji{position:absolute;right:10px;top:7px;font:44px 'Shippori Mincho B1',serif;color:#796036;opacity:.65;pointer-events:none}
.lb-shelf-summary strong{font:500 31px/1.2 'Shippori Mincho B1',serif;color:var(--gold)}
.lb-shelf-summary-title{font:700 15px/1.3 'IBM Plex Sans',sans-serif}
.lb-shelf-summary small{font:12px/1.4 'IBM Plex Sans',sans-serif;color:#c3b69a;overflow-wrap:anywhere}
@media(min-width:1024px){.lb-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:18px}.lb-card{grid-template-columns:clamp(105px,10vw,128px) minmax(0,1fr);gap:16px;padding:16px}}
@media(max-width:760px){.lb-shelf-showcase{display:none}}
@media(max-width:390px){.lb-spotlight{grid-template-columns:84px minmax(0,1fr);gap:12px;padding:12px}.lb-spotlight-info{gap:7px}.lb-spotlight-info h2{font-size:20px}.lb-spotlight-info p{font-size:12px}.lb-spotlight-cta{padding:9px 8px;font-size:12px}}
@media(prefers-reduced-motion:reduce){.lb-spotlight,.lb-shelf-summary{transition:none}}

/* S3 escritorio: tres estantes simultáneos con portadas publicadas, sin duplicar lógica. */
.lb-collections-desktop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,1.5vw,22px);margin:0 0 28px;min-width:0}
.lb-collection{display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:14px;padding:clamp(12px,1.3vw,18px);min-width:0;background:#18140e;border:1px solid #65502c;border-top:3px solid #ba8d3a}
.lb-collection-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;min-width:0}
.lb-collection-head h2{font:500 clamp(19px,2vw,25px)/1.25 'Shippori Mincho B1',serif;margin:0}
.lb-collection-head p{font:12px/1.5 'IBM Plex Sans',sans-serif;color:#c6b69a;margin:6px 0 0;overflow-wrap:anywhere}
.lb-collection-count{flex:none;color:var(--gold);font:500 24px/1.2 'Shippori Mincho B1',serif}
.lb-collection-books{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-content:start;min-width:0}
.lb-collection-book{display:grid;grid-template-rows:auto 2.7em;gap:7px;min-width:0;color:var(--paper);text-decoration:none;font:600 11px/1.35 'IBM Plex Sans',sans-serif}
.lb-collection-book:focus-visible,.lb-collection-more:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.lb-collection-cover{display:grid;place-items:center;aspect-ratio:2/3;min-width:0;background:#211b12;border:1px solid #56412b;overflow:hidden}
.lb-collection-cover img{width:100%;height:100%;object-fit:contain}
.lb-collection-fallback{display:grid;place-items:center;width:100%;height:100%;padding:5px;color:#e9dcc6;font:500 11px/1.4 'Shippori Mincho B1',serif;overflow-wrap:anywhere;text-align:center}
.lb-collection-book-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
.lb-collection-book:hover .lb-collection-book-title{color:var(--gold)}
.lb-collection-empty{grid-column:1/-1;display:grid;place-items:center;min-height:130px;padding:12px;margin:0;text-align:center;color:#bfb197;border:1px dashed #483a2a;font:13px/1.5 'IBM Plex Sans',sans-serif}
.lb-collection-more{display:inline-flex;align-self:end;align-items:center;min-height:44px;color:var(--gold);font:700 12px/1.5 'IBM Plex Sans',sans-serif;text-decoration:underline;text-underline-offset:3px}
@media(max-width:959px){.lb-collections-desktop{display:none}}
@media(min-width:960px) and (max-width:1140px){.lb-collection-books{gap:7px}}



`;
const lbCss = () => { if (document.getElementById('lb-css')) return; const s = document.createElement('style'); s.id = 'lb-css'; s.textContent = LB_CSS; document.head.appendChild(s); };
let librarySeq = 0;
async function library(){
  if (!user) return go(new URLSearchParams(location.search).get('t') === 'offline' ? '/descargas' : '/entrar');
  const uid = user.id, seq = ++librarySeq;
  const live = () => seq === librarySeq && user?.id === uid && location.pathname === '/biblioteca';
  lbCss(); installCreditImageFallback();
  app.innerHTML = '<p class="mono" role="status" aria-live="polite">Cargando tu biblioteca…</p>';
  const TABS = [['leyendo','Leyendo'],['pendientes','Pendientes'],['terminadas','Terminadas'],['avisos','Avisos'],['offline','Sin conexión'],['historial','Historial']];
  const requested = new URLSearchParams(location.search).get('t');
  let tab = TABS.some(([k]) => k === requested) ? requested : 'leyendo';
  let prog = [], fol = [], readRows = [], ser = [], chs = [];
  try {
    await meReady; // preferencias y secciones ocultas pertenecen a la cuenta verificada
    if (!live()) return;
    // readPages recorre las páginas en orden estable y rechaza las respuestas incompletas.
    const [pr, fo, rc] = await Promise.all([
      readPages((from,to) => sb.from('reading_progress')
        .select('series_id,chapter_num,pct,updated_at').eq('user_id',uid).order('series_id').range(from,to)),
      readPages((from,to) => sb.from('follows')
        .select('series_id,channels').eq('user_id',uid).order('series_id').range(from,to)),
      readPages((from,to) => sb.from('read_chapters')
        .select('chapter_id,read_at,chapters!inner(series_id,deleted_at)')
        .eq('user_id',uid).is('chapters.deleted_at',null).order('chapter_id').range(from,to))
    ]);
    if (!live()) return;
    prog=pr.data;fol=fo.data;readRows=rc.data;
    const ids = [...new Set([...prog.map(r=>r.series_id),...fol.map(r=>r.series_id),
      ...readRows.map(r=>r.chapters?.series_id)].filter(Boolean))];
    // Lotes pequeños evitan URL excesivamente largas en los filtros .in().
    const batches=[];for(let i=0;i<ids.length;i+=80)batches.push(ids.slice(i,i+80));
    if (batches.length) {
      const [seriesBatches,chapterBatches] = await Promise.all([
        Promise.all(batches.map(group=>readPages((from,to)=>sb.from('series')
          .select('id,team_id,slug,title,short,cover_path,cover_thumb_path,translation_status,theme,teams(name,slug,color,avatar_path)')
          .in('id',group).eq('published',true).order('id').range(from,to)))),
        Promise.all(batches.map(group=>readPages((from,to)=>sb.from('chapters')
          .select('id,num,title,vol,volume_id,series_id,publish_at,status,deleted_at')
          .eq('status','published').is('deleted_at',null).in('series_id',group)
          .order('id').range(from,to))))
      ]);
      ser=seriesBatches.flatMap(x=>x.data);chs=chapterBatches.flatMap(x=>x.data);
    }
    if (!live()) return;
    // Los créditos no deben hacer desaparecer obras cuando falle una consulta complementaria.
    try { await attachPublicCredits(sb, ser || []); } catch(e){ console.warn('Créditos de biblioteca',e); }
  } catch(e) {
    if (!live()) return;
    console.warn('Mi biblioteca',e);
    app.innerHTML = `<div class="ui-cath"><div><h1>Mi biblioteca</h1><p>No se pudieron cargar tus lecturas.</p></div><span class="kj" aria-hidden="true">書庫</span></div>
      <div class="lb-error" role="alert"><strong>No pudimos cargar la biblioteca completa.</strong><p>No se han borrado tus libros ni tu progreso. Revisa tu conexión e inténtalo de nuevo.</p><button type="button" class="btn" id="lb-retry">Reintentar</button></div>`;
    $('#lb-retry').onclick = () => library();
    return;
  }
  if (!live()) return;
  let { lists:L, read, followed:F }=prepareLibrary({progress:prog,follows:fol,readRows,series:ser,chapters:chs});
  const chapterById=new Map(chs.map(c=>[c.id,c]));
  const worksById=new Map(ser.map(w=>[w.id,w]));
  const HID=new Set(profile?.hidden_series || []);
  const count = k => L[k]?.length ?? null;
  // Vista C: foco en una lectura REAL (nunca estadísticas ficticias).

  // S3: cada estantería muestra obras reales. Una obra puede estar en Leyendo y Pendientes.
  const SHELF_DEFS = [
    ['leyendo','Leyendo','Lecturas en curso'],
    ['pendientes','Pendientes','Capítulos pendientes de obras seguidas'],
    ['terminadas','Terminadas','Obras completas leídas']
  ];
  const shelfPreviewHtml = k => {
    const books = (L[k] || []).slice(0,3);
    if (!books.length) return '<p class="lb-collection-empty">Esta estantería todavía está vacía.</p>';
    return books.map(w => {
      const path = w.s.cover_path || w.s.cover_thumb_path;
      const picture = path ? '<img src="' + esc(MED(path)) + '" alt="" loading="lazy" decoding="async">'
        : '<span class="lb-collection-fallback">' + esc(w.s.short || w.s.title) + '</span>';
      return '<a class="lb-collection-book" href="/serie/' + encodeURIComponent(w.s.slug) +
        '" aria-label="Ver ficha de ' + esc(w.s.title) + '">' +
        '<span class="lb-collection-cover">' + picture + '</span>' +
        '<span class="lb-collection-book-title">' + esc(w.s.title) + '</span></a>';
    }).join('');
  };
  const desktopShelvesHTML = SHELF_DEFS.map(([k,label,help]) =>
    '<article class="lb-collection" data-collection="' + k + '">' +
    '<header class="lb-collection-head"><div><h2>' + label + '</h2><p>' + help + '</p></div>' +
    '<span class="lb-collection-count" aria-label="Obras: ' + (count(k) || 0) + '">' + (count(k) || 0) + '</span></header>' +
    '<div class="lb-collection-books">' + shelfPreviewHtml(k) + '</div>' +
    '<a class="lb-collection-more" href="/biblioteca' + (k === 'leyendo' ? '' : '?t=' + k) +
    '">Ver estantería completa →</a></article>'
  ).join('');
  const latest = L.leyendo[0] || null, latestChapter = latest?.resume;
  const latestHref = latest
    ? (latestChapter ? '/leer/' + encodeURIComponent(latest.s.slug) + '/' + latestChapter.num
      : '/serie/' + encodeURIComponent(latest.s.slug)) : '';
  const latestCoverPath = latest?.s?.cover_path || latest?.s?.cover_thumb_path;
  const latestCover = latestCoverPath
    ? '<img src="' + esc(MED(latestCoverPath)) + '" alt="" loading="lazy" decoding="async">'
    : '<span class="lb-spotlight-fallback" aria-hidden="true">帯</span>';
  const latestPct = latest?.tot ? Math.min(100,Math.max(0,Math.round(latest.nr / latest.tot * 100))) : 0;
  app.innerHTML = `<div class="ui-cath"><div><h1>Mi biblioteca</h1><p>${read.size.toLocaleString('es-MX')} capítulos leídos · ${F.size.toLocaleString('es-MX')} obras seguidas</p></div><span class="kj" aria-hidden="true">書庫</span></div>
  ${latest ? `<section class="lb-spotlight" aria-label="Reanudar última lectura">
    <a class="lb-spotlight-cover" href="${esc(latestHref)}" aria-label="Continuar ${esc(latest.s.title)}">${latestCover}</a>
    <div class="lb-spotlight-info"><span class="lb-spotlight-kicker">続読 · REANUDAR ÚLTIMA LECTURA</span>
      <h2><a href="${esc(latestHref)}">${esc(latest.s.title)}</a></h2>
      <p>${latestChapter ? 'Capítulo ' + esc(latestChapter.num) : 'Consultar ficha'} · ${latest.nr} de ${latest.tot} capítulos publicados leídos</p>
      <div class="lb-spotlight-progress" role="meter" aria-label="Capítulos publicados leídos" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${latestPct}"><span style="width:${latestPct}%"></span></div>
      <a class="lb-spotlight-cta" href="${esc(latestHref)}">Continuar donde quedaste →</a>
    </div></section>` : ''}
  <section class="lb-shelf-showcase" aria-label="Resumen de tus estanterías">
    ${[['leyendo','Leyendo','Lecturas en curso','読'],['pendientes','Pendientes','Capítulos sin leer de obras seguidas','未'],['terminadas','Terminadas','Obras completas leídas','済']].map(([k,title,desc,kanji]) =>
      `<a class="lb-shelf-summary${tab===k?' on':''}" data-shelf="${k}" href="/biblioteca${k==='leyendo'?'':'?t='+k}"${tab===k?' aria-current="page"':''}>
        <span class="lb-shelf-kanji" aria-hidden="true">${kanji}</span><strong>${count(k) || 0}</strong>
        <span class="lb-shelf-summary-title">${title}</span><small>${desc}</small></a>`).join('')}
  </section>
  <section class="lb-collections-desktop" aria-label="Obras de tus tres estanterías">
    ${desktopShelvesHTML}
  </section>
  <nav class="lb-tabs" aria-label="Secciones de Mi biblioteca"><div class="lb-tab-group lb-tab-shelves" role="group" aria-label="Estanterías">${TABS.slice(0,3).map(([k,label])=>`<a href="/biblioteca${k==='leyendo'?'':'?t='+k}" class="${k===tab?'on':''}"${k===tab?' aria-current="page"':''}>${label}${count(k)?`<em>${count(k)}</em>`:''}</a>`).join('')}</div><div class="lb-tab-group lb-tab-tools" role="group" aria-label="Herramientas de lectura">${TABS.slice(3).map(([k,label])=>`<a href="/biblioteca?t=${k}" class="${k===tab?'on':''}"${k===tab?' aria-current="page"':''}>${label}</a>`).join('')}</div></nav>
  <p id="lb-pending-explain" class="lb-pending-explain" ${tab==='pendientes'?'':'hidden'}>Pendientes reúne obras que sigues con capítulos publicados aún sin leer; no es una lista de deseos.</p>
  <p class="lb-navhelp">Desliza las pestañas para ver todas las secciones →</p>
  <div id="lb-read-feedback" class="lb-read-feedback" role="status" aria-live="polite" hidden></div>
  <div id="lb-body"></div>`;
  const box=$('#lb-body'), nav=app.querySelector('.lb-tabs');
  const COVER = w => {
    const c=w.s.theme?.color || w.s.teams?.color || '#76592e';
    const path=w.s.cover_path || w.s.cover_thumb_path;
    return path ? `<img src="${esc(MED(path))}" alt="" loading="lazy" decoding="async">`
      : `<span class="lb-cover-fallback" style="--c:${esc(c)}">${esc(w.s.short || w.s.title)}</span>`;
  };
  const card = (w,k) => {
    const chapter=k==='pendientes' ? w.nextU : w.resume;
    const href=chapter ? '/leer/'+encodeURIComponent(w.s.slug)+'/'+chapter.num : '/serie/'+encodeURIComponent(w.s.slug);
    const done=k==='terminadas', pending=k==='pendientes';
    const pct=w.tot ? Math.min(100,Math.max(0,Math.round(w.nr/w.tot*100))):0;
    const caughtUp=w.tot>0 && w.nr===w.tot;
    const label=done ? 'Completada' : caughtUp ? 'Al día con lo publicado' : pending ? (w.unread===1 ? '1 capítulo pendiente' : w.unread+' capítulos pendientes') : 'En progreso';
    const current=chapter ? 'Capítulo '+chapter.num : 'Ver obra';
    const status=done ? `${w.nr} capítulos leídos` : pending ? `Leer siguiente · ${current}` : `Continuar · ${current}${w.p?.pct > .02 && w.p?.pct < .95 ? ' · '+Math.round(w.p.pct*100)+' % del capítulo' : ''}`;
    return `<article class="lb-card">
      <a class="lb-cover-link" href="/serie/${esc(w.s.slug)}" aria-label="Ver ficha de ${esc(w.s.title)}">${COVER(w)}</a>
      <div class="lb-card-body"><span class="lb-label${done?' finished':pending?' pending':''}">${label}</span>
        <a class="lb-title" href="/serie/${esc(w.s.slug)}">${esc(w.s.title)}</a>
        ${creditsHTML(w.s, { esc, media: MED, mode: 'carousel' })}
        <span class="lb-card-sub">${esc(status)}</span>
        <div class="lb-progress" aria-label="${w.nr} de ${w.tot} capítulos disponibles leídos; ${pct} por ciento">
          <span class="lb-progress-head"><span>${w.nr} de ${w.tot} capítulos</span><span>${pct} %</span></span>
          <span class="lb-progress-track" aria-hidden="true"><i style="width:${pct}%"></i></span>
        </div>
        <a class="lb-card-cta" href="${esc(href)}">${done?'Ver la obra':pending?'Leer siguiente capítulo':'Continuar leyendo'}</a>
        <div class="lb-offline-actions" role="group" aria-label="Descargas sin conexión de ${esc(w.s.title)}">
          ${offlineDownloads.button({slug:w.s.slug,scope:'series'})}
          ${chapter ? offlineDownloads.button({slug:w.s.slug,scope:'chapter',num:chapter.num}) : ''}
        </div>
        ${w.tot ? `<button type="button" class="lb-read-toggle${caughtUp?' is-read':''}" data-read-work="${esc(w.s.id)}" data-read-mark="${caughtUp?'0':'1'}" aria-label="${caughtUp?'Desmarcar capítulos leídos':'Marcar novela como leída'}: ${esc(w.s.title)}">${caughtUp?'↶ Desmarcar lectura':'✓ Marcar novela como leída'}</button>` : ''}
        <span class="lb-card-sub">${caughtUp&&!done?'Al día con los capítulos publicados · la obra continúa en traducción.':'Puedes marcar lo publicado sin cambiar dónde pausaste.'}</span>
        <button type="button" class="lb-card-hide" data-hide="${esc(w.s.id)}">${HID.has(w.s.id)?'Mostrar en mi perfil':'Ocultar de mi perfil público'}</button>
      </div></article>`;
  };
  const EMPTY = {
    leyendo:'Cuando abras un capítulo, podrás continuar su lectura desde aquí.',
    pendientes:'Sigue una obra desde su ficha: cuando tenga capítulos sin leer, aparecerá aquí.',
    terminadas:'Aquí aparecen las obras completas cuyos capítulos publicados ya leíste.'
  };
  // Acciones directas en cada ficha, sin menús ni ventanas emergentes adicionales.
  // La confirmación nativa solo aparece antes de alterar muchos registros de lectura.
  const notice=app.querySelector('#lb-read-feedback');
  let busy=false, undoState=null;
  const refreshReadViews = () => {
    ({ lists:L, read, followed:F }=prepareLibrary({progress:prog,follows:fol,readRows,series:ser,chapters:chs}));
    const total=app.querySelector('.ui-cath p');
    if(total)total.textContent=`${read.size.toLocaleString('es-MX')} capítulos leídos · ${F.size.toLocaleString('es-MX')} obras seguidas`;
    app.querySelectorAll('.lb-shelf-summary[data-shelf]').forEach(a => {
      const number = a.querySelector('strong');
      if (number) number.textContent = String(count(a.dataset.shelf) || 0);
    });
    app.querySelectorAll('.lb-collection[data-collection]').forEach(section => {
      const k = section.dataset.collection;
      const number = section.querySelector('.lb-collection-count');
      const grid = section.querySelector('.lb-collection-books');
      if (number) {
        number.textContent = String(count(k) || 0);
        number.setAttribute('aria-label', 'Obras: ' + (count(k) || 0));
      }
      if (grid) grid.innerHTML = shelfPreviewHtml(k);
    });
    // Mantener el resumen de lectura al día tras marcar capítulos como leídos.
    const current = L.leyendo[0], spotlight = app.querySelector('.lb-spotlight');
    if (spotlight && !current) spotlight.remove();
    else if (spotlight && current) {
      if (spotlight.querySelector('h2 a')?.textContent !== current.s.title) spotlight.remove();
      else {
        const next = current.resume;
        const href = next ? '/leer/' + encodeURIComponent(current.s.slug) + '/' + next.num
          : '/serie/' + encodeURIComponent(current.s.slug);
        const pct = current.tot ? Math.min(100, Math.max(0, Math.round(current.nr/current.tot*100))) : 0;
        const summary = spotlight.querySelector('.lb-spotlight-info p');
        if (summary) summary.textContent = (next ? 'Capítulo ' + next.num : 'Consultar ficha') +
          ' · ' + current.nr + ' de ' + current.tot + ' capítulos publicados leídos';
        const meter = spotlight.querySelector('.lb-spotlight-progress');
        if (meter) {
          meter.setAttribute('aria-valuenow', String(pct));
          meter.querySelector('span')?.style.setProperty('width', pct + '%');
        }
        spotlight.querySelectorAll('a').forEach(a => { a.href = href; });
      }
    }
    nav.querySelectorAll('a').forEach(a=>{
      const k=new URL(a.href,location.origin).searchParams.get('t')||'leyendo';
      const n=count(k),em=a.querySelector('em');
      if(!n)em?.remove();
      else if(em)em.textContent=n;
      else a.insertAdjacentHTML('beforeend','<em>'+n+'</em>');
    });
    const query=box.querySelector('#lb-search')?.value||'';
    const order=box.querySelector('#lb-order')?.value||'';
    void paintTab(tab).then(()=>{
      if(!live())return;
      const input=box.querySelector('#lb-search'),sel=box.querySelector('#lb-order');
      if(input){input.value=query;if(sel&&order)sel.value=order;input.dispatchEvent(new Event('input'));}
    });
  };
  const renderUndo = () => {
    if(!undoState){notice.hidden=true;notice.textContent='';return;}
    notice.hidden=false;
    notice.innerHTML=`<span>${esc(undoState.message)}</span><button type="button" id="lb-read-undo">Deshacer</button>`;
    notice.querySelector('#lb-read-undo').onclick=()=>{
      if(!undoState||busy||!live())return;
      void runReadMutation(undoReadingChanges(undoState.changes),'Se deshizo el cambio',true);
    };
  };
  const runReadMutation = async (changes,message,isUndo=false) => {
    if(busy||!changes.length||!live())return;
    busy=true;
    box.querySelectorAll('[data-read-work]').forEach(b=>b.disabled=true);
    notice.querySelectorAll('button').forEach(b=>b.disabled=true);
    try {
      await persistReadingChanges(sb,uid,changes);
      if(!live())return;
      readRows=applyReadingChanges(readRows,chapterById,changes);
      undoState=isUndo?null:{changes,message};
      refreshReadViews();
      renderUndo();
      toast(message);
    } catch(error){
      console.warn('Marcas de lectura',error);
      undoState=null;
      // Una operación por lotes puede fallar a la mitad: usar el estado real del servidor.
      try {
        const {data}=await readPages((from,to)=>sb.from('read_chapters')
          .select('chapter_id,read_at,chapters!inner(series_id,deleted_at)')
          .eq('user_id',uid).is('chapters.deleted_at',null).order('chapter_id').range(from,to));
        if(live()){readRows=data;refreshReadViews();}
      }catch(e){if(live())void library();}
      if(live()){renderUndo();toast('No se pudo completar el cambio. Comprueba tu biblioteca e inténtalo de nuevo.');}
    } finally {
      busy=false;
      if(live())box.querySelectorAll('[data-read-work]').forEach(b=>b.disabled=false);
    }
  };
  const toggleWholeWork=async(id,mark)=>{
    if(!live()||busy)return;
    const series=worksById.get(id);
    if(!series)return;
    const ids=readingGroups(id,chs).flatMap(g=>g.chapters.map(c=>c.id));
    const changes=planReadingChanges(ids,readRows,mark);
    if(!changes.length)return;
    const n=changes.length, unit=n===1?'capítulo':'capítulos';
    const question=mark
      ? `¿Marcar como leídos los ${n} ${unit} pendientes de «${series.title}»? Solo se incluyen los capítulos publicados hasta hoy. Podrás deshacerlo.`
      : `¿Desmarcar los ${n} ${unit} leídos de «${series.title}»? Se actualizarán tus estadísticas. Podrás deshacerlo.`;
    if(!await confirmObi(question))return;
    void runReadMutation(changes,(mark?'Marcados':'Desmarcados')+' '+n+' '+unit);
  };

  let tabRequest=0;
  const paintTab = async next => {
    if (!live()) return;
    tab=next;
    app.querySelectorAll('.lb-shelf-summary[data-shelf]').forEach(a => {
      const active = a.dataset.shelf === tab;
      a.classList.toggle('on', active);
      if (active) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    const explanation = app.querySelector('#lb-pending-explain');
    if (explanation) explanation.hidden = tab !== 'pendientes';
    const request=++tabRequest;
    nav.querySelectorAll('a').forEach(a=>{
      const k=new URL(a.href,location.origin).searchParams.get('t')||'leyendo';
      a.classList.toggle('on',k===tab);
      k===tab ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current');
    });
    if(L[tab]){
      const defaultOrder=tab==='terminadas'?'titulo':'recientes';
      box.innerHTML=`<div class="lb-toolbar"><label>Buscar en esta sección<input id="lb-search" type="search" placeholder="Título u organización" autocomplete="off" aria-controls="lb-results"></label>
        <label>Ordenar por<select id="lb-order" aria-controls="lb-results"><option value="recientes">Actividad reciente</option><option value="titulo">Título (A–Z)</option><option value="progreso">Progreso leído</option><option value="nuevos">Más capítulos pendientes</option></select></label></div>
        <p class="lb-match-count" id="lb-match-count" role="status"></p><div id="lb-results"></div>`;
      const input=box.querySelector('#lb-search'), sort=box.querySelector('#lb-order'), results=box.querySelector('#lb-results');
      sort.value=defaultOrder;
      const repaint=()=>{
        const filtered=selectLibraryItems(L[tab],{query:input.value,order:sort.value,tab});
        box.querySelector('#lb-match-count').textContent=`${filtered.length} de ${L[tab].length} obras`;
        results.innerHTML=filtered.length ? `<div class="lb-grid">${filtered.map(w=>card(w,tab)).join('')}</div>`
          : `<div class="lb-empty"><span>${L[tab].length?'No hay resultados con esta búsqueda.':EMPTY[tab]}</span>${L[tab].length?'<button type="button" class="btn ghost" id="lb-reset">Limpiar búsqueda</button>':'<a class="btn ghost" href="/catalogo">Explorar el catálogo</a>'}</div>`;
        results.querySelector('#lb-reset')?.addEventListener('click',()=>{input.value='';repaint();input.focus();});
        results.querySelectorAll('[data-read-work]').forEach(b=>b.onclick=()=>toggleWholeWork(b.dataset.readWork,b.dataset.readMark==='1'));
        results.querySelectorAll('[data-hide]').forEach(b=>b.onclick=async()=>{
          if(b.disabled)return; b.disabled=true;const id=b.dataset.hide,on=!HID.has(id);
          const proposed=new Set(HID);on?proposed.add(id):proposed.delete(id);
          try {
            const {error}=await sb.from('profiles').update({ hidden_series:[...proposed] }).eq('id',uid);
            if(error)throw error;
            if(!live())return;
            HID.clear();proposed.forEach(x=>HID.add(x));
            if(profile?.hidden_series)profile.hidden_series=[...HID];
            b.textContent=on?'Mostrar en mi perfil':'Ocultar de mi perfil público';
            toast(on?'Oculta de tu perfil público':'Visible en tu perfil público');
          } catch(e){toast('No se pudo guardar la visibilidad. Inténtalo de nuevo.');}
          finally{b.disabled=false;}
        });
      };
      input.oninput=repaint;sort.onchange=repaint;repaint();
    } else if(tab==='avisos'){
      const FL=fol.map(r=>({r,s:ser.find(x=>x.id===r.series_id)})).filter(x=>x.s).sort((a,b)=>a.s.title.localeCompare(b.s.title,'es'));
      box.innerHTML=FL.length?`<p class="mono" style="margin:0 0 14px;font-size:13px">Elige si quieres recibir avisos de capítulos y de volúmenes completos en cada obra que sigues. <a href="/preferencias?s=avisos">Más opciones de avisos y correo</a>.</p>
        <div class="lb-av">${FL.map(({r,s})=>`<div class="lb-ai"><a href="/serie/${esc(s.slug)}">${esc(s.title)}</a>
          <label class="ui-tog"><input type="checkbox" data-av="${esc(s.id)}" data-av-channel="web" ${r.channels?.web!==false&&r.channels?.chapters!==false?'checked':''}> Capítulos</label>
          <label class="ui-tog"><input type="checkbox" data-av="${esc(s.id)}" data-av-channel="volumes" ${r.channels?.volumes!==false?'checked':''}> Volúmenes</label>
          <button type="button" class="ui-lnk" data-unf="${esc(s.id)}">Dejar de seguir</button></div>`).join('')}</div>`
        :'<div class="lb-empty">Aún no sigues ninguna obra. Usa «Seguir serie» en su ficha.</div>';
      box.querySelectorAll('[data-av]').forEach(i=>i.onchange=async()=>{
        const r=fol.find(x=>x.series_id===i.dataset.av);
        if(!r)return;
        const key=i.dataset.avChannel;
        if(!['web','volumes'].includes(key))return;
        const ch={...(r.channels||{}),[key]:i.checked};
        if(key==='web')ch.chapters=i.checked;
        i.disabled=true;
        try{
          const {error}=await sb.from('follows').update({channels:ch}).eq('user_id',uid).eq('series_id',i.dataset.av);
          if(error)throw error;
          r.channels=ch;toast(i.checked?'Avisos activados para esta obra':'Avisos desactivados para esta obra');
        }catch(e){i.checked=!i.checked;toast('No se pudieron guardar los avisos.');}
        finally{i.disabled=false;}
      });
      box.querySelectorAll('[data-unf]').forEach(b=>b.onclick=async()=>{
        if(!await confirmObi('¿Dejar de seguir esta obra?'))return;
        b.disabled=true;
        try{const {error}=await sb.from('follows').delete().eq('user_id',uid).eq('series_id',b.dataset.unf);if(error)throw error;toast('Ya no sigues esta obra');if(live())library();}
        catch(e){b.disabled=false;toast('No se pudo dejar de seguir la obra.');}
      });
    } else if(tab==='offline') {
      box.innerHTML=`<div id="off">${rd().offlineList()}</div>`;
      rd().bindOfflineList($('#off'),()=>{if(live())paintTab('offline');});
    } else {
      box.innerHTML='<p class="mono" role="status">Cargando historial…</p>';
      const pageSize=30, all=[];
      const drawHistory=()=>{
        box.innerHTML=all.length?`<div class="lb-h">${all.map(h=>`<a href="/leer/${esc(h.chapters.series.slug)}/${h.chapters.num}">
          <span class="mono">${new Date(h.opened_at).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</span>
          <span>${esc(h.chapters.series.title)} · ${esc(h.chapters.title)}</span></a>`).join('')}</div><button type="button" id="lb-history-more" class="btn ghost lb-history-more">Cargar más visitas</button>`
          :'<div class="lb-empty">Aún no tienes visitas registradas en el historial.</div>';
        const more=box.querySelector('#lb-history-more');
        if(more){if(all.length%pageSize!==0)more.remove();else more.onclick=()=>fetchHistory();}
      };
      const fetchHistory=async()=>{
        try{
          const data=await rd().historyList({offset:all.length,limit:pageSize});
          if(!live()||request!==tabRequest)return;
          all.push(...data);drawHistory();
          if(data.length<pageSize)box.querySelector('#lb-history-more')?.remove();
        } catch(e){
          if(!live()||request!==tabRequest)return;
          if(all.length){box.querySelector('#lb-history-more')?.remove();}
          box.insertAdjacentHTML('beforeend','<div class="lb-error" role="alert"><strong>No se pudo cargar el historial.</strong><button class="btn ghost" id="lb-history-retry">Reintentar</button></div>');
          box.querySelector('#lb-history-retry').onclick=()=>{box.querySelector('.lb-error')?.remove();fetchHistory();};
        }
      };
      await fetchHistory();
    }
  };
  nav.addEventListener('click',e=>{
    const a=e.target.closest('a');if(!a)return;
    const url=new URL(a.href,location.origin);
    if(url.pathname!=='/biblioteca')return;
    e.preventDefault();e.stopPropagation();
    history.pushState({},'',url.pathname+url.search);
    paintTab(url.searchParams.get('t')||'leyendo');
  });
  app.querySelector('.lb-shelf-showcase')?.addEventListener('click', e => {
    const link = e.target.closest('a[data-shelf]');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    const target = link.dataset.shelf;
    history.pushState({}, '', target === 'leyendo' ? '/biblioteca' : '/biblioteca?t=' + target);
    void paintTab(target);
  });
  paintTab(tab);
}

const statsHTML = st => {
  if (!st) return '';
  // El RPC agrupa por capítulos leídos (no son gustos elegidos en Preferencias).
  // Una obra puede pertenecer a más de un género; cada capítulo suma en todos ellos.
  const genres = (Array.isArray(st.genres) ? st.genres : [])
    .filter(g => g && typeof g.g === 'string')
    .map(g => ({ name: g.g, count: Math.max(0, Number(g.n) || 0) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
  const max = Math.max(1, ...genres.map(g => g.count));
  return `<div class="st-grid"><div class="st-k"><b>${(+st.chapters || 0).toLocaleString('es-MX')}</b><span>capítulos leídos</span></div><div class="st-k"><b>${(+st.month || 0).toLocaleString('es-MX')}</b><span>capítulos en los últimos 30 días</span></div><div class="st-k"><b>${(+st.series || 0).toLocaleString('es-MX')}</b><span>obras con capítulos leídos</span></div><div class="st-k"><b>${(+st.finished || 0).toLocaleString('es-MX')}</b><span>obras completas leídas</span></div><div class="st-k"><b>${(+st.following || 0).toLocaleString('es-MX')}</b><span>obras seguidas</span></div></div>
  ${genres.length ? `<section class="st-genre-section" aria-labelledby="st-genres-heading"><h3 id="st-genres-heading" style="margin:22px 0 8px">Géneros más leídos</h3>
    <p class="st-gen-help">Capítulos leídos por género. Si una obra tiene varios géneros, sus capítulos cuentan en cada uno de ellos.</p>
    <div class="st-gen">${genres.map(g => `<div class="st-gen-row"><span class="st-gen-name">${esc(g.name)}</span><span class="st-gen-track" aria-hidden="true"><i style="width:${Math.round(g.count / max * 100)}%"></i></span><span class="st-gen-count" title="${g.count} capítulos">${g.count}</span></div>`).join('')}</div></section>` : ''}`;
};
async function lector(name){ await meReady; if (user && profile?.username && profile.username.toLowerCase() === name.toLowerCase()) { history.replaceState({}, '', '/perfil'); return perfil(); } return (await pf()).publicProfile(PCTX(), name); }
const SUP_KIND = { paypal: ['PayPal', '#8cc3f2'], kofi: ['Ko-fi', '#f59e7a'], patreon: ['Patreon', '#f29bb0'], bmac: ['Buy Me a Coffee', '#f2c230'], mercadopago: ['Mercado Pago', '#8cc3f2'], otro: ['Enlace', '#a9d18e'] };
async function support(){
app.innerHTML = '<p class="mono">Cargando…</p>';
const [{ data: ps }, { data }, { data: platformCampaign }] = await Promise.all([sb.from('platform_settings').select('support').eq('id', 1).maybeSingle(), sb.from('patreon_tiers').select('*').order('price_usd'), sb.from('patreon_public').select('url').eq('owner', 'platform').maybeSingle()]);
const C = ps?.support || {}, mode = C.mode || 'patreon', links = (C.links || []).filter(l => /^https:\/\//.test(l.url || ''));
const teamsTiers = (data || []).filter(t => t.team_id).map(t => `<div style="border:2px solid var(--line);padding:18px;margin:10px 0"><h3 style="margin:0">${esc(t.name)}</h3><p class="mono">${t.price_usd} USD/mes · ${t.early_weeks ? t.early_weeks + ' semana(s) de adelanto del equipo' : 'beneficios del equipo traductor'}</p></div>`).join('') || '<p class="mono">Los niveles aparecerán cuando un equipo conecte su Patreon.</p>';
const platformTiers = (data || []).filter(t => !t.team_id).map(t => `<div style="border:1px solid var(--line);padding:14px;margin:8px 0"><strong>${esc(t.name)}</strong><p class="mono" style="margin:4px 0 0">${t.price_usd} USD/mes · apoyo voluntario, sin desbloqueos editoriales</p></div>`).join('');
const platformURL = (() => { try { const u = new URL(platformCampaign?.url); return u.protocol === 'https:' && /(^|\.)patreon\.com$/i.test(u.hostname) ? u.toString() : ''; } catch { return ''; } })();
const tiers = `<section><h2>Patreon de El Obi del Lector · apoyo voluntario</h2><p>El Patreon de la plataforma no bloquea ni desbloquea obras, capítulos o descargas.</p>${platformTiers}${platformURL ? `<a class="btn ghost" href="${esc(platformURL)}" target="_blank" rel="noopener noreferrer">Apoyar en Patreon ↗</a>` : ''}</section><section><h2>Patreon de los equipos traductores</h2><p>Cada equipo administra los beneficios de su propio contenido.</p>${teamsTiers}</section>`;
const cards = links.map(l => { const [kn, kc] = SUP_KIND[l.kind] || SUP_KIND.otro; return `<a href="${esc(l.url)}" target="_blank" rel="noopener" style="display:grid;gap:6px;padding:18px;background:#14120d;border:1px solid #2f2a20;border-top:4px solid ${kc};color:var(--paper);text-decoration:none"><span class="mono" style="font-size:11px;letter-spacing:.12em;color:${kc}">${esc(kn.toUpperCase())}</span><b style="font-size:18px">${esc(l.label || kn)}</b>${l.note ? `<span style="font-size:14px;line-height:1.5;color:#cfc6b0">${esc(l.note)}</span>` : ''}<span style="font-weight:600;color:${kc}">Abrir →</span></a>`; }).join('');
const grid = cards ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:14px;margin:18px 0 28px">${cards}</div>` : '';
app.innerHTML = `<h1>${esc(C.title || 'Apoya a los traductores')}</h1><p style="max-width:68ch">${esc(C.intro || (mode === 'links' ? 'Elige cómo quieres apoyar.' : 'Tu aporte al Patreon de El Obi del Lector es voluntario y no cambia el acceso a las obras. Cada equipo gestiona su propia membresía.'))}</p><p class="mono" style="font-size:12px;max-width:68ch">El Patreon general es solo para apoyar. Nunca restringe ni desbloquea lecturas y descargas.</p>`
  + (mode === 'links' ? (grid || '<p class="mono">Aún no hay enlaces de apoyo.</p>') : mode === 'both' ? grid + '<h2>Niveles de Patreon</h2>' + tiers : tiers) + '<section id="wall"></section>';
sb.rpc('platform_patrons_wall').then(({ data: W }) => { const el = document.getElementById('wall'); if (!el || !W?.length) return; el.innerHTML = `<h2 style="margin-top:36px">惠 Muro de agradecimientos</h2><p class="mono" style="margin:0 0 14px">Gracias a quienes sostienen El Obi del Lector.</p><div style="display:flex;flex-wrap:wrap;gap:10px">${W.map(w => `<a href="/lector/${esc(w.username)}" style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border:1px solid var(--line);background:#16140f;color:var(--paper);text-decoration:none;font-weight:600;font-size:14px"><span style="width:28px;height:28px;flex:none;background:#2f2a20 center/cover;${w.avatar_url ? `background-image:url('${esc(w.avatar_url)}')` : ''}"></span>${esc(w.username)}</a>`).join('')}</div>`; }, () => {});
}
// Invitación pendiente: solo en esta pestaña y nunca en la URL de inicio de sesión.
const pendingInviteToken = () => {
  try {
    const token = sessionStorage.getItem('obi-team-invitation-pending') || '';
    return /^[0-9a-f]{64}$/.test(token) ? token : '';
  } catch { return ''; }
};
const AUTH_ERR = { 'Invalid login credentials':'Correo o contraseña incorrectos.', 'Email not confirmed':'Confirma tu correo antes de entrar (revisa tu bandeja).', 'User already registered':'Ese correo ya tiene cuenta. Inicia sesión.', 'Password should be at least 8 characters.':'La contraseña debe tener al menos 8 caracteres.' };
const authMsg = e => /captcha/i.test(e?.message || '') ? 'No pudimos comprobar que no eres un bot. Espera un momento e inténtalo otra vez.' : AUTH_ERR[e?.message] || e?.message || 'Algo salió mal. Intenta de nuevo.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
async function login(mode = 'in'){
const up = mode === 'up';
app.innerHTML = `<section class="ob-auth-page"><h1>${up ? 'Crear cuenta' : 'Entrar'}</h1>
<div class="ob-auth-providers" style="display:grid;gap:14px;max-width:380px;margin:0 0 14px"><button type="button" id="gg" style="display:flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:0 16px;background:#fff;color:#1f1f1f;border:1px solid #dadce0;border-radius:4px;font:600 15px 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>${up ? 'Registrarte con Google' : 'Continuar con Google'}</button><button type="button" id="pt-in" style="display:flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:0 16px;background:#16140f;color:var(--paper);border:1px solid var(--line);border-radius:4px;font:600 15px 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="14.5" cy="9.5" r="5.5"/><rect x="4" y="4" width="3" height="16"/></svg>Continuar con Patreon</button>
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
<p style="display:flex;gap:16px;flex-wrap:wrap"><a href="#" id="sw">${up ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate'}</a>${up ? '' : '<a href="#" id="fg">¿Olvidaste tu contraseña?</a>'}</p></section>`;
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
toast('¡Bienvenido!'); const pendingInvite = pendingInviteToken(); go(pendingInvite ? '/invitacion' : '/');
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
const { optimizeAvatar } = await import('/avatar-image.js?v=1');
const payload = await optimizeAvatar(file);
const ext = payload.type === 'image/webp' ? 'webp' : payload.type === 'image/png' ? 'png' : 'jpeg';
const path = user.id + '/avatar-' + Date.now() + '.' + ext;
const { error } = await sb.storage.from('avatars').upload(path, payload, { upsert: true, contentType: payload.type });
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
$('#rqcancel')?.addEventListener('click', async () => { if (!await confirmObi('¿Retirar tu solicitud?')) return; const { error } = await sb.rpc('cancel_translator_request'); if (error) return toast(error.message); toast('Solicitud retirada'); solicitud(); });
}
function notFound(){ app.innerHTML = '<h1>Esta página no está en el estante</h1><p><a href="/">Volver al inicio</a></p>'; }
// Una PWA abierta antes del despliegue debe adoptar el nuevo lector sin quedarse en HTML antiguo.
if ('serviceWorker' in navigator) {
  let changedController = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (changedController) return;
    changedController = true;
    location.reload();
  });
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
// precarga del capítulo al apuntar o tocar cualquier enlace al lector (Continuar, índice, fichas…)
let warmT = 0; const warmOn = e => { const l = e.target.closest?.('a[href^="/leer/"]'); if (!l) return; const m = l.getAttribute('href').match(/^\/leer\/([\w-]+)\/(\d+(?:\.\d+)?)/); if (!m) return; clearTimeout(warmT); warmT = setTimeout(() => rd().warm(m[1], +m[2]), e.type === 'pointerover' ? 80 : 0); };
document.addEventListener('pointerover', warmOn, { passive: true }); document.addEventListener('touchstart', warmOn, { passive: true }); document.addEventListener('focusin', warmOn);
// Anticipar la consulta ligera de la ficha al señalar/focalizar una novela.
// La precarga se comparte con series() y caduca rápidamente en memoria.
let seriesWarmT = 0;
const warmSeries = e => {
  const link = e.target.closest?.('a[href^="/serie/"]');
  const slug = link?.getAttribute('href')?.match(/^\/serie\/([\w-]+)(?:[?#]|$)/)?.[1];
  if (!slug || !navigator.onLine) return;
  clearTimeout(seriesWarmT);
  seriesWarmT = setTimeout(() => ui().prefetchSeries(slug), e.type === 'pointerover' ? 120 : 0);
};
document.addEventListener('pointerover', warmSeries, { passive: true });
document.addEventListener('focusin', warmSeries);
document.addEventListener('touchstart', warmSeries, { passive: true });
addEventListener('load', () => setTimeout(() => { if (user && navigator.onLine) rd().syncPending(); }, 5000));
let authEv = null;
sb.auth.onAuthStateChange(ev => { if (ev !== 'INITIAL_SESSION') loadSession().then(() => ui().refreshBadge()); if (navigator.onLine && ['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(ev) && authEv !== null) seasons().then(S => S.load(sb, true)).then(() => afterRender()); authEv = ev; });
loadSession().then(() => {
const qs = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('error_description')) { history.replaceState({}, '', '/entrar'); render(); return toast(hash.get('error_description').includes('expired') ? 'El enlace expiró. Inicia sesión para recibir otro.' : hash.get('error_description')); }
const pendingInvite = pendingInviteToken();
if (user && pendingInvite && (location.pathname === '/' || qs.has('bienvenida'))) {
  history.replaceState({}, '', '/invitacion'); render(); ui().refreshBadge(); return;
}
if (qs.has('bienvenida') && user) { history.replaceState({}, '', '/'); return meReady.then(welcome); }
render(); ui().refreshBadge();
});

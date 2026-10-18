// Importaciones estáticas: el navegador descarga app, ui y reader a la vez (más modulepreload en index.html).
import { createClient } from '/supabase.js?v=1';
import { createReader } from '/reader.js?v=14';
import { createUI } from '/ui.js?v=32';
const { url, key } = window.OBI_CONFIG;
const ASSET = n => url + '/storage/v1/object/public/obi-app/' + n + '?v=' + (window.OBI_ASSET_V || '5');
export const sb = createClient(url, key, { auth: { persistSession: true } });
const $ = s => document.querySelector(s), app = $('#app');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', 2800); };
let user = null, profile = null, me = null;
const CTX = () => ({ sb, app, $, esc, toast, go, getUser: () => user, getMe: () => me, url });
let PF; const pf = async () => PF ||= await import('/profile.js?v=6');
const PCTX = () => ({ ...CTX(), statsHTML, uploadAvatar, delBanner, setProfile: p => { profile = { ...profile, ...p }; try { localStorage.setItem('obi-me', JSON.stringify({ id: user.id, profile, me })); } catch {} }, getProfile: () => profile, reload: async () => { await loadSession(); await meReady; } });
let ST; const st = async () => ST ||= (await import('/studio.js?v=34')).createStudio(CTX());
let AD; const ad = async () => AD ||= (await import('/admin.js?v=8')).createAdmin(CTX());
let R; const rd = () => R ||= createReader(CTX());
let U; const ui = () => U ||= createUI(CTX());

// Preferencias de pantalla (Accesibilidad) y lectores silenciados/bloqueados: se aplican al instante desde el almacenamiento local.
const readJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const A11Y_CSS = 'html.a11y-still *,html.a11y-still *::before,html.a11y-still *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}html.a11y-hc{--paper:#fffaf0;--mute:#ddd4bf;--line:#5f5745}html.a11y-ul a:not(.btn){text-decoration:underline!important;text-underline-offset:3px}html.a11y-fc :focus-visible{outline:3px solid var(--gold)!important;outline-offset:3px!important}';
function applyUI(P = readJ('obi-ui', {})){ window.__obiUI = P || {}; const H = document.documentElement;
  H.classList.toggle('a11y-still', P?.motion === 'reduce'); H.classList.toggle('a11y-hc', !!P?.contrast); H.classList.toggle('a11y-ul', !!P?.underline); H.classList.toggle('a11y-fc', !!P?.focus);
  if (!document.getElementById('a11y-css')) { const s = document.createElement('style'); s.id = 'a11y-css'; s.textContent = A11Y_CSS; document.head.appendChild(s); } }
window.obiSetUI = P => { try { localStorage.setItem('obi-ui', JSON.stringify(P || {})); } catch {} applyUI(P || {}); };
window.obiSetBlocks = L => { window.__obiBlocks = new Map((L || []).map(b => [b.id, b])); try { localStorage.setItem('obi-blocks', JSON.stringify(L || [])); } catch {} };
applyUI(); window.obiSetBlocks(readJ('obi-blocks', []));
{ const MM = window.matchMedia.bind(window); window.matchMedia = q => /prefers-reduced-motion:\s*reduce/.test(q) && window.__obiUI?.motion === 'reduce' ? MM('all') : MM(q); }
{ const hc = o => { const h = window.__obiUI?.hour; if (h !== '12' && h !== '24') return o; if (o && (o.hour12 !== undefined || o.hourCycle)) return o; return { ...(o || {}), hour12: h === '12' }; };
  for (const k of ['toLocaleString', 'toLocaleTimeString']) { const f = Date.prototype[k]; Date.prototype[k] = function(l, o){ return f.call(this, l, hc(o)); }; } }
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
const h = user
? `<details class="ob-bell"><summary aria-label="Avisos"><span aria-hidden="true">鈴</span><em id="bell-n" hidden></em></summary><div class="ob-menu ob-nt" id="bell-list"><p class="mono">Cargando…</p></div></details><details class="ob-user"><summary aria-label="Menú de cuenta"><span class="ob-av">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : ini}</span></summary><div class="ob-menu"><div class="who2"><strong>${esc(profile?.username || user.email)}</strong><small>${RL[pr]}${profile?.donor_tier ? ' · 援 Donador' : ''}</small></div><a href="/perfil">Mi perfil</a><a href="/biblioteca">Mi biblioteca</a><a href="/preferencias">Preferencias</a>${pr === 'bibliotecario' ? '<a href="/bibliotecario">Mostrador del Bibliotecario</a>' : ''}${pr !== 'lector' ? '<a href="/estudio">Estudio</a><a href="/estudio/preferencias">Preferencias del equipo</a>' : '<a href="/solicitud">Crear mi grupo traductor</a>'}<button id="out">Salir</button></div></details>`
: `<button class="btn" id="in">Entrar</button>`;
if (h === lastBar) return; lastBar = h; $('#session').innerHTML = h;
const dd = $('#session .ob-user'); if (dd) dd.querySelector('.ob-menu').addEventListener('click', e => { if (e.target.closest('a')) dd.open = false; });
$('#out')?.addEventListener('click', async () => { try { localStorage.removeItem('obi-me'); } catch {} await sb.auth.signOut(); location.href = '/'; });
$('#in')?.addEventListener('click', () => go('/entrar'));
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
'/': () => ui().home(), '/catalogo': () => ui().catalog(), '/calendario': calendar, '/ranking': () => ui().ranking(), '/lanzamientos': () => ui().releases(), '/biblioteca': library, '/apoyar': support, '/entrar': () => login('in'), '/registro': () => login('up'), '/restablecer': resetPassword, '/perfil': perfil, '/preferencias': async () => (await pf()).preferences(PCTX()), '/buscar': () => ui().search(), '/solicitud': solicitud,
'/bibliotecario': async () => (await ad()).render(), '/admin': async () => { history.replaceState({}, '', '/bibliotecario'); (await ad()).render(); },
};
export function go(path){ history.pushState({}, '', path); render(); }
document.addEventListener('click', e => { const a = e.target.closest('a[href^="/"]'); if (a && !a.target) { e.preventDefault(); go(a.getAttribute('href')); } });
addEventListener('popstate', render);
document.addEventListener('click', e => { document.querySelectorAll('.ob-user[open],.ob-bell[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
let PS = null; const seasons = async () => PS ||= await import('/season.js?v=3');
addEventListener('obi-season', () => { afterRender(); });
// Se dibuja la página sin esperar la temporada; afterRender la aplica cuando llega.
function render(){ seasons().then(S => { S.clear(); S.load(sb); }); return render0().then(afterRender); }
async function afterRender(){
  const S = await seasons(); await S.load(sb); const p = location.pathname; let m;
  try {
    if (p === '/') return S.apply('home');
    if (p === '/catalogo') return S.apply('catalog');
    if (p === '/lanzamientos') return S.apply('releases');
    if ((m = p.match(/^\/leer\/([\w-]+)\/(\d+)$/))) return S.apply('reader');
    if ((m = p.match(/^\/serie\/([\w-]+)$/))) { const { data } = await sb.from('series').select('teams(design)').eq('slug', m[1]).maybeSingle(); const T = data?.teams?.design?.seasons, { activeSeason } = await import('/anim.js?v=8'); const k = T ? activeSeason(T) : null; if (location.pathname !== p) return; return k ? S.apply('series', { key: k, greet: T.greet?.[k] || '' }) : S.apply('series'); }
    if ((m = p.match(/^\/equipo\/([\w-]+)$/))) { const { data } = await sb.from('teams').select('design').eq('slug', m[1]).maybeSingle(); const { activeSeason } = await import('/anim.js?v=8'); if (location.pathname !== p) return; if (data?.design?.seasons && activeSeason(data.design.seasons)) return S.clear(); return S.apply('team'); }
    // El resto de páginas públicas (Apoyar, Entrar, Registro, Perfil, Biblioteca, Calendario…) también llevan la temporada; el Estudio y el Mostrador no.
    if (p.startsWith('/estudio') || p.startsWith('/bibliotecario') || p === '/admin') return S.clear();
    return S.apply('page');
  } catch (e) { console.warn('temporada', e); }
}
async function render0(){
const p = location.pathname; let m;
scrollTo(0, 0); document.body.classList.remove('in-studio');
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
async function calendar(){
app.innerHTML = '<p class="mono">Cargando el calendario…</p>';
const DAYS = 60, now = new Date(), end = new Date(Date.now() + DAYS * 864e5), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const [S, AN, { data: rel }, { data: cal }] = await Promise.all([seasons(), import('/anim.js?v=8'),
  sb.from('schedule').select('label,at,kind,series(title,slug)').gte('at', now.toISOString()).lte('at', end.toISOString()).order('at').limit(120),
  sb.from('season_calendar').select('key,label,starts,day,hemi').lte('starts', ymd(end)).gte('starts', ymd(new Date(Date.now() - 40 * 864e5))).order('starts')]);
await S.load(sb);
const hemi = S.hemiOf(Intl.DateTimeFormat().resolvedOptions().timeZone), auto = new Set(S.config().auto || []);
const fests = [];
for (let i = 0; i <= DAYS; i++) { const d = new Date(d0.getTime() + i * 864e5); for (const [k, s] of Object.entries(AN.SEASONS)) { if (s.g === 'est') continue; const was = AN.activeSeason({ auto: [k] }, new Date(d.getTime() - 864e5)) === k, is = AN.activeSeason({ auto: [k] }, d) === k; if (is && (!was || i === 0)) fests.push({ k, s, d }); } }
const seasonStarts = (cal || []).filter(c => ['primavera', 'verano', 'otono', 'invierno'].includes(c.key) && c.hemi === hemi && new Date(c.starts + 'T12:00') >= d0).map(c => ({ k: c.key, s: AN.SEASONS[c.key], d: new Date(c.starts + 'T12:00') }));
const items = [...(rel || []).filter(e => e.series).map(e => ({ t: 'rel', d: new Date(e.at), e })), ...fests.map(f => ({ t: 'fest', ...f })), ...seasonStarts.map(f => ({ t: 'fest', ...f }))].sort((x, y) => x.d - y.d || (x.t === 'fest' ? -1 : 1));
const until = d => { const m = Math.round((d - Date.now()) / 60000); if (m < 0) return 'en curso'; if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
const dayKey = d => ymd(d), groups = []; for (const it of items) { const k = dayKey(it.d); let g = groups[groups.length - 1]; if (!g || g.k !== k) groups.push(g = { k, d: it.d, list: [] }); g.list.push(it); }
const label = d => { const k = ymd(d); return k === ymd(now) ? 'Hoy' : k === ymd(new Date(Date.now() + 864e5)) ? 'Mañana' : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }); };
const win = s => { if (s.w) { const [a1, b1] = s.w, f = x => new Date('2000-' + x + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }); return a1 === b1 ? f(a1) : f(a1) + ' – ' + f(b1); } return ''; };
const INFO = {
  halloween: ['Noche del 31 de octubre de origen celta (Samhain), cuando se creía que el mundo de los vivos y el de los espíritus se acercaban.', 'Disfraces, calabazas talladas, casas decoradas y el «dulce o truco».'],
  muertos: ['Tradición mexicana para recordar a los difuntos: el 1 de noviembre a los niños y el 2 a los adultos. Es Patrimonio Cultural Inmaterial de la UNESCO.', 'Altares con fotos, cempasúchil, velas, pan de muerto, calaveritas de azúcar y visitas al panteón.'],
  navidad: ['Celebración cristiana del nacimiento de Jesús el 25 de diciembre, hoy también una fiesta familiar en buena parte del mundo.', 'Árbol, nacimientos, posadas, cena de Nochebuena e intercambio de regalos.'],
  anonuevo: ['Despedida del año que termina y bienvenida al nuevo, la noche del 31 de diciembre al 1 de enero.', 'Cuenta regresiva, fuegos artificiales, doce uvas a medianoche y propósitos para el año.'],
  valentin: ['Día del amor y la amistad, el 14 de febrero, que toma el nombre de un mártir romano.', 'Cartas, flores, chocolates y salidas con la pareja o los amigos. En Japón y Corea las chicas regalan chocolate y el 14 de marzo (White Day) se corresponde.'],
  pascua: ['Fiesta cristiana de la resurrección de Jesús. Su fecha cambia cada año: el domingo después de la primera luna llena de primavera (norte).', 'Huevos de colores, búsqueda de huevos, conejo de Pascua y comidas familiares.'],
  shogatsu: ['El Año Nuevo japonés, la fiesta más importante del año en Japón. Las celebraciones principales van del 1 al 3 de enero.', 'Primera visita al santuario (hatsumōde), osechi ryōri, tarjetas nengajō y sobres con dinero (otoshidama) para los niños.'],
  setsubun: ['Marca el día antes del inicio de la primavera en el calendario lunar japonés; se ahuyenta la mala suerte del año.', 'Se lanzan frijoles tostados gritando «¡Fuera demonios, dentro la fortuna!» (oni wa soto, fuku wa uchi) y se come el ehōmaki.'],
  hinamatsuri: ['El Día de las Niñas, el 3 de marzo: las familias piden salud y felicidad para sus hijas.', 'Se exhiben muñecas hina vestidas como la corte imperial Heian y se comen dulces hina-arare y sake dulce.'],
  hanami: ['La contemplación de los cerezos en flor. Florecen solo una o dos semanas, por eso simbolizan lo efímero de la vida.', 'Picnics bajo los sakura con familia y amigos, de día y también de noche (yozakura) con faroles.'],
  tanabata: ['El Festival de las Estrellas, el 7 de julio: según la leyenda, es la única noche del año en que Orihime y Hikoboshi (Vega y Altair) pueden verse.', 'Se escriben deseos en tiras de papel (tanzaku) y se cuelgan en ramas de bambú.'],
  obon: ['Festividad budista en la que se cree que los espíritus de los antepasados vuelven a casa a visitar a la familia.', 'Visitas a las tumbas, bailes bon odori y faroles flotando en ríos para despedir a los espíritus (tōrō nagashi).'],
  tsukimi: ['La contemplación de la luna de otoño, en la noche de luna llena del octavo mes lunar, considerada la más bella del año.', 'Se ofrecen dango de arroz y espigas de susuki, y se mira la luna en familia.'],
  shichigosan: ['Celebración del 15 de noviembre por el crecimiento de niñas de 3 y 7 años y niños de 3 y 5 años.', 'Los niños visten kimono, la familia visita el santuario y se compran caramelos chitose-ame, que desean una vida larga.'],
  seollal: ['El Año Nuevo lunar coreano, una de las dos fiestas más grandes de Corea; dura tres días.', 'Reverencia a los mayores (sebae), que dan dinero a los niños; sopa de pastel de arroz (tteokguk) y juegos tradicionales con hanbok.'],
  chuseok: ['El «Día de Acción de Gracias» coreano, en la luna llena del octavo mes lunar; celebra la cosecha y honra a los antepasados.', 'Viaje a la ciudad natal, ritual charye, visita a las tumbas y pasteles de arroz songpyeon.'],
  dano: ['Festival del quinto día del quinto mes lunar, ligado a la siembra y a desear buena salud en verano.', 'Lavarse el cabello con agua de iris, columpios para las mujeres y lucha ssireum.'],
  buda: ['Celebración del nacimiento de Buda, el octavo día del cuarto mes lunar; día festivo en Corea.', 'Templos y calles se llenan de faroles de loto y hay desfiles de linternas (Yeondeunghoe).'],
  pepero: ['El 11 de noviembre (11/11): la fecha parece cuatro palitos, como las galletas Pepero.', 'Se regalan galletas Pepero a pareja, amigos y compañeros.'],
  primavera: ['Empieza con el equinoccio: el día y la noche duran casi lo mismo y los días comienzan a alargarse.', 'Flores, temperaturas templadas y, en Japón, el inicio del año escolar.'],
  verano: ['Empieza con el solsticio: el día más largo del año.', 'Vacaciones, festivales al aire libre y, en Japón, fuegos artificiales (hanabi) y yukata.'],
  otono: ['Empieza con el equinoccio de otoño: los días se acortan y las hojas cambian de color.', 'Cosechas, momiji (hojas rojas) y la «temporada de la lectura» en Japón.'],
  invierno: ['Empieza con el solsticio: la noche más larga del año.', 'Frío, nieve en muchas regiones y las fiestas de fin de año.']
};
const row = it => it.t === 'rel'
  ? `<a class="cal-r" href="/serie/${esc(it.e.series.slug)}"><span class="cal-h">${it.d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span><span class="cal-b"><b>${esc(it.e.series.title)}</b><small>${it.e.kind === 'volume' ? 'Volumen completo · ' : ''}${esc(it.e.label)}</small></span><span class="cal-u">${until(it.d)}</span></a>`
  : `<details class="cal-f${auto.has(it.k) ? ' on' : ''}" style="--fc:${it.s.ac}"><summary><i style="background-image:url('${it.s.m ? AN.motifURL(it.s.m, it.s.ac, it.s.c2) : ''}')"></i><span class="cal-b"><b>${esc(it.s.l)}</b><small>${{ occ: 'Festividad', jp: 'Festividad japonesa', kr: 'Festividad coreana', est: 'Estación · hemisferio ' + hemi }[it.s.g]}${win(it.s) ? ' · ' + win(it.s) : ''}${auto.has(it.k) ? ' · el sitio se viste de temporada' : ''}</small></span><span class="cal-u">${until(it.d)}${INFO[it.k] ? '<span class="cal-m">Ver más</span>' : ''}</span></summary>${INFO[it.k] ? `<div class="cal-x"><p>${esc(INFO[it.k][0])}</p><p><b>Cómo se celebra:</b> ${esc(INFO[it.k][1])}</p></div>` : ''}</details>`;
app.innerHTML = '<div class="ui-cath"><div><h1>Calendario</h1><p>Lo que viene en los próximos dos meses: capítulos y volúmenes programados, y las festividades.</p></div><span class="kj" aria-hidden="true">予定</span></div>'
  + '<div class="cal-bar"><a class="mono" href="/lanzamientos">← Ya publicados</a><span class="mono">Horario de tu dispositivo · ' + esc(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')) + '</span></div>'
  + (groups.length ? groups.map(g => `<section class="cal-d"><h2>${label(g.d)}<span class="mono">${g.d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}</span></h2>${g.list.map(row).join('')}</section>`).join('') : '<p class="mono">Nada programado ni festividades en los próximos dos meses.</p>')
  + ((rel || []).length ? '' : '<p class="mono cal-empty">Aún no hay capítulos ni volúmenes programados. Cuando un equipo programe uno desde el Estudio, aparecerá aquí.</p>');
if (!document.getElementById('cal-css')) { const st = document.createElement('style'); st.id = 'cal-css'; st.textContent = `
.cal-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 26px}.cal-bar .mono{font-size:12px}
.cal-d{margin:0 0 26px}.cal-d h2{display:flex;align-items:baseline;gap:10px;margin:0 0 10px;font-size:22px;font-weight:500;text-transform:capitalize}.cal-d h2 .mono{font-size:12px;color:var(--mute)}
.cal-r,.cal-f>summary{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 14px;color:var(--paper);text-decoration:none}
.cal-r,.cal-f{margin-bottom:6px;background:#16140f;border:1px solid var(--line);display:block}.cal-r{display:grid}
.cal-f>summary{cursor:pointer;list-style:none}.cal-f>summary::-webkit-details-marker{display:none}.cal-f>summary:hover{background:color-mix(in srgb,var(--fc) 10%,transparent)}
.cal-u{display:grid;justify-items:end;gap:4px}.cal-m{font-size:11px;color:var(--fc);text-decoration:underline;text-underline-offset:3px}.cal-m::after{content:' ▾'}.cal-f[open] .cal-m{font-size:0}.cal-f[open] .cal-m::after{content:'Ver menos ▴';font-size:11px}
.cal-x{padding:0 14px 14px 84px;display:grid;gap:8px}.cal-x p{margin:0;font-size:14px;line-height:1.6;color:var(--paper);text-wrap:pretty;max-width:68ch}.cal-x b{color:var(--fc);font-weight:500}
.cal-r{border-left:4px solid var(--gold)}.cal-r:hover{border-color:var(--gold);color:var(--paper)}.cal-h{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--gold)}
.cal-b{display:grid;gap:2px;min-width:0}.cal-b b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px}.cal-b small{font-size:12px;color:var(--mute)}.cal-u{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute);white-space:nowrap}
.cal-f{border-left:4px solid var(--fc);background:color-mix(in srgb,var(--fc) 7%,#16140f)}.cal-f i{width:40px;height:40px;justify-self:center;background:center/contain no-repeat}.cal-f.on{border-color:var(--fc)}
.cal-empty{margin-top:10px}
@media(max-width:560px){.cal-r,.cal-f>summary{grid-template-columns:44px minmax(0,1fr)}.cal-u{grid-column:2;justify-items:start}.cal-x{padding-left:14px}}`; document.head.appendChild(st); }
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
if (!user) return go('/entrar');
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
async function support(){
const { data } = await sb.from('patreon_tiers').select('*').order('price_usd');
app.innerHTML = '<h1>Apoya a los traductores</h1><p>Tu membresía de Patreon activa el acceso anticipado y el sello 援 automáticamente.</p>' + ((data||[]).map(t => `<div style="border:2px solid var(--line);padding:18px;margin:10px 0"><h2 style="margin:0">${esc(t.name)}</h2><p class="mono">$${t.price_usd} USD/mes · ${t.early_weeks ? t.early_weeks + ' semana(s) de adelanto' : 'sin adelanto'}</p></div>`).join('') || '<p class="mono">Los niveles aparecerán cuando un equipo conecte Patreon.</p>');
}
const AUTH_ERR = { 'Invalid login credentials':'Correo o contraseña incorrectos.', 'Email not confirmed':'Confirma tu correo antes de entrar (revisa tu bandeja).', 'User already registered':'Ese correo ya tiene cuenta. Inicia sesión.', 'Password should be at least 8 characters.':'La contraseña debe tener al menos 8 caracteres.' };
const authMsg = e => AUTH_ERR[e?.message] || e?.message || 'Algo salió mal. Intenta de nuevo.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function login(mode = 'in'){
const up = mode === 'up';
app.innerHTML = `<h1>${up ? 'Crear cuenta' : 'Entrar'}</h1>
<form id="f" novalidate style="display:grid;gap:10px;max-width:380px">
${up ? '<label>Nombre de usuario<input name="username" autocomplete="username" minlength="2" maxlength="32" required></label>' : ''}
<label>Correo<input name="email" type="email" autocomplete="email" required placeholder="correo@ejemplo.com"></label>
<label>Contraseña<input name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="8" maxlength="128" required></label>
<p id="err" role="alert" style="color:#f59e7a;margin:0;min-height:1.2em"></p>
<button class="btn" id="go">${up ? 'Crear cuenta' : 'Entrar'}</button>
</form>
<p style="display:flex;gap:16px;flex-wrap:wrap"><a href="#" id="sw">${up ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate'}</a>${up ? '' : '<a href="#" id="fg">¿Olvidaste tu contraseña?</a>'}</p>`;
const f = $('#f'), err = $('#err'), btn = $('#go');
$('#sw').onclick = e => { e.preventDefault(); history.replaceState({}, '', up ? '/entrar' : '/registro'); login(up ? 'in' : 'up'); };
$('#fg')?.addEventListener('click', async e => {
e.preventDefault(); const email = f.email.value.trim();
if (!EMAIL_RE.test(email)) { err.textContent = 'Escribe tu correo para enviarte el enlace.'; return; }
const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/restablecer' });
error ? err.textContent = authMsg(error) : toast('Te enviamos un enlace para restablecer la contraseña');
});
f.onsubmit = async e => {
e.preventDefault(); err.textContent = '';
const email = f.email.value.trim(), password = f.password.value, username = f.username?.value.trim();
if (up && (!username || username.length < 2)) { err.textContent = 'Elige un nombre de usuario (mínimo 2 caracteres).'; return; }
if (!EMAIL_RE.test(email)) { err.textContent = 'Escribe un correo válido.'; return; }
if (password.length < 8 || password.length > 128) { err.textContent = 'La contraseña debe tener entre 8 y 128 caracteres.'; return; }
btn.disabled = true; btn.textContent = 'Un momento…';
const { data, error } = up
? await sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin + '/?bienvenida=1' } })
: await sb.auth.signInWithPassword({ email, password });
btn.disabled = false; btn.textContent = up ? 'Crear cuenta' : 'Entrar';
if (error) { err.textContent = authMsg(error); return; }
if (up && !data.session) { toast('Cuenta creada. Revisa tu correo y pulsa «Confirmar mi cuenta».'); history.replaceState({}, '', '/entrar'); return login('in'); }
toast('¡Bienvenido!'); go('/');
};
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
let authEv = null;
sb.auth.onAuthStateChange(ev => { if (ev !== 'INITIAL_SESSION') loadSession().then(() => ui().refreshBadge()); if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(ev) && authEv !== null) seasons().then(S => S.load(sb, true)).then(() => afterRender()); authEv = ev; });
loadSession().then(() => {
const qs = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('error_description')) { history.replaceState({}, '', '/entrar'); render(); return toast(hash.get('error_description').includes('expired') ? 'El enlace expiró. Inicia sesión para recibir otro.' : hash.get('error_description')); }
if (qs.has('bienvenida') && user) { history.replaceState({}, '', '/'); return meReady.then(welcome); }
render(); ui().refreshBadge();
});

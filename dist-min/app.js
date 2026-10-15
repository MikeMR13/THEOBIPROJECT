import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const { url, key } = window.OBI_CONFIG;
export const sb = createClient(url, key, { auth: { persistSession: true } });
const $ = s => document.querySelector(s), app = $('#app');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', 2800); };
let user = null, profile = null;
import { createReader } from './reader.js';
const STUDIO_URL = url + '/storage/v1/object/public/obi-app/studio.js?v=3';
let ST; const st = async () => ST ||= (await import(STUDIO_URL)).createStudio({ sb, app, $, esc, toast, go, getUser: () => user, url });
let R; const rd = () => R ||= createReader({ sb, app, $, esc, toast, go, getUser: () => user, url });
async function loadSession(){
const { data } = await sb.auth.getUser(); user = data.user;
profile = user ? (await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()).data : null;
const member = user ? ((await sb.from('team_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id)).count > 0) : false;
$('#session').innerHTML = user
? `<a href="/perfil" class="who">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : `<span>${esc((profile?.username || user.email || '?')[0].toUpperCase())}</span>`}<span class="mono">${esc(profile?.username || user.email)}${profile?.donor_tier ? ' · 援' : ''}</span></a> ${member ? '<a href="/estudio" class="btn ghost">Estudio</a> ' : ''}<button class="btn ghost" id="out">Salir</button>`
: `<button class="btn" id="in">Entrar</button>`;
$('#out')?.addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/'; });
$('#in')?.addEventListener('click', () => go('/entrar'));
}
const routes = {
'/': home, '/catalogo': catalog, '/calendario': calendar, '/biblioteca': library, '/apoyar': support, '/entrar': () => login('in'), '/registro': () => login('up'), '/restablecer': resetPassword, '/perfil': perfil,
};
export function go(path){ history.pushState({}, '', path); render(); }
document.addEventListener('click', e => { const a = e.target.closest('a[href^="/"]'); if (a && !a.target) { e.preventDefault(); go(a.getAttribute('href')); } });
addEventListener('popstate', render);
async function render(){
const p = location.pathname; let m;
if ((m = p.match(/^\/serie\/([\w-]+)$/))) return series(m[1]);
if ((m = p.match(/^\/leer\/([\w-]+)\/(\d+)$/))) return rd().open(m[1], +m[2]);
if ((m = p.match(/^\/anotaciones\/([\w-]+)$/))) return rd().annotationsPage(m[1]);
if (p === '/estudio') return (await st()).home();
if ((m = p.match(/^\/estudio\/obra\/([\w-]+)$/))) return (await st()).work(m[1]);
if ((m = p.match(/^\/estudio\/editar\/([\w-]+)$/))) return (await st()).editor(m[1]);
if (p === '/estudio/importar') return (await st()).importer();
if (p === '/estudio/multimedia') return (await st()).library();
if (p === '/estudio/equipo') return (await st()).team();
(routes[p] || notFound)();
}
async function home(){
const { data } = await sb.from('chapters').select('num,title,publish_at,series(slug,title,theme)').eq('status','published').order('publish_at',{ascending:false}).limit(8);
const cont = user ? await rd().continueList() : [];
app.innerHTML = (cont.length ? `<h1>Continuar leyendo</h1>${cont.map(r => `<p><a href="/leer/${r.slug}/${r.num}">${esc(r.title)} · Cap. ${r.num}</a> <span class="mono">${Math.round((r.pct||0)*100)}%</span></p>`).join('')}` : '') + `<h1>Últimas actualizaciones</h1>${(data||[]).map(c => `<p><a href="/leer/${c.series.slug}/${c.num}">${esc(c.series.title)} · Cap. ${c.num} — ${esc(c.title)}</a></p>`).join('') || '<p class="mono">Aún no hay capítulos publicados.</p>'}`;
}
async function catalog(){
const { data } = await sb.from('series').select('slug,title,original,author,synopsis,status,genres,theme,cover_path,adult').order('views',{ascending:false});
app.innerHTML = '<h1>Catálogo</h1>' + ((data||[]).map(s => `<a class="card" href="/serie/${s.slug}" style="--c:${esc(s.theme?.color)};text-decoration:none"><div class="cover" style="background-image:${s.cover_path ? `url('${url}/storage/v1/object/public/obi-media/${encodeURI(s.cover_path)}')` : 'none'}"></div><div><h2 style="margin:0">${esc(s.title)}${s.adult ? ' <span class="mono">+18</span>' : ''}</h2><p class="mono">${esc(s.original)} · ${esc(s.author)} · ${esc(s.status)}</p><p>${esc(s.synopsis)}</p></div></a>`).join('') || '<p class="mono">El catálogo se llenará cuando los equipos publiquen sus obras.</p>');
}
async function series(slug){
const { data: s } = await sb.from('series').select('*, teams(name,slug,official_verified)').eq('slug', slug).maybeSingle();
if (!s) return notFound();
const { data: ch } = await sb.from('chapters').select('num,title,vol').eq('series_id', s.id).order('num');
app.innerHTML = `<h1>${esc(s.title)}</h1><p class="mono">Traducido por ${esc(s.teams?.name)}${s.teams?.official_verified ? ' · ✓ enlace oficial verificado' : ''}</p><p>${esc(s.synopsis)}</p>
<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="follow">Seguir serie</button><a class="btn ghost" href="/anotaciones/${esc(slug)}">Mis anotaciones</a></p>
<h2>Capítulos</h2>${(ch||[]).map(c => `<p><a href="/leer/${slug}/${c.num}">Vol. ${c.vol} · ${esc(c.title)}</a></p>`).join('')}`;
$('#follow').onclick = async () => { if (!user) return go('/entrar'); const { error } = await sb.from('follows').upsert({ series_id: s.id, user_id: user.id }); toast(error ? error.message : 'Siguiendo · avisos activados'); };
}
async function calendar(){
const { data } = await sb.from('schedule').select('label,at,series(title,slug)').gte('at', new Date().toISOString()).order('at').limit(30);
app.innerHTML = '<h1>Calendario</h1>' + ((data||[]).map(e => `<p><span class="mono">${new Date(e.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'})}</span> · <a href="/serie/${e.series.slug}">${esc(e.series.title)}</a> · ${esc(e.label)}</p>`).join('') || '<p class="mono">Sin publicaciones agendadas.</p>');
}
async function library(){
if (!user) return go('/entrar');
const [cont, hist] = await Promise.all([rd().continueList(), rd().historyList()]);
const { count } = await sb.from('read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
app.innerHTML = `<h1>Mi biblioteca</h1>
<h2>Seguir leyendo</h2>${cont.map(r => `<p><a href="/leer/${r.slug}/${r.num}">${esc(r.title)} · Cap. ${r.num}</a> <span class="mono">${Math.round((r.pct||0)*100)}%</span> · <a href="/anotaciones/${r.slug}">Anotaciones</a></p>`).join('') || '<p class="mono">Abre un capítulo y aquí aparecerá.</p>'}
<p class="mono">${count || 0} capítulos marcados como leídos</p>
<h2>Sin conexión</h2><div id="off">${rd().offlineList()}</div>
<h2>Historial</h2>${hist.map(h => `<p><span class="mono">${new Date(h.opened_at).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</span> · <a href="/leer/${h.chapters.series.slug}/${h.chapters.num}">${esc(h.chapters.series.title)} · ${esc(h.chapters.title)}</a></p>`).join('') || '<p class="mono">Sin historial todavía.</p>'}`;
const off = $('#off'); rd().bindOfflineList(off, library);
}
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
await loadSession();
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
app.innerHTML = `<h1>Mi perfil</h1>${avatarBox(esc(profile?.username || ''), esc(user.email))}`;
bindAvatar(perfil);
}
function notFound(){ app.innerHTML = '<h1>Esta página no está en el estante</h1><p><a href="/">Volver al inicio</a></p>'; }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
sb.auth.onAuthStateChange(() => loadSession());
loadSession().then(() => {
const qs = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('error_description')) { history.replaceState({}, '', '/entrar'); render(); return toast(hash.get('error_description').includes('expired') ? 'El enlace expiró. Inicia sesión para recibir otro.' : hash.get('error_description')); }
if (qs.has('bienvenida') && user) { history.replaceState({}, '', '/'); return welcome(); }
render();
});
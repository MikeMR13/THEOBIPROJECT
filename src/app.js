import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const { url, key } = window.OBI_CONFIG;
const ASSET = n => url + '/storage/v1/object/public/obi-app/' + n + '?v=' + (window.OBI_ASSET_V || '5');
const { createReader } = await import('/reader.js?v=9');
const { createUI } = await import('/ui.js?v=17');
export const sb = createClient(url, key, { auth: { persistSession: true } });
const $ = s => document.querySelector(s), app = $('#app');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', 2800); };
let user = null, profile = null, me = null;
const CTX = () => ({ sb, app, $, esc, toast, go, getUser: () => user, getMe: () => me, url });
let ST; const st = async () => ST ||= (await import('/studio.js?v=19')).createStudio(CTX());
let AD; const ad = async () => AD ||= (await import('/admin.js?v=4')).createAdmin(CTX());
let R; const rd = () => R ||= createReader(CTX());
let U; const ui = () => U ||= createUI(CTX());
const RL = { bibliotecario: 'Bibliotecario', publicador: 'Publicador', lector: 'Lector' };
async function loadSession(){
const { data } = await sb.auth.getUser(); user = data.user;
profile = user ? (await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()).data : null;
me = user ? ((await sb.rpc('whoami')).data || null) : null;
const pr = me?.platform_role || 'lector';
const ini = esc((profile?.username || user?.email || '?')[0].toUpperCase());
$('#session').innerHTML = user
? `<details class="ob-bell"><summary aria-label="Avisos"><span aria-hidden="true">鈴</span><em id="bell-n" hidden></em></summary><div class="ob-menu ob-nt" id="bell-list"><p class="mono">Cargando…</p></div></details><details class="ob-user"><summary aria-label="Menú de cuenta"><span class="ob-av">${profile?.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="">` : ini}</span></summary><div class="ob-menu"><div class="who2"><strong>${esc(profile?.username || user.email)}</strong><small>${RL[pr]}${profile?.donor_tier ? ' · 援 Donador' : ''}</small></div><a href="/perfil">Mi perfil</a><a href="/biblioteca">Mi biblioteca</a>${pr === 'bibliotecario' ? '<a href="/bibliotecario">Mostrador del Bibliotecario</a>' : ''}${pr !== 'lector' ? '<a href="/estudio">Estudio</a>' : '<a href="/solicitud">Crear mi grupo traductor</a>'}<button id="out">Salir</button></div></details>`
: `<button class="btn" id="in">Entrar</button>`;
const dd = $('#session .ob-user'); if (dd) dd.querySelector('.ob-menu').addEventListener('click', e => { if (e.target.closest('a')) dd.open = false; });
$('#out')?.addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/'; });
$('#in')?.addEventListener('click', () => go('/entrar'));
if (user) bell();
}
async function bell(){
const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
const n = $('#bell-n'); if (n) { n.hidden = !count; n.textContent = count > 9 ? '9+' : count; }
const d = $('.ob-bell'); if (!d || d.dataset.b) return; d.dataset.b = '1';
d.addEventListener('toggle', async () => { if (!d.open) return; const { data } = await sb.from('notifications').select('id,kind,body,link,read,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
const ago = x => { const m = Math.round((Date.now() - new Date(x)) / 60000); return m < 60 ? 'hace ' + Math.max(1, m) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
$('#bell-list').innerHTML = (data || []).length ? '<strong class="nt-h">Avisos</strong>' + data.map(x => `<a href="${esc(/^\/[\w\/-]*$/.test(x.link?.href || '') ? x.link.href : '/')}" class="nt-it${x.read ? '' : ' new'}"><span>${esc(x.body)}</span><small>${ago(x.created_at)}</small></a>`).join('') : '<p class="mono" style="padding:10px">Sin avisos por ahora.</p>';
$('#bell-list').onclick = e => { if (e.target.closest('a')) d.open = false; };
if ((data || []).some(x => !x.read)) { await sb.rpc('notifications_read_all'); $('#bell-n').hidden = true; } });
}
const routes = {
'/': () => ui().home(), '/catalogo': () => ui().catalog(), '/calendario': calendar, '/lanzamientos': () => ui().releases(), '/biblioteca': library, '/apoyar': support, '/entrar': () => login('in'), '/registro': () => login('up'), '/restablecer': resetPassword, '/perfil': perfil, '/solicitud': solicitud,
'/bibliotecario': async () => (await ad()).render(), '/admin': async () => { history.replaceState({}, '', '/bibliotecario'); (await ad()).render(); },
};
export function go(path){ history.pushState({}, '', path); render(); }
document.addEventListener('click', e => { const a = e.target.closest('a[href^="/"]'); if (a && !a.target) { e.preventDefault(); go(a.getAttribute('href')); } });
addEventListener('popstate', render);
document.addEventListener('click', e => { document.querySelectorAll('.ob-user[open],.ob-bell[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
async function render(){
const p = location.pathname; let m;
scrollTo(0, 0); document.body.classList.remove('in-studio');
if ((m = p.match(/^\/serie\/([\w-]+)$/))) return ui().series(m[1]);
if ((m = p.match(/^\/leer\/([\w-]+)\/(\d+)$/))) return rd().open(m[1], +m[2]);
if ((m = p.match(/^\/anotaciones\/([\w-]+)$/))) return rd().annotationsPage(m[1]);
if ((m = p.match(/^\/equipo\/([\w-]+)$/))) return ui().team(m[1]);
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
if (p === '/estudio/comunidad') return (await st()).community();
if (p === '/estudio/estadisticas') return (await st()).stats();
if (p === '/estudio/descargas') return (await st()).downloads();
if ((m = p.match(/^\/estudio\/glosario(?:\/([\w-]+))?$/))) return (await st()).glossary(m[1]);
(routes[p] || notFound)();
}
async function calendar(){
const { data } = await sb.from('schedule').select('label,at,series(title,slug)').gte('at', new Date().toISOString()).order('at').limit(30);
const until = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
app.innerHTML = '<div class="ui-cath"><div><h1>Calendario</h1><p>Lo que viene: capítulos y volúmenes programados.</p></div><span class="kj" aria-hidden="true">予定</span></div><p class="mono"><a href="/lanzamientos">← Ya publicados</a></p>' + ((data||[]).map(e => `<p><span class="mono">${new Date(e.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'})} · <b style="color:var(--gold)">${until(e.at)}</b></span> · <a href="/serie/${e.series.slug}">${esc(e.series.title)}</a> · ${esc(e.label)}</p>`).join('') || '<p class="mono">Sin publicaciones agendadas.</p>');
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
app.innerHTML = `<h1>Mi perfil</h1><p class="mono">Rol en la plataforma: ${RL[me?.platform_role || 'lector']}</p>${avatarBox(esc(profile?.username || ''), esc(user.email))}`;
bindAvatar(perfil);
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
sb.auth.onAuthStateChange(() => loadSession().then(() => ui().refreshBadge()));
loadSession().then(() => {
const qs = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('error_description')) { history.replaceState({}, '', '/entrar'); render(); return toast(hash.get('error_description').includes('expired') ? 'El enlace expiró. Inicia sesión para recibir otro.' : hash.get('error_description')); }
if (qs.has('bienvenida') && user) { history.replaceState({}, '', '/'); return welcome(); }
render(); ui().refreshBadge();
});

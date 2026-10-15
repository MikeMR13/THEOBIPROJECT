// Panel del Bibliotecario: acceso único en /bibliotecario (alias /admin).
const CSS = `
.bb{max-width:1180px;margin:0 auto}
.bb-gate{min-height:70vh;display:grid;place-items:center}
.bb-card{width:min(440px,100%);display:grid;gap:14px;padding:36px 32px;background:#f3ecd9;color:#0d0c0a;border-top:8px solid var(--gold);box-shadow:0 30px 60px rgba(0,0,0,.5);position:relative}
.bb-card h1{margin:0;font-size:30px;color:#0d0c0a}.bb-card p{margin:0;color:#5a5244;font-size:14px;line-height:1.5}
.bb-card label{color:#0d0c0a}.bb-card input{background:#fff;border:2px solid #0d0c0a;color:#0d0c0a}
.bb-card .btn{background:#0d0c0a;color:#f3ecd9;padding:13px}.bb-card .err{color:#b3261e;font-weight:600;font-size:13px;min-height:1.2em}
.bb-stamp{position:absolute;top:-22px;right:24px;width:56px;height:56px;border:3px solid #b3261e;color:#b3261e;display:flex;align-items:center;justify-content:center;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:26px;background:#f3ecd9;transform:rotate(-8deg);animation:bbSeal .6s .3s cubic-bezier(.2,.8,.2,1) both}
@keyframes bbSeal{0%{opacity:0;transform:scale(1.8) rotate(-20deg)}60%{opacity:1;transform:scale(.94) rotate(-8deg)}100%{transform:rotate(-8deg)}}
.bb-top{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin-bottom:22px}.bb-top h1{margin:0;font-size:38px}
.bb-tabs{display:flex;gap:2px;flex-wrap:wrap;border-bottom:2px solid var(--gold);margin-bottom:24px}
.bb-tabs button{background:none;border:none;color:var(--paper);padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}.bb-tabs button.on{background:var(--gold);color:#0d0c0a}
.bb-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
.bb-kpi{display:grid;gap:4px;padding:16px;background:#16140f;border-top:3px solid var(--gold)}.bb-kpi b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:34px;line-height:1}
.bb-tbl{width:100%;border-collapse:collapse;font-size:14px}.bb-tbl th{text-align:left;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);padding:8px;border-bottom:2px solid var(--line)}
.bb-tbl td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:middle}.bb-tbl tr:hover td{background:#14120d}
.bb-role{font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 8px;border:1px solid currentColor;white-space:nowrap}
.bb-row{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:16px}.bb-row>label{flex:1 1 200px}
.bb-box{padding:18px;background:#16140f;border:1px solid var(--line);margin-bottom:18px;display:grid;gap:12px}
.bb-box h3{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:20px}
.bb-mini{background:none;border:1px solid #3d3628;color:var(--paper);padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.bb-mini.red{color:#f59e7a;border-color:#f59e7a}
.bb select{background:#16140f;border:2px solid var(--line);color:var(--paper);padding:9px;font:inherit}
`;
const ROLE = { bibliotecario: ['Bibliotecario', '#f2c230'], publicador: ['Publicador', '#8cc3f2'], lector: ['Lector', '#a89f8a'] };
const TROLE = { owner: 'Propietario', admin: 'Administrador', translator: 'Traductor', editor: 'Editor', proofreader: 'Corrector', collaborator: 'Colaborador' };

export function createAdmin({ sb, app, $, esc, toast, go, url }){
  if (!document.getElementById('bb-css')) { const s = document.createElement('style'); s.id = 'bb-css'; s.textContent = CSS; document.head.appendChild(s); }
  const msg = e => ({ forbidden: 'Solo el Bibliotecario puede hacer esto.' }[e?.message] || e?.message || 'Algo salió mal');
  const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw error; return data; };
  const when = d => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  let tab = 'resumen';

  async function render(){
    const { data: { user } } = await sb.auth.getUser();
    const me = user ? await rpc('whoami').catch(() => null) : null;
    if (!me || me.platform_role !== 'bibliotecario') return gate(user && me ? 'Tu cuenta es de ' + ROLE[me.platform_role][0] + '. Esta entrada es exclusiva del Bibliotecario.' : '');
    return panel(me);
  }

  function gate(err = ''){
    app.innerHTML = `<div class="bb bb-gate"><form class="bb-card" id="bbf" novalidate>
      <span class="bb-stamp" aria-hidden="true">司</span>
      <span class="ui-lbl" style="color:#5a5244">El Obi del Lector · Acceso restringido</span>
      <h1>Mostrador del Bibliotecario</h1>
      <p>Esta entrada es solo para quien administra la biblioteca. Los publicadores y lectores entran desde <a href="/entrar" style="color:#0d0c0a">la entrada general</a>.</p>
      <label>Correo<input name="email" type="email" autocomplete="username" required></label>
      <label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required></label>
      <span class="err" role="alert">${esc(err)}</span>
      <button class="btn">Abrir el mostrador</button></form></div>`;
    const f = $('#bbf'), er = f.querySelector('.err');
    f.onsubmit = async e => {
      e.preventDefault(); er.textContent = '';
      const email = f.email.value.trim(), password = f.password.value;
      if (!email || password.length < 8) { er.textContent = 'Escribe tu correo y tu contraseña.'; return; }
      const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Comprobando…';
      const { error } = await sb.auth.signInWithPassword({ email, password });
      b.disabled = false; b.textContent = 'Abrir el mostrador';
      if (error) { er.textContent = error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message; return; }
      const me = await rpc('whoami').catch(() => null);
      if (!me || me.platform_role !== 'bibliotecario') { await sb.auth.signOut(); er.textContent = 'Esta cuenta no es la del Bibliotecario.'; return; }
      panel(me);
    };
  }

  async function panel(me){
    app.innerHTML = `<div class="bb"><div class="bb-top"><div><span class="ui-lbl">Mostrador del Bibliotecario</span><h1>Hola, ${esc(me.username)}</h1></div><button class="btn ghost" id="bbout">Cerrar sesión</button></div>
      <div class="bb-tabs">${[['resumen','Resumen'],['usuarios','Usuarios'],['equipos','Equipos y publicadores'],['solicitudes','Solicitudes'],['bitacora','Bitácora']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="bbv"><p class="mono">Cargando…</p></div></div>`;
    $('#bbout').onclick = async () => { await sb.auth.signOut(); location.href = '/'; };
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; panel(me); });
    try { await ({ resumen, usuarios, equipos, solicitudes, bitacora })[tab](); } catch (e) { $('#bbv').innerHTML = `<p style="color:#f59e7a">${esc(msg(e))}</p>`; }
  }
  const view = () => $('#bbv');

  async function resumen(){
    const o = await rpc('admin_overview');
    view().innerHTML = `<div class="bb-kpis">${[['Lectores', o.lectores], ['Publicadores', o.publicadores], ['Equipos', o.equipos], ['Obras', o.obras], ['Capítulos publicados', o.capitulos], ['Erratas abiertas', o.reportes], ['Solicitudes pendientes', o.solicitudes], ['Cuentas nuevas · 7 días', o.nuevos7d]].map(([l, v]) => `<div class="bb-kpi"><span class="ui-lbl">${l}</span><b>${v ?? 0}</b></div>`).join('')}</div>
      <div class="bb-box"><h3>Cómo funcionan los roles</h3><p class="mono" style="font-size:13px;line-height:1.7;margin:0">
      <b style="color:#f2c230">Bibliotecario</b> · único en toda la plataforma. Crea equipos, asigna publicadores, modera y ve la bitácora.<br>
      <b style="color:#8cc3f2">Publicador</b> · cualquier cuenta que pertenece a un equipo traductor. Entra al Estudio y publica según el rol que tenga en su equipo.<br>
      <b style="color:#a89f8a">Lector</b> · todas las demás cuentas. Leen, comentan, subrayan y siguen series.</p></div>`;
  }

  async function usuarios(){
    view().innerHTML = `<div class="bb-row"><label>Buscar<input id="bbq" placeholder="Usuario o correo"></label><label style="flex:0 0 180px">Rol<select id="bbr"><option value="">Todos</option><option value="lector">Lectores</option><option value="publicador">Publicadores</option><option value="bibliotecario">Bibliotecario</option></select></label></div><div id="bbu"></div>`;
    const draw = async () => {
      const rows = await rpc('admin_users', { p_q: $('#bbq').value.trim(), p_role: $('#bbr').value || null });
      $('#bbu').innerHTML = `<table class="bb-tbl"><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Equipos</th><th>Alta</th><th>Último acceso</th></tr></thead><tbody>${rows.map(u => { const [l, c] = ROLE[u.platform_role]; return `<tr><td><strong>${esc(u.username)}</strong></td><td class="mono">${esc(u.email)}</td><td><span class="bb-role" style="color:${c}">${l}</span></td><td>${u.teams.map(t => esc(t.name) + ' <span class="mono">(' + (TROLE[t.role] || t.role) + ')</span>').join('<br>') || '—'}</td><td class="mono">${when(u.created_at)}</td><td class="mono">${when(u.last_sign_in)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="mono">Sin resultados.</td></tr>'}</tbody></table>`;
    };
    let t; $('#bbq').oninput = () => { clearTimeout(t); t = setTimeout(draw, 300); }; $('#bbr').onchange = draw; await draw();
  }

  async function equipos(){
    const [{ data: teams }, users] = await Promise.all([sb.from('teams').select('id,slug,name,color,status').order('name'), rpc('admin_users', { p_q: '', p_role: 'publicador' })]);
    view().innerHTML = `<div class="bb-box"><h3>Nuevo equipo traductor</h3><div class="bb-row"><label>Nombre<input id="tn" placeholder="Kaori Translations"></label><label>Identificador<input id="ts" placeholder="kaori"></label><label style="flex:0 0 120px">Color<input id="tc" type="color" value="#f2c230" style="height:44px;padding:4px"></label><button class="btn" id="tcreate">Crear equipo</button></div></div>
      ${(teams || []).map(t => { const mem = users.filter(u => u.teams.some(x => x.id === t.id)); return `<div class="bb-box" style="border-left:6px solid ${esc(t.color || '#f2c230')}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(t.name)} <span class="mono">/${esc(t.slug)}</span></h3><span class="mono">${mem.length} publicador(es)</span></div>
        <table class="bb-tbl"><tbody>${mem.map(u => { const r = u.teams.find(x => x.id === t.id).role; return `<tr><td><strong>${esc(u.username)}</strong> <span class="mono">${esc(u.email)}</span></td><td>${TROLE[r] || r}</td><td style="text-align:right"><button class="bb-mini red" data-rm="${t.id}|${u.id}|${esc(u.username)}">Quitar del equipo</button></td></tr>`; }).join('') || '<tr><td class="mono">Sin publicadores todavía.</td></tr>'}</tbody></table>
        <div class="bb-row"><label>Agregar publicador (correo o usuario)<input data-add="${t.id}" placeholder="correo@ejemplo.com"></label><label style="flex:0 0 180px">Rol en el equipo<select data-role="${t.id}">${Object.entries(TROLE).map(([k, l]) => `<option value="${k}" ${k === 'editor' ? 'selected' : ''}>${l}</option>`).join('')}</select></label><button class="btn" data-go="${t.id}">Agregar</button></div></div>`; }).join('')}`;
    $('#tcreate').onclick = async () => { try { await rpc('admin_create_team', { p_name: $('#tn').value, p_slug: $('#ts').value.trim().toLowerCase(), p_color: $('#tc').value }); toast('Equipo creado'); equipos(); } catch (e) { toast(msg(e)); } };
    view().querySelectorAll('[data-go]').forEach(b => b.onclick = async () => { const id = b.dataset.go, who = view().querySelector(`[data-add="${id}"]`).value; if (!who.trim()) return toast('Escribe el correo o usuario'); try { await rpc('admin_add_publisher', { p_user: who, p_team: id, p_role: view().querySelector(`[data-role="${id}"]`).value }); toast('Ahora es Publicador del equipo'); equipos(); } catch (e) { toast(msg(e)); } });
    view().querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { const [t, u, n] = b.dataset.rm.split('|'); if (!confirm('¿Quitar a ' + n + ' del equipo? Si no pertenece a otro equipo volverá a ser Lector.')) return; try { await rpc('admin_remove_member', { p_team: t, p_user: u }); toast('Quitado del equipo'); equipos(); } catch (e) { toast(msg(e)); } });
  }

  async function solicitudes(){
    const [{ data, error }, { data: teams }] = await Promise.all([
      sb.from('translator_requests').select('id,alias,team_name,langs,links,message,reply,status,note,created_at,updated_at,team_id,profiles!translator_requests_user_id_fkey(username),teams(name,slug)').order('updated_at', { ascending: false }),
      sb.from('teams').select('id,name').order('name')]);
    if (error) throw error;
    const ST = { pending: ['Pendiente', '#f2c230'], info: ['Esperando respuesta', '#8cc3f2'], approved: ['Aprobada', '#a9d18e'], rejected: ['Rechazada', '#a89f8a'] };
    const list = (data || []).sort((a, b) => (a.status === 'pending' ? 0 : a.status === 'info' ? 1 : 2) - (b.status === 'pending' ? 0 : b.status === 'info' ? 1 : 2));
    view().innerHTML = list.map(r => { const open = r.status === 'pending' || r.status === 'info';
      return `<div class="bb-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(r.team_name || '(sin nombre de grupo)')} <span class="mono">· ${esc(r.alias)} · @${esc(r.profiles?.username || '')}</span></h3><span class="bb-role" style="color:${ST[r.status]?.[1]}">${ST[r.status]?.[0] || r.status}</span></div>
      <p class="mono" style="margin:0">${esc((r.langs || []).join(', '))} · ${when(r.updated_at || r.created_at)}</p>
      ${r.links ? `<p style="margin:0;white-space:pre-line">${esc(r.links)}</p>` : ''}${r.message ? `<p style="margin:0;white-space:pre-line"><b>Mensaje:</b> ${esc(r.message)}</p>` : ''}
      ${r.note ? `<p class="mono" style="margin:0">Tu nota: ${esc(r.note)}</p>` : ''}${r.reply && r.status === 'pending' ? `<p style="margin:0;white-space:pre-line;color:#8cc3f2"><b>Respuesta:</b> ${esc(r.reply)}</p>` : ''}
      ${r.status === 'approved' && r.teams ? `<p class="mono" style="margin:0">Equipo: ${esc(r.teams.name)} (/${esc(r.teams.slug)})</p>` : ''}
      ${r.status === 'pending' ? `<div class="bb-row"><label>Al aprobar<select data-team="${r.id}"><option value="">Crear equipo nuevo (propietario)</option>${(teams || []).map(t => `<option value="${t.id}">Unir a «${esc(t.name)}» como traductor</option>`).join('')}</select></label><label data-namewrap="${r.id}">Nombre del equipo<input data-name="${r.id}" maxlength="60" value="${esc(r.team_name || r.alias)}"></label></div>` : ''}
      ${open ? `<div class="bb-row"><label>Nota para el solicitante<input data-note="${r.id}" placeholder="Obligatoria para pedir información"></label>${r.status === 'pending' ? `<button class="btn" data-dec="${r.id}|approved">Aprobar</button><button class="bb-mini" data-dec="${r.id}|info">Pedir información</button>` : '<span class="mono">Esperando que responda</span>'}<button class="bb-mini red" data-dec="${r.id}|rejected">Rechazar</button></div>` : ''}</div>`; }).join('') || '<p class="mono">No hay solicitudes para publicar.</p>';
    view().querySelectorAll('[data-team]').forEach(s => s.onchange = () => { view().querySelector(`[data-namewrap="${s.dataset.team}"]`).hidden = !!s.value; });
    view().querySelectorAll('[data-dec]').forEach(b => b.onclick = async () => {
      const [id, st] = b.dataset.dec.split('|'), q = k => view().querySelector(`[data-${k}="${id}"]`);
      if (st === 'rejected' && !confirm('¿Rechazar esta solicitud?')) return;
      b.disabled = true;
      try { const tid = await rpc('admin_decide_request', { p_id: +id, p_status: st, p_note: q('note')?.value || null, p_team: q('team')?.value || null, p_team_name: q('name')?.value || null });
        toast(st === 'approved' ? 'Aprobada · el equipo ya está listo y el solicitante es publicador' : st === 'info' ? 'Pediste más información' : 'Solicitud rechazada'); solicitudes();
      } catch (e) { b.disabled = false; toast(msg(e)); } });
  }


  async function bitacora(){
    const rows = await rpc('admin_audit', { p_limit: 200 });
    view().innerHTML = `<table class="bb-tbl"><thead><tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Sobre</th></tr></thead><tbody>${rows.map(r => `<tr><td class="mono">${when(r.at)}</td><td>${esc(r.actor || '—')}</td><td>${esc(r.action.replace(/_/g, ' '))}</td><td class="mono">${esc(r.target_type)} ${esc((r.target_id || '').slice(0, 8))}</td></tr>`).join('') || '<tr><td colspan="4" class="mono">Sin movimientos todavía.</td></tr>'}</tbody></table>`;
  }

  return { render };
}

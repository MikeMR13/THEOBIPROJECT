// Panel del Bibliotecario: acceso único en /bibliotecario (alias /admin).
const CSS = `
.bb-sea{display:grid;gap:14px}.bb-sea-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px;align-items:start}
.bb-se{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;align-items:center;padding:8px 0;border-top:1px solid #221f18}.bb-se input[data-greet]{grid-column:1/-1;width:100%;font-size:13px;padding:7px}
.bb-ck{display:flex;gap:8px;align-items:center;font-size:14px;font-weight:600;cursor:pointer}.bb-ck input{width:16px;height:16px;accent-color:#f2c230}.bb-ck i{width:10px;height:10px;border-radius:50%}
.bb-seg{display:inline-flex;border:1px solid #3d3628}.bb-seg button{padding:7px 12px;background:none;border:none;border-right:1px solid #3d3628;color:#cfc6b0;font:inherit;font-size:12px;font-weight:600;cursor:pointer}.bb-seg button:last-child{border-right:none}.bb-seg button.on{background:#f2c230;color:#0d0c0a}
.bb-pv{width:100%;height:560px;border:1px solid #2f2a20;background:#0d0c0a}.bb-save{position:sticky;bottom:0;display:flex;gap:12px;justify-content:flex-end;align-items:center;padding:12px 0;background:#0d0c0a;border-top:1px solid #2f2a20}

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
      <div class="bb-tabs">${[['resumen','Resumen'],['usuarios','Usuarios'],['equipos','Equipos y publicadores'],['solicitudes','Solicitudes'],['compras','Enlaces de compra'],['temporadas','Temporadas'],['bitacora','Bitácora']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="bbv"><p class="mono">Cargando…</p></div></div>`;
    $('#bbout').onclick = async () => { await sb.auth.signOut(); location.href = '/'; };
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; panel(me); });
    try { await ({ resumen, usuarios, equipos, solicitudes, compras, temporadas, bitacora })[tab](); } catch (e) { $('#bbv').innerHTML = `<p style="color:#f59e7a">${esc(msg(e))}</p>`; }
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


  async function temporadas(){
    const PS = await import('/season.js?v=2');
    const [{ data: row, error }, { data: cal }, { data: slog }, { data: lun }] = await Promise.all([sb.from('platform_settings').select('seasons,updated_at').eq('id', 1).single(), sb.from('season_calendar').select('key,label,starts,hemi').gte('starts', new Date().toISOString().slice(0, 10)).order('starts').limit(120), sb.from('season_sync_log').select('ran_at,ok,detail').order('id', { ascending: false }).limit(1), sb.from('season_calendar').select('key,day,source').in('key', ['seollal', 'chuseok', 'tsukimi', 'dano', 'buda', 'pascua']).not('day', 'is', null).order('day')]);
    const lastY = (lun || []).reduce((a, r) => Math.max(a, +r.day.slice(0, 4)), 0), sl = slog?.[0];
    if (error) throw error;
    const C = { auto: [], greet: {}, intensity: 'sutil', density: 'normal', ...(row.seasons || {}) }; let prev = temporadas.prev || PS.platformKey() || 'navidad', dirty = false;
    const seg = (k, o) => `<div class="bb-seg">${Object.entries(o).map(([v, l]) => `<button type="button" data-${k}="${v}" class="${C[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const next = (cal || []).filter(c => C.auto.includes(c.key) && (!c.hemi || c.hemi === 'norte')).slice(0, 4);
    const draw = () => { view().innerHTML = `<div class="bb-sea">
      <div class="bb-box"><h3>Temporadas de la plataforma</h3><p class="mono" style="font-size:13px;margin:0 0 12px;line-height:1.5">Se aplican en Inicio, Catálogo, Lanzamientos, la ficha de cada obra y, con un detalle discreto, en el lector. En la ficha de una obra y en la página de un equipo manda la temporada del equipo si tiene una activa. Cada lector puede apagarlas en sus ajustes. Las estaciones usan el hemisferio según la zona horaria de cada lector.</p>
        <div class="bb-row" style="align-items:center"><span class="mono">Intensidad</span>${seg('intensity', PS.INT)}<span class="mono">Partículas</span>${seg('density', PS.DEN)}</div>
        <div class="bb-row" style="align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #2f2a20"><span class="mono" style="font-size:12px;flex:1;line-height:1.5">Fechas lunares y Pascua cargadas hasta <b>${lastY || '—'}</b>. Se sincronizan solas con Calendarific el 2 de enero y el 2 de julio.${sl ? ` Última sincronización: ${when(sl.ran_at)} · ${sl.ok ? '<span style="color:#a9d18e">correcta</span>' : `<span style="color:#f59e7a">falló: ${esc(sl.detail?.error || '')}</span>`}` : ''}</span><button type="button" class="btn ghost" id="sea-sync">Sincronizar fechas ahora</button></div>
        ${next.length ? `<p class="mono" style="font-size:12px;margin:10px 0 0">Próximas: ${next.map(c => `${esc(c.label)} · ${new Date(c.starts + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`).join(' · ')}. Te avisamos 7 días antes.</p>` : '<p class="mono" style="font-size:12px;margin:10px 0 0">Ninguna temporada automática activada.</p>'}</div>
      <div class="bb-sea-g">${Object.entries(PS.SGROUPS).map(([g, gl]) => `<div class="bb-box"><h3>${gl}</h3>${Object.entries(PS.SEASONS).filter(([, s]) => s.g === g).map(([k, s]) => `<div class="bb-se"><label class="bb-ck"><input type="checkbox" data-auto="${k}" ${C.auto.includes(k) ? 'checked' : ''}><i style="background:${s.ac}"></i>${esc(s.l)}</label><button type="button" class="btn ghost" data-pv="${k}" style="padding:4px 10px;font-size:12px">Ver</button>
          <input data-greet="${k}" maxlength="140" value="${esc(C.greet[k] ?? PS.SUGGEST[k] ?? '')}" aria-label="Saludo de ${esc(s.l)}" placeholder="Sin saludo"></div>`).join('')}</div>`).join('')}</div>
      <div class="bb-box"><div class="bb-row" style="align-items:center;justify-content:space-between"><h3 style="margin:0">Vista previa de Inicio · ${esc(PS.SEASONS[prev].l)}</h3><span style="display:flex;gap:8px;align-items:center"><select id="sea-pv">${Object.entries(PS.SEASONS).map(([k, s]) => `<option value="${k}" ${k === prev ? 'selected' : ''}>${esc(s.l)}</option>`).join('')}</select><a class="btn ghost" href="/?temporada=${prev}" target="_blank" rel="noopener">Abrir en pestaña ↗</a></span></div>
        <p class="mono" style="font-size:12px;margin:6px 0 10px">Muestra lo guardado. Guarda primero para ver un saludo nuevo.</p><iframe class="bb-pv" src="/?temporada=${prev}&vista=${Date.now()}" title="Vista previa de Inicio con la temporada"></iframe><p class="mono bb-pvx" hidden style="font-size:12px;margin:8px 0 0;color:#f59e7a">El navegador no dejó mostrar la vista previa aquí. Recarga con Ctrl+Shift+R o usa «Abrir en pestaña».</p></div>
      <div class="bb-save"><span class="mono" id="sea-st">${dirty ? 'Cambios sin guardar' : row.updated_at ? 'Guardado ' + when(row.updated_at) : ''}</span><button class="btn" id="sea-save" ${dirty ? '' : 'disabled'}>Guardar temporadas</button></div></div>`;
      const V = view(), mark = () => { dirty = true; $('#sea-st').textContent = 'Cambios sin guardar'; $('#sea-save').disabled = false; };
      V.querySelectorAll('[data-intensity]').forEach(b => b.onclick = () => { C.intensity = b.dataset.intensity; dirty = true; draw(); });
      V.querySelectorAll('[data-density]').forEach(b => b.onclick = () => { C.density = b.dataset.density; dirty = true; draw(); });
      V.querySelectorAll('[data-auto]').forEach(c => c.onchange = () => { const k = c.dataset.auto; C.auto = c.checked ? [...C.auto, k] : C.auto.filter(x => x !== k); mark(); });
      V.querySelectorAll('[data-greet]').forEach(i => i.oninput = () => { C.greet[i.dataset.greet] = i.value; mark(); });
      V.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { prev = temporadas.prev = b.dataset.pv; draw(); V.querySelector('.bb-pv').scrollIntoView ? window.scrollTo({ top: V.querySelector('.bb-pv').getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' }) : 0; });
      $('#sea-sync').onclick = async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Sincronizando…'; const { data, error } = await sb.functions.invoke('season-sync', { body: { years: 4 } }); if (error || !data?.ok) { toast('No se pudo sincronizar: ' + (data?.error || error?.message || '')); b.disabled = false; b.textContent = 'Sincronizar fechas ahora'; return; } toast('Fechas sincronizadas'); await PS.load(sb, true); temporadas(); };
      const fr = V.querySelector('.bb-pv'); let okL = false; fr.onload = () => { try { okL = !!fr.contentDocument?.body?.childElementCount; } catch { okL = false; } V.querySelector('.bb-pvx').hidden = okL; }; setTimeout(() => { if (!okL) V.querySelector('.bb-pvx').hidden = false; }, 6000);
      $('#sea-pv').onchange = e => { prev = temporadas.prev = e.target.value; draw(); };
      $('#sea-save').onclick = async e => { e.currentTarget.disabled = true; const greet = Object.fromEntries(Object.entries(C.greet).map(([k, v]) => [k, String(v).slice(0, 140)])); const { error } = await sb.from('platform_settings').update({ seasons: { auto: C.auto, greet, intensity: C.intensity, density: C.density }, updated_at: new Date().toISOString() }).eq('id', 1); if (error) { e.currentTarget.disabled = false; return toast(msg(error)); } dirty = false; row.updated_at = new Date().toISOString(); await PS.load(sb, true); toast('Temporadas guardadas'); draw(); };
    };
    draw();
  }

  async function compras(){
    const rows = await rpc('admin_purchase_queue');
    view().innerHTML = `<div class="bb-box"><h3>Enlaces de compra por verificar · ${rows.length}</h3><p class="mono" style="font-size:13px;margin:0 0 10px">Abre cada enlace y confirma que es una tienda o editorial oficial de esa obra y volumen. Solo los verificados se muestran a los lectores.</p>
      ${rows.length ? `<table class="bb-tbl"><thead><tr><th>Obra</th><th>Equipo</th><th>Vol.</th><th>Tienda</th><th>Enlace</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="/serie/${esc(r.series_slug)}">${esc(r.series_title)}</a></td><td>${esc(r.team_name)}</td><td>${r.vol ?? '—'}</td><td>${esc(r.store)}<br><span class="mono">${esc([r.fmt, r.region].filter(Boolean).join(' · '))}</span></td><td><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url.replace(/^https:\/\//, '').slice(0, 48))} ↗</a></td><td style="white-space:nowrap"><button class="btn" data-ok="${r.id}">Verificar</button> <button class="btn ghost" data-no="${r.id}">Rechazar</button></td></tr>`).join('')}</tbody></table>` : '<p class="mono">No hay enlaces pendientes.</p>'}</div>`;
    view().querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => { b.disabled = true; const { error } = await sb.from('purchase_links').update({ verified: true }).eq('id', b.dataset.ok); if (error) { b.disabled = false; return toast(msg(error)); } toast('Enlace verificado'); compras(); });
    view().querySelectorAll('[data-no]').forEach(b => b.onclick = async () => { if (!confirm('¿Rechazar y borrar este enlace?')) return; const { error } = await sb.from('purchase_links').delete().eq('id', b.dataset.no); if (error) return toast(msg(error)); toast('Enlace rechazado'); compras(); });
  }

  async function bitacora(){
    const rows = await rpc('admin_audit', { p_limit: 200 });
    view().innerHTML = `<table class="bb-tbl"><thead><tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Sobre</th></tr></thead><tbody>${rows.map(r => `<tr><td class="mono">${when(r.at)}</td><td>${esc(r.actor || '—')}</td><td>${esc(r.action.replace(/_/g, ' '))}</td><td class="mono">${esc(r.target_type)} ${esc((r.target_id || '').slice(0, 8))}</td></tr>`).join('') || '<tr><td colspan="4" class="mono">Sin movimientos todavía.</td></tr>'}</tbody></table>`;
  }

  return { render };
}

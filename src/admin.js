import { renderAdminSeo } from './admin-seo.js?v=1';
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
/* Fase 2: controles del Bibliotecario sin barras de navegación de varias filas. */
@media(max-width:760px){
  .bb-top h1{font-size:clamp(26px,7vw,36px)}
  .bb-tabs{flex-wrap:nowrap;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:thin;scroll-snap-type:x proximity;scroll-padding-inline:8px}
  .bb-tabs button{flex:none;white-space:nowrap;min-height:44px;scroll-snap-align:start}
  .bb-sea-g{grid-template-columns:minmax(0,1fr)}
  .bb-se{grid-template-columns:minmax(0,1fr) auto;gap:10px}
  .bb-se input[data-greet]{grid-column:1/-1;min-height:44px}
  .bb-se .btn{min-height:44px}
  .bb-box{min-width:0;padding:14px}
  .bb-pv{width:100%;max-width:100%;height:480px}
  .bb-save{padding-bottom:calc(12px + env(safe-area-inset-bottom));flex-wrap:wrap}
}
@media(max-width:760px){
/* Desplazar solo el contenido del Mostrador sin ocultar columnas ni modificar las tablas. */
.bb #bbv{max-width:100%;min-width:0;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.bb #bbv .bb-tbl{min-width:720px}
}

/* Mostrador · integración visual. No se alteran estilos ni controladores de Temporadas. */
.bb .bb-top{align-items:center;border-bottom:1px solid #383124;padding-bottom:20px;margin-bottom:17px}
.bb .bb-heading{display:grid;gap:7px}
.bb .bb-kicker{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--gold)}
.bb .bb-top h1{font-size:clamp(25px,3.1vw,38px);line-height:1.14}
.bb .bb-top h1 em{font-style:normal;color:var(--gold)}
.bb .bb-top .bb-sub{margin:0;color:var(--mute);font-size:13px}
.bb .bb-headside{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.bb .bb-headside .bb-admin-tag{display:grid;gap:3px;border:1px solid #625020;background:#1b1811;color:var(--gold);padding:9px 12px;font-size:12px;font-weight:700}
.bb .bb-headside .bb-admin-tag small{font-family:'IBM Plex Mono',monospace;color:var(--mute);font-size:10px;font-weight:400}
.bb .bb-tabs{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scroll-snap-type:x proximity;scroll-padding:0 12px}
.bb .bb-tabs button{flex:none;min-height:43px;scroll-snap-align:start;white-space:nowrap;font-size:13px}
.bb .bb-kpi{min-height:100px;border-top:3px solid var(--gold);background:#191710}
.bb .bb-kpi .ui-lbl{font-family:'IBM Plex Mono',monospace;letter-spacing:.07em;color:var(--mute)}
.bb .bb-kpi b{font-size:clamp(26px,3vw,34px)}
.bb .bb-dashboard{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px}
.bb .bb-dashboard .bb-box{margin-bottom:0}
.bb .bb-task{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #393124}
.bb .bb-task:last-child{border-bottom:0}
.bb .bb-task b{font-size:13px;font-weight:700}
.bb .bb-task small{display:block;margin-top:6px;color:var(--mute);font-size:11px}
.bb .bb-rule{padding:11px 12px;border-left:3px solid var(--gold);background:#242015;display:grid;gap:4px}
.bb .bb-rule b{font-size:13px}
.bb .bb-rule small{font-size:11px;line-height:1.65;color:var(--mute)}
.bb .bb-secintro{display:flex;gap:12px;align-items:start;justify-content:space-between;margin-bottom:15px;flex-wrap:wrap}
.bb .bb-secintro h2{font-family:'Shippori Mincho B1',serif;font-size:23px;font-weight:500;margin:0 0 5px}
.bb .bb-secintro p{margin:0;color:var(--mute);font-size:12px;line-height:1.6}
.bb .bb-supercard{display:grid;gap:10px;border:1px solid var(--line);background:#17150f;padding:18px;margin-bottom:11px}
.bb .bb-superhead{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:9px}
.bb .bb-superhead h3{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:20px;margin:0}
.bb .bb-super-meta{font-family:'IBM Plex Mono',monospace;color:var(--mute);font-size:11px}
.bb .bb-status{font-family:'IBM Plex Mono',monospace;display:inline-flex;border:1px solid #675a3b;font-size:10px;padding:4px 7px}
.bb .bb-status.ok{border-color:#4b7046;color:#a9d18e}
.bb .bb-status.warn{border-color:#957a22;color:var(--gold)}
.bb .bb-super-actions{display:flex;gap:8px;flex-wrap:wrap}
.bb .bb-super-note{border-left:3px solid var(--gold);padding:12px 14px;background:#211d13;color:#d2c5aa;line-height:1.7;font-size:12px;margin:12px 0 18px}
.bb .bb-super-detail{padding:12px;border:1px solid #4b3d24;background:#11100d}
.bb .bb-super-detail .bb-tbl{min-width:520px}
.bb .bb-role-lock{font-family:'IBM Plex Mono',monospace;color:var(--gold);font-size:11px}
@media(max-width:760px){
  .bb .bb-dashboard{grid-template-columns:1fr}
  .bb .bb-top{align-items:start}
  .bb .bb-headside{width:100%;justify-content:space-between}
  .bb .bb-secintro h2{font-size:21px}
  .bb .bb-supercard{padding:14px}
  .bb .bb-task{align-items:start}
}

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

  async function gate(err = ''){
    app.innerHTML = `<div class="bb bb-gate"><form class="bb-card" id="bbf" novalidate>
      <span class="bb-stamp" aria-hidden="true">司</span>
      <span class="ui-lbl" style="color:#5a5244">El Obi del Lector · Acceso restringido</span>
      <h1>Mostrador del Bibliotecario</h1>
      <p>Esta entrada es solo para quien administra la biblioteca. Los publicadores y lectores entran desde <a href="/entrar" style="color:#0d0c0a">la entrada general</a>.</p>
      <label>Correo<input name="email" type="email" autocomplete="username" required></label>
      <label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required></label>
      <span class="err" role="alert">${esc(err)}</span>
      <div id="bb-ts" style="min-height:65px"></div>
      <button class="btn">Abrir el mostrador</button></form></div>`;
    const f = $('#bbf'), er = f.querySelector('.err');
    const CF = await import('/captcha.js?v=1'), cap = CF.mount($('#bb-ts'), { action: 'admin', theme: 'light' });
    f.onsubmit = async e => {
      e.preventDefault(); er.textContent = '';
      const email = f.email.value.trim(), password = f.password.value;
      if (!email || password.length < 8) { er.textContent = 'Escribe tu correo y tu contraseña.'; return; }
      const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Verificando…';
      let captchaToken; try { captchaToken = await cap.token(); } catch (x) { b.disabled = false; b.textContent = 'Abrir el mostrador'; er.textContent = x.message; return; }
      b.textContent = 'Comprobando…';
      const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } }); cap.reset();
      b.disabled = false; b.textContent = 'Abrir el mostrador';
      if (error) { er.textContent = error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message; return; }
      const me = await rpc('whoami').catch(() => null);
      if (!me || me.platform_role !== 'bibliotecario') { await sb.auth.signOut(); er.textContent = 'Esta cuenta no es la del Bibliotecario.'; return; }
      panel(me);
    };
  }

  async function panel(me){
    app.innerHTML = `<div class="bb"><div class="bb-top"><div class="bb-heading"><span class="bb-kicker">EL OBI DEL LECTOR · ADMINISTRACIÓN GENERAL</span><h1>Mostrador del <em>Bibliotecario</em></h1><p class="bb-sub">Supervisión global · Independencia editorial de los equipos</p></div><div class="bb-headside"><span class="bb-admin-tag">◆ ${esc(me.username)}<small>Autoridad de plataforma</small></span><button class="btn ghost" id="bbout">Cerrar sesión</button></div></div>
      <div class="bb-tabs">${[['resumen','Resumen'],['usuarios','Usuarios'],['equipos','Equipos y publicadores'],['invitaciones','Invitaciones'],['solicitudes','Solicitudes'],['supervision','Supervisión'],['compras','Enlaces de compra'],['inicio','Inicio'],['metricas','Métricas Inicio'],['resenas','Reseñas'],['temporadas','Temporadas'],['seo','SEO y compartir'],['difusion','Difusión'],['apoyar','Botón Apoyar'],['bitacora','Bitácora']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="bbv"><p class="mono">Cargando…</p></div></div>`;
    $('#bbout').onclick = async () => { await sb.auth.signOut(); location.href = '/'; };
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; panel(me); });
    try { await ({ resumen, usuarios, equipos, invitaciones, solicitudes, supervision, compras, inicio, metricas, resenas, temporadas, seo, difusion, apoyar, bitacora })[tab](); } catch (e) { $('#bbv').innerHTML = `<p style="color:#f59e7a">${esc(msg(e))}</p>`; }
  }
  const view = () => $('#bbv');
  async function seo(){ await renderAdminSeo({sb,view,toast}); }
  async function difusion(){
    const { renderAdminDiffusion } = await import('./admin-diffusion.js?v=3');
    await renderAdminDiffusion({sb,root:view(),team:null,esc,toast});
  }


  // Solo los Bibliotecarios pueden consultar estos contadores. El servidor
  // devuelve totales diarios por categoría, nunca identidades o sesiones.
  async function metricas(days=30){
    const rows=await rpc('admin_carousel_metrics',{p_days:days});
    const names={launch:'Nuevo lanzamiento',release:'Nuevos volúmenes y capítulos',popular:'Top semanal',
      historic:'Más vistas',editorial:'Selección editorial',discover:'Joya por descubrir',
      trending:'Tendencia',team:'Recomendaciones grupales',prelaunch:'Próximos estrenos',other:'Otros'};
    const all=Object.fromEntries(Object.keys(names).map(k=>[k,{show:0,click:0,read:0}]));
    const speed={mobile:{fast:0,moderate:0,slow:0},desktop:{fast:0,moderate:0,slow:0}};
    for(const row of Array.isArray(rows)?rows:[]){
      if(all[row.category]?.[row.action]!==undefined)all[row.category][row.action]+=Number(row.total)||0;
      if(speed[row.category]?.[row.action]!==undefined)speed[row.category][row.action]+=Number(row.total)||0;
    }
    const number=n=>Number(n||0).toLocaleString('es-MX');
    const percent=(n,d)=>d ? Math.round(n*100/d)+' %' : '—';
    const allTotals=Object.values(all).reduce((a,x)=>({show:a.show+x.show,click:a.click+x.click,read:a.read+x.read}),{show:0,click:0,read:0});
    view().innerHTML=`<div class="bb-box">
      <h3>Métricas agregadas · Carrusel de Inicio</h3>
      <p class="mono" style="font-size:12px;line-height:1.6">Sin identificadores de cuenta, IP, novela ni sesión en la base de datos.
      Son eventos totales, no visitantes únicos; pueden verse afectados por automatizaciones. Solo incluyen tráfico posterior a la activación.</p>
      <div class="bb-seg" style="margin:12px 0 18px">${[7,30,90].map(n=>`<button type="button" data-days="${n}" class="${days===n?'on':''}">${n} días</button>`).join('')}</div>
      <div class="bb-kpis">${[['Diapositivas mostradas',allTotals.show],['Clics en el carrusel',allTotals.click],['Lecturas iniciadas',allTotals.read]].map(([name,value])=>`<div class="bb-kpi"><span class="ui-lbl">${name}</span><b>${number(value)}</b></div>`).join('')}</div>
      <h4>Resultados por categoría</h4>
      <div style="overflow:auto"><table class="bb-tbl"><thead><tr><th>Categoría</th><th>Mostradas</th><th>Clics</th><th>Lecturas</th><th>Clics / mostradas</th></tr></thead><tbody>
        ${Object.entries(all).map(([key,counts])=>`<tr><td>${esc(names[key])}</td><td>${number(counts.show)}</td><td>${number(counts.click)}</td><td>${number(counts.read)}</td><td>${percent(counts.click,counts.show)}</td></tr>`).join('')}
      </tbody></table></div>
      <h4 style="margin-top:24px">Tiempo hasta mostrar Inicio</h4>
      <p class="mono" style="font-size:12px">Medición real del dispositivo: menos de 1.5 s, de 1.5 a 3 s o más de 3 s.
      No es un resultado de Lighthouse ni sustituye las métricas de Core Web Vitals.</p>
      <div style="overflow:auto"><table class="bb-tbl"><thead><tr><th>Dispositivo</th><th>≤ 1.5 s</th><th>1.5–3 s</th><th>&gt; 3 s</th><th>Muestras</th></tr></thead><tbody>
      ${Object.entries(speed).map(([device,counts])=>{
        const total=counts.fast+counts.moderate+counts.slow;
        return `<tr><td>${device==='mobile'?'Móvil (≤ 600 px)':'Escritorio'}</td>
          <td>${number(counts.fast)} (${percent(counts.fast,total)})</td>
          <td>${number(counts.moderate)} (${percent(counts.moderate,total)})</td>
          <td>${number(counts.slow)} (${percent(counts.slow,total)})</td><td>${number(total)}</td></tr>`;
      }).join('')}</tbody></table></div>
      ${!allTotals.show ? '<p class="mono" style="font-size:12px">Aún no hay exposiciones medidas para este período.</p>' : ''}
    </div>`;
    view().querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>metricas(Number(b.dataset.days)));
  }

  async function resumen(){
    const o = await rpc('admin_overview');
    const goto = (label, target, detail) => `<div class="bb-task"><div><b>${esc(label)}</b><small>${esc(detail)}</small></div><button class="bb-mini" data-jump="${target}">Revisar</button></div>`;
    view().innerHTML = `<div class="bb-kpis">${[['Lectores', o.lectores], ['Publicadores', o.publicadores], ['Equipos', o.equipos], ['Obras', o.obras], ['Capítulos publicados', o.capitulos], ['Erratas abiertas', o.reportes], ['Solicitudes pendientes', o.solicitudes], ['Cuentas nuevas · 7 días', o.nuevos7d]].map(([l,v])=>`<div class="bb-kpi"><span class="ui-lbl">${esc(l)}</span><b>${v ?? 0}</b></div>`).join('')}</div>
      <div class="bb-dashboard">
        <section class="bb-box"><h3>Atención administrativa</h3>
          ${goto('Solicitudes de publicación', 'solicitudes', `${o.solicitudes ?? 0} solicitudes pendientes`)}
          ${goto('Incidencias de la comunidad', 'resenas', 'Revisar reseñas reportadas')}
          ${goto('Supervisión de las obras', 'supervision', 'Consultar publicaciones y borradores de todos los equipos')}
        </section>
        <section class="bb-box"><h3>Autoridad y límites</h3>
          <div class="bb-rule"><b>◆ Administración global</b><small>Usuarios, equipos, solicitudes y configuración de la plataforma.</small></div>
          <div class="bb-rule"><b>▤ Supervisión de publicaciones</b><small>Visibilidad general de obras y borradores, sin asumir edición.</small></div>
          <div class="bb-rule"><b>◇ Autonomía editorial</b><small>Cada equipo conserva sus traducciones, capítulos y decisiones editoriales.</small></div>
        </section>
      </div>`;
    view().querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { app.querySelector('[data-t="' + b.dataset.jump + '"]')?.click(); });
  }

  async function invitaciones(){
    const { renderAdminInvitations } = await import('/admin-invitations.js?v=1');
    await renderAdminInvitations({ sb, view, esc, toast, rpc, when });
  }

  async function usuarios(){
    view().innerHTML = `<div class="bb-secintro"><div><h2>Gestión de usuarios</h2><p>Consulta de cuentas, roles y equipos · Privacidad protegida</p></div></div><div class="bb-row"><label>Buscar<input id="bbq" placeholder="Usuario o correo"></label><label style="flex:0 0 180px">Rol<select id="bbr"><option value="">Todos</option><option value="lector">Lectores</option><option value="publicador">Publicadores</option><option value="bibliotecario">Bibliotecario</option></select></label></div><div id="bbu"></div>`;
    const draw = async () => {
      const rows = await rpc('admin_users', { p_q: $('#bbq').value.trim(), p_role: $('#bbr').value || null });
      $('#bbu').innerHTML = `<table class="bb-tbl"><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Equipos</th><th>Alta</th><th>Último acceso</th></tr></thead><tbody>${rows.map(u => { const [l, c] = ROLE[u.platform_role]; return `<tr><td><strong>${esc(u.username)}</strong></td><td class="mono">${esc(u.email)}</td><td><span class="bb-role" style="color:${c}">${l}</span></td><td>${u.teams.map(t => esc(t.name) + ' <span class="mono">(' + (TROLE[t.role] || t.role) + ')</span>').join('<br>') || '—'}</td><td class="mono">${when(u.created_at)}</td><td class="mono">${when(u.last_sign_in)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="mono">Sin resultados.</td></tr>'}</tbody></table>`;
    };
    let t; $('#bbq').oninput = () => { clearTimeout(t); t = setTimeout(draw, 300); }; $('#bbr').onchange = draw; await draw();
  }

  async function equipos(){
    const [{ data: teams }, users] = await Promise.all([sb.from('teams').select('id,slug,name,color,status,official_verified').order('name'), rpc('admin_users', { p_q: '', p_role: 'publicador' })]);
    view().innerHTML = `<div class="bb-box"><h3>Nuevo equipo traductor</h3><div class="bb-row"><label>Nombre<input id="tn" placeholder="Kaori Translations"></label><label>Identificador<input id="ts" placeholder="kaori"></label><label style="flex:0 0 120px">Color<input id="tc" type="color" value="#f2c230" style="height:44px;padding:4px"></label><button class="btn" id="tcreate">Crear equipo</button></div></div>
      ${(teams || []).map(t => { const mem = users.filter(u => u.teams.some(x => x.id === t.id)); return `<div class="bb-box" style="border-left:6px solid ${esc(t.color || '#f2c230')}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(t.name)} <span class="mono">/${esc(t.slug)}</span></h3><span class="mono">${mem.length} publicador(es) · ${t.official_verified ? "✓ Verificado" : "Sin verificar"}</span></div>
        <table class="bb-tbl"><tbody>${mem.map(u => { const r = u.teams.find(x => x.id === t.id).role; return `<tr><td><strong>${esc(u.username)}</strong> <span class="mono">${esc(u.email)}</span></td><td>${TROLE[r] || r}</td><td style="text-align:right"><button class="bb-mini red" data-rm="${t.id}|${u.id}|${esc(u.username)}" ${r === "owner" ? 'disabled title="La propiedad requiere transferencia"':''}>${r === "owner" ? "Propietario protegido" : "Quitar del equipo"}</button></td></tr>`; }).join('') || '<tr><td class="mono">Sin publicadores todavía.</td></tr>'}</tbody></table>
        <div class="bb-row"><label>Agregar publicador (correo o usuario)<input data-add="${t.id}" placeholder="correo@ejemplo.com"></label><label style="flex:0 0 180px">Rol en el equipo<select data-role="${t.id}">${Object.entries(TROLE).map(([k, l]) => `<option value="${k}" ${k === 'editor' ? 'selected' : ''}>${l}</option>`).join('')}</select></label><button class="btn" data-go="${t.id}">Agregar</button></div></div>`; }).join('')}`;
    $('#tcreate').onclick = async () => { try { await rpc('admin_create_team', { p_name: $('#tn').value, p_slug: $('#ts').value.trim().toLowerCase(), p_color: $('#tc').value }); toast('Equipo creado'); equipos(); } catch (e) { toast(msg(e)); } };
    view().querySelectorAll('[data-go]').forEach(b => b.onclick = async () => { const id = b.dataset.go, who = view().querySelector(`[data-add="${id}"]`).value; if (!who.trim()) return toast('Escribe el correo o usuario'); try { await rpc('admin_add_publisher', { p_user: who, p_team: id, p_role: view().querySelector(`[data-role="${id}"]`).value }); toast('Ahora es Publicador del equipo'); equipos(); } catch (e) { toast(msg(e)); } });
    view().querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { const [t, u, n] = b.dataset.rm.split('|'); if (!confirm('¿Quitar a ' + n + ' del equipo? Si no pertenece a otro equipo volverá a ser Lector.')) return; try { await rpc('admin_remove_member', { p_team: t, p_user: u }); toast('Quitado del equipo'); equipos(); } catch (e) { toast(msg(e)); } });
  }


  async function supervision(){
    view().innerHTML = `<div class="bb-secintro"><div><h2>Supervisión de publicaciones</h2><p>Lectura administrativa de todas las obras · La edición corresponde a cada equipo</p></div><span class="bb-status warn">SOLO SUPERVISIÓN</span></div>
      <div class="bb-super-note">El Bibliotecario puede consultar publicaciones y borradores. Esta vista no permite editar traducciones, alterar calendarios ni borrar capítulos. Las sanciones editoriales deberán tramitarse mediante un procedimiento administrativo independiente y auditado.</div>
      <div class="bb-row"><label>Buscar obra<input id="bb-superq" placeholder="Buscar por título"></label></div><div id="bb-superlist"><p class="mono">Consultando biblioteca…</p></div>`;
    const q = view().querySelector('#bb-superq'), list = view().querySelector('#bb-superlist');
    let delay;
    async function load(){
      const term = q.value.trim();
      let query = sb.from('series').select('id,title,slug,published,archived_at,team_id,teams(name)')
        .order('title').limit(100);
      if(term) query = query.ilike('title', '%' + term.replace(/[%_]/g,'') + '%');
      const {data, error} = await query;
      if(!list.isConnected)return;
      if(error) throw error;
      list.innerHTML = (data||[]).map(w => `<article class="bb-supercard">
        <div class="bb-superhead"><h3>${esc(w.title)}</h3>
        <span class="bb-status ${w.archived_at ? 'warn' : w.published ? 'ok':'warn'}">${w.archived_at ? 'Archivada' : w.published ? 'Publicada':'Borrador'}</span></div>
        <div class="bb-super-meta">Equipo: ${esc(w.teams?.name || '—')} · /serie/${esc(w.slug)}</div>
        <div class="bb-super-actions"><button class="bb-mini" data-series="${w.id}">Consultar capítulos</button>
          ${w.published && !w.archived_at ? `<a class="bb-mini" href="/serie/${encodeURIComponent(w.slug)}" style="text-decoration:none">Ver ficha ↗</a>` : ''}</div>
        <div data-detail="${w.id}" hidden></div>
      </article>`).join('') || '<p class="mono">No se encontraron obras con ese título.</p>';
      list.querySelectorAll('[data-series]').forEach(b => b.onclick = async () => {
        const id=b.dataset.series, target=list.querySelector('[data-detail="'+id+'"]');
        if(!target.hidden){target.hidden=true;return;}
        target.hidden=false;target.className='bb-super-detail';
        target.innerHTML='<p class="mono">Consultando capítulos…</p>';
        const {data:chapters,error:err}=await sb.from('chapters').select('id,num,status,publish_at')
          .eq('series_id',id).order('num').limit(50);
        if(!target.isConnected)return;
        target.innerHTML=err ? `<p class="mono">${esc(err.message)}</p>` :
          `<div style="overflow-x:auto"><table class="bb-tbl"><thead><tr><th>Capítulo</th><th>Estado</th><th>Programación</th></tr></thead><tbody>
          ${(chapters||[]).map(c=>`<tr><td>${esc(c.num)}</td><td>${esc(c.status)}</td><td>${c.publish_at ? esc(when(c.publish_at)) : '—'}</td></tr>`).join('') || '<tr><td colspan="3">No hay capítulos.</td></tr>'}</tbody></table></div>`;
      });
    }
    q.oninput=()=>{clearTimeout(delay);delay=setTimeout(()=>load().catch(e=>{list.textContent='No se pudo consultar: '+msg(e)}),300);};
    await load();
  }

  async function solicitudes(){
    const [{ data, error }, { data: teams }] = await Promise.all([
      sb.from('translator_requests').select('id,alias,team_name,langs,links,message,reply,status,note,created_at,updated_at,team_id,user_id,teams(name,slug)').order('updated_at', { ascending: false }),
      sb.from('teams').select('id,name').order('name')]);
    if (error) throw error;
    // Resolver solo el nombre del solicitante con el RPC limitado a administración.
    const requesterIds=[...new Set((data||[]).map(r=>r.user_id).filter(Boolean))];
    const nameLookups=await Promise.all(
      Array.from({length:Math.ceil(requesterIds.length/100)},(_,i)=>
        sb.rpc('studio_profile_names',{p_ids:requesterIds.slice(i*100,(i+1)*100)})
      )
    );
    for(const result of nameLookups) if(result.error) throw result.error;
    const requesterById=Object.fromEntries(nameLookups.flatMap(r=>r.data||[]).map(u=>[u.id,u.username]));
    const ST = { pending: ['Pendiente', '#f2c230'], info: ['Esperando respuesta', '#8cc3f2'], approved: ['Aprobada', '#a9d18e'], rejected: ['Rechazada', '#a89f8a'] };
    const list = (data || []).sort((a, b) => (a.status === 'pending' ? 0 : a.status === 'info' ? 1 : 2) - (b.status === 'pending' ? 0 : b.status === 'info' ? 1 : 2));
    view().innerHTML = list.map(r => { const open = r.status === 'pending' || r.status === 'info';
      return `<div class="bb-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(r.team_name || '(sin nombre de grupo)')} <span class="mono">· ${esc(r.alias)} · @${esc(requesterById[r.user_id] || '')}</span></h3><span class="bb-role" style="color:${ST[r.status]?.[1]}">${ST[r.status]?.[0] || r.status}</span></div>
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


  async function resenas(){
    const Q = await rpc('admin_review_queue'), RS = { spoiler: 'Spoilers', ofensiva: 'Ofensiva', spam: 'Spam', otra: 'Otro motivo' };
    view().innerHTML = Q.length ? `<div style="display:grid;gap:12px">${Q.map((r, i) => `<div class="bb-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3 style="margin:0"><a href="/serie/${esc(r.slug)}">${esc(r.title)}</a> · reseña de ${esc(r.author || 'Lector')}</h3><span class="mono" style="color:#f59e7a">${r.n} ${r.n === 1 ? 'reporte' : 'reportes'}</span></div>
      <p style="margin:10px 0;padding:12px;background:#0d0c0a;border:1px solid #2f2a20;font-size:14px;line-height:1.55;white-space:pre-wrap">${esc(r.body)}</p>
      <p class="mono" style="font-size:12px;margin:0 0 12px">${r.reports.map(x => esc(RS[x.reason] || x.reason) + (x.note ? ' — «' + esc(x.note) + '»' : '') + ' · ' + esc(x.by || '—')).join('<br>')}</p>
      <div class="bb-row"><button class="bb-mini red" data-res="${i}|removed">Retirar reseña</button><button class="bb-mini" data-res="${i}|dismissed">Descartar reportes</button></div></div>`).join('')}</div>` : '<p class="mono">No hay reseñas reportadas.</p>';
    view().querySelectorAll('[data-res]').forEach(b => b.onclick = async () => { const [i, a] = b.dataset.res.split('|'), r = Q[+i];
      if (a === 'removed' && !confirm('¿Retirar esta reseña? Se avisará a su autor.')) return; b.disabled = true;
      try { await rpc('admin_review_resolve', { p_series: r.series_id, p_author: r.author_id, p_action: a }); toast(a === 'removed' ? 'Reseña retirada' : 'Reportes descartados'); resenas(); } catch (e) { b.disabled = false; toast(msg(e)); } });
  }
  async function inicio(){
    const [{ data: row, error }, { data: ss }] = await Promise.all([sb.from('platform_settings').select('featured').eq('id', 1).single(), sb.from('series').select('id,title,cover_path,adult,translation_status,teams(name)').eq('published', true).order('title')]);
    if (error) throw error;
    const all = (ss || []).filter(x => x.translation_status !== 'withdrawn'), by = Object.fromEntries(all.map(x => [x.id, x]));
    let F = (Array.isArray(row.featured) ? row.featured : []).filter(id => by[id]), dirty = false;
    const MED = p => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
    const draw = () => { view().innerHTML = `<div class="bb-box"><h3>Destacadas del inicio</h3><p class="mono" style="font-size:13px;margin:0 0 14px;line-height:1.5">Las obras que aparecen en el carrusel grande del inicio, en este orden (máximo 5). Si la lista está vacía, se muestran las obras con el capítulo más reciente.</p>
      <div style="display:grid;gap:8px;margin:0 0 14px">${F.map((id, i) => { const x = by[id]; return `<div style="display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px;border:1px solid #2f2a20;background:#16140f"><span style="width:40px;height:56px;background:#1c1a14 center/cover no-repeat;${x.cover_path ? `background-image:url('${esc(MED(x.cover_path))}')` : ''}"></span><span><b>${i + 1}. ${esc(x.title)}</b><br><small class="mono">${esc(x.teams?.name || '')}${x.adult ? ' · +18 (solo lo verán quienes confirmaron su edad)' : ''}</small></span><span style="display:flex;gap:6px"><button class="bb-mini" data-up="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="bb-mini" data-dn="${i}" ${i < F.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="bb-mini red" data-rm="${i}">Quitar</button></span></div>`; }).join('') || '<p class="mono">Sin destacadas: el inicio usa las obras actualizadas más recientemente.</p>'}</div>
      ${F.length < 5 ? `<div class="bb-row" style="align-items:end"><label style="flex:1">Agregar obra<select id="bb-fsel"><option value="">Elige una obra…</option>${all.filter(x => !F.includes(x.id)).map(x => `<option value="${x.id}">${esc(x.title)}${x.teams?.name ? ' · ' + esc(x.teams.name) : ''}</option>`).join('')}</select></label><button class="btn ghost" id="bb-fadd">Agregar</button></div>` : ''}
      <div class="bb-row" style="margin-top:14px;align-items:center"><button class="btn" id="bb-fsave" ${dirty ? '' : 'disabled'}>Guardar destacadas</button><span class="mono" style="font-size:12px">${dirty ? 'Cambios sin guardar' : 'Guardado'}</span></div></div>`;
      const v = view(), mv = (i, j) => { const [x] = F.splice(i, 1); F.splice(j, 0, x); dirty = true; draw(); };
      v.querySelectorAll('[data-up]').forEach(b => b.onclick = () => mv(+b.dataset.up, +b.dataset.up - 1));
      v.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => mv(+b.dataset.dn, +b.dataset.dn + 1));
      v.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { F.splice(+b.dataset.rm, 1); dirty = true; draw(); });
      const add = v.querySelector('#bb-fadd'); if (add) add.onclick = () => { const id = v.querySelector('#bb-fsel').value; if (!id) return toast('Elige una obra'); F.push(id); dirty = true; draw(); };
      v.querySelector('#bb-fsave').onclick = async e => { e.currentTarget.disabled = true; const { error } = await sb.from('platform_settings').update({ featured: F, updated_at: new Date().toISOString() }).eq('id', 1); if (error) { e.currentTarget.disabled = false; return toast(msg(error)); } dirty = false; toast('Destacadas guardadas'); draw(); };
    };
    draw();
  }
  async function apoyar(){
    const { data: row, error } = await sb.from('platform_settings').select('support').eq('id', 1).single(); if (error) throw error;
    const KIND = [['paypal', 'PayPal'], ['kofi', 'Ko-fi'], ['patreon', 'Patreon'], ['bmac', 'Buy Me a Coffee'], ['mercadopago', 'Mercado Pago'], ['otro', 'Otro enlace']];
    const C = Object.assign({ show: true, label: '援 Apoyar', mode: 'patreon', url: '', title: 'Apoya a los traductores', intro: '', links: [] }, row.support || {}); C.links = [...(C.links || [])]; let dirty = false;
    const MODES = [['patreon', 'Página con los niveles de Patreon', 'La página actual: muestra los niveles de Patreon de los equipos.'], ['links', 'Página con enlaces', 'Tarjetas con tus enlaces: PayPal, Ko-fi, Patreon y los que agregues.'], ['both', 'Enlaces y niveles de Patreon', 'Primero los enlaces y debajo los niveles de Patreon.'], ['external', 'Ir directo a un enlace', 'El botón abre un solo enlace (por ejemplo, tu Patreon) sin pasar por la página.']];
    const draw = () => { const V = view();
      V.innerHTML = `<div class="bb-box"><h3>Botón Apoyar</h3><p class="mono" style="font-size:13px;margin:0 0 14px;line-height:1.5">Configura el botón «Apoyar» de la barra superior y la página /apoyar de toda la plataforma.</p>
        <div style="display:grid;gap:14px;max-width:760px">
          <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sp-show" ${C.show !== false ? 'checked' : ''} style="width:auto"> Mostrar el botón en la barra superior</label>
          <label>Texto del botón<input id="sp-label" maxlength="24" value="${esc(C.label)}"></label>
          <fieldset style="display:grid;gap:8px;border:1px solid #2f2a20;padding:12px"><legend class="mono" style="font-size:12px;padding:0 6px">Al pulsarlo</legend>${MODES.map(([k, l, d]) => `<label style="display:flex;gap:10px;align-items:flex-start"><input type="radio" name="sp-mode" value="${k}" ${C.mode === k ? 'checked' : ''} style="width:auto;margin-top:4px"><span><b>${l}</b><br><small class="mono">${d}</small></span></label>`).join('')}</fieldset>
          ${C.mode === 'external' ? `<label>Enlace al que lleva el botón<input id="sp-url" type="url" placeholder="https://www.patreon.com/tu-pagina" value="${esc(C.url)}"></label>` : `
          <label>Título de la página<input id="sp-title" maxlength="80" value="${esc(C.title)}"></label>
          <label>Texto de presentación<textarea id="sp-intro" rows="3" maxlength="600">${esc(C.intro)}</textarea></label>`}
          ${C.mode === 'links' || C.mode === 'both' ? `<div style="display:grid;gap:8px"><b>Enlaces</b>${C.links.map((l, i) => `<div style="display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:8px;align-items:start;padding:10px;border:1px solid #2f2a20;background:#16140f">
              <select data-lk="${i}" data-f="kind">${KIND.map(([k, n]) => `<option value="${k}" ${l.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
              <span style="display:grid;gap:6px"><input data-lk="${i}" data-f="url" type="url" placeholder="https://…" value="${esc(l.url || '')}"><input data-lk="${i}" data-f="label" maxlength="60" placeholder="Nombre visible (opcional)" value="${esc(l.label || '')}"><input data-lk="${i}" data-f="note" maxlength="160" placeholder="Descripción corta (opcional)" value="${esc(l.note || '')}"></span>
              <span style="display:flex;gap:6px"><button class="bb-mini" data-lu="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="bb-mini" data-ld="${i}" ${i < C.links.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="bb-mini red" data-lr="${i}">Quitar</button></span></div>`).join('') || '<p class="mono">Aún no hay enlaces.</p>'}
            ${C.links.length < 12 ? '<div class="bb-row"><button class="btn ghost" id="sp-add">＋ Agregar enlace</button></div>' : ''}</div>` : ''}
          <div class="bb-row" style="align-items:center"><button class="btn" id="sp-save" ${dirty ? '' : 'disabled'}>Guardar</button><a class="btn ghost" href="/apoyar" target="_blank">Ver la página</a><span class="mono" style="font-size:12px">${dirty ? 'Cambios sin guardar' : 'Guardado'}</span></div></div></div>`;
      const mark = () => { dirty = true; const b = V.querySelector('#sp-save'); if (b) b.disabled = false; const s = b?.parentElement.querySelector('.mono'); if (s) s.textContent = 'Cambios sin guardar'; };
      V.querySelector('#sp-show').onchange = e => { C.show = e.target.checked; mark(); };
      V.querySelector('#sp-label').oninput = e => { C.label = e.target.value; mark(); };
      V.querySelectorAll('[name=sp-mode]').forEach(r => r.onchange = () => { C.mode = r.value; dirty = true; draw(); });
      [['sp-url', 'url'], ['sp-title', 'title'], ['sp-intro', 'intro']].forEach(([id, k]) => { const el = V.querySelector('#' + id); if (el) el.oninput = e => { C[k] = e.target.value; mark(); }; });
      V.querySelectorAll('[data-lk]').forEach(el => el[el.tagName === 'SELECT' ? 'onchange' : 'oninput'] = e => { C.links[+el.dataset.lk][el.dataset.f] = e.target.value; mark(); });
      const mv = (i, j) => { const [x] = C.links.splice(i, 1); C.links.splice(j, 0, x); dirty = true; draw(); };
      V.querySelectorAll('[data-lu]').forEach(b => b.onclick = () => mv(+b.dataset.lu, +b.dataset.lu - 1));
      V.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => mv(+b.dataset.ld, +b.dataset.ld + 1));
      V.querySelectorAll('[data-lr]').forEach(b => b.onclick = () => { C.links.splice(+b.dataset.lr, 1); dirty = true; draw(); });
      const add = V.querySelector('#sp-add'); if (add) add.onclick = () => { C.links.push({ kind: ['paypal', 'kofi', 'patreon'].find(k => !C.links.some(l => l.kind === k)) || 'otro', url: '', label: '', note: '' }); dirty = true; draw(); };
      { const pb = document.createElement('div'); pb.className = 'bb-box'; pb.style.marginTop = '18px'; V.appendChild(pb); import('/patreon.js?v=1').then(m => m.campaignBox(pb, { sb, url, esc, toast, owner: 'platform' })); }
      V.querySelector('#sp-save').onclick = async e => {
        if (C.mode === 'external' && !/^https:\/\/[^\s/]+\.[^\s]{2,}/i.test(C.url.trim())) return toast('Escribe el enlace completo, empezando por https://');
        const bad = C.links.findIndex(l => !/^https:\/\/[^\s/]+\.[^\s]{2,}/i.test((l.url || '').trim())); if ((C.mode === 'links' || C.mode === 'both') && bad >= 0) return toast('El enlace ' + (bad + 1) + ' debe empezar por https://');
        if (C.mode === 'links' && !C.links.length) return toast('Agrega al menos un enlace');
        e.currentTarget.disabled = true;
        const support = { show: C.show !== false, label: (C.label || '').trim().slice(0, 24) || '援 Apoyar', mode: C.mode, url: (C.url || '').trim(), title: (C.title || '').trim().slice(0, 80), intro: (C.intro || '').trim().slice(0, 600), links: C.links.map(l => ({ kind: l.kind, url: (l.url || '').trim(), label: (l.label || '').trim().slice(0, 60), note: (l.note || '').trim().slice(0, 160) })) };
        const { data: up, error } = await sb.from('platform_settings').update({ support, updated_at: new Date().toISOString() }).eq('id', 1).select('id');
        if (error || !up?.length) { e.currentTarget.disabled = false; return toast(error ? msg(error) : 'No se guardó: falta ejecutar el SQL 20261110_boton_apoyar.sql'); }
        dirty = false; toast('Botón Apoyar guardado'); draw(); };
    };
    draw();
  }
  async function temporadas(){
    const PS = await import('/season.js?v=4');
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

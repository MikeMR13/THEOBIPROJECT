import { confirmObi, inputObi } from './obi-dialog.js';
// Patreon: conectar campañas (equipos y plataforma), vincular la cuenta del lector y pantallas de bloqueo.
const FN = url => url + '/functions/v1/patreon';
export async function start(sb, url, kind, owner = null, toast = () => {}) {
  const { data, error } = await sb.rpc('patreon_begin', { p_kind: kind, p_owner: owner });
  if (error) { toast(/forbidden/.test(error.message) ? 'No tienes permiso para esto' : /patreon_begin/.test(error.message) ? 'Falta ejecutar el SQL 20261113_patreon.sql' : error.message); return; }
  location.href = FN(url) + '?state=' + encodeURIComponent(data);
}
const MSG = { conectado: 'Patreon conectado. Niveles y mecenas sincronizados.', vinculado: 'Tu cuenta de Patreon quedó vinculada.', cancelado: 'Cancelaste la conexión con Patreon.', caducado: 'El enlace caducó. Inténtalo de nuevo.',
  en_uso: 'Esa cuenta de Patreon ya está vinculada a otro lector.', existe: 'Ya existe una cuenta con el correo de tu Patreon. Entra con tu correo o Google y vincula Patreon en Preferencias › Cuenta.',
  sin_correo: 'Tu Patreon no tiene un correo verificado. Verifícalo en Patreon o crea la cuenta con tu correo.', error: 'No se pudo completar la conexión con Patreon' };
export function returnNotice(toast) {
  const q = new URLSearchParams(location.search), k = q.get('patreon'); if (!k) return null;
  const m = (MSG[k] || MSG.error) + (k === 'error' && q.get('m') ? ': ' + q.get('m') : '');
  q.delete('patreon'); q.delete('m'); history.replaceState({}, '', location.pathname + (q.toString() ? '?' + q : ''));
  toast(m); return { kind: k, msg: m };
}
const box = 'display:grid;gap:10px;padding:14px;border:1px solid #2f2a20;background:#16140f';
const btn = (id, t, ghost) => `<button type="button" class="btn${ghost ? ' ghost' : ''} sm" id="${id}">${t}</button>`;
const PT = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="14.5" cy="9.5" r="5.5"/><rect x="4" y="4" width="3" height="16"/></svg>';

// Estudio › Página del equipo  /  Bibliotecario › Apoyar
export async function campaignBox(el, { sb, url, esc, toast, owner, edit = true }) {
  if (!el) return;
  const notice = returnNotice(toast);
  const draw = async () => {
    el.innerHTML = '<p class="mono" style="margin:0">Cargando Patreon…</p>';
    const { data: I, error } = await sb.rpc('patreon_campaign_info', { p_owner: owner });
    if (error) { el.innerHTML = `<p class="mono" style="margin:0">${/patreon_campaign_info/.test(error.message) ? 'Falta ejecutar el SQL 20261113_patreon.sql' : esc(error.message)}</p>`; return; }
    const q = owner === 'platform' ? sb.from('patreon_tiers').select('name,price_usd,patrons,patreon_tier_id').is('team_id', null) : sb.from('patreon_tiers').select('name,price_usd,patrons,patreon_tier_id').eq('team_id', owner);
    const { data: tiers } = await q.order('price_usd');
    const on = I?.connected, when = d => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    el.innerHTML = `<div style="display:grid;gap:10px">
      <span style="display:flex;gap:8px;align-items:center;font-weight:600">${PT} Patreon ${owner === 'platform' ? 'de la plataforma' : 'del equipo'}</span>
      <p class="mono" style="margin:0;font-size:12px;line-height:1.5">${owner === 'platform' ? 'Quien apoye este Patreon recibe el sello 惠 y puede aparecer en el muro de agradecimientos de /apoyar. Es un apoyo voluntario: no concede permisos de lectura o descarga ni decide bloqueos editoriales.' : 'Conecta la campaña del equipo: se leen sus niveles y mecenas, y se usan para los bloqueos de obras, volúmenes y capítulos. Si alguien deja de pagar, pierde el acceso al instante.'}</p>
      ${on ? `<div style="${box}"><span style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline"><b>${esc(I.name || 'Campaña conectada')}</b>${I.url ? `<a href="${esc(I.url)}" target="_blank" rel="noopener" class="mono" style="font-size:12px">${esc(I.url.replace(/^https:\/\/(www\.)?/, ''))} ↗</a>` : ''}</span>
        <span class="mono" style="font-size:12px">${I.patrons || 0} mecenas · última sincronización ${when(I.synced_at)} · ${I.webhook ? 'avisos al instante activos' : 'sin avisos automáticos (sincroniza a mano)'}</span>
        ${I.error ? `<span class="mono" style="font-size:12px;color:#f59e7a">Último error: ${esc(I.error)}</span>` : ''}
        <div style="display:grid;gap:6px">${(tiers || []).map(t => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid #2f2a20"><span>${esc(t.name)}</span><span class="mono" style="font-size:12px">$${(+t.price_usd).toFixed(2)} USD · ${t.patrons || 0} mecenas</span></div>`).join('') || '<span class="mono" style="font-size:12px">La campaña no tiene niveles publicados.</span>'}</div>
        ${edit ? `<span style="display:flex;gap:8px;flex-wrap:wrap">${btn('pt-sync', 'Sincronizar ahora')}${btn('pt-re', 'Reconectar', 1)}${btn('pt-off', 'Desconectar', 1)}</span>` : ''}</div>`
      : `<div style="${box}"><span class="mono" style="font-size:12px">${I === null ? 'Solo quien puede editar la página del equipo ve esta conexión.' : 'Sin conectar.'}</span>${edit && I !== null ? `<span>${btn('pt-con', PT + ' Conectar Patreon')}</span>` : ''}</div>`}</div>`;
    const go = () => start(sb, url, 'creator', owner, toast);
    el.querySelector('#pt-con')?.addEventListener('click', go); el.querySelector('#pt-re')?.addEventListener('click', go);
    el.querySelector('#pt-off')?.addEventListener('click', async () => { if (!await confirmObi(owner === 'platform' ? '¿Desconectar el Patreon general? Se detendrán sus reconocimientos y la sincronización del apoyo, pero no cambiará el acceso a ninguna obra.' : '¿Desconectar el Patreon del equipo? Sus mecenas perderán el acceso al contenido exclusivo hasta que vuelvas a conectarlo.')) return;
      const { error } = await sb.rpc('patreon_disconnect', { p_owner: owner }); if (error) return toast(error.message); toast('Patreon desconectado'); draw(); });
    el.querySelector('#pt-sync')?.addEventListener('click', async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Sincronizando…';
      const { data: s } = await sb.auth.getSession(); const r = await fetch(FN(url), { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.session?.access_token }, body: JSON.stringify({ action: 'sync', owner }) }).catch(() => null);
      const j = await r?.json().catch(() => ({})); if (!r?.ok) toast('No se pudo sincronizar: ' + (j?.error || 'sin respuesta')); else toast(`Sincronizado: ${j.tiers} niveles · ${j.members} mecenas`); draw(); });
  };
  draw(); return notice;
}

// Preferencias › Cuenta
export async function accountBox(el, { sb, url, esc, toast }) {
  if (!el) return;
  returnNotice(toast);
  const { data: { user } } = await sb.auth.getUser(); if (!user) return;
  const { data: P, error } = await sb.rpc('my_profile');
  if (error) { el.innerHTML = `<p class="mono">${/patron_wall/.test(error.message) ? 'Falta ejecutar el SQL 20261113_patreon.sql' : esc(error.message)}</p>`; return; }
  if (!P.patreon_user_id) { el.innerHTML = `<div class="pf-account-identity"><span class="pf-account-status">SIN VINCULAR</span><p class="pf-account-card-desc">Conecta Patreon a este mismo carnet para iniciar sesión con Patreon, conservar tu biblioteca y reconocer tus apoyos a los equipos.</p>${btn('pt-link', PT + ' Vincular Patreon a mi cuenta')}</div>`; el.querySelector('#pt-link').onclick = () => start(sb, url, 'link', null, toast); return; }
  const [{ data: G }, { data: pub }] = await Promise.all([sb.from('patreon_pledges').select('owner,cents,status,updated_at').eq('patreon_user_id', P.patreon_user_id), sb.from('patreon_public').select('owner,name,url')]);
  const N = Object.fromEntries((pub || []).map(x => [x.owner, x])), act = (G || []).filter(g => g.status === 'active_patron');
  el.innerHTML = `<div class="pf-account-identity"><span class="pf-account-status">CONECTADO A ESTE CARNET</span><p class="pf-account-card-desc">Puedes entrar con Patreon sin crear otro lector. Tus apoyos activos:</p>
    <div style="display:grid;gap:6px">${act.map(g => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid #2f2a20"><span>${esc(N[g.owner]?.name || (g.owner === 'platform' ? 'El Obi del Lector' : 'Equipo'))}${g.owner === 'platform' ? ' <span title="Apoyas a la plataforma">惠</span>' : ''}</span><span class="mono" style="font-size:12px">$${(g.cents / 100).toFixed(2)} USD/mes</span></div>`).join('') || '<span class="mono" style="font-size:12px">No tienes apoyos activos en los equipos conectados.</span>'}</div>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="pt-wall" ${P.patron_wall ? 'checked' : ''}> Mostrar mi nombre en el muro de agradecimientos si apoyo a la plataforma</label>
    <span style="display:flex;gap:8px;flex-wrap:wrap">${btn('pt-relink', 'Actualizar mis apoyos', 1)}${btn('pt-unlink', 'Desvincular', 1)}</span></div>`;
  el.querySelector('#pt-wall').onchange = async e => { const { error } = await sb.from('profiles').update({ patron_wall: e.target.checked }).eq('id', user.id); toast(error ? error.message : 'Guardado'); };
  el.querySelector('#pt-relink').onclick = () => start(sb, url, 'link', null, toast);
  el.querySelector('#pt-unlink').onclick = async () => { if (!await confirmObi('¿Desvincular Patreon? Ya no podrás entrar mediante Patreon y perderás el acceso al contenido exclusivo de los equipos. Confirma antes que puedes iniciar sesión con tu correo o Google.')) return; const { error } = await sb.rpc('patreon_unlink'); if (error) return toast(error.message); toast('Patreon desvinculado'); accountBox(el, { sb, url, esc, toast }); };
}

// Lector: pantalla de capítulo bloqueado
export function lockHTML(L, esc, slug) {
  const who = esc(L.team || 'el equipo'), scope = { obra: 'Esta obra', volumen: 'Este volumen', capitulo: 'Este capítulo' }[L.scope] || 'Este capítulo';
  const tier = L.min_price ? `desde el nivel ${L.tier ? '«' + esc(L.tier) + '» · ' : ''}$${(+L.min_price).toFixed(2)} USD` : '';
  const until = L.until ? `<p class="mono" style="margin:0;font-size:13px">Se abre para todos el ${new Date(L.until).toLocaleDateString('es-MX', { dateStyle: 'long' })}.</p>` : '';
  return `<section style="max-width:620px;margin:clamp(24px,8vh,80px) auto;display:grid;gap:16px;justify-items:center;text-align:center;padding:clamp(24px,5vw,44px);border:1px solid var(--line);background:#14120d">
    <span aria-hidden="true" style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;border:2px solid var(--gold);color:var(--gold);font-size:28px">🔒︎</span>
    <span class="mono" style="font-size:12px;letter-spacing:.14em">${esc((L.series || '').toUpperCase())}</span>
    <h1 style="margin:0;font-size:clamp(24px,4vw,34px)">${esc(L.title || '')}</h1>
    <p style="margin:0;font-size:17px;line-height:1.5">${scope} solo está disponible para mecenas de <b>${who}</b>${tier ? ' ' + tier : ''}.</p>${until}
    <span style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${L.url ? `<a class="btn" href="${esc((u => { try { const x = new URL(u); if (!/(^|\.)patreon\.com$/.test(x.hostname) || x.searchParams.has('u') || /\/(membership|join|checkout)(\/|$)/.test(x.pathname)) return u; x.pathname = (x.pathname === '/user' ? '/user' : x.pathname.replace(/\/+$/, '')) + '/membership'; return x.toString(); } catch { return u; } })(L.url))}" target="_blank" rel="noopener">Hazte mecenas ↗</a>` : ''}
      ${!L.signed ? '<a class="btn ghost" href="/entrar">Ya soy mecenas · Entrar</a>' : !L.linked ? '<button type="button" class="btn ghost" id="lk-link">Ya soy mecenas · Vincular Patreon</button>' : '<button type="button" class="btn ghost" id="lk-link">Actualizar mis apoyos</button>'}</span>
    <a href="/serie/${esc(slug)}" class="mono" style="font-size:13px">‹ Volver a la obra</a></section>`;
}

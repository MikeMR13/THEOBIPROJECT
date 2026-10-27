import { confirmInApp, promptInApp } from './dialogs.js';
// Invitaciones administrativas a equipos. El enlace se entrega una sola vez.
export async function renderAdminInvitations({ sb, view, esc, toast, rpc, when }) {
  const target = view();
  target.innerHTML = '<p class="mono">Cargando invitaciones…</p>';
  const [teamsResult, invitesResult] = await Promise.all([
    sb.from('teams').select('id,name,slug').order('name'),
    sb.rpc('admin_invitation_list', { p_limit: 100 })
  ]);
  if (teamsResult.error) throw teamsResult.error;
  if (invitesResult.error) {
    target.innerHTML = '<div class="bb-box"><h3>Invitaciones pendientes de activar</h3><p class="mono">La interfaz está preparada, pero falta instalar y verificar el sistema de invitaciones en Supabase. No se pueden generar enlaces hasta completar esa etapa.</p></div>';
    return;
  }

  const teams = teamsResult.data || [];
  const invites = invitesResult.data || [];
  const roleLabels = { owner: 'Propietario · administrador del equipo', admin: 'Administrador', translator: 'Traductor', editor: 'Editor', proofreader: 'Corrector', collaborator: 'Colaborador' };
  const statusLabels = { pendiente: 'Pendiente', utilizada: 'Utilizada', revocada: 'Revocada', caducada: 'Caducada' };
  target.innerHTML = `<div class="bb-secintro"><div><h2>Invitaciones a equipos traductores</h2><p>Enlaces de un solo uso para crear equipos nuevos o invitar integrantes, con correo específico o enlace libre.</p></div><span class="bb-status warn">ACCESO CONTROLADO</span></div>
    <section class="bb-box">
      <h3>Crear invitación</h3>
      <p class="mono" style="font-size:12px;line-height:1.65">Puedes invitar a un nuevo responsable para <b>crear su propio equipo</b>, o agregar a alguien a un equipo existente. La invitación exige iniciar sesión y verificar el correo.</p>
      <form id="inv-form" class="bb-row" style="align-items:end">
        <label>Tipo de invitación<select name="kind">
          <option value="create_team">Crear un equipo nuevo · Propietario</option>
          <option value="join">Unirse a equipo existente</option>
        </select></label>
        <label id="inv-team-wrap" hidden>Equipo existente<select name="team">
          ${teams.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
        </select></label>
        <label id="inv-new-name-wrap">Nombre del nuevo equipo<input name="newName" minlength="2" maxlength="60" required placeholder="Nombre del grupo traductor"></label>
        <label id="inv-new-slug-wrap">Identificador del equipo<input name="newSlug" minlength="3" maxlength="40" pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required placeholder="equipo-traductor"></label>
        <div id="inv-owner-role" class="bb-super-note" style="flex:1 1 100%;margin:0">El invitado será <b>Propietario y administrador interno</b> de su nuevo equipo. No recibirá el rol de Bibliotecario.</div>
        <label id="inv-target-wrap">Destinatario<select name="target"><option value="email">Correo específico</option><option value="open">Enlace libre de un uso</option></select></label>
        <div id="inv-open-warning" class="bb-super-note" hidden></div>
        <label id="inv-email-wrap">Correo del invitado<input name="email" type="email" autocomplete="off" maxlength="254" required placeholder="traductor@ejemplo.com"></label>
        <label id="inv-role-wrap" hidden>Rol dentro del equipo<select name="role">
          ${Object.entries(roleLabels).filter(([k]) => k !== 'owner').map(([k,n]) => `<option value="${k}" ${k === 'admin' ? 'selected' : ''}>${n}</option>`).join('')}
        </select></label>
        <label>Caducidad<select name="hours">
          <option value="24">24 horas</option><option value="48" selected>48 horas</option>
          <option value="168">7 días</option></select></label>
        <label style="flex-basis:100%">Motivo administrativo<input name="reason" minlength="12" maxlength="400" required placeholder="Explica por qué se invita a esta persona"></label>
        <button type="submit" class="btn">Crear enlace único</button>
      </form>
      <div id="inv-created" hidden aria-live="polite"></div>
      <p class="mono" style="font-size:11px;margin:0">No se podrá recuperar el enlace completo desde la lista. Si se pierde, revoca la invitación y crea otra.</p>
    </section>
    <section class="bb-box"><h3>Invitaciones registradas</h3>
      <div style="max-width:100%;overflow-x:auto"><table class="bb-tbl" style="min-width:680px">
        <thead><tr><th>Invitado</th><th>Equipo</th><th>Rol</th><th>Estado</th><th>Caduca</th><th>Gestión</th></tr></thead>
        <tbody>${invites.map(i => `<tr>
          <td class="mono">${i.invite_email ? esc(i.invite_email) : 'Enlace libre'}</td><td>${esc(i.team_name)}</td>
          <td>${esc(roleLabels[i.invited_role] || i.invited_role)}${i.invitation_kind === 'create_team' ? '<small style="display:block;color:var(--gold)">Equipo nuevo</small>' : ''}</td>
          <td><span class="bb-status ${i.status === 'pendiente' ? 'warn' : i.status === 'utilizada' ? 'ok':''}">${esc(statusLabels[i.status] || i.status)}</span></td>
          <td class="mono">${esc(when(i.expires_at))}</td>
          <td>${i.status === 'pendiente' ? `<button class="bb-mini red" type="button" data-revoke="${esc(i.id)}">Revocar</button>` : '—'}</td>
        </tr>`).join('') || '<tr><td colspan="6" class="mono">Aún no hay invitaciones.</td></tr>'}</tbody>
      </table></div>
    </section>`;

  const form = target.querySelector('#inv-form'), created = target.querySelector('#inv-created');
  const syncMode = () => {
    const create = form.elements.kind.value === 'create_team';
    const open = form.elements.target.value === 'open';
    target.querySelector('#inv-team-wrap').hidden = create;
    target.querySelector('#inv-target-wrap').hidden = false;
    const warning = target.querySelector('#inv-open-warning');
    warning.hidden = !open;
    if (open) warning.textContent = create
      ? 'Atención: la PRIMERA cuenta que se registre, verifique su correo y acepte este enlace creará el equipo y será su Propietario y Administrador. Comparte el enlace únicamente con la persona elegida.'
      : 'La primera cuenta que inicie sesión, verifique su correo y acepte este enlace se unirá al equipo. No concede propiedad ni administración.';
    target.querySelector('#inv-email-wrap').hidden = open;
    form.elements.email.required = !open;
    const adminOption = [...form.elements.role.options].find(option => option.value === 'admin');
    if (adminOption) adminOption.disabled = open && !create;
    if (open && !create && form.elements.role.value === 'admin') form.elements.role.value = 'translator';
    target.querySelector('#inv-new-name-wrap').hidden = !create;
    target.querySelector('#inv-new-slug-wrap').hidden = !create;
    target.querySelector('#inv-role-wrap').hidden = create;
    target.querySelector('#inv-owner-role').hidden = !create;
    form.elements.newName.required = create;
    form.elements.newSlug.required = create;
    form.elements.team.required = !create;
    if (!create && teams.length === 0) {
      form.querySelector('[type=submit]').disabled = true;
    } else {
      form.querySelector('[type=submit]').disabled = false;
    }
  };
  form.elements.kind.onchange = syncMode;
  form.elements.target.onchange = syncMode;
  syncMode();
  form.onsubmit = async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const kind = form.elements.kind.value, create = kind === 'create_team',
      open = form.elements.target.value === 'open',
      team = create ? null : form.elements.team.value,
      newName = create ? form.elements.newName.value.trim() : null,
      newSlug = create ? form.elements.newSlug.value.trim() : null,
      email = open ? null : form.elements.email.value.trim(),
      role = create ? 'owner' : form.elements.role.value,
      hours = Number(form.elements.hours.value),
      reason = form.elements.reason.value.trim();
    if (reason.length < 12) return toast('Escribe un motivo de al menos 12 caracteres');
    if (open && !create && !['translator','editor','proofreader','collaborator'].includes(role))
      return toast('Un enlace libre a un equipo existente no puede conceder administración ni propiedad');
    if (create && !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(newSlug))
      return toast('El identificador admite 3-40 caracteres: minúsculas, números y guiones');
    if (create && open && !await confirmInApp('ATENCIÓN: la primera persona que se registre o inicie sesión con correo verificado y acepte el enlace CREARÁ «' + newName + '» y será su PROPIETARIO. Si el enlace llega a otra persona, podría reclamar el equipo. ¿Generar enlace libre?')) return;
    if (create && !open && !await confirmInApp('Se creará «' + newName + '» cuando ' + email + ' acepte la invitación. Será Propietario y Administrador interno del equipo. ¿Continuar?')) return;
    if (open && !create && !await confirmInApp('Cualquier cuenta con correo verificado podrá reclamar este enlace una sola vez. ¿Generar enlace libre?')) return;
    if (!create && role === 'admin' && !await confirmInApp('Esta persona administrará el equipo seleccionado, sin ser Bibliotecario ni Propietario. ¿Continuar?')) return;
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const invitation = await rpc('admin_invitation_create',
        { p_team: team, p_email: email, p_role: role, p_hours: hours, p_reason: reason,
          p_kind: kind, p_new_team_name: newName, p_new_team_slug: newSlug });
      const link = location.origin + '/invitacion#token=' + encodeURIComponent(invitation.token);
      created.hidden = false;
      created.innerHTML = `<div class="bb-super-note"><b>${open ? 'Enlace libre creado' : 'Invitación creada para ' + esc(email)}</b><br>
        Copia este enlace ahora. Caduca el ${esc(when(invitation.expires_at))}; ${open ? (create ? 'la primera cuenta verificada que lo acepte se convertirá en Propietario del nuevo equipo.' : 'la primera cuenta con correo verificado que lo acepte obtendrá acceso.') : 'solamente el correo invitado podrá aceptarlo.'}
        <div class="bb-row" style="margin:12px 0 0">
          <label>Enlace privado<input id="inv-secret-url" readonly value="${esc(link)}" autocomplete="off" spellcheck="false"></label>
          <button class="btn ghost" type="button" id="inv-copy">Copiar enlace</button>
        </div><p class="mono" style="font-size:11px">No compartas este enlace públicamente.</p></div>`;
      created.querySelector('#inv-copy').onclick = async () => {
        try { await navigator.clipboard.writeText(link); toast('Enlace copiado'); }
        catch {
          const field = created.querySelector('#inv-secret-url');
          field.focus(); field.select(); toast('Selecciona y copia el enlace');
        }
      };
      form.reset();
      form.elements.kind.value = kind;
      form.elements.target.value = open ? 'open' : 'email';
      if (!create) {
        form.elements.team.value = team;
        if (open) form.elements.role.value = role;
      }
      syncMode();
      // La creación no oculta el enlace recién generado; actualiza la lista solo al volver.
      toast('Invitación creada');
    } catch (err) {
      toast(err?.message || 'No se pudo crear la invitación');
    } finally { button.disabled = false; }
  };
  target.querySelectorAll('[data-revoke]').forEach(button => {
    button.onclick = async () => {
      const reason = await promptInApp('Motivo para revocar esta invitación (mínimo 12 caracteres):');
      if (reason === null) return;
      if (reason.trim().length < 12) return toast('El motivo debe tener al menos 12 caracteres');
      if (!await confirmInApp('¿Revocar la invitación? El enlace dejará de funcionar.')) return;
      button.disabled = true;
      try {
        await rpc('admin_invitation_revoke', { p_id: button.dataset.revoke, p_reason: reason.trim() });
        toast('Invitación revocada');
        renderAdminInvitations({ sb, view, esc, toast, rpc, when });
      } catch (err) { button.disabled = false; toast(err?.message || 'No se pudo revocar'); }
    };
  });
}

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
  const roleLabels = { admin: 'Administrador', translator: 'Traductor', editor: 'Editor', proofreader: 'Corrector', collaborator: 'Colaborador' };
  const statusLabels = { pendiente: 'Pendiente', utilizada: 'Utilizada', revocada: 'Revocada', caducada: 'Caducada' };
  target.innerHTML = `<div class="bb-secintro"><div><h2>Invitaciones a equipos traductores</h2><p>Enlaces privados, de un solo uso y vinculados al correo del destinatario.</p></div><span class="bb-status warn">ACCESO CONTROLADO</span></div>
    <section class="bb-box">
      <h3>Crear invitación</h3>
      <p class="mono" style="font-size:12px;line-height:1.65">El invitado deberá iniciar sesión o registrarse con el correo indicado. Al aceptar recibirá el rol elegido <b>solo dentro del equipo</b>, nunca el de Bibliotecario.</p>
      <form id="inv-form" class="bb-row" style="align-items:end">
        <label>Equipo existente<select name="team" required>${teams.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>
        <label>Correo del invitado<input name="email" type="email" autocomplete="off" maxlength="254" required placeholder="traductor@ejemplo.com"></label>
        <label>Rol<select name="role" required>
          ${Object.entries(roleLabels).map(([k,n]) => `<option value="${k}" ${k === 'admin' ? 'selected' : ''}>${n}</option>`).join('')}
        </select></label>
        <label>Caducidad<select name="hours">
          <option value="24">24 horas</option><option value="48" selected>48 horas</option>
          <option value="168">7 días</option></select></label>
        <label style="flex-basis:100%">Motivo administrativo<input name="reason" minlength="12" maxlength="400" required placeholder="Explica por qué se invita a esta persona"></label>
        <button type="submit" class="btn" ${teams.length ? '' : 'disabled'}>Crear enlace único</button>
      </form>
      <div id="inv-created" hidden aria-live="polite"></div>
      <p class="mono" style="font-size:11px;margin:0">No se podrá recuperar el enlace completo desde la lista. Si se pierde, revoca la invitación y crea otra.</p>
    </section>
    <section class="bb-box"><h3>Invitaciones registradas</h3>
      <div style="max-width:100%;overflow-x:auto"><table class="bb-tbl" style="min-width:680px">
        <thead><tr><th>Invitado</th><th>Equipo</th><th>Rol</th><th>Estado</th><th>Caduca</th><th>Gestión</th></tr></thead>
        <tbody>${invites.map(i => `<tr>
          <td class="mono">${esc(i.invite_email)}</td><td>${esc(i.team_name)}</td>
          <td>${esc(roleLabels[i.invited_role] || i.invited_role)}</td>
          <td><span class="bb-status ${i.status === 'pendiente' ? 'warn' : i.status === 'utilizada' ? 'ok':''}">${esc(statusLabels[i.status] || i.status)}</span></td>
          <td class="mono">${esc(when(i.expires_at))}</td>
          <td>${i.status === 'pendiente' ? `<button class="bb-mini red" type="button" data-revoke="${esc(i.id)}">Revocar</button>` : '—'}</td>
        </tr>`).join('') || '<tr><td colspan="6" class="mono">Aún no hay invitaciones.</td></tr>'}</tbody>
      </table></div>
    </section>`;

  const form = target.querySelector('#inv-form'), created = target.querySelector('#inv-created');
  form.onsubmit = async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const team = form.elements.team.value, email = form.elements.email.value.trim(),
      role = form.elements.role.value, hours = Number(form.elements.hours.value),
      reason = form.elements.reason.value.trim();
    if (reason.length < 12) return toast('Escribe un motivo de al menos 12 caracteres');
    if (role === 'admin' && !confirm('La persona podrá administrar este equipo y sus publicaciones, pero no será Bibliotecario ni Propietario. ¿Continuar?')) return;
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const invitation = await rpc('admin_invitation_create',
        { p_team: team, p_email: email, p_role: role, p_hours: hours, p_reason: reason });
      const link = location.origin + '/invitacion#token=' + encodeURIComponent(invitation.token);
      created.hidden = false;
      created.innerHTML = `<div class="bb-super-note"><b>Invitación creada para ${esc(email)}</b><br>
        Copia este enlace ahora. Caduca el ${esc(when(invitation.expires_at))}; solamente el correo invitado podrá aceptarlo.
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
      const id = target.querySelector('#inv-form')?.elements.team;
      if (id) id.value = team;
      // La creación no oculta el enlace recién generado; actualiza la lista solo al volver.
      toast('Invitación creada');
    } catch (err) {
      toast(err?.message || 'No se pudo crear la invitación');
    } finally { button.disabled = false; }
  };
  target.querySelectorAll('[data-revoke]').forEach(button => {
    button.onclick = async () => {
      const reason = prompt('Motivo para revocar esta invitación (mínimo 12 caracteres):');
      if (reason === null) return;
      if (reason.trim().length < 12) return toast('El motivo debe tener al menos 12 caracteres');
      if (!confirm('¿Revocar la invitación? El enlace dejará de funcionar.')) return;
      button.disabled = true;
      try {
        await rpc('admin_invitation_revoke', { p_id: button.dataset.revoke, p_reason: reason.trim() });
        toast('Invitación revocada');
        renderAdminInvitations({ sb, view, esc, toast, rpc, when });
      } catch (err) { button.disabled = false; toast(err?.message || 'No se pudo revocar'); }
    };
  });
}

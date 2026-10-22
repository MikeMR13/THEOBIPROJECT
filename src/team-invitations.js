// Canje seguro de invitaciones. Nunca canjea por el mero hecho de abrir una URL.
// El secreto viaja como fragmento (#token=...), no se envía en HTTP GET.
const KEY = 'obi-team-invitation-pending';
const TOKEN = /^[0-9a-f]{64}$/;

export function pendingTeamInvite() {
  try {
    const value = sessionStorage.getItem(KEY) || '';
    return TOKEN.test(value) ? value : '';
  } catch { return ''; }
}

function rememberToken(token) {
  if (!TOKEN.test(token)) return false;
  try { sessionStorage.setItem(KEY, token); } catch { return false; }
  return true;
}

export async function renderTeamInvitation({ sb, app, esc, toast, go }) {
  const tokenFromUrl = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  const token = TOKEN.test(tokenFromUrl) ? tokenFromUrl : pendingTeamInvite();

  if (TOKEN.test(tokenFromUrl) && rememberToken(tokenFromUrl)) {
    // Reduce la posibilidad de copiar/reenviar accidentalmente el secreto.
    history.replaceState({}, '', '/invitacion');
  }
  app.innerHTML = `<div style="max-width:650px;margin:30px auto;padding:26px 23px;
      border:1px solid var(--line);border-top:5px solid var(--gold);background:#16140f">
      <span class="ui-lbl">El Obi del Lector · Invitación a equipo</span>
      <h1 style="margin:14px 0 10px;font-family:'Shippori Mincho B1',serif">
        Tu lugar en la biblioteca</h1>
      <div id="team-invite-status" class="mono" role="status" aria-live="polite"
        style="line-height:1.7;font-size:13px">Comprobando la invitación…</div>
      <div id="team-invite-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"></div>
      <p class="mono" style="font-size:11px;color:var(--mute);margin-top:25px;line-height:1.6">
        Por seguridad, esta invitación es individual, caduca y solamente puede usarse una vez.
        No convierte a nadie en Bibliotecario.</p>
    </div>`;
  const status = app.querySelector('#team-invite-status'), actions = app.querySelector('#team-invite-actions');
  const message = (text, isError = false) => {
    status.textContent = text;
    status.style.color = isError ? '#f59e7a' : '';
  };
  if (!TOKEN.test(token)) {
    message('El enlace no es válido o ya no está disponible en esta pestaña.', true);
    actions.innerHTML = '<a class="btn ghost" href="/">Volver al inicio</a>';
    return;
  }
  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user) {
    message('Te han invitado a colaborar en un equipo traductor. Entra con el correo al que se envió la invitación o crea una cuenta con ese mismo correo. No se asignará ningún rol hasta que aceptes.');
    actions.innerHTML = '<a class="btn" href="/entrar">Iniciar sesión</a><a class="btn ghost" href="/registro">Crear cuenta</a>';
    return;
  }

  const { data: invitation, error } = await sb.rpc('team_invitation_preview', { p_token: token });
  if (error) {
    message(error.message || 'No se pudo comprobar la invitación.', true);
    actions.innerHTML = '<button class="btn ghost" id="team-invite-switch">Usar otra cuenta</button><a class="btn ghost" href="/">Inicio</a>';
    app.querySelector('#team-invite-switch').onclick = async () => {
      await sb.auth.signOut();
      location.assign('/entrar');
    };
    return;
  }
  const ROLE = { owner:'Propietario y Administrador del equipo', admin:'Administrador', translator:'Traductor', editor:'Editor',
    proofreader:'Corrector', collaborator:'Colaborador' };
  const roleName = ROLE[invitation.role] || 'Colaborador';
  const newTeam = invitation.kind === 'create_team';
  message('Cuenta: ' + user.email + '. ' + (newTeam
    ? 'Al aceptar, se creará el equipo «' + invitation.team_name +
      '» y serás su Propietario y Administrador interno.'
    : 'Te unirás a «' + invitation.team_name + '» con el rol «' + roleName + '».') +
    ' La invitación caduca: ' + new Date(invitation.expires_at).toLocaleString('es-MX') + '.');
  actions.innerHTML = '<button class="btn" id="team-invite-accept">' + (newTeam ? 'Aceptar y crear mi equipo' : 'Aceptar e ingresar al equipo') + '</button>' +
    '<button class="btn ghost" id="team-invite-switch">Cambiar de cuenta</button>';
  app.querySelector('#team-invite-switch').onclick = async () => {
    await sb.auth.signOut();
    location.assign('/entrar');
  };
  const button = app.querySelector('#team-invite-accept');
  button.onclick = async () => {
    button.disabled = true;
    button.textContent = 'Aceptando invitación…';
    try {
      const { data, error: redeemError } = await sb.rpc('team_invitation_redeem', { p_token: token });
      if (redeemError) throw redeemError;
      try { sessionStorage.removeItem(KEY); } catch {}
      message('¡Listo! Ahora formas parte de «' + data.team_name +
        '» como ' + (ROLE[data.role] || data.role) + '.');
      actions.innerHTML = '<button class="btn" id="team-invite-studio">Abrir el Estudio</button>';
      app.querySelector('#team-invite-studio').onclick = () => location.assign('/estudio');
      toast('Invitación aceptada');
    } catch (err) {
      button.disabled = false;
      button.textContent = newTeam ? 'Aceptar y crear mi equipo' : 'Aceptar e ingresar al equipo';
      message(err?.message || 'No se pudo aceptar la invitación.', true);
    }
  };
}

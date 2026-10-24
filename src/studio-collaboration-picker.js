// Selector seguro de equipos para los créditos compartidos de una obra.
// El texto escrito nunca se usa como destinatario: siempre se invita al ID seleccionado.
export function normalizeCollaboratorQuery(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/[%_\\]/g, '').trim().slice(0, 80);
}

export function unavailableCollaboratorReason(team, ownTeamId, collaborations = []) {
  if (team.id === ownTeamId) return 'Es tu propio equipo';
  const existing = collaborations.find(c => c.invited_team === team.id || c.invited?.id === team.id);
  if (!existing) return '';
  return ({
    pending: 'Invitación pendiente', accepted: 'Ya colabora', active: 'Ya colabora',
    rejected: 'Invitación rechazada', declined: 'Invitación rechazada', revoked: 'Invitación revocada'
  })[existing.status] || 'Ya existe una invitación';
}

export function rankCollaboratorTeams(teams, term) {
  const q = normalizeCollaboratorQuery(term).toLocaleLowerCase('es');
  const unique = [...new Map(teams.filter(t => t?.id && t?.slug).map(t => [t.id, t])).values()];
  const score = t => {
    const slug = t.slug.toLocaleLowerCase('es'), name = (t.name || '').toLocaleLowerCase('es');
    return slug === q ? 0 : slug.startsWith(q) ? 1 : name.startsWith(q) ? 2 : 3;
  };
  return unique.sort((a, b) => score(a) - score(b) || (a.name || '').localeCompare(b.name || '', 'es'));
}

export function initCollaborationTeamPicker({ sb, input, list, status, invite, ownTeamId, seriesId, collaborations, media, toast, busy, onSuccess }) {
  if (!input || !list || !status || !invite) return;
  const root = input.closest('.wk-inv-search');
  let selected = null, timeout = null, generation = 0;
  invite.disabled = true;

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const open = () => { list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const note = message => { status.textContent = message; };
  const empty = message => {
    const p = document.createElement('p');
    p.className = 'mono wk-inv-empty';
    p.textContent = message;
    list.replaceChildren(p);
    open();
  };
  const choose = team => {
    if (unavailableCollaboratorReason(team, ownTeamId, collaborations)) return;
    selected = team;
    input.value = '@' + team.slug;
    invite.disabled = false;
    note('Seleccionado: ' + team.name + ' (@' + team.slug + '). Pulsa Invitar para confirmar.');
    close();
  };

  async function search(term, request) {
    try {
      // Consultas independientes: evita interpolar el texto del usuario en un filtro .or().
      const pattern = '%' + term + '%';
      const [byName, bySlug] = await Promise.all([
        sb.from('teams').select('id,name,slug,color,avatar_path').ilike('name', pattern).limit(10),
        sb.from('teams').select('id,name,slug,color,avatar_path').ilike('slug', pattern).limit(10)
      ]);
      if (request !== generation || !root?.isConnected) return;
      if (byName.error || bySlug.error) throw byName.error || bySlug.error;
      const matches = rankCollaboratorTeams([...(byName.data || []), ...(bySlug.data || [])], term).slice(0, 10);
      if (!matches.length) { empty('No se encontraron equipos con ese nombre o alias.'); note('Sin coincidencias.'); return; }
      list.replaceChildren();
      matches.forEach(team => {
        const reason = unavailableCollaboratorReason(team, ownTeamId, collaborations);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wk-inv-option';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', 'false');
        button.disabled = !!reason;

        const avatar = document.createElement('span');
        avatar.className = 'wk-inv-avatar';
        avatar.style.backgroundColor = team.color || '#8cc3f2';
        if (team.avatar_path) {
          const img = document.createElement('img');
          img.src = media(team.avatar_path);
          img.alt = '';
          img.loading = 'lazy';
          avatar.append(img);
        } else avatar.textContent = (team.name || '?').slice(0, 2).toUpperCase();

        const details = document.createElement('span');
        details.className = 'wk-inv-details';
        const name = document.createElement('b'), alias = document.createElement('small');
        name.textContent = team.name || 'Equipo';
        alias.textContent = '@' + team.slug;
        details.append(name, alias);
        button.append(avatar, details);
        if (reason) {
          const hint = document.createElement('small');
          hint.className = 'wk-inv-reason';
          hint.textContent = reason;
          button.append(hint);
        }
        button.addEventListener('click', () => choose(team));
        list.append(button);
      });
      note(matches.length + (matches.length === 1 ? ' equipo encontrado. Selecciónalo para invitar.' : ' equipos encontrados. Selecciona uno para invitar.'));
      open();
    } catch {
      if (request !== generation || !root?.isConnected) return;
      empty('No se pudo buscar equipos. Intenta de nuevo.');
      note('Error al consultar los equipos.');
    }
  }

  input.addEventListener('input', () => {
    generation++;
    clearTimeout(timeout);
    selected = null;
    invite.disabled = true;
    const term = normalizeCollaboratorQuery(input.value);
    if (term.length < 2) {
      close();
      note('Escribe al menos 2 caracteres y selecciona un equipo.');
      return;
    }
    empty('Buscando equipos…');
    note('Buscando…');
    const request = generation;
    timeout = setTimeout(() => search(term, request), 250);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); return; }
    if (event.key === 'Enter') event.preventDefault(); // Nunca invitar por escribir un alias.
    if (event.key === 'ArrowDown' && !list.hidden) {
      const first = list.querySelector('button:not(:disabled)');
      if (first) { event.preventDefault(); first.focus(); }
    }
  });
  list.addEventListener('keydown', event => {
    const options = [...list.querySelectorAll('button:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { close(); input.focus(); }
    if (event.key === 'ArrowDown' && options[index + 1]) { event.preventDefault(); options[index + 1].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); (options[index - 1] || input).focus(); }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => { if (root?.isConnected && !root.contains(document.activeElement)) close(); }, 120);
  });

  invite.addEventListener('click', async event => {
    event.preventDefault();
    const team = selected;
    if (!team) { note('Selecciona un equipo del listado antes de invitar.'); return; }
    await busy(invite, async () => {
      const { data: previous, error: lookupError } = await sb.from('collaborations')
        .select('id,status').eq('series_id', seriesId).eq('invited_team', team.id).limit(1);
      if (lookupError) throw lookupError;
      if (previous?.length) {
        selected = null;
        note('Este equipo ya tiene una invitación registrada para esta obra.');
        throw new Error('Ya existe una invitación para este equipo y esta obra');
      }
      const { error } = await sb.from('collaborations').insert({
        series_id: seriesId, inviter_team: ownTeamId, invited_team: team.id, status: 'pending'
      });
      if (error) throw error.code === '23505' ? new Error('Ya existe una invitación para este equipo y esta obra') : error;
      toast('Invitación enviada a ' + team.name);
      onSuccess();
    });
    invite.disabled = !selected;
  });
  note('Busca y selecciona un equipo para enviar la invitación.');
}

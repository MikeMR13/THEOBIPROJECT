// Créditos públicos de una obra: traductor principal + equipos con invitación activa.
// La RPC solo devuelve datos públicos de obras publicadas; nunca lee invitaciones pendientes.
export function creditTeams(series) {
  if (Array.isArray(series?.publicCredits) && series.publicCredits.length) return series.publicCredits;
  const t = series?.teams;
  return t?.name ? [{ ...t, team_id: series.team_id, is_primary: true,
    show_reader_logo: t.settings?.show_reader_logo !== false }] : [];
}

export async function attachPublicCredits(sb, works = []) {
  const rows = Array.isArray(works) ? works : [works];
  const targets = rows.filter(w => w?.id);
  if (!targets.length) return rows;
  const ids = [...new Set(targets.map(w => w.id))];
  const grouped = new Map();
  // Agrupar para no disparar una consulta por cada tarjeta del carrusel.
  try {
    for (let i = 0; i < ids.length; i += 150) {
      const { data, error } = await sb.rpc('series_public_credits', { p_series_ids: ids.slice(i, i + 150) });
      if (error) throw error;
      for (const c of data || []) {
        if (!c?.series_id || !c.team_id) continue;
        const list = grouped.get(c.series_id) || [];
        if (!list.some(x => x.team_id === c.team_id)) list.push(c);
        grouped.set(c.series_id, list);
      }
    }
  } catch (e) {
    // Si falla la red/RPC, nunca mantener PNG de colaboradores de una respuesta anterior:
    // pudieron rechazar o revocar el crédito después de la copia en memoria.
    console.warn('Créditos de colaboración no disponibles:', e?.message || e);
    targets.forEach(s => { s.publicCredits = creditTeams({ ...s, publicCredits: null }); });
    return rows;
  }
  targets.forEach(s => {
    const credits = grouped.get(s.id) || [];
    s.publicCredits = credits.length ? credits : creditTeams({ ...s, publicCredits: null });
    const primary = s.publicCredits.find(c => c.is_primary);
    if (primary) s.teams = { ...(s.teams || {}), name: primary.name, slug: primary.slug,
      avatar_path: primary.avatar_path, status: primary.status,
      settings: { ...(s.teams?.settings || {}), show_reader_logo: primary.show_reader_logo !== false } };
  });
  return rows;
}

export function creditsHTML(series, { esc, media, mode = 'detail' } = {}) {
  const compact = mode === 'carousel', reader = mode === 'reader';
  const logos = creditTeams(series);
  if (!logos.length) return '';
  const html = logos.map(t => {
    const name = String(t.name || 'Equipo traductor'), slug = String(t.slug || '');
    const path = t.avatar_path && (!reader || t.show_reader_logo !== false) ? media(t.avatar_path) : '';
    const inner = path ? `<img src="${esc(path)}" alt="${esc(name)}" loading="lazy" decoding="async">`
      : `<span class="obi-credit-text">${esc(name)}</span>`;
    const label = t.is_primary ? 'Traductor principal' : 'Equipo colaborador';
    const attrs = `class="obi-credit${path ? ' has-logo' : ''}" title="${esc(label + ': ' + name)}" aria-label="${esc(label + ': ' + name)}"`;
    // Un carrusel es un enlace a la obra: evitar enlaces anidados.
    // En el lector no enlazar a perfiles de equipo inactivos, como hace el crédito original.
    const allowed = !!slug && (!reader || !t.status || /^(active|activo)$/i.test(t.status));
    return compact || !allowed ? `<span ${attrs}>${inner}</span>`
      : `<a ${attrs} href="/equipo/${encodeURIComponent(slug)}">${inner}</a>`;
  }).join('');
  return `<span class="obi-credits obi-credits--${mode}" aria-label="Créditos de traducción">${html}</span>`;
}

let fallbackReady = false;
export function installCreditImageFallback() {
  if (fallbackReady || typeof document === 'undefined') return;
  fallbackReady = true;
  document.addEventListener('error', e => {
    const img = e.target;
    if (!img?.matches?.('.obi-credit img')) return;
    const label = img.getAttribute('alt') || 'Equipo traductor';
    const alt = document.createElement('span');
    alt.className = 'obi-credit-text';
    alt.textContent = label;
    img.closest('.obi-credit')?.classList.remove('has-logo');
    img.replaceWith(alt);
  }, true);
}

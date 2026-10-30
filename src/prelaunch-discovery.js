// Descubrimiento público de próximos estrenos: solo la RPC endurecida de Fase 0.
// No consultar series privadas, volúmenes ni capítulos desde el navegador.
const cached = new WeakMap();
const TTL_MS = 20_000;
const MAX_DAYS = 180;

export async function loadPublicUpcoming(sb, options = {}) {
  if (!sb?.rpc) return [];
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const days = Math.min(MAX_DAYS, Math.max(1, Number(options.days) || MAX_DAYS));
  const prev = cached.get(sb);
  if (prev && prev.days === days && now >= prev.at && now - prev.at < TTL_MS) {
    return (await prev.promise).filter(r => new Date(r.at).getTime() > now);
  }
  const promise = Promise.resolve().then(() => sb.rpc('prelaunch_calendar', {
    p_from: new Date(now).toISOString(),
    p_to: new Date(now + days * 86400_000).toISOString()
  }))).then(({ data, error }) => {
    if (error) throw error;
    // Defensa adicional del cliente: la autorización efectiva siempre es de la RPC.
    return (Array.isArray(data) ? data : []).filter(r =>
      r && r.kind === 'volp' && r.adult === false &&
      r.acc === 'public' && r.can_read === false &&
      typeof r.slug === 'string' && r.slug.length > 0 &&
      typeof r.title === 'string' && r.title.length > 0 &&
      typeof r.team_slug === 'string' &&
      Number.isFinite(new Date(r.at).getTime()) &&
      new Date(r.at).getTime() > now &&
      new Date(r.at).getTime() <= now + days * 86400_000
    ).sort((a, b) => new Date(a.at) - new Date(b.at));
  }).catch(error => {
    if (cached.get(sb)?.promise === promise) cached.delete(sb);
    console.warn('prelaunch discovery', error?.message || error);
    return []; // fail closed, sin consulta alternativa a tablas privadas
  });
  cached.set(sb, { at: now, days, promise });
  return (await promise).filter(r => new Date(r.at).getTime() > now);
}

export function uniqueUpcoming(rows) {
  const seen = new Set();
  return (rows || []).filter(r => {
    if (!r.series_id || seen.has(r.series_id)) return false;
    seen.add(r.series_id);
    return true;
  });
}

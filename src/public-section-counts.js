// Una única definición de conteo público: home_feed aplica status=published,
// deleted_at IS NULL y publish_at <= now(). Nunca usar capítulos privados del equipo.
let cache = new WeakMap();
export async function publicSectionCounts(sb, rows, { ttl = 30000 } = {}) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  let state = cache.get(sb);
  if (!state || Date.now() - state.at > ttl) {
    const promise = Promise.resolve().then(() => sb.rpc('home_feed')).then(({ data, error }) => {
      if (error || !Array.isArray(data?.series)) throw error || new Error('home_feed no devolvió series');
      return new Map(data.series.map(s => [String(s.id), Number(s.chapters?.[0]?.count || 0)]));
    });
    state = { at: Date.now(), promise };
    cache.set(sb, state);
    promise.catch(() => { if (cache.get(sb) === state) cache.delete(sb); });
  }
  try {
    const counts = await state.promise;
    return rows.map(s => counts.has(String(s.id))
      ? { ...s, chapters: [{ count: counts.get(String(s.id)) }] }
      : s);
  } catch {
    // Si falla el feed no bloquear la navegación; los datos anteriores siguen
    // siendo una estimación, nunca se etiquetan como número público validado.
    return rows;
  }
}

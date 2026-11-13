// Huella ligera de los datos públicos de Inicio. No incluye visitas ni ranking:
// su cálculo periódico no debe reiniciar el carrusel si no hay novedades reales.
export function homeFeedRevision(feed) {
  if (!Array.isArray(feed?.series) || !Array.isArray(feed?.latest)) return null;
  const works = feed.series
    .map(s => [s.id || '', s.chapters?.[0]?.count ?? 0, s.translation_status || '', s.cover_path || ''].join(':'))
    .sort().join('|');
  const chapters = feed.latest
    .map(c => [c.series_id || '', c.num ?? '', c.publish_at || ''].join(':'))
    .sort().join('|');
  return works + '#' + chapters;
}

export function homeFeedHasNewContent(previous, next) {
  const after = homeFeedRevision(next);
  return previous !== null && after !== null && previous !== after;
}

// La vuelta a una pestaña no genera más consultas que el pulso normal:
// tras una comprobación de volumen, esperar al menos un minuto, sea por
// temporizador o por visibilidad/foco. La comprobación de capítulos sigue
// teniendo su propio límite de cinco minutos.
export function homeReleaseCheckDue(lastCheckMs, nowMs, minIntervalMs = 60_000) {
  return Number.isFinite(lastCheckMs) && Number.isFinite(nowMs)
    && Number.isFinite(minIntervalMs) && minIntervalMs > 0
    && nowMs - lastCheckMs >= minIntervalMs;
}

// Módulo independiente: no introduce consultas en studio-stats-display.js.

/** Visitas a la ficha; separadas de las «Vistas» de capítulos ya existentes. */
export async function paintProfileVisitStats(sb, seriesId, days, element) {
  if (!element || !seriesId) return;
  try {
    const { data, error } = await sb.rpc('series_profile_visit_stats', {
      p_series: seriesId, p_days: days
    });
    if (error || !data || !element.isConnected) return;
    const recent = Math.max(0, Number(data.recent) || 0).toLocaleString('es-MX');
    const total = Math.max(0, Number(data.total) || 0).toLocaleString('es-MX');
    const selectedDays = Math.max(1, Math.min(365, Number(data.days) || 30));
    element.innerHTML = `<section class="s2-box" aria-labelledby="st-profile-views-title">
      <div class="s2-bh"><h2 id="st-profile-views-title">Visitas a la ficha de la novela</h2>
        <a class="mono" href="/ranking?lista=visitas">Ver Ranking →</a></div>
      <div class="s2-kpis">
        <div class="s2-kpi" style="--c:#f2c230"><small>Últimos ${selectedDays} días</small><b>${recent}</b><span>visitas a la ficha</span></div>
        <div class="s2-kpi" style="--c:#8cc3f2"><small>Desde que inició el registro</small><b>${total}</b><span>visitas acumuladas a la ficha</span></div>
      </div><p class="mono st-metric-help">Una visita por visitante y novela al día. No modifica las estadísticas de lectura ni incluye visitas anteriores a la instalación.</p></section>`;
  } catch {
    // Estadísticas existentes siguen disponibles si la migración no está instalada.
  }
}

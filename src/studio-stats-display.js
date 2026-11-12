// Etiquetas de Estadísticas: representación pura de los valores publicados por series_stats.
// En esa RPC, views = suma en el período y views_total = acumulado por capítulo.
export function dailyViewsScale(rows = []) {
  const values = Array.isArray(rows) ? rows.map(x => Number(x?.n) || 0) : [];
  const max = Math.max(0, ...values.filter(x => Number.isFinite(x)));
  const top = Math.max(1, Math.ceil(max));
  const middle = Math.ceil(top / 2);
  return {top, ticks:[top,middle,0], empty:max===0};
}

export function viewsColumnMeaning(days) {
  const interval = Number.isFinite(+days) && +days > 0 ? Math.trunc(+days) : 30;
  return {
    views:'Vistas en los últimos '+interval+' días',
    total:'Vistas acumuladas desde el registro de estadísticas',
    caption:'«Vistas» corresponde únicamente al período de '+interval+' días seleccionado. «Total» es el acumulado histórico registrado; no incluye estimaciones anteriores a la medición.'
  };
}

export function reviewCountsForWorks(chapters = [], latest = {}) {
  const counts = {};
  for(const ch of chapters) {
    const id=ch?.series_id;
    if(!id)continue;
    const current=latest[ch.id];
    if(!current)continue;
    const obj=(counts[id] ||= {pending:0,changes:0,approved:0,expired:0});
    if(current.base_version !== ch.version){obj.expired++;continue;}
    if(current.status==='pending')obj.pending++;
    else if(current.status==='approved')obj.approved++;
    else obj.changes++;
  }
  return counts;
}

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

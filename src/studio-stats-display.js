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

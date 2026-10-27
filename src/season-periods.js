// Intervalos inclusivos de las temporadas visuales del Obi.
// Usa el mismo catálogo SEASONS que anim.js y las fechas solares de season_calendar.
// Todas las operaciones se basan en claves ISO a mediodía UTC: sin desajustes por DST.
export const addSeasonDay = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

export function seasonPeriods(seasons, from, to, { hemi = 'norte', starts = [] } = {}) {
  if (!seasons || !/^\d{4}-\d\d-\d\d$/.test(from) || !/^\d{4}-\d\d-\d\d$/.test(to) || from > to) return [];
  const results = [], firstYear = Number(from.slice(0, 4)) - 1, lastYear = Number(to.slice(0, 4)) + 1;
  const put = (key, start, end) => {
    const s = seasons[key];
    if (!s || !start || !end || start > end || start > to || end < from) return;
    results.push({ key, label: s.l, color: s.ac, kind: s.g === 'est' ? 'estacion' : 'festividad', start, end });
  };

  // Ventanas fijas (incluidos Año Nuevo y sus intervalos entre dos años).
  // Festividades lunares: la fecha del año ya puede estar sincronizada por season.load().
  for (const [key, s] of Object.entries(seasons)) {
    if (s.g === 'est') continue;
    for (let year = firstYear; year <= lastYear; year++) {
      if (s.w) {
        const [a, b] = s.w;
        const endYear = b < a ? year + 1 : year;
        put(key, `${year}-${a}`, `${endYear}-${b}`);
      } else if (s.d?.years?.[year]) {
        const date = `${year}-${s.d.years[year]}`;
        put(key, addSeasonDay(date, -(s.d.before ?? 1)), addSeasonDay(date, s.d.after ?? 1));
      }
    }
  }

  // Estaciones del año: del equinoccio/solsticio hasta el día previo al siguiente.
  // Una fecha solar procedente de season_calendar prevalece sobre el inicio fijo.
  const south = hemi === 'sur';
  const solar = [
    ['03-20', south ? 'otono' : 'primavera'],
    ['06-21', south ? 'invierno' : 'verano'],
    ['09-22', south ? 'primavera' : 'otono'],
    ['12-21', south ? 'verano' : 'invierno']
  ];
  const overrides = new Map();
  for (const c of starts) {
    if (c?.hemi !== hemi || !/^\d{4}-\d\d-\d\d$/.test(c.starts || '') || !seasons[c.key] || seasons[c.key].g !== 'est') continue;
    overrides.set(c.starts.slice(0, 4) + ':' + c.key, c.starts);
  }
  const boundaries = [];
  for (let year = firstYear; year <= lastYear + 1; year++) {
    for (const [md, key] of solar) {
      boundaries.push({ key, at: overrides.get(year + ':' + key) || `${year}-${md}` });
    }
  }
  boundaries.sort((a, b) => a.at.localeCompare(b.at));
  for (let i = 0; i < boundaries.length - 1; i++) {
    const current = boundaries[i], next = boundaries[i + 1];
    put(current.key, current.at, addSeasonDay(next.at, -1));
  }
  return results.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.label.localeCompare(b.label, 'es'));
}

export function formatSeasonPeriod(p) {
  const fmt = k => new Date(k + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  if (p.start === p.end) return fmt(p.start);
  if (p.start.slice(0, 7) === p.end.slice(0, 7)) {
    return p.start.slice(8).replace(/^0/, '') + ' al ' + fmt(p.end);
  }
  if (p.start.slice(0, 4) === p.end.slice(0, 4)) {
    const start = new Date(p.start + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    return start + ' al ' + fmt(p.end);
  }
  return fmt(p.start) + ' al ' + fmt(p.end);
}

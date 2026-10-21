// Inicio editorial: una publicación de volumen completo tiene prioridad sobre los capítulos del mismo lanzamiento.
import { publicationDate } from './publication-dates.js?v=1';

export function homeReleaseOverview(latest = [], volumes = [], visibleSeries = [], now = Date.now()) {
  const visible = new Set(visibleSeries.map(s => s.id));
  const atMs = value => {
    const d = publicationDate(value, now);
    return d && d.getTime() <= now ? d.getTime() : -1;
  };
  const chapters = new Map();
  for (const c of Array.isArray(latest) ? latest : []) {
    if (!visible.has(c.series_id) || atMs(c.publish_at) < 0) continue;
    if (!chapters.has(c.series_id)) chapters.set(c.series_id, []);
    chapters.get(c.series_id).push(c);
  }
  for (const list of chapters.values()) list.sort((a, b) => atMs(b.publish_at) - atMs(a.publish_at) || (+b.num || 0) - (+a.num || 0));

  const lastVolume = new Map();
  for (const v of Array.isArray(volumes) ? volumes : []) {
    // announced_at certifica que la plataforma anunció el volumen, no solamente un capítulo.
    if (!visible.has(v.series_id) || v.status !== 'published' || !v.announced_at || atMs(v.published_at) < 0) continue;
    const old = lastVolume.get(v.series_id);
    if (!old || atMs(v.published_at) > atMs(old.published_at) || (atMs(v.published_at) === atMs(old.published_at) && +v.num > +old.num))
      lastVolume.set(v.series_id, v);
  }
  const entries = [];
  for (const s of visibleSeries) {
    const chs = chapters.get(s.id) || [];
    const c = chs[0], v = lastVolume.get(s.id);
    const tc = c ? atMs(c.publish_at) : -1, tv = v ? atMs(v.published_at) : -1;
    // Algunos importadores asignan publish_at a sus capítulos minutos después de publicar el volumen.
    if (v && tv + 30 * 60000 >= tc) {
      entries.push({ id: s.id, kind: 'volume', volume: v, chs: [], at: v.published_at, time: tv });
    } else if (c) {
      // No mezclar capítulos de publicaciones históricas en un mismo anuncio.
      const batch = chs.filter(x => tc - atMs(x.publish_at) <= 10 * 60000).slice(0, 20);
      entries.push({ id: s.id, kind: 'chapter', chs: batch, at: c.publish_at, time: tc });
    }
  }
  entries.sort((a, b) => b.time - a.time || Number(b.kind === 'volume') - Number(a.kind === 'volume') || String(a.id).localeCompare(String(b.id)));
  return { entries, bySeries: Object.fromEntries(entries.map(e => [e.id, e])) };
}

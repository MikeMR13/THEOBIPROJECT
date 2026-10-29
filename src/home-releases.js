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

  const lastVolume = new Map(), publishedVolumeCount = new Map();
  for (const v of Array.isArray(volumes) ? volumes : []) {
    if (!visible.has(v.series_id) || v.status !== 'published' || atMs(v.published_at) < 0) continue;
    // Distinguir el primer volumen de una serie de los lanzamientos posteriores.
    // El conteo incluye volúmenes publicados aunque falte su anuncio editorial.
    publishedVolumeCount.set(v.series_id, (publishedVolumeCount.get(v.series_id) || 0) + 1);
    // announced_at certifica que la plataforma anunció el volumen, no solamente un capítulo.
    if (!v.announced_at) continue;
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
      entries.push({ id: s.id, kind: 'volume', volume: v, chs: [], at: v.published_at, time: tv,
        isNewSeries: Number(v.num) === 1 && publishedVolumeCount.get(s.id) === 1 });
    } else if (c) {
      // No mezclar capítulos de publicaciones históricas en un mismo anuncio.
      const batch = chs.filter(x => tc - atMs(x.publish_at) <= 10 * 60000).slice(0, 20);
      entries.push({ id: s.id, kind: 'chapter', chs: batch, at: c.publish_at, time: tc });
    }
  }
  entries.sort((a, b) => b.time - a.time || Number(b.kind === 'volume') - Number(a.kind === 'volume') || String(a.id).localeCompare(String(b.id)));
  return { entries, bySeries: Object.fromEntries(entries.map(e => [e.id, e])) };
}

/** Prioriza volúmenes recién anunciados, sin excluir los capítulos recientes ni modificar datos. */
export function homeReleaseHighlights(entries = [], { now = Date.now(), limit = 10, maxVolumes = 3, freshDays = 7 } = {}) {
  const time = +new Date(now), count = Math.max(0, Math.floor(Number(limit) || 0));
  const max = Math.min(count, Math.max(0, Math.floor(Number(maxVolumes) || 0)));
  if (!Number.isFinite(time) || !count) return [];
  const seen = new Set();
  const valid = (Array.isArray(entries) ? entries : []).filter(x => {
    if (!x?.id || seen.has(x.id) || !Number.isFinite(+x.time) || +x.time > time) return false;
    seen.add(x.id); return true;
  }).sort((a,b)=>+b.time-+a.time || String(a.id).localeCompare(String(b.id)));
  const cutoff = time - Math.max(0, Number(freshDays) || 0) * 86400000;
  const highlighted = valid.filter(x => x.kind === 'volume' && x.volume && +x.time >= cutoff).slice(0,max);
  const selected = new Set(highlighted.map(x => x.id));
  return [...highlighted, ...valid.filter(x => !selected.has(x.id))].slice(0,count);
}

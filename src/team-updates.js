// Publicaciones recientes de un equipo, usando las mismas reglas de fecha del Inicio.
// Nunca usar datos privados como fuentes de enlaces: solo obras publicadas y no archivadas.
import { publicationDate } from './publication-dates.js?v=1';

export function selectTeamUpdates(chapters = [], volumes = [], publicWorks = [], now = Date.now()) {
  const workById = new Map((Array.isArray(publicWorks) ? publicWorks : []).filter(w => w?.id && w?.slug).map(w => [w.id, w]));
  const validTime = value => {
    const date = publicationDate(value, now);
    return date && date.getTime() <= now ? date.getTime() : -1;
  };
  const publishedVolumes = (Array.isArray(volumes) ? volumes : []).filter(v =>
    workById.has(v.series_id) && v.status === 'published' && v.announced_at &&
    validTime(v.published_at) >= 0 && validTime(v.announced_at) >= 0
  );
  const entries = publishedVolumes.map(v => {
    const work = workById.get(v.series_id);
    return {
      kind: 'volume', id: v.id, series_id: v.series_id, series: work,
      volume: v.num, title: v.title || 'Volumen ' + v.num,
      at: v.published_at, time: validTime(v.published_at),
      cover_path: v.cover_path || work.cover_path || '',
      href: '/serie/' + work.slug
    };
  });
  for (const c of Array.isArray(chapters) ? chapters : []) {
    if (!workById.has(c.series_id) || c.status !== 'published' || validTime(c.publish_at) < 0) continue;
    // Si el volumen completo fue anunciado al mismo tiempo, no repetir sus capítulos.
    const sameRelease = publishedVolumes.some(v =>
      v.series_id === c.series_id &&
      ((c.volume_id && c.volume_id === v.id) || (!c.volume_id && Number(c.vol) === Number(v.num))) &&
      Math.abs(validTime(v.published_at) - validTime(c.publish_at)) <= 30 * 60000
    );
    if (sameRelease) continue;
    const work = workById.get(c.series_id);
    entries.push({
      kind: 'chapter', id: c.id, series_id: c.series_id, series: work,
      volume: c.vol, chapter: c.num, title: c.title || 'Capítulo ' + c.num,
      at: c.publish_at, time: validTime(c.publish_at),
      cover_path: work.cover_path || '',
      href: '/leer/' + work.slug + '/' + Number(c.num)
    });
  }
  return entries.sort((a, b) =>
    b.time - a.time || Number(b.kind === 'volume') - Number(a.kind === 'volume') || String(a.id).localeCompare(String(b.id))
  );
}

export async function loadTeamUpdates(sb, publicWorks, now = new Date()) {
  const ids = [...new Set((Array.isArray(publicWorks) ? publicWorks : []).map(w => w.id).filter(Boolean))];
  if (!ids.length) return [];
  const slices = [];
  for (let i = 0; i < ids.length; i += 100) slices.push(ids.slice(i, i + 100));
  const results = await Promise.all(slices.map(async part => {
    const [ch, vol] = await Promise.all([
      sb.from('chapters').select('id,series_id,volume_id,vol,num,title,status,publish_at')
        .in('series_id', part).eq('status', 'published').is('deleted_at', null)
        .not('publish_at', 'is', null).lte('publish_at', now.toISOString())
        .order('publish_at', { ascending: false }).limit(40),
      sb.from('volumes').select('id,series_id,num,title,cover_path,status,published_at,announced_at')
        .in('series_id', part).eq('status', 'published').is('deleted_at', null)
        .not('announced_at', 'is', null).not('published_at', 'is', null)
        .lte('published_at', now.toISOString()).lte('announced_at', now.toISOString())
        .order('published_at', { ascending: false }).limit(40)
    ]);
    if (ch.error) console.warn('team recent chapters', ch.error.message);
    if (vol.error) console.warn('team recent volumes', vol.error.message);
    return { chapters: ch.data || [], volumes: vol.data || [] };
  }));
  return selectTeamUpdates(results.flatMap(r => r.chapters), results.flatMap(r => r.volumes), publicWorks, now.getTime()).slice(0, 24);
}

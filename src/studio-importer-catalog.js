// Carga limitada del catálogo de Importar: primero obras, después volúmenes.
 // Evita el JOIN anidado de todas las obras, que puede bloquear el formulario.
import { readPages } from './paging.js?v=1';

export async function loadStudioImportCatalogue(sb, teamId) {
  if (!teamId) throw new Error('Falta el equipo de importación.');
  const { data: series } = await readPages((from, to) => sb.from('series')
    .select('id,slug,title,cover_path,published')
    .eq('team_id', teamId).is('archived_at', null)
    .order('title').order('id').range(from, to), { size: 200 });
  if (!series.length) return [];

  const volumesBySeries = new Map();
  // Limitar el tamaño del IN; ningún volumen de otro equipo se incorpora.
  for (let i = 0; i < series.length; i += 80) {
    const ids = series.slice(i, i + 80).map(s => s.id);
    const { data: volumes } = await readPages((from, to) => sb.from('volumes')
      .select('id,series_id,num,title,cover_path,deleted_at')
      .in('series_id', ids).order('id').range(from, to), { size: 200 });
    for (const volume of volumes) {
      if (!ids.includes(volume.series_id)) continue;
      if (!volumesBySeries.has(volume.series_id)) volumesBySeries.set(volume.series_id, []);
      volumesBySeries.get(volume.series_id).push(volume);
    }
  }
  return series.map(s => ({ ...s, volumes: volumesBySeries.get(s.id) || [] }));
}

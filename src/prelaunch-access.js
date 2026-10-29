// Contrato compartido: el anuncio de un volumen no habilita su lectura.
// La RLS del servidor sigue siendo la autoridad final de acceso al contenido.
export function isPubliclyReadableChapter(ch, {
  seriesPublished = true, volume = null, now = Date.now()
} = {}) {
  if (!ch || seriesPublished === false) return false;
  if (ch.status != null && String(ch.status) !== 'published') return false;
  if (ch.publish_at && Number.isFinite(Date.parse(ch.publish_at)) && Date.parse(ch.publish_at) > now) return false;
  if (volume) {
    if (volume.status != null && volume.status !== 'published') return false;
    const release = volume.published_at && Date.parse(volume.published_at);
    if (Number.isFinite(release) && release > now) return false;
  }
  return true;
}

export function announcedVolumeIds(pre, now = Date.now()) {
  return new Set((pre?.volumes || [])
    .filter(v => v?.id && Number.isFinite(Date.parse(v.published_at)) && Date.parse(v.published_at) > now)
    .map(v => String(v.id)));
}

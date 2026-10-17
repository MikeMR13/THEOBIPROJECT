// Miniaturas de portada (360 px, WebP; JPEG si el navegador no codifica WebP). Se generan en el navegador del Estudio.
const W = 360, tried = new Set(), last = {};
export async function makeThumb(src){
  const r = await fetch(src, { mode: 'cors', credentials: 'omit' }); if (!r.ok) throw new Error('portada ' + r.status);
  const bmp = await createImageBitmap(await r.blob());
  const w = Math.min(W, bmp.width), h = Math.round(bmp.height * w / bmp.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  let b = await new Promise(res => c.toBlob(res, 'image/webp', 0.8));
  if (!b || b.type !== 'image/webp') b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
  return b;
}
// Completa en segundo plano las obras del equipo con portada y sin miniatura (nuevas o cambiadas). Máx. 1 vez por minuto.
export async function heal(sb, teamId, pub){
  if (!teamId || Date.now() - (last[teamId] || 0) < 60000) return; last[teamId] = Date.now();
  const { data, error } = await sb.from('series').select('id,cover_path').eq('team_id', teamId).not('cover_path', 'is', null).is('cover_thumb_path', null).limit(12);
  if (error) return;
  for (const s of data || []) {
    const k = s.id + '|' + s.cover_path; if (tried.has(k)) continue; tried.add(k);
    try {
      const b = await makeThumb(/^https?:/.test(s.cover_path) ? s.cover_path : pub + encodeURI(s.cover_path));
      const path = `${teamId}/thumbs/${s.id}-${Date.now()}.${b.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const up = await sb.storage.from('obi-media').upload(path, b, { contentType: b.type, cacheControl: '31536000' }); if (up.error) throw up.error;
      const r = await sb.rpc('series_set_thumb', { p_series: s.id, p_cover: s.cover_path, p_thumb: path }); if (r.error || !r.data) await sb.storage.from('obi-media').remove([path]);
    } catch (e) { console.warn('miniatura', s.id, e); }
  }
}

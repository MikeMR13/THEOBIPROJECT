// Descargas de obras, volúmenes y capítulos para las vistas públicas y Mi biblioteca.
// Compatible con obi-offline-v1 / obi-offline-index del lector; solo se usa el navegador.
const CACHE = 'obi-offline-v1', INDEX = 'obi-offline-index';
const COLS = 'id,num,vol,title,section_type,volume_id,content_warnings,teaser,teaser_on,updated_at,status,publish_at';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export const readOfflineIndex = (store = localStorage) => {
  try { const o = JSON.parse(store.getItem(INDEX) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  catch { return {}; }
};
export function offlineSaved(index, slug, scope, vol, num) {
  const entries = Object.values(index).filter(x => x?.slug === slug && Array.isArray(x.nums));
  if (scope === 'chapter') return entries.some(x => x.nums.includes(+num));
  if (scope === 'volume') return entries.some(x => +x.vol === +vol && x.kind !== 'chapter');
  // Una novela solo se marca completa cuando se guardaron todos sus volúmenes en la misma descarga.
  const all = entries.filter(x => x.seriesVolumes && x.kind !== 'chapter');
  return all.length > 0 && all.every(x => all.some(y => +y.vol === +x.vol)) &&
    new Set(all.map(x => +x.vol)).size >= +all[0].seriesVolumes;
}
export function createOfflineDownloads({ sb, url, toast = () => {}, store = localStorage, cacheAPI = globalThis.caches, fetcher = globalThis.fetch }) {
  let working = false;
  const index = () => readOfflineIndex(store);
  const label = scope => scope === 'chapter' ? 'Descargar capítulo' : scope === 'volume' ? 'Descargar volumen' : 'Descargar novela';
  const button = ({ slug, scope = 'series', vol, num }) => {
    if (!/^[a-z0-9_-]+$/i.test(slug || '') || !['series','volume','chapter'].includes(scope)) return '';
    const saved = offlineSaved(index(), slug, scope, vol, num);
    const attrs = ' data-offline-scope="' + esc(scope) + '" data-offline-slug="' + esc(slug) + '"' +
      (vol != null ? ' data-offline-vol="' + esc(vol) + '"' : '') +
      (num != null ? ' data-offline-num="' + esc(num) + '"' : '');
    return '<button type="button" class="obi-offline-btn" ' + attrs +
      ' aria-label="' + esc((saved ? 'Ya descargado: ' : '') + label(scope) + ' sin conexión') +
      '" title="Guardar para leer sin internet"' + (saved ? ' data-saved="1"' : '') + '>' +
      (saved ? '✓ Descargado' : '↓ ' + label(scope)) + '</button>';
  };
  const repaint = () => {
    document.querySelectorAll('button[data-offline-scope]').forEach(b => {
      const saved = offlineSaved(index(), b.dataset.offlineSlug, b.dataset.offlineScope,
        b.dataset.offlineVol, b.dataset.offlineNum);
      b.dataset.saved = saved ? '1' : '0';
      b.textContent = saved ? '✓ Descargado' : '↓ ' + label(b.dataset.offlineScope);
      b.disabled = working;
      b.setAttribute('aria-label', saved ? 'Ya descargado, disponible sin conexión' :
        label(b.dataset.offlineScope) + ' para leer sin conexión');
    });
  };
  const media = s => /^https?:\/\//.test(s) ? s :
    url + '/storage/v1/object/public/obi-media/' + encodeURI(s);
  const load = async slug => {
    const [a,b,c] = await Promise.all([
      sb.from('series').select('id,slug,title,team_id,teams(name,slug,status,avatar_path,settings,reader_defaults)').eq('slug',slug).maybeSingle(),
      sb.from('chapters').select(COLS + ',series!inner(slug)').eq('series.slug',slug).is('deleted_at',null).order('num'),
      sb.from('volumes').select('id,num,title,epub_fonts,series!inner(slug)').eq('series.slug',slug).is('deleted_at',null).order('num')
    ]);
    if (a.error || b.error || c.error || !a.data) throw new Error('No se pudieron comprobar los permisos de esta obra');
    const now = Date.now();
    const strip = rows => (rows || []).map(({series,...item}) => item);
    const chapters = strip(b.data).filter(x => x.status === 'published' &&
      (!x.publish_at || new Date(x.publish_at).getTime() <= now));
    return { series: a.data, chapters, vols: strip(c.data) };
  };
  const download = async ({slug,scope='series',vol,num}, progress=()=>{}) => {
    if (working) throw new Error('Hay otra descarga en curso');
    if (!navigator.onLine) throw new Error('Conéctate a internet antes de descargar');
    if (!cacheAPI?.open) throw new Error('Este navegador no admite descargas sin conexión');
    if (!/^[\w-]+$/.test(slug || '')) throw new Error('Obra inválida');
    working = true;
    let cache, previousMeta, metaChanged = false;
    const inserted = new Set();
    try {
      const m = await load(slug), idx = index(), groups = new Map();
      const selected = m.chapters.filter(ch => scope === 'series' ||
        (scope === 'volume' ? +ch.vol === +vol : +ch.num === +num));
      if (!selected.length) throw new Error('No hay capítulos publicados disponibles para descargar');
      for (const ch of selected) {
        if (!groups.has(+ch.vol)) groups.set(+ch.vol, []);
        groups.get(+ch.vol).push(ch);
      }
      const already = offlineSaved(idx,slug,scope,vol,num);
      if (already) { toast('Estos capítulos ya están guardados en el dispositivo'); return { already:true }; }
      // Solo comprometer el índice una vez que el texto, imágenes y fuentes estén presentes.
      cache = await cacheAPI.open(CACHE);
      const metaKey = '/offline/meta/' + slug;
      previousMeta = await cache.match(metaKey);
      const assetsByVol = new Map();
      let n = 0;
      for (const ch of selected) {
        progress('Descargando capítulo ' + (++n) + ' de ' + selected.length + '…');
        const k = '/offline/' + slug + '/' + ch.num;
        if (!await cache.match(k)) {
          const { data, error } = await sb.from('chapters').select('body').eq('id', ch.id).maybeSingle();
          if (error || !Array.isArray(data?.body) || !data.body.length)
            throw new Error('El capítulo ' + ch.num + ' no está disponible para descargar');
          await cache.put(k, new Response(JSON.stringify(data.body), {headers:{'Content-Type':'application/json'}}));
          inserted.add(k);
        }
        const r = await cache.match(k), blocks = await r?.json();
        if (!Array.isArray(blocks)) throw new Error('Contenido incompleto del capítulo ' + ch.num);
        const assets = assetsByVol.get(+ch.vol) || new Set();
        for (const bl of blocks) if (bl?.url || bl?.src) assets.add(media(bl.url || bl.src));
        assetsByVol.set(+ch.vol,assets);
      }
      for (const [v, assets] of assetsByVol) {
        const volInfo = m.vols.find(x => +x.num === +v);
        for (const f of volInfo?.epub_fonts || []) if (f.url) assets.add(media(f.url));
      }
      progress('Guardando ilustraciones y fuentes…');
      for (const asset of new Set([...assetsByVol.values()].flatMap(x => [...x]))) {
        if (await cache.match(asset)) continue;
        const response = await fetcher(asset, {mode:'cors',credentials:'omit'});
        if (!response.ok || response.type === 'opaque') throw new Error('No se pudo guardar una ilustración o fuente');
        await cache.put(asset, response);
        inserted.add(asset);
      }
      let gloss = [];
      try { const r = await sb.from('glossary_terms').select('term,category,definition').eq('series_id',m.series.id); gloss = r.data || []; } catch {}
      const clean = {series:m.series,chapters:m.chapters,vols:m.vols,gloss};
      await cache.put(metaKey,new Response(JSON.stringify(clean),{headers:{'Content-Type':'application/json'}}));
      metaChanged = true;
      const next = {...idx};
      const total = groups.size;
      for (const [v, chapters] of groups) {
        const key = scope === 'chapter' ? m.series.id + ':ch:' + chapters[0].num : m.series.id + ':' + v;
        const assets = [...(assetsByVol.get(v) || [])];
        next[key] = {slug,title:m.series.title,vol:v,nums:chapters.map(ch=>ch.num),assets,
          at:Date.now(),kind:scope === 'chapter'?'chapter':'volume',
          ...(scope === 'series' ? {seriesVolumes:total}: {})};
      }
      store.setItem(INDEX,JSON.stringify(next));
      navigator.storage?.persist?.().catch(()=>{});
      toast(scope === 'chapter' ? 'Capítulo disponible sin conexión' :
        scope === 'volume' ? 'Volumen disponible sin conexión' : 'Novela lista para leer sin conexión');
      document.dispatchEvent(new Event('obi-offline-change'));
      return {saved:true,chapters:selected.length};
    } catch (error) {
      // Nunca borrar una descarga previa al revertir un fallo o falta de espacio.
      if (cache) {
        await Promise.allSettled([...inserted].map(k => cache.delete(k)));
        if (metaChanged) {
          try { if (previousMeta) await cache.put('/offline/meta/' + slug,previousMeta);
            else await cache.delete('/offline/meta/' + slug); } catch {}
        }
      }
      throw error;
    } finally { working = false; repaint(); }
  };
  const bind = () => {
    if (document.documentElement.dataset.obiOfflineBound) return;
    document.documentElement.dataset.obiOfflineBound = '1';
    document.addEventListener('click', async e => {
      const b = e.target.closest?.('button[data-offline-scope]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (working || b.disabled) return;
      if (offlineSaved(index(),b.dataset.offlineSlug,b.dataset.offlineScope,b.dataset.offlineVol,b.dataset.offlineNum))
        return toast('Ya está descargado. Puedes administrarlo desde Mis descargas.');
      try {
        await download({slug:b.dataset.offlineSlug,scope:b.dataset.offlineScope,
          vol:b.dataset.offlineVol,num:b.dataset.offlineNum},
          text=>{ if (b.isConnected) b.textContent=text; });
      } catch (error) { toast('No se completó la descarga: ' + (error?.message || 'inténtalo de nuevo')); }
      repaint();
    });
    document.addEventListener('obi-offline-change',repaint);
  };
  return {button,download,bind,repaint};
}

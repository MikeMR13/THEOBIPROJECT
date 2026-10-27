import { confirmInApp } from './dialogs.js';
// Gestor de archivos del Studio (Storage y portadas), cargado bajo demanda.
export function createLibrary(deps){
  const { sb, app, $, esc, toast, go, getUser, getMe, url, PUB, media, pathOf, T, can, ensure, fmtTz, fromLocal, toLocal, tzHint, busy, shell, bindPicker, errMsg, LIMITS } = deps;
  // ---------- multimedia ----------
  async function library(folder = '', page = 0){
    if (!(await ensure())) return;
    const root = T.team.id + '/' + folder;
    const { data, error } = await sb.storage.from('obi-media').list(root.replace(/\/$/, ''), { limit: 41, offset: page * 40, sortBy: { column: 'name', order: 'asc' } });
    const list = (data || []).slice(0, 40), dirs = list.filter(x => !x.id), files = list.filter(x => x.id);
    const crumbs = folder.split('/').filter(Boolean), vf = folder.match(/^obras\/([\w-]+)\/vol-(\d+)\/$/), canCov = vf && can('edit');
    app.innerHTML = shell('Multimedia', `
      <nav class="mono st-crumbs" aria-label="Carpetas de multimedia"><a href="#" data-dir="">${esc(T.team.name)}</a>${crumbs.map((c, i) => ` / <a href="#" data-dir="${esc(crumbs.slice(0, i + 1).join('/') + '/')}">${esc(c)}</a>`).join('')}</nav>
      ${error ? `<p>${esc(error.message)}</p>` : ''}
      <div class="st-row st-media-actions">${can('edit') ? '<label class="btn ghost">Subir imágenes<input type="file" id="upl" accept="image/*" multiple hidden></label>' : ''}<button class="btn ghost" id="selall">Seleccionar página</button>${can('delete') ? '<button class="btn ghost danger" id="delsel">Borrar seleccionadas</button>' : ''}<span class="mono" id="sel">0 seleccionadas</span></div>
      <div class="st-media" role="group" aria-label="Archivos y carpetas">${dirs.map(d => `<a href="#" class="st-dir" data-dir="${esc(folder + d.name + '/')}">📁 ${esc(d.name)}</a>`).join('')}${files.map(f => { const p = root + f.name; return `<label class="st-file"><input type="checkbox" data-p="${esc(p)}" aria-label="Seleccionar archivo ${esc(f.name)}">${/\.(png|jpe?g|webp|gif|avif)$/i.test(f.name) ? `<img src="${esc(media(p))}" alt="" loading="lazy">` : '<span class="mono">fuente</span>'}<span class="mono">${esc(f.name)} · ${Math.round((f.metadata?.size || 0) / 1024)} KB</span><button class="lnk" data-copy="${esc(media(p))}">Copiar URL</button>${canCov && /\.(png|jpe?g|webp|gif|avif)$/i.test(f.name) ? `<button class="lnk" data-cover="${esc(p)}">Usar como portada del Vol. ${vf[2]}</button>` : ''}</label>`; }).join('') || (dirs.length ? '' : '<p class="mono">Carpeta vacía.</p>')}</div>
      <p class="st-row">${page > 0 ? '<button class="btn ghost" id="prev">‹ Anterior</button>' : ''}${(data || []).length > 40 ? '<button class="btn ghost" id="next">Siguiente ›</button>' : ''}</p>`, '/estudio/multimedia');
    bindPicker(() => library());
    app.querySelectorAll('[data-dir]').forEach(a => a.onclick = e => { e.preventDefault(); library(a.dataset.dir, 0); });
    app.querySelectorAll('[data-cover]').forEach(b => b.onclick = e => { e.preventDefault(); busy(b, async () => {
      const { data: s } = await sb.from('series').select('id,cover_path').eq('team_id', T.team.id).eq('slug', vf[1]).maybeSingle(); if (!s) throw new Error('No encontré la obra de esta carpeta');
      const { data: v } = await sb.from('volumes').select('id').eq('series_id', s.id).eq('num', +vf[2]).is('deleted_at', null).maybeSingle(); if (!v) throw new Error('Esa obra no tiene Volumen ' + vf[2]);
      const { error } = await sb.from('volumes').update({ cover_path: b.dataset.cover }).eq('id', v.id); if (error) throw new Error(errMsg(error));
      if (!s.cover_path && await confirmInApp('La obra aún no tiene portada. ¿Usar también esta?')) await sb.from('series').update({ cover_path: b.dataset.cover }).eq('id', s.id);
      toast('Portada del Volumen ' + vf[2] + ' actualizada'); }); });
    app.querySelectorAll('[data-copy]').forEach(b => b.onclick = e => { e.preventDefault(); navigator.clipboard?.writeText(b.dataset.copy); toast('URL copiada'); });
    const boxes = () => [...app.querySelectorAll('[data-p]')], count = () => $('#sel').textContent = boxes().filter(b => b.checked).length + ' seleccionadas';
    app.querySelectorAll('[data-p]').forEach(b => b.onchange = count);
    $('#selall').onclick = () => { const all = boxes().every(b => b.checked); boxes().forEach(b => b.checked = !all); count(); };
    $('#prev')?.addEventListener('click', () => library(folder, page - 1)); $('#next')?.addEventListener('click', () => library(folder, page + 1));
    $('#upl')?.addEventListener('change', e => busy(null, async () => { for (const f of e.target.files) { if (f.size > LIMITS.image) { toast(f.name + ' supera 8 MB'); continue; } const { error } = await sb.storage.from('obi-media').upload(root + Date.now() + '-' + f.name.replace(/[^\w.-]/g, '_'), f, { contentType: f.type }); if (error) toast(error.message); } library(folder, page); }));
    $('#delsel')?.addEventListener('click', e => busy(e.target, async () => {
      const paths = boxes().filter(b => b.checked).map(b => b.dataset.p); if (!paths.length) throw new Error('Selecciona archivos');
      const { data: used } = await sb.rpc('media_in_use', { p_team: T.team.id, p_paths: paths });
      const free = paths.filter(p => !(used || []).includes(p));
      if (free.length) { const { error } = await sb.storage.from('obi-media').remove(free); if (error) throw error; }
      toast(`${free.length} borradas${used?.length ? ` · ${used.length} protegidas porque están en uso` : ''}`); library(folder, page);
    }));
  }


  return library;
}

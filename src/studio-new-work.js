import { createWorkData, renderWorkFields, bindWorkFields, workPayload } from './studio-work-fields.js?v=5';
import { loadRelatedWorks } from './studio-related-works.js?v=5';
import { uploadSeriesCover } from './series-cover-editor.js?v=3';

// Formulario aislado. El editor, los permisos y el guardado remoto siguen en Studio.
export function createNewWork(deps) {
  const {sb,app,$,esc,toast,go,getUser,T,can,ensure,shell,bindPicker,errMsg,busy,LIMITS,slugify}=deps;
  async function newWork(){
    if (!(await ensure())) return;
    const TAB = '/estudio/obras';
    if (!can('create')) { app.innerHTML = shell('Nueva obra', can('import') ? '<p>Tu rol solo permite importar. <a href="/estudio/importar">Importar un archivo →</a></p>' : '<p>Tu rol no permite crear obras.</p>', TAB); bindPicker(newWork); return; }
    // El borrador pertenece a este usuario y equipo, nunca se mezcla entre cuentas.
    const teamId = T.team.id, userId = getUser()?.id || 'anon';
    const draftKey = 'obi-new-work-v1:' + userId + ':' + teamId;
    let savedDraft = null;
    try {
      const candidate = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (candidate?.teamId === teamId && Date.now() - candidate.at < 30 * 86400000 && candidate.data && typeof candidate.data === 'object') savedDraft = candidate;
    } catch {}
    const N = createWorkData(savedDraft?.data || {});
    const storeDraft = () => { try { localStorage.setItem(draftKey, JSON.stringify({teamId,at:Date.now(),data:N})); } catch {} };
    const discardDraft = () => { try { localStorage.removeItem(draftKey); } catch {} };
    let related = [], relatedError = '';
    try { related = await loadRelatedWorks(sb, T.team.id); }
    catch (e) { relatedError = errMsg(e); toast('No se pudo cargar el catálogo de obras relacionadas: ' + relatedError); }
    let made = null, cover = null, coverObjectURL = null, vtitle = '';
    const steps = n => '<ol class="st-steps" style="margin:0 0 22px">' +
      ['Obra', 'Primer volumen', 'Primer capítulo'].map((l,i) =>
        '<li' + (i === n ? ' aria-current="step" style="color:var(--gold);font-weight:700"' : '') + '>' + l + '</li>').join('') + '</ol>';
    const box = (h,inner) => '<section class="wk-box wf-createbox"><h2>' + h + '</h2>' + inner + '</section>';
    const step1 = () => {
      const choices = '<div class="wf-create-choices"><div class="wk-box" style="border-top:4px solid var(--gold)">' +
        '<b>Desde cero</b><small class="mono">Completa la ficha editorial y continúa con el primer volumen.</small></div>' +
        (can('import') ? '<a class="wk-box" href="/estudio/importar" style="text-decoration:none;color:var(--paper)"><b>Importar un archivo →</b><small class="mono">EPUB, DOCX o PDF con la misma ficha editorial completa.</small></a>' : '') +
        '</div>';
      app.innerHTML = shell('Nueva obra', steps(0) + choices + (savedDraft ? '<div class="st-card nw-draft-note" role="status"><span>Se recuperó el borrador local de esta obra (sin portada). Solo se conserva en este dispositivo.</span><button class="btn ghost" type="button" id="nw-discard">Descartar borrador</button></div>' : '') +
        '<h2 class="s2-h2">Datos de la obra</h2><div class="wf-creator" id="nw-fields">' + renderWorkFields(N,esc,related) + '<small class="mono" id="nw-syn-count" role="status">0 / 1500 caracteres de sinopsis</small>' + (relatedError ? '<p role="alert">No se pudieron cargar las obras para relacionar. ' + esc(relatedError) + '</p>' : '') + '</div>' +
        box('Portada de la obra (opcional)', '<label>JPG, PNG o WebP · máximo 8 MB<input type="file" id="nw-cover" accept="image/png,image/jpeg,image/webp"></label><div id="nw-cover-preview" class="nw-cover-preview" hidden><img id="nw-cover-img" alt="Vista previa de la portada seleccionada"><span id="nw-cover-name"></span></div><small class="mono">Si no tienes portada, puedes agregarla después o usar la del volumen importado. La imagen no se almacena en el borrador local.</small>') +
        '<div class="wf-create-actions nw-sticky-actions"><button class="btn" id="nw-go">Guardar obra privada y continuar →</button><a class="btn ghost" href="/estudio/obras">Cancelar</a></div>', TAB);
      bindPicker(newWork);
      bindWorkFields($('#nw-fields'), N, esc, related, msg => { if (msg) toast(msg); else storeDraft(); });
      const synopsis = $('#nw-fields [data-w="synopsis"]');
      const syncSynopsis = () => { const count = $('#nw-syn-count'); if (count && synopsis) count.textContent = synopsis.value.length + ' / 1500 caracteres de sinopsis'; };
      synopsis?.addEventListener('input', syncSynopsis);
      syncSynopsis();
      $('#nw-discard')?.addEventListener('click', () => { discardDraft(); savedDraft = null; newWork(); });
      $('#nw-cover').onchange = e => {
        const v = e.target.files?.[0] || null;
        if (v && (!/^image\/(jpeg|png|webp)$/.test(v.type) || v.size > LIMITS.image)) {
          e.target.value = ''; cover = null; toast('Usa JPG, PNG o WebP de máximo 8 MB'); return;
        }
        cover = v;
        if (coverObjectURL) URL.revokeObjectURL(coverObjectURL);
        coverObjectURL = null;
        const preview = $('#nw-cover-preview'), img = $('#nw-cover-img');
        if (preview) preview.hidden = !cover;
        if (cover && img && typeof URL.createObjectURL === 'function') {
          coverObjectURL = URL.createObjectURL(cover);
          img.src = coverObjectURL;
          const name = $('#nw-cover-name'); if (name) name.textContent = cover.name || 'Portada seleccionada';
        } else if (img) img.removeAttribute('src');
      };
      $('#nw-go').onclick = e => busy(e.currentTarget, async () => {
        if (T.team?.id !== teamId) throw new Error('El equipo cambió; vuelve a abrir Nueva obra.');
        const data = workPayload(N), slugBase = slugify(data.title);
        let slug = slugBase;
        const { data: taken, error: probeErr } = await sb.from('series').select('id').eq('slug',slug).limit(1);
        if (probeErr) throw new Error(errMsg(probeErr));
        if (taken?.length) slug += '-' + Date.now().toString(36).slice(-4);
        const { data: created, error } = await sb.from('series')
          .insert({ ...data, team_id: T.team.id, slug, published: false }).select().single();
        if (error) throw new Error(errMsg(error));
        made = { s: created }; T.works = null;
        discardDraft(); // La obra ya existe; no recuperar un formulario que la duplicaría.
        if (coverObjectURL) { URL.revokeObjectURL(coverObjectURL); coverObjectURL = null; }
        if (cover) {
          try {
            made.s.cover_path = await uploadSeriesCover({
              sb, teamId:T.team.id, slug, seriesId:created.id, file:cover
            });
          } catch (coverError) {
            toast('Obra privada creada, pero la portada no se guardó: ' + errMsg(coverError));
          }
        }
        toast('Obra privada creada con su ficha editorial'); step2();
      });
      $('#nw-fields [data-w="title"]')?.focus();
    };
    const step2 = () => {
      app.innerHTML = shell('Nueva obra', steps(1) +
        box('Volumen 1 de «' + esc(made.s.title) + '»',
          '<label>Título del volumen (opcional)<input id="nw-vt" maxlength="200" placeholder="Volumen 1" value="' + esc(vtitle) + '"></label>' +
          '<span class="wf-create-actions"><button class="btn" id="nw-v">Crear volumen y escribir el capítulo 1 →</button>' +
          (can('import') ? '<a class="btn ghost" href="/estudio/importar">⇪ Importar este volumen desde un archivo</a>' : '') + '</span>' +
          '<span class="mono" style="font-size:12px">Al importar, elige «' + esc(made.s.title) + '» como obra y Volumen 1.</span>' +
          '<a class="lnk" href="/estudio/obra/' + esc(made.s.slug) + '">Dejar sin volumen y editar la obra después</a>'), TAB);
      bindPicker(newWork);
      $('#nw-vt').oninput = e => { vtitle = e.target.value; };
      $('#nw-v').onclick = e => busy(e.currentTarget, async () => {
        if (!made.v) {
          const vt = vtitle.trim();
          const r = await sb.from('volumes').insert({
            series_id: made.s.id, num: 1, status: 'draft', ...(vt ? { title: vt } : {})
          }).select('id,num').single();
          if (r.error) throw new Error(errMsg(r.error)); made.v = r.data;
        }
        const c = await sb.from('chapters').insert({
          series_id: made.s.id, volume_id: made.v.id, vol: 1, num: 1,
          title: 'Capítulo 1', body: [], status: 'draft', section_type: 'Capítulo'
        }).select('id').single();
        if (c.error) throw new Error(errMsg(c.error));
        toast('Primer volumen y capítulo preparados'); go('/estudio/editar/' + c.data.id);
      });
    };
    step1();
  }


  return newWork;
}

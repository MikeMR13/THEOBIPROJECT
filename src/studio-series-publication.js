import { confirmObi, inputObi } from './obi-dialog.js';
// Visibilidad editorial de novelas. La escritura se realiza únicamente por RPC.
export function seriesPublicationHTML(series, volumes, can, esc, toLocal, tzHint) {
  const options = volumes.filter(v => v.status !== 'hidden');
  const announced = options.find(v => v.status === 'scheduled' && v.announce_prelaunch &&
    v.published_at && Date.parse(v.published_at) > Date.now());
  const mode = series.published ? 'published' : announced ? 'prelaunch' : 'draft';
  const first = announced || options.find(v => v.status === 'published') || options[0];
  const allowed = can('publish');
  const label = { draft: 'Borrador privado', prelaunch: 'Reprogramada · Preestreno', published: 'Publicada' }[mode];
  const opts = options.map(v => '<option value="' + esc(v.id) + '"' +
    (first?.id === v.id ? ' selected' : '') + '>Volumen ' + esc(v.num) +
    (v.title && !/^volumen\s*\d+$/i.test(v.title.trim()) ? ' · ' + esc(v.title) : '') + '</option>').join('');
  return '<section class="wk-box" id="wk-series-publication" style="grid-column:1/-1;border-top:4px solid #8cc3f2">' +
    '<h2>Estado de publicación de la novela</h2>' +
    '<p class="mono" style="margin:0">Estado actual: <b>' + esc(label) + '</b>. Es independiente del estado de traducción.</p>' +
    (allowed ? '<div class="wk-g2"><label>Nuevo estado<select id="wk-sp-mode" aria-label="Nuevo estado de publicación">' +
      '<option value="draft"' + (mode === 'draft' ? ' selected' : '') + '>Regresar a borrador</option>' +
      '<option value="prelaunch"' + (mode === 'prelaunch' ? ' selected' : '') + (!can('schedule') || !options.length ? ' disabled' : '') + '>Reprogramar con preestreno</option>' +
      '<option value="published"' + (mode === 'published' ? ' selected' : '') + (!options.length ? ' disabled' : '') + '>Publicar la novela</option>' +
      '</select></label><label id="wk-sp-volwrap"' + (mode === 'draft' ? ' hidden' : '') + '>Volumen que se estrenará<select id="wk-sp-volume" aria-label="Volumen del estreno">' + opts + '</select></label></div>' +
      '<div id="wk-sp-prewrap"' + (mode !== 'prelaunch' ? ' hidden' : '') + '><label>Fecha y hora del nuevo estreno<input type="datetime-local" id="wk-sp-at" value="' +
      (announced ? esc(toLocal(announced.published_at)) : '') + '"></label>' + tzHint() + '</div>' +
      '<p class="mono" id="wk-sp-note" style="margin:0;font-size:12px"></p>' +
      '<div><button type="button" class="btn" id="wk-sp-save">Guardar estado de publicación</button></div>' :
      '<p class="mono" style="margin:0">Necesitas el permiso «Publicar» para cambiar este estado.</p>') +
    '<small class="mono">Se conservan capítulos, portadas, lecturas e historial. Mientras la novela o su volumen estén privados, los capítulos no podrán leerse.</small>' +
    '</section>';
}

export function bindSeriesPublication({ app, sb, series, can, fromLocal, fmtTz, busy, toast, refresh }) {
  const root = app.querySelector('#wk-series-publication');
  if (!root || !can('publish')) return;
  const mode = root.querySelector('#wk-sp-mode');
  const vol = root.querySelector('#wk-sp-volume');
  const date = root.querySelector('#wk-sp-at');
  const save = root.querySelector('#wk-sp-save');
  const note = root.querySelector('#wk-sp-note');
  const volWrap = root.querySelector('#wk-sp-volwrap');
  const preWrap = root.querySelector('#wk-sp-prewrap');
  const notes = {
    draft: 'Oculta toda la novela y cancela los estrenos de volúmenes pendientes; no borra capítulos ni sus lecturas.',
    prelaunch: 'La novela quedará privada, con ficha de preestreno y lectura bloqueada. El volumen elegido se estrenará en esta fecha; los demás publicados o programados volverán a borrador.',
    published: 'Publica ahora el volumen elegido y hace pública la novela. Los demás borradores siguen privados y se aplican las revisiones y avisos habituales.'
  };
  const update = () => {
    const chosen = mode.value;
    volWrap.hidden = chosen === 'draft';
    preWrap.hidden = chosen !== 'prelaunch';
    note.textContent = notes[chosen] || '';
    save.disabled = (chosen !== 'draft' && !vol?.value) || (chosen === 'prelaunch' && !can('schedule'));
  };
  mode.onchange = update;
  update();
  save.onclick = e => busy(e.currentTarget, async () => {
    const selected = mode.value;
    if (!['draft', 'prelaunch', 'published'].includes(selected)) throw new Error('Estado inválido');
    if (selected === 'prelaunch' && !can('schedule')) throw new Error('No tienes permiso para programar');
    if (selected !== 'draft' && !vol?.value) throw new Error('Elige el volumen que se estrenará');
    let at = null;
    if (selected === 'prelaunch') {
      if (!date.value) throw new Error('Elige la fecha y hora del estreno');
      at = fromLocal(date.value);
      if (!at || !Number.isFinite(Date.parse(at)) || Date.parse(at) <= Date.now()) throw new Error('La fecha debe ser futura');
    }
    const warnings = {
      draft: '¿Regresar «' + series.title + '» a borrador? Ninguno de sus volúmenes quedará disponible para lectura.',
      prelaunch: '¿Reprogramar «' + series.title + '» para ' + fmtTz(at) + '? Los demás volúmenes publicados o programados volverán a borrador.',
      published: '¿Publicar «' + series.title + '» ahora? Se aplicará la publicación habitual del volumen seleccionado, incluidos sus avisos.'
    };
    if (!await confirmObi(warnings[selected])) return;
    const { error } = await sb.rpc('series_publication_transition', {
      p_series: series.id, p_mode: selected,
      p_volume: selected === 'draft' ? null : vol.value, p_at: at
    });
    if (error) throw new Error(error.message || 'No se pudo cambiar el estado de la novela');
    toast(selected === 'draft' ? 'Novela devuelta a borrador' : selected === 'prelaunch' ?
      'Preestreno reprogramado para ' + fmtTz(at) : 'Novela publicada');
    refresh();
  });
}

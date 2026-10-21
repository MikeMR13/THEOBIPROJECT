// Organización exclusivamente local de capítulos y volúmenes en la ficha pública.
// No consulta Supabase, no cambia permisos ni almacena datos personales.
export const normalizeSeriesText = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const chapterMatches = (chapter, query = '', filter = 'all') => {
  const term = normalizeSeriesText(query);
  const haystack = normalizeSeriesText(`${chapter.num} ${chapter.title} ${chapter.type || ''} capítulo ${chapter.num}`);
  if (term && !haystack.includes(term)) return false;
  if (filter === 'read') return !!chapter.read;
  if (filter === 'unread') return !chapter.read;
  if (filter === 'new') return !!chapter.newly;
  return true;
};

export const compareVolumeNumbers = (left, right, order = 'desc') => {
  const a = Number(left), b = Number(right);
  const result = Number.isFinite(a) && Number.isFinite(b) ? a - b :
    String(left ?? '').localeCompare(String(right ?? ''), 'es', { numeric: true });
  return order === 'asc' ? result : -result;
};

export const volumeProgress = (chapters, readIds) => {
  const total = chapters.length;
  const read = chapters.reduce((n, chapter) => n + (readIds.has(chapter.id) ? 1 : 0), 0);
  return { total, read, pct: total ? Math.round(read / total * 100) : 0 };
};

export function initSeriesOrganization(root, storage = localStorage) {
  const shelf = root.querySelector('#fx-vols'), input = root.querySelector('#ui-series-search');
  const status = root.querySelector('#ui-series-result'), filterControl = root.querySelector('#ui-series-state');
  const orderControl = root.querySelector('#ui-series-order'), clear = root.querySelector('#ui-series-clear');
  if (!shelf || !input || !status || !filterControl || !orderControl || !clear) return null;
  const volumes = [...shelf.querySelectorAll('.ui-vol-book')];
  const hideRead = root.querySelector('#fx-hide');
  let raf = 0, lastOrder = '';
  const display = () => {
    raf = 0;
    if (!shelf.isConnected) return;
    const query = input.value.trim(), filter = filterControl.value, active = !!query || filter !== 'all';
    const order = orderControl.value === 'asc' ? 'asc' : 'desc';
    if (order !== lastOrder) {
      volumes.sort((a, b) => compareVolumeNumbers(a.dataset.volNum, b.dataset.volNum, order));
      for (const card of volumes) shelf.appendChild(card);
      lastOrder = order;
    }
    // Una selección explícita de 'Leídos' debe ganar a la antigua opción de ocultarlos.
    if (filter === 'read' && hideRead?.checked) {
      hideRead.checked = false;
      storage.setItem('obi-hide-read', '0');
    }
    shelf.classList.toggle('fx-hide', !!hideRead?.checked && !active);
    let visibleVolumes = 0, visibleChapters = 0;
    for (const card of volumes) {
      const chapters = [...card.querySelectorAll('.ui-v-index li[data-chapter-num]')];
      let matches = 0;
      for (const li of chapters) {
        const accepted = chapterMatches({
          num: li.dataset.chapterNum,
          title: li.dataset.chapterTitle,
          type: li.dataset.chapterType,
          read: li.dataset.chapterRead === 'true',
          newly: li.dataset.chapterNew === 'true'
        }, query, filter);
        const shown = accepted && !(hideRead?.checked && !active && li.dataset.chapterRead === 'true');
        li.hidden = !shown;
        if (shown) matches++;
      }
      card.hidden = active && !matches;
      if (!card.hidden) {
        visibleVolumes++;
        visibleChapters += matches;
      }
      const index = card.querySelector('.ui-v-index');
      if (index && active && matches) {
        if (!index.open) { index.open = true; index.dataset.autoOpen = 'true'; }
      } else if (index?.dataset.autoOpen === 'true' && !active) {
        index.open = false;
        delete index.dataset.autoOpen;
      }
    }
    clear.disabled = !query && filter === 'all';
    status.textContent = active
      ? `${visibleChapters} ${visibleChapters === 1 ? 'capítulo' : 'capítulos'} en ${visibleVolumes} ${visibleVolumes === 1 ? 'volumen' : 'volúmenes'}`
      : `${visibleVolumes} ${visibleVolumes === 1 ? 'volumen disponible' : 'volúmenes disponibles'}`;
    const empty = root.querySelector('#ui-series-empty');
    if (empty) empty.hidden = !active || visibleChapters > 0;
  };
  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(display);
  };
  input.addEventListener('input', schedule);
  filterControl.addEventListener('change', schedule);
  orderControl.addEventListener('change', () => {
    storage.setItem('obi-serie-vol-order', orderControl.value === 'asc' ? 'asc' : 'desc');
    schedule();
  });
  hideRead?.addEventListener('change', schedule);
  clear.addEventListener('click', () => {
    input.value = '';
    filterControl.value = 'all';
    input.focus();
    schedule();
  });
  display();
  return { refresh: display };
}

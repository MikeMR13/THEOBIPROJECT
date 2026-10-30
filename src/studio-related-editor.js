// Panel estable para relaciones de una obra existente.
// Solo reconstruye la lista de vínculos; conserva el buscador, su foco y listeners.
import { loadRelatedWorks, relatedSearchHTML, mountRelatedSearch } from './studio-related-works.js?v=4';

const TYPES = [
  ['precuela','Precuela'],['secuela','Secuela'],['spinoff','Spin-off'],
  ['universo','Mismo universo'],['paralela','Historia paralela'],
  ['adaptacion','Adaptación'],['alterna','Versión alternativa'],['otra','Relacionada']
];

export function mountWorkRelationsEditor({ container, sb, teamId, seriesId, relations,
  editable, esc, onDirty, onSave, initialStatus = '' }) {
  if (!container) return null;
  let disposed = false, picker = null, works = [], relationKind = 'precuela';
  let statusText = initialStatus;
  const controller = new AbortController();
  const signal = controller.signal;
  let selectedRows, count, searchArea, status;
  const setStatus = (message, isError = false) => {
    statusText = message;
    if (status) {
      status.textContent = message;
      status.dataset.error = String(isError);
    }
  };
  const drawRows = () => {
    if (!selectedRows || disposed) return;
    const byId = new Map(works.map(w => [w.id, w]));
    selectedRows.innerHTML = relations.map((rel, index) => {
      const found = byId.get(rel.id);
      const title = esc(found?.title || 'Obra no disponible');
      const team = esc(found?.teams?.name || '');
      const options = TYPES.map(([value, label]) =>
        '<option value="' + value + '"' + (rel.kind === value ? ' selected' : '') + '>' + label + '</option>'
      ).join('');
      return '<div class="srp-selected-row">' +
        '<span class="srp-selected-info"><b title="' + title + '">' + title + '</b>' +
        '<small class="mono">' + team + '</small></span>' +
        '<span class="srp-selected-actions"><select data-rk="' + index + '"' +
        (editable ? '' : ' disabled') + ' aria-label="Tipo de relación">' + options + '</select>' +
        (editable ? '<button type="button" class="lnk danger" data-rx="' + index + '">Quitar</button>' : '') +
        '</span></div>';
    }).join('') || '<p class="mono">Sin obras relacionadas.</p>';
    if (count) count.textContent = relations.length + ' de 12 relacionadas seleccionadas.';
    if (searchArea) searchArea.hidden = relations.length >= 12;
    picker?.refresh();
  };
  const render = error => {
    if (disposed || !container.isConnected) return;
    const options = TYPES.map(([value,label]) =>
      '<option value="' + value + '">' + label + '</option>').join('');
    container.innerHTML = '<div class="srp-editor">' +
      '<div data-rel-selected aria-live="polite"></div>' +
      (error ? '<p class="mono srp-error" role="alert">No se pudo cargar el catálogo: ' + esc(error) + '</p>' : '') +
      (editable && !error ? '<div class="wk-rel-add" data-rel-search-area>' +
        '<label class="srp-kind">Tipo de relación<select data-rel-kind>' + options + '</select></label>' +
        relatedSearchHTML('wk-related-search') + '</div>' : '') +
      (editable ? '<div class="srp-save"><button type="button" class="btn sm" id="rel-save-all" data-rel-save>Guardar datos y relaciones</button>' +
        '<small class="mono" data-rel-count></small></div>' +
        '<p class="mono srp-save-message" id="wk-rel-save-status" role="status" aria-live="polite"></p>' : '') +
      '</div>';
    selectedRows = container.querySelector('[data-rel-selected]');
    count = container.querySelector('[data-rel-count]');
    searchArea = container.querySelector('[data-rel-search-area]');
    status = container.querySelector('#wk-rel-save-status');
    setStatus(statusText);
    if (searchArea) {
      picker = mountRelatedSearch(searchArea.querySelector('[data-related-search]'), {
        works, esc, exclude: () => [seriesId, ...relations.map(r => r.id)],
        onPick: chosen => {
          if (disposed || relations.length >= 12 || relations.some(r => r.id === chosen.id)) return false;
          relations.push({ id:chosen.id, kind:relationKind });
          onDirty();
          drawRows();
          setStatus('✓ ' + chosen.title + ' añadida a Obras relacionadas. Falta guardar los cambios.');
          return true;
        }
      });
    }
    drawRows();
  };
  container.addEventListener('change', event => {
    const item = event.target.closest('[data-rk]');
    if (item) {
      const index = Number(item.dataset.rk);
      if (relations[index] && relations[index].kind !== item.value) {
        relations[index].kind = item.value;
        onDirty();
        setStatus('Tipo actualizado. Falta guardar los cambios.');
      }
    } else if (event.target.matches('[data-rel-kind]')) {
      relationKind = event.target.value;
    }
  }, { signal });
  container.addEventListener('click', event => {
    const remove = event.target.closest('[data-rx]');
    if (remove) {
      const index = Number(remove.dataset.rx);
      if (index >= 0 && index < relations.length) {
        relations.splice(index,1);
        setStatus('Relación quitada. Falta guardar los cambios.');
        onDirty();
        drawRows();
      }
      return;
    }
    if (event.target.closest('[data-rel-save]')) onSave();
  }, { signal });
  loadRelatedWorks(sb,teamId).then(data => {
    if (disposed) return;
    works = data;
    render(null);
  }).catch(error => {
    if (!disposed) render(error?.message || String(error));
  });
  return {
    setStatus,
    pendingSearchText: () => searchArea?.querySelector('[data-related-query]')?.value.trim() || '',
    destroy: () => {
      disposed = true;
      picker?.destroy();
      controller.abort();
    }
  };
}

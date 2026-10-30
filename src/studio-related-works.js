// Catálogo completo y selector compacto de obras relacionadas.
// Reutilizado en Nueva obra, Importar y Editar datos. Nunca ignora RLS.
import { readPages } from './paging.js?v=1';

export async function loadRelatedWorks(sb, teamId) {
  const { data } = await readPages((from, to) => sb.from('series')
    .select('id,title,teams(name)')
    .or('published.eq.true,team_id.eq.' + teamId)
    .is('archived_at', null)
    .order('title').order('id').range(from, to), { size: 250 });
  return data;
}

export const normalizeRelatedText = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export function searchRelatedWorks(works, query, excluded = [], limit = 12) {
  const blocked = new Set(excluded);
  const terms = normalizeRelatedText(query).split(/\s+/).filter(Boolean);
  const matches = (works || []).filter(work => {
    if (!work?.id || blocked.has(work.id)) return false;
    const text = normalizeRelatedText(work.title + ' ' + (work.teams?.name || ''));
    return terms.every(term => text.includes(term));
  });
  return { items: matches.slice(0, limit), total: matches.length };
}

export function relatedSearchHTML(id) {
  return `<div class="srp" data-related-search>
    <label class="srp-label" for="${id}">Buscar obra por título o equipo
      <input id="${id}" data-related-query type="search" autocomplete="off"
        placeholder="Escribe un título o el nombre del equipo…" aria-controls="${id}-results">
    </label>
    <div class="srp-results" id="${id}-results" data-related-results
      role="group" aria-label="Obras disponibles" hidden></div>
    <p class="mono srp-status" data-related-status role="status">Haz clic en el campo para buscar obras.</p>
  </div>`;
}

let activePicker = null;

export function mountRelatedSearch(root, { works = [], exclude = () => [], onPick, esc }) {
  if (!root) return;
  const input = root.querySelector('[data-related-query]');
  const results = root.querySelector('[data-related-results]');
  const status = root.querySelector('[data-related-status]');
  let outsideController = null, ignoreNextFocus = false;
  const hide = () => {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    outsideController?.abort();
    outsideController = null;
    if (activePicker === hide) activePicker = null;
  };
  const activate = () => {
    if (activePicker && activePicker !== hide) activePicker();
    activePicker = hide;
    if (outsideController) return;
    outsideController = new AbortController();
    const outside = event => {
      if (!root.isConnected || !root.contains(event.target)) hide();
    };
    document.addEventListener('pointerdown', outside, { signal:outsideController.signal });
    document.addEventListener('focusin', outside, { signal:outsideController.signal });
  };
  const draw = () => {
    const { items, total } = searchRelatedWorks(works, input.value, exclude());
    results.innerHTML = items.map(w => `<button type="button" class="srp-result"
      data-related-id="${esc(w.id)}" title="${esc(w.title)}">
      <span class="srp-title">${esc(w.title)}</span>
      <small>${esc(w.teams?.name || 'Equipo sin nombre')}</small>
      <span class="srp-select-action" aria-hidden="true">＋ Seleccionar obra</span>
    </button>`).join('') || '<p class="mono srp-empty">No hay obras disponibles con esta búsqueda.</p>';
    status.textContent = total > items.length
      ? `Mostrando ${items.length} de ${total} obras. Escribe para encontrar cualquiera de las demás.`
      : `${total} ${total === 1 ? 'obra disponible' : 'obras disponibles'}.`;
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    activate();
  };
  input.addEventListener('focus', () => {
    if (ignoreNextFocus) { ignoreNextFocus = false; return; }
    draw();
  });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); hide(); return; }
    if (event.key === 'ArrowDown') {
      if (results.hidden) draw();
      const first = results.querySelector('button');
      if (first) { event.preventDefault(); first.focus(); }
    }
  });
  results.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      ignoreNextFocus = true;
      hide();
      input.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const buttons = [...results.querySelectorAll('[data-related-id]')];
      const at = buttons.indexOf(event.target.closest('[data-related-id]'));
      const next = buttons[at + (event.key === 'ArrowDown' ? 1 : -1)];
      if (next) { event.preventDefault(); next.focus(); }
    }
  });
  results.addEventListener('click', event => {
    const button = event.target.closest('[data-related-id]');
    if (!button) return;
    const selected = works.find(w => w.id === button.dataset.relatedId);
    if (!selected || new Set(exclude()).has(selected.id)) return;
    input.value = '';
    hide();
    onPick(selected);
  });

  status.textContent = works.length
    ? `${works.length} obras visibles. Escribe y pulsa una obra de los resultados para añadirla.`
    : 'No hay obras visibles para enlazar.';
  return {
    refresh: () => { if (!results.hidden) draw(); },
    destroy: hide
  };
}

// Compara registros JSONB independientemente del orden interno de sus claves.
export function sameRelatedWorks(saved, requested) {
  if (!Array.isArray(saved) || !Array.isArray(requested)) return false;
  const key = value => value.map(item => [String(item?.id || ''), String(item?.kind || '')]);
  return JSON.stringify(key(saved)) === JSON.stringify(key(requested));
}

export async function saveWorkWithRelations(sb, seriesId, teamId, patch) {
  const expected = patch.relations;
  if (!Array.isArray(expected) || expected.length > 12 ||
      expected.some(r => !r?.id || !r?.kind) ||
      new Set(expected.map(r => r.id)).size !== expected.length) {
    throw new Error('La lista de obras relacionadas no es válida');
  }
  const { data: saved, error } = await sb.from('series').update(patch)
    .eq('id', seriesId).eq('team_id', teamId).select('id,title,relations').maybeSingle();
  if (error) throw new Error(error.message || String(error));
  if (!saved?.id) throw new Error('No se guardaron los datos: comprueba los permisos del equipo');
  if (!sameRelatedWorks(saved.relations, expected)) {
    throw new Error('El servidor no confirmó las relaciones. No abandones esta página.');
  }
  const { data: verified, error: verifyError } = await sb.from('series')
    .select('id,relations').eq('id', seriesId).eq('team_id', teamId).maybeSingle();
  if (verifyError) throw new Error('No se pudo comprobar el guardado: ' + (verifyError.message || String(verifyError)));
  if (!verified?.id || !sameRelatedWorks(verified.relations, expected)) {
    throw new Error('Las relaciones no permanecieron guardadas. Conserva los cambios y vuelve a intentarlo.');
  }
  return verified;
}

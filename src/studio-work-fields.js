import { relatedSearchHTML, mountRelatedSearch } from './studio-related-works.js?v=1';
// Catálogo y ficha común para la creación manual e importación de obras.
// Solo HTML/CSS/JavaScript nativo. Se conservan los valores ya publicados.
export const WORK_GENRES = [
  'Academia','Acción','Alquimia','Apocalíptico','Artes marciales','Aventura','Aventura espacial',
  'Boys Love','Ciencia ficción','Chicas mágicas','Comedia','Comedia romántica','Cultivo',
  'Cyberpunk','Deportes','Detectives','Demonios','Distopía','Drama','Dungeon','Ecchi',
  'Economía','Escolar','Espionaje','Familia','Fantasía','Fantasía oscura','Fantasía urbana',
  'Gastronomía','Gender bender','Girls Love','Gótico','Harem','Harem inverso','Histórico',
  'Horror','Horror cósmico','Idols','Isekai','Intriga política','Juegos','LitRPG','Magia',
  'Mecha','Militar','Misterio','Misterio sobrenatural','Mitología','Música','Nobleza',
  'Otome','Policiaco','Política','Post-apocalíptico','Psicológico','Realidad virtual',
  'Recuentos de la vida','Reencarnación','Regresión temporal','Romance','Romance de oficina',
  'Romance histórico','Sátira','Sobrenatural','Steampunk','Superpoderes','Supervivencia',
  'Suspenso','Terror','Thriller','Tragedia','Vampiros','Viajes en el tiempo','Villana',
  'Wuxia','Xianxia','Yaoi','Yuri'
];
export const WORK_DEMOGRAPHICS = [
  ['', 'Sin asignar', 'El público editorial no está confirmado.'],
  ['Kodomo', 'Kodomo', 'Obras orientadas principalmente al público infantil.'],
  ['Shōnen', 'Shōnen', 'Publicaciones dirigidas habitualmente a adolescentes varones; no limita quién puede leerlas.'],
  ['Shōjo', 'Shōjo', 'Publicaciones dirigidas habitualmente a adolescentes mujeres; no determina el género narrativo.'],
  ['Seinen', 'Seinen', 'Obras orientadas editorialmente a hombres adultos; no implica contenido +18.'],
  ['Josei', 'Josei', 'Obras orientadas editorialmente a mujeres adultas; no implica contenido +18.'],
  ['Juvenil', 'Juvenil general', 'Obras juveniles que no se adscriben a una demografía japonesa concreta.'],
  ['Young Adult', 'Young Adult', 'Ficción dirigida principalmente a lectores adolescentes y adultos jóvenes.'],
  ['New Adult', 'New Adult', 'Ficción centrada en transiciones propias del inicio de la vida adulta.'],
  ['General', 'Público general', 'Obras sin un segmento editorial de edad o género específico.']
];
export const WORK_REL_KINDS = [
  ['precuela','Precuela'],['secuela','Secuela'],['spinoff','Spin-off'],
  ['universo','Mismo universo'],['paralela','Historia paralela'],
  ['adaptacion','Adaptación'],['alterna','Versión alternativa'],['otra','Relacionada']
];
export const WORK_TYPES = ['Novela ligera','Novela web','Obra original'];
export const WORK_TRANSLATIONS = [
  ['active','En traducción'],['paused','En pausa'],['completed','Completada'],
  ['abandoned','Abandonada'],['withdrawn','Retirada']
];
export const WORK_ORIGINAL_STATES = [
  ['','Sin asignar'],['publishing','En publicación'],
  ['completed','Completada'],['paused','En pausa'],['cancelled','Cancelada']
];

export function createWorkData(seed = {}) {
  return {
    title: '', short: '', original: '', title_romaji: '', author: '', illustrator: '',
    publisher: '', work_type: WORK_TYPES[0], demographic: '',
    translation_status: 'active', original_status: '', synopsis: '', adult: false,
    genres: [], tags: [], relations: [], ...seed,
    genres: [...(seed.genres || [])], tags: [...(seed.tags || [])],
    relations: [...(seed.relations || [])]
  };
}
export function workPayload(data) {
  const title = String(data.title || '').trim();
  if (title.length > 500) throw new Error('El título no puede superar los 500 caracteres');
  if (!title) throw new Error('Escribe el título de la obra');
  if ((data.genres || []).length > 4) throw new Error('Máximo 4 géneros');
  if ((data.tags || []).length > 20) throw new Error('Máximo 20 etiquetas');
  if ((data.relations || []).length > 12) throw new Error('Máximo 12 obras relacionadas');
  const val = (k, limit) => String(data[k] || '').trim().slice(0,limit) || null;
  return {
    title, short: val('short',26) || title.slice(0,26),
    original: val('original',300), title_romaji: val('title_romaji',300),
    author: val('author',120), illustrator: val('illustrator',120),
    publisher: val('publisher',120),
    work_type: WORK_TYPES.includes(data.work_type) ? data.work_type : WORK_TYPES[0],
    demographic: WORK_DEMOGRAPHICS.some(x => x[0] === data.demographic) ? (data.demographic || null) : null,
    translation_status: WORK_TRANSLATIONS.some(x => x[0] === data.translation_status) ? data.translation_status : 'active',
    original_status: WORK_ORIGINAL_STATES.some(x => x[0] === data.original_status) ? (data.original_status || null) : null,
    synopsis: val('synopsis',1500), adult: !!data.adult,
    genres: [...new Set(data.genres || [])].slice(0,4),
    tags: [...new Set((data.tags || []).map(x => String(x).trim().replace(/^#/,'').toLowerCase()).filter(Boolean))].slice(0,20),
    relations: (data.relations || []).slice(0,12).map(x => ({ id: x.id, kind: WORK_REL_KINDS.some(k => k[0] === x.kind) ? x.kind : 'otra' }))
  };
}

export function renderWorkFields(data, esc, related = []) {
  const input = (key,label,max=200) => '<label class="wf-field">' + label + '<input data-w="' + key + '"' + (key === 'title' ? ' id="nw-title"' : '') + ' maxlength="' + max + '" value="' + esc(data[key] || '') + '"></label>';
  const select = (key,label,options) => '<label class="wf-field">' + label +
    '<select data-w="' + key + '">' + options.map(([v,l]) =>
      '<option value="' + esc(v) + '"' + (data[key] === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>';
  const dem = WORK_DEMOGRAPHICS.find(x => x[0] === data.demographic) || WORK_DEMOGRAPHICS[0];
  return '<div class="wf-form">' +
    '<section class="wk-box wf-section"><h2>Ficha editorial</h2>' +
    input('title','Título en español *',500) + input('short','Título corto (cinta y lomo)',26) +
    input('original','Título original',300) + input('title_romaji','Lectura / rōmaji del título',300) +
    '<div class="wf-two">' + input('author','Autor',120) + input('illustrator','Ilustración',120) + input('publisher','Editorial',120) +
    select('work_type','Tipo',WORK_TYPES.map(x => [x,x])) + '</div>' +
    '<label class="wf-field">Sinopsis <span class="mono">Máximo 1500 caracteres</span><textarea rows="5" maxlength="1500" data-w="synopsis">' + esc(data.synopsis || '') + '</textarea></label></section>' +
    '<section class="wk-box wf-section"><h2>Clasificación</h2>' +
    select('demographic','Demografía',WORK_DEMOGRAPHICS.map(x => [x[0],x[1]])) +
    '<small class="mono" data-w-dem-desc>' + esc(dem[2]) + '</small>' +
    '<p class="mono wf-help">La demografía describe el público editorial, no establece restricciones de edad.</p>' +
    '<label class="wf-field">Buscar género<input type="search" data-w-genre-search placeholder="Filtrar géneros disponibles…" autocomplete="off"></label>' +
    '<div class="ed-chips wf-genres" data-w-genres>' +
    [...new Set([...WORK_GENRES,...(data.genres || [])])].map(g => '<button type="button" data-w-genre="' + esc(g) + '" class="ed-chip' + ((data.genres || []).includes(g) ? ' on' : '') + '" aria-pressed="' + (data.genres || []).includes(g) + '">' + esc(g) + '</button>').join('') +
    '</div><small class="mono" data-w-gen-count>' + (data.genres || []).length + ' de 4 géneros seleccionados</small>' +
    '<label class="wf-field">Etiquetas (separadas por comas)<input data-w-tags maxlength="700" placeholder="sirvienta, nobleza, magia" value="' + esc((data.tags || []).join(', ')) + '"></label>' +
    '<small class="mono">Hasta 20 etiquetas. Los géneros se utilizan en los filtros del Catálogo.</small></section>' +
    '<section class="wk-box wf-section"><h2>Estados y publicación</h2>' +
    select('translation_status','Estado de traducción',WORK_TRANSLATIONS) +
    select('original_status','Estado de la obra original',WORK_ORIGINAL_STATES) +
    '<label class="tb-inl wf-adult"><input type="checkbox" data-w="adult"' + (data.adult ? ' checked' : '') + '> Contenido +18 (requiere confirmación al lector)</label>' +
    '<small class="mono">La obra nueva permanece privada hasta que se publique por los canales existentes.</small></section>' +
    '<section class="wk-box wf-section"><h2>Obras relacionadas</h2>' +
    '<p class="mono wf-help">Opcional. Puedes enlazar precuelas, secuelas, adaptaciones y obras de otros equipos disponibles en el catálogo.</p>' +
    '<div data-w-rel-list></div>' +
    '<div class="wf-rel-controls"><label class="srp-kind">Tipo de relación<select data-w-rel-kind aria-label="Tipo de relación">' +
    WORK_REL_KINDS.map(([v,l]) => '<option value="' + v + '">' + l + '</option>').join('') +
    '</select></label>' + relatedSearchHTML('wf-related-search') + '</div>' +
    '<small class="mono">' + (related.length ? 'Hasta 12 obras relacionadas.' : 'No hay obras disponibles para enlazar. Puedes hacerlo más adelante.') + '</small></section>' +
    '</div>';
}
export function bindWorkFields(root, state, esc, related = [], notify = () => {}) {
  if (!root) return;
  root.querySelectorAll('[data-w]').forEach(el => {
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
      state[el.dataset.w] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.w === 'demographic') root.querySelector('[data-w-dem-desc]').textContent =
        (WORK_DEMOGRAPHICS.find(x => x[0] === el.value) || WORK_DEMOGRAPHICS[0])[2];
      notify();
    });
  });
  root.querySelector('[data-w-tags]')?.addEventListener('input', e => {
    state.tags = [...new Set(e.target.value.split(',').map(x => x.trim().replace(/^#/,'').toLowerCase()).filter(Boolean))].slice(0,20);
    notify();
  });
  root.querySelector('[data-w-genre-search]')?.addEventListener('input', e => {
    const q = e.target.value.toLocaleLowerCase('es');
    root.querySelectorAll('[data-w-genre]').forEach(b => {
      b.hidden = !!q && !b.dataset.wGenre.toLocaleLowerCase('es').includes(q) && !b.classList.contains('on');
    });
  });
  root.querySelector('[data-w-genres]')?.addEventListener('click', e => {
    const b = e.target.closest('[data-w-genre]'); if (!b) return;
    const g = b.dataset.wGenre, has = state.genres.includes(g);
    if (!has && state.genres.length >= 4) { notify('Máximo 4 géneros'); return; }
    state.genres = has ? state.genres.filter(x => x !== g) : [...state.genres,g];
    b.classList.toggle('on', !has); b.setAttribute('aria-pressed', String(!has));
    root.querySelector('[data-w-gen-count]').textContent = state.genres.length + ' de 4 géneros seleccionados';
    notify();
  });
  let picker;
  const redraw = () => {
    const list = root.querySelector('[data-w-rel-list]');
    if (!list) return;
    list.innerHTML = (state.relations || []).map((r,i) => {
      const x = related.find(x => x.id === r.id);
      return '<div class="wf-rel-item"><span>' + esc(x?.title || 'Obra seleccionada') +
        '</span><select data-w-rel-kind-i="' + i + '" aria-label="Tipo de relación">' +
        WORK_REL_KINDS.map(([v,l]) => '<option value="' + v + '"' + (r.kind === v ? ' selected' : '') + '>' + l + '</option>').join('') +
        '</select><button class="lnk danger" type="button" data-w-rel-remove="' + i + '">Quitar</button></div>';
    }).join('') || '<p class="mono">Todavía no hay obras relacionadas.</p>';
    picker?.refresh();
  };
  const list = root.querySelector('[data-w-rel-list]');
  list?.addEventListener('click', e => { const b = e.target.closest('[data-w-rel-remove]'); if (!b) return; state.relations.splice(+b.dataset.wRelRemove,1); redraw(); notify(); });
  list?.addEventListener('change', e => { const el = e.target.closest('[data-w-rel-kind-i]'); if (!el) return; state.relations[+el.dataset.wRelKindI].kind = el.value; notify(); });
  picker = mountRelatedSearch(root.querySelector('[data-related-search]'), {
    works: related,
    exclude: () => (state.relations || []).map(r => r.id),
    esc,
    onPick: work => {
      if (state.relations.length >= 12) return notify('Máximo 12 obras relacionadas');
      if (state.relations.some(r => r.id === work.id)) return;
      state.relations.push({ id: work.id, kind: root.querySelector('[data-w-rel-kind]').value });
      redraw();
      notify();
    }
  });
  redraw();
}

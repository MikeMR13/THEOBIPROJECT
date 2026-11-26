// Estudio · Glosario (diferido para no inflar studio.js). Tipos agrupados, tipo propio, fichas de personaje y datos sin spoilers.
// Tipos del glosario agrupados. «Otra…» deja escribir un tipo propio (máx. 30 caracteres).
export const GT_GROUPS = [
  ['Personas', ['Personaje', 'Apodo o alias', 'Familia o clan', 'Raza o especie', 'Deidad', 'Espíritu o familiar']],
  ['Lugares', ['Lugar', 'Reino o país', 'Ciudad o pueblo', 'Región', 'Escuela o academia', 'Edificio', 'Mazmorra']],
  ['Grupos y rangos', ['Organización', 'Gremio', 'Party o grupo', 'Cargo o título', 'Título nobiliario', 'Rango', 'Honorífico']],
  ['Magia y combate', ['Magia', 'Hechizo', 'Habilidad', 'Técnica', 'Elemento', 'Sistema o estadística', 'Arma', 'Armadura', 'Objeto', 'Artefacto', 'Poción', 'Criatura', 'Monstruo']],
  ['Vida diaria', ['Comida', 'Bebida', 'Planta', 'Ropa', 'Costumbre', 'Festival', 'Moneda', 'Unidad de medida', 'Calendario o fecha', 'Vehículo']],
  ['Lenguaje y cultura', ['Modismo', 'Onomatopeya', 'Juego de palabras', 'Idioma', 'Referencia cultural', 'Meme o internet', 'Videojuego', 'Anime o manga', 'Tabú']],
  ['Otros', ['Evento', 'Término técnico', 'Otro']]];
export const GT = GT_GROUPS.flatMap(g => g[1]);

export async function glossaryPage(C, slug){
  const { sb, app, $, esc, toast, go, T, shell, bindPicker, can, busy, confirmObi, media, errMsg } = C, glossary = C.reload;
    const TAB = '/estudio/glosario';
    const { data: works } = await sb.from('series').select('id,slug,title').eq('team_id', T.team.id).is('archived_at', null).order('title');
    if (!(works || []).length) { app.innerHTML = shell('Glosario', '<p class="mono">Este equipo aún no tiene obras.</p>', TAB); bindPicker(() => glossary()); return; }
    const s = works.find(w => w.slug === slug) || works.find(w => w.slug === localStorage.getItem('obi-gl-series')) || works[0];
    localStorage.setItem('obi-gl-series', s.slug);
    // since_num / updates (glosario sin spoilers) existen tras la migración 20261124; sin ella el formulario oculta esos campos
    // role / portrait_path (fichas de personaje) existen tras la migración 20261126; sin ella se oculta «Papel» y «Retrato»
    const COLS = 'id,term,category,definition,since_num,updates', CCOLS = COLS + ',role,portrait_path';
    let { data, error } = await sb.from('glossary_terms').select(CCOLS).eq('series_id', s.id).order('term');
    const chars = !error; if (error) ({ data, error } = await sb.from('glossary_terms').select(COLS).eq('series_id', s.id).order('term'));
    const rich = !error; if (error) ({ data, error } = await sb.from('glossary_terms').select('id,term,category,definition').eq('series_id', s.id).order('term'));
    const SEL = chars ? CCOLS : rich ? COLS : 'id,term,category,definition';
    const upsTxt = t => (Array.isArray(t.updates) ? t.updates : []).map(u => u.from + ' | ' + u.text).join('\n');
    const parseUps = txt => { const out = []; txt.split('\n').map(l => l.trim()).filter(Boolean).forEach((l, i) => { const m = l.match(/^(?:cap(?:ítulo|itulo)?\.?\s*)?(\d+)\s*[|:·-]\s*(.+)$/i); if (!m) throw new Error('Línea ' + (i + 1) + ' de «se revela después»: usa «capítulo | dato»'); if (m[2].length > 300) throw new Error('Línea ' + (i + 1) + ': máximo 300 caracteres'); out.push({ from: +m[1], text: m[2].trim() }); }); if (out.length > 30) throw new Error('Máximo 30 datos por término'); return out.sort((a, b) => a.from - b.from); };
    const sinceVal = () => { const v = ($('#glsince')?.value || '').trim(); if (!v) return null; const n = +v; if (!Number.isInteger(n) || n < 0) throw new Error('«Visible desde» debe ser un número de capítulo'); return n; };
    const extra = () => rich ? { since_num: sinceVal(), updates: parseUps($('#glups').value) } : {};
    if (error) { app.innerHTML = shell('Glosario', `<p>No se pudo cargar el glosario: ${esc(error.message)}</p>`, TAB); return; }
    let terms = data || [], editing = null;
    const own = () => [...new Set(terms.map(t => t.category).filter(c => c && !GT.includes(c)))].sort((a, b) => a.localeCompare(b, 'es'));
    const ed = can('edit'), opt = v => (own().length ? `<optgroup label="Usados en esta obra">${own().map(t => `<option ${t === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</optgroup>` : '') + GT_GROUPS.map(([g, L]) => `<optgroup label="${g}">${L.map(t => `<option ${t === v ? 'selected' : ''}>${t}</option>`).join('')}</optgroup>`).join('') + '<option value="__otra">Otra… (escribir)</option>';
    app.innerHTML = shell('Glosario', `
      <div class="st-row"><select id="glser" aria-label="Obra del glosario">${works.map(w => `<option value="${w.slug}" ${w.id === s.id ? 'selected' : ''}>${esc(w.title)}</option>`).join('')}</select><span class="mono" id="glcount"></span></div>
      <p class="mono">Los términos se marcan solos en el lector. Al tocarlos, el lector ve la definición sin salir del capítulo.</p>
      ${ed ? `<div class="st-card gl-form">
        <div class="st-row"><label class="st-field-caption">Término<input id="glterm" aria-label="Término" maxlength="60" placeholder="Término tal como aparece en el texto"></label><select id="glcat" aria-label="Categoría del término">${opt('Personaje')}</select><input id="glcatc" maxlength="30" placeholder="Escribe el tipo" aria-label="Tipo propio" hidden></div>
        <label class="st-field-caption">Definición<textarea id="gldef" aria-label="Definición del término" maxlength="600" rows="3" placeholder="Definición que verá el lector"></textarea></label>
        ${chars ? `<div class="st-row" id="glchar"><label class="st-field-caption">Papel<input id="glrole" maxlength="60" placeholder="Opcional: protagonista, rival…"></label><label class="btn ghost" style="cursor:pointer">Retrato<input type="file" id="glpor" accept="image/jpeg,image/png,image/webp" hidden></label><span class="mono" id="glporst"></span><button class="lnk danger" id="glporx" hidden>Quitar retrato</button></div>` : ''}
        ${rich ? `<details class="gl-spoil"><summary class="mono">Sin spoilers: cuándo se revela</summary>
          <p class="mono">Como el X-Ray de Kindle: el lector solo ve lo que ya se contó hasta el capítulo donde va.</p>
          <label class="mono">Marcar en el texto desde el capítulo <input id="glsince" type="number" min="0" step="1" inputmode="numeric" placeholder="vacío = siempre" style="width:9em"></label>
          <textarea id="glups" rows="3" placeholder="Datos que se revelan después, uno por línea: capítulo | dato&#10;5 | Hizo una promesa frente al faro.&#10;9 | Su verdadero apellido es Kurosawa."></textarea></details>` : ''}
        <div class="st-row"><button class="btn" id="glsave">Añadir término</button><button class="btn ghost" id="glcancel" hidden>Cancelar</button></div>
        <details><summary class="mono">Añadir varios a la vez</summary><p class="mono">Uno por línea: término | tipo | definición</p><textarea id="glbulk" aria-label="Lista de términos para importar" rows="5" placeholder="umeboshi | Comida | Ciruela encurtida en sal, muy ácida."></textarea><button class="btn ghost" id="glbulkbtn">Añadir lista</button></details>
      </div>` : '<p class="mono">Tu rol solo puede ver el glosario.</p>'}
      <div class="st-row"><input id="glq" aria-label="Buscar término o definición" placeholder="Buscar término o definición"><select id="glf" aria-label="Filtrar por tipo de término"><option value="">Todos los tipos</option></select></div>
      <div id="gllist"></div>`, TAB);
    bindPicker(() => glossary());
    $('#glser').onchange = e => go(TAB + '/' + e.target.value);
    const draw = () => {
      const f = $('#glf').value, cats = [...new Set(terms.map(t => t.category))].sort((a, b) => a.localeCompare(b, 'es'));
      $('#glf').innerHTML = '<option value="">Todos los tipos</option>' + cats.map(t => `<option ${t === f ? 'selected' : ''}>${esc(t)}</option>`).join('');
      const q = ($('#glq').value || '').trim().toLowerCase();
      const list = terms.filter(t => (!f || t.category === f) && (!q || (t.term + ' ' + t.definition).toLowerCase().includes(q)));
      $('#glcount').textContent = terms.length + (terms.length === 1 ? ' término' : ' términos');
      $('#gllist').innerHTML = list.map(t => `<div class="st-card gl-row"><div>${t.portrait_path ? `<img src="${esc(media(t.portrait_path))}" alt="" style="width:40px;aspect-ratio:3/4;object-fit:cover;float:left;margin:0 12px 6px 0">` : ''}<strong>${esc(t.term)}</strong> <span class="pill">${esc(t.category)}</span>${t.role ? ` <span class="mono">${esc(t.role)}</span>` : ''}${t.since_num != null ? ` <span class="pill">desde cap. ${esc(t.since_num)}</span>` : ''}${t.updates?.length ? ` <span class="pill">${t.updates.length} ${t.updates.length === 1 ? 'dato' : 'datos'} por capítulo</span>` : ''}<p>${esc(t.definition)}</p></div>${ed ? `<span><button class="lnk" data-gled="${t.id}">Editar</button> <button class="lnk danger" data-gldel="${t.id}">Borrar</button></span>` : ''}</div>`).join('') || `<p class="mono">${terms.length ? 'Sin resultados.' : 'Aún no hay términos en esta obra.'}</p>`;
    };
    let por = null; const porUI = () => { const v = $('#glcat')?.value, cu = v === '__otra'; if ($('#glcatc')) { $('#glcatc').hidden = !cu; if (cu) $('#glcatc').focus(); } if (!chars || !$('#glchar')) return; $('#glchar').hidden = v !== 'Personaje'; $('#glporst').textContent = por ? 'Retrato listo' : ''; $('#glporx').hidden = !por; };
    const reset = () => { editing = null; por = null; $('#glcat').innerHTML = opt('Personaje'); $('#glcatc').value = ''; if (chars) $('#glrole').value = ''; porUI(); $('#glterm').value = ''; $('#gldef').value = ''; if (rich) { $('#glsince').value = ''; $('#glups').value = ''; } $('#glsave').textContent = 'Añadir término'; $('#glcancel').hidden = true; };
    const check = (term, def) => { if (!term) throw new Error('Escribe el término'); if (!def) throw new Error('Escribe la definición'); if (term.length > 60) throw new Error('El término es demasiado largo (máx. 60)'); if (def.length > 600) throw new Error('La definición es demasiado larga (máx. 600)'); if (terms.some(t => t.id !== editing && t.term.toLowerCase() === term.toLowerCase())) throw new Error('«' + term + '» ya está en el glosario de esta obra'); };
    const dupe = e => { if (e?.code === '23505') throw new Error('Ese término ya existe en esta obra'); if (e) throw e; };
    $('#glq').oninput = draw; $('#glf').onchange = draw; draw();
    if (!ed) return;
    $('#glcat').onchange = porUI; porUI();
    if (chars) {
      $('#glpor').onchange = e => busy($('#glsave'), async () => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > 2e6) throw new Error('El retrato pesa más de 2 MB');
        $('#glporst').textContent = 'Subiendo…'; const path = `${T.team.id}/glosario/${s.id}/${Date.now()}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
        const { error } = await sb.storage.from('obi-media').upload(path, f, { contentType: f.type, cacheControl: '31536000' }); if (error) { $('#glporst').textContent = ''; throw new Error(errMsg(error)); } por = path; porUI(); });
      $('#glporx').onclick = () => { por = null; porUI(); };
    }
    $('#glsave').onclick = () => busy($('#glsave'), async () => {
      const term = $('#glterm').value.trim(), definition = $('#gldef').value.trim(); check(term, definition);
      const category = $('#glcat').value === '__otra' ? $('#glcatc').value.trim().replace(/\s+/g, ' ').slice(0, 30) : $('#glcat').value; if (!category) throw new Error('Escribe el tipo o elige uno de la lista');
      const isC = category === 'Personaje', more = { ...extra(), ...(chars ? { role: isC ? ($('#glrole').value.trim().slice(0, 60) || null) : null, portrait_path: isC ? por : null } : {}) };
      // updated_at solo existe tras la migración 20261124 (antes, editar un término fallaba por esa columna)
      if (editing) { const { data: r, error } = await sb.from('glossary_terms').update({ term, category, definition, ...more, ...(rich ? { updated_at: new Date().toISOString() } : {}) }).eq('id', editing).select(SEL).single(); dupe(error); terms = terms.map(t => t.id === editing ? r : t); toast('Término actualizado'); }
      else { const { data: r, error } = await sb.from('glossary_terms').insert({ series_id: s.id, term, category, definition, ...more }).select(SEL).single(); dupe(error); terms.push(r); toast('«' + term + '» añadido'); }
      terms.sort((a, b) => a.term.localeCompare(b.term, 'es')); reset(); draw();
    });
    $('#glcancel').onclick = reset;
    $('#glbulkbtn').onclick = () => busy($('#glbulkbtn'), async () => {
      const rows = $('#glbulk').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r[0]);
      if (!rows.length) throw new Error('Pega al menos una línea');
      const have = new Set(terms.map(t => t.term.toLowerCase())), add = [], bad = [];
      rows.forEach((r, i) => { const [term, cat, ...rest] = r, definition = rest.join(' | '); const category = GT.find(g => g.toLowerCase() === (cat || '').toLowerCase()) || (cat || '').trim().slice(0, 30) || 'Otro';
        if (!definition || term.length > 60 || definition.length > 600 || have.has(term.toLowerCase())) bad.push(i + 1); else { have.add(term.toLowerCase()); add.push({ series_id: s.id, term, category, definition }); } });
      if (!add.length) throw new Error('Ninguna línea válida. Revisa las líneas ' + bad.join(', '));
      const { data: r, error } = await sb.from('glossary_terms').insert(add).select(SEL); dupe(error);
      terms = [...terms, ...r].sort((a, b) => a.term.localeCompare(b.term, 'es')); $('#glbulk').value = '';
      toast(r.length + ' términos añadidos' + (bad.length ? ' · se omitieron las líneas ' + bad.join(', ') + ' (repetidas o incompletas)' : '')); draw();
    });
    $('#gllist').onclick = e => {
      const eb = e.target.closest('[data-gled]'), db = e.target.closest('[data-gldel]');
      if (eb) { const t = terms.find(x => x.id === eb.dataset.gled); editing = t.id; $('#glterm').value = t.term; $('#glcat').innerHTML = opt(t.category); $('#gldef').value = t.definition; if (chars) { $('#glrole').value = t.role || ''; por = t.portrait_path || null; } porUI(); if (rich) { $('#glsince').value = t.since_num ?? ''; $('#glups').value = upsTxt(t); if (t.since_num != null || t.updates?.length) $('.gl-spoil').open = true; } $('#glsave').textContent = 'Guardar cambios'; $('#glcancel').hidden = false; $('#glterm').focus(); scrollTo(0, 0); }
      if (db) busy(db, async () => { const t = terms.find(x => x.id === db.dataset.gldel); if (!await confirmObi('¿Borrar «' + t.term + '» del glosario?')) return; const { error } = await sb.from('glossary_terms').delete().eq('id', t.id); if (error) throw error; terms = terms.filter(x => x.id !== t.id); if (editing === t.id) reset(); toast('Término borrado'); draw(); });
    };
}

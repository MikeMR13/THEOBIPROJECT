// Biblioteca personal: estado manual por obra (con nota), estanterías propias y listas públicas.
// Tablas: shelves (estado), collections + collection_items + collection_saves (estanterías y listas).
export const STATES = [['reading', 'Leyendo'], ['plan', 'Pendiente'], ['done', 'Terminada'], ['hold', 'En pausa'], ['drop', 'Abandonada']];
const KIND = { shelf: ['Estantería', 'Estanterías'], list: ['Lista', 'Listas'] };

const CSS = `
.cl-box{display:grid;gap:10px;padding:14px;border:1px solid var(--line,#2f2a20);background:#16140f;max-width:720px;margin:14px 0 0}
.cl-box h3{margin:0;font-size:16px}.cl-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cl-box select,.cl-box textarea,.cl-box input[type=text],.cl-form input,.cl-form textarea{background:#0d0c0a;border:1px solid #3d3628;color:var(--paper);padding:8px 10px;font:inherit;font-size:16px;min-height:44px}
.cl-box textarea,.cl-form textarea{width:100%;min-height:64px;resize:vertical}
.cl-chk{display:flex;flex-wrap:wrap;gap:6px}.cl-chk label{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 10px;border:1px solid #3d3628;cursor:pointer;font-size:14px}.cl-chk label:has(input:checked){border-color:var(--gold);color:var(--gold)}
.cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:14px}
.cl-card{display:grid;gap:6px;padding:12px;border:1px solid #2f2a20;background:#16140f;color:var(--paper);text-decoration:none}.cl-card:hover{border-color:var(--gold);color:var(--paper)}
.cl-covs{display:flex;height:70px}.cl-covs i{width:50px;aspect-ratio:2/3;background:#1c1a14 center/cover;border:1px solid #3d3628}.cl-covs i+i{margin-left:-16px}
.cl-card small,.cl-meta{font:12px 'IBM Plex Mono',monospace;color:#a89f8a}
.cl-items{display:grid;max-width:820px}.cl-it{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #221f18}
.cl-it .cv{aspect-ratio:2/3;background:#1c1a14 center/cover;border:1px solid #2f2a20}.cl-it a{color:var(--paper);font-weight:600;text-decoration:none}.cl-it p{margin:4px 0 0;color:#cfc6b0;font-size:14px;line-height:1.5}
.cl-form{display:grid;gap:10px;max-width:620px;margin:0 0 20px}
.cl-empty{padding:24px;border:1px dashed #3d3628;color:#a89f8a;display:grid;gap:10px;justify-items:start}
@media(max-width:560px){.cl-it{grid-template-columns:48px minmax(0,1fr)}.cl-it>span:last-child{grid-column:2}}`;
const css = () => { if (document.getElementById('cl-css')) return; const s = document.createElement('style'); s.id = 'cl-css'; s.textContent = CSS; document.head.appendChild(s); };
const media = (url, p) => p ? (/^https?:/.test(p) ? p : url + '/storage/v1/object/public/obi-media/' + encodeURI(p)) : '';
const covers = (ctx, list) => `<span class="cl-covs">${(list || []).slice(0, 3).map(c => `<i style="${c.cover_thumb_path || c.cover_path ? `background-image:url('${ctx.esc(media(ctx.url, c.cover_thumb_path || c.cover_path))}')` : `background:linear-gradient(160deg,${ctx.esc(c.color || '#3a2e1f')},#16140f)`}"></i>`).join('') || '<i></i>'}</span>`;

// ---------- Ficha de la obra: estado, nota y «Añadir a…» ----------
export async function seriesBox(ctx, s, host){
  const { sb, esc, toast, go, getUser } = ctx, u = getUser(); if (!host) return; css();
  if (!u) { host.innerHTML = ''; return; }
  const [{ data: sh }, { data: cols0 }] = await Promise.all([
    sb.from('shelves').select('shelf,note').eq('user_id', u.id).eq('series_id', s.id).maybeSingle(),
    sb.from('collections').select('id,title,kind,is_public,collection_items(series_id)').eq('user_id', u.id).order('created_at')]);
  const cols = cols0 || [], mine = new Set(cols.filter(c => (c.collection_items || []).some(i => i.series_id === s.id)).map(c => c.id)); let st = sh?.shelf || '', note = sh?.note || '';
  const draw = () => { host.innerHTML = `<div class="cl-box"><h3>Mi biblioteca</h3>
    <div class="cl-row"><label class="mono" for="cl-st">Estado</label><select id="cl-st"><option value="">Automático</option>${STATES.map(([k, l]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="mono" id="cl-ok" aria-live="polite"></span></div>
    <textarea id="cl-note" maxlength="500" placeholder="Nota personal (solo tú la ves)" aria-label="Nota personal">${esc(note)}</textarea>
    <div><span class="mono">Añadir a</span><div class="cl-chk" style="margin-top:6px">${(cols || []).map(c => `<label><input type="checkbox" data-col="${c.id}" ${mine.has(c.id) ? 'checked' : ''}>${esc(c.title)} <small class="mono">${KIND[c.kind]?.[0] || 'Lista'}${c.is_public ? ' · pública' : ''}</small></label>`).join('') || '<span class="mono">Aún no tienes estanterías ni listas.</span>'}<button class="btn ghost" type="button" id="cl-new">+ Nueva</button></div></div></div>`;
    const ok = t => { const e = host.querySelector('#cl-ok'); if (e) { e.textContent = t; setTimeout(() => { if (e.textContent === t) e.textContent = ''; }, 2500); } };
    const save = async () => { const n = host.querySelector('#cl-note').value.trim().slice(0, 500);
      if (!st && !n) { const { error } = await sb.from('shelves').delete().eq('user_id', u.id).eq('series_id', s.id); if (error) return toast(error.message); note = ''; return ok('Guardado'); }
      if (!st) { toast('Elige un estado para guardar la nota'); return; }
      const { error } = await sb.from('shelves').upsert({ user_id: u.id, series_id: s.id, shelf: st, note: n || null, updated_at: new Date().toISOString() }); if (error) return toast(error.message); note = n; ok('Guardado'); };
    host.querySelector('#cl-st').onchange = e => { st = e.target.value; save(); };
    host.querySelector('#cl-note').onblur = e => { if (e.target.value.trim() !== note) save(); };
    host.querySelectorAll('[data-col]').forEach(i => i.onchange = async () => { const id = i.dataset.col;
      const { error } = i.checked ? await sb.from('collection_items').insert({ collection_id: id, series_id: s.id, sort: Date.now() % 1e9 }) : await sb.from('collection_items').delete().eq('collection_id', id).eq('series_id', s.id);
      if (error) { i.checked = !i.checked; return toast(error.message); } i.checked ? mine.add(id) : mine.delete(id); ok(i.checked ? 'Añadida' : 'Quitada'); });
    host.querySelector('#cl-new').onclick = () => newForm(ctx, host.querySelector('.cl-box'), async c => { await sb.from('collection_items').insert({ collection_id: c.id, series_id: s.id, sort: 0 }); cols.push(c); mine.add(c.id); draw(); toast('«' + c.title + '» creada con esta obra'); });
  };
  draw();
}

// Listas públicas en las que aparece la obra.
export async function seriesLists(ctx, s, host){
  const { sb, esc } = ctx; if (!host) return; css();
  const { data } = await sb.rpc('collections_public', { p_series: s.id, p_limit: 6 });
  const L = (data || []).filter(c => c.kind === 'list'); if (!L.length) { host.innerHTML = ''; return; }
  host.innerHTML = `<section><div class="ui-h2"><h2>Aparece en listas</h2></div><div class="cl-grid">${L.map(c => card(ctx, c)).join('')}</div></section>`;
}
const card = (ctx, c) => `<a class="cl-card" href="/lista/${ctx.esc(c.id)}">${covers(ctx, c.covers)}<b>${ctx.esc(c.title)}</b><small>${c.owner ? 'de ' + ctx.esc(c.owner) + ' · ' : ''}${+c.n} ${+c.n === 1 ? 'obra' : 'obras'}${c.kind === 'list' ? ' · ' + (+c.saves) + ' la guardaron' : c.is_public === false ? ' · privada' : ''}</small></a>`;

function newForm(ctx, host, done, kind = 'shelf'){
  const { sb, toast, getUser } = ctx; if (host.querySelector('.cl-form')) return;
  const f = document.createElement('form'); f.className = 'cl-form';
  f.innerHTML = `<input type="text" name="t" maxlength="80" required placeholder="Nombre: «Para el verano», «Isekai cortos para empezar»…" aria-label="Nombre"><div class="cl-row"><label class="ui-tog"><input type="radio" name="k" value="shelf" ${kind === 'shelf' ? 'checked' : ''}> Estantería (privada)</label><label class="ui-tog"><input type="radio" name="k" value="list" ${kind === 'list' ? 'checked' : ''}> Lista pública</label></div><textarea name="d" maxlength="400" placeholder="Descripción (opcional)"></textarea><div class="cl-row"><button class="btn">Crear</button><button class="btn ghost" type="button" data-x>Cancelar</button></div>`;
  host.append(f); f.t.focus();
  f.querySelector('[data-x]').onclick = () => f.remove();
  f.onsubmit = async e => { e.preventDefault(); const k = f.k.value, title = f.t.value.trim(); if (!title) return;
    const { data, error } = await sb.from('collections').insert({ user_id: getUser().id, title, description: f.d.value.trim() || null, kind: k, is_public: k === 'list' }).select('id,title,kind,is_public').single();
    if (error) return toast(error.message); f.remove(); done(data); };
}

// ---------- Mi biblioteca: pestañas «Estanterías» y «Listas» ----------
export async function libraryTab(ctx, kind, box){
  const { sb, esc, getUser } = ctx, u = getUser(); css();
  const [{ data: own }, { data: saved }] = await Promise.all([
    sb.from('collections').select('id,title,kind,is_public,collection_items(series_id,sort,series(cover_path,cover_thumb_path,theme))').eq('user_id', u.id).eq('kind', kind).order('created_at'),
    kind === 'list' ? sb.from('collection_saves').select('collection_id').eq('user_id', u.id) : { data: [] }]);
  let savedL = [];
  if ((saved || []).length) { const ids = saved.map(r => r.collection_id); const { data } = await sb.rpc('collections_public', { p_limit: 50 }); savedL = (data || []).filter(c => ids.includes(c.id)); }
  const mine = (own || []).map(c => ({ id: c.id, title: c.title, kind: c.kind, is_public: c.is_public, n: (c.collection_items || []).length,
    covers: (c.collection_items || []).sort((a, b) => a.sort - b.sort).map(i => ({ cover_path: i.series?.cover_path, cover_thumb_path: i.series?.cover_thumb_path, color: i.series?.theme?.color })) }));
  const hint = kind === 'shelf' ? 'Agrupa obras a tu manera. Son privadas salvo que las hagas públicas desde la estantería.' : 'Recomienda obras con una nota corta. Cualquiera puede verlas y guardarlas.';
  box.innerHTML = `<p class="mono" style="margin:0 0 14px;font-size:13px">${hint} Para añadir una obra, usa «Mi biblioteca» en su ficha.</p><div id="cl-newh"><button class="btn ghost" type="button" id="cl-new">+ Nueva ${KIND[kind][0].toLowerCase()}</button></div>
    ${mine.length ? `<div class="cl-grid" style="margin-top:16px">${mine.map(c => card(ctx, c)).join('')}</div>` : `<div class="cl-empty" style="margin-top:16px">Aún no tienes ${KIND[kind][1].toLowerCase()}.</div>`}
    ${savedL.length ? `<h2 style="margin:28px 0 12px;font-size:20px">Listas guardadas</h2><div class="cl-grid">${savedL.map(c => card(ctx, c)).join('')}</div>` : ''}`;
  box.querySelector('#cl-new').onclick = () => newForm(ctx, box.querySelector('#cl-newh'), c => ctx.go('/lista/' + c.id), kind);
}

// ---------- Página de una estantería o lista ----------
export async function page(ctx, id){
  const { sb, app, esc, toast, go, getUser, url } = ctx, u = getUser(); css();
  app.innerHTML = '<p class="mono">Cargando…</p>';
  const { data: c } = await sb.from('collections').select('id,user_id,title,description,kind,is_public,created_at,profiles(username),collection_items(series_id,sort,note,series(slug,title,cover_path,cover_thumb_path,theme,published))').eq('id', id).maybeSingle();
  if (!c) { app.innerHTML = '<h1>Esta lista no existe o es privada</h1><p><a href="/biblioteca">Volver a mi biblioteca</a></p>'; return; }
  const own = u && u.id === c.user_id, items = (c.collection_items || []).filter(i => i.series?.published || own).sort((a, b) => a.sort - b.sort);
  const [{ count: saves }, { data: mySave }] = await Promise.all([sb.from('collection_saves').select('user_id', { count: 'exact', head: true }).eq('collection_id', id),
    u && !own ? sb.from('collection_saves').select('user_id').eq('collection_id', id).eq('user_id', u.id) : { data: [] }]);
  let saved = !!(mySave || []).length, n = saves || 0;
  const draw = () => { app.innerHTML = `<div class="ui-cath"><div><h1>${esc(c.title)}</h1><p>${KIND[c.kind][0]}${c.profiles?.username ? ` de <a href="/lector/${encodeURIComponent(c.profiles.username)}">${esc(c.profiles.username)}</a>` : ''} · ${items.length} ${items.length === 1 ? 'obra' : 'obras'}${c.is_public ? ' · ' + n + (n === 1 ? ' la guardó' : ' la guardaron') : ' · privada'}</p></div><span class="kj" aria-hidden="true">${c.kind === 'list' ? '推薦' : '書架'}</span></div>
    ${c.description ? `<p style="max-width:68ch">${esc(c.description)}</p>` : ''}
    <div class="cl-row" style="margin:0 0 18px">${own ? `<button class="btn ghost" id="cl-edit">Editar</button><button class="btn ghost" id="cl-del">Borrar</button>` : u && c.is_public ? `<button class="btn${saved ? ' ghost' : ''}" id="cl-save">${saved ? '✓ Guardada' : 'Guardar lista'}</button>` : ''}${c.is_public ? `<button class="btn ghost" id="cl-share">Copiar enlace</button>` : ''}</div>
    <div id="cl-ed"></div>
    ${items.length ? `<div class="cl-items">${items.map(i => `<div class="cl-it"><span class="cv" style="${i.series.cover_path ? `background-image:url('${esc(media(url, i.series.cover_thumb_path || i.series.cover_path))}')` : ''}"></span><span><a href="/serie/${esc(i.series.slug)}">${esc(i.series.title)}</a>${own ? `<input type="text" data-note="${i.series_id}" maxlength="200" value="${esc(i.note || '')}" placeholder="Nota corta para esta obra" aria-label="Nota sobre ${esc(i.series.title)}" style="display:block;width:100%;margin-top:6px;background:#0d0c0a;border:1px solid #3d3628;color:var(--paper);padding:8px;font-size:15px">` : i.note ? `<p>«${esc(i.note)}»</p>` : ''}</span>${own ? `<span><button class="ui-lnk" data-up="${i.series_id}" aria-label="Subir">↑</button><button class="ui-lnk" data-rm="${i.series_id}">Quitar</button></span>` : '<span></span>'}</div>`).join('')}</div>`
      : `<div class="cl-empty">${own ? 'Esta ' + KIND[c.kind][0].toLowerCase() + ' está vacía. Abre la ficha de una obra y usa «Mi biblioteca» para añadirla.' : 'Esta lista está vacía.'}<a class="btn ghost" href="/catalogo">Explorar el catálogo</a></div>`}`;
    app.querySelector('#cl-share')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.origin + '/lista/' + c.id); toast('Enlace copiado'); } catch { toast(location.origin + '/lista/' + c.id); } });
    app.querySelector('#cl-save')?.addEventListener('click', async () => { const { error } = saved ? await sb.from('collection_saves').delete().eq('collection_id', id).eq('user_id', u.id) : await sb.from('collection_saves').insert({ collection_id: id, user_id: u.id }); if (error) return toast(error.message); saved = !saved; n += saved ? 1 : -1; toast(saved ? 'Lista guardada en tu biblioteca' : 'Ya no tienes guardada esta lista'); draw(); });
    if (!own) return;
    app.querySelector('#cl-del').onclick = async () => { if (!confirm('¿Borrar «' + c.title + '»? Las obras no se borran.')) return; const { error } = await sb.from('collections').delete().eq('id', id); if (error) return toast(error.message); toast('Borrada'); go('/biblioteca?t=' + (c.kind === 'list' ? 'listas' : 'estanterias')); };
    app.querySelector('#cl-edit').onclick = () => { const h = app.querySelector('#cl-ed'); if (h.firstChild) return h.replaceChildren();
      h.innerHTML = `<form class="cl-form"><input type="text" name="t" maxlength="80" required value="${esc(c.title)}" aria-label="Nombre"><textarea name="d" maxlength="400" placeholder="Descripción">${esc(c.description || '')}</textarea><label class="ui-tog"><input type="checkbox" name="p" ${c.is_public ? 'checked' : ''}> Pública: cualquiera con el enlace puede verla${c.kind === 'list' ? ' y aparece en las fichas de sus obras' : ''}</label><div class="cl-row"><button class="btn">Guardar</button></div></form>`;
      h.querySelector('form').onsubmit = async e => { e.preventDefault(); const f = e.target, v = { title: f.t.value.trim(), description: f.d.value.trim() || null, is_public: f.p.checked, updated_at: new Date().toISOString() };
        const { error } = await sb.from('collections').update(v).eq('id', id); if (error) return toast(error.message); Object.assign(c, v); toast('Guardado'); draw(); }; };
    app.querySelectorAll('[data-note]').forEach(i => i.onchange = async () => { const { error } = await sb.from('collection_items').update({ note: i.value.trim().slice(0, 200) || null }).eq('collection_id', id).eq('series_id', i.dataset.note); if (error) return toast(error.message); toast('Nota guardada'); });
    app.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { const { error } = await sb.from('collection_items').delete().eq('collection_id', id).eq('series_id', b.dataset.rm); if (error) return toast(error.message); c.collection_items = c.collection_items.filter(x => x.series_id !== b.dataset.rm); items.splice(items.findIndex(x => x.series_id === b.dataset.rm), 1); draw(); });
    app.querySelectorAll('[data-up]').forEach(b => b.onclick = async () => { const k = items.findIndex(x => x.series_id === b.dataset.up); if (k < 1) return; [items[k - 1], items[k]] = [items[k], items[k - 1]];
      const res = await Promise.all(items.map((x, j) => (x.sort = j, sb.from('collection_items').update({ sort: j }).eq('collection_id', id).eq('series_id', x.series_id)))); if (res.some(r => r.error)) toast('No se pudo guardar el orden'); draw(); });
  };
  draw();
}

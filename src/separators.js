// Separadores de imagen: detección compartida por el importador y por «Editar volumen › Separadores».
// Agrupa imágenes por contenido (SHA-256) y por diseño (dHash 64 bits) y puntúa si son adornos de escena.
// Nivel 'hi' (muy probable) se marca solo; 'md' (dudoso) lo decide el equipo.

export const SEP_NAME = /(^|[\W_])(sep|separator|separador|break|line|linea|l[ií]nea|orn|ornament|ornamento|divider|dinkus|kazari|deco|star|asterism|scene)/i;
export const SEP_FILE = /^sep-([0-9a-f]{8})-([0-9a-f]{16})\./;
export const sha256 = async buf => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
export const hamming = (a, b) => { let n = 0; for (let i = 0; i < 16; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { n += x & 1; x >>= 1; } } return n; };

// medidas y dHash (9×8 en gris sobre fondo blanco); url debe ser blob: o del mismo origen
export async function imgFacts(url){
  const im = new Image(); im.src = url; await im.decode();
  const w = im.naturalWidth || 0, h = im.naturalHeight || 0, c = document.createElement('canvas'); c.width = 9; c.height = 8;
  const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, 9, 8); x.drawImage(im, 0, 0, 9, 8);
  const d = x.getImageData(0, 0, 9, 8).data, g = i => d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114; let bits = '';
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) bits += g(r * 9 + k) > g(r * 9 + k + 1) ? '1' : '0';
  return { w, h, dh: bits.match(/.{4}/g).map(b => parseInt(b, 2).toString(16)).join('') };
}

// datos de una imagen a partir de su blob
export async function factsOf(blob){
  const u = URL.createObjectURL(blob); let f = { w: 0, h: 0, dh: null };
  try { f = await imgFacts(u); } catch {} finally { URL.revokeObjectURL(u); }
  return { ...f, size: blob.size, sha: await sha256(await blob.arrayBuffer()) };
}

// items: [{ k, name, size, sha, w, h, dh, uses, caps:Set, hint, cap, cover, isSep }]
export function groupSeps(items){
  const bySha = new Map(); for (const i of items) (bySha.get(i.sha) || bySha.set(i.sha, []).get(i.sha)).push(i);
  const groups = [...bySha.values()].map(it => ({ items: it, exact: it.length }));
  const agg = g => { const it = g.items, best = it.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)), caps = new Set(it.flatMap(i => [...i.caps])), ratio = best.h ? best.w / best.h : 0;
    return Object.assign(g, { best, ratio, uses: it.reduce((a, i) => a + i.uses, 0), caps: caps.size, capSet: caps, files: it.length, hint: it.some(i => i.hint), cap: it.some(i => i.cap), cover: it.some(i => i.cover), cur: it.some(i => i.isSep),
      name: it.some(i => SEP_NAME.test(i.name)), size: Math.min(...it.map(i => i.size)), wide: ratio >= 3 && best.h <= 300, small: Math.max(best.w, best.h) <= 300 && best.w > 0, big: best.h > 400 && ratio < 2.5 }); };
  groups.forEach(agg);
  // mismo diseño con otros bytes (recomprimido, otro formato o tamaño)
  const deco = g => g.wide || g.small || g.hint || g.name || g.cur;
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    const a = groups[i], b = groups[j]; if (!a.best.dh || !b.best.dh || !deco(a) || !deco(b)) continue;
    if (hamming(a.best.dh, b.best.dh) <= 5 && Math.abs(a.ratio - b.ratio) <= Math.max(a.ratio, b.ratio) * .15) { a.items.push(...b.items); a.near = (a.near || 0) + b.items.length; groups.splice(j--, 1); agg(a); }
  }
  groups.forEach((g, i) => {
    const rep = g.uses >= 3 || g.files >= 2, shape = g.wide || g.small, light = g.size <= 40 * 1024, no = g.cap || g.cover;
    const hi = !no && (g.hint || (rep && shape && !g.big) || (g.name && g.wide));
    const md = !no && !hi && ((shape && (g.uses >= 2 || g.name || light)) || (rep && !g.big) || (g.name && !g.big));
    const why = [];
    if (g.cur) why.push(['k', 'ya está marcada como separador']);
    if (g.hint) why.push(['k', 'clase de separador en el EPUB']);
    if (g.exact >= 2) why.push(['k', g.exact + ' archivos con el mismo contenido']);
    if (g.near) why.push(['k', g.near + ' con el mismo diseño (otro formato o tamaño)']);
    if (g.uses >= 3) why.push(['', 'usada ' + g.uses + ' veces']);
    if (g.wide) why.push(['', 'proporción ' + Math.round(g.ratio) + ':1']); else if (g.small) why.push(['', 'pequeña (' + Math.max(g.best.w, g.best.h) + ' px)']);
    if (light) why.push(['', Math.max(1, Math.round(g.size / 1024)) + ' KB']);
    if (g.name) why.push(['', 'nombre «' + g.items.find(x => SEP_NAME.test(x.name)).name + '»']);
    Object.assign(g, { id: 's' + i, level: hi ? 'hi' : md ? 'md' : null, cand: hi || md, on: hi, why, keys: g.items.map(x => x.k) });
  });
  return groups.sort((a, b) => b.uses - a.uses);
}

// une separadores seguidos (el mismo corte de escena no se repite)
export const collapseSeps = bs => bs.filter((b, i, a) => !(b.type === 'separator' && a[i - 1]?.type === 'separator'));

// archivo del separador en Multimedia › obras › {obra} › separadores, reutilizando uno igual (mismo SHA o dHash ≤ 5)
export async function putSep(sb, dir, best, blob, type, prev){
  const sha8 = best.sha.slice(0, 8), hit = prev.find(x => x.m[1] === sha8 || (best.dh && hamming(x.m[2], best.dh) <= 5));
  if (hit) return { path: dir + '/' + hit.name, uploaded: false };
  const ext = (best.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png', name = `sep-${sha8}-${best.dh || '0'.repeat(16)}.${ext}`, path = dir + '/' + name;
  const { error } = await sb.storage.from('obi-media').upload(path, blob, { contentType: type || blob.type || 'image/png', cacheControl: '31536000', upsert: false });
  if (error && !/exists|duplicate/i.test(error.message)) throw error;
  prev.push({ name, m: name.match(SEP_FILE) }); return { path, uploaded: !error };
}
export async function listSeps(sb, dir){
  const { data } = await sb.storage.from('obi-media').list(dir, { limit: 1000 });
  return (data || []).map(x => ({ name: x.name, m: x.name.match(SEP_FILE) })).filter(x => x.m);
}

// tarjetas del paso / panel (mismo HTML en importador y volumen)
export function groupCards(G, esc, thumb, sel){
  return G.map(g => `<div class="imp-sg${g.on ? ' on' : ''}${g === sel ? ' cur' : ''}" data-sg="${g.id}">
    <div class="th"><img src="${esc(thumb(g))}" alt=""></div>
    <div class="inf"><b>Usada ${g.uses} ${g.uses === 1 ? 'vez' : 'veces'} en ${g.caps} ${g.caps === 1 ? 'sección' : 'secciones'} <span class="imp-lvl ${g.cur || g.level === 'hi' ? 'hi' : 'md'}">· ${g.manual ? 'marcada a mano' : g.cur ? 'ya es separador' : g.level === 'hi' ? 'muy probable' : 'dudoso'}</span></b>
      <div class="why">${g.why.map(([k, w]) => `<span class="${k}">${esc(w)}</span>`).join('')}</div>
      <div class="var">${g.items.slice(0, 5).map(x => `<small class="${x === g.best ? 'best' : ''}">${esc(x.name)}</small>`).join('')}${g.items.length > 5 ? `<small>+ ${g.items.length - 5} más</small>` : ''}</div>
      <span class="mono">${g.files > 1 ? g.files + ' archivos con el mismo diseño · queda solo ' : 'Un archivo · '}${esc(g.best.name)}${g.best.w ? ' · ' + g.best.w + '×' + g.best.h : ''}</span></div>
    <div class="imp-seg" role="group" aria-label="Tipo de imagen"><button type="button" data-set="${g.id}" data-v="1" class="${g.on ? 'on' : ''}" aria-pressed="${g.on}">Separador</button><button type="button" data-set="${g.id}" data-v="0" class="${g.on ? '' : 'on'}" aria-pressed="${!g.on}">Ilustración</button></div></div>`).join('');
}

// ---------- «Editar volumen › Separadores»: revisar capítulos ya guardados ----------
export async function reviewVolume({ sb, esc, toast, busy, PUB, T, can, errMsg, box, series, volume, onClose }){
  const st = m => { const e = box.querySelector('#vsep-st'); if (e) e.textContent = m || ''; };
  box.hidden = false; box.innerHTML = `<div class="imp-box"><h3>Separadores · Volumen ${volume.num}</h3><p class="mono" id="vsep-st" role="status">Leyendo capítulos…</p></div>`;
  const { data: chs, error } = await sb.from('chapters').select('id,num,title,version,body').eq('volume_id', volume.id).is('deleted_at', null).order('sort_order').order('num');
  if (error) throw new Error(errMsg ? errMsg(error) : error.message);
  const refs = new Map();
  (chs || []).forEach((c, ci) => (Array.isArray(c.body) ? c.body : []).forEach(b => {
    const t = b?.type || b?.t, u = (t === 'image' || t === 'img') ? (b.url || b.src) : (t === 'separator' || t === 'sep') ? b.img : null; if (!u) return;
    const r = refs.get(u) || { uses: 0, caps: new Set(), cap: false, isSep: false }; r.uses++; r.caps.add(ci); r.cap ||= !!(b.caption || (b.alt || '').length > 40); r.isSep ||= !!b.img && t !== 'image'; refs.set(u, r); }));
  const items = [], blobs = new Map(); let n = 0;
  for (const [u, r] of refs) {
    st(`Analizando imágenes ${++n}/${refs.size}…`);
    if (!u.startsWith(PUB)) continue; // solo imágenes del Multimedia del equipo
    try { const res = await fetch(u); if (!res.ok) continue; const blob = await res.blob(); blobs.set(u, blob);
      items.push({ k: u, name: decodeURIComponent(u.split('/').pop().split('?')[0]), ...(await factsOf(blob)), ...r, hint: false, cover: !!volume.cover_path && u === PUB + volume.cover_path }); } catch {}
  }
  const all = groupSeps(items); all.forEach(g => { g.on = g.cur || g.level === 'hi'; });
  const G = all.filter(g => g.cand || g.cur), sdir = `${T.team.id}/obras/${series.slug}/separadores`;
  const draw = () => {
    const changed = G.filter(g => g.on !== g.cur), touched = new Set(changed.flatMap(g => [...g.capSet]));
    box.innerHTML = `<div class="imp-box" style="gap:12px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><h3>Separadores · Volumen ${volume.num}</h3><span class="mono">${(chs || []).length} capítulos · ${items.length} imágenes revisadas</span></div>
      ${G.length ? `<p class="mono">Agrupamos las imágenes por contenido, no por nombre. Los separadores se muestran a la altura de una línea de texto y quedan una sola vez en Multimedia › separadores. Cada capítulo que cambie guarda una versión, así que puedes deshacerlo desde su historial.</p>
        <div class="imp-seps">${groupCards(G, esc, g => g.best.k)}</div>
        ${can('delete') ? '<label class="tb-inl"><input type="checkbox" id="vsep-clean" checked> Quitar de Multimedia las copias que queden sin usar (las que sigan en uso en otro lado se conservan)</label>' : ''}`
        : '<p class="mono">No encontramos imágenes que parezcan separadores en este volumen. Si una se te pasó, ábrela en el editor y usa «Convertir en separador».</p>'}
      <p class="mono" id="vsep-st" role="status">${changed.length ? `${changed.length} ${changed.length === 1 ? 'cambio pendiente' : 'cambios pendientes'} · ${touched.size} ${touched.size === 1 ? 'capítulo' : 'capítulos'}` : G.length ? 'Sin cambios pendientes.' : ''}</p>
      <span style="display:flex;gap:8px;flex-wrap:wrap">${G.length ? `<button class="btn sm" id="vsep-go" ${changed.length ? '' : 'disabled'}>Aplicar${touched.size ? ' a ' + touched.size + (touched.size === 1 ? ' capítulo' : ' capítulos') : ''}</button>` : ''}<button class="btn ghost sm" id="vsep-x">Cerrar</button></span></div>`;
    box.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { G.find(g => g.id === b.dataset.set).on = b.dataset.v === '1'; draw(); });
    box.querySelector('#vsep-x').onclick = () => { box.hidden = true; box.innerHTML = ''; onClose?.(); };
    box.querySelector('#vsep-go')?.addEventListener('click', e => busy(e.currentTarget, apply));
  };
  async function apply(){
    const prev = await listSeps(sb, sdir), target = new Map(), pathOf = u => u.startsWith(PUB) ? decodeURIComponent(u.slice(PUB.length)) : null;
    for (const g of G.filter(x => x.on)) {
      const inDir = g.items.find(x => x.isSep && pathOf(x.k)?.startsWith(sdir + '/'));
      if (inDir) { target.set(g.id, inDir.k); continue; }
      st('Preparando separadores…'); const { path } = await putSep(sb, sdir, g.best, blobs.get(g.best.k), blobs.get(g.best.k)?.type, prev); target.set(g.id, PUB + path);
    }
    const byKey = new Map(); G.forEach(g => g.keys.forEach(k => byKey.set(k, g)));
    let saved = 0; const fails = [];
    for (const c of chs || []) {
      const body = Array.isArray(c.body) ? c.body : [];
      const next = collapseSeps(body.map(b => { const t = b?.type || b?.t, u = (t === 'image' || t === 'img') ? (b.url || b.src) : (t === 'separator' || t === 'sep') ? b.img : null, g = u && byKey.get(u); if (!g) return b;
        if (g.on) return { type: 'separator', img: target.get(g.id) };
        return b.img && t !== 'image' ? { type: 'image', url: b.img, alt: '', caption: '' } : b; }));
      if (JSON.stringify(next) === JSON.stringify(body)) continue;
      st(`Guardando capítulos ${saved + fails.length + 1}…`);
      const { error } = await sb.rpc('save_chapter', { p_id: c.id, p_expected: c.version, p_title: c.title, p_body: next, p_note: 'Separadores de imagen', p_snapshot: true, p_meta: {} });
      if (error) fails.push(c.title + (/version_conflict/.test(error.message) ? ' (alguien lo editó: recarga e inténtalo de nuevo)' : '')); else saved++;
    }
    // copias que dejaron de usarse → fuera de Multimedia (solo del equipo y solo si nadie más las usa)
    let removed = 0;
    if (box.querySelector('#vsep-clean')?.checked && can('delete') && !fails.length) {
      const keep = new Set(target.values()), old = [...new Set(G.filter(g => g.on).flatMap(g => g.keys).filter(k => !keep.has(k)).map(pathOf).filter(p => p && p.startsWith(T.team.id + '/')))];
      if (old.length) { const { data: used } = await sb.rpc('media_in_use', { p_team: T.team.id, p_paths: old }); const free = old.filter(p => !(used || []).includes(p));
        if (free.length) { const { error: re } = await sb.storage.from('obi-media').remove(free); if (!re) removed = free.length; } }
    }
    toast(`${saved} ${saved === 1 ? 'capítulo actualizado' : 'capítulos actualizados'}${removed ? ' · ' + removed + ' copias quitadas de Multimedia' : ''}${fails.length ? ' · no se guardaron: ' + fails.join(', ') : ''}`);
    return reviewVolume({ sb, esc, toast, busy, PUB, T, can, errMsg, box, series, volume, onClose });
  }
  draw();
}

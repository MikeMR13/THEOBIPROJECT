// Lector de El Obi del Lector: por capítulo o continuo, fuentes EPUB, progreso exacto, leídos, historial, sin conexión y anotaciones.
const OFF_CACHE = 'obi-offline-v1', OFF_INDEX = 'obi-offline-index', PREF_KEY = 'obi-reader-prefs';
const DEF = { theme: 'oscuro', size: 20, font: 'original', width: 'normal', lh: 'comodo', align: 'izquierda', illus: true, continuous: 'off' };
const COLORS = { gold: '#f2c230', rose: '#f29bb0', sky: '#8cc3f2', mint: '#9fdcb0' };
const SEC_LABEL = { 'Capítulo': 'Cap.', 'Prólogo': 'Prólogo', 'Interludio': 'Interludio', 'Epílogo': 'Epílogo', 'Afterword': 'Epílogo del autor', 'Extra': 'Extra' };
const ALLOWED = new Set(['B','STRONG','I','EM','U','S','SPAN','RUBY','RT','RP','BR','SUP','SUB','SMALL']);

export function createReader(ctx){
  const { sb, app, $, esc, toast, go, getUser, url } = ctx;
  const media = p => p ? (/^https?:/.test(p) ? p : `${url}/storage/v1/object/public/obi-media/${encodeURI(p)}`) : '';
  const S = { series: null, chapters: [], vols: [], bodies: new Map(), prefs: null, remote: null, mounted: [], active: null, annots: [], saveT: 0, readMarked: new Set(), historyLogged: new Set() };

  // ---------- preferencias ----------
  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || { global: {}, per_volume: {} }; } catch { return { global: {}, per_volume: {} }; } };
  async function loadPrefs(){
    S.remote = loadLocal();
    const user = getUser();
    if (user) { const { data } = await sb.from('reader_prefs').select('global,per_volume').eq('user_id', user.id).maybeSingle(); if (data) S.remote = { global: data.global || {}, per_volume: data.per_volume || {} }; }
  }
  const effective = volId => ({ ...DEF, ...(S.series?.teams?.reader_defaults || {}), ...S.remote.global, ...(S.remote.per_volume[volId] || {}) });
  let prefT = 0;
  function savePrefs(){
    localStorage.setItem(PREF_KEY, JSON.stringify(S.remote));
    clearTimeout(prefT); prefT = setTimeout(() => { const user = getUser(); if (user) sb.from('reader_prefs').upsert({ user_id: user.id, global: S.remote.global, per_volume: S.remote.per_volume, updated_at: new Date().toISOString() }); }, 800);
  }

  // ---------- datos ----------
  async function loadSeries(slug){
    if (S.series?.slug === slug) return true;
    let s, ch, vo;
    try {
      const r1 = await sb.from('series').select('id,slug,title,team_id,teams(name,reader_defaults)').eq('slug', slug).maybeSingle();
      if (r1.error) throw r1.error; s = r1.data;
      if (s) { const [a, b] = await Promise.all([
        sb.from('chapters').select('id,num,vol,title,section_type,volume_id').eq('series_id', s.id).is('deleted_at', null).order('num'),
        sb.from('volumes').select('id,num,title,epub_fonts').eq('series_id', s.id).is('deleted_at', null).order('num')]);
        if (a.error || b.error) throw a.error || b.error; ch = a.data; vo = b.data; }
    } catch { const m = await offlineMeta(slug); if (m) ({ series: s, chapters: ch, vols: vo } = m); }
    if (!s) return false;
    Object.assign(S, { series: s, chapters: ch || [], vols: vo || [], bodies: new Map(), annots: [] });
    return true;
  }
  async function body(ch){
    if (S.bodies.has(ch.id)) return S.bodies.get(ch.id);
    let b = null;
    try { const { data, error } = await sb.from('chapters').select('body').eq('id', ch.id).maybeSingle(); if (error) throw error; b = data?.body ?? null; }
    catch { b = await offlineBody(ch); }
    if (!b) b = await offlineBody(ch);
    if (b) S.bodies.set(ch.id, b);
    return b;
  }
  const prefetchNext = ch => { const n = nextOf(ch); if (n && !S.bodies.has(n.id)) (window.requestIdleCallback || setTimeout)(() => body(n)); };
  const nextOf = ch => S.chapters[S.chapters.indexOf(ch) + 1];
  const prevOf = ch => S.chapters[S.chapters.indexOf(ch) - 1];
  const volOf = ch => S.vols.find(v => v.id === ch.volume_id) || S.vols.find(v => v.num === ch.vol);

  // ---------- fuentes EPUB ----------
  const fontsDone = new Set();
  function familiesOf(vol){ return [...new Set((vol?.epub_fonts || []).map(f => f.family))]; }
  function ensureFonts(vol){
    if (!vol || fontsDone.has(vol.id) || !(vol.epub_fonts || []).length) return;
    fontsDone.add(vol.id);
    const css = vol.epub_fonts.map(f => `@font-face{font-family:"obi-${vol.num}-${f.family.replace(/"/g, '')}";src:url("${f.url}");font-style:${f.style === 'oblique' ? 'oblique' : f.style || 'normal'};font-weight:${f.weight || 'normal'};font-display:swap}`).join('');
    const st = document.createElement('style'); st.dataset.vol = vol.id; st.textContent = css; document.head.appendChild(st);
  }
  function fontVars(vol, p){
    return familiesOf(vol).map((fam, i) => `--f${i}:${p.font === 'original' ? `"obi-${vol.num}-${fam.replace(/"/g, '')}",` : ''}inherit`).join(';');
  }

  // ---------- render de bloques ----------
  function clean(html){
    const t = document.createElement('template'); t.innerHTML = html;
    const walk = n => { [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || !ALLOWED.has(c.tagName)) { if (c.nodeType === 1) { walk(c); c.replaceWith(...c.childNodes); } else c.remove(); return; }
      const fam = c.getAttribute('data-epub-family');
      [...c.attributes].forEach(a => c.removeAttribute(a.name));
      if (c.tagName === 'SPAN' && fam != null && /^\d+$/.test(fam)) c.setAttribute('style', `font-family:var(--f${fam})`);
      walk(c);
    }); };
    walk(t.content); return t.innerHTML;
  }
  const rich = b => b.html ? clean(b.html) : esc(b.text || '');
  function block(b, i, p){
    const t = b.type || b.t;
    if (t === 'paragraph' || t === 'p') return `<p data-b="${i}">${rich(b)}</p>`;
    if (t === 'heading' || t === 'h') return `<h3 data-b="${i}">${rich(b)}</h3>`;
    if (t === 'quote') return `<blockquote data-b="${i}">${rich(b)}</blockquote>`;
    if (t === 'separator' || t === 'sep') return `<div class="sep" data-b="${i}" aria-hidden="true">※</div>`;
    if (t === 'note') return `<aside class="tn" data-b="${i}"><span class="mono">Nota del traductor</span>${rich(b)}</aside>`;
    if (t === 'ruby') return `<p data-b="${i}"><ruby>${esc(b.text || '')}<rt>${esc(b.reading || '')}</rt></ruby></p>`;
    if (t === 'image' || t === 'img') { if (!p.illus) return `<p class="mono" data-b="${i}">[Ilustración oculta]</p>`; const src = b.url || b.src; return src ? `<figure data-b="${i}"><img src="${esc(media(src))}" alt="${esc(b.alt || b.text || '')}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>` : ''; }
    return b.text ? `<p data-b="${i}">${esc(b.text)}</p>` : '';
  }
  function chapterHTML(ch, blocks, p){
    const vol = volOf(ch); ensureFonts(vol);
    const label = (SEC_LABEL[ch.section_type] || 'Cap.') + (ch.section_type === 'Capítulo' || !ch.section_type ? ' ' + ch.num : '');
    return `<article class="rd-ch" data-ch="${ch.id}" style="${vol ? fontVars(vol, p) : ''}">
      <header class="rd-head"><span class="mono">Volumen ${ch.vol} · ${esc(label)}</span><h2>${esc(ch.title)}</h2></header>
      <div class="rd-body">${(blocks || []).map((b, i) => block(b, i, p)).join('')}</div></article>`;
  }

  // ---------- vista ----------
  async function open(slug, num){
    app.innerHTML = '<p class="mono">Abriendo capítulo…</p>';
    if (!(await loadSeries(slug))) { app.innerHTML = '<h1>Serie no encontrada</h1><p><a href="/catalogo">Ir al catálogo</a></p>'; return; }
    if (!S.remote) await loadPrefs();
    const ch = S.chapters.find(c => c.num === num);
    if (!ch) { app.innerHTML = '<h1>Capítulo bloqueado o inexistente</h1><p>Si es acceso anticipado, apóyanos para leerlo antes. <a href="/apoyar">Ver niveles</a></p>'; return; }
    const b = await body(ch);
    if (!b) { app.innerHTML = '<h1>Sin conexión</h1><p>Este capítulo no está descargado. <a href="/biblioteca">Ver descargas</a></p>'; return; }
    const p = effective(ch.volume_id);
    S.mounted = [ch]; S.active = ch;
    app.innerHTML = `<div class="rd" data-theme="${p.theme}" data-width="${p.width}" data-lh="${p.lh}" data-align="${p.align}" data-font="${p.font}" style="--rs:${p.size}px">
      <nav class="rd-bar">
        <a href="/serie/${esc(slug)}" class="rd-back">‹ ${esc(S.series.title)}</a>
        <div class="rd-tools">
          <button class="btn ghost" data-act="toc" aria-label="Índice">Índice</button>
          <button class="btn ghost" data-act="prefs" aria-label="Ajustes de lectura">Aa</button>
          <button class="btn ghost" data-act="notes">Anotaciones</button>
          <button class="btn ghost" data-act="offline">${isVolOffline(ch) ? '✓ Descargado' : 'Descargar volumen'}</button>
        </div>
      </nav>
      <div class="rd-panel" hidden></div>
      <div id="rd-flow">${chapterHTML(ch, b, p)}</div>
      <div id="rd-sentinel"></div>
      <footer class="rd-foot"></footer>
      <div class="rd-pop" hidden></div>
    </div>`;
    bindBar(); footer();
    await loadAnnots(); paintAnnots();
    restorePosition(ch);
    logHistory(ch); prefetchNext(ch);
    observe();
  }
  function footer(){
    const ch = S.active, pv = prevOf(ch), nx = nextOf(ch), p = effective(ch.volume_id);
    const cont = p.continuous !== 'off' && nx && (p.continuous === 'all' || nx.vol === ch.vol);
    $('.rd-foot').innerHTML = cont ? '<p class="mono" style="text-align:center">Sigue bajando para continuar…</p>'
      : `<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">${pv ? `<a class="btn ghost" href="/leer/${S.series.slug}/${pv.num}">‹ ${esc(pv.title)}</a>` : '<span></span>'}${nx ? `<a class="btn" href="/leer/${S.series.slug}/${nx.num}">${nx.vol !== ch.vol ? 'Volumen ' + nx.vol + ' · ' : ''}${esc(nx.title)} ›</a>` : '<span class="mono">Has llegado al último capítulo publicado.</span>'}</div>
         <p style="text-align:center"><button class="btn ghost" data-act="report">Reportar errata</button></p>`;
    $('[data-act="report"]')?.addEventListener('click', report);
  }

  // ---------- lectura continua + capítulo activo ----------
  let io, activeIo;
  function observe(){
    io?.disconnect(); activeIo?.disconnect();
    io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      const last = S.mounted[S.mounted.length - 1], nx = nextOf(last), p = effective(last.volume_id);
      if (p.continuous === 'off' || !nx || (p.continuous === 'volume' && nx.vol !== last.vol) || S.loadingNext) return;
      S.loadingNext = true;
      const b = await body(nx); S.loadingNext = false; if (!b) return;
      $('#rd-flow').insertAdjacentHTML('beforeend', chapterHTML(nx, b, effective(nx.volume_id)));
      S.mounted.push(nx); paintAnnots(); prefetchNext(nx);
      activeIo.observe($(`[data-ch="${nx.id}"]`));
    }, { rootMargin: '800px 0px' });
    io.observe($('#rd-sentinel'));
    activeIo = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const ch = S.chapters.find(c => c.id === e.target.dataset.ch);
      if (ch && ch !== S.active) { S.active = ch; history.replaceState({}, '', `/leer/${S.series.slug}/${ch.num}`); logHistory(ch); footer(); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.rd-ch').forEach(a => activeIo.observe(a));
    removeEventListener('scroll', onScroll); addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- progreso exacto, leídos e historial ----------
  const posKey = id => 'obi-pos-' + id;
  function currentBlock(){
    const art = $(`[data-ch="${S.active.id}"]`); if (!art) return { block: 0, pct: 0 };
    const els = art.querySelectorAll('[data-b]'); let blk = 0;
    for (const el of els) { if (el.getBoundingClientRect().bottom > 80) { blk = +el.dataset.b; break; } }
    const r = art.getBoundingClientRect(), pct = Math.min(1, Math.max(0, (innerHeight - r.top) / r.height));
    return { block: blk, pct };
  }
  function onScroll(){
    if (!document.body.contains($('.rd'))) { removeEventListener('scroll', onScroll); return; }
    clearTimeout(S.saveT); S.saveT = setTimeout(saveProgress, 1200);
  }
  async function saveProgress(){
    const ch = S.active, { block: blk, pct } = currentBlock(), p = effective(ch.volume_id);
    localStorage.setItem(posKey(S.series.id), JSON.stringify({ chapter_id: ch.id, num: ch.num, block: blk, pct }));
    const user = getUser(); if (!user) return;
    sb.from('reading_progress').upsert({ user_id: user.id, series_id: S.series.id, chapter_num: ch.num, chapter_id: ch.id, block: blk, pct, mode: p.continuous === 'off' ? 'chapter' : 'continuous', updated_at: new Date().toISOString() });
    if (pct > 0.95 && !S.readMarked.has(ch.id)) { S.readMarked.add(ch.id); sb.from('read_chapters').upsert({ user_id: user.id, chapter_id: ch.id }); }
  }
  async function restorePosition(ch){
    let pos = null; const user = getUser();
    if (user) { const { data } = await sb.from('reading_progress').select('chapter_id,block').eq('user_id', user.id).eq('series_id', S.series.id).maybeSingle(); pos = data; }
    if (!pos) try { pos = JSON.parse(localStorage.getItem(posKey(S.series.id))); } catch {}
    if (pos?.chapter_id === ch.id && pos.block > 0) { const el = $(`[data-ch="${ch.id}"] [data-b="${pos.block}"]`); if (el) { scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); toast('Seguimos donde lo dejaste'); } }
    else scrollTo(0, 0);
  }
  function logHistory(ch){
    if (S.historyLogged.has(ch.id)) return; S.historyLogged.add(ch.id);
    const user = getUser(); if (user) sb.from('reading_history').insert({ user_id: user.id, chapter_id: ch.id });
  }

  // ---------- barra, índice y ajustes ----------
  function bindBar(){
    document.querySelectorAll('.rd-bar [data-act]').forEach(b => b.onclick = () => ({ toc, prefs: prefsPanel, notes: () => go('/anotaciones/' + S.series.slug), offline: toggleOffline })[b.dataset.act]());
  }
  const panel = () => $('.rd-panel');
  function toggle(html){ const pn = panel(); if (!pn.hidden && pn.dataset.kind === html.kind) { pn.hidden = true; return null; } pn.dataset.kind = html.kind; pn.innerHTML = html.body; pn.hidden = false; return pn; }
  function toc(){
    const byVol = {}; S.chapters.forEach(c => (byVol[c.vol] ||= []).push(c));
    const pn = toggle({ kind: 'toc', body: Object.entries(byVol).map(([v, cs]) => `<h4>Volumen ${v}${volTitle(+v)}</h4>${cs.map(c => `<a href="/leer/${S.series.slug}/${c.num}" class="${c === S.active ? 'on' : ''}">${esc(c.title)}</a>`).join('')}`).join('') });
    pn?.querySelector('.on')?.focus();
  }
  const volTitle = n => { const v = S.vols.find(x => x.num === n); return v?.title && v.title !== String(n) ? ' · ' + esc(v.title) : ''; };
  function prefsPanel(){
    const ch = S.active, vid = ch.volume_id, p = effective(vid), scoped = !!S.remote.per_volume[vid];
    const opt = (k, list) => `<div class="rd-opt"><span class="mono">${list.label}</span><div>${list.o.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(p[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
    const pn = toggle({ kind: 'prefs', body: `
      ${opt('theme', { label: 'Tema', o: [['claro','Claro'],['sepia','Sepia'],['oscuro','Oscuro']] })}
      <div class="rd-opt"><span class="mono">Tamaño · ${p.size}px</span><input type="range" min="14" max="30" value="${p.size}" data-k="size"></div>
      ${opt('font', { label: 'Tipografía', o: [['original','Original del EPUB'],['Literata','Literata'],['serif','Serif'],['sans','Sans']] })}
      ${opt('width', { label: 'Ancho', o: [['estrecho','Estrecho'],['normal','Normal'],['amplio','Amplio']] })}
      ${opt('lh', { label: 'Interlineado', o: [['compacto','Compacto'],['comodo','Cómodo'],['amplio','Amplio']] })}
      ${opt('align', { label: 'Alineación', o: [['izquierda','Izquierda'],['justificada','Justificada']] })}
      ${opt('illus', { label: 'Ilustraciones', o: [['true','Mostrar'],['false','Ocultar']] })}
      ${opt('continuous', { label: 'Lectura', o: [['off','Por capítulo'],['volume','Continua dentro del volumen'],['all','Continua entre volúmenes']] })}
      <label class="rd-scope"><input type="checkbox" ${scoped ? 'checked' : ''} data-scope> Guardar estos ajustes solo para el Volumen ${ch.vol}</label>` });
    if (!pn) return;
    pn.onclick = e => { const b = e.target.closest('button[data-k]'); if (b) setPref(b.dataset.k, b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v); };
    pn.querySelector('[data-k="size"]').oninput = e => setPref('size', +e.target.value, true);
    pn.querySelector('[data-scope]').onchange = e => { if (e.target.checked) S.remote.per_volume[vid] = { ...S.remote.global }; else delete S.remote.per_volume[vid]; savePrefs(); applyPrefs(); };
  }
  function setPref(k, v, live){
    const vid = S.active.volume_id, tgt = S.remote.per_volume[vid] || S.remote.global;
    tgt[k] = v; savePrefs(); applyPrefs(k);
    if (!live) { panel().hidden = true; prefsPanel(); }
  }
  async function applyPrefs(k){
    const p = effective(S.active.volume_id), rd = $('.rd');
    Object.assign(rd.dataset, { theme: p.theme, width: p.width, lh: p.lh, align: p.align }); rd.style.setProperty('--rs', p.size + 'px');
    rd.dataset.font = p.font;
    if (k === 'font' || k === 'illus') {
      const { block: blk } = currentBlock();
      $('#rd-flow').innerHTML = S.mounted.map(c => chapterHTML(c, S.bodies.get(c.id), effective(c.volume_id))).join('');
      paintAnnots(); observe();
      const el = $(`[data-ch="${S.active.id}"] [data-b="${blk}"]`); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 90);
    }
    if (k === 'continuous') footer();
  }

  // ---------- sin conexión: descargar volumen ----------
  const offIndex = () => { try { return JSON.parse(localStorage.getItem(OFF_INDEX)) || {}; } catch { return {}; } };
  const offKey = ch => `/offline/${S.series?.slug || ch.slug}/${ch.num}`;
  const isVolOffline = ch => !!offIndex()[S.series.id + ':' + ch.vol];
  async function offlineMeta(slug){ try { const c = await caches.open(OFF_CACHE); const r = await c.match('/offline/meta/' + slug); return r ? r.json() : null; } catch { return null; } }
  async function offlineBody(ch){ try { const c = await caches.open(OFF_CACHE); const r = await c.match(offKey(ch)); return r ? r.json() : null; } catch { return null; } }
  async function toggleOffline(){
    const ch = S.active, key = S.series.id + ':' + ch.vol, idx = offIndex(), btn = $('[data-act="offline"]');
    if (idx[key]) { await removeVolume(key); btn.textContent = 'Descargar volumen'; toast('Volumen ' + ch.vol + ' eliminado del dispositivo'); return; }
    if (!('caches' in window)) return toast('Tu navegador no permite guardar sin conexión');
    const list = S.chapters.filter(c => c.vol === ch.vol), c = await caches.open(OFF_CACHE), assets = new Set();
    btn.disabled = true; let n = 0;
    for (const x of list) {
      btn.textContent = `Descargando ${++n}/${list.length}…`;
      const b = await body(x); if (!b) continue;
      await c.put(offKey(x), new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } }));
      b.forEach(bl => { const s = bl.url || bl.src; if (s) assets.add(media(s)); });
    }
    (volOf(ch)?.epub_fonts || []).forEach(f => assets.add(f.url));
    await c.put('/offline/meta/' + S.series.slug, new Response(JSON.stringify({ series: S.series, chapters: S.chapters, vols: S.vols }), { headers: { 'Content-Type': 'application/json' } }));
    await Promise.all([...assets].map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    idx[key] = { slug: S.series.slug, title: S.series.title, vol: ch.vol, nums: list.map(x => x.num), assets: [...assets], at: Date.now() };
    localStorage.setItem(OFF_INDEX, JSON.stringify(idx));
    btn.disabled = false; btn.textContent = '✓ Descargado'; toast(`Volumen ${ch.vol} listo para leer sin conexión`);
  }
  async function removeVolume(key){
    const idx = offIndex(), it = idx[key]; if (!it) return;
    const c = await caches.open(OFF_CACHE);
    await Promise.all([...it.nums.map(n => c.delete(`/offline/${it.slug}/${n}`)), ...it.assets.map(u => c.delete(u))]);
    delete idx[key]; localStorage.setItem(OFF_INDEX, JSON.stringify(idx));
  }
  function offlineList(){
    const idx = offIndex(), items = Object.entries(idx);
    return items.length ? items.map(([k, it]) => `<p style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><a href="/leer/${it.slug}/${it.nums[0]}">${esc(it.title)} · Volumen ${it.vol}</a><span class="mono">${it.nums.length} capítulos</span><button class="btn ghost" data-off="${esc(k)}">Borrar</button></p>`).join('') : '<p class="mono">No tienes volúmenes descargados. Ábrelos desde el lector con «Descargar volumen».</p>';
  }
  function bindOfflineList(root, after){ root.querySelectorAll('[data-off]').forEach(b => b.onclick = async () => { await removeVolume(b.dataset.off); toast('Descarga eliminada'); after(); }); }

  // ---------- anotaciones ----------
  async function loadAnnots(){
    const user = getUser(); if (!user) { S.annots = []; return; }
    const ids = S.chapters.map(c => c.id);
    const { data } = await sb.from('annotations').select('*').eq('user_id', user.id).in('chapter_id', ids);
    S.annots = data || [];
  }
  function textOffset(blockEl, node, off){ const r = document.createRange(); r.setStart(blockEl, 0); r.setEnd(node, off); return r.toString().length; }
  function wrap(blockEl, start, end, a){
    const tw = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT); let pos = 0, n; const parts = [];
    while ((n = tw.nextNode())) { const len = n.data.length, s = Math.max(start, pos), e = Math.min(end, pos + len); if (s < e) parts.push([n, s - pos, e - pos]); pos += len; if (pos >= end) break; }
    parts.forEach(([node, s, e]) => { const r = document.createRange(); r.setStart(node, s); r.setEnd(node, e); const m = document.createElement('mark'); m.className = 'an'; m.dataset.an = a.id; m.style.setProperty('--an', COLORS[a.color]); if (a.note) m.dataset.note = '1'; try { r.surroundContents(m); } catch {} });
  }
  function paintAnnots(){
    document.querySelectorAll('mark.an').forEach(m => m.replaceWith(...m.childNodes));
    document.querySelectorAll('.rd-body').forEach(b => b.normalize());
    S.annots.forEach(a => { const el = $(`[data-ch="${a.chapter_id}"] [data-b="${a.block}"]`); if (el) wrap(el, a.start_at, a.end_at, a); });
  }
  const pop = () => $('.rd-pop');
  function placePop(rect){ const p = pop(); p.hidden = false; const w = p.offsetWidth; p.style.left = Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2)) + 'px'; p.style.top = (rect.top + scrollY - p.offsetHeight - 10) + 'px'; }
  function onSelect(){
    const sel = getSelection(); if (!sel || sel.isCollapsed) return;
    const r = sel.getRangeAt(0), bEl = r.startContainer.parentElement?.closest('[data-b]'), art = bEl?.closest('.rd-ch');
    if (!bEl || !art) return;
    const endIn = bEl.contains(r.endContainer);
    const start = textOffset(bEl, r.startContainer, r.startOffset), end = endIn ? textOffset(bEl, r.endContainer, r.endOffset) : bEl.textContent.length;
    const quote = bEl.textContent.slice(start, end).trim(); if (!quote) return;
    const draft = { chapter_id: art.dataset.ch, block: +bEl.dataset.b, start_at: start, end_at: end, quote };
    pop().innerHTML = Object.entries(COLORS).map(([k, c]) => `<button class="sw" data-c="${k}" style="background:${c}" aria-label="Subrayar ${k}"></button>`).join('') + '<button data-x="note">Nota</button><button data-x="quote">Citar</button>';
    placePop(r.getBoundingClientRect());
    pop().onclick = async e => {
      const c = e.target.dataset.c, x = e.target.dataset.x;
      if (x === 'quote') { copyQuote(draft); return closePop(); }
      const a = await createAnnot({ ...draft, color: c || 'gold' }); if (!a) return;
      sel.removeAllRanges(); if (x === 'note') editAnnot(a); else closePop();
    };
  }
  const closePop = () => { const p = pop(); if (p) p.hidden = true; };
  async function createAnnot(d){
    const user = getUser(); if (!user) { toast('Entra para guardar subrayados'); go('/entrar'); return null; }
    const { data, error } = await sb.from('annotations').insert({ ...d, user_id: user.id }).select().single();
    if (error) { toast('No se pudo guardar: ' + error.message); return null; }
    S.annots.push(data); paintAnnots(); return data;
  }
  function cite(a){ const ch = S.chapters.find(c => c.id === a.chapter_id); return `«${a.quote}»\n— ${S.series.title}, Vol. ${ch?.vol} · ${ch?.title}\n${location.origin}/leer/${S.series.slug}/${ch?.num}`; }
  async function copyQuote(a){ const t = cite(a); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Cita copiada'); } } catch {} }
  function editAnnot(a){
    const m = $(`mark[data-an="${a.id}"]`); if (!m) return;
    pop().innerHTML = `<div style="display:grid;gap:8px;width:min(320px,80vw)">
      <div style="display:flex;gap:6px">${Object.entries(COLORS).map(([k, c]) => `<button class="sw ${a.color === k ? 'on' : ''}" data-c="${k}" style="background:${c}" aria-label="${k}"></button>`).join('')}</div>
      <textarea rows="3" placeholder="Nota privada">${esc(a.note || '')}</textarea>
      <label class="mono"><input type="checkbox" ${a.shared ? 'checked' : ''} data-share> Compartir como cita pública</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-x="save">Guardar</button><button class="btn ghost" data-x="quote">Citar</button><button class="btn ghost" data-x="del">Borrar</button></div></div>`;
    placePop(m.getBoundingClientRect());
    pop().onclick = async e => {
      const c = e.target.dataset.c, x = e.target.dataset.x;
      if (c) { a.color = c; pop().querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === c)); return; }
      if (x === 'quote') return copyQuote(a);
      if (x === 'del') { await sb.from('annotations').delete().eq('id', a.id); S.annots = S.annots.filter(z => z.id !== a.id); paintAnnots(); return closePop(); }
      if (x === 'save') { const note = pop().querySelector('textarea').value.trim() || null, shared = pop().querySelector('[data-share]').checked;
        const { error } = await sb.from('annotations').update({ color: a.color, note, shared, updated_at: new Date().toISOString() }).eq('id', a.id);
        if (error) return toast(error.message); Object.assign(a, { note, shared }); paintAnnots(); closePop(); toast('Anotación guardada'); }
    };
  }
  document.addEventListener('mouseup', e => { if (!$('.rd') || e.target.closest('.rd-pop')) return; const m = e.target.closest('mark.an'); if (m && getSelection().isCollapsed) { const a = S.annots.find(z => String(z.id) === m.dataset.an); if (a) return editAnnot(a); } setTimeout(onSelect, 0); });
  document.addEventListener('touchend', e => { if ($('.rd') && !e.target.closest('.rd-pop')) setTimeout(onSelect, 250); });
  document.addEventListener('mousedown', e => { if (!e.target.closest('.rd-pop')) closePop(); });

  async function annotationsPage(slug){
    const user = getUser(); if (!user) return go('/entrar');
    if (!(await loadSeries(slug))) { app.innerHTML = '<h1>Serie no encontrada</h1>'; return; }
    await loadAnnots();
    const byCh = S.chapters.map(c => [c, S.annots.filter(a => a.chapter_id === c.id).sort((x, y) => x.block - y.block || x.start_at - y.start_at)]).filter(([, l]) => l.length);
    app.innerHTML = `<h1>Mis anotaciones</h1><p class="mono">${esc(S.series.title)} · ${S.annots.length} anotaciones</p>
      <p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="md" ${S.annots.length ? '' : 'disabled'}>Exportar Markdown</button><a class="btn ghost" href="/serie/${esc(slug)}">Volver a la serie</a></p>
      ${byCh.map(([c, l]) => `<section class="an-list"><h2>Volumen ${c.vol} · ${esc(c.title)}</h2>${l.map(a => `<blockquote style="border-left:4px solid ${COLORS[a.color]}"><a href="/leer/${slug}/${c.num}">«${esc(a.quote)}»</a>${a.note ? `<p>${esc(a.note)}</p>` : ''}${a.shared ? '<span class="mono">Compartida</span>' : ''}</blockquote>`).join('')}</section>`).join('') || '<p>Selecciona texto en el lector para subrayar y añadir notas.</p>'}`;
    $('#md')?.addEventListener('click', () => {
      const md = `# ${S.series.title} — mis anotaciones\n\n` + byCh.map(([c, l]) => `## Volumen ${c.vol} · ${c.title}\n\n` + l.map(a => `> ${a.quote.replace(/\n/g, '\n> ')}\n${a.note ? `\n${a.note}\n` : ''}`).join('\n')).join('\n');
      const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); el.download = `anotaciones-${slug}.md`; el.click();
    });
  }

  // ---------- errata ----------
  async function report(){
    const user = getUser(); if (!user) return go('/entrar');
    const quote = String(getSelection()).trim() || prompt('Frase con el error'); if (!quote) return;
    const fix = prompt('¿Cómo debería decir?') || '';
    const { error } = await sb.from('reports').insert({ chapter_id: S.active.id, user_id: user.id, kind: 'Errata', quote, fix });
    toast(error ? error.message : 'Gracias, el equipo recibió tu reporte');
  }

  // ---------- continuar leyendo / historial ----------
  async function continueList(){
    const user = getUser(); let rows = [];
    if (user) { const { data } = await sb.from('reading_progress').select('chapter_num,pct,updated_at,series(title,slug)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(6); rows = (data || []).map(r => ({ title: r.series.title, slug: r.series.slug, num: r.chapter_num, pct: r.pct })); }
    return rows;
  }
  async function historyList(){
    const user = getUser(); if (!user) return [];
    const { data } = await sb.from('reading_history').select('opened_at,chapters(num,title,series(title,slug))').eq('user_id', user.id).order('opened_at', { ascending: false }).limit(30);
    return (data || []).filter(h => h.chapters?.series);
  }

  return { open, annotationsPage, offlineList, bindOfflineList, continueList, historyList };
}

// Lector de El Obi del Lector: por capítulo o continuo, fuentes EPUB, progreso exacto, leídos, historial, sin conexión y anotaciones.
const OFF_CACHE = 'obi-offline-v1', OFF_INDEX = 'obi-offline-index', PREF_KEY = 'obi-reader-prefs';
import { cleanInline, renderBlock, warningsHTML, teaserHTML } from './blocks.js?v=1';
const DEF = { theme: 'oscuro', size: 20, font: 'original', width: 'normal', lh: 'comodo', align: 'izquierda', illus: true, continuous: 'off', cw: 'show', autonext: true };
const COLORS = { gold: '#f2c230', rose: '#f29bb0', sky: '#8cc3f2', mint: '#9fdcb0' };
const SEC_LABEL = { 'Capítulo': 'Cap.', 'Prólogo': 'Prólogo', 'Interludio': 'Interludio', 'Epílogo': 'Epílogo', 'Afterword': 'Epílogo del autor', 'Extra': 'Extra' };

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
        sb.from('chapters').select('id,num,vol,title,section_type,volume_id,content_warnings,teaser,teaser_on').eq('series_id', s.id).is('deleted_at', null).order('num'),
        sb.from('volumes').select('id,num,title,epub_fonts').eq('series_id', s.id).is('deleted_at', null).order('num')]);
        if (a.error || b.error) throw a.error || b.error; ch = a.data; vo = b.data; }
    } catch { const m = await offlineMeta(slug); if (m) ({ series: s, chapters: ch, vols: vo } = m); }
    if (!s) return false;
    let nextAt = null; try { const r = await sb.from('schedule').select('at').eq('series_id', s.id).gte('at', new Date().toISOString()).order('at').limit(1); nextAt = r.data?.[0]?.at || null; } catch {}
    let gl = []; try { const r = await sb.from('glossary_terms').select('term,category,definition').eq('series_id', s.id); gl = r.data || []; } catch {}
    Object.assign(S, { series: s, chapters: ch || [], vols: vo || [], nextAt, teamIds: null, bodies: new Map(), annots: [], gloss: gl, glMap: new Map(gl.map(g => [g.term.toLowerCase(), g])), glRe: undefined });
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
  const block = (b, i, p) => renderBlock(b, i, { media, illus: p.illus });
  const nextWhen = () => S.nextAt ? new Date(S.nextAt).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
  function chapterHTML(ch, blocks, p){
    const vol = volOf(ch); ensureFonts(vol);
    const label = (SEC_LABEL[ch.section_type] || 'Cap.') + (ch.section_type === 'Capítulo' || !ch.section_type ? ' ' + ch.num : '');
    return `<article class="rd-ch" data-ch="${ch.id}" style="${vol ? fontVars(vol, p) : ''}">
      <header class="rd-head"><span class="mono">Volumen ${ch.vol} · ${esc(label)}</span><h2>${esc(ch.title)}</h2></header>
      ${warningsHTML(ch.content_warnings, p.cw)}
      <div class="rd-body">${(blocks || []).map((b, i) => block(b, i, p)).join('')}</div>
      ${ch.teaser_on && ch.teaser ? teaserHTML(ch.teaser, nextWhen()) : ''}</article>`;
  }

  // ---------- glosario en el texto ----------
  function glossRe(){
    if (S.glRe !== undefined) return S.glRe;
    const t = [...(S.gloss || [])].sort((a, b) => b.term.length - a.term.length).map(g => g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return S.glRe = t.length ? new RegExp('(?<![\\p{L}\\p{N}])(' + t.join('|') + ')(?![\\p{L}\\p{N}])', 'giu') : null;
  }
  function markTerms(root){
    const re = glossRe(); if (!re || !root) return;
    root.querySelectorAll('.rd-body p, .rd-body blockquote, .rd-body aside.tn').forEach(el => {
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('rt,rp,ruby,.gl,.mono') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; let n; while ((n = tw.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        re.lastIndex = 0; if (!re.test(node.data)) return; re.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m;
        while ((m = re.exec(node.data))) {
          if (m.index > last) frag.append(node.data.slice(last, m.index));
          const sp = document.createElement('span'); sp.className = 'gl'; sp.dataset.t = m[1].toLowerCase(); sp.tabIndex = 0; sp.setAttribute('role', 'button'); sp.textContent = m[1];
          frag.append(sp); last = m.index + m[1].length;
        }
        if (last < node.data.length) frag.append(node.data.slice(last));
        node.replaceWith(frag);
      });
    });
  }
  function openTerm(el){
    const g = S.glMap?.get(el.dataset.t); if (!g) return;
    const art = el.closest('.rd-ch'), n = art ? art.querySelectorAll(`.gl[data-t="${CSS.escape(el.dataset.t)}"]`).length : 1;
    document.querySelectorAll('.gl.on').forEach(x => x.classList.remove('on')); el.classList.add('on');
    const sh = $('.gl-sheet'); if (!sh) return;
    sh.innerHTML = `<div class="gl-card" role="dialog" aria-modal="true" aria-labelledby="gl-t"><div class="gl-top"><div><span class="mono">Glosario · ${esc(g.category)}</span><strong id="gl-t">${esc(g.term)}</strong></div><button class="gl-x" aria-label="Cerrar">×</button></div><p>${esc(g.definition)}</p><span class="gl-n">Aparece ${n === 1 ? '1 vez' : n + ' veces'} en este capítulo · Toca fuera para seguir leyendo</span></div>`;
    sh.hidden = false; S.glFrom = el; sh.querySelector('.gl-x').focus({ preventScroll: true });
  }
  function closeTerm(){ const sh = $('.gl-sheet'); if (!sh || sh.hidden) return; sh.hidden = true; document.querySelectorAll('.gl.on').forEach(x => x.classList.remove('on')); S.glFrom?.focus({ preventScroll: true }); }
  document.addEventListener('click', e => {
    if (!$('.rd')) return;
    const t = e.target.closest('.gl'); if (t && getSelection().isCollapsed) { e.stopPropagation(); return openTerm(t); }
    if (e.target.closest('.gl-sheet') && (!e.target.closest('.gl-card') || e.target.closest('.gl-x'))) closeTerm();
  });
  document.addEventListener('keydown', e => {
    if (!$('.rd')) return;
    if (e.key === 'Escape') closeTerm();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('gl')) { e.preventDefault(); openTerm(e.target); }
  });

  // una vista por capítulo y día en este dispositivo
  const devId = () => { try { let d = localStorage.getItem('obi-dev'); if (!d) { d = crypto.randomUUID(); localStorage.setItem('obi-dev', d); } return d; } catch { return null; } };
  function trackView(ch){ if (!navigator.onLine) return; const k = 'obi-v-' + ch.id, d = new Date().toDateString(); try { if (localStorage.getItem(k) === d) return; localStorage.setItem(k, d); } catch {} sb.rpc('track_view', { p_chapter: ch.id, p_device: devId() }).then(() => {}, () => {}); }
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
    S.mounted = [ch]; S.active = ch; trackView(ch);
    app.innerHTML = `<div class="rd" data-theme="${p.theme}" data-width="${p.width}" data-lh="${p.lh}" data-align="${p.align}" data-font="${p.font}" style="--rs:${p.size}px">
      <nav class="rd-bar">
        <a href="/serie/${esc(slug)}" class="rd-back">‹ ${esc(S.series.title)}</a>
        <div class="rd-tools">
          <button class="btn ghost" data-act="toc" aria-label="Índice">Índice</button>
          <button class="btn ghost" data-act="prefs" aria-label="Ajustes de lectura">Aa</button>
          <button class="btn ghost" data-act="coms">Comentarios</button>
          <button class="btn ghost" data-act="notes">Anotaciones</button>
          <button class="btn ghost" data-act="offline">${isVolOffline(ch) ? '✓ Descargado' : 'Descargar volumen'}</button>
        </div>
      </nav>
      <div class="rd-panel" hidden></div>
      <div id="rd-flow">${chapterHTML(ch, b, p)}</div>
      <div id="rd-sentinel"></div>
      <footer class="rd-foot"></footer>
      <div class="rd-pop" hidden></div>
      <div class="gl-sheet" hidden></div>
    </div>`;
    markTerms($('#rd-flow'));
    bindBar(); footer();
    await loadAnnots(); paintAnnots();
    restorePosition(ch);
    logHistory(ch); prefetchNext(ch);
    observe();
  }
  let autoIo, autoT, autoStop = null;
  const untilTxt = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
  async function rateBox(){
    const el = $('#rd-rate'); if (!el) return;
    if (!document.getElementById('rd-rate-css')) { const st = document.createElement('style'); st.id = 'rd-rate-css'; st.textContent = '.rd-rate{display:grid;justify-items:center;gap:6px;margin:26px auto 8px;text-align:center}.rd-rate h3{margin:0;font-size:1.05em}.rd-rate .st{display:flex}.rd-rate .st button{width:44px;height:48px;padding:0;background:none;border:0;font-size:30px;line-height:1;color:currentColor;opacity:.25;cursor:pointer}.rd-rate .st button.on{color:#f2c230;opacity:1}.rd-rate .st:hover button{color:#f2c230;opacity:1}.rd-rate .st button:hover~button{color:currentColor;opacity:.25}.rd-rate small{opacity:.75}'; document.head.appendChild(st); }
    const sid = S.series.id, { data } = await sb.rpc('series_rating', { p_series: sid }); if (!document.body.contains(el)) return;
    const r = data || {}, mine = r.mine || 0, u = getUser();
    el.innerHTML = `<h3>${mine ? 'Tu calificación de ' : '¿Qué te pareció '}«${esc(S.series.title)}»${mine ? '' : '?'}</h3><span class="st" role="group" aria-label="Calificar">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-v="${v}" class="${v <= mine ? 'on' : ''}" aria-pressed="${v === mine}" aria-label="${v} estrella${v > 1 ? 's' : ''}">★</button>`).join('')}</span><small>${r.n ? (+r.avg).toFixed(1) + ' de promedio · ' + r.n + (r.n === 1 ? ' voto' : ' votos') : 'Aún nadie la ha calificado'}${u ? (mine ? ' · toca tu estrella otra vez para quitar el voto' : '') : ' · entra para calificar'}</small>`;
    el.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
      if (!getUser()) return go('/entrar');
      const v = +b.dataset.v, uid = getUser().id;
      const { error } = v === mine ? await sb.from('series_ratings').delete().eq('series_id', sid).eq('user_id', uid) : await sb.from('series_ratings').upsert({ series_id: sid, user_id: uid, score: v, updated_at: new Date().toISOString() });
      if (error) return toast(error.message); toast(v === mine ? 'Quitaste tu voto' : '¡Gracias! Calificaste con ' + v + (v === 1 ? ' estrella' : ' estrellas')); rateBox(); });
  }
  function footer(){
    const ch = S.active, pv = prevOf(ch), nx = nextOf(ch), p = effective(ch.volume_id);
    const cont = p.continuous !== 'off' && nx && (p.continuous === 'all' || nx.vol === ch.vol);
    const auto = !cont && nx && p.autonext !== false && autoStop !== ch.id;
    const nextInfo = S.nextAt ? `<p class="rd-nexts"><span class="mono">Próximo capítulo</span><b>${new Date(S.nextAt).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</b><small>${untilTxt(S.nextAt)} · te avisaremos si sigues la serie</small></p>` : '';
    clearInterval(autoT); autoIo?.disconnect();
    $('.rd-foot').innerHTML = cont ? '<p class="mono" style="text-align:center">Sigue bajando para continuar…</p>'
      : `<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">${pv ? `<a class="btn ghost" href="/leer/${S.series.slug}/${pv.num}">‹ ${esc(pv.title)}</a>` : '<span></span>'}${nx ? `<a class="btn" href="/leer/${S.series.slug}/${nx.num}">${nx.vol !== ch.vol ? 'Volumen ' + nx.vol + ' · ' : ''}${esc(nx.title)} ›</a>` : '<span class="mono">Has llegado al último capítulo publicado.</span>'}</div>
         ${auto ? '<p class="rd-auto" id="rd-auto" hidden><span>Siguiente capítulo en <b id="rd-auto-n">' + Math.min(30, Math.max(3, +p.autosecs || 5)) + '</b> s</span><button class="btn ghost" data-act="auto-cancel">Cancelar</button></p>' : ''}
         ${!nx ? '<div class="rd-rate" id="rd-rate"></div>' + nextInfo + `<p style="text-align:center"><a class="btn ghost" href="/serie/${S.series.slug}#rv-sec">Escribir una reseña · ver la ficha</a></p>` : ''}
         <p style="text-align:center"><button class="btn ghost" data-act="report">Reportar errata</button></p>`;
    $('[data-act="report"]')?.addEventListener('click', report);
    if (!document.getElementById('rd-auto-css')) { const st = document.createElement('style'); st.id = 'rd-auto-css'; st.textContent = '.rd-auto{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:18px 0;padding:12px 16px;border:1px solid var(--gold,#f2c230)}.rd-auto b{color:var(--gold,#f2c230);font-size:1.2em}.rd-nexts{display:grid;justify-items:center;gap:4px;margin:26px auto;padding:18px;max-width:440px;border:1px solid currentColor;text-align:center}.rd-nexts b{font-size:1.1em;text-transform:capitalize}.rd-nexts small{opacity:.75}'; document.head.appendChild(st); }
    if (!nx) rateBox();
    if (!auto) return;
    const box = $('#rd-auto'), foot = $('.rd-foot');
    const stop = () => { clearInterval(autoT); autoT = null; if (box) box.hidden = true; };
    box.querySelector('[data-act="auto-cancel"]').onclick = () => { autoStop = ch.id; stop(); autoIo?.disconnect(); box.remove(); };
    autoIo = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || scrollY < 200) return stop();
      if (autoT) return; let n = Math.min(30, Math.max(3, +p.autosecs || 5)); box.hidden = false; $('#rd-auto-n').textContent = n;
      autoT = setInterval(() => { if (!document.body.contains(box)) return stop(); n--; const el = $('#rd-auto-n'); if (el) el.textContent = n;
        if (n <= 0) { stop(); const u = getUser(); if (u && !S.readMarked?.has(ch.id)) { S.readMarked?.add(ch.id); sb.from('read_chapters').upsert({ user_id: u.id, chapter_id: ch.id }); } go(`/leer/${S.series.slug}/${nx.num}`); } }, 1000);
    }, { threshold: .6 });
    autoIo.observe(foot);
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
      $('#rd-flow').insertAdjacentHTML('beforeend', chapterHTML(nx, b, effective(nx.volume_id))); markTerms($(`[data-ch="${nx.id}"]`));
      S.mounted.push(nx); trackView(nx); paintAnnots(); prefetchNext(nx);
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
    document.querySelectorAll('.rd-bar [data-act]').forEach(b => b.onclick = () => ({ toc, prefs: prefsPanel, coms: comments, notes: () => go('/anotaciones/' + S.series.slug), offline: toggleOffline })[b.dataset.act]());
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
      ${opt('cw', { label: 'Avisos de contenido', o: [['show','Mostrar plegable'],['icon','Solo icono'],['hide','No mostrar']] })}
      ${opt('continuous', { label: 'Lectura', o: [['off','Por capítulo'],['volume','Continua dentro del volumen'],['all','Continua entre volúmenes']] })}
      ${p.continuous === 'off' ? opt('autonext', { label: 'Al terminar un capítulo', o: [['true',`Pasar solo al siguiente (${Math.min(30, Math.max(3, +p.autosecs || 5))} s)`],['false','Quedarme al final']] }) : ''}
      <label class="rd-scope"><input type="checkbox" ${localStorage.getItem('obi-season') === 'off' ? '' : 'checked'} data-season> Mostrar temas de temporada en la plataforma</label>
      <label class="rd-scope"><input type="checkbox" ${scoped ? 'checked' : ''} data-scope> Guardar estos ajustes solo para el Volumen ${ch.vol}</label>` });
    if (!pn) return;
    pn.onclick = e => { const b = e.target.closest('button[data-k]'); if (b) setPref(b.dataset.k, b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v); };
    pn.querySelector('[data-k="size"]').oninput = e => setPref('size', +e.target.value, true);
    pn.querySelector('[data-season]').onchange = e => { e.target.checked ? localStorage.removeItem('obi-season') : localStorage.setItem('obi-season', 'off'); dispatchEvent(new Event('obi-season')); };
    pn.querySelector('[data-scope]').onchange = e => { if (e.target.checked) S.remote.per_volume[vid] = { ...S.remote.global }; else delete S.remote.per_volume[vid]; savePrefs(); applyPrefs(); };
  }
  function setPref(k, v, live){
    const vid = S.active.volume_id, tgt = S.remote.per_volume[vid] || S.remote.global;
    tgt[k] = v; savePrefs(); applyPrefs(k); if (k === 'autonext' || k === 'continuous') footer();
    if (!live) { panel().hidden = true; prefsPanel(); }
  }
  async function applyPrefs(k){
    const p = effective(S.active.volume_id), rd = $('.rd');
    Object.assign(rd.dataset, { theme: p.theme, width: p.width, lh: p.lh, align: p.align }); rd.style.setProperty('--rs', p.size + 'px');
    rd.dataset.font = p.font;
    if (k === 'font' || k === 'illus' || k === 'cw') {
      const { block: blk } = currentBlock();
      $('#rd-flow').innerHTML = S.mounted.map(c => chapterHTML(c, S.bodies.get(c.id), effective(c.volume_id))).join(''); markTerms($('#rd-flow'));
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
  document.addEventListener('mouseup', e => { if (!$('.rd') || e.target.closest('.rd-pop,.gl-sheet') || (e.target.closest('.gl') && getSelection().isCollapsed)) return; const m = e.target.closest('mark.an'); if (m && getSelection().isCollapsed) { const a = S.annots.find(z => String(z.id) === m.dataset.an); if (a) return editAnnot(a); } setTimeout(onSelect, 0); });
  document.addEventListener('touchend', e => { if ($('.rd') && !e.target.closest('.rd-pop,.gl-sheet,.gl')) setTimeout(onSelect, 250); });
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

  // ---------- comentarios ----------
  async function comments(){
    const ch = S.active, pn = toggle({ kind: 'coms', body: '<p class="mono">Cargando comentarios…</p>' }); if (!pn) return;
    const [{ data: list }, { data: tm }] = await Promise.all([
      sb.from('comments').select('id,parent_id,user_id,body,spoiler,pinned,para,created_at,profiles(username,avatar_url)').eq('chapter_id', ch.id).order('created_at').limit(500),
      S.teamIds ? { data: null } : sb.from('team_members').select('user_id').eq('team_id', S.series.team_id)]);
    if (tm) S.teamIds = new Set(tm.map(x => x.user_id));
    if (pn.dataset.kind !== 'coms' || S.active !== ch) return;
    const u = getUser(), all = list || [], top = all.filter(c => !c.parent_id).sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)));
    const kids = id => all.filter(c => c.parent_id === id);
    const ago = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? 'hace ' + Math.max(1, m) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
    const one = (c, reply) => `<div class="cm-it${reply ? ' re' : ''}" data-cid="${c.id}"><span class="cm-hd"><b>${esc(c.profiles?.username || 'Lector')}</b>${S.teamIds?.has(c.user_id) ? '<span class="cm-tm">EQUIPO</span>' : ''}${c.pinned ? '<span class="cm-tm pin">FIJADO</span>' : ''}<span class="mono">${ago(c.created_at)}</span></span>
      ${c.spoiler ? `<details class="cm-spd"><summary>Contiene spoiler · toca para ver</summary><p>${esc(c.body)}</p></details>` : `<p>${esc(c.body)}</p>`}
      <span class="cm-ac">${!reply && u ? `<button class="lnk" data-reply="${c.id}">Responder</button>` : ''}${u && c.user_id === u.id ? `<button class="lnk danger" data-cdel="${c.id}">Borrar</button>` : ''}</span></div>`;
    const form = (parent = '') => u ? `<form class="cm-form" data-parent="${parent}"><textarea name="body" rows="${parent ? 2 : 3}" maxlength="2000" required placeholder="${parent ? 'Tu respuesta…' : '¿Qué te pareció este capítulo?'}" aria-label="Comentario"></textarea><span><label class="rd-scope"><input type="checkbox" name="spoiler"> Contiene spoiler</label><button class="btn">${parent ? 'Responder' : 'Publicar'}</button></span></form>` : '<p class="mono"><a href="/entrar">Entra</a> para comentar.</p>';
    pn.innerHTML = `<h4>Comentarios · ${all.length}</h4>${form()}<div class="cm-list">${top.map(c => one(c) + kids(c.id).map(k => one(k, true)).join('')).join('') || '<p class="mono">Sé la primera persona en comentar.</p>'}</div>`;
    pn.querySelectorAll('.cm-form').forEach(f => f.onsubmit = async e => { e.preventDefault(); const b = f.querySelector('.btn'); b.disabled = true;
      const { error } = await sb.from('comments').insert({ chapter_id: ch.id, user_id: u.id, body: f.body.value.trim(), spoiler: f.spoiler.checked, parent_id: f.dataset.parent ? +f.dataset.parent : null });
      b.disabled = false; if (error) return toast(error.message); toast('Comentario publicado'); pn.hidden = true; comments(); });
    pn.querySelectorAll('[data-reply]').forEach(b => b.onclick = () => { const it = b.closest('.cm-it'); if (it.nextElementSibling?.classList.contains('cm-form')) return; it.insertAdjacentHTML('afterend', form(b.dataset.reply)); const f = it.nextElementSibling; f.body.focus();
      f.onsubmit = async e => { e.preventDefault(); const { error } = await sb.from('comments').insert({ chapter_id: ch.id, user_id: u.id, body: f.body.value.trim(), spoiler: f.spoiler.checked, parent_id: +b.dataset.reply }); if (error) return toast(error.message); toast('Respuesta publicada'); pn.hidden = true; comments(); }; });
    pn.querySelectorAll('[data-cdel]').forEach(b => b.onclick = async () => { if (!confirm('¿Borrar tu comentario?')) return; const { error } = await sb.from('comments').delete().eq('id', b.dataset.cdel); if (error) return toast(error.message); pn.hidden = true; comments(); });
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

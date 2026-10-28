// Lector de El Obi del Lector: por capítulo o continuo, fuentes EPUB, progreso exacto, leídos, historial, sin conexión y anotaciones.
import { confirmObi, inputObi } from './obi-dialog.js';
const OFF_CACHE = 'obi-offline-v1', OFF_INDEX = 'obi-offline-index', PREF_KEY = 'obi-reader-prefs';
import { cleanInline, renderBlock, warningsHTML, teaserHTML } from './blocks.js?v=2';
import { attachPublicCredits, creditsHTML, installCreditImageFallback } from './public-collaboration-credits.js?v=1';
import { readerPrefsKey, readReaderPrefs, readPendingReaderPrefs, stageReaderPrefs, acknowledgeReaderPrefs, sameReaderAccount, readingProgressKey, readingProgressPrefix, readerProgressKeys } from './reader-pref-cache.js?v=1';
import { SECTION_LABELS } from './section-types.js?v=1';
import { adjacentChapter, mergeChapterMetadata } from './reader-navigation.js?v=1';
const DEF = { theme: 'auto', size: 20, font: 'original', width: 'normal', lh: 'comodo', align: 'izquierda', para: 'espacio', illus: true, continuous: 'off', cw: 'show', autonext: false, awake: true };
const COLORS = { gold: '#f2c230', rose: '#f29bb0', sky: '#8cc3f2', mint: '#9fdcb0' };
const SEC_LABEL = SECTION_LABELS;

export function createReader(ctx){
  installCreditImageFallback();
  const { sb, app, $, esc, toast, go, getUser, url } = ctx;
  const media = p => p ? (/^https?:/.test(p) ? p : `${url}/storage/v1/object/public/obi-media/${encodeURI(p)}`) : '';
  const S = { series: null, chapters: [], vols: [], bodies: new Map(), bodyVersions: new Map(), prefs: null, remote: null, mounted: [], active: null, annots: [], saveT: 0, readMarked: new Set(), historyLogged: new Set() };

  // ---------- preferencias ----------
  const loadLocal = userId => readPendingReaderPrefs(localStorage, userId) || readReaderPrefs(localStorage, userId);
  async function loadPrefs(){
    const uid=getUser()?.id || null, request=(S.prefsRequest || 0)+1, version=S.prefsVersion || 0;
    S.prefsRequest=request;
    S.remote=loadLocal(uid);
    S.prefsOwner=uid;
    // El lector descargado no debe esperar la sincronización de preferencias.
    if (uid && navigator.onLine) {
      // Recuperar antes de leer del servidor un cambio local que quedó pendiente.
      const pending = readPendingReaderPrefs(localStorage, uid);
      if (pending && sameReaderAccount(getUser()?.id, uid) && S.prefsRequest === request) {
        try {
          const { error } = await sb.from('reader_prefs').upsert({ user_id: uid, global: pending.global, per_volume: pending.per_volume, updated_at: new Date().toISOString() });
          if (!error) acknowledgeReaderPrefs(localStorage, uid, pending);
          else console.warn('Preferencias pendientes', error.message);
        } catch (error) { console.warn('Preferencias pendientes', error.message); }
      }
      const { data, error } = await sb.from('reader_prefs').select('global,per_volume').eq('user_id', uid).maybeSingle();
      if (!error && data && !readPendingReaderPrefs(localStorage, uid) && sameReaderAccount(getUser()?.id, uid) && sameReaderAccount(S.prefsOwner, uid) && S.prefsRequest === request && (S.prefsVersion || 0) === version) {
        S.remote={ global:data.global || {}, per_volume:data.per_volume || {} };
        try { localStorage.setItem(readerPrefsKey(uid), JSON.stringify(S.remote)); } catch {}
      }
    }
  }
  const effective = volId => ({ ...DEF, ...(S.series?.teams?.reader_defaults || {}), ...S.remote.global, ...(S.remote.per_volume[volId] || {}) });
  let prefT = 0;
  function savePrefs(){
    S.prefsVersion=(S.prefsVersion || 0)+1;
    const uid=getUser()?.id || null;
    const snapshot=JSON.parse(JSON.stringify(S.remote));
    if (uid) {
      if (!stageReaderPrefs(localStorage, uid, snapshot)) console.warn('No se pudieron guardar preferencias locales');
    } else {
      try { localStorage.setItem(readerPrefsKey(uid), JSON.stringify(snapshot)); } catch {}
    }
    clearTimeout(prefT);
    prefT=setTimeout(() => {
      if (uid && sameReaderAccount(getUser()?.id, uid) && sameReaderAccount(S.prefsOwner, uid))
        sb.from('reader_prefs').upsert({ user_id: uid, global: snapshot.global, per_volume: snapshot.per_volume, updated_at: new Date().toISOString() }).then(({error}) => {
          if (error) console.warn('Preferencias', error.message);
          else acknowledgeReaderPrefs(localStorage, uid, snapshot);
        }, () => {});
    },800);
  }

  // ---------- datos ----------
  // Ficha de la obra (serie + lista de capítulos + volúmenes). Antes eran 2 viajes encadenados (serie → capítulos);
  // ahora los tres van juntos filtrando por el slug, y la última copia queda guardada para abrir al instante la próxima vez.
  const META_KEY = slug => 'obi-meta-' + slug;
  const CH_COLS = 'id,num,vol,title,section_type,volume_id,content_warnings,teaser,teaser_on,updated_at';
  function fetchMeta(slug){
    return Promise.all([
      sb.from('series').select('id,slug,title,team_id,teams(name,slug,status,avatar_path,settings,reader_defaults)').eq('slug', slug).maybeSingle(),
      sb.from('chapters').select(CH_COLS + ',series!inner(slug)').eq('series.slug', slug).is('deleted_at', null).order('num'),
      sb.from('volumes').select('id,num,title,epub_fonts,series!inner(slug)').eq('series.slug', slug).is('deleted_at', null).order('num')
    ]).then(async ([a, b, c]) => { const e = a.error || b.error || c.error; if (e) throw e; if (!a.data) return null;
      const strip = l => (l || []).map(({ series, ...x }) => x);
      const m = { series: a.data, chapters: strip(b.data), vols: strip(c.data), at: Date.now() };
      try { const saved = { ...m, series: { ...m.series } }; delete saved.series.publicCredits; const j = JSON.stringify(saved); if (j.length < 400000) localStorage.setItem(META_KEY(slug), j); } catch {}
      return m; });
  }
  const cachedMeta = slug => { try { return JSON.parse(localStorage.getItem(META_KEY(slug))); } catch { return null; } };
  function setSeries(m, offGl){
    const sameSeries = S.series?.id === m.series.id;
    Object.assign(S, { series: m.series, chapters: m.chapters || [], vols: m.vols || [], nextAt: null, teamIds: null,
      bodies: sameSeries ? S.bodies : new Map(), bodyVersions: sameSeries ? S.bodyVersions : new Map(),
      active: sameSeries ? S.active : null, mounted: sameSeries ? S.mounted : [], loadingNext: false,
      annots: [], gloss: [], glMap: new Map(), glRe: undefined, readSet: null });
  }
  async function loadSeries(slug, num, stillCurrent = () => true){
    if (S.series?.slug === slug && (num == null || S.chapters.some(c => c.num === num))) return true;
    // Sin conexión: no consultar Supabase; la descarga tiene sus propios metadatos íntegros.
    // Esto evita esperas de red incluso si la petición nunca rechaza.
    if (!navigator.onLine) {
      const local = await offlineMeta(slug);
      if (!stillCurrent() || !local?.series || (num != null && !local.chapters?.some(c => c.num === num))) return false;
      setSeries(local);
      const gl = local.gloss || [];
      Object.assign(S, { nextAt: null, gloss: gl, glMap: new Map(gl.map(g => [g.term.toLowerCase(), g])), glRe: undefined });
      S.extras = Promise.resolve();
      return true;
    }
    let m = null, offGl = null; const hit = cachedMeta(slug);
    const hasHit = !!(hit?.series && (num == null || hit.chapters?.some(c => c.num === num)));
    if (hasHit) m = hit;
    else {
      try { m = await fetchMeta(slug); }
      catch { const o = await offlineMeta(slug); if (o) { m = { series: o.series, chapters: o.chapters, vols: o.vols }; offGl = o.gloss || null; } }
    }
    if (!stillCurrent() || !m?.series) return false;
    setSeries(m);
    const s = S.series;
    // Los créditos públicos se verifican con el servidor sin retrasar la aparición del texto.
    // La copia local nunca guarda colaboradores: hasta recibir respuesta solo muestra al equipo principal.
    s.publicCredits = null;
    S.creditsFresh = attachPublicCredits(sb, [s]).then(() => {
      if (S.series !== s || !$('.rd')) return;
      const html = creditsHTML(s, { esc, media, mode: 'reader' });
      document.querySelectorAll('.rd-ch').forEach(art => {
        const old = art.querySelector('.obi-credits');
        if (old) old.outerHTML = html;
        else if (html) art.insertAdjacentHTML('afterbegin', html);
      });
    }).catch(() => {});
    if (hasHit) {
      // Revalidar títulos, permisos y revisiones en segundo plano sin sustituir referencias del lector.
      S.metaFresh = fetchMeta(slug).then(n => {
        if (!n || S.series !== s) return n;
        const act = S.active;
        const merged = mergeChapterMetadata(S.chapters, n.chapters, S.bodies, S.bodyVersions);
        Object.assign(s, n.series);
        S.chapters = merged.chapters;
        S.vols = n.vols;
        if (act && merged.changed.has(act.id) && S.mounted.length === 1 && scrollY < 400) {
          body(act).then(b => {
            if (!b || S.series !== s || S.active?.id !== act.id || S.mounted.length !== 1 || scrollY >= 400) return;
            const art = $('[data-ch="' + act.id + '"]');
            if (art) {
              art.outerHTML = chapterHTML(act, b, effective(act.volume_id));
              markTerms($('[data-ch="' + act.id + '"]'));
              paintAnnots(act.id);
            }
          }).catch(() => {});
        }
        if (S.active && $('.rd')) footer();
        return n;
      }).catch(() => null);
    }
    // El calendario y el glosario tampoco son requisitos para abrir el capítulo.
    S.extras = Promise.all([
      sb.from('schedule').select('at').eq('series_id', s.id).gte('at', new Date().toISOString()).order('at').limit(1).then(r => r.data?.[0]?.at || null, () => null),
      sb.from('glossary_terms').select('term,category,definition').eq('series_id', s.id).then(r => r.data || [], () => [])
    ]).then(([at, gl0]) => { if (S.series !== s) return; const gl = gl0.length ? gl0 : (offGl || []); Object.assign(S, { nextAt: at, gloss: gl, glMap: new Map(gl.map(g => [g.term.toLowerCase(), g])), glRe: undefined }); });
    return true;
  }
  const early = new Map(); // slug/num → promesa del texto pedido en paralelo con la ficha
  function bodyBySlug(slug, num){
    const k = slug + '/' + num; if (early.has(k)) return early.get(k);
    const p = sb.from('chapters').select('id,body,series!inner(slug)').eq('series.slug', slug).eq('num', num).is('deleted_at', null).maybeSingle()
      .then(r => r.error ? null : r.data, () => null);
    early.set(k, p); setTimeout(() => early.delete(k), 60000); return p;
  }
  const BC = 'obi-bodies', BC_MAX = 120, bKey = ch => '/b/' + ch.id + '?u=' + encodeURIComponent(ch.updated_at || '');
  async function cacheGet(ch){ if (!ch.updated_at || !('caches' in window)) return null; try { const r = await (await caches.open(BC)).match(bKey(ch)); return r ? await r.json() : null; } catch { return null; } }
  function cachePut(ch, b){ if (!ch.updated_at || !('caches' in window) || !b) return;
    caches.open(BC).then(async c => { const ks = await c.keys(); await Promise.all(ks.filter(k => k.url.includes('/b/' + ch.id + '?')).map(k => c.delete(k)));
      await c.put(bKey(ch), new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } }));
      if (ks.length > BC_MAX) await Promise.all(ks.slice(0, ks.length - BC_MAX).map(k => c.delete(k))); }).catch(() => {}); }
  async function body(ch){
    const rev = ch.updated_at || null, seriesId = S.series?.id;
    if (S.bodies.has(ch.id) && S.bodyVersions.get(ch.id) === rev) return S.bodies.get(ch.id);
    S.bodies.delete(ch.id); S.bodyVersions.delete(ch.id);
    // Una descarga iniciada antes de una revisión o de cambiar de obra no puede contaminar el caché actual.
    const remember = b => {
      if (!b || S.series?.id !== seriesId ||
          !S.chapters.some(c => c.id === ch.id && (c.updated_at || null) === rev)) return null;
      S.bodies.set(ch.id, b); S.bodyVersions.set(ch.id, rev);
      return b;
    };
    if (!navigator.onLine) {
      return remember(await offlineBody(ch) || await cacheGet(ch));
    }
    const hit = await cacheGet(ch);
    if (hit) return remember(hit);
    const ek = (S.series?.slug || '') + '/' + ch.num;
    if (early.has(ek)) {
      const d = await early.get(ek); early.delete(ek);
      if (d?.id === ch.id && d.body) {
        const saved = remember(d.body); if (saved) cachePut(ch, saved);
        return saved;
      }
    }
    let b = null;
    try { const { data, error } = await sb.from('chapters').select('body').eq('id', ch.id).maybeSingle(); if (error) throw error; b = data?.body ?? null; }
    catch { b = await offlineBody(ch); }
    if (!b) b = await offlineBody(ch);
    const saved = remember(b);
    if (saved) cachePut(ch, saved);
    return saved;
  }
  // texto del siguiente capítulo + sus 2 primeras ilustraciones (salvo modo ahorro de datos)
  // No descargar por anticipado el capítulo en conexiones lentas, ahorro de datos
  // o pestañas ocultas. La navegación normal sigue cargando el capítulo al abrirlo.
  const canPrefetch = () => navigator.onLine && !document.hidden && !navigator.connection?.saveData &&
    !/(^|-)2g$/i.test(navigator.connection?.effectiveType || '');
  const prefetchNext = ch => { const n = nextOf(ch); if (!n || S.bodies.has(n.id) || !canPrefetch()) return;
    (window.requestIdleCallback || (fn => setTimeout(fn, 250)))(() => {
      if (!canPrefetch()) return;
      body(n).then(b => { if (!Array.isArray(b) || !canPrefetch() || effective(n.volume_id).illus === false) return;
        b.filter(x => x.url || x.src).slice(0, 2).forEach(x => { const i = new Image(); i.decoding = 'async'; i.src = media(x.url || x.src); }); }).catch(() => {});
    });
  };
  const nextOf = ch => adjacentChapter(S.chapters, ch, 1);
  const prevOf = ch => adjacentChapter(S.chapters, ch, -1);
  const volOf = ch => S.vols.find(v => v.id === ch.volume_id) || S.vols.find(v => v.num === ch.vol);

  // ---------- fuentes EPUB ----------
  const fontsDone = new Set();
  function familiesOf(vol){ return [...new Set((vol?.epub_fonts || []).map(f => f.family))]; }
  function ensureFonts(vol){
    if (!vol || fontsDone.has(vol.id) || !(vol.epub_fonts || []).length) return;
    fontsDone.add(vol.id);
    const css = vol.epub_fonts.map(f => `@font-face{font-family:"obi-${vol.num}-${f.family.replace(/["']/g, '')}";src:url("${f.url}");font-style:${f.style === 'oblique' ? 'oblique' : f.style || 'normal'};font-weight:${f.weight || 'normal'};font-display:swap}`).join('');
    const st = document.createElement('style'); st.dataset.vol = vol.id; st.textContent = css; document.head.appendChild(st);
  }
  // rol de cada fuente: el que guardó el importador (use) o, en volúmenes viejos, una pista por el nombre
  const HEAD_RE = /gothic|goth|title|head|midashi|antique|heavy|black|bold|display|ゴシック|見出し/i;
  function fontRoles(vol){ const fl = familiesOf(vol), fs = vol?.epub_fonts || [];
    let body = fs.find(f => (f.use || []).includes('body'))?.family, head = fs.find(f => (f.use || []).includes('heading'))?.family;
    if (!fs.some(f => f.use)) { head = fl.find(f => HEAD_RE.test(f)); body = fl.length === 1 && !head ? fl[0] : fl.find(f => f !== head && !HEAD_RE.test(f) && fl.length <= 2); }
    return { body, head }; }
  function fontVars(vol, p){
    // comillas simples: este valor va dentro de style="…" y una comilla doble rompía el atributo (la fuente del EPUB no se aplicaba)
    const nm = fam => `'obi-${vol.num}-${fam.replace(/["']/g, '')}'`, fb = "Literata,'Shippori Mincho B1',serif";
    const v = familiesOf(vol).map((fam, i) => `--f${i}:${p.font === 'original' ? nm(fam) + ',' : ''}inherit`);
    if (p.font === 'original') { const r = fontRoles(vol); if (r.body) v.push(`--fb:${nm(r.body)},${fb}`); if (r.head) v.push(`--fh:${nm(r.head)},${fb}`); }
    return v.join(';');
  }

  // ---------- render de bloques ----------
  const block = (b, i, p) => renderBlock(b, i, { media, illus: p.illus });
  const nextWhen = () => S.nextAt ? new Date(S.nextAt).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
  // Crédito público: principal y colaboradores activos, respetando cada ajuste de logo.
  function teamHTML(){
    return creditsHTML(S.series, { esc, media, mode: 'reader' });
  }
  function chapterHTML(ch, blocks, p){
    const vol = volOf(ch); ensureFonts(vol);
    const label = (SEC_LABEL[ch.section_type] || 'Cap.') + (ch.section_type === 'Capítulo' || !ch.section_type ? ' ' + ch.num : '');
    return `<article class="rd-ch" lang="es" data-ch="${ch.id}" style="${vol ? fontVars(vol, p) : ''}">
      ${teamHTML()}
      <header class="rd-head"><span class="mono">Volumen ${ch.vol} · ${esc(label)}</span><h2${(() => { const f = (blocks || []).find(b => (b.type || b.t) === 'heading')?.html?.match(/data-epub-family="(\d+)"/)?.[1]; return f ? ` style="font-family:var(--f${f})"` : ''; })()}>${esc(ch.title)}</h2></header>
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
  const idle = fn => (window.requestIdleCallback || (f => setTimeout(f, 16)))(fn);
  // marca por tandas de ~8 ms en ratos libres para no congelar la apertura
  function markTerms(root){
    const re = glossRe(); if (!re || !root) return;
    const els = [...root.querySelectorAll('.rd-body p, .rd-body blockquote, .rd-body aside.tn')]; let i = 0;
    const run = () => { const t0 = performance.now(); while (i < els.length && performance.now() - t0 < 8) { const el = els[i++]; if (el.isConnected) markEl(el, re); } if (i < els.length) idle(run); };
    idle(run);
  }
  function markEl(el, re){
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
  // ---------- modo zen y pantalla encendida ----------
  function zen(on = !document.body.classList.contains('rd-zen')){
    document.body.classList.toggle('rd-zen', on); if (on) { const pn = panel(); if (pn) pn.hidden = true; }
    if (on) document.documentElement.requestFullscreen?.().catch(() => {}); else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('rd-zen'); });
  let wl = null, wlP = false, wlT = 0;
  async function wake(){
    clearTimeout(wlT); wlT = setTimeout(() => wl?.release(), 300000); // se suelta tras 5 min sin desplazarse
    if (wl || wlP || !('wakeLock' in navigator) || document.visibilityState !== 'visible' || !$('.rd') || !S.active || effective(S.active.volume_id).awake === false) return;
    wlP = true; try { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } catch {} wlP = false;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('.rd')) wake(); });
  // ← → capítulo anterior/siguiente · Z modo zen · Esc cierra panel o sale del zen
  document.addEventListener('keydown', e => {
    if (!$('.rd') || !S.active || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    const pn = panel();
    if (e.key === 'Escape') { if (pn && !pn.hidden) pn.hidden = true; else if (document.body.classList.contains('rd-zen')) zen(false); return; }
    if (pn && !pn.hidden) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const c = e.key === 'ArrowRight' ? nextOf(S.active) : prevOf(S.active); if (c) { e.preventDefault(); go(`/leer/${S.series.slug}/${c.num}`); } }
    if (e.key === 'z' || e.key === 'Z') zen();
  });

  // ---------- puente de TTS ----------
  // Preferencias efectivas (equipo/global/volumen) y navegación segura: el TTS no necesita leer la base de datos.
  function ttsInfo(chapterId){
    if (!S.series || !S.remote || !$('.rd')) return null;
    const ch = S.chapters.find(c => String(c.id) === String(chapterId));
    if (!ch) return null;
    const p = effective(ch.volume_id), next = nextOf(ch);
    return { id: ch.id, num: ch.num, slug: S.series.slug, user: getUser()?.id || 'guest',
      seconds: Math.min(30, Math.max(3, Number(p.autosecs) || 5)),
      continuous: p.continuous, autonext: p.autonext !== false,
      canContinue: !!next && p.continuous !== 'off' && (p.continuous === 'all' || next.vol === ch.vol),
      next: next ? { id: next.id, num: next.num, vol: next.vol } : null };
  }
  function ttsNextChapter(chapterId, chapterNum){
    const inf = ttsInfo(chapterId);
    if (!inf?.next || inf.next.num !== chapterNum || !location.pathname.startsWith(`/leer/${inf.slug}/`) || !S.mounted.some(c => String(c.id) === String(chapterId))) return false;
    go(`/leer/${inf.slug}/${chapterNum}`); return true;
  }
  window.__obiReaderTTS = { info: ttsInfo, nextChapter: ttsNextChapter };
  addEventListener('obi-tts-state', () => { if (S.active && $('.rd')) footer(); });

  // ---------- vista ----------
  // al pasar el cursor (o tocar) un enlace al lector: se piden ficha y texto antes del clic
  async function warm(slug, num){ if (!navigator.onLine || !slug || !num) return;
    const m = S.series?.slug === slug ? { chapters: S.chapters } : cachedMeta(slug), ch = m?.chapters?.find(c => c.num === num);
    if (ch) { if (S.bodies.has(ch.id) || await cacheGet(ch)) return; const d = await bodyBySlug(slug, num); if (d?.body && d.id === ch.id) cachePut(ch, d.body); return; }
    bodyBySlug(slug, num); fetchMeta(slug).catch(() => {}); }
  async function open(slug, num){
    const openingUser = getUser()?.id || null, openingId = (S.openId || 0) + 1;
    S.openId = openingId;
    const stillOpening = () => S.openId === openingId &&
      sameReaderAccount(getUser()?.id, openingUser) &&
      location.pathname === '/leer/' + slug + '/' + num;
    // Los observadores de la lectura anterior no deben montar texto durante otra navegación.
    io?.disconnect(); activeIo?.disconnect(); autoIo?.disconnect(); clearInterval(autoT);
    S.loadingNext = false;
    app.innerHTML = '<p class="mono">Abriendo capítulo…</p>';
    if (navigator.onLine && S.series?.slug !== slug && !cachedMeta(slug)) bodyBySlug(slug, num); // primera vez: texto en paralelo con la ficha
    const prefsUid = getUser()?.id || null;
    if (S.prefsOwner !== prefsUid) { clearTimeout(prefT); S.remote=null; }
    const prefsP = S.remote ? null : loadPrefs();
    if (!(await loadSeries(slug, num, stillOpening))) { if (!stillOpening()) return; app.innerHTML = '<h1>Serie no encontrada</h1><p><a href="/catalogo">Ir al catálogo</a></p>'; return; }
    if (!stillOpening()) return;
    const ch = S.chapters.find(c => c.num === num);
    if (!ch) { const { data: L } = navigator.onLine ? await sb.rpc('lock_info', { p_slug: slug, p_num: num }).then(x => x, () => ({ data: null })) : { data: null }; if (!stillOpening()) return; if (L) { const P = await import('/patreon.js?v=1'); if (!stillOpening()) return; app.innerHTML = P.lockHTML(L, esc, slug); app.querySelector('#lk-link')?.addEventListener('click', () => P.start(sb, url, 'link', null, toast)); return; } app.innerHTML = '<h1>Capítulo no disponible</h1><p>Puede que aún no se publique. <a href="/serie/' + esc(slug) + '">Volver a la obra</a></p>'; return; }
    const annP = fetchAnnots([ch.id]);
    // ajustes y posición del servidor no frenan la apertura: si tardan más de 300 ms se usa lo de este dispositivo y lo del servidor se aplica al llegar
    const quick = (p, fb) => Promise.race([p, new Promise(r => setTimeout(() => r(fb()), 300))]);
    const localPos = () => { try { return JSON.parse(localStorage.getItem(posKey(S.series.id))); } catch { return null; } };
    let late = false; prefsP?.then(() => { if (late && stillOpening() && sameReaderAccount(getUser()?.id, prefsUid) && S.active?.id === ch.id && $('.rd')) applyPrefs(); });
    const [b, , pos] = await Promise.all([body(ch), quick(prefsP, () => (late = true, null)), quick(fetchPos(), localPos)]);
    if (!stillOpening()) return;
    if (!b) { app.innerHTML = '<h1>Sin conexión</h1><p>Este capítulo no está descargado. <a href="/descargas">Ver mis descargas</a></p>'; return; }
    const p = effective(ch.volume_id);
    S.mounted = [ch]; S.active = ch; S.activeOwner = openingUser; S.annots = []; S.lastY = null; trackView(ch);
    const more = `<button class="btn ghost" data-act="coms">Comentarios</button><button class="btn ghost" data-act="notes">Anotaciones</button><button class="btn ghost" data-act="offline">${isVolOffline(ch) ? '✓ Descargado' : 'Descargar volumen'}</button>`;
    app.innerHTML = `<div class="rd" data-theme="${p.theme}" data-width="${p.width}" data-lh="${p.lh}" data-align="${p.align}" data-para="${p.para}" data-font="${p.font}" style="--rs:${p.size}px">
      <nav class="rd-bar">
        <span class="rd-where"><a href="/serie/${esc(slug)}" class="rd-back">‹ ${esc(S.series.title)}</a><span class="rd-left mono"></span></span>
        <div class="rd-tools">
          <button class="btn ghost" data-act="toc" aria-label="Índice">Índice</button>
          <button class="btn ghost" data-act="prefs" aria-label="Ajustes de lectura">Aa</button>
          <button class="btn ghost" data-act="zen" title="Modo zen · tecla Z">Zen</button>
          <span class="rd-wide">${more}</span>
          <details class="rd-more"><summary class="btn ghost" aria-label="Más opciones">⋯</summary><div class="rd-more-m">${more}</div></details>
        </div>
      </nav>
      <div class="rd-prog" aria-hidden="true"><i></i></div>
      <div class="rd-panel" hidden></div>
      <p id="rd-resume" class="rd-resume" hidden></p>
      <p id="rd-earlier" hidden></p>
      <div id="rd-flow">${chapterHTML(ch, b, p)}</div>
      <div id="rd-sentinel"></div>
      <footer class="rd-foot"></footer>
      <div class="rd-pop" hidden></div>
      <div class="gl-sheet" hidden></div>
      <button class="rd-zen-x" data-act="zen">Salir del modo zen</button>
    </div>`;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    S.pos = pos; restorePosition(ch, pos); resumeBar(ch, pos); bindBar(); footer(); progress();
    clearTimeout(S.saveT); S.saveT = setTimeout(saveProgress, 2500); // abrir el capítulo ya cuenta como «dónde voy»
    logHistory(ch); prefetchNext(ch);
    observe(); wake();
    annP.then(l => { if (!stillOpening() || !S.mounted.some(c => c.id === ch.id)) return; S.annots = S.annots.filter(a => a.chapter_id !== ch.id).concat(l); paintAnnots(ch.id); });
    S.extras?.then(() => { if (!stillOpening() || !$('#rd-flow')) return; markTerms($('#rd-flow')); if (S.nextAt && !nextOf(S.active)) footer(); });
  }
  let autoIo, autoT, autoStop = null;
  const untilTxt = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
  async function rateBox(){
    const el = $('#rd-rate'); if (!el) return;
    // Calificar requiere servidor; en modo avión no bloquear ni iniciar RPC.
    if (!navigator.onLine) { el.innerHTML = '<p class="mono">Podrás calificar esta obra cuando recuperes la conexión.</p>'; return; }
    if (!document.getElementById('rd-rate-css')) { const st = document.createElement('style'); st.id = 'rd-rate-css'; st.textContent = '.rd-rate{display:grid;justify-items:center;gap:6px;margin:26px auto 8px;text-align:center}.rd-rate h3{margin:0;font-size:1.05em}.rd-rate .st{display:flex}.rd-rate .st button{width:44px;height:48px;padding:0;background:none;border:0;font-size:30px;line-height:1;color:currentColor;opacity:.25;cursor:pointer}.rd-rate .st button.on{color:var(--gold,#f2c230);opacity:1}.rd-rate .st:hover button{color:var(--gold,#f2c230);opacity:1}.rd-rate .st button:hover~button{color:currentColor;opacity:.25}.rd-rate small{opacity:.75}'; document.head.appendChild(st); }
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
    const auto = !cont && nx && p.autonext !== false && autoStop !== ch.id && !window.__obiTTS?.isActive?.();
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
    const openingId = S.openId, flow = $('#rd-flow');
    io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || openingId !== S.openId || !flow?.isConnected) return;
      const last = S.mounted[S.mounted.length - 1], nx = nextOf(last), p = effective(last.volume_id);
      if (p.continuous === 'off' || !nx || (p.continuous === 'volume' && nx.vol !== last.vol) || S.loadingNext) return;
      S.loadingNext = true;
      try {
        const b = await body(nx);
        if (!b || openingId !== S.openId || !flow.isConnected || $('#rd-flow') !== flow ||
            S.mounted[S.mounted.length - 1]?.id !== last.id || !S.chapters.some(c => c.id === nx.id)) return;
        flow.insertAdjacentHTML('beforeend', chapterHTML(nx, b, effective(nx.volume_id)));
        const art = $('[data-ch="' + nx.id + '"]');
        markTerms(art);
        S.mounted.push(nx); trackView(nx); prefetchNext(nx);
        fetchAnnots([nx.id]).then(l => {
          if (openingId !== S.openId || !art?.isConnected) return;
          S.annots = S.annots.filter(a => a.chapter_id !== nx.id).concat(l); paintAnnots(nx.id);
        });
        activeIo.observe(art); trimMounted();
      } finally {
        if (openingId === S.openId) S.loadingNext = false;
      }
    }, { rootMargin: '800px 0px' });
    io.observe($('#rd-sentinel'));
    activeIo = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || openingId !== S.openId) return;
      const ch = S.chapters.find(c => c.id === e.target.dataset.ch);
      if (ch && ch.id !== S.active?.id) { S.active = ch; history.replaceState({}, '', '/leer/' + S.series.slug + '/' + ch.num); logHistory(ch); footer(); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.rd-ch').forEach(a => activeIo.observe(a));
    removeEventListener('scroll', onScroll); addEventListener('scroll', onScroll, { passive: true });
  }
  // lectura continua: máximo 3 capítulos en la página; los que quedan muy atrás se retiran sin mover lo que se está leyendo
  function trimMounted(){
    while (S.mounted.length > 3 && S.mounted[0] !== S.active) {
      const old = S.mounted[0], el = $(`[data-ch="${old.id}"]`);
      if (el && el.getBoundingClientRect().bottom > -innerHeight) break;
      const ref = $(`[data-ch="${S.active.id}"]`), t = ref?.getBoundingClientRect().top;
      if (el) { activeIo.unobserve(el); el.remove(); }
      S.mounted.shift(); S.annots = S.annots.filter(a => a.chapter_id !== old.id);
      const up = $('#rd-earlier'); up.hidden = false; up.innerHTML = `<a class="btn ghost" href="/leer/${S.series.slug}/${old.num}">‹ Volver a ${esc(old.title)}</a>`;
      if (ref) { const d = ref.getBoundingClientRect().top - t; if (d) scrollBy(0, d); }
    }
  }

  // ---------- progreso exacto, leídos e historial ----------
  const posKey = (id, uid = getUser()?.id) => readingProgressKey(id, uid);
  function currentBlock(){
    const art = $(`[data-ch="${S.active.id}"]`); if (!art) return { block: 0, pct: 0 };
    // búsqueda binaria: ~10 mediciones en lugar de una por párrafo
    const els = art.querySelectorAll('[data-b]'); let lo = 0, hi = els.length - 1, at = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (els[m].getBoundingClientRect().bottom > 80) { at = m; hi = m - 1; } else lo = m + 1; }
    const blk = els.length ? +els[at].dataset.b : 0;
    const r = art.getBoundingClientRect(), pct = Math.min(1, Math.max(0, (innerHeight - r.top) / r.height));
    return { block: blk, pct };
  }
  function onScroll(){
    if (!document.body.contains($('.rd'))) { removeEventListener('scroll', onScroll); wl?.release(); return; }
    clearTimeout(S.saveT); S.saveT = setTimeout(saveProgress, 1200);
    if (!S.raf) S.raf = requestAnimationFrame(frame);
  }
  // barra que se esconde al bajar y vuelve al subir (o al llegar al final)
  function frame(){
    S.raf = 0; const rd = $('.rd'); if (!rd || !S.active) return;
    const y = scrollY; if (S.lastY == null) S.lastY = y; const d = y - S.lastY;
    if (Math.abs(d) > 6) { S.lastY = y; rd.dataset.bar = d > 0 && y > 240 && panel().hidden && pop().hidden ? 'hide' : ''; }
    if (innerHeight + y >= document.documentElement.scrollHeight - 40) rd.dataset.bar = '';
    progress(); wake();
  }
  function progress(){
    const art = S.active && $(`[data-ch="${S.active.id}"]`), fill = $('.rd-prog i'), left = $('.rd-left'); if (!art || !fill) return;
    const r = art.getBoundingClientRect(), pct = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    fill.style.transform = `scaleX(${pct})`;
    art._w ??= (art.querySelector('.rd-body')?.textContent.match(/\S+/g) || []).length;
    const min = Math.ceil(art._w * (1 - pct) / 230);
    if (left) left.textContent = pct > .98 ? 'Fin del capítulo' : min <= 1 ? 'Menos de 1 min' : `≈ ${min} min restantes`;
  }
  async function saveProgress(){
    const ch = S.active;
    if (!ch || !S.series || !sameReaderAccount(S.activeOwner, getUser()?.id) || !$(`[data-ch="${ch.id}"]`)) return; // ya no está en pantalla: no pisar el progreso con «párrafo 0»
    clearTimeout(S.saveT);
    const { block: blk, pct } = currentBlock(), p = effective(ch.volume_id), at = new Date().toISOString(), user = getUser();
    const rec = { chapter_id: ch.id, num: ch.num, block: blk, pct, at, mode: p.continuous === 'off' ? 'chapter' : 'continuous', pending: !!user };
    try { localStorage.setItem(posKey(S.series.id), JSON.stringify(rec)); } catch {}
    if (!user) return;
    pushPos(user, S.series.id, rec);
    if (pct > 0.95 && !S.readMarked.has(ch.id)) { S.readMarked.add(ch.id); pushRead(user, ch.id); }
  }
  // sin conexión: el progreso queda marcado como pendiente y se sube al volver internet (syncPending)
  function pushPos(user, sid, rec){
    if (!navigator.onLine) return Promise.resolve(false);
    return sb.from('reading_progress').upsert({ user_id: user.id, series_id: sid, chapter_num: rec.num, chapter_id: rec.chapter_id, block: rec.block, pct: rec.pct, mode: rec.mode || 'chapter', updated_at: rec.at }, { onConflict: 'user_id,series_id' })
      .then(({ error }) => { if (error) { console.warn('progreso', error.message); return false; }
        try { const key = posKey(sid, user.id), cur = JSON.parse(localStorage.getItem(key)); if (cur?.at === rec.at) { cur.pending = false; localStorage.setItem(key, JSON.stringify(cur)); } } catch {} return true; }, () => false);
  }
  const RQ = user => 'obi-read-q:' + user.id;
  function pushRead(user, chId){
    const queue = () => { try { const a = JSON.parse(localStorage.getItem(RQ(user)) || '[]'); if (!a.includes(chId)) a.push(chId); localStorage.setItem(RQ(user), JSON.stringify(a.slice(-500))); } catch {} };
    if (!navigator.onLine) return queue();
    sb.from('read_chapters').upsert({ user_id: user.id, chapter_id: chId }).then(({ error }) => { if (error) queue(); }, queue);
  }
  async function syncPending(){
    const user = getUser(); if (!user || !navigator.onLine) return 0; let n = 0; const keys = [];
    keys.push(...readerProgressKeys(localStorage,user.id));
    for (const k of keys) { if (getUser()?.id !== user.id) return n; let r; try { r = JSON.parse(localStorage.getItem(k)); } catch { continue; } if (r?.pending && r.chapter_id && await pushPos(user, k.slice(readingProgressPrefix(user.id).length), r)) n++; }
    let q = []; try { q = JSON.parse(localStorage.getItem(RQ(user)) || '[]'); } catch {}
    if (q.length && getUser()?.id === user.id) { const { error } = await sb.from('read_chapters').upsert(q.map(id => ({ user_id: user.id, chapter_id: id }))); if (!error) { localStorage.removeItem(RQ(user)); n += q.length; } }
    return n;
  }
  // gana la posición más reciente entre la del servidor y la de este dispositivo
  async function fetchPos(){
    // La posición de este dispositivo siempre está disponible al leer sin conexión.
    if (!navigator.onLine) {
      try { return JSON.parse(localStorage.getItem(posKey(S.series.id))); } catch { return null; }
    }
    let srv = null, loc = null; const user = getUser();
    if (user) try { const { data } = await sb.from('reading_progress').select('chapter_id,chapter_num,block,pct,updated_at').eq('user_id', user.id).eq('series_id', S.series.id).order('updated_at', { ascending: false }).limit(1); srv = data?.[0] || null; } catch {}
    try { loc = JSON.parse(localStorage.getItem(posKey(S.series.id))); } catch {}
    if (srv && loc) return new Date(loc.at || 0) > new Date(srv.updated_at || 0) ? loc : srv;
    return srv || loc;
  }
  // guardar ya al salir: cerrar pestaña, cambiar de app o tocar un enlace del lector
  addEventListener('pagehide', () => saveProgress());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveProgress(); });
  document.addEventListener('click', e => { if (e.target.closest?.('.rd a[href]')) saveProgress(); }, true);
  function resumeBar(ch, pos){
    const el = $('#rd-resume'); if (!el || !pos || pos.chapter_id === ch.id) return;
    const at = S.chapters.find(c => c.id === pos.chapter_id) || S.chapters.find(c => c.num === (pos.num ?? pos.chapter_num)); if (!at || at === ch) return;
    const pc = Math.round((pos.pct || 0) * 100);
    el.innerHTML = `<span>Te quedaste en <b>${esc(at.title)}</b>${pc ? ` · ${pc} %` : ''}</span><a class="btn" href="/leer/${S.series.slug}/${at.num}">Continuar ahí</a><button class="btn ghost" type="button" aria-label="Seguir aquí">Seguir aquí</button>`;
    el.hidden = false; el.querySelector('button').onclick = () => { el.hidden = true; };
  }
  // se llama en el mismo cuadro en que se pinta el capítulo: sin salto visible
  function restorePosition(ch, pos){
    if (pos?.chapter_id === ch.id && pos.block > 0) { const el = $(`[data-ch="${ch.id}"] [data-b="${pos.block}"]`); if (el) { scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); toast('Seguimos donde lo dejaste'); } }
    else scrollTo(0, 0);
  }
  function logHistory(ch){
    if (S.historyLogged.has(ch.id)) return;
    // El historial online es complementario: nunca intentar escribir sin red.
    if (!navigator.onLine) return;
    S.historyLogged.add(ch.id);
    const user = getUser(); if (user) sb.from('reading_history').insert({ user_id: user.id, chapter_id: ch.id });
  }

  // ---------- barra, índice y ajustes ----------
  function bindBar(){
    document.querySelectorAll('.rd-bar [data-act], .rd-zen-x').forEach(b => b.onclick = () => { b.closest('details')?.removeAttribute('open'); ({ toc, prefs: prefsPanel, coms: comments, notes: () => go('/anotaciones/' + S.series.slug), offline: toggleOffline, zen: () => zen() })[b.dataset.act](); });
  }
  const panel = () => $('.rd-panel');
  function toggle(html){ const pn = panel(); if (!pn.hidden && pn.dataset.kind === html.kind) { pn.hidden = true; return null; } pn.dataset.kind = html.kind; pn.innerHTML = html.body; pn.hidden = false; return pn; }
  function tocHTML(){
    const byVol = {}; S.chapters.forEach(c => (byVol[c.vol] ||= []).push(c));
    const done = c => S.readSet?.has(c.id) || S.readMarked.has(c.id);
    return Object.entries(byVol).map(([v, cs]) => `<h4>Volumen ${v}${volTitle(+v)}</h4>${cs.map(c => `<a href="/leer/${S.series.slug}/${c.num}" class="${c === S.active ? 'on' : ''}${done(c) ? ' rd-done' : ''}"${c === S.active ? ' aria-current="page"' : ''}><i class="rd-ok" aria-hidden="true">${done(c) ? '✓' : ''}</i><span>${esc(c.title)}</span>${c === S.active ? '<small class="rd-here">estás aquí</small>' : S.pos?.chapter_id === c.id ? '<small class="rd-here">te quedaste aquí</small>' : ''}</a>`).join('')}`).join('');
  }
  function toc(){
    const pn = toggle({ kind: 'toc', body: tocHTML() }); if (!pn) return;
    const on = pn.querySelector('.on'); if (on) { pn.scrollTop = Math.max(0, on.offsetTop - pn.clientHeight / 3); on.focus({ preventScroll: true }); }
    const u = getUser(); if (!u || S.readSet) return;
    const repaint = data => { S.readSet = new Set((data || []).map(r => r.chapter_id)); const p = panel(); if (!p.hidden && p.dataset.kind === 'toc') { const st = p.scrollTop; p.innerHTML = tocHTML(); p.scrollTop = st; } };
    sb.from('read_chapters').select('chapter_id,chapters!inner(series_id)').eq('user_id', u.id).eq('chapters.series_id', S.series.id)
      .then(({ data, error }) => error ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id).in('chapter_id', S.chapters.slice(0, 250).map(c => c.id)).then(r => repaint(r.data)) : repaint(data));
  }
  const volTitle = n => { const v = S.vols.find(x => x.num === n); return v?.title && v.title !== String(n) ? ' · ' + esc(v.title) : ''; };
  function prefsPanel(){
    const ch = S.active, vid = ch.volume_id, p = effective(vid), scoped = !!S.remote.per_volume[vid];
    const opt = (k, list) => `<div class="rd-opt"><span class="mono">${list.label}</span><div>${list.o.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(p[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
    const pn = toggle({ kind: 'prefs', body: `
      ${opt('theme', { label: 'Tema', o: [['auto','Como el sistema'],['claro','Claro'],['sepia','Sepia'],['noche','Noche cálida'],['oscuro','Oscuro'],['negro','Negro (OLED)']] })}
      <div class="rd-opt"><span class="mono">Tamaño · <b data-size-l>${p.size}px</b></span><input type="range" min="14" max="30" value="${p.size}" data-k="size"></div>
      ${opt('font', { label: 'Tipografía', o: [['original','Original del EPUB'],['Literata','Literata'],['serif','Serif'],['sans','Sans']] })}
      ${opt('width', { label: 'Ancho', o: [['estrecho','Estrecho'],['normal','Normal'],['amplio','Amplio']] })}
      ${opt('lh', { label: 'Interlineado', o: [['compacto','Compacto'],['comodo','Cómodo'],['amplio','Amplio']] })}
      ${opt('align', { label: 'Alineación', o: [['izquierda','Izquierda'],['justificada','Justificada']] })}
      ${opt('para', { label: 'Párrafos', o: [['espacio','Separados'],['sangria','Con sangría, como libro']] })}
      ${opt('illus', { label: 'Ilustraciones', o: [['true','Mostrar'],['false','Ocultar']] })}
      ${opt('cw', { label: 'Avisos de contenido', o: [['show','Mostrar plegable'],['icon','Solo icono'],['hide','No mostrar']] })}
      ${opt('continuous', { label: 'Lectura', o: [['off','Por capítulo'],['volume','Continua dentro del volumen'],['all','Continua entre volúmenes']] })}
      ${p.continuous === 'off' ? opt('autonext', { label: 'Al terminar un capítulo', o: [['true',`Pasar solo al siguiente (${Math.min(30, Math.max(3, +p.autosecs || 5))} s)`],['false','Quedarme al final']] }) + (p.autonext !== false ? `<div class="rd-opt"><label for="rd-autosecs" class="mono">Espera entre capítulos · <b data-autosecs-l>${Math.min(30, Math.max(3, +p.autosecs || 5))} s</b></label><input type="range" id="rd-autosecs" min="3" max="30" step="1" value="${Math.min(30, Math.max(3, +p.autosecs || 5))}" data-k="autosecs" aria-label="Segundos antes del siguiente capítulo"></div>` : '') : ''}
      ${'wakeLock' in navigator ? opt('awake', { label: 'Pantalla', o: [['true','Mantener encendida al leer'],['false','Apagado normal']] }) : ''}
      <label class="rd-scope"><input type="checkbox" ${localStorage.getItem('obi-season') === 'off' ? '' : 'checked'} data-season> Mostrar temas de temporada en la plataforma</label>
      <label class="rd-scope"><input type="checkbox" ${scoped ? 'checked' : ''} data-scope> Guardar estos ajustes solo para el Volumen ${ch.vol}</label>` });
    if (!pn) return;
    pn.onclick = e => { const b = e.target.closest('button[data-k]'); if (b) setPref(b.dataset.k, b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v); };
    pn.querySelector('[data-k="size"]').oninput = e => setPref('size', +e.target.value, true);
    pn.querySelector('[data-k="autosecs"]')?.addEventListener('input', e => setPref('autosecs', Math.min(30, Math.max(3, +e.target.value)), true));
    pn.querySelector('[data-season]').onchange = e => { e.target.checked ? localStorage.removeItem('obi-season') : (localStorage.setItem('obi-season-mig1', '1'), localStorage.setItem('obi-season', 'off')); dispatchEvent(new Event('obi-season')); };
    pn.querySelector('[data-scope]').onchange = e => { if (e.target.checked) S.remote.per_volume[vid] = { ...S.remote.global }; else delete S.remote.per_volume[vid]; savePrefs(); applyPrefs(); };
  }
  function setPref(k, v, live){
    const vid = S.active.volume_id, tgt = S.remote.per_volume[vid] || S.remote.global;
    tgt[k] = v; savePrefs(); applyPrefs(k); if (k === 'autonext' || k === 'continuous' || k === 'autosecs') footer();
    refreshPrefs(k);
  }
  // el panel Aa queda abierto: solo se actualiza la opción tocada
  function refreshPrefs(k){
    const pn = panel(); if (pn.hidden || pn.dataset.kind !== 'prefs') return;
    if (k === 'continuous' || k === 'autonext') { const st = pn.scrollTop; pn.hidden = true; prefsPanel(); panel().scrollTop = st; return; }
    const p = effective(S.active.volume_id);
    pn.querySelectorAll(`button[data-k="${k}"]`).forEach(b => b.classList.toggle('on', String(p[k]) === b.dataset.v));
    if (k === 'size') pn.querySelector('[data-size-l]').textContent = p.size + 'px';
    if (k === 'autosecs') pn.querySelector('[data-autosecs-l]').textContent = Math.min(30, Math.max(3, +p.autosecs || 5)) + ' s';
  }
  async function applyPrefs(k){
    const p = effective(S.active.volume_id), rd = $('.rd');
    Object.assign(rd.dataset, { theme: p.theme, width: p.width, lh: p.lh, align: p.align, para: p.para }); rd.style.setProperty('--rs', p.size + 'px');
    rd.dataset.font = p.font;
    if (k === 'awake') { if (p.awake === false) wl?.release(); else wake(); }
    // cambiar de fuente solo actualiza variables CSS, sin redibujar el texto
    if (k === 'font' || k == null) document.querySelectorAll('.rd-ch').forEach(a => { const c = S.chapters.find(x => x.id === a.dataset.ch), v = c && volOf(c); a.style.cssText = v ? fontVars(v, effective(c.volume_id)) : ''; });
    if (k === 'illus' || k === 'cw') {
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
    const ch = S.active, key = S.series.id + ':' + ch.vol, idx = offIndex();
    const btns = [...document.querySelectorAll('[data-act="offline"]')];
    const btn = { set textContent(t){ btns.forEach(b => b.textContent = t); }, set disabled(v){ btns.forEach(b => b.disabled = v); } };
    if (idx[key]) {
      try { await removeVolume(key); btn.textContent = 'Descargar volumen'; toast('Volumen ' + ch.vol + ' eliminado del dispositivo'); }
      catch (e) { toast('No se pudo borrar el volumen: ' + (e?.message || 'error de almacenamiento')); }
      return;
    }
    if (!navigator.onLine) return toast('Necesitas conexión para descargar el volumen');
    if (!('caches' in window)) return toast('Tu navegador no permite guardar sin conexión');
    btn.disabled = true;
    const list = S.chapters.filter(c => c.vol === ch.vol);
    const assets = new Set(), inserted = new Set(), chapterKeys = list.map(x => offKey(x));
    const metaKey = '/offline/meta/' + S.series.slug;
    let c, previousMeta = null, metaWritten = false, complete = false;
    try {
      if (!list.length) throw new Error('El volumen no contiene capítulos');
      c = await caches.open(OFF_CACHE);
      previousMeta = await c.match(metaKey);
      let n = 0;
      for (const x of list) {
        btn.textContent = `Descargando ${++n}/${list.length}…`;
        const b = await body(x);
        if (!Array.isArray(b) || !b.length) throw new Error('No se pudo guardar el capítulo ' + x.num);
        await c.put(offKey(x), new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } }));
        for (const bl of b) { const src = bl?.url || bl?.src; if (src) assets.add(media(src)); }
      }
      for (const f of volOf(ch)?.epub_fonts || []) if (f.url) assets.add(f.url);
      btn.textContent = 'Guardando imágenes y fuentes…';
      for (const url of assets) {
        if (await c.match(url)) continue;
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok || r.type === 'opaque') throw new Error('No se pudo guardar un recurso del volumen');
        await c.put(url, r);
        inserted.add(url);
      }
      // Glosario es complementario; una falla de red no debe invalidar el texto.
      await S.extras?.catch(() => {});
      metaWritten = true;
      await c.put(metaKey, new Response(JSON.stringify({ series: S.series, chapters: S.chapters, vols: S.vols, gloss: S.gloss || [] }), { headers: { 'Content-Type': 'application/json' } }));
      // El índice es el último paso: solo se anuncia descargado si TODO se guardó.
      idx[key] = { slug: S.series.slug, title: S.series.title, vol: ch.vol, nums: list.map(x => x.num), assets: [...assets], at: Date.now() };
      localStorage.setItem(OFF_INDEX, JSON.stringify(idx));
      complete = true;
      btn.textContent = '✓ Descargado';
      toast(`Volumen ${ch.vol} listo para leer sin conexión`);
      navigator.storage?.persist?.().catch(() => {});
    } catch (e) {
      // Una descarga fallida no debe dejar un volumen marcado como completo.
      if (c) {
        await Promise.allSettled(chapterKeys.map(u => c.delete(u)));
        await Promise.allSettled([...inserted].map(u => c.delete(u)));
        if (metaWritten) {
          try { if (previousMeta) await c.put(metaKey, previousMeta); else await c.delete(metaKey); } catch {}
        }
      }
      toast('Descarga incompleta. Intenta de nuevo: ' + (e?.message || 'sin espacio o sin conexión'));
    } finally {
      btn.disabled = false;
      if (!complete) btn.textContent = 'Descargar volumen';
    }
  }
  async function removeVolume(key){
    const idx = offIndex(), it = idx[key]; if (!it) return;
    const others = Object.entries(idx).filter(([k]) => k !== key).map(([,v]) => v);
    const shared = new Set(others.flatMap(v => v.assets || []));
    const sameSeries = others.some(v => v.slug === it.slug);
    // Primero quitar el índice para no anunciar una descarga borrada a medias.
    const next = { ...idx }; delete next[key];
    localStorage.setItem(OFF_INDEX, JSON.stringify(next));
    const c = await caches.open(OFF_CACHE);
    const chapterKeys = it.nums.map(n => `/offline/${it.slug}/${n}`);
    const exclusiveAssets = (it.assets || []).filter(u => !shared.has(u));
    await Promise.all([...chapterKeys, ...exclusiveAssets, ...(!sameSeries ? ['/offline/meta/' + it.slug] : [])].map(u => c.delete(u)));
  }
  function offlineList(){
    const items = Object.entries(offIndex()).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    if (!items.length) return '<p class="mono">No tienes volúmenes descargados. Ábrelos desde el lector con «Descargar volumen» (en el celular, dentro del menú ⋯).</p>' + ((navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) && /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 0 ? '<p class="mono" style="margin-top:8px">En iPhone y iPad la app instalada guarda sus descargas aparte de Safari: lo que bajaste en el navegador no aparece aquí. Descárgalo de nuevo desde la app.</p>' : '');
    return `<div class="off-list">${items.map(([k, it]) => { let pos = null; try { pos = JSON.parse(localStorage.getItem(posKey(k.split(':')[0]))); } catch {}
      const here = pos && it.nums.includes(pos.num) ? pos.num : null, n = it.nums.length;
      return `<div class="off-it"><span><b>${esc(it.title)}</b><small>Volumen ${it.vol} · ${n} ${n === 1 ? 'capítulo' : 'capítulos'} · descargado ${new Date(it.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</small></span><a class="btn" href="/leer/${esc(it.slug)}/${here || it.nums[0]}">${here ? 'Continuar · cap. ' + here : 'Empezar a leer'}</a><button class="btn ghost" data-off="${esc(k)}">Borrar</button></div>`; }).join('')}</div><p class="mono" id="off-space"></p>`;
  }
  function bindOfflineList(root, after){
    root.querySelectorAll('[data-off]').forEach(b => b.onclick = async () => { if (!await confirmObi('¿Borrar este volumen del dispositivo?')) return; await removeVolume(b.dataset.off); toast('Descarga eliminada'); after(); });
    navigator.storage?.estimate?.().then(e => { const el = root.querySelector('#off-space'); if (el && e?.usage) el.textContent = `Espacio usado en este dispositivo: ${Math.max(1, Math.round(e.usage / 1048576))} MB`; }).catch(() => {});
  }

  // ---------- anotaciones ----------
  // solo los capítulos que se piden (en el lector: los que están en pantalla)
  async function fetchAnnots(ids){
    const user = getUser(); if (!navigator.onLine || !user || !ids.length) return [];
    try { const { data } = await sb.from('annotations').select('*').eq('user_id', user.id).in('chapter_id', ids); return data || []; } catch { return []; }
  }
  function textOffset(blockEl, node, off){ const r = document.createRange(); r.setStart(blockEl, 0); r.setEnd(node, off); return r.toString().length; }
  function wrap(blockEl, start, end, a){
    const tw = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT); let pos = 0, n; const parts = [];
    while ((n = tw.nextNode())) { const len = n.data.length, s = Math.max(start, pos), e = Math.min(end, pos + len); if (s < e) parts.push([n, s - pos, e - pos]); pos += len; if (pos >= end) break; }
    parts.forEach(([node, s, e]) => { const r = document.createRange(); r.setStart(node, s); r.setEnd(node, e); const m = document.createElement('mark'); m.className = 'an'; m.dataset.an = a.id; m.style.setProperty('--an', COLORS[a.color]); if (a.note) m.dataset.note = '1'; try { r.surroundContents(m); } catch {} });
  }
  // repinta solo el capítulo indicado (o todos si no se indica)
  function paintAnnots(chId){
    const arts = chId ? [$(`[data-ch="${chId}"]`)].filter(Boolean) : [...document.querySelectorAll('.rd-ch')];
    arts.forEach(art => {
      art.querySelectorAll('mark.an').forEach(m => m.replaceWith(...m.childNodes));
      art.querySelectorAll('.rd-body').forEach(b => b.normalize());
      S.annots.filter(a => a.chapter_id === art.dataset.ch).forEach(a => { const el = art.querySelector(`[data-b="${a.block}"]`); if (el) wrap(el, a.start_at, a.end_at, a); });
    });
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
    if (!navigator.onLine) { toast('Sin conexión: podrás subrayar cuando vuelvas a tener internet'); return null; }
    const { data, error } = await sb.from('annotations').insert({ ...d, user_id: user.id }).select().single();
    if (error) { toast('No se pudo guardar: ' + error.message); return null; }
    S.annots.push(data); paintAnnots(data.chapter_id); return data;
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
      if (x === 'del') { await sb.from('annotations').delete().eq('id', a.id); S.annots = S.annots.filter(z => z.id !== a.id); paintAnnots(a.chapter_id); return closePop(); }
      if (x === 'save') { const note = pop().querySelector('textarea').value.trim() || null, shared = pop().querySelector('[data-share]').checked;
        const { error } = await sb.from('annotations').update({ color: a.color, note, shared, updated_at: new Date().toISOString() }).eq('id', a.id);
        if (error) return toast(error.message); Object.assign(a, { note, shared }); paintAnnots(a.chapter_id); closePop(); toast('Anotación guardada'); }
    };
  }
  document.addEventListener('mouseup', e => { if (!$('.rd') || e.target.closest('.rd-pop,.gl-sheet') || (e.target.closest('.gl') && getSelection().isCollapsed)) return; const m = e.target.closest('mark.an'); if (m && getSelection().isCollapsed) { const a = S.annots.find(z => String(z.id) === m.dataset.an); if (a) return editAnnot(a); } setTimeout(onSelect, 0); });
  document.addEventListener('touchend', e => { if ($('.rd') && !e.target.closest('.rd-pop,.gl-sheet,.gl')) setTimeout(onSelect, 250); });
  document.addEventListener('mousedown', e => { if (!e.target.closest('.rd-pop')) closePop(); });

  async function annotationsPage(slug){
    const user = getUser(); if (!user) return go('/entrar');
    if (!(await loadSeries(slug))) { app.innerHTML = '<h1>Serie no encontrada</h1>'; return; }
    S.annots = await fetchAnnots(S.chapters.map(c => c.id));
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
    if (!navigator.onLine) { pn.innerHTML = '<p class="mono">Los comentarios necesitan conexión a internet.</p>'; return; }
    const [{ data: list }, { data: tm }, { data: authors }] = await Promise.all([
      sb.from('comments').select('id,parent_id,user_id,body,spoiler,pinned,para,created_at').eq('chapter_id', ch.id).order('created_at').limit(500),
      S.teamIds ? { data: null } : sb.from('team_members').select('user_id').eq('team_id', S.series.team_id),
      sb.rpc('comment_public_authors', { p_chapter: ch.id })]);
    if (tm) S.teamIds = new Set(tm.map(x => x.user_id));
    if (pn.dataset.kind !== 'coms' || S.active !== ch) return;
    const authorById=Object.fromEntries((authors||[]).map(x=>[x.user_id,{username:x.username,avatar_url:x.avatar_url}]));
    const u = getUser(), all = (list || []).filter(c => !window.__obiBlocks?.has(c.user_id))
      .map(c=>({...c,profiles:authorById[c.user_id]||null})), top = all.filter(c => !c.parent_id).sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)));
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
    pn.querySelectorAll('[data-cdel]').forEach(b => b.onclick = async () => { if (!await confirmObi('¿Borrar tu comentario?')) return; const { error } = await sb.from('comments').delete().eq('id', b.dataset.cdel); if (error) return toast(error.message); pn.hidden = true; comments(); });
  }

  // ---------- errata ----------
  async function report(){
    const user = getUser(); if (!user) return go('/entrar');
    const quote = String(getSelection()).trim() || await inputObi('Frase con el error'); if (!quote) return;
    const fix = await inputObi('¿Cómo debería decir?') || '';
    const { error } = await sb.from('reports').insert({ chapter_id: S.active.id, user_id: user.id, kind: 'Errata', quote, fix });
    toast(error ? error.message : 'Gracias, el equipo recibió tu reporte');
  }

  // ---------- continuar leyendo / historial ----------
  async function continueList(){
    const user = getUser(); let rows = [];
    if (user) { const { data } = await sb.from('reading_progress').select('chapter_num,pct,updated_at,series(title,slug)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(6); rows = (data || []).map(r => ({ title: r.series.title, slug: r.series.slug, num: r.chapter_num, pct: r.pct })); }
    return rows;
  }
  async function historyList({ offset = 0, limit = 30 } = {}){
    const user = getUser(); if (!user) return [];
    const from = Math.max(0, Math.floor(Number(offset) || 0));
    const size = Math.min(100, Math.max(1, Math.floor(Number(limit) || 30)));
    const { data, error } = await sb.from('reading_history')
      .select('opened_at,chapters(num,title,series(title,slug))')
      .eq('user_id', user.id).order('opened_at', { ascending: false })
      .range(from, from + size - 1);
    if (error) throw error;
    return (data || []).filter(h => h.chapters?.series);
  }

  return { open, warm, annotationsPage, offlineList, bindOfflineList, continueList, historyList, syncPending };
}

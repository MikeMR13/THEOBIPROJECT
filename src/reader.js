// Lector de El Obi del Lector: por capítulo o continuo, fuentes EPUB, progreso exacto, leídos, historial, sin conexión y anotaciones.
import { confirmObi, inputObi } from './obi-dialog.js';
const OFF_CACHE = 'obi-offline-v1', OFF_INDEX = 'obi-offline-index', PREF_KEY = 'obi-reader-prefs';
import { cleanInline, renderBlock, warningsHTML, teaserHTML } from './blocks.js?v=2';
import { attachPublicCredits, creditsHTML, installCreditImageFallback } from './public-collaboration-credits.js?v=1';
import { readerPrefsKey, readReaderPrefs, readPendingReaderPrefs, stageReaderPrefs, acknowledgeReaderPrefs, sameReaderAccount, readingProgressKey, readingProgressPrefix, readerProgressKeys } from './reader-pref-cache.js?v=1';
import { SECTION_LABELS } from './section-types.js?v=1';
import { formatChapterIndex } from './chapter-title-display.js?v=2';
import { repeatedOpeningHeading } from './reader-headings.js?v=2';
import { adjacentChapter, mergeChapterMetadata } from './reader-navigation.js?v=1';
import { isPubliclyReadableChapter } from './prelaunch-access.js?v=1';
import { familiesOf, fontVars } from './reader-epub-fonts.js?v=1';
const DEF = { theme: 'auto', size: 20, font: 'original', width: 'normal', lh: 'comodo', align: 'izquierda', para: 'espacio', illus: true, continuous: 'off', cw: 'show', autonext: false, awake: true, controls: 'fijo', layout: 'scroll', notes: 'inline', pcom: true };
const REACT = [['heart', '❤️', 'Me encantó'], ['fire', '🔥', 'Épico'], ['cry', '😭', 'Me hizo llorar'], ['shock', '😱', 'No lo vi venir'], ['laugh', '😂', 'Me hizo reír'], ['angry', '😤', 'Me hizo enojar']];
const extras = () => import('./reader-extras.js?v=1');
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
  const CH_COLS = 'id,num,vol,title,section_type,volume_id,status,publish_at,content_warnings,teaser,teaser_on,updated_at';
  // Una precarga de enlace y la apertura pueden solicitar la misma ficha simultáneamente.
  // Compartir únicamente solicitudes en curso: RLS y revisiones se revalidan en el siguiente acceso.
  const metaFlights = new Map();
  function fetchMeta(slug){
    const inflight = metaFlights.get(slug);
    if (inflight) return inflight;
    const request = Promise.all([
      sb.from('series').select('id,slug,title,published,team_id,cover_path,teams(name,slug,status,avatar_path,settings,reader_defaults,color)').eq('slug', slug).maybeSingle(),
      sb.from('chapters').select(CH_COLS + ',series!inner(slug)').eq('series.slug', slug).is('deleted_at', null).order('num'),
      sb.from('volumes').select('id,num,title,status,published_at,epub_fonts,cover_path,series!inner(slug)').eq('series.slug', slug).is('deleted_at', null).order('num')
    ]).then(([a, b, c]) => { const e = a.error || b.error || c.error; if (e) throw e; if (!a.data) return null;
      const strip = l => (l || []).map(({ series, ...x }) => x);
      const m = { series: a.data, chapters: strip(b.data), vols: strip(c.data), at: Date.now() };
      try { const saved = { ...m, series: { ...m.series } }; delete saved.series.publicCredits; const j = JSON.stringify(saved); if (j.length < 400000) localStorage.setItem(META_KEY(slug), j); } catch {}
      return m; });
    metaFlights.set(slug, request);
    // finally crea otra promesa: capturar el fallo también para evitar rechazos sin observador.
    request.finally(() => { if (metaFlights.get(slug) === request) metaFlights.delete(slug); }).catch(() => {});
    return request;
  }
  function cachedChapterReadable(m, num){
    const ch = m.chapters.find(c => c.num === num);
    const volume = m.vols.find(v => String(v.id) === String(ch?.volume_id)) ||
      (!ch?.volume_id ? m.vols.find(v => Number(v.num) === Number(ch?.vol)) : null);
    return isPubliclyReadableChapter(ch, { seriesPublished: m.series?.published, volume }) &&
      !(ch?.volume_id && !volume);
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
    const hasHit = !!(hit?.series && hit.series.published != null &&
      Array.isArray(hit.chapters) && hit.chapters.every(c => c.status != null) &&
      Array.isArray(hit.vols) && hit.vols.every(v => v.status != null) &&
      (num == null || hit.chapters.some(c => c.num === num)) &&
      // Una copia guardada durante el preestreno (o antes de la hora programada)
      // dice «bloqueado» aunque el estreno ya ocurrió: nunca decidir un bloqueo
      // con la copia local; en ese caso se consulta la ficha fresca.
      (num == null || cachedChapterReadable(hit, num)));
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
              activeIo?.unobserve(art);
              art.outerHTML = chapterHTML(act, b, effective(act.volume_id));
              const updatedArt = $('[data-ch="' + act.id + '"]');
              if (updatedArt) activeIo?.observe(updatedArt);
              markTerms(updatedArt); decorate(updatedArt);
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
      // since_num / updates (glosario sin spoilers) existen tras la migración 20261124; sin ella se usa el glosario de siempre
      sb.from('glossary_terms').select('term,category,definition,since_num,updates').eq('series_id', s.id).then(r => r.error ? sb.from('glossary_terms').select('term,category,definition').eq('series_id', s.id).then(x => x.data || [], () => []) : r.data || [], () => [])
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
  // Un mismo capítulo puede ser solicitado por precarga, navegación y lectura continua a la vez.
  // La llave incluye revisión y serie para que nunca se reutilice una descarga desactualizada.
  async function body(ch){
    const key = [S.series?.id, ch.id, ch.updated_at || ''].join(':');
    S.bodyFlights ||= new Map();
    if (S.bodyFlights.has(key)) return S.bodyFlights.get(key);
    const request = loadBody(ch);
    S.bodyFlights.set(key, request);
    try { return await request; }
    finally { if (S.bodyFlights.get(key) === request) S.bodyFlights.delete(key); }
  }
  async function loadBody(ch){
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
    const ek = (S.series?.slug || '') + '/' + ch.num, warm = early.get(ek);
    if (warm) {
      // Cache Storage puede tardar más que la descarga iniciada con hover/touch.
      // Elegir la primera respuesta válida evita esperar al disco o repetir una solicitud.
      const first = await Promise.any([
        cacheGet(ch).then(b => b ? { body: b, disk: true } : Promise.reject(null)),
        warm.then(d => d?.id === ch.id && d.body
          ? { body: d.body, disk: false } : Promise.reject(null))
      ]).catch(() => null);
      early.delete(ek);
      if (first) {
        const saved = remember(first.body);
        if (saved && !first.disk) cachePut(ch, saved);
        return saved;
      }
    } else {
      const hit = await cacheGet(ch);
      if (hit) return remember(hit);
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
      const bp = body(n); S.nextP = { id: n.id, p: bp };
      bp.then(b => { peek(n); if (!Array.isArray(b) || !canPrefetch() || effective(n.volume_id).illus === false) return;
        b.filter(x => x.url || x.src).slice(0, 2).forEach(x => { const i = new Image(); i.decoding = 'async'; i.src = media(x.url || x.src); }); }).catch(() => {});
    });
  };
  const nextOf = ch => adjacentChapter(S.chapters, ch, 1);
  const prevOf = ch => adjacentChapter(S.chapters, ch, -1);
  const volOf = ch => S.vols.find(v => v.id === ch.volume_id) || S.vols.find(v => v.num === ch.vol);

  // ---------- fuentes EPUB ----------
  const fontsDone = new Set();
  function ensureFonts(vol){
    if (!vol || fontsDone.has(vol.id) || !(vol.epub_fonts || []).length) return;
    fontsDone.add(vol.id);
    const css = vol.epub_fonts.map(f => `@font-face{font-family:"obi-${vol.num}-${f.family.replace(/["']/g, '')}";src:url("${f.url}");font-style:${f.style === 'oblique' ? 'oblique' : f.style || 'normal'};font-weight:${f.weight || 'normal'};font-display:swap}`).join('');
    const st = document.createElement('style'); st.dataset.vol = vol.id; st.textContent = css; document.head.appendChild(st);
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
    const shown = formatChapterIndex({title:ch.title,sectionType:ch.section_type});
    const label = shown.label + (shown.number ? ' ' + shown.number : '');
    const repeated = repeatedOpeningHeading(blocks, ch);
    return `<article class="rd-ch" lang="es" data-ch="${ch.id}" style="${vol ? fontVars(vol, p) : ''}">
      ${S.mounted[0]?.id === ch.id ? teamHTML() : ''}
      <header class="rd-head"><span class="mono">Volumen ${ch.vol} · ${esc(label)}</span><h2${(() => { const f = (blocks || []).find(b => (b.type || b.t) === 'heading')?.html?.match(/data-epub-family="(\d+)"/)?.[1]; return f ? ` style="font-family:var(--f${f})"` : ''; })()}>${esc(shown.heading || (shown.number ? "" : ch.title))}</h2></header>
      ${warningsHTML(ch.content_warnings, p.cw)}
      <div class="rd-body">${(blocks || []).map((b, i) => i === repeated ? '' : block(b, i, p)).join('')}</div>
      ${ch.teaser_on && ch.teaser ? teaserHTML(ch.teaser, nextWhen()) : ''}
      <nav class="rd-ch-end" aria-label="Opciones al terminar el capítulo"><a class="btn ghost rd-to-series" href="/serie/${esc(S.series.slug)}">← Regresar a la serie</a></nav></article>`;
  }

  // ---------- glosario en el texto ----------
  function glossRe(){
    if (S.glRe !== undefined) return S.glRe;
    const t = [...(S.gloss || [])].sort((a, b) => b.term.length - a.term.length).map(g => g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return S.glRe = t.length ? new RegExp('(?<![\\p{L}\\p{N}])(' + t.join('|') + ')(?![\\p{L}\\p{N}])', 'giu') : null;
  }
  const idle = fn => (window.requestIdleCallback || (f => setTimeout(f, 16)))(fn);
  // marca por tandas de ~8 ms en ratos libres para no congelar la apertura
  // número del capítulo al que pertenece un elemento del texto (para el glosario sin spoilers)
  const chOfEl = el => S.chapters.find(c => c.id === el?.closest?.('.rd-ch')?.dataset.ch);
  // un término con since_num solo se marca desde ese capítulo: antes sería un spoiler
  const termVisible = (g, num) => g && (g.since_num == null || num == null || +num >= +g.since_num);
  function markTerms(root){
    const re = glossRe(); if (!re || !root) return;
    const els = [...root.querySelectorAll('.rd-body p, .rd-body blockquote, .rd-body aside.tn')]; let i = 0;
    const run = () => { const t0 = performance.now(); while (i < els.length && performance.now() - t0 < 8) { const el = els[i++]; if (el.isConnected) markEl(el, re, chOfEl(el)?.num); } if (i < els.length) idle(run); };
    idle(run);
  }
  function markEl(el, re, num){
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('rt,rp,ruby,.gl,.mono') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; let n; while ((n = tw.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        re.lastIndex = 0; if (!re.test(node.data)) return; re.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m;
        while ((m = re.exec(node.data))) {
          if (m.index > last) frag.append(node.data.slice(last, m.index));
          if (!termVisible(S.glMap?.get(m[1].toLowerCase()), num)) { frag.append(m[1]); last = m.index + m[1].length; continue; }
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
    // datos que se revelan por capítulo (X-Ray sin spoilers): solo hasta el capítulo que se está leyendo
    const num = chOfEl(el)?.num, ups = (Array.isArray(g.updates) ? g.updates : []).filter(u => u && u.text).sort((a, b) => (+a.from || 0) - (+b.from || 0));
    const seen = ups.filter(u => num == null || +u.from <= +num), hid = ups.length - seen.length;
    sh.innerHTML = `<div class="gl-card" role="dialog" aria-modal="true" aria-labelledby="gl-t"><div class="gl-top"><div><span class="mono">Glosario · ${esc(g.category)}</span><strong id="gl-t">${esc(g.term)}</strong></div><button class="gl-x" aria-label="Cerrar">×</button></div><p>${esc(g.definition)}</p>${seen.length ? `<ul class="gl-ups">${seen.map(u => `<li><span class="mono">Cap. ${esc(u.from)}</span>${esc(u.text)}</li>`).join('')}</ul>` : ''}${hid ? `<span class="gl-lock">${hid === 1 ? 'Hay 1 dato más' : 'Hay ' + hid + ' datos más'} que se revela${hid === 1 ? '' : 'n'} al seguir leyendo. Sin spoilers.</span>` : ''}<span class="gl-n">Aparece ${n === 1 ? '1 vez' : n + ' veces'} en este capítulo · Toca fuera para seguir leyendo</span></div>`;
    sh.hidden = false; S.glFrom = el; sh.querySelector('.gl-x').focus({ preventScroll: true });
  }
  // ---------- notas del traductor emergentes (Kindle / Apple Books) ----------
  // La nota se queda en el DOM (oculta) para que la posición guardada por párrafo no cambie; el número va por CSS
  // (attr(data-n)) y no como texto, así los subrayados y las citas no cuentan caracteres extra.
  function notesPop(art){
    const ch = chOfEl(art); if (!ch || effective(ch.volume_id).notes !== 'popup') return;
    let n = 0;
    art.querySelectorAll('.rd-body > aside.tn[data-b]').forEach(a => {
      let prev = a.previousElementSibling; while (prev && prev.classList.contains('tn-hid')) prev = prev.previousElementSibling;
      if (!prev || !/^(P|BLOCKQUOTE|H3)$/.test(prev.tagName)) return;
      n++; a.classList.add('tn-hid'); a.setAttribute('aria-hidden', 'true');
      prev.insertAdjacentHTML('beforeend', `<sup class="tn-ref"><button type="button" data-tn="${a.dataset.b}" data-n="${n}" aria-label="Nota del traductor ${n}"></button></sup>`);
    });
  }
  function openNote(btn){
    const art = btn.closest('.rd-ch'), a = art?.querySelector(`aside.tn[data-b="${CSS.escape(btn.dataset.tn)}"]`), sh = $('.gl-sheet'); if (!a || !sh) return;
    const body = a.cloneNode(true); body.querySelector(':scope > .mono')?.remove();
    sh.innerHTML = `<div class="gl-card" role="dialog" aria-modal="true" aria-labelledby="tn-t"><div class="gl-top"><div><span class="mono">Nota ${esc(btn.dataset.n)}</span><strong id="tn-t">Nota del traductor</strong></div><button class="gl-x" aria-label="Cerrar">×</button></div><p class="tn-body"></p><span class="gl-n">Puedes elegir ver las notas dentro del texto en Aa › Notas del traductor</span></div>`;
    sh.querySelector('.tn-body').innerHTML = body.innerHTML; // ya viene limpio de renderBlock (cleanInline)
    sh.hidden = false; S.glFrom = btn; sh.querySelector('.gl-x').focus({ preventScroll: true });
  }
  // ---------- comentarios por párrafo (Wattpad) ----------
  // usa comments.para (índice del bloque, el mismo que data-b y que el Estudio muestra como «párrafo N»)
  async function paraComments(art){
    const ch = chOfEl(art); if (!ch || effective(ch.volume_id).pcom === false || !navigator.onLine) return;
    let data = null;
    try { const r = await sb.from('comments').select('para,user_id').eq('chapter_id', ch.id).limit(3000); if (r.error) return; data = r.data; } catch { return; }
    if (!art.isConnected) return;
    const cnt = {}; (data || []).forEach(c => { if (c.para != null && !window.__obiBlocks?.has(c.user_id)) cnt[c.para] = (cnt[c.para] || 0) + 1; });
    art.querySelectorAll('.pc-b').forEach(b => b.remove());
    Object.entries(cnt).forEach(([p, k]) => { const el = art.querySelector(`.rd-body > [data-b="${p}"]`); if (!el || !/^(P|BLOCKQUOTE|H3)$/.test(el.tagName)) return;
      el.insertAdjacentHTML('beforeend', `<button type="button" class="pc-b" data-pc="${p}" data-n="${k > 99 ? '99+' : k}" aria-label="${k} ${k === 1 ? 'comentario' : 'comentarios'} en este párrafo"></button>`); });
  }
  // todo lo que se agrega al texto ya pintado de un capítulo
  function decorate(art){ if (!art) return; notesPop(art); paraComments(art); }
  function closeTerm(){ const sh = $('.gl-sheet'); if (!sh || sh.hidden) return; sh.hidden = true; document.querySelectorAll('.gl.on').forEach(x => x.classList.remove('on')); S.glFrom?.focus({ preventScroll: true }); }
  document.addEventListener('click', e => {
    if (!$('.rd')) return;
    const t = e.target.closest('.gl'); if (t && getSelection().isCollapsed) { e.stopPropagation(); return openTerm(t); }
    if (e.target.closest('.gl-sheet') && (!e.target.closest('.gl-card') || e.target.closest('.gl-x'))) return closeTerm();
    const nb = e.target.closest('.tn-ref button'); if (nb) { e.stopPropagation(); return openNote(nb); }
    const pc = e.target.closest('.pc-b'); if (pc) { e.stopPropagation(); return comments(+pc.dataset.pc, pc.closest('.rd-ch')?.dataset.ch); }
    const im = e.target.closest('.rd-body figure img'); if (im && getSelection().isCollapsed) { e.stopPropagation(); return viewer(im); }
    if (isPaged() && e.target.closest('#rd-flow') && getSelection().isCollapsed && !e.target.closest('a,button,input,textarea,select,summary,details,mark,.gl,sup')) pageTap(e);
  });
  document.addEventListener('keydown', e => {
    if (!$('.rd') || $('.iv')) return;
    if (e.key === 'Escape') closeTerm();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('gl')) { e.preventDefault(); openTerm(e.target); }
  });

  // una vista por capítulo y día en este dispositivo
  const devId = () => { try { let d = localStorage.getItem('obi-dev'); if (!d) { d = crypto.randomUUID(); localStorage.setItem('obi-dev', d); } return d; } catch { return null; } };
  function trackView(ch){ if (!navigator.onLine) return; const k = 'obi-v-' + ch.id, d = new Date().toDateString(); try { if (localStorage.getItem(k) === d) return; localStorage.setItem(k, d); } catch {} sb.rpc('track_view', { p_chapter: ch.id, p_device: devId() }).then(() => {}, () => {}); }
  // ---------- modo zen y pantalla encendida ----------
  function zen(on = !document.body.classList.contains('rd-zen')){
    document.body.classList.toggle('rd-zen', on); if (on) closePanel();
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
    if (!$('.rd') || !S.active || $('.iv') || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const pn = panel();
    if (e.key === 'Escape') { if (pn && !pn.hidden) { e.preventDefault(); closePanel(); } else if (document.body.classList.contains('rd-zen')) zen(false); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (pn && !pn.hidden) return;
    // modo paginado: ← → (y AvPág / RePág / espacio) pasan página; al final, → baja al pie con el siguiente capítulo
    if (isPaged() && !$('.gl-sheet:not([hidden])')) {
      const onCtl = e.key === ' ' && e.target.closest?.('button,a,summary,[role="button"]');
      const fw = !onCtl && ['ArrowRight', 'PageDown', ' '].includes(e.key), bw = !onCtl && (['ArrowLeft', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey));
      if (bw || fw) { e.preventDefault(); return flip(bw ? -1 : 1); }
    }
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
    if (ch) { if (S.bodies.has(ch.id) && S.bodyVersions.get(ch.id) === (ch.updated_at || null) || await cacheGet(ch)) return; const d = await bodyBySlug(slug, num); if (d?.body && d.id === ch.id) cachePut(ch, d.body); return; }
    bodyBySlug(slug, num); fetchMeta(slug).catch(() => {}); }
  async function open(slug, num){
    const openingUser = getUser()?.id || null, openingId = (S.openId || 0) + 1;
    S.openId = openingId;
    const stillOpening = () => S.openId === openingId &&
      sameReaderAccount(getUser()?.id, openingUser) &&
      location.pathname === '/leer/' + slug + '/' + num;
    // Los observadores de la lectura anterior no deben montar texto durante otra navegación.
    io?.disconnect(); activeIo?.disconnect(); autoIo?.disconnect(); barRO?.disconnect(); clearInterval(autoT);
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
    // El anuncio editorial no equivale a publicación del contenido. También
    // bloquear accesos por URL directa y cachés anteriores a la apertura.
    const chVolume = S.vols.find(v => String(v.id) === String(ch.volume_id)) ||
      (!ch.volume_id ? S.vols.find(v => Number(v.num) === Number(ch.vol)) : null);
    const blockedByPrelaunch = !isPubliclyReadableChapter(ch, {
      seriesPublished: S.series?.published, volume: chVolume
    }) || (navigator.onLine && !!ch.volume_id && !chVolume);
    if (blockedByPrelaunch) {
      app.innerHTML = '<section class="ui-wrap" role="status"><h1>🔒 Lectura aún no disponible</h1><p>Esta novela o volumen sigue en preestreno. Sus capítulos permanecerán bloqueados hasta su publicación.</p><p><a class="btn" href="/serie/' + esc(slug) + '">Ver primer vistazo y fecha del estreno →</a></p></section>';
      return;
    }
    const annP = fetchAnnots([ch.id]);
    // Renderizar con la posición y las preferencias locales. Las respuestas remotas no bloquean el texto.
    const localPos = () => { try { return JSON.parse(localStorage.getItem(posKey(S.series.id))); } catch { return null; } };
    const local = localPos();
    let readyPos = null;
    const posP = fetchPos().then(p => { readyPos = p; return p; }, () => null);
    prefsP?.then(() => {
      // La lectura continua puede cambiar la URL sin cambiar esta sesión del lector.
      if (S.openId === openingId && sameReaderAccount(getUser()?.id, prefsUid) &&
          sameReaderAccount(S.activeOwner, openingUser) && $('.rd')) applyPrefs();
    }).catch(() => {});
    const b = await body(ch);
    if (!stillOpening()) return;
    // Si el progreso remoto llegó durante la descarga del texto, restaurarlo de una vez.
    const pos = readyPos || local;
    if (!b) { app.innerHTML = '<h1>Sin conexión</h1><p>Este capítulo no está descargado. <a href="/descargas">Ver mis descargas</a></p>'; return; }
    const p = effective(ch.volume_id);
    S.mounted = [ch]; S.active = ch; S.activeOwner = openingUser; S.annots = []; S.lastY = null; trackView(ch);
    const more = `<button class="btn ghost" data-act="coms">Comentarios</button><button class="btn ghost" data-act="notes">Anotaciones</button><button class="btn ghost" data-act="offline">${isVolOffline(ch) ? 'Quitar volumen del dispositivo' : 'Guardar volumen sin conexión'}</button>`;
    app.innerHTML = `<div class="rd" data-layout="${p.layout === 'paged' ? 'paged' : 'scroll'}" data-theme="${p.theme}" data-width="${p.width}" data-lh="${p.lh}" data-align="${p.align}" data-para="${p.para}" data-font="${p.font}" data-controls="${p.controls === 'fijo' ? 'fijo' : 'deslizable'}" style="--rs:${p.size}px">
      <nav class="rd-bar">
        <span class="rd-where"><a href="/serie/${esc(slug)}" class="rd-back" title="${esc(S.series.title)}">‹ ${esc(S.series.title)}</a><button type="button" class="rd-left mono" data-act="left" title="Toca para cambiar entre tiempo restante, avance del capítulo y del volumen"></button></span>
        <div class="rd-tools">
          <button class="btn ghost" data-act="toc" aria-label="Índice">Índice</button>
          <button class="btn ghost rd-settings-trigger" data-act="prefs" aria-label="Abrir ajustes de lectura" aria-controls="rd-panel" aria-expanded="false"><span aria-hidden="true">Aa</span> Ajustes</button>
          <button class="btn ghost" data-act="zen" title="Modo zen · tecla Z">Zen</button>
          <span class="rd-wide">${more}</span>
          <details class="rd-more"><summary class="btn ghost" aria-label="Más opciones">⋯</summary><div class="rd-more-m">${more}</div></details>
        </div>
      </nav>
      <div class="rd-prog" aria-hidden="true"><i></i></div>
      <button type="button" class="rd-settings-dock" data-act="prefs" aria-label="Abrir ajustes de lectura" aria-controls="rd-panel" aria-expanded="false">Aa Ajustes</button>
      <div class="rd-panel" id="rd-panel" role="region" aria-label="Herramientas de lectura" hidden></div>
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
    decorate($(`[data-ch="${ch.id}"]`));
    S.pos = pos; S.resumePending = null; S.page = 0; S.readT = { id: ch.id, t: Date.now(), pct: 0, active: 0, last: Date.now() };
    if (isPaged()) pagedInit();
    restorePosition(ch, pos); resumeBar(ch, pos); bindBar(); footer(); progress();
    posP.then(latest => {
      if (!stillOpening() || !latest || S.active?.id !== ch.id || !$('.rd')) return;
      const newer = !pos || Date.parse(latest.at || latest.updated_at || 0) > Date.parse(pos.at || pos.updated_at || 0);
      if (!newer) return;
      S.pos = latest;
      if (latest.chapter_id === ch.id &&
          (!(+latest.block > 0) || +latest.block === +(pos?.block || 0))) return;
      if (latest.chapter_id !== ch.id &&
          !S.chapters.some(c => c.id === latest.chapter_id || c.num === (latest.num ?? latest.chapter_num))) return;
      // El avance remoto no se sobrescribe hasta que el lector elija continuar aquí o se desplace.
      S.resumePending = { chapterId: ch.id, y: scrollY };
      resumeBar(ch, latest, true);
    }).catch(() => {});
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
  const labelOf = c => (SEC_LABEL[c.section_type] || 'Cap.') + (c.section_type === 'Capítulo' || !c.section_type ? ' ' + c.num : '');
  // reacciones del capítulo (tabla reactions: una por lector y capítulo), como el voto de Wattpad
  async function reactBox(ch){
    const el = $('#rd-react'); if (!el) return;
    if (!navigator.onLine) { el.hidden = true; return; }
    let data = null, error = null;
    try { ({ data, error } = await sb.from('reactions').select('kind,user_id').eq('chapter_id', ch.id).limit(5000)); } catch { error = true; }
    if (error || !document.body.contains(el) || S.active !== ch) { if (error) el.hidden = true; return; }
    const u = getUser(), cnt = {}; let mine = null;
    (data || []).forEach(r => { if (window.__obiBlocks?.has(r.user_id)) return; cnt[r.kind] = (cnt[r.kind] || 0) + 1; if (u && r.user_id === u.id) mine = r.kind; });
    const total = Object.values(cnt).reduce((a, b) => a + b, 0);
    el.innerHTML = `<h3>${mine ? 'Tu reacción a este capítulo' : '¿Qué te pareció este capítulo?'}</h3><div class="rx" role="group" aria-label="Reaccionar al capítulo">${REACT.map(([k, e, l]) => `<button type="button" data-rx="${k}" class="${mine === k ? 'on' : ''}" aria-pressed="${mine === k}" title="${l}" aria-label="${l}${cnt[k] ? ' · ' + cnt[k] : ''}"><span aria-hidden="true">${e}</span><b>${cnt[k] || ''}</b></button>`).join('')}</div><small>${total ? total + (total === 1 ? ' reacción' : ' reacciones') : 'Sé la primera reacción'}${u ? (mine ? ' · toca la tuya otra vez para quitarla' : '') : ' · <a href="/entrar">entra</a> para reaccionar'}</small>`;
    el.querySelector('.rx').onclick = async e => {
      const b = e.target.closest('[data-rx]'); if (!b) return; const me = getUser(); if (!me) return go('/entrar');
      b.disabled = true; const k = b.dataset.rx;
      const { error: er } = k === mine ? await sb.from('reactions').delete().eq('chapter_id', ch.id).eq('user_id', me.id) : await sb.from('reactions').upsert({ chapter_id: ch.id, user_id: me.id, kind: k }, { onConflict: 'chapter_id,user_id' });
      if (er) { b.disabled = false; return toast('No se pudo guardar tu reacción'); } reactBox(ch);
    };
  }
  // adelanto: primeras líneas del siguiente capítulo (solo si ya se descargó por anticipado; nunca baja texto extra en datos móviles)
  async function peek(nx){
    const b = S.bodies.get(nx.id) || (S.nextP?.id === nx.id ? await S.nextP.p.catch(() => null) : null), el = $('#rd-peek');
    if (!Array.isArray(b) || !el || !document.body.contains(el) || nextOf(S.active) !== nx) return;
    const tmp = document.createElement('div'); let txt = '';
    for (const x of b) { const t = x.type || x.t; if (t !== 'paragraph' && t !== 'p') continue; tmp.innerHTML = x.html || ''; const s = (x.html ? tmp.textContent : x.text || '').replace(/\s+/g, ' ').trim(); if (!s) continue; txt += (txt ? ' ' : '') + s; if (txt.length > 200) break; }
    if (!txt) return; if (txt.length > 220) txt = txt.slice(0, 220).replace(/\s+\S*$/, '') + '…';
    el.querySelector('q').textContent = txt; el.hidden = false;
  }
  function footer(){
    const ch = S.active, pv = prevOf(ch), nx = nextOf(ch), p = effective(ch.volume_id);
    const cont = p.continuous !== 'off' && p.layout !== 'paged' && nx && (p.continuous === 'all' || nx.vol === ch.vol);
    const auto = !cont && nx && p.autonext !== false && autoStop !== ch.id && !window.__obiTTS?.isActive?.();
    const nextInfo = S.nextAt ? `<p class="rd-nexts"><span class="mono">Próximo capítulo</span><b>${new Date(S.nextAt).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</b><small>${untilTxt(S.nextAt)} · te avisaremos si sigues la serie</small></p>` : '';
    clearInterval(autoT); autoIo?.disconnect();
    $('.rd-foot').innerHTML = cont ? '<p class="mono" style="text-align:center">Sigue bajando para continuar…</p>'
      : `<section class="rd-react" id="rd-react" aria-label="Reacciones al capítulo"></section>
         ${nx ? `<aside class="rd-peek" id="rd-peek" hidden><span class="mono">Sigue · ${esc(labelOf(nx))}</span><b>${esc(nx.title)}</b><q></q></aside>` : ''}
         <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">${pv ? `<a class="btn ghost" href="/leer/${S.series.slug}/${pv.num}">‹ ${esc(pv.title)}</a>` : '<span></span>'}${nx ? `<a class="btn" href="/leer/${S.series.slug}/${nx.num}">${nx.vol !== ch.vol ? 'Volumen ' + nx.vol + ' · ' : ''}${esc(nx.title)} ›</a>` : '<span class="mono">Has llegado al último capítulo publicado.</span>'}</div>
         ${auto ? '<p class="rd-auto" id="rd-auto" hidden><span>Siguiente capítulo en <b id="rd-auto-n">' + Math.min(30, Math.max(3, +p.autosecs || 5)) + '</b> s</span><button class="btn ghost" data-act="auto-cancel">Cancelar</button></p>' : ''}
         ${!nx ? '<div class="rd-rate" id="rd-rate"></div>' + nextInfo + `<p style="text-align:center"><a class="btn ghost" href="/serie/${S.series.slug}#rv-sec">Escribir una reseña · ver la ficha</a></p>` : ''}
         <p style="text-align:center"><button class="btn ghost" data-act="report">Reportar errata</button></p>`;
    $('[data-act="report"]')?.addEventListener('click', report);
    if (!document.getElementById('rd-auto-css')) { const st = document.createElement('style'); st.id = 'rd-auto-css'; st.textContent = '.rd-auto{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:18px 0;padding:12px 16px;border:1px solid var(--gold,#f2c230)}.rd-auto b{color:var(--gold,#f2c230);font-size:1.2em}.rd-nexts{display:grid;justify-items:center;gap:4px;margin:26px auto;padding:18px;max-width:440px;border:1px solid currentColor;text-align:center}.rd-nexts b{font-size:1.1em;text-transform:capitalize}.rd-nexts small{opacity:.75}'; document.head.appendChild(st); }
    if (!nx) rateBox();
    if (!cont) { reactBox(ch); if (nx) peek(nx); }
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
  let io, activeIo, barRO;
  // La cabecera global no siempre permanece visible durante el desplazamiento.
  // La barra fija debe ocupar su borde inferior real, no un hueco constante de 62 px.
  function syncFixedBarTop(){
    const rd = $('.rd');
    if (!rd?.dataset || rd.dataset.controls !== 'fijo') return;
    const header = document.querySelector('body > header.top');
    const visible = header && getComputedStyle(header).display !== 'none' &&
      getComputedStyle(header).visibility !== 'hidden';
    const bottom = visible ? header.getBoundingClientRect().bottom : 0;
    const top = Math.max(0, Math.min(innerHeight, Math.ceil(bottom)));
    rd.style.setProperty('--rd-fixed-top', top + 'px');
  }
  function observe(){
    io?.disconnect(); activeIo?.disconnect(); barRO?.disconnect();
    // Altura real: en móviles muy estrechos la barra usa dos filas.
    // El panel y su scroll se colocan bajo la barra sin usar una altura supuesta de 58 px.
    const rd = $('.rd'), bar = $('.rd-bar');
    if (rd && bar) {
      const measure = () => rd.style.setProperty('--rd-h', Math.ceil(bar.getBoundingClientRect().height) + 'px');
      measure();
      syncFixedBarTop();
      if (typeof ResizeObserver !== 'undefined') {
        barRO = new ResizeObserver(measure);
        barRO.observe(bar);
      }
    }
    const openingId = S.openId, flow = $('#rd-flow');
    io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || openingId !== S.openId || !flow?.isConnected) return;
      const last = S.mounted[S.mounted.length - 1], nx = nextOf(last), p = effective(last.volume_id);
      if (p.continuous === 'off' || p.layout === 'paged' || !nx || (p.continuous === 'volume' && nx.vol !== last.vol) || S.loadingNext) return;
      S.loadingNext = true;
      try {
        const b = await body(nx);
        if (!b || openingId !== S.openId || !flow.isConnected || $('#rd-flow') !== flow ||
            S.mounted[S.mounted.length - 1]?.id !== last.id || !S.chapters.some(c => c.id === nx.id)) return;
        flow.insertAdjacentHTML('beforeend', chapterHTML(nx, b, effective(nx.volume_id)));
        const art = $('[data-ch="' + nx.id + '"]');
        markTerms(art); decorate(art);
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
      if (ch && ch.id !== S.active?.id) { S.active = ch; history.replaceState({}, '', '/leer/' + S.series.slug + '/' + ch.num); logHistory(ch); footer(); S.readT = { id: ch.id, t: Date.now(), pct: 0, active: 0, last: Date.now() }; }
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.rd-ch').forEach(a => activeIo.observe(a));
    removeEventListener('scroll', onScroll); addEventListener('scroll', onScroll, { passive: true });
    removeEventListener('resize', syncFixedBarTop); addEventListener('resize', syncFixedBarTop, { passive: true });
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
    // paginado: el primer párrafo que EMPIEZA en esta página (uno partido desde la anterior llevaría a la página anterior al volver)
    if (isPaged()) { const P = pgInfo(); if (P) { const list = [...art.querySelectorAll('[data-b]:not(.tn-hid)')]; let el = list.find(x => P.startPage(x) >= S.page); if (!el || P.startPage(el) > S.page) el = list.find(x => P.endPage(x) >= S.page) || el; return { block: el ? +el.dataset.b : 0, pct: P.pages > 1 ? S.page / (P.pages - 1) : 1 }; } }
    // búsqueda binaria: ~10 mediciones en lugar de una por párrafo (las notas ocultas no cuentan: miden 0)
    const els = art.querySelectorAll('[data-b]:not(.tn-hid)'); let lo = 0, hi = els.length - 1, at = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (els[m].getBoundingClientRect().bottom > 80) { at = m; hi = m - 1; } else lo = m + 1; }
    const blk = els.length ? +els[at].dataset.b : 0;
    const r = art.getBoundingClientRect(), pct = Math.min(1, Math.max(0, (innerHeight - r.top) / r.height));
    return { block: blk, pct };
  }
  function onScroll(){
    if (!document.body.contains($('.rd'))) {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', syncFixedBarTop);
      wl?.release(); return;
    }
    // Mover inmediatamente los controles con la cabecera real en cada scroll.
    // No esperar al requestAnimationFrame: al subir rápido dejaba la barra arriba.
    syncFixedBarTop();
    if (S.resumePending && Math.abs(scrollY - S.resumePending.y) > 40) {
      S.resumePending = null;
      const bar = $('#rd-resume'); if (bar) bar.hidden = true;
    }
    clearTimeout(S.saveT); S.saveT = setTimeout(saveProgress, 1200);
    if (!S.raf) S.raf = requestAnimationFrame(frame);
  }
  // barra que se esconde al bajar y vuelve al subir (o al llegar al final)
  function frame(){
    S.raf = 0; const rd = $('.rd'); if (!rd || !S.active) return;
    syncFixedBarTop();
    const y = scrollY; if (S.lastY == null) S.lastY = y; const d = y - S.lastY;
    if (Math.abs(d) > 6) { S.lastY = y; rd.dataset.bar = rd.dataset.controls === 'fijo' ? '' : (d > 0 && y > 240 && panel().hidden && pop().hidden ? 'hide' : ''); }
    if (rd.dataset.controls === 'fijo') rd.dataset.bar = '';
    if (innerHeight + y >= document.documentElement.scrollHeight - 40) rd.dataset.bar = '';
    progress(); wake();
  }
  function progress(){
    const art = S.active && $(`[data-ch="${S.active.id}"]`), fill = $('.rd-prog i'), left = $('.rd-left'); if (!art || !fill) return;
    let pct, P = null;
    if (isPaged() && (P = pgInfo())) pct = P.pages > 1 ? S.page / (P.pages - 1) : 1;
    else { const r = art.getBoundingClientRect(); pct = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); }
    fill.style.transform = `scaleX(${pct})`;
    art._w ??= (art.querySelector('.rd-body')?.textContent.match(/\S+/g) || []).length;
    trackSpeed(pct, art._w);
    if (!left) return;
    // como Kindle: un toque alterna entre minutos restantes, % del capítulo, % del volumen y (paginado) número de página
    const mode = leftMode(), ch = S.active;
    if (mode === 'cap') left.textContent = `${Math.round(pct * 100)} % del capítulo`;
    else if (mode === 'vol') { const vs = S.chapters.filter(c => c.vol === ch.vol), k = vs.indexOf(ch); left.textContent = `${Math.round(Math.min(1, (Math.max(0, k) + pct) / Math.max(1, vs.length)) * 100)} % del volumen ${ch.vol}`; }
    else if (mode === 'pag' && P) left.textContent = `Pág. ${S.page + 1} de ${P.pages}`;
    else { const min = Math.ceil(art._w * (1 - pct) / speed()); left.textContent = pct > .98 ? 'Fin del capítulo' : min <= 1 ? 'Menos de 1 min en el capítulo' : `Quedan ${min} min en el capítulo`; }
  }
  const LEFT = ['min', 'cap', 'vol', 'pag'];
  const leftMode = () => { let m = 'min'; try { m = localStorage.getItem('obi-left') || 'min'; } catch {} return m === 'pag' && !isPaged() ? 'min' : LEFT.includes(m) ? m : 'min'; };
  function cycleLeft(){ const m = LEFT.filter(x => x !== 'pag' || isPaged()), n = m[(m.indexOf(leftMode()) + 1) % m.length]; try { localStorage.setItem('obi-left', n); } catch {} progress(); }
  // velocidad personal (palabras por minuto): se mide con el tiempo entre movimientos (cada pausa cuenta como máx. 2 min)
  // al terminar un capítulo de al menos 300 palabras, y se guarda con los ajustes del lector. 230 mientras no hay datos.
  const speed = () => { const w = +S.remote?.global?.wpm; return w >= 100 && w <= 800 ? w : 230; };
  function trackSpeed(pct, words){
    const R = S.readT; if (!R || R.id !== S.active?.id || R.done) return;
    const now = Date.now(), gap = now - R.last; R.last = now; R.active += Math.min(gap, 120000); // una página larga sin desplazarse también es lectura; más de 2 min se toma como pausa
    if (R.pct0 == null) R.pct0 = pct;
    if (pct < .95 || words < 300 || R.active < 60000) return;
    R.done = true; const read = words * (pct - R.pct0); if (read < 250) return;
    const sample = read / (R.active / 60000); if (sample < 80 || sample > 900) return;
    const old = +S.remote.global.wpm; S.remote.global.wpm = Math.round(old >= 100 && old <= 800 ? old * .7 + sample * .3 : sample); savePrefs();
  }

  // ---------- modo paginado (BOOK☆WALKER / Kindle) ----------
  // El capítulo se reparte en columnas CSS del alto de la pantalla y el propio artículo se desplaza de lado:
  // mismo HTML, mismas anotaciones y mismo progreso por párrafo que en desplazamiento continuo.
  const isPaged = () => $('.rd')?.dataset.layout === 'paged';
  let pgRo = null;
  function pgInfo(){
    const art = S.active && $(`[data-ch="${S.active.id}"]`); if (!art) return null;
    const cs = getComputedStyle(art), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0, G = parseFloat(cs.columnGap) || 0;
    const step = art.clientWidth - pl - pr + G; if (step <= 0) return null;
    const base = art.getBoundingClientRect().left + pl;
    const at = r => S.page + Math.floor((r.left - base + 4) / step);
    const startPage = el => { const r = el.getClientRects()[0]; return r ? Math.max(0, at(r)) : S.page; };
    const endPage = el => { const rs = el.getClientRects(); return rs.length ? Math.max(0, at(rs[rs.length - 1])) : S.page; };
    const lastEl = art.querySelector('.rd-body > :not(.tn-hid):last-child') || art.lastElementChild;
    const pages = Math.max(1, Math.round((art.scrollWidth - pl - pr + G) / step), lastEl ? endPage(lastEl) + 1 : 1, art.lastElementChild ? endPage(art.lastElementChild) + 1 : 1);
    return { art, step, pages, startPage, endPage };
  }
  function goPage(n, keep){
    const P = pgInfo(); if (!P) return;
    S.page = Math.max(0, Math.min(P.pages - 1, n)); S.pgSet = true; P.art.scrollLeft = S.page * P.step; if (!keep) alignPage();
    if (!keep) { closePop(); hideQp(); const c = currentBlock(); S.pgBlock = c.block; }
    progress(); clearTimeout(S.saveT); S.saveT = setTimeout(saveProgress, 1200); wake();
  }
  function flip(d){
    const P = pgInfo(); if (!P) return;
    const art = P.art, top = art.getBoundingClientRect().top;
    // con el pie (siguiente capítulo) a la vista, «atrás» primero regresa a la página
    if (d < 0 && top < pgTop() - 20) return alignPage();
    if (S.page + d >= P.pages) { const nx = nextOf(S.active); if (art.getBoundingClientRect().bottom < innerHeight * .5 && nx) return go(`/leer/${S.series.slug}/${nx.num}`); const ft = $('.rd-foot'); if (ft) ft.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
    if (S.page + d < 0) return toast('Estás en la primera página');
    goPage(S.page + d);
  }
  const pgTop = () => (parseFloat(getComputedStyle($('.rd')).getPropertyValue('--top-h')) || 0) + ($('.rd-bar')?.offsetHeight || 0) + 8;
  function pageTap(e){
    const r = $('#rd-flow').getBoundingClientRect(), x = (e.clientX - r.left) / Math.max(1, r.width);
    if (x < .3) flip(-1); else if (x > .7) flip(1); else { const rd = $('.rd'); rd.dataset.bar = rd.dataset.bar === 'hide' ? '' : 'hide'; }
  }
  function pagedInit(){
    const art = $(`[data-ch="${S.active.id}"]`); if (!art) return;
    S.page = 0; S.pgSet = false; art.scrollLeft = 0;
    sizePaged();
    // si cambia el tamaño del artículo o el alto de la barra (la etiqueta de avance cambia de largo), se recalcula la página
    let barH = $('.rd-bar')?.offsetHeight || 0;
    pgRo?.disconnect(); pgRo = new ResizeObserver(() => { const h = $('.rd-bar')?.offsetHeight || 0; if (h !== barH && scrollY < 400) { barH = h; sizePaged(); } relayoutPaged(); }); pgRo.observe(art); if ($('.rd-bar')) pgRo.observe($('.rd-bar'));
    if (art._pg) return; art._pg = true;
    // el navegador también puede mover el artículo (buscar en la página, leer en voz alta): se alinea a la página más cercana
    art.addEventListener('scroll', () => { if (!isPaged()) return; const P = pgInfo(); if (!P) return; const n = Math.round(art.scrollLeft / P.step); if (n !== S.page || Math.abs(art.scrollLeft - n * P.step) > 2) { clearTimeout(S.snapT); S.snapT = setTimeout(() => goPage(n), 120); } }, { passive: true });
    document.fonts?.ready?.then(() => relayoutPaged());
    // En paginado las ilustraciones del capítulo se piden de inmediato: con carga diferida solo llegaban al pasar a su
    // página y el capítulo se reacomodaba mientras se leía. Así el único ajuste ocurre al abrir.
    art.querySelectorAll('.rd-body img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    // las ilustraciones sin medidas cambian el reparto al cargar: se vuelve a la página del mismo párrafo
    art.addEventListener('load', e => { if (e.target.tagName === 'IMG') { clearTimeout(S.relT); S.relT = setTimeout(relayoutPaged, 60); } }, true);
  }
  // alto de página = lo que queda visible bajo la barra del lector (en el celular la barra es más alta)
  function sizePaged(){
    const f = $('#rd-flow'), rd = $('.rd'); if (!f || !rd) return;
    rd.style.setProperty('--pgh', Math.max(260, Math.floor(innerHeight - pgTop() - 14)) + 'px');
    alignPage();
  }
  // deja la página justo debajo de la barra fija, para que se vea completa
  function alignPage(){ const f = $('#rd-flow'); if (!f) return; const d = f.getBoundingClientRect().top - pgTop(); if (Math.abs(d) > 3) scrollTo(0, Math.max(0, scrollY + d)); }
  let pgRz = 0; addEventListener('resize', () => { if (!isPaged()) return; clearTimeout(pgRz); pgRz = setTimeout(() => { sizePaged(); relayoutPaged(); }, 150); });
  function relayoutPaged(){
    if (!isPaged() || !S.active) return;
    const el = S.pgBlock != null && $(`[data-ch="${S.active.id}"] [data-b="${S.pgBlock}"]`), P = pgInfo(); if (!P) return;
    goPage(el ? P.startPage(el) : Math.min(S.page, P.pages - 1), true);
  }
  function pagedOff(){ pgRo?.disconnect(); pgRo = null; $('.rd')?.style.removeProperty('--pgh'); document.querySelectorAll('.rd-ch').forEach(a => { a.scrollLeft = 0; }); S.page = 0; }
  // deslizar el dedo para pasar página
  let swX = null, swY = 0;
  document.addEventListener('touchstart', e => { if (!isPaged() || !e.target.closest?.('#rd-flow') || e.touches.length > 1) { swX = null; return; } swX = e.touches[0].clientX; swY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => { if (swX == null || !isPaged()) return; const t = e.changedTouches[0], dx = t.clientX - swX, dy = t.clientY - swY; swX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && getSelection().isCollapsed) flip(dx < 0 ? 1 : -1); }, { passive: true });
  // ir a un párrafo concreto en cualquiera de los dos modos
  function toBlock(chId, block, flash = true){
    const el = $(`[data-ch="${chId}"] [data-b="${block}"]`); if (!el) return false;
    if (isPaged()) { const P = pgInfo(); S.pgBlock = block; if (P) goPage(P.startPage(el), true); } else scrollTo(0, el.getBoundingClientRect().top + scrollY - 90);
    if (flash) { el.classList.add('rd-flash'); setTimeout(() => el.classList.remove('rd-flash'), 1600); } return true;
  }
  async function saveProgress(){
    const ch = S.active;
    if (!ch || !S.series || !sameReaderAccount(S.activeOwner, getUser()?.id) || !$(`[data-ch="${ch.id}"]`)) return; // ya no está en pantalla: no pisar el progreso con «párrafo 0»
    if (S.resumePending?.chapterId === ch.id) return; // conservar progreso remoto pendiente de decisión
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
  function resumeBar(ch, pos, synced = false){
    const el = $('#rd-resume'); if (!el || !pos) return;
    if (pos.chapter_id === ch.id) {
      if (!synced || !(+pos.block > 0)) return;
      el.innerHTML = '<span>Hay una posición de lectura más reciente en otro dispositivo.</span><button class="btn" type="button">Ir a esa posición</button><button class="btn ghost" type="button">Seguir aquí</button>';
      el.hidden = false;
      el.querySelectorAll('button')[0].onclick = () => {
        S.resumePending = null; restorePosition(ch, pos); el.hidden = true;
      };
      el.querySelectorAll('button')[1].onclick = () => { S.resumePending = null; el.hidden = true; saveProgress(); };
      return;
    }
    const at = S.chapters.find(c => c.id === pos.chapter_id) || S.chapters.find(c => c.num === (pos.num ?? pos.chapter_num)); if (!at || at === ch) return;
    const pc = Math.round((pos.pct || 0) * 100);
    el.innerHTML = `<span>Te quedaste en <b>${esc(at.title)}</b>${pc ? ` · ${pc} %` : ''}</span><a class="btn" href="/leer/${S.series.slug}/${at.num}">Continuar ahí</a><button class="btn ghost" type="button" aria-label="Seguir aquí">Seguir aquí</button>`;
    el.hidden = false; el.querySelector('button').onclick = () => { S.resumePending = null; el.hidden = true; saveProgress(); };
  }
  // se llama en el mismo cuadro en que se pinta el capítulo: sin salto visible
  function restorePosition(ch, pos){
    const jump = S.jump?.num === ch.num ? S.jump : null; S.jump = null;
    if (jump && toBlock(ch.id, jump.block)) return;
    if (pos?.chapter_id === ch.id && pos.block > 0) { if (isPaged()) { S.pgBlock = pos.block; if (toBlock(ch.id, pos.block, false)) toast('Seguimos donde lo dejaste'); return; } const el = $(`[data-ch="${ch.id}"] [data-b="${pos.block}"]`); if (el) { scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); toast('Seguimos donde lo dejaste'); } }
    else if (!isPaged()) scrollTo(0, 0);
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
    document.querySelectorAll('.rd-bar [data-act], .rd-settings-dock, .rd-zen-x').forEach(b => b.onclick = () => { b.closest('details')?.removeAttribute('open'); ({ toc, prefs: prefsPanel, coms: () => comments(), left: cycleLeft, notes: () => go('/anotaciones/' + S.series.slug), offline: toggleOffline, zen: () => zen() })[b.dataset.act](); });
    panel()?.addEventListener('click', e => { if (e.target.closest('[data-panel-close]')) closePanel(); });
  }
  const panel = () => $('.rd-panel');
  function closePanel(){
    const pn = panel(); if (!pn) return;
    pn.hidden = true;
    const rd = $('.rd'); if (rd) delete rd.dataset.panelOpen;
    document.querySelectorAll('.rd [aria-controls="rd-panel"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  function toggle(html){
    const pn = panel(); if (!pn) return null;
    if (!pn.hidden && pn.dataset.kind === html.kind) { closePanel(); return null; }
    pn.dataset.kind = html.kind;
    pn.innerHTML = '<div class="rd-panel-head"><strong>' + (html.kind === 'prefs' ? 'Ajustes de lectura' : 'Índice de capítulos') + '</strong><button class="rd-panel-close" type="button" data-panel-close aria-label="Cerrar panel">✕</button></div>' + html.body;
    pn.hidden = false;
    // Solo al abrir o cambiar de herramienta: no desplazar el documento de lectura.
    // Los cambios de opciones dentro de Ajustes conservan su scroll mediante refreshPrefs.
    pn.scrollTop = 0; pn.scrollLeft = 0;
    document.querySelectorAll('.rd [aria-controls="rd-panel"]').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.act === html.kind)));
    $('.rd').dataset.panelOpen = html.kind;
    $('.rd').dataset.bar = '';
    return pn;
  }
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
    const opt = (k, list) => `<div class="rd-opt"><span class="mono">${list.label}</span><div>${list.o.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(p[k]) === String(v) ? 'on' : ''}" aria-pressed="${String(p[k]) === String(v)}">${l}</button>`).join('')}</div></div>`;
    const pn = toggle({ kind: 'prefs', body: `
      ${opt('controls', { label: 'Controles del lector', o: [['deslizable','Menú deslizable'],['fijo','Barra siempre visible']] })}
      ${opt('theme', { label: 'Tema', o: [['auto','Como el sistema'],['claro','Claro'],['sepia','Sepia'],['noche','Noche cálida'],['oscuro','Oscuro'],['negro','Negro (OLED)']] })}
      <div class="rd-opt"><span class="mono">Tamaño · <b data-size-l>${p.size}px</b></span><input type="range" min="14" max="30" value="${p.size}" data-k="size"></div>
      ${opt('font', { label: 'Tipografía', o: [['original','Original del EPUB'],['Literata','Literata'],['serif','Serif'],['sans','Sans']] })}
      ${opt('width', { label: 'Ancho', o: [['estrecho','Estrecho'],['normal','Normal'],['amplio','Amplio']] })}
      ${opt('lh', { label: 'Interlineado', o: [['compacto','Compacto'],['comodo','Cómodo'],['amplio','Amplio']] })}
      ${opt('align', { label: 'Alineación', o: [['izquierda','Izquierda'],['justificada','Justificada']] })}
      ${opt('para', { label: 'Párrafos', o: [['espacio','Separados'],['sangria','Con sangría, como libro']] })}
      ${opt('illus', { label: 'Ilustraciones', o: [['true','Mostrar'],['false','Ocultar']] })}
      ${opt('cw', { label: 'Avisos de contenido', o: [['show','Mostrar plegable'],['icon','Solo icono'],['hide','No mostrar']] })}
      ${opt('layout', { label: 'Pasar el texto', o: [['scroll','Desplazando'],['paged','Por páginas, como libro']] })}
      ${p.layout === 'paged' ? '<p class="mono rd-hint">Toca el borde derecho o izquierdo, desliza o usa ← →. El centro muestra u oculta la barra.</p>' : opt('continuous', { label: 'Lectura', o: [['off','Por capítulo'],['volume','Continua dentro del volumen'],['all','Continua entre volúmenes']] })}
      ${opt('notes', { label: 'Notas del traductor', o: [['inline','Dentro del texto'],['popup','Emergentes: toca el número']] })}
      ${opt('pcom', { label: 'Comentarios por párrafo', o: [['true','Mostrar globos'],['false','Ocultar']] })}
      ${p.continuous === 'off' || p.layout === 'paged' ? opt('autonext', { label: 'Al terminar un capítulo', o: [['true',`Pasar solo al siguiente (${Math.min(30, Math.max(3, +p.autosecs || 5))} s)`],['false','Quedarme al final']] }) + (p.autonext !== false ? `<div class="rd-opt"><label for="rd-autosecs" class="mono">Espera entre capítulos · <b data-autosecs-l>${Math.min(30, Math.max(3, +p.autosecs || 5))} s</b></label><input type="range" id="rd-autosecs" min="3" max="30" step="1" value="${Math.min(30, Math.max(3, +p.autosecs || 5))}" data-k="autosecs" aria-label="Segundos antes del siguiente capítulo"></div>` : '') : ''}
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
    tgt[k] = v; savePrefs(); applyPrefs(k); if (k === 'autonext' || k === 'continuous' || k === 'autosecs' || k === 'layout') footer();
    refreshPrefs(k);
  }
  // el panel Aa queda abierto: solo se actualiza la opción tocada
  function refreshPrefs(k){
    const pn = panel(); if (pn.hidden || pn.dataset.kind !== 'prefs') return;
    if (k === 'continuous' || k === 'autonext' || k === 'layout') { const st = pn.scrollTop; closePanel(); prefsPanel(); panel().scrollTop = st; return; }
    const p = effective(S.active.volume_id);
    pn.querySelectorAll(`button[data-k="${k}"]`).forEach(b => { const selected = String(p[k]) === b.dataset.v; b.classList.toggle('on', selected); b.setAttribute('aria-pressed', String(selected)); });
    if (k === 'size') pn.querySelector('[data-size-l]').textContent = p.size + 'px';
    if (k === 'autosecs') pn.querySelector('[data-autosecs-l]').textContent = Math.min(30, Math.max(3, +p.autosecs || 5)) + ' s';
  }
  async function applyPrefs(k){
    const p = effective(S.active.volume_id), rd = $('.rd');
    Object.assign(rd.dataset, { theme: p.theme, width: p.width, lh: p.lh, align: p.align, para: p.para, controls: p.controls === 'fijo' ? 'fijo' : 'deslizable' }); if (rd.dataset.controls === 'fijo') rd.dataset.bar = ''; syncFixedBarTop(); rd.style.setProperty('--rs', p.size + 'px');
    rd.dataset.font = p.font;
    if (k === 'awake') { if (p.awake === false) wl?.release(); else wake(); }
    // cambiar de fuente solo actualiza variables CSS, sin redibujar el texto
    if (k === 'font' || k == null) document.querySelectorAll('.rd-ch').forEach(a => { const c = S.chapters.find(x => x.id === a.dataset.ch), v = c && volOf(c); a.style.cssText = v ? fontVars(v, effective(c.volume_id)) : ''; });
    const wasPaged = rd.dataset.layout === 'paged', paged = p.layout === 'paged';
    if ((k === 'layout' || k == null) && wasPaged !== paged) {
      const { block: blk } = currentBlock();
      if (!paged) pagedOff();
      rd.dataset.layout = paged ? 'paged' : 'scroll';
      // en paginado se queda solo el capítulo activo (la lectura continua se pausa)
      if (paged && S.mounted.length > 1) { S.mounted = [S.active]; $('#rd-flow').innerHTML = chapterHTML(S.active, S.bodies.get(S.active.id), p); const a = $(`[data-ch="${S.active.id}"]`); markTerms(a); decorate(a); paintAnnots(); $('#rd-earlier').hidden = true; }
      observe(); if (paged) { pagedInit(); S.pgBlock = blk; } toBlock(S.active.id, blk, false); footer(); progress();
      return;
    }
    if (k === 'illus' || k === 'cw' || k === 'notes' || k === 'pcom') {
      const { block: blk } = currentBlock();
      $('#rd-flow').innerHTML = S.mounted.map(c => chapterHTML(c, S.bodies.get(c.id), effective(c.volume_id))).join(''); markTerms($('#rd-flow'));
      document.querySelectorAll('#rd-flow .rd-ch').forEach(decorate);
      paintAnnots(); observe();
      if (paged) { pagedInit(); S.pgBlock = blk; }
      toBlock(S.active.id, blk, false);
    }
    if (k === 'continuous') footer();
    if (paged && /^(size|font|width|lh|align|para)$/.test(k || '')) requestAnimationFrame(relayoutPaged);
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
      try { await removeVolume(key); btn.textContent = 'Guardar volumen sin conexión'; toast('Volumen ' + ch.vol + ' eliminado del dispositivo'); }
      catch (e) { toast('No se pudo borrar el volumen: ' + (e?.message || 'error de almacenamiento')); }
      return;
    }
    if (!navigator.onLine) return toast('Conéctate a internet para guardar el volumen y leerlo después sin conexión');
    if (!('caches' in window)) return toast('Tu navegador no permite guardar sin conexión');
    btn.disabled = true;
    const list = S.chapters.filter(c => c.vol === ch.vol);
    const assets = new Set(), inserted = new Set(), insertedChapters = new Set();
    const metaKey = '/offline/meta/' + S.series.slug;
    let c, previousMeta = null, metaWritten = false, complete = false;
    try {
      if (!list.length) throw new Error('El volumen no contiene capítulos');
      c = await caches.open(OFF_CACHE);
      previousMeta = await c.match(metaKey);
      let n = 0;
      for (const x of list) {
        btn.textContent = `Guardando ${++n}/${list.length}…`;
        const b = await body(x);
        if (!Array.isArray(b) || !b.length) throw new Error('No se pudo guardar el capítulo ' + x.num);
        // No sobrescribir ni borrar una descarga individual previa al completar el volumen.
        if (!await c.match(offKey(x))) {
          await c.put(offKey(x), new Response(JSON.stringify(b), { headers: { 'Content-Type': 'application/json' } }));
          insertedChapters.add(offKey(x));
        }
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
      btn.textContent = 'Quitar volumen del dispositivo';
      toast(`Volumen ${ch.vol} listo para leer sin conexión`);
      if (typeof Event !== 'undefined') document.dispatchEvent?.(new Event('obi-offline-change'));
      navigator.storage?.persist?.().catch(() => {});
    } catch (e) {
      // Una descarga fallida no debe dejar un volumen marcado como completo.
      if (c) {
        await Promise.allSettled([...insertedChapters].map(u => c.delete(u)));
        await Promise.allSettled([...inserted].map(u => c.delete(u)));
        if (metaWritten) {
          try { if (previousMeta) await c.put(metaKey, previousMeta); else await c.delete(metaKey); } catch {}
        }
      }
      toast('No se pudo guardar sin conexión. Intenta de nuevo: ' + (e?.message || 'sin espacio o sin conexión'));
    } finally {
      btn.disabled = false;
      if (!complete) btn.textContent = 'Guardar volumen sin conexión';
    }
  }
  async function removeVolume(key){
    const idx = offIndex(), it = idx[key]; if (!it) return;
    const others = Object.entries(idx).filter(([k]) => k !== key).map(([,v]) => v);
    const shared = new Set(others.flatMap(v => v.assets || []));
    const otherChapterKeys = new Set(others.flatMap(v => (v.nums || []).map(n => '/offline/' + v.slug + '/' + n)));
    const sameSeries = others.some(v => v.slug === it.slug);
    // Primero quitar el índice para no anunciar una descarga borrada a medias.
    const next = { ...idx }; delete next[key];
    localStorage.setItem(OFF_INDEX, JSON.stringify(next));
    const c = await caches.open(OFF_CACHE);
    const chapterKeys = it.nums.map(n => `/offline/${it.slug}/${n}`).filter(u => !otherChapterKeys.has(u));
    const exclusiveAssets = (it.assets || []).filter(u => !shared.has(u));
    await Promise.all([...chapterKeys, ...exclusiveAssets, ...(!sameSeries ? ['/offline/meta/' + it.slug] : [])].map(u => c.delete(u)));
    if (typeof Event !== 'undefined') document.dispatchEvent?.(new Event('obi-offline-change'));
  }
  function offlineList(){
    const items = Object.entries(offIndex()).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    if (!items.length) return '<p class="off-empty">Todavía no tienes descargas en este dispositivo. Puedes guardar novelas, volúmenes o capítulos desde Obras y Mi biblioteca, o un volumen desde el lector.</p>' + ((navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) && /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 0 ? '<p class="off-empty off-empty-note">En iPhone y iPad la app instalada guarda sus descargas aparte de Safari: lo que guardaste desde Safari no aparece aquí. Guárdalo de nuevo desde la app para leer sin conexión.</p>' : '');
    return `<div class="off-list">${items.map(([k, it]) => { let pos = null; try { pos = JSON.parse(localStorage.getItem(posKey(k.split(':')[0]))); } catch {}
      const here = pos && it.nums.includes(pos.num) ? pos.num : null, n = it.nums.length;
      return `<div class="off-it"><span><b>${esc(it.title)}</b><small>${it.kind === 'chapter' ? 'Capítulo ' + it.nums[0] + ' · Volumen ' + it.vol : 'Volumen ' + it.vol + ' · ' + n + (n === 1 ? ' capítulo' : ' capítulos')} · guardado ${new Date(it.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</small></span><a class="btn" href="/leer/${esc(it.slug)}/${here || it.nums[0]}">${here ? 'Continuar · cap. ' + here : 'Empezar a leer'}</a><button class="btn ghost" data-off="${esc(k)}">Borrar</button></div>`; }).join('')}</div><p class="mono" id="off-space"></p>`;
  }
  function bindOfflineList(root, after){
    root.querySelectorAll('[data-off]').forEach(b => b.onclick = async () => { if (!await confirmObi('¿Borrar esta descarga del dispositivo?')) return; await removeVolume(b.dataset.off); toast('Descarga eliminada'); after(); });
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
  function placePop(rect){
    const p = pop(); p.hidden = false;
    const w = p.offsetWidth, h = p.offsetHeight, left = rect.left + rect.width / 2 - w / 2;
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, left)) + 'px';
    const above = rect.top + scrollY - h - 10, below = rect.bottom + scrollY + 10;
    // En pantallas táctiles el sistema pone su propio menú (Copiar, Compartir…) ENCIMA de la selección y tapaba el de
    // El Obi: ahí va debajo. Con mouse sigue arriba, como antes.
    const coarse = matchMedia('(pointer: coarse)').matches;
    const top = coarse ? (below + h <= scrollY + innerHeight - 8 ? below : above) : (above >= scrollY + 8 ? above : below);
    // nunca debajo de la cabecera ni de la barra fijas del lector
    const bar = $('.rd-bar')?.getBoundingClientRect(), minY = scrollY + (bar && bar.bottom > 0 && bar.top < innerHeight / 2 ? bar.bottom + 8 : 8);
    p.style.top = Math.max(minY, Math.min(scrollY + innerHeight - h - 8, top)) + 'px';
  }
  // ---------- citas de uno o varios párrafos ----------
  // Los subrayados siguen siendo de un párrafo (así se guardan); la cita puede abarcar párrafos seguidos del mismo
  // capítulo. Se omiten notas del traductor, ilustraciones y separadores. Los párrafos se separan con salto de línea.
  const quotable = el => !!el && /^(P|BLOCKQUOTE|H3)$/.test(el.tagName) && !el.classList.contains('tn-hid');
  const flat = t => String(t || '').replace(/\s+/g, ' ').trim();
  function spanQuote(r, bEl, start, whole){
    const art = bEl.closest('.rd-ch'), all = [...art.querySelectorAll('.rd-body > [data-b]')].filter(quotable), i0 = all.indexOf(bEl); if (i0 < 0) return '';
    const endNode = r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentElement, eEl = endNode?.closest('[data-b]');
    let i1 = eEl && eEl.closest('.rd-ch') === art ? all.indexOf(eEl) : -1, endOff = null;
    if (i1 >= 0) endOff = textOffset(eEl, r.endContainer, r.endOffset);
    else { i1 = i0; all.forEach((el, k) => { if (k > i0 && r.intersectsNode(el)) i1 = k; }); }   // terminó en una nota, ilustración u otro capítulo
    if (i1 > i0 && endOff === 0) { i1--; endOff = null; }                                         // la selección llega justo al inicio del siguiente
    const list = all.slice(i0, Math.max(i0, i1) + 1);
    return list.map((el, k) => { const t = el.textContent; return flat(whole ? t : t.slice(k === 0 ? start : 0, k === list.length - 1 && endOff != null ? endOff : t.length)); }).filter(Boolean).join('\n');
  }
  function onSelect(){
    const sel = getSelection(); if (!sel || sel.isCollapsed) return;
    const r = sel.getRangeAt(0), bEl = r.startContainer.parentElement?.closest('[data-b]'), art = bEl?.closest('.rd-ch');
    if (!bEl || !art) return;
    const endIn = bEl.contains(r.endContainer);
    const start = textOffset(bEl, r.startContainer, r.startOffset), end = endIn ? textOffset(bEl, r.endContainer, r.endOffset) : bEl.textContent.length;
    const quote = bEl.textContent.slice(start, end).trim(); if (!quote) return;
    const draft = { chapter_id: art.dataset.ch, block: +bEl.dataset.b, start_at: start, end_at: end, quote };
    // para citar: todo lo seleccionado, aunque cruce párrafos; «Párrafo completo» toma los párrafos enteros
    const cited = { ...draft, quote: spanQuote(r, bEl, start) || quote }, wholeQ = () => ({ ...draft, quote: spanQuote(r, bEl, start, true) || quote });
    pop().innerHTML = Object.entries(COLORS).map(([k, c]) => `<button class="sw" data-c="${k}" style="--swatch:${c}" aria-label="Subrayar ${k}"></button>`).join('') + '<button data-x="note">Nota</button><button data-x="quote">Citar</button><button data-x="card">Imagen</button><button data-x="whole" title="Hacer una tarjeta con el párrafo completo">Párrafo completo</button><button data-x="pcom">Comentar</button>';
    placePop(r.getBoundingClientRect()); S.popRange = r.cloneRange();
    pop().onclick = async e => {
      const c = e.target.dataset.c, x = e.target.dataset.x;
      if (x === 'quote') { copyQuote(cited); return closePop(); }
      if (x === 'card') { closePop(); return quoteImage(cited); }
      if (x === 'whole') { closePop(); sel.removeAllRanges(); return quoteImage(wholeQ()); }
      if (x === 'pcom') { closePop(); sel.removeAllRanges(); return comments(draft.block, draft.chapter_id); }
      const a = await createAnnot({ ...draft, color: c || 'gold' }); if (!a) return;
      sel.removeAllRanges(); if (x === 'note') editAnnot(a); else closePop();
    };
  }
  const closePop = () => { const p = pop(); if (p) p.hidden = true; S.popRange = null; };
  // El menú de la selección acompaña a la selección: al desplazarse se recoloca dentro de la pantalla (antes se quedaba
  // en su sitio del texto y se perdía al navegar), y al mover los extremos de la selección en el celular se actualiza.
  let popRaf = 0, selT = 0;
  const followPop = () => { popRaf = 0; const p = pop(), r = S.popRange; if (!p || p.hidden || !r) return;
    if (getSelection().isCollapsed) return closePop();
    const rc = r.getBoundingClientRect(); if (!rc.width && !rc.height) return;
    placePop({ left: rc.left, width: rc.width, top: Math.max(rc.top, 8), bottom: Math.min(rc.bottom, innerHeight - 8) }); };
  addEventListener('scroll', () => { if (S.popRange && !popRaf) popRaf = requestAnimationFrame(followPop); }, { passive: true });
  addEventListener('resize', () => { if (S.popRange && !popRaf) popRaf = requestAnimationFrame(followPop); });
  document.addEventListener('selectionchange', () => {
    if (!$('.rd')) return; clearTimeout(selT);
    selT = setTimeout(() => {
      const sel = getSelection(), p = pop(); if (!p) return;
      if (sel.isCollapsed) { if (S.popRange && !p.querySelector('textarea')) closePop(); return; }
      const n = sel.anchorNode?.parentElement; if (!n?.closest?.('.rd-body') || p.querySelector('textarea')) return;
      if (matchMedia('(pointer: coarse)').matches) onSelect();   // extremos ajustados con el dedo: rehacer con la nueva selección
    }, 220);
  });
  // Con mouse: al pasar sobre un párrafo aparece en el margen un botón para hacer su tarjeta sin seleccionar nada.
  // (En el celular: mantener presionada una palabra y tocar «Párrafo completo».) Es un solo botón que se mueve: no añade
  // un elemento por párrafo ni paradas de tabulación.
  let qpT = 0;
  const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  function qpBtn(){
    let b = $('.rd-qp'); if (b) return b; const host = pop()?.parentElement; if (!host) return null;
    b = document.createElement('button'); b.type = 'button'; b.className = 'rd-qp'; b.tabIndex = -1; b.hidden = true;
    b.title = 'Hacer una tarjeta con este párrafo'; b.setAttribute('aria-label', 'Citar este párrafo como imagen'); host.appendChild(b); return b;
  }
  const hideQp = () => { const b = $('.rd-qp'); if (b) { b.hidden = true; b._p = null; } };
  document.addEventListener('mouseover', e => {
    if (!$('.rd') || !finePointer() || $('.iv') || !getSelection().isCollapsed) return;
    const t = e.target, para = t.closest?.('#rd-flow .rd-body > [data-b]');
    if (para && quotable(para)) {
      clearTimeout(qpT); const b = qpBtn(); if (!b) return;
      const r = para.getBoundingClientRect(), r0 = para.getClientRects()[0] || r;
      // solo si cabe en el margen: nunca encima del texto (ventanas angostas usadas con mouse)
      if (r0.left - 42 < 4) return hideQp();
      b._p = para; b.style.top = (r0.top + scrollY + 2) + 'px'; b.style.left = (r0.left - 42) + 'px'; b.hidden = false;
    } else if (!t.closest?.('.rd-qp')) { clearTimeout(qpT); qpT = setTimeout(hideQp, 350); }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest?.('.rd-qp'); if (!b || !b._p?.isConnected) return;
    const p = b._p, art = p.closest('.rd-ch'); hideQp();
    quoteImage({ chapter_id: art.dataset.ch, block: +p.dataset.b, quote: flat(p.textContent) });
  });
  // al desplazarse acompaña a su párrafo; si el párrafo sale de la pantalla, se oculta
  addEventListener('scroll', () => { const b = $('.rd-qp:not([hidden])'); if (!b) return; const r0 = b._p?.isConnected && b._p.getClientRects()[0];
    if (!r0 || r0.bottom < 0 || r0.top > innerHeight || r0.left - 42 < 4) return hideQp(); b.style.top = (r0.top + scrollY + 2) + 'px'; }, { passive: true });
  async function createAnnot(d){
    const user = getUser(); if (!user) { toast('Entra para guardar subrayados'); go('/entrar'); return null; }
    if (!navigator.onLine) { toast('Sin conexión: podrás subrayar cuando vuelvas a tener internet'); return null; }
    const { data, error } = await sb.from('annotations').insert({ ...d, user_id: user.id }).select().single();
    if (error) { toast('No se pudo guardar: ' + error.message); return null; }
    S.annots.push(data); paintAnnots(data.chapter_id); return data;
  }
  function cite(a){ const ch = S.chapters.find(c => c.id === a.chapter_id); return `«${a.quote}»\n— ${S.series.title}, Vol. ${ch?.vol} · ${ch?.title}\n${location.origin}/leer/${S.series.slug}/${ch?.num}`; }
  // cita como tarjeta (imagen PNG generada en el navegador; sin servidor)
  async function quoteImage(a){
    const ch = S.chapters.find(c => c.id === a.chapter_id), sh = $('.gl-sheet'); if (!sh) return;
    const vol = ch && volOf(ch), coverPath = vol?.cover_path || S.series.cover_path;
    try { const m = await extras(); S.qcClean?.(); S.qcClean = m.quoteSheet(sh, {
        quote: a.quote, title: S.series.title, sub: `Vol. ${ch?.vol ?? ''} · ${ch?.title || ''}`, team: S.series.teams?.name || '', site: location.host, toast,
        text: q => cite({ ...a, quote: q || a.quote }),
        teamColor: S.series.teams?.color || null,
        season: getComputedStyle($('.rd') || document.documentElement).getPropertyValue('--gold').trim() || null,
        user: async () => { const u = getUser(); if (!u) return null; const { data } = await sb.from('profiles').select('username').eq('id', u.id).maybeSingle(); return data?.username || null; },
        cover: coverPath ? { src: media(coverPath), label: vol?.cover_path ? 'Portada del volumen ' + ch.vol : 'Portada de la obra' } : null,
        images: () => volumeImages(ch) });
      S.glFrom = null; sh.querySelector('.gl-x')?.focus({ preventScroll: true }); }
    catch { toast('No se pudo preparar la imagen'); }
  }
  // ilustraciones del volumen: de la función volume_images (migración 20261124) o, sin ella, de los capítulos abiertos
  async function volumeImages(ch){
    const fromDom = () => [...document.querySelectorAll('#rd-flow .rd-ch')].filter(a => chOfEl(a)?.vol === ch.vol).flatMap(art => { const c = chOfEl(art); return [...art.querySelectorAll('.rd-body figure img')].map(i => ({ src: i.getAttribute('src'), label: labelOf(c) })); });
    if (!ch?.volume_id || !navigator.onLine) return fromDom();
    let all = S.gal?.[ch.volume_id];
    if (!all) { const { data, error } = await sb.rpc('volume_images', { p_volume: ch.volume_id }).then(x => x, () => ({ error: true })); if (error || !data) return fromDom(); all = (S.gal ||= {})[ch.volume_id] = data; }
    const list = all.map(r => { const c = S.chapters.find(x => x.num === r.chapter_num); return { src: media(r.url), label: (c ? labelOf(c) : 'Cap. ' + r.chapter_num) + (r.caption ? ' · ' + r.caption : '') }; });
    return list.length ? list : fromDom();
  }
  // ---------- visor de ilustraciones (BOOK☆WALKER) ----------
  async function viewer(im){
    const ch = chOfEl(im); if (!ch) return;
    const src = im.getAttribute('src');
    const items = [...document.querySelectorAll('#rd-flow .rd-ch')].flatMap(art => { const c = chOfEl(art); return [...art.querySelectorAll('.rd-body figure img')].map(i => ({ src: i.getAttribute('src'), alt: i.alt, caption: i.closest('figure')?.querySelector('figcaption')?.textContent || '', num: c?.num, block: +i.closest('[data-b]')?.dataset.b, label: c ? labelOf(c) : '' })); });
    let m; try { m = await extras(); } catch { return; }
    const v = m.openViewer({ items, index: Math.max(0, items.findIndex(x => x.src === src)), from: im, onGo: goImage });
    // la galería completa del volumen llega después (función volume_images de la migración 20261124); sin ella se queda con las de la página
    if (!ch.volume_id || !navigator.onLine) return;
    let all = S.gal?.[ch.volume_id];
    if (!all) { const { data, error } = await sb.rpc('volume_images', { p_volume: ch.volume_id }).then(x => x, () => ({ error: true })); if (error || !data?.length) return; all = (S.gal ||= {})[ch.volume_id] = data; }
    if (!$('.iv') || all.length <= items.length) return;  // la galería del servidor solo se usa si trae más que la página
    v.update(all.map(r => { const c = S.chapters.find(x => x.num === r.chapter_num); return { src: media(r.url), alt: r.alt, caption: r.caption, num: r.chapter_num, block: r.block, label: c ? labelOf(c) : 'Cap. ' + r.chapter_num }; }));
  }
  function goImage(it){
    const c = S.chapters.find(x => x.num === it.num); if (!c) return;
    if (S.mounted.includes(c) && toBlock(c.id, it.block)) return;
    S.jump = { num: c.num, block: it.block }; go(`/leer/${S.series.slug}/${c.num}`);
  }
  async function copyQuote(a){ const t = cite(a); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Cita copiada'); } } catch {} }
  function editAnnot(a){
    S.popRange = null; // el editor de la nota no sigue a la selección ni se cierra al desplazarse
    const m = $(`mark[data-an="${a.id}"]`); if (!m) return;
    pop().innerHTML = `<div style="display:grid;gap:8px;width:min(320px,80vw)">
      <div style="display:flex;gap:6px">${Object.entries(COLORS).map(([k, c]) => `<button class="sw ${a.color === k ? 'on' : ''}" data-c="${k}" style="--swatch:${c}" aria-label="${k}"></button>`).join('')}</div>
      <textarea rows="3" placeholder="Nota privada">${esc(a.note || '')}</textarea>
      <label class="mono"><input type="checkbox" ${a.shared ? 'checked' : ''} data-share> Compartir como cita pública</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-x="save">Guardar</button><button class="btn ghost" data-x="quote">Citar</button><button class="btn ghost" data-x="card">Imagen</button><button class="btn ghost" data-x="del">Borrar</button></div></div>`;
    placePop(m.getBoundingClientRect());
    pop().onclick = async e => {
      const c = e.target.dataset.c, x = e.target.dataset.x;
      if (c) { a.color = c; pop().querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === c)); return; }
      if (x === 'quote') return copyQuote(a);
      if (x === 'card') { closePop(); return quoteImage(a); }
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
  // para = índice del párrafo (data-b): muestra y publica solo los comentarios de ese párrafo (estilo Wattpad)
  async function comments(para = null, chId = null){
    if (para != null && !Number.isInteger(para)) para = null;
    const ch = S.chapters.find(c => c.id === chId) || S.active, pn = toggle({ kind: 'coms' + (para ?? ''), body: '<p class="mono">Cargando comentarios…</p>' }); if (!pn) return;
    const kind = pn.dataset.kind;
    if (!navigator.onLine) { pn.innerHTML = '<p class="mono">Los comentarios necesitan conexión a internet.</p>'; return; }
    const [{ data: list }, { data: tm }, { data: authors }] = await Promise.all([
      sb.from('comments').select('id,parent_id,user_id,body,spoiler,pinned,para,created_at').eq('chapter_id', ch.id).order('created_at').limit(500),
      S.teamIds ? { data: null } : sb.from('team_members').select('user_id').eq('team_id', S.series.team_id),
      sb.rpc('comment_public_authors', { p_chapter: ch.id })]);
    if (tm) S.teamIds = new Set(tm.map(x => x.user_id));
    if (pn.hidden || pn.dataset.kind !== kind || !S.mounted.includes(ch)) return;
    const reload = () => { closePanel(); comments(para, ch.id); const art = $(`[data-ch="${ch.id}"]`); if (art) paraComments(art); };
    const authorById=Object.fromEntries((authors||[]).map(x=>[x.user_id,{username:x.username,avatar_url:x.avatar_url}]));
    const u = getUser(), every = (list || []).filter(c => !window.__obiBlocks?.has(c.user_id)).map(c=>({...c,profiles:authorById[c.user_id]||null}));
    // en la vista de un párrafo: sus comentarios y las respuestas a ellos
    const roots = new Set(every.filter(c => !c.parent_id && (para == null || c.para === para)).map(c => c.id));
    const all = every.filter(c => c.parent_id ? roots.has(c.parent_id) : roots.has(c.id)), top = all.filter(c => !c.parent_id).sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)));
    const kids = id => all.filter(c => c.parent_id === id);
    const ago = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? 'hace ' + Math.max(1, m) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
    const one = (c, reply) => `<div class="cm-it${reply ? ' re' : ''}" data-cid="${c.id}"><span class="cm-hd"><b>${esc(c.profiles?.username || 'Lector')}</b>${S.teamIds?.has(c.user_id) ? '<span class="cm-tm">EQUIPO</span>' : ''}${c.pinned ? '<span class="cm-tm pin">FIJADO</span>' : ''}<span class="mono">${ago(c.created_at)}</span>${para == null && !reply && c.para != null ? `<button class="lnk cm-para" data-gopara="${+c.para}">párrafo ${+c.para + 1}</button>` : ''}</span>
      ${c.spoiler ? `<details class="cm-spd"><summary>Contiene spoiler · toca para ver</summary><p>${esc(c.body)}</p></details>` : `<p>${esc(c.body)}</p>`}
      <span class="cm-ac">${!reply && u ? `<button class="lnk" data-reply="${c.id}">Responder</button>` : ''}${u && c.user_id === u.id ? `<button class="lnk danger" data-cdel="${c.id}">Borrar</button>` : ''}</span></div>`;
    const form = (parent = '') => u ? `<form class="cm-form" data-parent="${parent}"><textarea name="body" rows="${parent ? 2 : 3}" maxlength="2000" required placeholder="${parent ? 'Tu respuesta…' : para != null ? '¿Qué te hizo sentir este párrafo?' : '¿Qué te pareció este capítulo?'}" aria-label="Comentario"></textarea><span><label class="rd-scope"><input type="checkbox" name="spoiler"> Contiene spoiler</label><button class="btn">${parent ? 'Responder' : 'Publicar'}</button></span></form>` : '<p class="mono"><a href="/entrar">Entra</a> para comentar.</p>';
    const pEl = para != null && $(`[data-ch="${ch.id}"] [data-b="${para}"]`), pTxt = pEl ? pEl.textContent.replace(/\s+/g, ' ').trim() : '';
    const head = para != null ? `<h4>Párrafo ${para + 1} · ${all.length} ${all.length === 1 ? 'comentario' : 'comentarios'}</h4>${pTxt ? `<blockquote class="cm-q">${esc(pTxt.length > 160 ? pTxt.slice(0, 160).replace(/\s+\S*$/, '') + '…' : pTxt)}</blockquote>` : ''}<p><button class="lnk" data-allcoms>Ver todos los comentarios del capítulo</button></p>` : `<h4>Comentarios · ${all.length}</h4><p class="mono cm-tip">Para comentar una línea concreta, selecciónala y toca «Comentar».</p>`;
    pn.innerHTML = `${head}${form()}<div class="cm-list">${top.map(c => one(c) + kids(c.id).map(k => one(k, true)).join('')).join('') || '<p class="mono">Sé la primera persona en comentar.</p>'}</div>`;
    const post = async (f, parent) => { const b = f.querySelector('.btn'); b.disabled = true;
      const { error } = await sb.from('comments').insert({ chapter_id: ch.id, user_id: u.id, body: f.body.value.trim(), spoiler: f.spoiler.checked, parent_id: parent, para });
      b.disabled = false; if (error) return toast(error.message); toast(parent ? 'Respuesta publicada' : 'Comentario publicado'); reload(); };
    pn.querySelectorAll('.cm-form').forEach(f => f.onsubmit = e => { e.preventDefault(); post(f, f.dataset.parent ? +f.dataset.parent : null); });
    pn.querySelectorAll('[data-reply]').forEach(b => b.onclick = () => { const it = b.closest('.cm-it'); if (it.nextElementSibling?.classList.contains('cm-form')) return; it.insertAdjacentHTML('afterend', form(b.dataset.reply)); const f = it.nextElementSibling; f.body.focus();
      f.onsubmit = e => { e.preventDefault(); post(f, +b.dataset.reply); }; });
    pn.querySelectorAll('[data-cdel]').forEach(b => b.onclick = async () => { if (!await confirmObi('¿Borrar tu comentario?')) return; const { error } = await sb.from('comments').delete().eq('id', b.dataset.cdel); if (error) return toast(error.message); reload(); });
    pn.querySelector('[data-allcoms]')?.addEventListener('click', () => { closePanel(); comments(null, ch.id); });
    pn.querySelectorAll('[data-gopara]').forEach(b => b.onclick = () => { closePanel(); toBlock(ch.id, +b.dataset.gopara); });
    if (pEl) { pEl.classList.add('rd-flash'); setTimeout(() => pEl.classList.remove('rd-flash'), 1600); }
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

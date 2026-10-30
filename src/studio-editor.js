import { confirmObi, inputObi } from './obi-dialog.js';
// Editor de Studio. Se carga únicamente al abrir un capítulo.
import { blocksToEditor, editorToBlocks, pasteToEditor, renderBlock, warningsHTML, teaserHTML, figureHTML, makesBlock, FONTS, CW } from './blocks.js?v=2';
import { askEditorialAnnouncement, saveEditorialRecord } from './editorial-announcements.js?v=1';
import {setupEditorialCollaboration} from './editorial-suggestion-panel.js?v=1';
import {setupEditorialApproval,teamApprovalRequired} from './editorial-approval-panel.js?v=1';
import {attachWritingTools,TYPING_PREF_KEY} from './editorial-writing-tools.js?v=1';
import {chapterPreviewModel,tagPreviewBlock,previewBlockScrollTop} from './editorial-visual-preview.js?v=1';
export function createEditor(deps) {
  const { sb, app, $, esc, toast, go, getUser, getMe, url, PUB, media, pathOf, T, can, ensure, fmtTz, fromLocal, toLocal, tzHint, busy, shell, bindPicker, names, home, errMsg, rpc, LIMITS, SEC } = deps;
  // ---------- editor de página: vista previa del lector, revisión automática, historial, avance y marcadores ----------
  const LINT = [['dbl','Dobles espacios','Espacios repetidos entre palabras.'],['quotes','Comillas mezcladas','Usas «» y también "": se cambian a «».'],['dash','Guion de diálogo','Diálogos que empiezan con - o –: se cambian a raya (—).'],['dots','Puntos suspensivos','«...» se cambia por «…».'],['space','Espacio antes de signo','Espacio sobrante antes de , . ; : ? ! »'],['open','Signos de apertura','Párrafos con ? o ! sin su ¿ o ¡. Revísalos a mano.'],['alt','Ilustraciones sin descripción','Texto alternativo para lectores de pantalla. Toca la imagen para añadirlo.'],['gloss','Términos del glosario','Escritos con mayúsculas distintas a las del glosario.']];
  const REV_KIND = { manual: 'Guardado manual', auto: 'Autoguardado', restore: 'Restauración', publish: 'Publicación', baseline: 'Estado inicial recuperado', import: 'Importación / creación', before_import: 'Antes del reemplazo' };
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const agoEd = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
  async function editor(id){
    if (!(await ensure())) return;
    const { data: c } = await sb.from('chapters').select('*, series(slug,title,team_id)').eq('id', id).maybeSingle();
    if (!c) return go('/estudio');
    const KEY = 'obi-draft-' + id, now = new Date().toISOString();
    const [{ data: gl }, { data: coms }, { data: reps0 }, { data: nx }, { data: sib }] = await Promise.all([
      sb.from('glossary_terms').select('term,category,definition').eq('series_id', c.series_id),
      sb.from('comments').select('id,para,body,spoiler,created_at,user_id').eq('chapter_id', id).is('parent_id', null).order('created_at', { ascending: false }).limit(100),
      sb.from('reports').select('id,kind,quote,fix,created_at').eq('chapter_id', id).eq('status', 'open').order('created_at', { ascending: false }),
      sb.from('schedule').select('at').eq('series_id', c.series_id).gte('at', now).order('at').limit(1),
      sb.from('chapters').select('id,num,title,section_type,vol').eq('series_id', c.series_id).is('deleted_at', null).order('num')]);
    const reps = reps0 || [], who = await names((coms || []).map(x => x.user_id));
    const terms = (gl || []).filter(g => /\p{Lu}/u.test(g.term)).sort((a, b) => b.term.length - a.term.length);
    const nextWhen = nx?.[0]?.at ? fmtTz(nx[0].at, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'fecha del siguiente';
    const meta = { section_type: c.section_type || 'Capítulo', teaser: c.teaser || '', teaser_on: !!c.teaser_on, content_warnings: [...(c.content_warnings || [])] };
    let version = c.version, dirty = false, conflict = false, edits = 0, autoT = 0, pvT = 0, saving = null, lastRange = null, viewing = null, L = { counts: {}, total: 0, gloss: [] };
    const savedView = localStorage.getItem('obi-ed-view');
    const initialView = ['orig','edit','split','preview'].includes(savedView) ? savedView : (window.matchMedia?.('(max-width: 760px)').matches ? 'edit' : 'split');
    const UI = { view: initialView, theme: 'oscuro', device: 'desk' };
    const local = (() => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } })();
    const hasLocal = local?.at && (local.html || local.blocks);
    const ST2 = { draft: 'Borrador', scheduled: 'Programado', published: 'Publicado' };
    const SIB = sib || [], si = SIB.findIndex(x => x.id === id), prevC = si > 0 ? SIB[si - 1] : null, nextC = si >= 0 && si < SIB.length - 1 ? SIB[si + 1] : null;
    const chLbl = x => (x.section_type && x.section_type !== 'Capítulo' ? x.section_type : 'Cap. ' + x.num) + (x.title ? ' — ' + x.title : '');
    const meU = getUser(), myName = (await names([meU?.id]))[meU?.id] || 'Alguien del equipo';
    let src = c.source_text || '', srcEdit = !src.trim(), srcT = 0, curIdx = -1, chan = null;
    app.innerHTML = shell('Editar capítulo', `<div class="ed">
      <p class="mono ed-crumb"><span><a href="/estudio/obra/${c.series.slug}">‹ ${esc(c.series.title)}</a> · Vol. ${c.vol} · <span id="stpill">${ST2[c.status] || c.status}</span> · versión <span id="ver">${version}</span> · <span id="count"></span></span><span class="ed-nav">${prevC ? `<a href="/estudio/editar/${prevC.id}" title="${esc(chLbl(prevC))} · Ctrl+Alt+←">← Anterior</a>` : '<span class="off">← Anterior</span>'}<span>${si + 1} / ${SIB.length}</span>${nextC ? `<a href="/estudio/editar/${nextC.id}" title="${esc(chLbl(nextC))} · Ctrl+Alt+→">Siguiente →</a>` : '<span class="off">Siguiente →</span>'}</span></p>
      ${hasLocal ? `<div class="st-card" id="localcard"><span>Hay una copia local sin guardar del ${fmtTz(local.at)}${local.version !== version ? ` (hecha sobre la versión ${local.version}; la actual es ${version})` : ''}.</span><span><button class="btn" id="restore">Recuperar</button> <button class="btn ghost" id="discard">Descartar</button></span></div>` : ''}
      <div id="ctx"></div><div id="pres"></div>
      <div class="ed-top">
        <label class="ed-title-label" for="ttl">Título del capítulo <span class="mono" id="ttlcount" aria-live="off"></span></label>
        <textarea id="ttl" rows="2" maxlength="300" aria-describedby="ttlcount" aria-label="Título del capítulo">${esc(c.title)}</textarea>
        <div class="ed-top-actions">
        <select id="stype" aria-label="Tipo de sección">${SEC.map(s => `<option ${s === meta.section_type ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <span class="ed-state" id="state" role="status">✓ Guardado</span>
        <button class="btn" id="save" title="Ctrl/Cmd+S">Guardar</button>
        <button class="btn ghost" id="b-zen" title="Modo concentración · Ctrl+Shift+F" aria-pressed="false">⛶ Concentración</button>
        <details class="ed-panels-menu"><summary>Revisión y equipo</summary><div class="ed-panels-actions">
          <button class="btn ghost" id="b-rev" aria-expanded="false" aria-controls="p-rev">✓ Revisar</button>
          <button class="btn ghost" id="b-hist" aria-expanded="false" aria-controls="p-hist">◷ Historial</button>
          <button class="btn ghost" id="b-sug" aria-expanded="false" aria-controls="p-sug">✎ Sugerencias</button>
          <button class="btn ghost" id="b-approval" aria-expanded="false" aria-controls="p-approval">◎ Aprobación</button>
        </div></details></div>
        <div class="ed-pub" id="pub" aria-label="Publicación y programación"></div>
      </div>
      <div class="ed-box" id="p-rev" hidden></div>
      <div class="ed-box" id="p-hist" hidden></div>
      <section class="ed-box" id="p-sug" aria-label="Sugerencias del equipo" hidden></section>
      <section class="ed-box" id="p-approval" aria-label="Aprobación editorial" hidden></section>
      <details class="ed-box" id="p-set"><summary>Ajustes del capítulo · avance y marcadores de contenido <span class="mono" id="setsum"></span></summary>
        <div class="ed-set">
          <div style="display:grid;gap:8px;align-content:start"><label style="display:grid;gap:6px;font-size:13px;font-weight:600">Avance del próximo capítulo<textarea id="teaser" rows="4" maxlength="1000" placeholder="Unas líneas para dejar con ganas…">${esc(meta.teaser)}</textarea></label>
            <label style="display:flex;gap:10px;align-items:center;font-size:13px;font-weight:400"><input type="checkbox" id="teaser_on" ${meta.teaser_on ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--gold)"> Mostrarlo al terminar este capítulo, con la fecha del siguiente</label></div>
          <div style="display:grid;gap:8px;align-content:start"><span style="font-size:13px;font-weight:600">Marcadores de contenido</span>
            <div class="ed-chips" id="cw">${CW.map(w => `<button type="button" class="ed-chip ${meta.content_warnings.includes(w) ? 'on' : ''}" aria-pressed="${meta.content_warnings.includes(w)}" data-cw="${esc(w)}">${esc(w)}</button>`).join('')}</div>
            <span style="font-size:12px;color:#a89f8a;line-height:1.45">Aparecen como aviso plegable al inicio del capítulo. Cada lector decide en sus ajustes si los ve plegados, solo como icono o nunca.</span></div>
        </div></details>
      <div class="ed-mobile-view" role="group" aria-label="Modo de edición en pantalla pequeña"><button type="button" class="ed-btn" data-view="edit" aria-controls="split">Editor</button><button type="button" class="ed-btn" data-view="preview" aria-controls="split">Vista previa</button><button type="button" class="ed-btn" data-view="split" aria-controls="split">Ambos</button><button type="button" class="ed-btn" data-view="orig" aria-controls="split">Original</button></div>
      <p class="ed-toolbar-hint" id="ed-toolbar-hint">Desliza la barra de formato horizontalmente para ver más herramientas.</p>
      <div class="ed-bar" role="toolbar" aria-label="Formato" aria-describedby="ed-toolbar-hint">
        <select id="blk" aria-label="Tipo de bloque"><option value="P">Párrafo</option><option value="H3">Título</option><option value="BLOCKQUOTE">Cita</option><option value="ASIDE">Nota del traductor</option></select>
        <select id="ff" aria-label="Tipografía del fragmento"><option value="">Tipografía del cuerpo</option>${FONTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}<option value="-">Quitar tipografía</option></select>
        <span class="div"></span>
        <button class="ed-btn" data-cmd="bold" title="Negrita (Ctrl+B)" aria-label="Negrita"><b>B</b></button><button class="ed-btn" data-cmd="italic" title="Cursiva (Ctrl+I)" aria-label="Cursiva"><i>I</i></button><button class="ed-btn" data-cmd="underline" title="Subrayado (Ctrl+U)" aria-label="Subrayado"><u>U</u></button><button class="ed-btn" data-cmd="strikeThrough" title="Tachado" aria-label="Tachado"><s>S</s></button>
        <button class="ed-btn" data-act="ruby" title="Furigana sobre la selección" aria-label="Añadir furigana a la selección">ルビ</button><button class="ed-btn" data-act="sep" title="Separador de escena" aria-label="Insertar separador de escena">※</button><button class="ed-btn" data-act="img" title="Insertar ilustración" aria-label="Insertar ilustración">▣ Imagen</button><input type="file" id="imgf" accept="image/*" hidden>
        <button class="ed-btn" data-cmd="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↶</button><button class="ed-btn" data-cmd="redo" title="Rehacer" aria-label="Rehacer">↷</button>
        <span class="end"><button class="ed-btn" data-act="find" aria-expanded="false" aria-controls="p-find">Buscar y reemplazar</button><button class="ed-btn" data-act="coms" aria-expanded="false" aria-controls="p-coms">Lectores · ${(coms || []).length + reps.length}</button><span class="div"></span>
          <button class="ed-btn" data-view="orig" title="Texto original junto al editor">Original</button><button class="ed-btn" data-view="edit">Editor</button><button class="ed-btn" data-view="split">Ambos</button><button class="ed-btn" data-view="preview">Vista previa</button></span>
      </div>
      <div class="ed-writing-settings">
        <label class="ed-writing-toggle"><input type="checkbox" id="ed-smart-typing"> Autocorrección tipográfica al escribir</label>
        <span class="ed-writing-caption">Opcional: tres puntos → … y -- al inicio de un párrafo → —. El glosario sugiere términos sin cambiar tu texto automáticamente.</span>
      </div>
      <div class="ed-gloss-inline" id="ed-gloss-inline" role="status" aria-live="polite" aria-label="Sugerencias del glosario" hidden></div>
      <div id="ask"></div>
      <div class="ed-find" id="p-find" hidden><input type="text" id="fq" placeholder="Buscar" aria-label="Buscar"><input type="text" id="rq" placeholder="Reemplazar por" aria-label="Reemplazar por"><label class="mono" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fcase" style="width:auto"> Mayúsculas exactas</label><button class="btn ghost" id="fnext">Siguiente</button><button class="btn" id="frep">Reemplazar todo</button><span class="mono" id="finfo"></span></div>
      <div class="ed-box" id="p-coms" hidden></div>
      <div id="gwarn"></div>
      <div class="ed-split" id="split" data-view="${UI.view}">
        <div class="ed-origw" id="origw"><div class="ed-pvbar"><span class="mono">ORIGINAL</span><span class="mono" id="orig-n"></span><span class="div"></span><button class="ed-btn" id="orig-edit">Editar</button><button class="ed-btn on" id="orig-sync" aria-pressed="true" title="Desplazar el original al párrafo en el que escribes">Sincronizar</button></div><div class="ed-orig" id="orig"></div></div>
        <div class="ed-docw"><div class="ed-doc" id="doc" contenteditable="true" spellcheck="true" lang="es" role="textbox" aria-multiline="true" aria-label="Texto del capítulo"></div></div>
        <div class="ed-pvw"><div class="ed-pvbar"><span class="mono">VISTA DEL LECTOR</span>${[['oscuro','Oscuro'],['sepia','Sepia'],['claro','Claro']].map(([k, l]) => `<button class="ed-btn" data-theme="${k}">${l}</button>`).join('')}<span class="div"></span><button class="ed-btn" data-device="desk">Escritorio</button><button class="ed-btn" data-device="mobile">Móvil</button></div><div class="ed-pv" id="pv"></div></div>
      </div><div class="ed-zenbar" id="zenbar" role="status"></div></div>`, '/estudio/obra');
    bindPicker(home);
    const doc = $('#doc'), pv = $('#pv'), root = $('.ed');
    const ac=$('#ed-smart-typing');
    try{ac.checked=localStorage.getItem(TYPING_PREF_KEY)==='1';}catch{ac.checked=false;}
    const writing=attachWritingTools({doc,box:$('#ed-gloss-inline'),checkbox:ac,
      glossary:gl||[],change:()=>changed(),toast});
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}
    const load = blocks => { doc.innerHTML = blocksToEditor(blocks, media); };
    load(c.body);
    const blocksEls = () => [...doc.childNodes].filter(makesBlock);
    const title = () => $('#ttl').value.trim() || 'Sin título';
    const titleCount=()=>{const n=$('#ttl').value.length;$('#ttlcount').textContent=n+' / 300';$('#ttlcount').classList.toggle('over',n>300);};
    titleCount();
    const setState = (cls, msg) => { const s = $('#state'); if (!s) return; s.className = 'ed-state ' + cls; s.textContent = msg; };
    const topOf = n => { while (n && n.parentNode !== doc) n = n.parentNode; return n; };
    const cur = () => topOf(lastRange?.startContainer) || doc.lastElementChild;
    const textNodes = () => { const w = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('rt,figure,.sep') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); const a = []; let n; while ((n = w.nextNode())) a.push(n); return a; };
    const views = () => { $('#split').dataset.view = UI.view; root.querySelectorAll('[data-view]').forEach(b => { const on = b.dataset.view === UI.view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); root.querySelectorAll('[data-theme]').forEach(b => { const on = b.dataset.theme === UI.theme; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); root.querySelectorAll('[data-device]').forEach(b => { const on = b.dataset.device === UI.device; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); pv.classList.toggle('mobile', UI.device === 'mobile'); };

    // Vista previa fiel al lector; nunca modifica bloques, numeración ni títulos guardados.
    let previewManualUntil=0,previewSyncT=0;
    const syncPreview=()=>{
      if(UI.view!=='split'||viewing||Date.now()<previewManualUntil||!document.body.contains(doc))return;
      const target=pv.querySelector('[data-ed-block="'+curIdx+'"]');
      if(!target)return;
      pv.querySelectorAll('.ed-pv-active').forEach(n=>n.classList.remove('ed-pv-active'));
      target.classList.add('ed-pv-active');
      const destination=previewBlockScrollTop(pv,target);
      if(destination!==null&&Math.abs(pv.scrollTop-destination)>24)pv.scrollTo({top:destination,behavior:'instant'});
    };
    const queuePreviewSync=()=>{
      clearTimeout(previewSyncT);
      previewSyncT=setTimeout(syncPreview,100);
    };
    pv.addEventListener('wheel',()=>{previewManualUntil=Date.now()+2500;},{passive:true});
    pv.addEventListener('touchstart',()=>{previewManualUntil=Date.now()+2500;},{passive:true});
    pv.addEventListener('pointerdown',()=>{previewManualUntil=Date.now()+2500;},{passive:true});
    function preview(){
      const blocks = viewing ? viewing.body : editorToBlocks(doc), tt = viewing ? viewing.title : title();
      const model=chapterPreviewModel({title:tt,sectionType:meta.section_type,blocks});
      const scrollPosition=pv.scrollTop;
      pv.innerHTML = `<div class="rd" data-theme="${UI.theme}" data-width="normal" data-lh="comodo" data-align="izquierda" data-font="original" style="--rs:${UI.device === 'mobile' ? 17 : 19}px"><article class="rd-ch"><header class="rd-head"><span class="mono">Volumen ${c.vol} · ${esc(model.label)}</span><h2>${esc(model.heading)}</h2></header>${warningsHTML(meta.content_warnings, 'show')}<div class="rd-body">${model.blocks.map(({block,index})=>tagPreviewBlock(renderBlock(block,index,{media}),index)).join('')||'<p class="mono">Capítulo vacío.</p>'}</div>${meta.teaser_on && meta.teaser.trim() ? teaserHTML(meta.teaser, nextWhen) : ''}</article></div>`;
      pv.scrollTop=scrollPosition;
      queuePreviewSync();
      const words = blocks.reduce((a, b) => a + (b.text || '').split(/\s+/).filter(Boolean).length, 0);
      $('#count').textContent = `${words.toLocaleString('es-MX')} palabras · ${Math.max(1, Math.round(words / 230))} min de lectura · ${blocks.filter(b => b.type === 'image').length} imágenes`;
      const on2 = $('#orig-n'); if (on2) { const P2 = origParas(); on2.textContent = P2.length ? `${P2.length} párr. · traducción ${blocksEls().length}` : ''; }
      $('#setsum').textContent = (meta.teaser_on && meta.teaser.trim() ? 'avance ✓' : 'sin avance') + ' · ' + (meta.content_warnings.length ? meta.content_warnings.length + ' marcador(es)' : 'sin marcadores');
    }

    // revisión automática
    function lint(){
      if (!document.body.contains(doc)) return L;
      const tx = doc.textContent.replace(/\u00a0/g, ' '), r = {}, cnt = (re, s = tx) => (s.match(re) || []).length;
      const paras = [...doc.children].filter(e => /^(P|BLOCKQUOTE|ASIDE)$/.test(e.tagName)).map(e => e.textContent);
      r.dbl = cnt(/ {2,}/g); r.quotes = tx.includes('«') ? Math.ceil(cnt(/["“”]/g) / 2) : 0; r.dash = paras.filter(p => /^\s*[-–]\s?\S/.test(p)).length + cnt(/[?!.,…]\s[-–](?=\p{L})/gu);
      r.dots = cnt(/\.{3}/g); r.space = cnt(/ +[,.;:?!»)]/g);
      r.open = paras.filter(p => cnt(/\?/g, p) > cnt(/¿/g, p) || cnt(/!/g, p) > cnt(/¡/g, p)).length;
      r.alt = [...doc.querySelectorAll('figure')].filter(f => !f.dataset.alt?.trim() && f.dataset.decorative !== '1').length;
      const gloss = [];
      for (const g of terms) { const m = tx.match(new RegExp('(?<![\\p{L}\\p{N}])' + reEsc(g.term) + '(?![\\p{L}\\p{N}])', 'giu')) || []; const bad = m.filter(x => x !== g.term); if (bad.length) gloss.push({ term: g.term, cat: g.category, n: bad.length, as: bad[0] }); }
      r.gloss = gloss.reduce((a, g) => a + g.n, 0);
      L = { counts: r, total: Object.values(r).reduce((a, b) => a + b, 0), gloss };
      const b = $('#b-rev'); b.textContent = L.total ? '✓ Revisar · ' + L.total : '✓ Sin avisos'; b.style.borderColor = L.total ? '#d9922b' : '#a9d18e';
      $('#gwarn').innerHTML = gloss.length ? `<div class="ed-gloss"><span class="mono" style="color:#d9922b">GLOSARIO</span><span>«${esc(gloss[0].as)}» aparece ${gloss[0].n === 1 ? '1 vez' : gloss[0].n + ' veces'} así; en el glosario es <b>${esc(gloss[0].term)}</b> (${esc(gloss[0].cat)})${gloss.length > 1 ? ` · y ${gloss.length - 1} término(s) más` : ''}.</span><button class="btn ghost" data-fix="gloss">Corregir todo</button><a class="btn ghost" href="/estudio/glosario">Ver glosario</a></div>` : '';
      if (!$('#p-rev').hidden) drawRev();
      return L;
    }
    function drawRev(){
      $('#p-rev').innerHTML = `<div class="ed-bh" style="cursor:default"><b>Revisión automática</b><span style="display:flex;gap:8px;align-items:center"><span class="mono" style="color:${L.total ? '#d9922b' : '#a9d18e'}">${L.total ? L.total + ' avisos' : 'Todo en orden'}</span>${L.total ? '<button class="btn ghost" data-fix="all">Corregir todo</button>' : ''}</span></div>
        ${LINT.map(([k, l, h]) => { const n = L.counts[k] || 0, auto = !['open', 'alt'].includes(k); return `<div class="ed-lint ${n ? '' : 'ok'}"><span class="i" aria-hidden="true">${n ? '●' : '✓'}</span><span><b>${l}</b><small>${h}</small></span>${n && auto ? `<button class="btn ghost" data-fix="${k}">Corregir ${n}</button>` : `<span class="mono">${n || ''}</span>`}</div>`; }).join('')}
        <p class="ed-note">Se ejecuta sola al guardar, programar y publicar. Puedes publicar con avisos; el equipo verá cuántos quedaron.</p>`;
    }
    function fix(k){
      if (k === 'all') { LINT.forEach(([x]) => fix(x)); return; }
      const nodes = textNodes(), rep = (re, to) => nodes.forEach(n => { const v = n.data.replace(re, to); if (v !== n.data) n.data = v; });
      if (k === 'dbl') rep(/[ \u00a0]{2,}/g, ' ');
      if (k === 'quotes') rep(/["“]([^"“”]*)["”]/g, '«$1»');
      if (k === 'dots') rep(/\.{3}/g, '…');
      if (k === 'space') rep(/[ \u00a0]+([,.;:?!»)])/g, '$1');
      if (k === 'dash') [...doc.children].forEach(el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode()) && !n.data.trim()); if (n) n.data = n.data.replace(/^(\s*)[-–]\s?/, '$1—'); }); rep(/([?!.,…]\s)[-–](?=\p{L})/gu, '$1—');
      if (k === 'gloss') for (const g of terms) rep(new RegExp('(?<![\\p{L}\\p{N}])' + reEsc(g.term) + '(?![\\p{L}\\p{N}])', 'giu'), g.term);
      changed();
    }

    // guardado: autoguardado a los 5 s sin crear versión (salvo cada 10 min); el manual crea versión
    async function doSave(manual, kind, note){
      if (conflict) return false;
      if($('#ttl').value.trim().length>300){setState('warn','Título superior a 300 caracteres');toast('Acorta el título a un máximo de 300 caracteres antes de guardar.');return false;}
      while (saving) await saving;
      const mine = edits, blocks = editorToBlocks(doc); lint();
      setState('busy', 'Guardando…');
      saving = (async () => sb.rpc('save_chapter', { p_id: id, p_expected: version, p_title: title(), p_body: blocks, p_note: note || null, p_snapshot: !!manual, p_meta: { ...meta, lint: L.counts, lint_count: L.total }, p_kind: kind || null }))();
      const { data, error } = await saving; saving = null;
      if (error) {
        if (/version_conflict/.test(error.message)) { conflict = true; clearTimeout(autoT); setState('warn', 'Conflicto de versión'); $('#ctx').innerHTML = '<div class="ed-ctx"><span>Otro integrante guardó una versión más nueva. Tus cambios siguen aquí y en tu copia local; recarga para recuperarlos sobre la versión actual.</span><button class="btn" id="reload">Recargar</button></div>'; $('#reload').onclick = () => editor(id); }
        else if (/approval_required_current_version/.test(error.message)) { clearTimeout(autoT); setState('warn','Versión programada protegida · cancela programación para editar'); toast('Cancela la programación antes de modificar un capítulo aprobado.'); }
        else { setState('warn', 'No se pudo guardar · se reintentará'); clearTimeout(autoT); autoT = setTimeout(() => doSave(false), 15000); }
        return false;
      }
      version = data; if ($('#ver')) $('#ver').textContent = version;
      try { chan?.send({ type: 'broadcast', event: 'saved', payload: { version, name: myName, by: meU?.id } }); } catch {}
      if (edits === mine) { dirty = false; clearTimeout(draftTimer); draftTimer=0; localStorage.removeItem(KEY); setState('', manual ? '✓ Guardado · versión creada' : '✓ Guardado automáticamente'); } else setState('busy', 'Cambios sin guardar');
      if ($('#p-hist') && !$('#p-hist').hidden) drawHist();
      return true;
    }
    let draftTimer=0,draftLast=0;
    function flushDraft(){
      if(!dirty)return;
      draftLast=Date.now();
      try{localStorage.setItem(KEY,JSON.stringify({
        html:doc.innerHTML,title:$('#ttl').value,meta,version,at:draftLast
      }));}catch{/* Cuota de almacenamiento: el guardado versionado remoto sigue activo. */}
    }
    function queueDraft(){
      if(draftTimer)return;
      const delay=Math.max(0,1000-(Date.now()-draftLast));
      draftTimer=setTimeout(()=>{draftTimer=0;flushDraft();},delay);
    }
    function changed(){
      edits++; dirty = true; if (!doc.firstElementChild && !doc.textContent.trim()) doc.innerHTML = '<p><br></p>';
      if (!conflict) setState('busy', 'Cambios sin guardar');
      queueDraft();
      clearTimeout(pvT); pvT = setTimeout(() => { lint(); preview(); drawZen(); }, 250);
      clearTimeout(autoT); autoT = setTimeout(() => doSave(false), 5000);
    }

    // publicar / programar (se permite con avisos)
    function drawPub(){
      const at = c.publish_at ? fmtTz(c.publish_at, { dateStyle: 'medium', timeStyle: 'short' }) : '';
      $('#stpill').textContent = (ST2[c.status] || c.status) + (c.status === 'scheduled' && at ? ' · ' + at : '');
      $('#pub').innerHTML = c.status === 'published' ? '' : c.status === 'scheduled' ? (can('publish') ? '<button class="btn ghost" id="unsch">Cancelar programación</button>' : '')
        : (can('schedule') ? '<input type="datetime-local" id="pubat" aria-label="Fecha de publicación">' + tzHint() + '<button class="btn ghost" id="sch">Programar</button>' : '') + (can('publish') ? '<button class="btn" id="pubnow">Publicar ahora</button>' : '');
      if (c.status !== 'published') $('#pub').insertAdjacentHTML('beforeend', '<p class="ed-note" style="margin:8px 0 0">Esta fecha programa solo la publicación de ESTE capítulo. Los demás conservan su calendario. Si el volumen o la obra está restringido a mecenas, este capítulo también seguirá bloqueado para el público hasta la liberación opcional que defina el equipo.</p>');
      const act = (btn, status, when) => busy(btn, async () => {
        lint(); if (L.total && !await confirmObi(`La revisión automática dejó ${L.total} aviso(s). ¿${status === 'published' ? 'Publicar' : 'Programar'} de todos modos?`)) return;
        const selection=await askEditorialAnnouncement({esc,kind:'chapter',title:title()});
        if(!selection)return;
        const required=await teamApprovalRequired(sb,c.series.team_id);
        if(required){
          if(dirty){
            if(!(await doSave(true)))throw new Error('No se pudo guardar el borrador previo a la revisión');
            throw new Error('Se guardó una versión nueva. Solicita su aprobación antes de programar o publicar.');
          }
          // NO crear una versión al publicar: invalidaría la firma aprobada.
          // La transición la valida private.require_approval en la misma transacción.
        }else if (!(await doSave(true, 'publish', status === 'published' ? 'Publicado' : 'Programado para ' + fmtTz(when)))) throw new Error('No se pudo guardar antes de publicar');
        const { error } = await sb.from('chapters').update({ status, publish_at: when }).eq('id', id);
        if (error) throw new Error(/approval_required/.test(error.message) ? 'Se necesita una aprobación vigente para esta versión antes de programar o publicar. Abre «Aprobación».' : /forbidden/.test(error.message) ? 'No tienes permiso para esta acción.' : error.message);
        Object.assign(c, { status, publish_at: when });
        try{await saveEditorialRecord(sb,c.series_id,selection,{kind:'chapter',id,startsAt:when});}
        catch(e){toast('Capítulo guardado, pero falló el anuncio editorial: '+(e.message||e));}
        drawPub(); toast(status === 'published' ? 'Capítulo publicado' + (L.total ? ' · ' + L.total + ' aviso(s)' : '') : 'Capítulo programado');
      });
      $('#pubnow')?.addEventListener('click', e => act(e.currentTarget, 'published', new Date().toISOString()));
      $('#sch')?.addEventListener('click', e => { const v = $('#pubat').value; if (!v || new Date(fromLocal(v)) <= new Date()) return toast('Elige una fecha futura'); act(e.currentTarget, 'scheduled', new Date(fromLocal(v)).toISOString()); });
      $('#unsch')?.addEventListener('click', e => busy(e.currentTarget, async () => { const { error } = await sb.from('chapters').update({ status: 'draft' }).eq('id', id); if (error) throw error; c.status = 'draft'; drawPub(); toast('Programación cancelada'); }));
    }

    // historial
    async function drawHist(){
      const box = $('#p-hist'); box.innerHTML = '<p class="ed-note">Cargando historial…</p>';
      const { data } = await sb.from('chapter_revisions').select('id,created_at,kind,version,title,lint_count,created_by,note').eq('chapter_id', id).order('created_at', { ascending: false }).limit(60);
      const nm = await names((data || []).map(r => r.created_by));
      box.innerHTML = `<div class="ed-bh" style="cursor:default"><b>Historial de versiones</b><span class="mono">${(data || []).length} versiones · autoguardado cada 10 min</span></div><div class="ed-side">${(data || []).map(r => `<div class="ed-row"><span><b>${r.version ? 'v' + r.version + ' · ' : ''}${REV_KIND[r.kind] || r.kind}</b> · ${esc(nm[r.created_by] || 'alguien')}<br><small>${fmtTz(r.created_at, { dateStyle: 'medium', timeStyle: 'short' })}${r.note ? ' · ' + esc(r.note) : ''}${r.lint_count ? ' · ' + r.lint_count + ' aviso(s)' : ''}</small></span><span class="a"><button class="btn ghost" data-hv="${r.id}">Ver</button><button class="btn ghost" data-hd="${r.id}">Comparar</button><button class="btn ghost" data-hr="${r.id}">Restaurar</button></span></div>`).join('') || '<p class="ed-note">Aún no hay versiones. Se crea una cada vez que pulsas Guardar.</p>'}</div><div id="ed-history-compare" role="status"></div>`;
    }
    const getRev = async rid => { const { data, error } = await sb.from('chapter_revisions').select('id,version,title,body,created_at').eq('id', rid).single(); if (error) throw error; return data; };
    setupEditorialCollaboration({
      sb,id,root,box:$('#p-sug'),button:$('#b-sug'),historyBox:$('#p-hist'),
      can,names,esc,toast,fmtTz,confirmObi,userId:meU?.id,
      getVersion:()=>version,getDirty:()=>dirty,getConflict:()=>conflict,
      getBody:()=>editorToBlocks(doc),getTitle:title,getSelected:()=>lastRange?.toString()||'',
      getRevision:getRev,findText:q=>findText(q)
    });
    setupEditorialApproval({sb,id,teamId:c.series.team_id,root,box:$('#p-approval'),button:$('#b-approval'),
      can,role:T.team?.role,names,esc,toast,fmtTz,confirmObi,
      getVersion:()=>version,getDirty:()=>dirty,getConflict:()=>conflict,getUserId:()=>meU?.id});
    const restore = async r => { load(r.body); $('#ttl').value = r.title || $('#ttl').value; titleCount(); viewing = null; $('#ctx').innerHTML = ''; changed(); await doSave(true, 'restore', 'Restaurada desde la versión ' + (r.version || '')); toast('Versión restaurada'); };

    // lectores: erratas y comentarios
    function drawComs(){
      $('#p-coms').innerHTML = `<div class="ed-bh" style="cursor:default"><b>Erratas abiertas · ${reps.length}</b><span class="mono">reportadas por lectores</span></div><div class="ed-side">${reps.map(r => `<div class="ed-row"><span><q>${esc(r.quote || '')}</q>${r.fix ? ' → <b>' + esc(r.fix) + '</b>' : ''}<br><small>${r.kind ? esc(r.kind) + ' · ' : ''}${agoEd(r.created_at)}</small></span><span class="a"><button class="btn ghost" data-go="${esc(r.quote || '')}">Buscar</button>${r.fix ? `<button class="btn ghost" data-apply="${r.id}">Aplicar</button>` : ''}<button class="btn ghost" data-dismiss="${r.id}">Descartar</button></span></div>`).join('') || '<p class="ed-note">Sin erratas abiertas.</p>'}</div>
        <div class="ed-bh" style="cursor:default"><b>Comentarios de lectores · ${(coms || []).length}</b><span class="mono">los más recientes</span></div><div class="ed-side">${(coms || []).map(m => `<div class="ed-row"><span>${m.spoiler ? '<small>SPOILER · </small>' : ''}${esc(m.body)}<br><small>${esc(who[m.user_id] || 'Lector')} · ${agoEd(m.created_at)}${m.para != null ? ' · párrafo ' + (m.para + 1) : ''}</small></span>${m.para != null ? `<button class="btn ghost" data-para="${m.para}">Ir</button>` : '<span></span>'}</div>`).join('') || '<p class="ed-note">Aún no hay comentarios en este capítulo.</p>'}</div>`;
    }
    const findText = q => { if (!q) return false; doc.focus(); const s = getSelection(); s.removeAllRanges(); const r = document.createRange(); r.setStart(doc, 0); r.collapse(true); s.addRange(r); return window.find ? window.find(q, false, false, false) : false; };
    const flashBlock = el => { if (!el) return; if (UI.view === 'preview') { UI.view = 'split'; views(); } window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 160, behavior: 'smooth' }); el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 1800); };

    // cuadro breve de datos (furigana, ilustración)
    function ask(fields, onOk, extra = ''){
      const box = $('#ask'), close = () => { box.innerHTML = ''; };
      box.innerHTML = `<div class="ed-ask">${fields.map((f, i) => `<label for="ask${i}">${esc(f.label)}</label><input type="text" id="ask${i}" value="${esc(f.value || '')}" placeholder="${esc(f.ph || '')}">`).join('')}<button class="btn" id="askok">Aplicar</button>${extra}<button class="btn ghost" id="askno">Cancelar</button></div>`;
      $('#ask0').focus();
      $('#askok').onclick = () => { onOk(fields.map((_, i) => $('#ask' + i).value)); close(); };
      $('#askno').onclick = close;
      box.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#askok').click(); } if (e.key === 'Escape') close(); };
    }
    const keepSel = () => { if (!lastRange) return false; const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange); return true; };
    function setBlock(tag){
      if (!lastRange) return; const a = topOf(lastRange.startContainer), b = topOf(lastRange.endContainer); if (!a) return;
      const list = []; for (let n = a; n; n = n.nextElementSibling) { list.push(n); if (n === b) break; }
      list.filter(n => n.tagName !== 'FIGURE' && !n.classList.contains('sep')).forEach(n => { const e = document.createElement(tag); if (tag === 'ASIDE') e.className = 'tn'; e.append(...n.childNodes); n.replaceWith(e); });
      changed();
    }
    function setFont(ff){
      if (!lastRange || lastRange.collapsed) return toast('Selecciona el texto al que quieres cambiar la tipografía');
      if (topOf(lastRange.startContainer) !== topOf(lastRange.endContainer)) return toast('Aplica la tipografía dentro de un solo párrafo');
      const frag = lastRange.extractContents(); frag.querySelectorAll('[data-ff]').forEach(s => s.replaceWith(...s.childNodes));
      if (ff && ff !== '-') { const sp = document.createElement('span'); sp.dataset.ff = ff; sp.append(frag); lastRange.insertNode(sp); } else lastRange.insertNode(frag);
      changed();
    }
    const after = html => { const ref = cur(), tp = document.createElement('template'); tp.innerHTML = html; const nodes = [...tp.content.childNodes]; if (ref) ref.after(...nodes); else doc.append(...nodes); const last = nodes[nodes.length - 1]; if (!last.nextElementSibling) last.after(Object.assign(document.createElement('p'), { innerHTML: '<br>' })); changed(); };

    // texto original al lado, párrafo a párrafo
    function origParas(){ return src.split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
    async function saveSrc(){ const { error } = await sb.from('chapters').update({ source_text: src }).eq('id', id); if (error) toast('No se pudo guardar el original: ' + errMsg(error)); }
    function syncOrig(){ const box = $('#orig'); if (!box || srcEdit || UI.view !== 'orig') return; box.querySelectorAll('p.on').forEach(p => p.classList.remove('on')); const p = box.querySelector(`[data-op="${curIdx}"]`); if (!p) return; p.classList.add('on'); if (UI.sync !== false) box.scrollTo({ top: p.offsetTop - box.clientHeight / 3, behavior: 'smooth' }); }
    function drawOrig(){
      const box = $('#orig'); if (!box) return; const P = origParas();
      $('#orig-n').textContent = P.length ? `${P.length} párr. · traducción ${blocksEls().length}` : '';
      const eb = $('#orig-edit'); eb.textContent = srcEdit ? 'Listo' : 'Editar'; eb.hidden = srcEdit && !P.length;
      box.innerHTML = srcEdit ? `<textarea id="orig-ta" aria-label="Texto original" placeholder="Pega aquí el texto original (japonés, inglés…). Cada línea es un párrafo y se empareja con el párrafo del mismo número en tu traducción. Se guarda solo y los lectores no lo ven.">${esc(src)}</textarea>`
        : P.map((t, i) => `<p data-op="${i}"><span class="n">${i + 1}</span>${esc(t)}</p>`).join('');
      const ta = $('#orig-ta'); if (ta) ta.oninput = () => { src = ta.value; clearTimeout(srcT); srcT = setTimeout(saveSrc, 1200); };
      syncOrig();
    }
    $('#orig-edit').onclick = () => { if (srcEdit) { clearTimeout(srcT); saveSrc(); srcEdit = !origParas().length; } else srcEdit = true; drawOrig(); if (srcEdit) $('#orig-ta')?.focus(); };
    $('#orig-sync').onclick = e => { UI.sync = UI.sync === false; e.currentTarget.classList.toggle('on', UI.sync); e.currentTarget.setAttribute('aria-pressed', UI.sync); if (UI.sync) syncOrig(); };
    $('#orig').addEventListener('click', e => { const p = e.target.closest('[data-op]'); if (!p) return; const el = blocksEls()[+p.dataset.op]; if (!el) return toast('Tu traducción todavía no tiene ese párrafo'); curIdx = +p.dataset.op; syncOrig(); flashBlock(el); const r = document.createRange(); r.selectNodeContents(el); r.collapse(true); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); doc.focus({ preventScroll: true }); });

    // quién más está editando (presencia en tiempo real) y aviso cuando otro guarda
    try {
      chan = sb.channel('obi-edit-' + id, { config: { presence: { key: meU?.id || 'anon' } } });
      const drawPres = () => { const box = $('#pres'); if (!box) return; const o = [...new Set(Object.entries(chan.presenceState()).filter(([k]) => k !== meU?.id).map(([, v]) => v[0]?.name || 'Alguien'))];
        box.innerHTML = o.length ? `<div class="ed-pres" role="status"><span class="dot" aria-hidden="true"></span><span><b>${o.map(esc).join(', ')}</b> ${o.length === 1 ? 'también está' : 'también están'} editando este capítulo. Si ambos guardan, el segundo recibirá un aviso de conflicto: pónganse de acuerdo antes de seguir.</span></div>` : ''; };
      chan.on('presence', { event: 'sync' }, drawPres)
        .on('broadcast', { event: 'saved' }, ({ payload: pl }) => { if (!pl || pl.by === meU?.id || !(pl.version > version) || !$('#ctx')) return;
          $('#ctx').innerHTML = `<div class="ed-ctx"><span><b>${esc(pl.name || 'Alguien')}</b> guardó la versión ${pl.version}.${dirty ? ' Tienes cambios sin guardar: si guardas ahora habrá conflicto. Siguen a salvo en tu copia local.' : ''}</span><button class="btn" id="reload2">Cargar la versión nueva</button></div>`;
          $('#reload2').onclick = async () => { if (!dirty || await confirmObi('Tus cambios sin guardar quedarán en tu copia local para recuperarlos. ¿Cargar la versión nueva?')) editor(id); }; })
        .subscribe(stt => { if (stt === 'SUBSCRIBED') chan.track({ name: myName, at: Date.now() }); });
    } catch {}

    // modo concentración con meta de palabras del día
    const GOALK = 'obi-ed-goal', DAYK = 'obi-ed-day', today = () => new Date().toLocaleDateString('en-CA');
    const wc = () => (doc.innerText || '').split(/\s+/).filter(Boolean).length;
    const dayData = () => { let d = null; try { d = JSON.parse(localStorage.getItem(DAYK) || 'null'); } catch {} if (!d || d.date !== today()) d = { date: today(), base: {}, done: {} }; if (d.base[id] == null) { d.base[id] = wc(); try { localStorage.setItem(DAYK, JSON.stringify(d)); } catch {} } return d; };
    const todayWords = () => { const d = dayData(); d.done[id] = Math.max(0, wc() - d.base[id]); try { localStorage.setItem(DAYK, JSON.stringify(d)); } catch {} return Object.values(d.done).reduce((a, b) => a + b, 0); };
    function drawZen(){
      const z = $('#zenbar'); if (!z || !root.classList.contains('zen')) return;
      const g = Math.max(50, +localStorage.getItem(GOALK) || 1000), nW = todayWords(), pct = Math.min(100, Math.round(nW / g * 100));
      z.innerHTML = `<span class="mono">HOY</span><b>${nW.toLocaleString('es-MX')}</b><span class="mono">de <input id="zgoal" type="number" min="50" step="50" value="${g}" aria-label="Meta de palabras del día"> palabras</span><span class="zp" aria-hidden="true"><i style="width:${pct}%"></i></span><span class="mono">${pct >= 100 ? '¡Meta cumplida!' : pct + ' %'}</span><span class="mono">${esc($('#state')?.textContent || '')}</span><button class="btn ghost sm" id="zexit">Salir · Esc</button>`;
      $('#zgoal').onchange = e => { localStorage.setItem(GOALK, Math.max(50, +e.target.value || 1000)); drawZen(); };
      $('#zexit').onclick = () => zen(false);
    }
    function zen(onZ){
      root.classList.toggle('zen', onZ); $('#b-zen').setAttribute('aria-pressed', onZ); document.body.style.overflow = onZ ? 'hidden' : '';
      if (onZ) { if (UI.view === 'preview') { UI.view = 'edit'; views(); } if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {}); drawZen(); doc.focus(); }
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    const fsc = () => { if (document.body.contains(root) && !document.fullscreenElement && root.classList.contains('zen')) zen(false); };
    document.addEventListener('fullscreenchange', fsc);
    $('#b-zen').onclick = () => zen(!root.classList.contains('zen'));
    dayData();

    // eventos
    doc.addEventListener('input', changed);
    function onSel(){ if (!document.body.contains(doc)) return document.removeEventListener('selectionchange', onSel); const s = getSelection(); if (s.rangeCount && doc.contains(s.anchorNode)) { lastRange = s.getRangeAt(0).cloneRange(); const tb = topOf(s.anchorNode), tg = tb?.tagName, bi = blocksEls().indexOf(tb); if (bi >= 0 && bi !== curIdx) { curIdx = bi; syncOrig(); queuePreviewSync(); } $('#blk').value = /^H[1-6]$/.test(tg) ? 'H3' : ['BLOCKQUOTE', 'ASIDE'].includes(tg) ? tg : 'P'; } }
    document.addEventListener('selectionchange', onSel);
    doc.addEventListener('paste', e => {
      e.preventDefault(); const html = e.clipboardData.getData('text/html'), plain = e.clipboardData.getData('text/plain'), out = pasteToEditor(html, plain);
      const n = out ? (out.match(/<(p|h3|blockquote|div)[\s>]/g) || []).length : 0;
      if (n > 1) document.execCommand('insertHTML', false, out);
      else if (n === 1) { const tp = document.createElement('template'); tp.innerHTML = out; document.execCommand('insertHTML', false, tp.content.firstElementChild.innerHTML); }
      else document.execCommand('insertText', false, plain);
    });
    doc.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); toast('Usa «▣ Imagen» para insertar ilustraciones'); } });
    doc.addEventListener('keydown', e => { const f = e.target.closest?.('figure[data-url]'); if (!f || !['Enter',' '].includes(e.key)) return; e.preventDefault(); f.click(); });
    doc.addEventListener('click', e => {
      const f = e.target.closest('figure'); if (!f) return; doc.querySelectorAll('.on').forEach(x => x.classList.remove('on')); f.classList.add('on');
      ask([{ label: 'Descripción', value: f.dataset.alt, ph: 'Qué se ve en la ilustración' }, { label: 'Pie', value: f.dataset.caption, ph: 'Opcional' }], ([alt, cap]) => { const decorative = !!$('#askdeco')?.checked; const t = document.createElement('template'); t.innerHTML = figureHTML(f.dataset.url, decorative ? '' : alt.trim(), cap.trim(), media, decorative); f.replaceWith(t.content.firstElementChild); changed(); }, `<label class="mono"><input type="checkbox" id="askdeco" ${f.dataset.decorative === '1' ? 'checked' : ''}> Ilustración decorativa (sin descripción por decisión editorial)</label><button class="btn ghost danger" id="figdel">Quitar ilustración</button>`);
      $('#figdel').onclick = () => { f.remove(); $('#ask').innerHTML = ''; changed(); };
    });
    $('#ttl').addEventListener('input',()=>{titleCount();changed();});
    $('#stype').onchange = e => { meta.section_type = e.target.value; changed(); };
    $('#teaser').oninput = e => { meta.teaser = e.target.value; changed(); };
    $('#teaser_on').onchange = e => { meta.teaser_on = e.target.checked; changed(); };
    $('#cw').onclick = e => { const b = e.target.closest('[data-cw]'); if (!b) return; const w = b.dataset.cw, on = !meta.content_warnings.includes(w); meta.content_warnings = on ? [...meta.content_warnings, w] : meta.content_warnings.filter(x => x !== w); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); changed(); };
    $('#blk').onchange = e => { keepSel(); setBlock(e.target.value); doc.focus(); };
    $('#ff').onchange = e => { setFont(e.target.value); e.target.value = ''; doc.focus(); };
    const toggleP = (pid, btn, draw) => { const p2 = $(pid), open = p2.hidden; p2.hidden = !open; btn?.setAttribute('aria-expanded', open); btn?.classList.toggle('on', open); if (open) draw?.(); return open; };
    $('#b-rev').onclick = e => toggleP('#p-rev', e.currentTarget, () => { lint(); drawRev(); });
    $('#b-hist').onclick = e => toggleP('#p-hist', e.currentTarget, drawHist);
    $('#save').onclick = e => busy(e.currentTarget, async () => { if (await doSave(true)) toast('Versión guardada en el historial'); });
    $('#imgf').onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > LIMITS.image) return toast('La imagen pesa más de 8 MB');
      setState('busy', 'Subiendo imagen…'); const path = `${T.team.id}/obras/${c.series.slug}/vol-${c.vol}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('obi-media').upload(path, f, { contentType: f.type }); if (error) { setState('warn', 'No se pudo subir'); return toast(error.message); }
      after(figureHTML(PUB + path, '', '', media)); toast('Ilustración insertada · tócala para añadir descripción');
    };
    root.addEventListener('mousedown', e => { if (e.target.closest('.ed-bar [data-cmd], .ed-bar [data-act="ruby"], .ed-bar [data-act="sep"]')) e.preventDefault(); });
    root.addEventListener('click', async e => {
      const el = e.target.closest('[data-cmd],[data-act],[data-view],[data-theme],[data-device],[data-fix],[data-hv],[data-hr],[data-go],[data-apply],[data-dismiss],[data-para]'); if (!el || el.closest('#doc')) return;
      const d = el.dataset;
      if (d.cmd) { keepSel(); document.execCommand(d.cmd); changed(); }
      else if (d.act === 'ruby') { if (!lastRange || lastRange.collapsed) return toast('Selecciona el texto base'); const base = lastRange.toString(), r = lastRange.cloneRange(); ask([{ label: `Lectura de «${base}»`, ph: 'p. ej. かみ' }], ([rd]) => { if (!rd.trim()) return; const rb = document.createElement('ruby'), rt = document.createElement('rt'); rt.textContent = rd.trim(); rb.append(base, rt); r.deleteContents(); r.insertNode(rb); const s = getSelection(); s.removeAllRanges(); const after2 = document.createRange(); after2.setStartAfter(rb); s.addRange(after2); changed(); }); }
      else if (d.act === 'sep') after('<div class="sep" contenteditable="false">※</div>');
      else if (d.act === 'img') $('#imgf').click();
      else if (d.act === 'find') { if (toggleP('#p-find', el)) $('#fq').focus(); }
      else if (d.act === 'coms') toggleP('#p-coms', el, drawComs);
      else if (d.view) { UI.view = d.view; localStorage.setItem('obi-ed-view', d.view); views(); if (d.view === 'orig') drawOrig(); }
      else if (d.theme) { UI.theme = d.theme; views(); preview(); }
      else if (d.device) { UI.device = d.device; views(); preview(); }
      else if (d.fix) { if (['all','gloss'].includes(d.fix) && !await confirmObi('La corrección puede modificar comillas, nombres del glosario o signos. Revisa el texto y guarda una versión antes de aplicar cambios masivos. ¿Continuar?')) return; fix(d.fix); toast('Revisión aplicada · comprueba el resultado antes de guardar'); }
      else if (d.hv) busy(el, async () => { viewing = await getRev(d.hv); if (UI.view === 'edit') { UI.view = 'split'; views(); } preview(); $('#ctx').innerHTML = `<div class="ed-ctx"><span>La vista previa muestra la versión ${viewing.version || ''} del ${fmtTz(viewing.created_at, { dateStyle: 'medium', timeStyle: 'short' })}. El editor sigue con el texto actual.</span><button class="btn" id="vrest">Restaurar esta versión</button><button class="btn ghost" id="vback">Volver al texto actual</button></div>`; $('#vrest').onclick = () => busy($('#vrest'), () => restore(viewing)); $('#vback').onclick = () => { viewing = null; $('#ctx').innerHTML = ''; preview(); }; });
      else if (d.hr) busy(el, async () => { if (!await confirmObi('¿Reemplazar el texto actual por esta versión? El texto actual queda guardado en el historial.')) return; if (dirty) await doSave(true); await restore(await getRev(d.hr)); });
      else if (d.go != null) { if (!findText(d.go)) toast('No encontré ese fragmento; quizá ya se corrigió'); }
      else if (d.apply) busy(el, async () => { const r = reps.find(x => String(x.id) === d.apply); const n = textNodes().find(x => x.data.includes(r.quote)); if (!n) return toast('No encontré el fragmento en el texto'); n.data = n.data.replace(r.quote, r.fix); changed(); const { error } = await sb.from('reports').update({ status: 'fixed' }).eq('id', r.id); if (error) throw error; reps.splice(reps.indexOf(r), 1); drawComs(); toast('Corrección aplicada · errata cerrada'); });
      else if (d.dismiss) busy(el, async () => { const { error } = await sb.from('reports').update({ status: 'dismissed' }).eq('id', d.dismiss); if (error) throw error; reps.splice(reps.findIndex(x => String(x.id) === d.dismiss), 1); drawComs(); });
      else if (d.para != null) flashBlock([...doc.childNodes].filter(makesBlock)[+d.para]);
    });
    const countFind = () => { const q = $('#fq').value; if (!q) { $('#finfo').textContent = ''; return; } const n = (doc.textContent.match(new RegExp(reEsc(q), $('#fcase').checked ? 'g' : 'gi')) || []).length; $('#finfo').textContent = n === 1 ? '1 coincidencia' : n + ' coincidencias'; };
    $('#fq').oninput = countFind; $('#fcase').onchange = countFind;
    $('#fnext').onclick = () => { const q = $('#fq').value; if (q && !(window.find && window.find(q, $('#fcase').checked, false, true))) toast('Sin más coincidencias'); };
    $('#frep').onclick = () => { const q = $('#fq').value; if (!q) return; const re = new RegExp(reEsc(q), $('#fcase').checked ? 'g' : 'gi'), to = $('#rq').value; let n = 0; textNodes().forEach(x => { const v = x.data.replace(re, () => (n++, to)); if (v !== x.data) x.data = v; }); if (n) changed(); $('#finfo').textContent = n + ' reemplazo(s)'; };
    $('#restore')?.addEventListener('click', () => { const tmp = document.createElement('div'); tmp.innerHTML = local.html || ''; load(local.blocks || editorToBlocks(tmp)); $('#ttl').value = local.title || $('#ttl').value; if (local.meta) { Object.assign(meta, local.meta); $('#stype').value = meta.section_type; $('#teaser').value = meta.teaser; $('#teaser_on').checked = meta.teaser_on; root.querySelectorAll('[data-cw]').forEach(b => b.classList.toggle('on', meta.content_warnings.includes(b.dataset.cw))); } $('#localcard').remove(); changed(); });
    $('#discard')?.addEventListener('click', () => { localStorage.removeItem(KEY); $('#localcard').remove(); });
    const alive = () => document.body.contains(root);
    const key = e => { if (!alive()) return cleanup(); const k = (e.key || '').toLowerCase(), m = e.ctrlKey || e.metaKey;
      if (m && !e.shiftKey && !e.altKey && k === 's') { e.preventDefault(); $('#save').click(); }
      else if (m && e.shiftKey && k === 'f') { e.preventDefault(); zen(!root.classList.contains('zen')); }
      else if (k === 'escape' && root.classList.contains('zen') && !document.fullscreenElement) zen(false);
      else if (k === 'escape' && !$('#p-find').hidden) { $('#p-find').hidden = true; const btn = root.querySelector('[data-act="find"]'); btn?.setAttribute('aria-expanded','false'); btn?.classList.remove('on'); btn?.focus(); }
      else if (m && e.altKey && (k === 'arrowleft' || k === 'arrowright')) { const t = k === 'arrowleft' ? prevC : nextC; if (t) { e.preventDefault(); zen(false); if (dirty) doSave(false); go('/estudio/editar/' + t.id); } } };
    const leave = e => { if (dirty) { flushDraft(); e.preventDefault(); e.returnValue = ''; } };
    const nav = e => { if (!alive()) return cleanup(); if (e.target.closest('a[href]')) { if (root.classList.contains('zen')) zen(false); if (dirty) doSave(false); } };
    const vis = () => { if (!alive()) return cleanup(); if (document.hidden && dirty) {flushDraft(); doSave(false);} };
    const cleanup = () => {clearTimeout(previewSyncT);if(dirty)flushDraft();clearTimeout(draftTimer);writing.dispose();removeEventListener('pagehide',flushDraft);removeEventListener('keydown', key); removeEventListener('beforeunload', leave); document.removeEventListener('click', nav, true); document.removeEventListener('visibilitychange', vis); document.removeEventListener('fullscreenchange', fsc); clearTimeout(autoT); if (srcT) { clearTimeout(srcT); saveSrc(); srcT = 0; } try { if (chan) sb.removeChannel(chan); } catch {} chan = null; document.body.style.overflow = ''; };
    addEventListener('keydown', key); addEventListener('pagehide',flushDraft); addEventListener('beforeunload', leave); document.addEventListener('click', nav, true); document.addEventListener('visibilitychange', vis);
    views(); drawPub(); lint(); preview(); drawOrig();
  }


  return editor;
}

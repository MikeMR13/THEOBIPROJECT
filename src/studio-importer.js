import { confirmObi, inputObi } from './obi-dialog.js';
import { parseVolumeNumber, nextVolumeNumber, importedVolumeNumber } from './volume-number.js';
// Importador de Studio: EPUB, DOCX y PDF, bajo demanda.
import { renderBlock } from './blocks.js?v=2';
import { inferSectionType } from './section-types.js?v=1';
import { formatChapterIndex, scanImportedChapterTitles } from './chapter-title-display.js?v=2';
import { repeatedOpeningHeading, smartTitleBlocks } from './reader-headings.js?v=2';
import { editorialForm, bindEditorialForm, saveEditorialRecord } from './editorial-announcements.js?v=1';
import { createWorkData, renderWorkFields, bindWorkFields, workPayload } from './studio-work-fields.js?v=5';
import { loadRelatedWorks } from './studio-related-works.js?v=5';
import { loadStudioImportCatalogue } from './studio-importer-catalog.js?v=1';
import { planVolumeReplacement, validateImportMedia } from './import-safety.js?v=1';
import { makeImportUploadPath, uploadImportAsset } from './import-upload-paths.js?v=1';
import { createTeamFontStore } from './import-font-reuse.js?v=1';
import { EDITORIAL_RULES, inspectImport, lintImportedBlocks } from './editorial-import-quality.js?v=1';
export function createImporter(deps) {
  const { sb, app, $, esc, toast, go, getUser, getMe, url, PUB, media, pathOf, T, can, ensure, fmtTz, fromLocal, toLocal, tzHint, busy, shell, bindPicker, LIMITS, SEC } = deps;
  // ---------- importador ----------
  const sha256 = async buf => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
  // EPUB/DOCX → bloques: conserva el orden exacto de texto e ilustraciones, separadores, alineación, cursivas/negritas por CSS y fuentes incrustadas (data-epub-family).
  const BLOCK_TAGS = /^(p|div|h[1-6]|blockquote|ul|ol|li|section|article|aside|header|footer|figure|figcaption|table|thead|tbody|tfoot|tr|td|th|hr|pre|dl|dt|dd|main|nav|center|body)$/;
  const SEP_TEXT = /^[\s*＊※◇◆◊⋄○●◎☆★♦♢◈❖✦✧✶✱·•・~〜～=＝#＃§\-–—_\u3000]+$/u;
  const SEP_CLASS = /(^|[\s_-])(sep|separator|scene[\w-]*|ornament|asterism|divider|dinkus|space-?break|section-?break|break)(\s|$|[_-])/i;
  const TITLE_CLASS = /(^|\s)([\w-]*title[\w-]*|[\w-]*heading[\w-]*|titulo[\w-]*|h[1-6])(\s|$)/i;
  const htmlToBlocks = (root, imgMap, css) => {
    const out = [], tagOf = e => (e.localName || '').toLowerCase();
    const isBlock = e => e.nodeType === 1 && BLOCK_TAGS.test(tagOf(e));
    const hasBlock = e => [...e.children].some(c => isBlock(c) || (tagOf(c) !== 'svg' && hasBlock(c)));
    const imgsIn = e => /^(img|image)$/.test(tagOf(e)) ? [e] : tagOf(e) === 'svg' ? [...e.querySelectorAll('image')].slice(0, 1) : [...e.querySelectorAll('img,image')];
    const wrapKids = (e, wraps) => { const d = e.ownerDocument; let outer = null, inner = null; for (const [t, f] of wraps) { const n = d.createElement(t); if (f != null) n.setAttribute('data-epub-family', f); inner ? inner.appendChild(n) : (outer = n); inner = n; } while (e.firstChild) inner.appendChild(e.firstChild); e.appendChild(outer); };
    const deco = (e, ctx) => { for (const c of [...e.children]) { const tg = tagOf(c); if (tg === 'svg') continue;
      const blk = isBlock(c), base = blk ? { f: css.fam(c), b: /^h[1-6]$/.test(tg), i: false } : ctx; let next = base;
      if (!blk || !hasBlock(c)) { const f = css.fam(c), bo = css.bold(c), it = css.italic(c), w = [];
        if (!blk && f != null && f !== base.f) w.push(['span', f]);
        if (bo && !base.b && !/^(b|strong|h[1-6])$/.test(tg)) w.push(['b']);
        if (it && !base.i && !/^(i|em)$/.test(tg)) w.push(['i']);
        if (w.length && c.firstChild && !/^(img|image|br|hr)$/.test(tg)) wrapKids(c, w);
        next = { f: f ?? base.f, b: base.b || bo, i: base.i || it }; }
      deco(c, next); } };
    const sep = mark => { if (out[out.length - 1]?.type !== 'separator') out.push(mark && mark !== '※' ? { type: 'separator', text: mark } : { type: 'separator' }); };
    const addImg = img => { if (!img) return; const src = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href') || img.getAttribute('href'); const key = imgMap?.resolve(src); if (!key) return;
      if (SEP_CLASS.test(img.getAttribute('class') || '') || SEP_CLASS.test(img.parentNode?.getAttribute?.('class') || '')) return sep();
      out.push({ type: 'image', url: key, alt: img.getAttribute('alt') || '', caption: '' }); };
    const emit = (type, el, nodes, chain = []) => {
      let html, text; if (nodes) { const box = el.ownerDocument.createElement('div'); let at = box; for (const w of chain) at = at.appendChild(w.cloneNode(false)); nodes.forEach(n => at.appendChild(n.cloneNode(true))); html = box.innerHTML; text = box.textContent; } else { html = el.innerHTML; text = el.textContent; }
      text = text.replace(/\s+/g, ' ').trim(); if (!text) return;
      if (text.length <= 24 && SEP_TEXT.test(text)) return sep(text);
      if (type === 'paragraph' && text.length <= 120 && TITLE_CLASS.test(el.getAttribute?.('class') || '')) type = 'heading';
      html = html.replace(/\s+xmlns(:\w+)?="[^"]*"/g, '').replace(/\s*class="[^"]*"/g, '').trim(); const f = css?.fam(el); if (f != null) html = `<span data-epub-family="${f}">${html}</span>`;
      const o = { type, html, text }, al = css?.align(el); if (al) o.align = al; out.push(o); };
    const mixed = (type, el, chain, top = el) => { if (!imgsIn(el).length) return chain ? emit(type, top, [...el.childNodes], chain) : emit(type, el); let buf = [];
      const flush = () => { if (buf.length) emit(type, top, buf, chain || []); buf = []; };
      for (const c of [...el.childNodes]) { if (c.nodeType === 1 && (/^(img|image|svg)$/.test(tagOf(c)) || imgsIn(c).length)) { flush(); /^(img|image|svg)$/.test(tagOf(c)) || !c.textContent.trim() ? imgsIn(c).forEach(addImg) : mixed(type, c, [...(chain || []), c], top); } else buf.push(c); }
      flush(); };
    const block = (c, qt) => {
      const tg = tagOf(c), cls = c.getAttribute('class') || '', tx = c.textContent.replace(/\s+/g, ' ').trim();
      if (tg === 'hr') return sep();
      if (SEP_CLASS.test(cls) && !/page/i.test(cls) && tx.length <= 24 && !imgsIn(c).length) return sep();
      if (/^h[1-6]$/.test(tg)) return hasBlock(c) ? walk(c, 'heading') : mixed('heading', c);
      if (tg === 'blockquote') return hasBlock(c) ? walk(c, 'quote') : mixed('quote', c);
      if (tg === 'figcaption') { const last = out[out.length - 1]; if (last?.type === 'image' && tx && !last.caption) { last.caption = tx.slice(0, 300); return; } return mixed('paragraph', c); }
      if (hasBlock(c)) return walk(c, qt);
      if (!tx && !imgsIn(c).length) return;
      mixed(qt || 'paragraph', c); };
    const walk = (node, qt) => { let buf = [];
      const flush = () => { if (buf.some(n => n.textContent.trim())) emit(qt || 'paragraph', node, buf); buf = []; };
      for (const c of [...node.childNodes]) {
        if (c.nodeType === 3) { buf.push(c); continue; } if (c.nodeType !== 1) continue;
        const tg = tagOf(c); if (/^(script|style|head|title|meta|link)$/.test(tg)) continue;
        if (/^(img|image|svg)$/.test(tg)) { flush(); imgsIn(c).forEach(addImg); continue; }
        if (!isBlock(c) && !hasBlock(c)) { if (tg === 'br') { flush(); continue; } if (imgsIn(c).length) { flush(); mixed(qt || 'paragraph', c); continue; } buf.push(c); continue; }
        flush(); block(c, qt); }
      flush(); };
    if (css) deco(root, { f: null, b: false, i: false });
    walk(root);
    while (out.length && out[out.length - 1].type === 'separator') out.pop();
    return out;
  };
  // estilos efectivos de una página del EPUB (hojas enlazadas + <style> + style=""), por especificidad
  function epubStyler(doc, sheets, famIdx){
    let css = sheets.join('\n'); for (const s of doc.getElementsByTagName('style')) css += '\n' + s.textContent;
    css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*{[^}]*}/gi, '').replace(/@(import|charset|namespace)[^;]*;/gi, '');
    const parse = d => { const o = {}; for (const m of d.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) { const k = m[1].toLowerCase(), v = m[2].replace(/!important/i, '').trim(); if (/^(font-family|font-weight|font-style|text-align|font)$/.test(k)) o[k] = v; } return o; };
    const spec = q => (q.match(/#[\w-]+/g) || []).length * 100 + (q.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) || []).length * 10 + (q.replace(/[#.][\w-]+|\[[^\]]+\]|:[\w-]+(\([^)]*\))?/g, ' ').match(/[a-z][\w-]*/gi) || []).length;
    const rules = []; let n = 0;
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) { const sel = m[1].trim(); if (!sel || sel.startsWith('@')) continue; const d = parse(m[2]); if (!Object.keys(d).length) continue;
      for (const s of sel.split(',')) { const q = s.replace(/::?(before|after|first-letter|first-line|selection|marker|hover|focus|active|visited|link)\b/gi, '').trim(); if (q) rules.push([spec(q), n++, q, d]); } }
    rules.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const P = new Map(); for (const [, , q, d] of rules) { let els; try { els = doc.querySelectorAll(q); } catch { continue; } els.forEach(e => P.set(e, Object.assign(P.get(e) || {}, d))); }
    const own = e => { const st = e.getAttribute?.('style'); const o = P.get(e); return st ? { ...(o || {}), ...parse(st) } : o; };
    const famFromFont = v => (v.match(/[\d.]+(px|pt|em|rem|%|ex|ch)?(\s*\/\s*[\w.%]+)?\s+(.+)$/) || [])[3] || null;
    const tagOf2 = x => (x.localName || '').toLowerCase();
    const memo = new Map(), up = e => e.parentNode && e.parentNode.nodeType === 1 ? e.parentNode : null;
    const fam = e => { if (!e) return null; if (memo.has(e)) return memo.get(e); const o = own(e); const v = o?.['font-family'] || (o?.font && famFromFont(o.font)); let r;
      if (v) { r = null; for (const name of v.split(',').map(x => x.trim().replace(/^["']|["']$/g, '').toLowerCase())) if (famIdx.has(name)) { r = famIdx.get(name); break; } }
      else r = fam(up(e)); memo.set(e, r); return r; };
    const flag = (e, prop, yes, no, tags) => { for (let x = e; x; x = up(x)) { const o = own(x), v = o?.[prop] || ''; if (yes.test(v)) return true; if (no.test(v)) return false; if (o?.font && yes.test(o.font)) return true; if (tags.test(tagOf2(x))) return true; } return false; };
    return { fam,
      italic: e => flag(e, 'font-style', /italic|oblique/i, /normal/i, /^(i|em|cite|var)$/),
      bold: e => flag(e, 'font-weight', /bold|bolder|[6-9]00/i, /normal|lighter|[1-5]00/i, /^(b|strong|th)$/),
      align: e => { for (let x = e; x; x = up(x)) { const v = (own(x)?.['text-align'] || '').toLowerCase(); if (/center/.test(v)) return 'center'; if (/right|end/.test(v)) return 'right'; if (/left|start|justify/.test(v)) return null; if (tagOf2(x) === 'center') return 'center'; } return null; } };
  }
  const headFont = bs => { const f = (bs || []).find(b => (b.type || b.t) === 'heading')?.html?.match(/data-epub-family="(\d+)"/)?.[1]; return f ? `style="font-family:var(--f${f})"` : ''; };
  async function deobfuscate(zip, opf, bytes, path, get = p => zip.file(p)){
    const enc = get('META-INF/encryption.xml'); if (!enc) return bytes;
    const x = new DOMParser().parseFromString(await enc.async('string'), 'application/xml');
    const node = [...x.getElementsByTagNameNS('*', 'EncryptedData')].find(d => { const u = decodeURIComponent(d.getElementsByTagNameNS('*', 'CipherReference')[0]?.getAttribute('URI') || '').replace(/^\/+/, ''); return u.toLowerCase() === path.toLowerCase() || path.toLowerCase().endsWith('/' + u.toLowerCase()); });
    if (!node) return bytes;
    const alg = node.getElementsByTagNameNS('*', 'EncryptionMethod')[0]?.getAttribute('Algorithm') || '';
    const uid = opf.uid.replace(/[\u0020\u0009\u000d\u000a]/g, '');
    const b = new Uint8Array(bytes);
    if (alg.includes('idpf.org/2008/embedding')) { const key = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(uid))); for (let i = 0; i < Math.min(1040, b.length); i++) b[i] ^= key[i % key.length]; }
    else if (alg.includes('ns.adobe.com/pdf/enc#RC')) { const hex = uid.replace(/^urn:uuid:/i, '').replace(/-/g, ''); const key = new Uint8Array(16); for (let i = 0; i < 16; i++) key[i] = parseInt(hex.substr(i * 2, 2), 16); for (let i = 0; i < Math.min(1024, b.length); i++) b[i] ^= key[i % 16]; }
    return b;
  }
  const EXT_T = { xhtml: 'application/xhtml+xml', html: 'application/xhtml+xml', htm: 'application/xhtml+xml', css: 'text/css', ncx: 'application/x-dtbncx+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
  const extOf = p => (p.split('?')[0].split('.').pop() || '').toLowerCase();
  // XHTML estricto primero; si falla (entidades HTML como &nbsp;, etiquetas sin cerrar de Kindle), se lee como HTML.
  const parseMarkup = str => { str = str.replace(/^\uFEFF/, '').trimStart(); const d = new DOMParser().parseFromString(str, 'application/xhtml+xml'); return d.getElementsByTagName('parsererror').length || !d.body ? new DOMParser().parseFromString(str, 'text/html') : d; };
  const parseXml = str => { str = str.replace(/^\uFEFF/, '').trimStart(); const d = new DOMParser().parseFromString(str, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error('El índice interno del EPUB (OPF/NCX) está dañado'); return d; };
  async function parseEpub(file){
    const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
    let zip; try { zip = await JSZip.loadAsync(file); } catch { throw new Error('El archivo no es un EPUB válido (no se puede abrir como ZIP). Si viene de Kindle Create, exporta como EPUB, no como KPF.'); }
    const files = Object.values(zip.files); if (files.length > LIMITS.entries) throw new Error('El EPUB tiene demasiados archivos');
    const total = files.reduce((a, f) => a + (f._data?.uncompressedSize || 0), 0); if (total > LIMITS.unzipped) throw new Error('El EPUB descomprimido supera 300 MB');
    // rutas sin distinguir mayúsculas ni barras invertidas (EPUB armados en Windows / Kindle)
    const ci = new Map(files.filter(f => !f.dir).map(f => [f.name.replace(/\\/g, '/').toLowerCase(), f]));
    const get = p => p && (zip.file(p) || ci.get(p.replace(/\\/g, '/').toLowerCase()) || null);
    const text = async p => { const f = get(p); return f ? f.async('string') : null; };
    if (get('META-INF/rights.xml')) throw new Error('Este EPUB tiene DRM (Adobe). Usa el archivo original sin protección.');
    const encXml = await text('META-INF/encryption.xml');
    if (encXml) { const ex = parseXml(encXml); const locked = [...ex.getElementsByTagNameNS('*', 'EncryptedData')].filter(d => !/idpf\.org\/2008\/embedding|ns\.adobe\.com\/pdf\/enc#RC/.test(d.getElementsByTagNameNS('*', 'EncryptionMethod')[0]?.getAttribute('Algorithm') || '')); if (locked.length) throw new Error('Este EPUB tiene DRM: el texto está cifrado. Usa el archivo original sin protección.'); }
    let opfPath = null; const contXml = await text('META-INF/container.xml');
    if (contXml) { try { const c = parseXml(contXml); opfPath = [...c.getElementsByTagNameNS('*', 'rootfile')].find(r => /oebps-package/.test(r.getAttribute('media-type') || 'oebps-package'))?.getAttribute('full-path'); } catch {} }
    if (!opfPath || !get(opfPath)) opfPath = [...ci.values()].find(f => /\.opf$/i.test(f.name))?.name;
    if (!opfPath) throw new Error('No encontré el índice del libro (archivo .opf). El EPUB está incompleto.');
    opfPath = get(opfPath).name.replace(/\\/g, '/');
    const X = parseXml(await get(opfPath).async('string'));
    const uidId = X.documentElement.getAttribute('unique-identifier'), uid = [...X.getElementsByTagNameNS('*', 'identifier')].find(e => e.getAttribute('id') === uidId)?.textContent || X.getElementsByTagNameNS('*', 'identifier')[0]?.textContent || '';
    const res = (from, href) => { try { const u = new URL(href.replace(/\\/g, '/'), 'http://x/' + from); const p = decodeURIComponent(u.pathname.slice(1)); return get(p)?.name || p; } catch { return href; } };
    const items = Object.fromEntries([...X.getElementsByTagNameNS('*', 'item')].filter(i => i.getAttribute('href')).map(i => { const href = res(opfPath, i.getAttribute('href')); let type = (i.getAttribute('media-type') || '').toLowerCase().trim(); if (!type || type === 'image/jpg' || type === 'application/octet-stream' || type === 'text/plain') type = EXT_T[extOf(href)] || type; return [i.getAttribute('id'), { id: i.getAttribute('id'), href, type, props: i.getAttribute('properties') || '' }]; }));
    const isHtml = it => /html/.test(it.type) || /^(x?html?)$/.test(extOf(it.href));
    const title = X.getElementsByTagNameNS('*', 'title')[0]?.textContent.trim() || file.name.replace(/\.epub$/i, '');
    const images = new Map(), fonts = [];
    for (const it of Object.values(items)) {
      if (/^image\//.test(it.type)) { const raw = await get(it.href)?.async('blob'); images.set(it.href, { blob: raw && new Blob([raw], { type: it.type }), type: it.type, name: it.href.split('/').pop() }); }
      if (/font|opentype|woff|truetype|sfnt/.test(it.type) || /\.(ttf|otf|woff2?)$/i.test(it.href)) { const raw = await get(it.href)?.async('uint8array'); if (raw) fonts.push({ href: it.href, bytes: await deobfuscate(zip, { uid }, raw, it.href, get), name: it.href.split('/').pop() }); }
    }
    // imágenes referidas en el texto pero no declaradas en el manifiesto (frecuente en exportaciones de Kindle)
    const loose = p => { if (images.has(p)) return true; const f = get(p); if (!f || !EXT_T[extOf(p)]?.startsWith('image/')) return false; images.set(p, { lazy: f, type: EXT_T[extOf(p)], name: p.split('/').pop() }); return true; };
    const fam = {}; for (const it of Object.values(items).filter(i => i.type === 'text/css')) { const css = await text(it.href) || ''; for (const m of css.matchAll(/@font-face\s*{([^}]*)}/g)) { const f = /font-family\s*:\s*["']?([^;"']+)/.exec(m[1])?.[1]?.trim(), src = /url\(\s*["']?([^)"']+)/.exec(m[1])?.[1], st = /font-style\s*:\s*(\w+)/.exec(m[1])?.[1] || 'normal', wt = /font-weight\s*:\s*(\w+)/.exec(m[1])?.[1] || 'normal'; if (f && src) fam[res(it.href, src)] = { family: f, style: st, weight: wt }; } }
    fonts.forEach(f => Object.assign(f, fam[f.href] || { family: f.name.replace(/\.\w+$/, ''), style: 'normal', weight: 'normal' }));
    // índice: nav de EPUB 3 (solo el «toc», no landmarks/page-list) y, si no da títulos, toc.ncx de EPUB 2 (Sigil, Kindle)
    const tocTitles = {}; const nav = Object.values(items).find(i => /\bnav\b/.test(i.props));
    if (nav) { const d = parseMarkup(await text(nav.href) || ''); const navs = [...d.getElementsByTagName('nav')]; const toc = navs.find(n => /toc/.test(n.getAttribute('epub:type') || n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || n.getAttribute('role') || '')) || navs[0]; toc?.querySelectorAll('a[href]').forEach(a => { const t = a.textContent.replace(/\s+/g, ' ').trim(); if (t) tocTitles[res(nav.href, a.getAttribute('href')).split('#')[0]] ||= t; }); }
    if (!Object.keys(tocTitles).length) { const ncxId = X.getElementsByTagNameNS('*', 'spine')[0]?.getAttribute('toc'); const ncx = items[ncxId] || Object.values(items).find(i => i.type === 'application/x-dtbncx+xml' || extOf(i.href) === 'ncx'); if (ncx) { try { const d = parseXml(await text(ncx.href) || ''); [...d.getElementsByTagNameNS('*', 'navPoint')].forEach(n => { const s = n.getElementsByTagNameNS('*', 'content')[0]?.getAttribute('src'), t = n.getElementsByTagNameNS('*', 'text')[0]?.textContent.replace(/\s+/g, ' ').trim(); if (s && t) tocTitles[res(ncx.href, s).split('#')[0]] ||= t; }); } catch {} } }
    const famIdx = new Map([...new Set(fonts.map(f => f.family))].map((f, i) => [f.toLowerCase(), i]));
    const sheetCache = new Map(), sheet = async p => { if (!sheetCache.has(p)) sheetCache.set(p, (await text(p)) || ''); return sheetCache.get(p); };
    const chapters = [], pages = [], spine = [...X.getElementsByTagNameNS('*', 'itemref')].map(r => items[r.getAttribute('idref')]).filter(it => it && isHtml(it));
    if (!spine.length) throw new Error('El EPUB no declara el orden de lectura (spine) o no tiene páginas de texto');
    for (const it of spine) {
      const raw = await text(it.href); if (raw == null) continue;
      const doc = parseMarkup(raw);
      const links = [...doc.querySelectorAll('link')].filter(l => /stylesheet/i.test(l.getAttribute('rel') || '') || /css/i.test(l.getAttribute('type') || '')).map(l => l.getAttribute('href')).filter(Boolean);
      const css = epubStyler(doc, await Promise.all(links.map(h => sheet(res(it.href, h)))), famIdx);
      const blocks = htmlToBlocks(doc.body || doc.documentElement, { resolve: s => { if (!s || /^(https?:|data:)/i.test(s)) return null; const p = res(it.href, s); return loose(p) ? 'img:' + p : null; } }, css);
      if (blocks.length) pages.push({ href: it.href, raw, title: doc.title?.trim(), blocks });
    }
    // ¿abre capítulo? Con índice interno útil, solo las páginas que el índice nombra: las ilustraciones y continuaciones se quedan en el capítulo donde estaban.
    // Sin índice útil: si la página trae su propio título; las ilustraciones sueltas generan su sección (comportamiento anterior).
    const group = byToc => { const out = [];
      for (const pg of pages) {
        const blocks = [...pg.blocks], onlyImg = blocks.every(b => b.type === 'image' || b.type === 'separator');
        const own = byToc ? tocTitles[pg.href] : tocTitles[pg.href] || blocks.find(b => b.type === 'heading')?.text;
        const prev = out[out.length - 1];
        if (!own && prev && (byToc || (!onlyImg && !prev.onlyImg))) {
          // continuación: el corte de archivo era un cambio de escena → separador (sin duplicar)
          const hasSep = prev.blocks[prev.blocks.length - 1]?.type === 'separator' || blocks[0].type === 'separator';
          const brk = !hasSep && /page-break-before|break-before/i.test(pg.raw) ? [{ type: 'separator' }] : [];
          prev.blocks.push(...brk, ...blocks); continue;
        }
        while (blocks[0]?.type === 'separator') blocks.shift();
        if (!blocks.length) continue;
        const t = own || pg.title || `Sección ${out.length + 1}`;
        out.push({ onlyImg, title: t.slice(0, 200), type: inferSectionType(t), blocks });
      }
      return out; };
    // Un índice con pocas entradas (desactualizado o parcial) juntaría medio libro en una sección: si alguna pasa del tamaño seguro, se vuelve a separar por títulos.
    let grouped = Object.keys(tocTitles).length >= 2 ? group(true) : null;
    if (!grouped || grouped.some(c => oversize(c.blocks))) grouped = group(false);
    chapters.push(...splitOversize(grouped));
    for (const c of chapters) { delete c.onlyImg; while (c.blocks[c.blocks.length - 1]?.type === 'separator') c.blocks.pop(); }
    const tally = { body: new Map(), heading: new Map() };
    for (const c of chapters) for (const b of c.blocks) { const f = b.html?.match(/^<span data-epub-family="(\d+)">/)?.[1]; if (f == null) continue; const m = tally[b.type === 'heading' ? 'heading' : 'body']; m.set(+f, (m.get(+f) || 0) + (b.text || '').length); }
    const top1 = m => [...m].sort((x, y) => y[1] - x[1])[0]?.[0], famL = [...famIdx.keys()], roleB = top1(tally.body), roleH = top1(tally.heading);
    fonts.forEach(f => { const i = famL.indexOf(f.family.toLowerCase()), u = []; if (i === roleB) u.push('body'); if (i === roleH) u.push('heading'); if (u.length) f.use = u; });
    for (const [k, v] of images) if (v.lazy) images.set(k, { blob: new Blob([await v.lazy.async('blob')], { type: v.type }), type: v.type, name: v.name });
    const md = n => [...X.getElementsByTagNameNS('*', n)].map(e => e.textContent.trim()).filter(Boolean);
    const metas = [...X.getElementsByTagNameNS('*', 'meta')];
    const metaN = n => metas.find(m => m.getAttribute('name') === n)?.getAttribute('content');
    const metaP = pr => metas.find(m => m.getAttribute('property') === pr)?.textContent.trim();
    const desc = md('description')[0], synopsis = desc ? (new DOMParser().parseFromString(desc, 'text/html').body.textContent || '').trim().slice(0, 3000) : '';
    const idx = +(metaN('calibre:series_index') || metaP('group-position') || (title.match(/(?:vol(?:umen|ume)?\.?|tomo)\s*(\d+(?:\.\d+)?)/i) || [])[1] || 0) || null;
    const OPF = 'http://www.idpf.org/2007/opf', people = [...X.getElementsByTagNameNS('*', 'creator'), ...X.getElementsByTagNameNS('*', 'contributor')];
    const roleOf = e => e.getAttributeNS(OPF, 'role') || e.getAttribute('opf:role') || (e.id && metas.find(m => m.getAttribute('refines') === '#' + e.id && m.getAttribute('property') === 'role')?.textContent.trim()) || '';
    const ill = people.find(e => /^ill/i.test(roleOf(e)))?.textContent.trim() || '', aut = people.find(e => /^aut/i.test(roleOf(e)))?.textContent.trim();
    const date = (md('date')[0] || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
    const meta = { illustrator: ill, date, author: aut || md('creator')[0] || '', publisher: md('publisher')[0] || '', synopsis, index: idx ? (() => { try { return parseVolumeNumber(idx); } catch { return null; } })() : null, series: metaN('calibre:series') || metaP('belongs-to-collection') || '' };
    // portada: EPUB 3 (cover-image) → <meta name="cover"> por id o ruta (EPUB 2, Sigil, Kindle) → <guide type="cover"> → nombre de archivo
    const mc = metaN('cover'), byIdCI = id => id && Object.values(items).find(i => i.id?.toLowerCase() === id.toLowerCase());
    let coverItem = Object.values(items).find(i => /cover-image/.test(i.props)) || byIdCI(mc) || (mc && items[Object.keys(items).find(k => items[k].href.endsWith(mc))]);
    let coverHref = coverItem && /^image\//.test(coverItem.type) ? coverItem.href : null;
    if (!coverHref) { const g = [...X.getElementsByTagNameNS('*', 'reference')].find(r => /cover/i.test(r.getAttribute('type') || '')); const gh = g && res(opfPath, g.getAttribute('href')).split('#')[0];
      const page = gh ? Object.values(items).find(i => i.href === gh) : (coverItem && isHtml(coverItem) ? coverItem : null);
      if (page) { const d = parseMarkup(await text(page.href) || ''); const im = d.querySelector('img') || d.getElementsByTagName('image')[0]; const s = im && (im.getAttribute('src') || im.getAttribute('xlink:href') || im.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || im.getAttribute('href')); if (s) coverHref = res(page.href, s); } }
    if (!coverHref) coverHref = [...images.keys()].find(k => /cover|portada/i.test(k)) || null;
    return { title, chapters, images, fonts, famList: [...famIdx.keys()], meta, cover: coverHref && images.has(coverHref) ? 'img:' + coverHref : null };
  }
  async function parseDocx(file){
    const { default: mammoth } = await import('https://esm.sh/mammoth@1.8.0/mammoth.browser.js');
    const images = new Map(); let n = 0;
    const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(async img => { const k = 'docx-' + (++n) + '.' + (img.contentType.split('/')[1] || 'png'); images.set(k, { blob: new Blob([await img.read()], { type: img.contentType }), type: img.contentType, name: k }); return { src: k }; }) });
    const doc = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html');
    const blocks = htmlToBlocks(doc.body, { resolve: s => images.has(s) ? 'img:' + s : null });
    return { title: file.name.replace(/\.docx$/i, ''), chapters: splitByHeadings(blocks), images, fonts: [], cover: null };
  }
  async function parsePdf(file){
    const pdfjs = await import('https://esm.sh/pdfjs-dist@4.4.168');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent(); const rows = new Map();
      tc.items.forEach(i => { if (!i.str.trim()) return; const y = Math.round(i.transform[5]); const r = rows.get(y) || { y, size: 0, text: '' }; r.text += (r.text && !r.text.endsWith(' ') ? ' ' : '') + i.str; r.size = Math.max(r.size, Math.abs(i.transform[0])); rows.set(y, r); });
      lines.push(...[...rows.values()].sort((a, b) => b.y - a.y));
    }
    const med = lines.map(l => l.size).sort((a, b) => a - b)[lines.length >> 1] || 10, blocks = []; let cur = '';
    // No iniciar el intervalo ajeno a este importador al analizar PDF.
    const flush = () => { if (cur.trim()) blocks.push({ type: 'paragraph', text: cur.trim() }); cur = ''; };
    lines.forEach(l => { if (l.size > med * 1.3 && l.text.length < 120) { flush(); blocks.push({ type: 'heading', text: l.text.trim() }); } else { cur += (cur ? ' ' : '') + l.text; if (/[.!?»”]$/.test(l.text.trim())) flush(); } }); flush();
    return { title: file.name.replace(/\.pdf$/i, ''), chapters: splitByHeadings(blocks), images: new Map(), fonts: [], cover: null };
  }
  function splitByHeadings(blocks){
    const out = []; let cur = null;
    blocks.forEach(b => { if (b.type === 'heading' && (!cur || cur.blocks.length > 2)) { cur = { title: b.text.slice(0, 200), type: inferSectionType(b.text), blocks: [b] }; out.push(cur); } else { if (!cur) { cur = { title: 'Sección 1', type: 'Capítulo', blocks: [] }; out.push(cur); } cur.blocks.push(b); } });
    return out;
  }

  // ---------- importador en 3 pasos: archivo → revisar → destino ----------
  const SKIP_RE = /^(copyright|derechos|cr[eé]ditos|colof[oó]n|[ií]ndice|contenidos?|contents|table of contents|tabla de contenidos?|newsletter|bolet[ií]n|sign up|title page|portadilla|cover|portada|about the (author|translator|illustrator)|acerca del autor|sobre el autor)\b/i;
  const words = bs => bs.reduce((a, b) => a + (b.text || '').split(/\s+/).filter(Boolean).length, 0);
  const slugify = s => (s || 'obra').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'obra';
  // Límites del servidor por capítulo (private.editor_phase0_valid_body): 6000 bloques y 3 MB. Se deja margen.
  const SAFE_BLOCKS = 4000, SAFE_BYTES = 2_000_000;
  const blockBytes = b => (b.text?.length || 0) + (b.html?.length || 0) + (b.url?.length || 0) + 60;
  const oversize = bs => bs.length > SAFE_BLOCKS || bs.reduce((a, b) => a + blockBytes(b), 0) > SAFE_BYTES;
  // Una sección que aún excede se parte en «(parte N)» en el último separador o párrafo que cabe: nunca se pierde texto.
  function splitOversize(list){
    const out = [];
    for (const c of list) {
      if (!oversize(c.blocks)) { out.push(c); continue; }
      let part = 1, cur = [], bytes = 0;
      const flush = () => { if (!cur.length) return; out.push({ ...c, title: (part === 1 ? c.title : `${c.title} (parte ${part})`).slice(0, 200), blocks: cur, why: part > 1 ? 'parte de una sección muy larga' : c.why }); part++; cur = []; bytes = 0; };
      for (const b of c.blocks) { const n = blockBytes(b); if (cur.length && (cur.length >= SAFE_BLOCKS || bytes + n > SAFE_BYTES)) { let cut = cur.length; for (let i = cur.length - 1; i > cur.length * 0.7; i--) if (cur[i].type === 'separator' || cur[i].type === 'heading') { cut = i; break; } const rest = cur.splice(cut); flush(); cur = rest; bytes = rest.reduce((a, x) => a + blockBytes(x), 0); } cur.push(b); bytes += n; }
      flush();
    }
    return out;
  }
  // Tamaño real de cada ilustración: se guarda en el bloque (w/h) para que la vista previa, el editor y el lector reserven su espacio y el texto no salte al cargarlas.
  async function measureImages(P){
    const sizeOf = async blob => {
      try { const bm = await createImageBitmap(blob); const r = { w: bm.width, h: bm.height }; bm.close?.(); return r; }
      catch { const u = URL.createObjectURL(blob); try { const im = new Image(); im.src = u; await im.decode(); return { w: im.naturalWidth, h: im.naturalHeight }; } catch { return null; } finally { URL.revokeObjectURL(u); } }
    };
    const dims = new Map(), keys = [...P.images.keys()].filter(k => P.images.get(k).blob && /^image\//.test(P.images.get(k).type));
    for (let i = 0; i < keys.length; i += 6) await Promise.all(keys.slice(i, i + 6).map(async k => { const d = await sizeOf(P.images.get(k).blob); if (d?.w > 0 && d?.h > 0) dims.set('img:' + k, d); }));
    for (const c of P.chapters) for (const b of c.blocks) { const d = b.type === 'image' && dims.get(b.url); if (d) { b.w = d.w; b.h = d.h; } }
  }
  function suggestSkips(P){
    P.chapters.forEach((c, i) => {
      const w = words(c.blocks), imgs = c.blocks.filter(b => b.type === 'image').length; c.skip = false; c.why = '';
      // Las categorías editoriales explícitas no deben omitirse por ser breves o tener solo imágenes.
      // El equipo puede desmarcarlas manualmente al revisar la importación.
      const special = ['Créditos', 'Ilustraciones', 'Episodio corto', 'Avance'].includes(c.type);
      if (!special && SKIP_RE.test((c.title || '').trim())) { c.skip = true; c.why = 'página editorial'; }
      else if (!special && i === 0 && imgs && w < 15) { c.skip = true; c.why = 'página de portada'; }
      else if (!special && !imgs && w < 25) { c.skip = true; c.why = 'casi vacía'; }
    });
  }

  async function importer(){
    if (!(await ensure())) return;
    const TAB = '/estudio/importar';
    if (!can('import')) { app.innerHTML = shell('Importar', '<p>Tu rol no permite importar archivos.</p>', TAB); bindPicker(importer); return; }
    // El selector de archivos debe mostrarse incluso si el catálogo tarda o falla.
    // Los datos editoriales solo son obligatorios al elegir el destino de importación.
    const teamId = T.team.id, uid = getUser()?.id;
    const live = () => location.pathname === TAB && T.team?.id === teamId && getUser()?.id === uid;
    let works = [], related = [], catalogueReady = false, catalogueTask = null;
    const bounded = (request, ms = 12000) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('El catálogo tardó demasiado en responder.')), ms);
      Promise.resolve(request).then(
        value => { clearTimeout(timer); resolve(value); },
        error => { clearTimeout(timer); reject(error); }
      );
    });
    const showCatalogueError = error => {
      if (!live()) return;
      const node = $('#imp-catalog-status');
      if (!node) return;
      node.innerHTML = '<p>No se pudo cargar el catálogo de obras: ' +
        esc(error?.message || 'Error de conexión') +
        '.</p><button class="btn ghost" type="button" id="imp-catalog-retry">Reintentar catálogo</button>';
      $('#imp-catalog-retry')?.addEventListener('click', () => {
        node.textContent = 'Reintentando catálogo de obras…';
        void loadCatalogue().catch(() => {});
      });
    };
    const loadCatalogue = () => {
      if (catalogueReady) return Promise.resolve(works);
      if (catalogueTask) return catalogueTask;
      catalogueTask = bounded(loadStudioImportCatalogue(sb, teamId))
        .then(data => {
          if (!live()) return [];
          works = data;
          catalogueReady = true;
          const node = $('#imp-catalog-status');
          if (node) node.textContent = '';
          return works;
        }).catch(error => {
          catalogueTask = null;
          console.warn('Importar: catálogo de obras', error);
          showCatalogueError(error);
          throw error;
        });
      return catalogueTask;
    };
    // Obras relacionadas son opcionales: nunca impedir que se abra el importador.
    const relatedTask = Promise.resolve(loadRelatedWorks(sb, teamId))
      .then(data => { if (live()) related = data; })
      .catch(error => console.warn('Importar: obras relacionadas', error));
    let P = null, file = null, fp = null, step = 1, sel = 0, splitting = false, dupAt = null, V = {};
    const contextualId = new URLSearchParams(location.search).get('obra');
    const contextualWork = () => works.find(w => w.id === contextualId) || null;
    const D = { work: contextualWork?.id || '', vnum: 1, mode: 'append', cover: null, workCover: false, allImgs: true, pub: 'draft', at: '', notice: null, noticeGetter: null, newTitle: '', newAuthor: '', scanChapterTitles: false, smartTitles: false, toolsOpen: false, prelaunch: null };
    let NW = createWorkData();
    app.innerHTML = shell('Importar contenido', '<p id="imp-catalog-status" class="mono" role="status"></p><ol class="imp-steps" id="steps"></ol><div id="wiz"></div><p id="status" class="mono" role="status"></p>', TAB);
    bindPicker(importer);
    const W = () => $('#wiz'), st = m => { const s = $('#status'); if (s) s.textContent = m || ''; };
    const src = k => k && k.startsWith('img:') ? P.urls.get(k.slice(4)) || '' : k;
    const work = () => (works || []).find(w => w.id === D.work);
    const liveVols = w => (w?.volumes || []).filter(v => !v.deleted_at);
    const nextVol = w => nextVolumeNumber((w?.volumes || []).map(v => v.num));
    const imgKeys = () => [...P.images.keys()].filter(k => P.images.get(k).blob && /^image\//.test(P.images.get(k).type));
    const usedImgs = () => { const s = new Set(P.chapters.filter(c => !c.skip).flatMap(c => c.blocks.filter(b => b.type === 'image' && b.url?.startsWith('img:')).map(b => b.url.slice(4)))); if (D.cover) s.add(D.cover.slice(4)); return s; };
    const render = () => { $('#steps').innerHTML = ['Manuscrito', 'Ordenar secciones', 'Obra y publicación'].map((l, i) => `<li class="${step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}"><span>${step > i + 1 ? '✓' : i + 1}</span>${l}</li>`).join(''); [null, s1, s2, s3][step](); };

    function s1(){
      W().innerHTML = `${contextualId ? `<p class="imp-context mono">${contextualWork() ? 'Importarás para <b>' + esc(contextualWork().title) + '</b>. ' : ''}Podrás confirmar la obra de destino antes de importar.</p>` : ''}<label class="imp-drop" id="drop"><b>Arrastra aquí un EPUB, DOCX o PDF</b><span class="mono">o toca para elegirlo · máx. 80 MB</span><input type="file" id="file" accept=".epub,.docx,.pdf" hidden></label>
        <p class="mono">Del EPUB se leen capítulos, ilustraciones, fuentes, portada y datos del libro: autor, editorial, sinopsis y número de volumen.</p>`;
      const dz = $('#drop');
      $('#file').onchange = e => e.target.files[0] && load(e.target.files[0]);
      dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); }; dz.ondragleave = () => dz.classList.remove('on');
      dz.ondrop = e => { e.preventDefault(); dz.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) load(f); };
    }
    async function load(f){
      file = f;
      try {
        if (f.size > LIMITS.file) throw new Error('El archivo supera 80 MB');
        st('Calculando huella…'); fp = await sha256(await f.arrayBuffer());
        const { data: dup } = await sb.from('import_jobs').select('created_at').eq('team_id', T.team.id).eq('fingerprint', fp).eq('status', 'done').limit(1); dupAt = dup?.[0]?.created_at || null;
        st('Analizando ' + f.name + '…');
        if (/\.(kpf|mobi|azw3?|kfx)$/i.test(f.name)) throw new Error('Ese es un formato de Kindle. En Kindle Create usa «Archivo › Exportar» y elige EPUB; en Calibre conviértelo a EPUB.');
        P = /\.epub$/i.test(f.name) ? await parseEpub(f) : /\.docx$/i.test(f.name) ? await parseDocx(f) : /\.pdf$/i.test(f.name) ? await parsePdf(f) : (() => { throw new Error('Formato no admitido'); })();
        if (!P.chapters.length) throw new Error('No encontré texto en el archivo');
        P.meta ||= {}; document.getElementById('imp-fonts')?.remove(); P.fontVars = '';
        if (P.fonts?.length) { const fl = [...new Set(P.fonts.map(f => f.family))], stl = document.createElement('style'); stl.id = 'imp-fonts';
          stl.textContent = P.fonts.map(f => `@font-face{font-family:"imp-${fl.indexOf(f.family)}";src:url("${URL.createObjectURL(new Blob([f.bytes]))}");font-style:${/italic|oblique/i.test(f.style) ? 'italic' : 'normal'};font-weight:${/^\d+$|bold|normal/.test(f.weight) ? f.weight : 'normal'}}`).join('');
          document.head.appendChild(stl); P.fontVars = fl.map((_, i) => `--f${i}:'imp-${i}',Literata,serif`).join(';') + ';'; const rb = P.fonts.find(f => f.use?.includes('body')), rh = P.fonts.find(f => f.use?.includes('heading')); if (rb) P.fontVars += `--fb:'imp-${fl.indexOf(rb.family)}',Literata,serif;`; if (rh) P.fontVars += `--fh:'imp-${fl.indexOf(rh.family)}',Literata,serif;`; }
        P.urls = new Map([...P.images].map(([k, v]) => [k, v.blob ? URL.createObjectURL(v.blob) : '']));
        if (P.images.size) { st('Midiendo ilustraciones…'); await measureImages(P); }
        P.chapters = splitOversize(P.chapters);
        suggestSkips(P);
        const key = (P.meta.series || P.title).toLowerCase();
        const guess = (works || []).find(w => w.title && key.includes(w.title.toLowerCase().slice(0, 18)));
        const target = contextualWork() || guess;
        D.work = target?.id || ''; D.newTitle = P.meta.series || P.title.replace(/\s*[,:\-–]?\s*(vol(umen|ume)?\.?|tomo)\s*\d+.*$/i, '').replace(/\s+[1-9]\d{0,2}\s*$/, '').trim() || P.title; D.newAuthor = P.meta.author || '';
        NW = createWorkData({ title: D.newTitle, author: D.newAuthor, illustrator: P.meta.illustrator || '', publisher: P.meta.publisher || '', synopsis: (P.meta.synopsis || '').slice(0, 1500) });
        D.vnum = importedVolumeNumber({ filename: f.name, title: P.title, metadataIndex: P.meta.index, fallback: nextVol(target) }); D.scanChapterTitles = false; D.smartTitles = false; D.cover = P.cover || null; D.workCover = !target || !target.cover_path; D.mode = 'replace';
        V = { title: '', subtitle: '', synopsis: P.meta.synopsis || '', synopsis_spoiler: false, publisher: P.meta.publisher || '', imprint: '', illustrator: P.meta.illustrator || '', jp_release: P.meta.date || '', planned_chapters: '', is_final: false, translator_notes: '' };
        sel = Math.max(0, P.chapters.findIndex(c => !c.skip)); splitting = false;
        st(''); step = 2; render();
      } catch (er) { st('No se pudo leer: ' + er.message); }
    }

    function fichaHTML(nInc){
      const w = work(), ex = liveVols(w).find(v => v.num === D.vnum), f = (k, l, attrs = '') => `<label>${l}<input data-v="${k}" value="${esc(V[k] ?? '')}" ${attrs}></label>`;
      return `<details class="imp-box imp-ficha"><summary><b>Ficha del volumen</b><span class="mono">Destino previsto: ${esc(w?.title || D.newTitle || P.title)} · Vol. ${D.vnum} · ${ex ? 'ya existe: estos datos solo completan sus campos vacíos' : 'nuevo: se creará con esta ficha'}</span></summary>
        <div class="imp-fg">
          ${f('title', 'Título del volumen', 'maxlength="200" placeholder="Volumen ' + D.vnum + '"')}${f('subtitle', 'Subtítulo', 'maxlength="200"')}
          <label class="wide">Sinopsis<textarea data-v="synopsis" rows="4" maxlength="3000">${esc(V.synopsis)}</textarea></label>
          <label class="tb-inl wide"><input type="checkbox" data-v="synopsis_spoiler" ${V.synopsis_spoiler ? 'checked' : ''}> La sinopsis contiene spoilers del volumen anterior</label>
          ${f('jp_release', 'Salida en Japón', 'type="date"')}
          ${f('publisher', 'Editorial', 'maxlength="120"')}${f('imprint', 'Sello', 'maxlength="120" placeholder="p. ej. MF Bunko J"')}
          ${f('illustrator', 'Ilustración', 'maxlength="120"')}${f('planned_chapters', 'Capítulos previstos', 'type="number" min="0" max="999" placeholder="' + nInc + '"')}
          <label class="wide">Notas del traductor<textarea data-v="translator_notes" rows="2" maxlength="2000" placeholder="Se muestran en la ficha del volumen">${esc(V.translator_notes)}</textarea></label>
          <label class="tb-inl wide"><input type="checkbox" data-v="is_final" ${V.is_final ? 'checked' : ''}> Es el último volumen de la obra (al publicarlo, la traducción queda como completa)</label>
        </div><p class="mono">Los datos que trae el EPUB ya vienen llenos. Arriba eliges la obra y el número de volumen.</p></details>`;
    }
    function bindFicha(){ W().querySelectorAll('[data-v]').forEach(i => i[i.type === 'checkbox' ? 'onchange' : 'oninput'] = () => { V[i.dataset.v] = i.type === 'checkbox' ? i.checked : i.value; }); }
    const fichaRow = () => {
      const o = {}; for (const k of ['title', 'subtitle', 'synopsis', 'publisher', 'imprint', 'illustrator', 'translator_notes']) { const v = String(V[k] || '').trim(); if (v) o[k] = v; }
      if (V.jp_release) o.jp_release = V.jp_release; if (V.planned_chapters !== '' && V.planned_chapters != null) o.planned_chapters = Math.max(0, +V.planned_chapters || 0);
      if (V.synopsis_spoiler) o.synopsis_spoiler = true; if (V.is_final) o.is_final = true; return o;
    };
    // Paso 2 simplificado: resumen, lista de secciones (casilla, título, palabras e ilustraciones; tipo/mover/unir en «⋯»),
    // herramientas de revisión plegadas y vista previa fija. Elegir, desmarcar o describir una imagen solo actualiza esa parte;
    // la pantalla completa se redibuja al mover, unir, dividir o cambiar una herramienta, y conserva el desplazamiento.
    const nImgs = bs => bs.filter(b => b.type === 'image' || b.type === 'img').length;
    function s2(){
      const ch = P.chapters, m = P.meta, keep = { list: W().querySelector('.imp-list ol')?.scrollTop || 0, page: window.scrollY };
      const cur = () => ch[sel];
      const titleExample = () => { const c = cur(); if (!D.scanChapterTitles) return c.title; const v = formatChapterIndex({title:c.title,sectionType:c.type}); return [v.label + (v.number ? ' ' + v.number : ''),v.heading].filter(Boolean).join(' · '); };
      const scanResults = () => scanImportedChapterTitles(ch);
      const scanText = () => { const a = scanResults(); return a.numbered+' capítulos numerados · '+a.special+' secciones especiales · '+a.typo+' errores «Captiulo» · '+a.unrecognized+' sin prefijo claro'; };
      const rowMeta = (c, i) => { const ni = nImgs(c.blocks); return `${esc(c.type)} · ${words(c.blocks).toLocaleString('es-MX')} palabras${ni ? ' · ' + ni + (ni === 1 ? ' ilustración' : ' ilustraciones') : ''}${D.scanChapterTitles ? ' · ' + esc((()=>{const v=formatChapterIndex({title:c.title,sectionType:c.type});return v.number ? 'cap. '+v.number+(v.typo?' · revisar «Captiulo»':'') : v.label==='Sección'?'sin prefijo reconocido':v.label;})()) : ''}${c.skip && c.why ? ' · <b>' + c.why + '</b>' : ''}`; };
      const row = (c, i) => `<li class="${i === sel ? 'on' : ''}${c.skip ? ' off' : ''}" data-sel="${i}">
          <input type="checkbox" data-inc="${i}" ${c.skip ? '' : 'checked'} aria-label="Importar ${esc(c.title)}">
          <span class="imp-n mono">${i + 1}</span>
          <span class="imp-t"><input data-t="${i}" value="${esc(c.title)}" aria-label="Título de la sección ${i + 1}"><small class="mono">${rowMeta(c, i)}</small></span>
          <details class="imp-more"><summary class="ed-btn" aria-label="Más opciones de la sección ${i + 1}">⋯</summary><div class="imp-mm">
            <label class="mono">Tipo<select data-k="${i}" aria-label="Tipo">${SEC.map(s => `<option ${s === c.type ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
            <button class="ed-btn" data-mv="${i}" data-d="-1" ${i ? '' : 'disabled'}>↑ Subir</button><button class="ed-btn" data-mv="${i}" data-d="1" ${i < ch.length - 1 ? '' : 'disabled'}>↓ Bajar</button>
            <button class="ed-btn" data-merge="${i}" ${i < ch.length - 1 ? '' : 'disabled'}>Unir con la siguiente</button></div></details></li>`;
      W().innerHTML = `<div class="imp-sum" id="isum"></div>
        ${dupAt ? `<p class="imp-warn">Ya importaste este mismo archivo el ${fmtTz(dupAt, { dateStyle: 'long' })}. Puedes continuar; en «Obra y publicación» elige «Reemplazar» si quieres sustituirlo.</p>` : ''}
        <details class="imp-box imp-tools" id="imp-tools" ${D.toolsOpen ? 'open' : ''}><summary><b>Herramientas de revisión</b><span class="mono" id="imp-tools-sum"></span></summary>
          <div class="imp-title-option"><label class="imp-title-switch" for="imp-smart-titles"><input type="checkbox" id="imp-smart-titles" ${D.smartTitles ? 'checked' : ''}><span><b>Títulos inteligentes</b><small>Opcional · al leer, ocultar solo el primer título del EPUB cuando repita el encabezado del capítulo. No modifica el archivo ni elimina texto; solo se aplica a los capítulos de esta importación.</small></span></label><p class="mono" id="imp-smart-count" role="status"></p></div>
          <div class="imp-title-option"><label class="imp-title-switch" for="imp-scan-titles"><input type="checkbox" id="imp-scan-titles" ${D.scanChapterTitles ? 'checked' : ''}><span><b>Escanear nombres y números de capítulos</b><small>Opcional · detectar «Capítulo 1», «Capitulo 01», «Captiulo 1», «Cap. 02», prólogos y epílogos antes de importar.</small></span></label><p class="mono">Es una herramienta de revisión, no una configuración de apariencia. El escaneo no reescribe títulos ni cambia enlaces; puedes corregir manualmente cualquier encabezado en la lista.</p><p class="mono" id="imp-scan-count" role="status"></p><div class="imp-title-example"><small>Vista previa del análisis de la sección seleccionada:</small><span id="imp-format-example"></span></div><small class="mono" id="imp-format-warning"></small></div>
          <section class="imp-quality" aria-label="Informe de calidad editorial"><h3>Calidad editorial · revisión previa</h3><p class="mono" role="status" id="imp-quality-a"></p><p class="mono" id="imp-quality-b"></p></section>
        </details>
        <div class="imp-grid">
          <div class="imp-list"><div class="imp-lh"><b id="icount"></b><span class="mono">Toca una sección para verla</span></div><ol>${ch.map(row).join('')}</ol></div>
          <div class="imp-pvw"><div class="imp-lh"><b id="pvh"></b><button class="ed-btn" id="split"></button></div><div class="imp-pv" id="pv"></div>
            <details class="imp-quality-images" id="imp-qimg"><summary><b id="imp-qimg-h"></b></summary><div id="imp-qimg-b"></div></details></div>
        </div>
        <div class="imp-nav"><button class="btn ghost" id="back">‹ Elegir otro archivo</button><button class="btn" id="next">Continuar a obra y publicación ›</button></div>`;
      const L = W().querySelector('.imp-list'), OL = L.querySelector('ol');
      OL.scrollTop = keep.list; window.scrollTo(0, keep.page);
      const counts = () => { const inc = ch.filter(c => !c.skip), w = words(inc.flatMap(c => c.blocks)), im = inc.reduce((a, c) => a + nImgs(c.blocks), 0), quality = inspectImport(inc);
        $('#isum').innerHTML = `<span><b>${esc(P.title)}</b><small class="mono">${esc(file.name)}${m.author ? ' · ' + esc(m.author) : ''}${m.publisher ? ' · ' + esc(m.publisher) : ''}${m.index ? ' · Vol. ' + esc(String(m.index)) : ''}${P.fonts.length ? ' · ' + P.fonts.length + ' fuentes' : ''}</small></span>
          <p><b>${ch.length} ${ch.length === 1 ? 'sección detectada' : 'secciones detectadas'}</b> con ${w.toLocaleString('es-MX')} palabras y ${im} ${im === 1 ? 'ilustración' : 'ilustraciones'} en lo que se importará. Corrige los títulos y desmarca lo que no quieras importar.</p>`;
        $('#icount').textContent = `${inc.length} de ${ch.length} se importarán`;
        $('#imp-quality-a').textContent = `${quality.total ? `${quality.total} aviso(s) en ${quality.withWarnings} sección(es).` : 'No se detectaron avisos con las reglas disponibles.'} No se reescribe ningún párrafo; puedes continuar con avisos tras confirmarlos.`;
        $('#imp-quality-b').textContent = (EDITORIAL_RULES.filter(([k])=>quality.counts[k]).map(([k,label])=>`${label}: ${quality.counts[k]}`).join(' · ') || 'Revisión básica superada') + '.';
        $('#imp-smart-count').textContent = D.smartTitles ? inc.filter(c => repeatedOpeningHeading(smartTitleBlocks(c.blocks,{title:c.title,section_type:c.type},true),{title:c.title,section_type:c.type}) >= 0).length+' secciones con títulos duplicados identificados.' : 'Desactivado: se conservan todos los títulos del EPUB en el lector.';
        $('#imp-scan-count').textContent = D.scanChapterTitles ? scanText() : 'Escaneo desactivado: revisión manual de títulos.';
        $('#imp-tools-sum').textContent = [quality.total ? quality.total + ' aviso(s) de calidad' : 'sin avisos de calidad', D.smartTitles && 'títulos inteligentes', D.scanChapterTitles && 'escaneo de capítulos'].filter(Boolean).join(' · ');
        $('#next').disabled = !inc.length; };
      const refreshTitleExample = () => { const c = cur(); $('#imp-format-example').textContent = titleExample(); $('#imp-format-warning').textContent = D.scanChapterTitles && formatChapterIndex({title:c.title,sectionType:c.type}).typo ? 'Detectamos «Captiulo». Puedes corregir el encabezado en la lista; el original no se modifica automáticamente.' : ''; if (D.scanChapterTitles) $('#imp-scan-count').textContent = scanText(); };
      const imagePanel = () => { const c = cur(), q = lintImportedBlocks(c.blocks), n = nImgs(c.blocks);
        $('#imp-qimg-h').textContent = n ? `Ilustraciones y accesibilidad · ${q.counts.alt} sin descripción` : 'Ilustraciones y accesibilidad · sin ilustraciones en esta sección';
        $('#imp-qimg-b').innerHTML = (c.blocks.map((b,i) => (b.type==='image'||b.type==='img') ? `<div class="imp-quality-image"><label>Imagen ${i+1} · Descripción alternativa<input type="text" data-image-alt="${i}" maxlength="300" value="${esc(b.alt||'')}" placeholder="Describe lo que aporta la imagen"></label><label class="mono"><input type="checkbox" data-image-deco="${i}" ${b.decorative===true?'checked':''}> Decorativa: alt vacío intencional</label></div>` : '').join('') || '<p class="mono">Sin ilustraciones en esta sección.</p>') + '<p class="mono">La casilla decorativa se usa solo cuando la imagen no transmite información necesaria para comprender el capítulo.</p>';
        W().querySelectorAll('[data-image-alt]').forEach(input => input.onchange = () => { const b = c.blocks[+input.dataset.imageAlt]; b.alt = input.value.trim(); if (b.alt) { delete b.decorative; const d = W().querySelector(`[data-image-deco="${input.dataset.imageAlt}"]`); if (d) d.checked = false; } imagePanelHead(); counts(); });
        W().querySelectorAll('[data-image-deco]').forEach(input => input.onchange = () => { const b = c.blocks[+input.dataset.imageDeco]; if (input.checked) { b.decorative = true; b.alt = ''; const a = W().querySelector(`[data-image-alt="${input.dataset.imageDeco}"]`); if (a) a.value = ''; } else delete b.decorative; imagePanelHead(); counts(); }); };
      const imagePanelHead = () => { const c = cur(), q = lintImportedBlocks(c.blocks); if (nImgs(c.blocks)) $('#imp-qimg-h').textContent = `Ilustraciones y accesibilidad · ${q.counts.alt} sin descripción`; };
      const preview = () => { const cur = ch[sel], c = cur, pv = $('#pv');
        $('#pvh').textContent = `Vista previa · ${sel + 1} de ${ch.length}`;
        $('#split').textContent = splitting ? 'Toca el párrafo donde empieza la nueva sección · Cancelar' : 'Dividir esta sección…'; $('#split').classList.toggle('on', splitting); pv.classList.toggle('splitting', splitting);
        pv.innerHTML = `<div class="rd" data-theme="oscuro" data-width="normal" data-lh="comodo" data-align="izquierda" data-font="original" style="${P.fontVars || ''}--rs:17px"><article class="rd-ch"><header class="rd-head"><span class="mono">${esc(c.type)}</span><h2 ${headFont(c.blocks)}>${esc(c.title)}</h2></header><div class="rd-body">${(()=>{const blocks=smartTitleBlocks(cur.blocks,{title:cur.title,section_type:cur.type},D.smartTitles);const skip=repeatedOpeningHeading(blocks,{title:cur.title,section_type:cur.type});return blocks.map((b,i)=>i===skip?'':renderBlock(b,i,{media:src})).join('');})()}</div></article></div>`;
        pv.scrollTop = 0; imagePanel(); refreshTitleExample(); };
      const pick = i => { if (i === sel) return; OL.children[sel]?.classList.remove('on'); sel = i; splitting = false; OL.children[sel]?.classList.add('on'); preview(); };
      const repaintRow = i => { const sm = OL.children[i]?.querySelector('.imp-t small'); if (sm) sm.innerHTML = rowMeta(ch[i], i); };
      counts(); preview();
      $('#imp-tools').ontoggle = e => { D.toolsOpen = e.currentTarget.open; };
      $('#imp-smart-titles').onchange = e => { D.smartTitles = e.target.checked; counts(); preview(); };
      $('#imp-scan-titles').onchange = e => { D.scanChapterTitles = e.target.checked; ch.forEach((c, i) => repaintRow(i)); counts(); refreshTitleExample(); };
      OL.addEventListener('toggle', e => { if (e.target.open) OL.querySelectorAll('details[open]').forEach(d => d !== e.target && (d.open = false)); }, true);
      L.querySelectorAll('[data-t]').forEach(i => i.oninput = () => { const k = +i.dataset.t; ch[k].title = i.value; if (D.scanChapterTitles) repaintRow(k); if (k === sel) { $('#pv h2').textContent = i.value; refreshTitleExample(); } });
      L.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { const k = +s.dataset.k; ch[k].type = s.value; repaintRow(k); if (k === sel) { $('#pv .rd-head .mono').textContent = s.value; refreshTitleExample(); } });
      L.querySelectorAll('[data-inc]').forEach(c => c.onchange = () => { const k = +c.dataset.inc; ch[k].skip = !c.checked; OL.children[k].classList.toggle('off', ch[k].skip); counts(); });
      L.addEventListener('focusin', e => { const li = e.target.closest('[data-sel]'); if (li && e.target.matches('[data-t]')) pick(+li.dataset.sel); });
      L.onclick = e => {
        const b = e.target.closest('[data-mv],[data-merge]');
        if (b) { const i = +(b.dataset.mv ?? b.dataset.merge);
          if (b.dataset.mv != null) { const j = i + +b.dataset.d; [ch[i], ch[j]] = [ch[j], ch[i]]; sel = j; }
          else { if (oversize([...ch[i].blocks, ...ch[i + 1].blocks])) return toast('Juntas serían demasiado largas para una sola sección'); ch[i].blocks.push(...ch[i + 1].blocks); ch[i].skip = ch[i].skip && ch[i + 1].skip; ch.splice(i + 1, 1); sel = i; }
          splitting = false; return s2(); }
        const li = e.target.closest('[data-sel]'); if (li && !e.target.closest('input,select,button,details')) pick(+li.dataset.sel);
      };
      $('#split').onclick = () => { splitting = !splitting; preview(); };
      $('#pv').onclick = e => {
        if (!splitting) return; const b = e.target.closest('[data-b]'); if (!b) return; const at = +b.dataset.b, c = cur();
        if (at < 1) return toast('Elige un párrafo después del primero');
        const rest = c.blocks.splice(at);
        ch.splice(sel + 1, 0, { title: (rest.find(x => x.type === 'heading')?.text || c.title + ' (cont.)').slice(0, 200), type: c.type, blocks: rest, skip: false });
        splitting = false; sel++; s2(); toast('Sección dividida');
      };
      $('#back').onclick = () => { P.urls.forEach(u => u && URL.revokeObjectURL(u)); P = null; step = 1; st(''); render(); };
      $('#next').onclick = async e => {
        const button = e.currentTarget;
        button.disabled = true;
        button.textContent = 'Comprobando obras y volúmenes…';
        try {
          await loadCatalogue();
          if (!live() || !P) return;
          // El archivo puede haberse analizado antes de llegar las obras.
          // Recuperar el contexto y calcular el volumen correcto antes de editar.
          const title = (P.meta.series || P.title).toLowerCase();
          const target = contextualWork() ||
            works.find(w => w.title && title.includes(w.title.toLowerCase().slice(0, 18)));
          if (!D.work && target) {
            D.work = target.id;
            D.vnum = importedVolumeNumber({
              filename: file?.name, title: P.title, metadataIndex: P.meta.index,
              fallback: nextVol(target)
            });
            D.workCover = !target.cover_path;
          }
          // No bloquear la importación por datos de relaciones opcionales.
          await Promise.race([relatedTask, new Promise(resolve => setTimeout(resolve, 650))]);
          if (!live() || !P) return;
          st('');
          step = 3;
          render();
        } catch (error) {
          if (live()) st('No se pudo comprobar el catálogo. Reintenta sin volver a seleccionar el archivo.');
        } finally {
          if (button.isConnected) {
            button.disabled = false;
            button.textContent = 'Continuar a obra y publicación ›';
          }
        }
      };
    }

    function s3(){
      const w = work(), ex = liveVols(w).find(v => v.num === D.vnum), gone = !ex && (w?.volumes || []).find(v => v.deleted_at && v.num === D.vnum), keys = imgKeys(), used = usedImgs(), inc = P.chapters.filter(c => !c.skip);
      const folder = `obras › ${w?.slug || slugify(NW.title || D.newTitle || P.title)} › vol-${D.vnum}`;
      const q = inspectImport(inc), nW = words(inc.flatMap(c => c.blocks)), nI = inc.reduce((a, c) => a + c.blocks.filter(b => b.type === 'image').length, 0);
      const upN = D.allImgs ? keys.length : used.size, privateWork = !w || !w.published;
      if (D.prelaunch == null) D.prelaunch = privateWork;
      W().innerHTML = `<div class="imp-dest">
        <section class="imp-box${w ? "" : " imp-new-series"}"><h3>1 · Obra y volumen</h3>
          <label>Obra<select id="dw"><option value="">+ Nueva obra</option>${(works || []).map(x => `<option value="${x.id}" ${x.id === D.work ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
          ${w ? '' : `<div id="imp-new-work"><h3>Datos completos de la nueva obra</h3><p class="mono">Se rellenan los metadatos detectados; revisa los valores antes de importar.</p>${renderWorkFields(NW, esc, (related || []).filter(x => x.id !== D.work))}</div>`}
          <label>Número de volumen<input id="dv" type="number" min="1" max="999" step="0.1" inputmode="decimal" value="${D.vnum}"><small>Comprueba el número detectado del EPUB o su nombre (por ejemplo, 4.5) antes de importar.</small></label>
          ${ex ? `<div class="imp-warn"><span>El Volumen ${D.vnum} ya existe<span id="exc"></span>.</span>
            <label class="tb-inl"><input type="radio" name="dm" value="replace" ${D.mode === 'replace' ? 'checked' : ''}> Reemplazar el volumen: capítulos, ficha y portada nuevos (los capítulos anteriores van a la papelera)</label>
            <label class="tb-inl"><input type="radio" name="dm" value="append" ${D.mode === 'append' ? 'checked' : ''}> Agregar estas secciones después de las existentes (la ficha solo completa campos vacíos)</label></div>`
            : gone ? `<p class="imp-warn">Hay un Volumen ${D.vnum} en la papelera. Se recupera y se llena con este archivo; sus capítulos viejos siguen en la papelera.</p>` : `<p class="mono">Se creará el Volumen ${D.vnum}${w ? ' en ' + esc(w.title) : ''}.</p>`}
        </section>
        <section class="imp-box"><h3>2 · Portada del volumen</h3>
          <p class="mono">${keys.length ? 'Toca la imagen que será la portada' + (P.cover ? '; marcamos la que el EPUB declara como portada' : '') + '. También puedes subir otra.' : 'El archivo no trae imágenes: puedes subir una portada.'}</p>
          <div class="imp-covs" role="radiogroup" aria-label="Portada del volumen">
            <button type="button" class="imp-c none${D.cover ? '' : ' on'}" data-cov="" role="radio" aria-checked="${!D.cover}">Sin portada</button>
            <label class="imp-c none imp-c-up" title="Subir otra imagen como portada">+ Subir otra<input type="file" id="dcu" accept="image/jpeg,image/png,image/webp,image/avif" hidden></label>
            ${keys.map(k => `<button type="button" class="imp-c${D.cover === 'img:' + k ? ' on' : ''}" data-cov="img:${esc(k)}" role="radio" aria-checked="${D.cover === 'img:' + k}" title="${esc(k.split('/').pop())}"><img src="${esc(P.urls.get(k))}" alt="${esc(k.split('/').pop())}" loading="lazy">${P.cover === 'img:' + k ? '<em>Del EPUB</em>' : P.images.get(k)?.custom ? '<em>Subida</em>' : ''}</button>`).join('')}
          </div>
          ${ex?.cover_path && D.cover ? '<p class="mono">El volumen ya tiene portada: esta la reemplaza.</p>' : ''}
          <label class="tb-inl"><input type="checkbox" id="dwc" ${D.workCover && D.cover ? 'checked' : ''} ${D.cover ? '' : 'disabled'}> Usarla también como portada de la obra${w?.cover_path ? ' (reemplaza la actual)' : ''}</label>
        </section>
        <section class="imp-box imp-pub"><h3>3 · Publicación</h3>
          <label class="tb-inl"><input type="radio" name="dp" value="draft" ${D.pub === 'draft' ? 'checked' : ''}> Guardar como borrador</label>
          ${can('publish') ? `<label class="tb-inl"><input type="radio" name="dp" value="now" ${D.pub === 'now' ? 'checked' : ''}> Lanzar ahora</label>` : ''}
          ${can('schedule') ? `<label class="tb-inl"><input type="radio" name="dp" value="at" ${D.pub === 'at' ? 'checked' : ''}> Programar el lanzamiento</label>
          <div class="imp-at" id="imp-at" ${D.pub === 'at' ? '' : 'hidden'}><label>Fecha y hora<input type="datetime-local" id="dat" value="${esc(D.at)}" aria-label="Fecha de publicación"></label>${tzHint()}
            <label class="tb-inl imp-pre"><input type="checkbox" id="dpre" ${D.prelaunch ? 'checked' : ''}> <span><b>Habilitar preestreno</b><small>Anuncia el estreno en el calendario y abre la ficha pública con cuenta regresiva, sin liberar capítulos hasta la fecha.</small></span></label></div>` : ''}
          ${!can('publish') && !can('schedule') ? '<p class="mono">Tu rol solo permite guardar como borrador. Alguien con permiso «Publicar» podrá lanzarlo desde la obra.</p>' : ''}
          <p class="mono" id="imp-pub-note" role="status"></p>
        </section><section class="imp-box" id="imp-ann" ${D.pub === 'draft' ? 'hidden' : ''}><h3>Último paso · anuncio editorial</h3>${editorialForm(esc, 'volume', D.notice || {})}</section>
        ${fichaHTML(inc.length)}
        <details class="imp-box imp-adv"><summary><b>Imágenes y fuentes en Multimedia</b><span class="mono">${D.allImgs ? 'todas las del archivo' : 'solo las usadas'} · ${esc(folder)}</span></summary>
          <p class="mono">Carpeta: <b>Multimedia › ${esc(folder)}</b></p>
          <label class="tb-inl"><input type="radio" name="di" value="all" ${D.allImgs ? 'checked' : ''}> Todas las imágenes del archivo (${keys.length})</label>
          <label class="tb-inl"><input type="radio" name="di" value="used" ${D.allImgs ? '' : 'checked'}> Solo las del texto y la portada (${used.size})</label>
          ${P.fonts.length ? `<p class="mono">Las fuentes idénticas del equipo se reutilizan; las nuevas se guardan en «fuentes» para que el lector las use en este volumen.</p>` : ''}
        </details></div>
        <section class="imp-recap" aria-label="Resumen de la importación"><h3>Así quedará</h3><ul>
          <li><span>Obra</span><b>${esc(w?.title || NW.title || D.newTitle || P.title)}${w ? '' : ' <small class="mono">(nueva)</small>'}</b></li>
          <li><span>Volumen</span><b>${esc(String(D.vnum))} · ${ex ? (D.mode === 'replace' ? 'se reemplaza' : 'se agregan secciones') : gone ? 'se recupera de la papelera' : 'nuevo'}</b></li>
          <li><span>Contenido</span><b>${inc.length} ${inc.length === 1 ? 'sección' : 'secciones'} · ${nW.toLocaleString('es-MX')} palabras · ${nI} ${nI === 1 ? 'ilustración' : 'ilustraciones'}</b></li>
          <li><span>Portada</span><b>${D.cover ? 'elegida' + (D.workCover ? ' (también de la obra)' : '') : 'sin portada'}</b></li>
          <li><span>Multimedia</span><b id="rc-media">${upN} ${upN === 1 ? 'imagen' : 'imágenes'}${P.fonts.length ? ' · ' + P.fonts.length + ' fuentes' : ''}</b></li>
          <li><span>Estado</span><b id="rc-pub"></b></li>
          <li><span>Revisión</span><b>${q.total ? `<a href="#" id="rc-back">${q.total} aviso(s) de calidad en ${q.withWarnings} sección(es)</a> · se pedirá confirmar` : 'sin avisos de calidad'}${D.smartTitles ? ' · títulos inteligentes' : ''}${D.scanChapterTitles ? ' · escaneo de capítulos' : ''}</b></li>
        </ul></section>
        <div class="imp-nav"><button class="btn ghost" id="back">‹ Ordenar secciones</button><button class="btn" id="go"></button></div>`;
      const pubLabel = () => { const n = inc.length + ' ' + (inc.length === 1 ? 'sección' : 'secciones');
        $('#go').textContent = D.pub === 'now' ? 'Importar y lanzar ahora · ' + n : D.pub === 'at' ? 'Importar y programar · ' + n : 'Importar ' + n + ' como borrador';
        $('#rc-pub').textContent = D.pub === 'now' ? 'se lanza al importar' + (privateWork ? ' (la obra pasa a pública)' : '') : D.pub === 'at' ? (D.at ? 'programado: ' + fmtTz(fromLocal(D.at)) : 'programado · elige fecha y hora') + (D.prelaunch ? ' · con preestreno' : '') : 'borrador (nadie lo ve hasta publicarlo)';
        const at = $('#imp-at'); if (at) at.hidden = D.pub !== 'at';
        const ann = $('#imp-ann'); if (ann) ann.hidden = D.pub === 'draft';
        $('#imp-pub-note').textContent = D.pub === 'now' ? (privateWork ? (w ? 'La obra está privada: al lanzar, se publica este volumen y la obra pasa a pública.' : 'Se crea la obra, se publica este volumen y la obra queda pública.') + ' Antes completa el anuncio editorial.' : 'Se publica este volumen con los avisos habituales. Antes completa el anuncio editorial.')
          : D.pub === 'at' ? (D.prelaunch ? 'Hasta la fecha, la ficha muestra el preestreno y los capítulos siguen cerrados; al llegar, el volumen' + (privateWork ? ' y la obra se publican' : ' se publica') + ' solos.' : privateWork ? 'Sin preestreno, el volumen se publica en la fecha pero la obra sigue privada hasta que la publiques desde «Estado de publicación». Activa el preestreno para que salga sola.' : 'El volumen se publica solo en la fecha, sin anuncio previo en el calendario.')
          : 'Queda como borrador privado; podrás lanzarlo o programarlo después desde la obra.'; };
      pubLabel();
      $('#rc-back')?.addEventListener('click', e => { e.preventDefault(); D.toolsOpen = true; step = 2; render(); });
      $('#dcu').onchange = async e => { const f = e.target.files[0]; if (!f) return; if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type)) return toast('Usa una imagen JPG, PNG, WebP o AVIF');
        if (f.size > LIMITS.image) return toast('La imagen supera 8 MB');
        const k = 'portada-subida/' + f.name.replace(/[^\w.-]/g, '_'); P.images.set(k, { blob: f, type: f.type, name: f.name, custom: true }); P.urls.set(k, URL.createObjectURL(f));
        D.cover = 'img:' + k; if (!w?.cover_path) D.workCover = true; s3(); };
      if (ex) sb.from('chapters').select('id', { count: 'exact', head: true }).eq('volume_id', ex.id).is('deleted_at', null).then(({ count }) => { const e = $('#exc'); if (e && count != null) e.textContent = ' con ' + count + (count === 1 ? ' capítulo' : ' capítulos'); });
      $('#dw').onchange = e => { D.work = e.target.value; D.prelaunch = null; const nw = work(); D.vnum = importedVolumeNumber({ filename: file?.name, title: P.title, metadataIndex: P.meta.index, fallback: nextVol(nw) }); D.workCover = !nw || !nw.cover_path; s3(); };
      if (!w) bindWorkFields($('#imp-new-work'), NW, esc, related || [], msg => { if (msg) toast(msg); });
      $('#dv').onchange = e => { try { D.vnum = parseVolumeNumber(e.target.value); s3(); } catch (err) { toast(err.message); e.target.value = D.vnum; } };
      W().querySelectorAll('[name=dm]').forEach(r => r.onchange = () => { D.mode = r.value; s3(); });
      W().querySelectorAll('[name=di]').forEach(r => r.onchange = () => { D.allImgs = r.value === 'all'; const n = D.allImgs ? keys.length : used.size; $('#rc-media').textContent = n + (n === 1 ? ' imagen' : ' imágenes') + (P.fonts.length ? ' · ' + P.fonts.length + ' fuentes' : ''); });
      D.noticeGetter = bindEditorialForm(W());
      W().querySelector('[data-editorial-fields]')?.addEventListener('change',()=>{try{D.notice=D.noticeGetter()}catch{}});
      W().querySelectorAll('[name=dp]').forEach(r => r.onchange = () => { D.pub = r.value; pubLabel(); if (D.pub === 'at') $('#dat')?.focus(); });
      $('#dpre')?.addEventListener('change', e => { D.prelaunch = e.target.checked; pubLabel(); });
      $('#dat')?.addEventListener('input', e => { D.at = e.target.value; D.pub = 'at'; W().querySelector('[name=dp][value=at]').checked = true; pubLabel(); });
      $('#dwc').onchange = e => { D.workCover = e.target.checked; };
      W().querySelectorAll('[data-cov]').forEach(b => b.onclick = () => { D.cover = b.dataset.cov || null; s3(); });
      bindFicha();
      $('#back').onclick = () => { step = 2; render(); };
      $('#go').onclick = e => busy(e.currentTarget, commit);
    }

    const imgType = n => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' })[(n.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
    async function commit(){
      const uploaded = [], inserted = [], updatedRows = [], removedRows = [], inc = P.chapters.filter(c => !c.skip);
      let job = null, createdSeries = null, createdVol = null, restoredVol = null, volBefore = null, seriesCoverBefore;
      if (D.pub === 'at' && (!D.at || new Date(fromLocal(D.at)) <= new Date())) throw new Error('Elige una fecha futura para programar');
      const big = inc.find(c => oversize(c.blocks));
      if (big) throw new Error(`«${big.title}» es demasiado larga para una sola sección (${big.blocks.length} bloques). Usa «Dividir esta sección…» en «Ordenar secciones» o no la unas con la siguiente.`);
      // Validar ANTES de subir archivos; la importación jamás se revierte por una falla del anuncio.
      const notice = D.pub === 'draft' ? null : D.noticeGetter?.();
      if (D.pub !== 'draft' && !notice) throw new Error('Completa el anuncio editorial antes de publicar');
      const ficha = fichaRow();
      const keysToUpload = validateImportMedia({chapters:inc,images:P.images,cover:D.cover,
        allImages:D.allImgs,maxBytes:LIMITS.image});
      if(!inc.length)throw new Error('Selecciona al menos una sección para importar');
      const qualityPreflight=inspectImport(inc);
      if(qualityPreflight.total && !await confirmObi(`La revisión editorial detectó ${qualityPreflight.total} aviso(s) en ${qualityPreflight.withWarnings} sección(es), incluidas ${qualityPreflight.counts.alt} ilustraciones sin descripción. Se guardará el informe sin modificar el texto. ¿Continuar con esta importación?`)) return;
      let w = work(), vol = liveVols(w).find(v => v.num === D.vnum);
      if(vol && D.mode==='replace'){
        if(!can('edit'))throw new Error('Reemplazar un volumen requiere permiso para editar sus capítulos.');
        const {data:old,error}=await sb.from('chapters').select('id,num,vol,volume_id,deleted_at').eq('series_id',w.id);
        if(error)throw error;
        planVolumeReplacement(old,vol.id,D.vnum,inc.length);
      }
      const workMeta = !w ? workPayload(NW) : null;
      if (vol && D.mode === 'replace' && !await confirmObi(`Se reemplazará el Volumen ${D.vnum}: capítulos, ficha y portada. Los capítulos anteriores van a la papelera. ¿Continuar?`)) return;
      try {
        const {data:createdJob,error:jobError}=await sb.from('import_jobs').insert({
          team_id:T.team.id,created_by:getUser().id,filename:file.name,file_type:file.name.split('.').pop().toLowerCase(),
          mode:vol?D.mode:'append',status:'running',fingerprint:fp}).select().single();
        if(jobError||!createdJob?.id)throw jobError||new Error('No se pudo registrar el trabajo');
        job=createdJob;
        if (!w) {
          st('Creando la obra…'); const title = workMeta.title; let slug = slugify(title);
          const { data: taken } = await sb.from('series').select('id').eq('slug', slug).limit(1); if (taken?.length) slug += '-' + Date.now().toString(36).slice(-4);
          const r = await sb.from('series').insert({ ...workMeta, team_id: T.team.id, slug, published: false }).select().single();
          if (r.error) throw r.error; w = createdSeries = { ...r.data, volumes: [] };
        }
        // Multimedia › obras › {obra} › vol-N
        const dir = `${T.team.id}/obras/${w.slug}/vol-${D.vnum}/`;
        // La lista de la raíz no contiene las fuentes ya guardadas en fuentes/.
        // Nunca reutilizar rutas de otra importación: también protege el rollback.
        const nextPath = makeImportUploadPath(dir,job.id);
        const bucket = sb.storage.from('obi-media');
        const up = (sub, name, blob, type) => uploadImportAsset(bucket,nextPath,
          {subdir:sub,filename:name,blob,contentType:type},uploaded);
        const keys = keysToUpload;
        const map = {}; let n = 0;
        for (const key of keys) { const im = P.images.get(key); st(`Subiendo imágenes a Multimedia ${++n}/${keys.length}…`); map['img:' + key] = await up('', im.name, im.blob, im.type || imgType(im.name)); }
        const reuseFont = P.fonts.length ? createTeamFontStore({
          sb,bucket,teamId:T.team.id,publicPrefix:PUB
        }) : null;
        const fonts = []; let fontsReused = 0;
        for (const f of P.fonts) {
          st('Verificando fuentes ya almacenadas…');
          const {path,sha256,reused}=await reuseFont(f);
          if(reused)fontsReused++;
          fonts.push({url:PUB+path,family:f.family,style:f.style,weight:f.weight,
            sha256,...(f.use?{use:f.use}:{})});
        }
        const cov = D.cover ? map[D.cover] || null : null;
        st('Guardando el volumen…');
        if (!vol) {
          const { data: gone } = await sb.from('volumes').select('*').eq('series_id', w.id).eq('num', D.vnum).not('deleted_at', 'is', null).limit(1);
          if (gone?.length) { const r = await sb.from('volumes').update({ deleted_at: null }).eq('id', gone[0].id).select().single(); if (r.error) throw r.error; vol = r.data; restoredVol = vol.id; }
        }
        if (!vol) {
          const r = await sb.from('volumes').insert({ ...ficha, series_id: w.id, num: D.vnum, status: 'draft', epub_fonts: fonts, cover_path: cov }).select().single();
          if (r.error) throw r.error; vol = createdVol = r.data;
        }
        const {data:existing,error:exErr}=await sb.from('chapters')
          .select('id,num,vol,volume_id,deleted_at').eq('series_id',w.id);
        if(exErr)throw exErr;
        const replacing=D.mode==='replace'&&!createdVol&&!restoredVol;
        const plan=replacing?planVolumeReplacement(existing,vol.id,D.vnum,inc.length):null;
        const maxNum=Math.max(0,...(existing||[]).map(c=>+c.num||0));
        const rows=inc.map((c,i)=>{
          const body=smartTitleBlocks(c.blocks,{title:c.title,section_type:c.type},D.smartTitles).map(b=>b.type==='image'?{...b,url:map[b.url]?PUB+map[b.url]:b.url}:b);
          const report=lintImportedBlocks(body);
          return {series_id:w.id,volume_id:vol.id,vol:D.vnum,
            num:replacing?plan.update[i].num:maxNum+i+1,sort_order:i,
            title:(c.title||'Sin título').slice(0,300),section_type:c.type,status:'draft',
            body,lint:report.counts,lint_count:report.total};
        });
        if(replacing){
          const ids=[...plan.update,...plan.remove].map(x=>x.id);
          const {data:originals,error:backupError}=await sb.from('chapters')
            .select('id,num,vol,volume_id,title,section_type,status,sort_order,body,lint,lint_count,deleted_at').in('id',ids);
          if(backupError||originals?.length!==ids.length)
            throw backupError||new Error('No se pudo respaldar el contenido anterior');
          const originalById=new Map(originals.map(x=>[x.id,x]));
          for(let i=0;i<rows.length;i++){
            const old=originalById.get(plan.update[i].id);
            updatedRows.push(old);
            const {data:written,error}=await sb.from('chapters').update({
              title:rows[i].title,section_type:rows[i].section_type,
              body:rows[i].body,lint:rows[i].lint,lint_count:rows[i].lint_count,sort_order:i,status:'draft'
            }).eq('id',old.id).select('id');
            if(error||!written?.length)throw error||new Error('No se pudo reemplazar el capítulo '+old.num);
          }
          for(const item of plan.remove){
            const old=originalById.get(item.id);removedRows.push(old);
            const {data:written,error}=await sb.from('chapters').update({deleted_at:new Date().toISOString()}).eq('id',old.id).select('id');
            if(error||!written?.length)throw error||new Error('No se pudo archivar el capítulo '+old.num);
          }
        }else{
          for(let i=0;i<rows.length;i+=10){
            st(`Guardando capítulos ${Math.min(i+10,rows.length)}/${rows.length}…`);
            const batch=rows.slice(i,i+10),r=await sb.from('chapters').insert(batch).select('id');
            if(r.error)throw r.error;
            if(r.data?.length!==batch.length)throw new Error('No se guardaron todos los capítulos');
            inserted.push(...r.data.map(x=>x.id));
          }
        }
        if (!createdVol) {
          const { data: vr } = await sb.from('volumes').select('*').eq('id', vol.id).single();
          const patch = {}; if (fonts.length) patch.epub_fonts = fonts; if (cov) patch.cover_path = cov;
          const over = D.mode === 'replace' || !!restoredVol; for (const [k, v] of Object.entries(ficha)) if ((over || vr?.[k] == null || vr[k] === '' || vr[k] === false) && v !== false) patch[k] = v;
          if (Object.keys(patch).length) { volBefore = Object.fromEntries(Object.keys(patch).map(k => [k, vr?.[k] ?? null])); const r = await sb.from('volumes').update(patch).eq('id', vol.id); if (r.error) throw r.error; }
        }
        if (cov && D.workCover) { seriesCoverBefore = w.cover_path || null; const r = await sb.from('series').update({ cover_path: cov }).eq('id', w.id); if (r.error) throw r.error; }
        if (D.pub !== 'draft') { st(D.pub === 'now' ? 'Lanzando…' : 'Programando…');
          // Lanzar ahora: en una obra privada (o recién creada) se usa la transición editorial, que publica el volumen y la obra en una sola operación.
          // Programar: la misma RPC del Estudio; con preestreno, al llegar la fecha el volumen y la obra se publican solos.
          const privateSeries = !w.published;
          if (D.pub === 'now' && !can('publish')) throw new Error('Tu rol no permite publicar');
          if (D.pub === 'at' && !can('schedule')) throw new Error('Tu rol no permite programar');
          const r = D.pub === 'now'
            ? (privateSeries ? await sb.rpc('series_publication_transition', { p_series: w.id, p_mode: 'published', p_volume: vol.id }) : await sb.rpc('publish_volume', { p_volume: vol.id }))
            : await sb.rpc('schedule_prelaunch_volume', { p_volume: vol.id, p_at: new Date(fromLocal(D.at)).toISOString(), p_announce: !!D.prelaunch });
          if (r.error) throw r.error;
          try { await saveEditorialRecord(sb,w.id,notice,{kind:'volume',id:vol.id,startsAt:D.pub==='at' ? fromLocal(D.at) : new Date().toISOString()}); }
          catch (e) { toast('Volumen importado y publicado, pero el anuncio no se guardó: '+(e.message||e)); }
        }
        const {error:finishError}=await sb.from('import_jobs').update({status:'done',media_paths:uploaded,
          result:{series:w.id,volume:vol.id,chapters:rows.length,cover:cov,editorial_quality:{warnings:rows.reduce((a,c)=>a+c.lint_count,0),chapters_with_warnings:rows.filter(c=>c.lint_count>0).length,missing_alt:rows.reduce((a,c)=>a+c.lint.alt,0)},...(D.scanChapterTitles ? {title_scan:(()=>{const a=scanImportedChapterTitles(inc);return {numbered:a.numbered,special:a.special,typos:a.typo,unrecognized:a.unrecognized,findings:a.findings.map(f=>({index:f.index,number:f.number,label:f.label,typo:f.typo}))};})()} : {})}}).eq('id',job.id);
        // Un fallo del historial no puede deshacer capítulos que ya se publicaron.
        if(finishError)toast('Contenido guardado; no se pudo actualizar el historial de importación');
        P.urls.forEach(u => u && URL.revokeObjectURL(u));
        toast(`Importadas ${rows.length} secciones${D.pub === 'now' ? ' y lanzadas' : D.pub === 'at' ? ' · programadas para ' + fmtTz(fromLocal(D.at)) + (D.prelaunch ? ' con preestreno' : '') : ' como borrador'} · ${Object.keys(map).length} imágenes en Multimedia · ${fontsReused} de ${fonts.length} fuentes reutilizadas`);
        go('/estudio/obra/' + w.slug);
      } catch (er) {
        // Recuperar todas las filas modificadas. Reportar los fallos de rollback.
        const rollbackErrors=[];
        const undo=async fn=>{try{await fn()}catch(e){rollbackErrors.push(e?.message||String(e))}};
        if(inserted.length)await undo(async()=>{const r=await sb.from('chapters').delete().in('id',inserted);if(r.error)throw r.error});
        for(const old of [...updatedRows,...removedRows].reverse())
          await undo(async()=>{const {id,...prior}=old;const r=await sb.from('chapters').update(prior).eq('id',id);if(r.error)throw r.error});
        if(volBefore&&vol)await undo(async()=>{const r=await sb.from('volumes').update(volBefore).eq('id',vol.id);if(r.error)throw r.error});
        if(seriesCoverBefore!==undefined&&!createdSeries)await undo(async()=>{const r=await sb.from('series').update({cover_path:seriesCoverBefore}).eq('id',w.id);if(r.error)throw r.error});
        if(createdVol)await undo(async()=>{const r=await sb.from('volumes').delete().eq('id',createdVol.id);if(r.error)throw r.error});
        if(restoredVol)await undo(async()=>{const r=await sb.from('volumes').update({deleted_at:new Date().toISOString()}).eq('id',restoredVol);if(r.error)throw r.error});
        if(createdSeries)await undo(async()=>{const r=await sb.from('series').delete().eq('id',createdSeries.id);if(r.error)throw r.error});
        if(uploaded.length)await undo(async()=>{const r=await sb.storage.from('obi-media').remove(uploaded);if(r.error)throw r.error});
        if(job)await undo(async()=>{const r=await sb.from('import_jobs').update({status:'failed',
          result:{error:er.message,rollback_errors:rollbackErrors}}).eq('id',job.id);if(r.error)throw r.error});
        if(rollbackErrors.length)er.message+=' · Fallos al revertir: '+rollbackErrors.join(' / ');
        console.error('Importación fallida', er);
        const why = [er.message, er.details, er.hint, er.code && 'código ' + er.code].filter(Boolean).join(' · ');
        st(''); throw new Error('Se deshizo la importación: ' + why);
      }
    }
    render();
    void loadCatalogue().catch(() => {});
  }


  return importer;
}

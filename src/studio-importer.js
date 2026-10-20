// Importador de Studio: EPUB, DOCX y PDF, bajo demanda.
import { renderBlock } from './blocks.js?v=2';
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
    const chapters = [], spine = [...X.getElementsByTagNameNS('*', 'itemref')].map(r => items[r.getAttribute('idref')]).filter(it => it && isHtml(it));
    if (!spine.length) throw new Error('El EPUB no declara el orden de lectura (spine) o no tiene páginas de texto');
    for (const it of spine) {
      const raw = await text(it.href); if (raw == null) continue;
      const doc = parseMarkup(raw);
      const links = [...doc.querySelectorAll('link')].filter(l => /stylesheet/i.test(l.getAttribute('rel') || '') || /css/i.test(l.getAttribute('type') || '')).map(l => l.getAttribute('href')).filter(Boolean);
      const css = epubStyler(doc, await Promise.all(links.map(h => sheet(res(it.href, h)))), famIdx);
      const blocks = htmlToBlocks(doc.body || doc.documentElement, { resolve: s => { if (!s || /^(https?:|data:)/i.test(s)) return null; const p = res(it.href, s); return loose(p) ? 'img:' + p : null; } }, css);
      if (!blocks.length) continue;
      // ¿abre capítulo? solo si el índice lo nombra o trae su propio título. Las ilustraciones sueltas siguen generando su sección (como antes).
      const own = tocTitles[it.href] || blocks.find(b => b.type === 'heading')?.text, onlyImg = blocks.every(b => b.type === 'image' || b.type === 'separator');
      const prev = chapters[chapters.length - 1];
      if (!own && !onlyImg && prev && !prev.onlyImg) {
        // continuación: el corte de archivo era un cambio de escena → separador (sin duplicar)
        const hasSep = prev.blocks[prev.blocks.length - 1]?.type === 'separator' || blocks[0].type === 'separator';
        const brk = !hasSep && /page-break-before|break-before/i.test(raw) ? [{ type: 'separator' }] : [];
        prev.blocks.push(...brk, ...blocks); continue;
      }
      while (blocks[0]?.type === 'separator') blocks.shift();
      if (!blocks.length) continue;
      const t = own || doc.title?.trim() || `Sección ${chapters.length + 1}`;
      chapters.push({ onlyImg, title: t.slice(0, 200), type: /pr[oó]log/i.test(t) ? 'Prólogo' : /ep[ií]log/i.test(t) ? 'Epílogo' : /afterword|palabras del autor/i.test(t) ? 'Afterword' : /interlud/i.test(t) ? 'Interludio' : 'Capítulo', blocks });
    }
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
    const idx = +(metaN('calibre:series_index') || metaP('group-position') || (title.match(/(?:vol(?:umen|ume)?\.?|tomo)\s*(\d+)/i) || [])[1] || 0) || null;
    const OPF = 'http://www.idpf.org/2007/opf', people = [...X.getElementsByTagNameNS('*', 'creator'), ...X.getElementsByTagNameNS('*', 'contributor')];
    const roleOf = e => e.getAttributeNS(OPF, 'role') || e.getAttribute('opf:role') || (e.id && metas.find(m => m.getAttribute('refines') === '#' + e.id && m.getAttribute('property') === 'role')?.textContent.trim()) || '';
    const ill = people.find(e => /^ill/i.test(roleOf(e)))?.textContent.trim() || '', aut = people.find(e => /^aut/i.test(roleOf(e)))?.textContent.trim();
    const date = (md('date')[0] || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
    const meta = { illustrator: ill, date, author: aut || md('creator')[0] || '', publisher: md('publisher')[0] || '', synopsis, index: idx ? Math.round(idx) : null, series: metaN('calibre:series') || metaP('belongs-to-collection') || '' };
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
    globalThis.pdfjsWorker = await import('https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs');
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
    blocks.forEach(b => { if (b.type === 'heading' && (!cur || cur.blocks.length > 2)) { cur = { title: b.text.slice(0, 200), type: 'Capítulo', blocks: [b] }; out.push(cur); } else { if (!cur) { cur = { title: 'Sección 1', type: 'Capítulo', blocks: [] }; out.push(cur); } cur.blocks.push(b); } });
    return out;
  }

  // ---------- importador en 3 pasos: archivo → revisar → destino ----------
  const SKIP_RE = /^(copyright|derechos|cr[eé]ditos|colof[oó]n|[ií]ndice|contenidos?|contents|table of contents|tabla de contenidos?|newsletter|bolet[ií]n|sign up|title page|portadilla|cover|portada|about the (author|translator|illustrator)|acerca del autor|sobre el autor)\b/i;
  const words = bs => bs.reduce((a, b) => a + (b.text || '').split(/\s+/).filter(Boolean).length, 0);
  const slugify = s => (s || 'obra').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'obra';
  function suggestSkips(P){
    P.chapters.forEach((c, i) => {
      const w = words(c.blocks), imgs = c.blocks.filter(b => b.type === 'image').length; c.skip = false; c.why = '';
      if (SKIP_RE.test((c.title || '').trim())) { c.skip = true; c.why = 'página editorial'; }
      else if (i === 0 && imgs && w < 15) { c.skip = true; c.why = 'página de portada'; }
      else if (!imgs && w < 25) { c.skip = true; c.why = 'casi vacía'; }
    });
  }

  async function importer(){
    if (!(await ensure())) return;
    const TAB = '/estudio/importar';
    if (!can('import')) { app.innerHTML = shell('Importar', '<p>Tu rol no permite importar archivos.</p>', TAB); bindPicker(importer); return; }
    const { data: works } = await sb.from('series').select('id,slug,title,cover_path,volumes(id,num,title,cover_path,deleted_at)').eq('team_id', T.team.id).is('archived_at', null).order('title');
    let P = null, file = null, fp = null, step = 1, sel = 0, splitting = false, dupAt = null, V = {};
    const D = { work: '', vnum: 1, mode: 'append', cover: null, workCover: false, allImgs: true, pub: 'draft', at: '', newTitle: '', newAuthor: '' };
    app.innerHTML = shell('Importar contenido', '<ol class="imp-steps" id="steps"></ol><div id="wiz"></div><p id="status" class="mono" role="status"></p>', TAB);
    bindPicker(importer);
    const W = () => $('#wiz'), st = m => { const s = $('#status'); if (s) s.textContent = m || ''; };
    const src = k => k && k.startsWith('img:') ? P.urls.get(k.slice(4)) || '' : k;
    const work = () => (works || []).find(w => w.id === D.work);
    const liveVols = w => (w?.volumes || []).filter(v => !v.deleted_at);
    const nextVol = w => Math.max(0, ...liveVols(w).map(v => v.num)) + 1;
    const imgKeys = () => [...P.images.keys()].filter(k => P.images.get(k).blob && /^image\//.test(P.images.get(k).type));
    const usedImgs = () => { const s = new Set(P.chapters.filter(c => !c.skip).flatMap(c => c.blocks.filter(b => b.type === 'image' && b.url?.startsWith('img:')).map(b => b.url.slice(4)))); if (D.cover) s.add(D.cover.slice(4)); return s; };
    const render = () => { $('#steps').innerHTML = ['Archivo', 'Revisar', 'Destino'].map((l, i) => `<li class="${step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}"><span>${step > i + 1 ? '✓' : i + 1}</span>${l}</li>`).join(''); [null, s1, s2, s3][step](); };

    function s1(){
      W().innerHTML = `<label class="imp-drop" id="drop"><b>Arrastra aquí un EPUB, DOCX o PDF</b><span class="mono">o toca para elegirlo · máx. 80 MB</span><input type="file" id="file" accept=".epub,.docx,.pdf" hidden></label>
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
          document.head.appendChild(stl); P.fontVars = fl.map((_, i) => `--f${i}:'imp-${i}',inherit`).join(';') + ';'; const rb = P.fonts.find(f => f.use?.includes('body')), rh = P.fonts.find(f => f.use?.includes('heading')); if (rb) P.fontVars += `--fb:'imp-${fl.indexOf(rb.family)}',Literata,serif;`; if (rh) P.fontVars += `--fh:'imp-${fl.indexOf(rh.family)}',Literata,serif;`; }
        P.urls = new Map([...P.images].map(([k, v]) => [k, v.blob ? URL.createObjectURL(v.blob) : '']));
        suggestSkips(P);
        const key = (P.meta.series || P.title).toLowerCase();
        const guess = (works || []).find(w => w.title && key.includes(w.title.toLowerCase().slice(0, 18)));
        D.work = guess?.id || ''; D.newTitle = P.meta.series || P.title.replace(/\s*[,:\-–]?\s*(vol(umen|ume)?\.?|tomo)\s*\d+.*$/i, '').trim() || P.title; D.newAuthor = P.meta.author || '';
        D.vnum = P.meta.index || nextVol(guess); D.cover = P.cover || null; D.workCover = !guess || !guess.cover_path; D.mode = 'replace';
        V = { title: '', subtitle: '', synopsis: P.meta.synopsis || '', synopsis_spoiler: false, publisher: P.meta.publisher || '', imprint: '', illustrator: P.meta.illustrator || '', jp_release: P.meta.date || '', planned_chapters: '', is_final: false, translator_notes: '' };
        sel = Math.max(0, P.chapters.findIndex(c => !c.skip)); splitting = false;
        st(''); step = 2; render();
      } catch (er) { st('No se pudo leer: ' + er.message); }
    }

    function fichaHTML(nInc){
      const w = work(), ex = liveVols(w).find(v => v.num === D.vnum), f = (k, l, attrs = '') => `<label>${l}<input data-v="${k}" value="${esc(V[k] ?? '')}" ${attrs}></label>`;
      return `<details class="imp-box imp-ficha" ${ex ? '' : 'open'}><summary><b>Ficha del volumen</b><span class="mono">Destino previsto: ${esc(w?.title || D.newTitle || P.title)} · Vol. ${D.vnum} · ${ex ? 'ya existe: estos datos solo completan sus campos vacíos' : 'nuevo: se creará con esta ficha'}</span></summary>
        <div class="imp-fg">
          ${f('title', 'Título del volumen', 'maxlength="200" placeholder="Volumen ' + D.vnum + '"')}${f('subtitle', 'Subtítulo', 'maxlength="200"')}
          <label class="wide">Sinopsis<textarea data-v="synopsis" rows="4" maxlength="3000">${esc(V.synopsis)}</textarea></label>
          <label class="tb-inl wide"><input type="checkbox" data-v="synopsis_spoiler" ${V.synopsis_spoiler ? 'checked' : ''}> La sinopsis contiene spoilers del volumen anterior</label>
          ${f('jp_release', 'Salida en Japón', 'type="date"')}
          ${f('publisher', 'Editorial', 'maxlength="120"')}${f('imprint', 'Sello', 'maxlength="120" placeholder="p. ej. MF Bunko J"')}
          ${f('illustrator', 'Ilustración', 'maxlength="120"')}${f('planned_chapters', 'Capítulos previstos', 'type="number" min="0" max="999" placeholder="' + nInc + '"')}
          <label class="wide">Notas del traductor<textarea data-v="translator_notes" rows="2" maxlength="2000" placeholder="Se muestran en la ficha del volumen">${esc(V.translator_notes)}</textarea></label>
          <label class="tb-inl wide"><input type="checkbox" data-v="is_final" ${V.is_final ? 'checked' : ''}> Es el último volumen de la obra (al publicarlo, la traducción queda como completa)</label>
        </div><p class="mono">Puedes cambiar la obra y el número de volumen en el paso siguiente. Los datos marcados del EPUB ya vienen llenos.</p></details>`;
    }
    function bindFicha(){ W().querySelectorAll('[data-v]').forEach(i => i[i.type === 'checkbox' ? 'onchange' : 'oninput'] = () => { V[i.dataset.v] = i.type === 'checkbox' ? i.checked : i.value; }); }
    const fichaRow = () => {
      const o = {}; for (const k of ['title', 'subtitle', 'synopsis', 'publisher', 'imprint', 'illustrator', 'translator_notes']) { const v = String(V[k] || '').trim(); if (v) o[k] = v; }
      if (V.jp_release) o.jp_release = V.jp_release; if (V.planned_chapters !== '' && V.planned_chapters != null) o.planned_chapters = Math.max(0, +V.planned_chapters || 0);
      if (V.synopsis_spoiler) o.synopsis_spoiler = true; if (V.is_final) o.is_final = true; return o;
    };
    function s2(){
      const ch = P.chapters, inc = ch.filter(c => !c.skip), m = P.meta, cur = ch[sel];
      W().innerHTML = `<div class="imp-sum"><span><b>${esc(P.title)}</b><small class="mono">${esc(file.name)} · ${inc.length} de ${ch.length} secciones · ${P.images.size} imágenes · ${P.fonts.length} fuentes</small></span>
          ${[['Autor', m.author], ['Editorial', m.publisher], ['Volumen', m.index]].filter(x => x[1]).map(([k, v]) => `<span><small class="mono">${k}</small>${esc(String(v))}</span>`).join('')}</div>
        ${fichaHTML(inc.length)}
        ${dupAt ? `<p class="imp-warn">Ya importaste este mismo archivo el ${fmtTz(dupAt, { dateStyle: 'long' })}. Puedes continuar; en el destino elige «Reemplazar» si quieres sustituirlo.</p>` : ''}
        <div class="imp-grid">
          <div class="imp-list"><div class="imp-lh"><b>Secciones</b><span class="mono">Desmarca las que no quieras importar</span></div>
            <ol>${ch.map((c, i) => { const ni = c.blocks.filter(b => b.type === 'image').length; return `<li class="${i === sel ? 'on' : ''}${c.skip ? ' off' : ''}" data-sel="${i}">
              <input type="checkbox" data-inc="${i}" ${c.skip ? '' : 'checked'} aria-label="Importar ${esc(c.title)}">
              <span class="imp-t"><input data-t="${i}" value="${esc(c.title)}" aria-label="Título de la sección ${i + 1}"><small class="mono">${i + 1} · ${words(c.blocks).toLocaleString('es-MX')} palabras${ni ? ' · ' + ni + ' img.' : ''}${c.skip && c.why ? ' · <b>' + c.why + '</b>' : ''}</small></span>
              <select data-k="${i}" aria-label="Tipo">${SEC.map(s => `<option ${s === c.type ? 'selected' : ''}>${s}</option>`).join('')}</select>
              <span class="imp-a"><button class="ed-btn" data-mv="${i}" data-d="-1" title="Subir" ${i ? '' : 'disabled'}>↑</button><button class="ed-btn" data-mv="${i}" data-d="1" title="Bajar" ${i < ch.length - 1 ? '' : 'disabled'}>↓</button><button class="ed-btn" data-merge="${i}" title="Unir con la siguiente" ${i < ch.length - 1 ? '' : 'disabled'}>Unir ↓</button></span></li>`; }).join('')}</ol></div>
          <div class="imp-pvw"><div class="imp-lh"><b>Vista previa · ${sel + 1} de ${ch.length}</b><button class="ed-btn ${splitting ? 'on' : ''}" id="split">${splitting ? 'Toca el párrafo donde empieza la nueva sección · Cancelar' : 'Dividir esta sección…'}</button></div>
            <div class="imp-pv${splitting ? ' splitting' : ''}" id="pv"><div class="rd" data-theme="oscuro" data-width="normal" data-lh="comodo" data-align="izquierda" data-font="original" style="${P.fontVars || ''}--rs:17px"><article class="rd-ch"><header class="rd-head"><span class="mono">${esc(cur.type)}</span><h2 ${headFont(cur.blocks)}>${esc(cur.title)}</h2></header><div class="rd-body">${cur.blocks.map((b, i) => renderBlock(b, i, { media: src })).join('')}</div></article></div></div></div>
        </div>
        <div class="imp-nav"><button class="btn ghost" id="back">‹ Elegir otro archivo</button><button class="btn" id="next" ${inc.length ? '' : 'disabled'}>Continuar al destino ›</button></div>`;
      bindFicha();
      const L = W().querySelector('.imp-list');
      L.querySelectorAll('[data-t]').forEach(i => i.oninput = () => { ch[+i.dataset.t].title = i.value; if (+i.dataset.t === sel) $('#pv h2').textContent = i.value; });
      L.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { ch[+s.dataset.k].type = s.value; if (+s.dataset.k === sel) $('#pv .rd-head .mono').textContent = s.value; });
      L.querySelectorAll('[data-inc]').forEach(c => c.onchange = () => { ch[+c.dataset.inc].skip = !c.checked; s2(); });
      L.onclick = e => {
        const b = e.target.closest('[data-mv],[data-merge]');
        if (b) { const i = +(b.dataset.mv ?? b.dataset.merge);
          if (b.dataset.mv != null) { const j = i + +b.dataset.d; [ch[i], ch[j]] = [ch[j], ch[i]]; sel = j; }
          else { ch[i].blocks.push(...ch[i + 1].blocks); ch[i].skip = ch[i].skip && ch[i + 1].skip; ch.splice(i + 1, 1); sel = i; }
          splitting = false; return s2(); }
        const li = e.target.closest('[data-sel]'); if (li && !e.target.closest('input,select,button')) { sel = +li.dataset.sel; splitting = false; s2(); }
      };
      $('#split').onclick = () => { splitting = !splitting; s2(); };
      $('#pv').onclick = e => {
        if (!splitting) return; const b = e.target.closest('[data-b]'); if (!b) return; const at = +b.dataset.b;
        if (at < 1) return toast('Elige un párrafo después del primero');
        const rest = cur.blocks.splice(at);
        ch.splice(sel + 1, 0, { title: (rest.find(x => x.type === 'heading')?.text || cur.title + ' (cont.)').slice(0, 200), type: cur.type, blocks: rest, skip: false });
        splitting = false; sel++; s2(); toast('Sección dividida');
      };
      $('#back').onclick = () => { P.urls.forEach(u => u && URL.revokeObjectURL(u)); P = null; step = 1; st(''); render(); };
      $('#next').onclick = () => { step = 3; render(); };
    }

    function s3(){
      const w = work(), ex = liveVols(w).find(v => v.num === D.vnum), gone = !ex && (w?.volumes || []).find(v => v.deleted_at && v.num === D.vnum), keys = imgKeys(), used = usedImgs(), inc = P.chapters.filter(c => !c.skip);
      const folder = `obras › ${w?.slug || slugify(D.newTitle || P.title)} › vol-${D.vnum}`;
      W().innerHTML = `<div class="imp-dest">
        <section class="imp-box"><h3>Obra y volumen</h3>
          <label>Obra<select id="dw"><option value="">+ Nueva obra</option>${(works || []).map(x => `<option value="${x.id}" ${x.id === D.work ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
          ${w ? '' : `<label>Título de la obra<input id="dt" value="${esc(D.newTitle)}" maxlength="200"></label><label>Autor<input id="da" value="${esc(D.newAuthor)}" maxlength="120"></label>`}
          <label>Número de volumen<input id="dv" type="number" min="1" max="999" value="${D.vnum}"></label>
          ${ex ? `<div class="imp-warn"><span>El Volumen ${D.vnum} ya existe<span id="exc"></span>.</span>
            <label class="tb-inl"><input type="radio" name="dm" value="replace" ${D.mode === 'replace' ? 'checked' : ''}> Reemplazar el volumen: capítulos, ficha y portada nuevos (los capítulos anteriores van a la papelera)</label>
            <label class="tb-inl"><input type="radio" name="dm" value="append" ${D.mode === 'append' ? 'checked' : ''}> Agregar estas secciones después de las existentes (la ficha solo completa campos vacíos)</label></div>`
            : gone ? `<p class="imp-warn">Hay un Volumen ${D.vnum} en la papelera. Se recupera y se llena con este archivo; sus capítulos viejos siguen en la papelera.</p>` : `<p class="mono">Se creará el Volumen ${D.vnum}${w ? ' en ' + esc(w.title) : ''}${Object.keys(fichaRow()).length ? ', con la ficha del paso anterior' : ''}.</p>`}
        </section>
        <section class="imp-box"><h3>Portada del volumen</h3>
          <p class="mono">${keys.length ? 'Toca la imagen que será la portada.' + (P.cover ? ' Marcamos la que el EPUB declara como portada.' : '') : 'El archivo no trae imágenes.'}</p>
          <div class="imp-covs" role="radiogroup" aria-label="Portada del volumen">
            <button type="button" class="imp-c none${D.cover ? '' : ' on'}" data-cov="" role="radio" aria-checked="${!D.cover}">Sin portada</button>
            ${keys.map(k => `<button type="button" class="imp-c${D.cover === 'img:' + k ? ' on' : ''}" data-cov="img:${esc(k)}" role="radio" aria-checked="${D.cover === 'img:' + k}" title="${esc(k.split('/').pop())}"><img src="${esc(P.urls.get(k))}" alt="${esc(k.split('/').pop())}" loading="lazy">${P.cover === 'img:' + k ? '<em>Del EPUB</em>' : ''}</button>`).join('')}
          </div>
          ${ex?.cover_path && D.cover ? '<p class="mono">El volumen ya tiene portada: esta la reemplaza.</p>' : ''}
          <label class="tb-inl"><input type="checkbox" id="dwc" ${D.workCover && D.cover ? 'checked' : ''} ${D.cover ? '' : 'disabled'}> Usarla también como portada de la obra${w?.cover_path ? ' (reemplaza la actual)' : ''}</label>
        </section>
        <section class="imp-box"><h3>Imágenes en Multimedia</h3>
          <p class="mono">Carpeta: <b>Multimedia › ${esc(folder)}</b></p>
          <label class="tb-inl"><input type="radio" name="di" value="all" ${D.allImgs ? 'checked' : ''}> Todas las imágenes del archivo (${keys.length})</label>
          <label class="tb-inl"><input type="radio" name="di" value="used" ${D.allImgs ? '' : 'checked'}> Solo las del texto y la portada (${used.size})</label>
          ${P.fonts.length ? `<p class="mono">Las ${P.fonts.length} fuentes del EPUB van a la subcarpeta «fuentes» y el lector las usa en este volumen.</p>` : ''}
        </section>
        <section class="imp-box"><h3>Publicación</h3>
          <label class="tb-inl"><input type="radio" name="dp" value="draft" ${D.pub === 'draft' ? 'checked' : ''}> Guardar como borrador</label>
          ${can('publish') ? `<label class="tb-inl"><input type="radio" name="dp" value="now" ${D.pub === 'now' ? 'checked' : ''}> Publicar el volumen ahora</label>` : ''}
          ${can('schedule') ? `<label class="tb-inl"><input type="radio" name="dp" value="at" ${D.pub === 'at' ? 'checked' : ''}> Programar <input type="datetime-local" id="dat" value="${esc(D.at)}" aria-label="Fecha de publicación">${tzHint()}</label>` : ''}
        </section></div>
        <div class="imp-nav"><button class="btn ghost" id="back">‹ Revisar secciones</button><button class="btn" id="go">Importar ${inc.length} ${inc.length === 1 ? 'sección' : 'secciones'}</button></div>`;
      if (ex) sb.from('chapters').select('id', { count: 'exact', head: true }).eq('volume_id', ex.id).is('deleted_at', null).then(({ count }) => { const e = $('#exc'); if (e && count != null) e.textContent = ' con ' + count + (count === 1 ? ' capítulo' : ' capítulos'); });
      $('#dw').onchange = e => { D.work = e.target.value; const nw = work(); D.vnum = P.meta.index || nextVol(nw); D.workCover = !nw || !nw.cover_path; s3(); };
      $('#dt')?.addEventListener('input', e => { D.newTitle = e.target.value; }); $('#dt')?.addEventListener('change', s3);
      $('#da')?.addEventListener('input', e => { D.newAuthor = e.target.value; });
      $('#dv').onchange = e => { D.vnum = Math.max(1, Math.min(999, Math.round(+e.target.value) || 1)); s3(); };
      W().querySelectorAll('[name=dm]').forEach(r => r.onchange = () => { D.mode = r.value; });
      W().querySelectorAll('[name=di]').forEach(r => r.onchange = () => { D.allImgs = r.value === 'all'; });
      W().querySelectorAll('[name=dp]').forEach(r => r.onchange = () => { D.pub = r.value; });
      $('#dat')?.addEventListener('input', e => { D.at = e.target.value; D.pub = 'at'; W().querySelector('[name=dp][value=at]').checked = true; });
      $('#dwc').onchange = e => { D.workCover = e.target.checked; };
      W().querySelectorAll('[data-cov]').forEach(b => b.onclick = () => { D.cover = b.dataset.cov || null; s3(); });
      $('#back').onclick = () => { step = 2; render(); };
      $('#go').onclick = e => busy(e.currentTarget, commit);
    }

    const imgType = n => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' })[(n.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
    async function commit(){
      const uploaded = [], inserted = [], inc = P.chapters.filter(c => !c.skip);
      let job = null, createdSeries = null, createdVol = null, restoredVol = null, oldIds = [], oldGone = false, volBefore = null, seriesCoverBefore;
      if (D.pub === 'at' && (!D.at || new Date(fromLocal(D.at)) <= new Date())) throw new Error('Elige una fecha futura para programar');
      const ficha = fichaRow();
      let w = work(), vol = liveVols(w).find(v => v.num === D.vnum);
      if (vol && D.mode === 'replace' && !confirm(`Se reemplazará el Volumen ${D.vnum}: capítulos, ficha y portada. Los capítulos anteriores van a la papelera. ¿Continuar?`)) return;
      try {
        ({ data: job } = await sb.from('import_jobs').insert({ team_id: T.team.id, created_by: getUser().id, filename: file.name, file_type: file.name.split('.').pop().toLowerCase(), mode: vol ? D.mode : 'append', status: 'running', fingerprint: fp }).select().single());
        if (!w) {
          st('Creando la obra…'); const title = (D.newTitle || P.title).trim().slice(0, 200); let slug = slugify(title);
          const { data: taken } = await sb.from('series').select('id').eq('slug', slug).limit(1); if (taken?.length) slug += '-' + Date.now().toString(36).slice(-4);
          const r = await sb.from('series').insert({ team_id: T.team.id, slug, title, short: title.slice(0, 26), author: D.newAuthor.trim() || null, publisher: P.meta.publisher || null, synopsis: P.meta.synopsis || null, published: false }).select().single();
          if (r.error) throw r.error; w = createdSeries = { ...r.data, volumes: [] };
        }
        // Multimedia › obras › {obra} › vol-N
        const dir = `${T.team.id}/obras/${w.slug}/vol-${D.vnum}/`;
        const { data: have } = await sb.storage.from('obi-media').list(dir.slice(0, -1), { limit: 1000 });
        const takenNames = new Set((have || []).map(x => x.name));
        const fname = n => { const b = n.replace(/[^\w.-]/g, '_'); let x = b, i = 2; while (takenNames.has(x)) x = b.replace(/(\.\w+)?$/, m => '-' + (i++) + m); takenNames.add(x); return x; };
        const up = async (sub, name, blob, type) => { const p = dir + sub + fname(name); const { error } = await sb.storage.from('obi-media').upload(p, blob, { contentType: type }); if (error) throw error; uploaded.push(p); return p; };
        const keys = D.allImgs ? imgKeys() : [...usedImgs()].filter(k => P.images.get(k)?.blob);
        const map = {}; let n = 0;
        for (const key of keys) { const im = P.images.get(key); st(`Subiendo imágenes a Multimedia ${++n}/${keys.length}…`); if (im.blob.size > LIMITS.image) { toast(`${im.name} supera 8 MB y se omitió`); continue; } map['img:' + key] = await up('', im.name, im.blob, im.type || imgType(im.name)); }
        const fonts = []; for (const f of P.fonts) { st('Subiendo fuentes…'); const p = await up('fuentes/', f.name, new Blob([f.bytes]), /woff2/.test(f.name) ? 'font/woff2' : /woff/.test(f.name) ? 'font/woff' : /otf/.test(f.name) ? 'font/otf' : 'font/ttf'); fonts.push({ url: PUB + p, family: f.family, style: f.style, weight: f.weight, ...(f.use ? { use: f.use } : {}) }); }
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
        const { data: existing, error: exErr } = await sb.from('chapters').select('id,num,vol,volume_id,deleted_at').eq('series_id', w.id); if (exErr) throw exErr;
        if (D.mode === 'replace' && !createdVol) oldIds = (existing || []).filter(c => !c.deleted_at && (c.volume_id === vol.id || c.vol === D.vnum)).map(c => c.id);
        let num = Math.max(0, ...(existing || []).map(c => +c.num || 0));
        const rows = inc.map((c, i) => ({ series_id: w.id, volume_id: vol.id, vol: D.vnum, num: ++num, sort_order: i, title: (c.title || 'Sin título').slice(0, 300), section_type: c.type, status: 'draft',
          body: c.blocks.map(b => b.type === 'image' ? { ...b, url: map[b.url] ? PUB + map[b.url] : b.url } : b).filter(b => b.type !== 'image' || /^https?:/.test(b.url)) }));
        for (let i = 0; i < rows.length; i += 10) { st(`Guardando capítulos ${Math.min(i + 10, rows.length)}/${rows.length}…`); const r = await sb.from('chapters').insert(rows.slice(i, i + 10)).select('id'); if (r.error) throw r.error; inserted.push(...r.data.map(x => x.id)); }
        if (oldIds.length) { const r = await sb.from('chapters').update({ deleted_at: new Date().toISOString() }).in('id', oldIds); if (r.error) throw r.error; oldGone = true; }
        if (!createdVol) {
          const { data: vr } = await sb.from('volumes').select('*').eq('id', vol.id).single();
          const patch = {}; if (fonts.length) patch.epub_fonts = fonts; if (cov) patch.cover_path = cov;
          const over = D.mode === 'replace' || !!restoredVol; for (const [k, v] of Object.entries(ficha)) if ((over || vr?.[k] == null || vr[k] === '' || vr[k] === false) && v !== false) patch[k] = v;
          if (Object.keys(patch).length) { volBefore = Object.fromEntries(Object.keys(patch).map(k => [k, vr?.[k] ?? null])); const r = await sb.from('volumes').update(patch).eq('id', vol.id); if (r.error) throw r.error; }
        }
        if (cov && D.workCover) { seriesCoverBefore = w.cover_path || null; const r = await sb.from('series').update({ cover_path: cov }).eq('id', w.id); if (r.error) throw r.error; }
        if (D.pub !== 'draft') { st(D.pub === 'now' ? 'Publicando…' : 'Programando…'); const r = await sb.rpc('publish_volume', D.pub === 'now' ? { p_volume: vol.id } : { p_volume: vol.id, p_at: fromLocal(D.at) }); if (r.error) throw r.error; }
        await sb.from('import_jobs').update({ status: 'done', media_paths: uploaded, result: { series: w.id, volume: vol.id, chapters: inserted.length, cover: cov } }).eq('id', job.id);
        P.urls.forEach(u => u && URL.revokeObjectURL(u));
        toast(`Importadas ${inserted.length} secciones${D.pub === 'now' ? ' y publicadas' : D.pub === 'at' ? ' · programadas para ' + fmtTz(fromLocal(D.at)) : ' como borrador'} · ${Object.keys(map).length} imágenes en Multimedia`);
        go('/estudio/obra/' + w.slug);
      } catch (er) {
        if (inserted.length) await sb.from('chapters').delete().in('id', inserted);
        if (oldGone) await sb.from('chapters').update({ deleted_at: null }).in('id', oldIds);
        if (volBefore && vol) await sb.from('volumes').update(volBefore).eq('id', vol.id);
        if (seriesCoverBefore !== undefined && !createdSeries) await sb.from('series').update({ cover_path: seriesCoverBefore }).eq('id', w.id);
        if (createdVol) await sb.from('volumes').delete().eq('id', createdVol.id);
        if (restoredVol) await sb.from('volumes').update({ deleted_at: new Date().toISOString() }).eq('id', restoredVol);
        if (createdSeries) await sb.from('series').delete().eq('id', createdSeries.id);
        if (uploaded.length) await sb.storage.from('obi-media').remove(uploaded);
        if (job) await sb.from('import_jobs').update({ status: 'failed', result: { error: er.message } }).eq('id', job.id);
        console.error('Importación fallida', er);
        const why = [er.message, er.details, er.hint, er.code && 'código ' + er.code].filter(Boolean).join(' · ');
        st(''); throw new Error('Se deshizo la importación: ' + why);
      }
    }
    render();
  }


  return importer;
}

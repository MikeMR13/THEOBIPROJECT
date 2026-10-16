// Bloques compartidos por el lector y el editor del Estudio: limpieza, fuentes por fragmento, render y conversión editor ⇄ bloques.
export const ALLOWED = new Set(['B','STRONG','I','EM','U','S','SPAN','RUBY','RT','RP','BR','SUP','SUB','SMALL']);
export const FONTS = [['carta','Klee One · cartas'],['mensaje','Plex Mono · mensajes'],['titulo','Shippori Mincho · títulos'],['sans','Plex Sans · notas']];
const FF = new Set(FONTS.map(f => f[0]));
export const CW = ['Violencia','Sangre','Muerte','Autolesión','Abuso','Acoso','Contenido sexual','Lenguaje fuerte','Drogas / alcohol','Horror','Discriminación','Spoiler de otra obra'];
export const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// mode 'render' → para mostrar (data-ff → clase, data-epub-family → var); mode 'store' → para guardar (conserva solo data-ff / data-epub-family)
export function cleanInline(html, mode = 'render'){
  const t = document.createElement('template'); t.innerHTML = html || '';
  const walk = n => { [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) return;
    if (c.nodeType !== 1) { c.remove(); return; }
    if (mode === 'store' && c.tagName === 'SPAN' && !c.dataset.ff && c.dataset.epubFamily == null) {
      const st = c.getAttribute('style') || '', wrap = [];
      if (/font-weight:\s*(bold|[6-9]00)/i.test(st)) wrap.push('b');
      if (/font-style:\s*italic/i.test(st)) wrap.push('i');
      if (wrap.length) { let inner = document.createDocumentFragment(); inner.append(...c.childNodes); for (const w of wrap) { const e = document.createElement(w); e.append(inner); inner = e; } c.replaceWith(inner); walk(inner); return; }
    }
    if (!ALLOWED.has(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); return; }
    const fam = c.getAttribute('data-epub-family'), ff = c.getAttribute('data-ff');
    [...c.attributes].forEach(a => c.removeAttribute(a.name));
    if (c.tagName === 'SPAN') {
      if (fam != null && /^\d+$/.test(fam)) mode === 'store' ? c.setAttribute('data-epub-family', fam) : c.setAttribute('style', `font-family:var(--f${fam})`);
      if (ff && FF.has(ff)) mode === 'store' ? c.setAttribute('data-ff', ff) : c.setAttribute('class', 'ff-' + ff);
      if (mode === 'store' && !c.attributes.length) { walk(c); c.replaceWith(...c.childNodes); return; }
    }
    walk(c);
  }); };
  walk(t.content);
  return t.innerHTML.replace(/&nbsp;/g, ' ').replace(/(<br>\s*)+$/, '').trim();
}

const rich = b => b.html ? cleanInline(b.html) : escHtml(b.text || '');
export function renderBlock(b, i, o = {}){
  const t = b.type || b.t, media = o.media || (x => x);
  if (t === 'paragraph' || t === 'p') return `<p data-b="${i}">${rich(b)}</p>`;
  if (t === 'heading' || t === 'h') return `<h3 data-b="${i}">${rich(b)}</h3>`;
  if (t === 'quote') return `<blockquote data-b="${i}">${rich(b)}</blockquote>`;
  if (t === 'separator' || t === 'sep') return `<div class="sep" data-b="${i}" aria-hidden="true">※</div>`;
  if (t === 'note') return `<aside class="tn" data-b="${i}"><span class="mono">Nota del traductor</span>${rich(b)}</aside>`;
  if (t === 'ruby') return `<p data-b="${i}"><ruby>${escHtml(b.text || '')}<rt>${escHtml(b.reading || '')}</rt></ruby></p>`;
  if (t === 'image' || t === 'img') { if (o.illus === false) return `<p class="mono" data-b="${i}">[Ilustración oculta]</p>`; const src = b.url || b.src; return src ? `<figure data-b="${i}"><img src="${escHtml(media(src))}" alt="${escHtml(b.alt || b.text || '')}" loading="lazy">${b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : ''}</figure>` : ''; }
  return b.text ? `<p data-b="${i}">${escHtml(b.text)}</p>` : '';
}

export function warningsHTML(list, mode = 'show'){
  if (!list?.length || mode === 'hide') return '';
  const items = list.map(escHtml).join(' · ');
  return mode === 'icon'
    ? `<p class="rd-cw icon" title="Aviso de contenido: ${items}"><span aria-hidden="true">⚠</span><span class="sr">Aviso de contenido: ${items}</span></p>`
    : `<details class="rd-cw"><summary><b>⚠ Aviso de contenido</b> <span class="mono">${list.length} ${list.length === 1 ? 'tema' : 'temas'} · toca para ver</span></summary><p>${items}</p></details>`;
}
export function teaserHTML(text, when){
  return text ? `<aside class="rd-teaser"><span class="mono">Próximamente${when ? ' · ' + escHtml(when) : ''}</span><p>${escHtml(text)}</p></aside>` : '';
}

// ---------- editor de página continua ----------
export function blocksToEditor(blocks, media = x => x){
  return (blocks || []).map(b => {
    const t = b.type || b.t, inner = b.html ? cleanInline(b.html, 'store') : escHtml(b.text || '');
    if (t === 'heading' || t === 'h') return `<h3>${inner}</h3>`;
    if (t === 'quote') return `<blockquote>${inner}</blockquote>`;
    if (t === 'note') return `<aside class="tn">${inner}</aside>`;
    if (t === 'separator' || t === 'sep') return '<div class="sep" contenteditable="false">※</div>';
    if (t === 'ruby') return `<p><ruby>${escHtml(b.text || '')}<rt>${escHtml(b.reading || '')}</rt></ruby></p>`;
    if (t === 'image' || t === 'img') return figureHTML(b.url || b.src, b.alt, b.caption, media);
    return `<p>${inner}</p>`;
  }).join('') || '<p><br></p>';
}
export const figureHTML = (url, alt, caption, media = x => x) => `<figure contenteditable="false" data-url="${escHtml(url || '')}" data-alt="${escHtml(alt || '')}" data-caption="${escHtml(caption || '')}"><img src="${escHtml(media(url))}" alt="${escHtml(alt || '')}"><figcaption>${caption ? escHtml(caption) : '<i>Sin pie · toca para editar</i>'}</figcaption></figure>`;

export function editorToBlocks(root){
  const out = [], BLOCK = /^(P|H[1-6]|BLOCKQUOTE|ASIDE|FIGURE|DIV|HR|UL|OL|LI|SECTION)$/;
  const text = el => { const html = cleanInline(el.innerHTML, 'store'), tx = el.textContent.replace(/\u00a0/g, ' ').trim(); return { html, text: tx }; };
  const add = (type, el) => { const v = text(el); if (!v.text) return; out.push(v.html === escHtml(v.text) ? { type, text: v.text } : { type, ...v }); };
  let loose = null;
  const flush = () => { if (loose) { add('paragraph', loose); loose = null; } };
  for (const el of [...root.childNodes]) {
    if (el.nodeType === 3 || (el.nodeType === 1 && !BLOCK.test(el.tagName))) { if (el.nodeType === 1 && el.tagName === 'BR' && !loose) continue; (loose ||= document.createElement('p')).append(el.cloneNode(true)); continue; }
    flush(); if (el.nodeType !== 1) continue;
    const tg = el.tagName;
    if (tg === 'FIGURE') { if (el.dataset.url) out.push({ type: 'image', url: el.dataset.url, alt: el.dataset.alt || '', caption: el.dataset.caption || '' }); continue; }
    if (el.classList.contains('sep') || tg === 'HR') { out.push({ type: 'separator' }); continue; }
    if (/^(UL|OL|SECTION)$/.test(tg)) { out.push(...editorToBlocks(el)); continue; }
    add(/^H[1-6]$/.test(tg) ? 'heading' : tg === 'BLOCKQUOTE' ? 'quote' : tg === 'ASIDE' ? 'note' : 'paragraph', el);
  }
  flush();
  return out;
}
// ¿este nodo del editor produce un bloque? (para ubicar el párrafo N de un comentario)
export const makesBlock = el => el.nodeType === 1 && (el.tagName === 'FIGURE' ? !!el.dataset.url : el.classList.contains('sep') || el.tagName === 'HR' || !!el.textContent.trim());

// pegar desde Word / Docs / web → HTML del editor
export function pasteToEditor(html, plain){
  if (!html) return (plain || '').split(/\r?\n\s*\r?\n|\r?\n/).map(s => s.trim()).filter(Boolean).map(s => `<p>${escHtml(s)}</p>`).join('');
  const d = new DOMParser().parseFromString(html, 'text/html'), out = [];
  const push = (tag, el) => { const inner = cleanInline(el.innerHTML, 'store'); if (el.textContent.trim()) out.push(`<${tag}>${inner}</${tag}>`); };
  const walk = n => [...n.children].forEach(el => {
    const tg = el.tagName;
    if (/^H[1-6]$/.test(tg)) push('h3', el);
    else if (tg === 'P' || tg === 'LI') push('p', el);
    else if (tg === 'BLOCKQUOTE') push('blockquote', el);
    else if (tg === 'HR') out.push('<div class="sep" contenteditable="false">※</div>');
    else if (/^(DIV|SECTION|ARTICLE|UL|OL|BODY|MAIN|TABLE|TBODY|TR|TD)$/.test(tg) && el.children.length) walk(el);
    else if (el.textContent.trim() && !/^(STYLE|SCRIPT|META|TITLE)$/.test(tg)) push('p', el);
  });
  walk(d.body);
  return out.length ? out.join('') : null;
}

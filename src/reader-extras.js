// Extras del lector que se cargan solo al usarlos (no pesan en la apertura del capítulo):
// visor de ilustraciones a pantalla completa con galería del volumen (estilo BOOK☆WALKER)
// y tarjeta de cita como imagen para compartir (estilo Wattpad / Kindle).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- visor de ilustraciones ----------
// items: [{ src, alt, caption, num, block, label }] · index: la que se abre · onGo(item): ir al capítulo de la ilustración
export function openViewer({ items, index = 0, onGo, from }){
  if (!items?.length) return;
  document.querySelector('.iv')?.remove();
  let i = Math.max(0, Math.min(items.length - 1, index)), zoom = false;
  const d = document.createElement('div');
  d.className = 'iv'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Ilustraciones del volumen');
  d.innerHTML = `<div class="iv-top"><span class="iv-n" aria-live="polite"></span><span class="iv-acts"><button type="button" class="iv-go"></button><button type="button" class="iv-x" aria-label="Cerrar visor">Cerrar</button></span></div>
    <div class="iv-stage" tabindex="-1"><img alt="" decoding="async"></div>
    <button type="button" class="iv-nav p" aria-label="Ilustración anterior">‹</button><button type="button" class="iv-nav n" aria-label="Ilustración siguiente">›</button>
    <p class="iv-cap"></p>
    <div class="iv-strip" role="listbox" aria-label="Todas las ilustraciones">${items.map((it, k) => `<button type="button" role="option" data-k="${k}" aria-label="Ilustración ${k + 1}${it.label ? ' · ' + esc(it.label) : ''}"><img src="${esc(it.src)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`;
  document.body.appendChild(d); document.body.classList.add('iv-open');
  const img = d.querySelector('.iv-stage img'), stage = d.querySelector('.iv-stage');
  const show = k => {
    i = (k + items.length) % items.length; zoom = false; stage.classList.remove('z');
    const it = items[i]; img.src = it.src; img.alt = it.alt || it.caption || 'Ilustración';
    d.querySelector('.iv-n').textContent = `${i + 1} de ${items.length}${it.label ? ' · ' + it.label : ''}`;
    d.querySelector('.iv-cap').textContent = it.caption || ''; d.querySelector('.iv-cap').hidden = !it.caption;
    const go = d.querySelector('.iv-go'); go.hidden = !onGo || it.num == null || it.here; go.textContent = it.num != null ? 'Ir a ' + (it.label || 'su capítulo') : '';
    d.querySelectorAll('.iv-strip [data-k]').forEach(b => { const on = +b.dataset.k === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    d.querySelectorAll('.iv-nav').forEach(b => { b.hidden = items.length < 2; });
  };
  const close = () => { d.remove(); document.body.classList.remove('iv-open'); removeEventListener('keydown', key, true); from?.focus?.({ preventScroll: true }); };
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); show(i + (e.key === 'ArrowRight' ? 1 : -1)); }
    else if (e.key === 'Tab') { const f = [...d.querySelectorAll('button:not([hidden])')]; const a = f.indexOf(document.activeElement); if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  };
  addEventListener('keydown', key, true);
  // toque: acercar / alejar en el punto tocado; arrastre lateral: cambiar de ilustración
  stage.onclick = e => {
    if (e.target !== img) return close();
    zoom = !zoom; stage.classList.toggle('z', zoom);
    if (zoom) { const r = img.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height; requestAnimationFrame(() => { stage.scrollLeft = fx * stage.scrollWidth - stage.clientWidth / 2; stage.scrollTop = fy * stage.scrollHeight - stage.clientHeight / 2; }); }
  };
  let sx = null, sy = 0;
  stage.addEventListener('touchstart', e => { if (zoom || e.touches.length > 1) { sx = null; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => { if (sx == null) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(i + (dx < 0 ? 1 : -1)); }, { passive: true });
  d.querySelector('.p').onclick = () => show(i - 1); d.querySelector('.n').onclick = () => show(i + 1);
  d.querySelector('.iv-x').onclick = close;
  d.querySelector('.iv-go').onclick = () => { const it = items[i]; close(); onGo?.(it); };
  d.querySelector('.iv-strip').onclick = e => { const b = e.target.closest('[data-k]'); if (b) show(+b.dataset.k); };
  show(i); d.querySelector('.iv-x').focus({ preventScroll: true });
  return { close, update(list){ const cur = items[i]?.src; items = list; d.querySelector('.iv-strip').innerHTML = items.map((it, k) => `<button type="button" role="option" data-k="${k}" aria-label="Ilustración ${k + 1}${it.label ? ' · ' + esc(it.label) : ''}"><img src="${esc(it.src)}" alt="" loading="lazy" decoding="async"></button>`).join(''); const k = items.findIndex(x => x.src === cur); show(k < 0 ? 0 : k); } };
}

// ---------- tarjeta de cita ----------
// Todo se dibuja en un canvas del navegador (sin servidor). Opciones:
//  Imagen  · fondo (color / portada / ilustración), diseño (obi / imagen completa / dividido / marco), encuadre, oscurecer, desenfocar
//  Texto   · recortar la cita (solo recortar: no se puede cambiar lo que dice la obra), tipografía, tamaño, alineación, comillas, «dicho por»
//  Colores · 7 paletas, incluidas la de la temporada y la del equipo
//  Formato · 4:5, 1:1, 9:16, 16:9 y qué datos mostrar (obra, volumen y capítulo, equipo, tu usuario). El sitio siempre aparece.
const BASE = { noche: { bg: '#0d0c0a', fg: '#ece2c9', mute: '#a89f8a', ac: '#f2c230', veil: [13, 12, 10] } };
const PAL = {
  noche: ['Noche', BASE.noche],
  papel: ['Papel', { bg: '#f1e5cb', fg: '#2b2214', mute: '#6e5d42', ac: '#9a6a12', veil: [241, 229, 203] }],
  puerto: ['Puerto', { bg: ['#2b3a55', '#0f1626'], fg: '#f3ead6', mute: '#b9c2d6', ac: '#f2c230', veil: [15, 22, 38] }],
  sakura: ['Sakura', { bg: ['#f8e1e6', '#ecbcc8'], fg: '#3a1f27', mute: '#7a4b58', ac: '#c2456b', veil: [248, 225, 230] }],
  bosque: ['Bosque', { bg: ['#1f3a2e', '#0e1d17'], fg: '#eef0e2', mute: '#a9bfae', ac: '#d9c26a', veil: [14, 29, 23] }],
  tinta: ['Tinta', { bg: '#ffffff', fg: '#111111', mute: '#555555', ac: '#111111', veil: [255, 255, 255] }],
  temporada: ['Temporada', null],
  equipo: ['Equipo', null]
};
const SIZES = { post: [1080, 1350, 'Publicación 4:5'], square: [1080, 1080, 'Cuadrado 1:1'], story: [1080, 1920, 'Historia 9:16'], wide: [1600, 900, 'Horizontal 16:9'] };
const FONTS = { mincho: ['Mincho', '500', '"Shippori Mincho B1", Literata, serif'], literata: ['Literata', '400', 'Literata, Georgia, serif'], mano: ['Manuscrita', '600', '"Klee One", "Shippori Mincho B1", cursive'], sans: ['Sans', '400', '"IBM Plex Sans", system-ui, sans-serif'] };
const QUOTES = { ja: ['「', '」', '「 」'], la: ['«', '»', '« »'], en: ['“', '”', '“ ”'], none: ['', '', 'Sin comillas'] };
const SCALE = { auto: 1, l: 1.15, m: .82, s: .64 };
// Largo recomendado para que la cita se lea bien en redes. Es solo una sugerencia: la tarjeta acepta cualquier largo
// y reduce la letra para que quepa (QUOTE_MIN_PX). Únicamente si ni así cabe en el formato elegido, el último renglón termina en «…».
export const QUOTE_TIP = 280;
const QUOTE_MIN_PX = 16;
const DEF = { bg: 'color', layout: 'obi', focus: .3, dim: 28, blur: 0, font: 'mincho', size: 'auto', align: 'left', quotes: 'ja', style: 'noche', fmt: 'post', showTitle: true, showSub: true, showTeam: true, showUser: false };

function palette(o, st){
  const ac = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : null;
  if (st.style === 'temporada') return { ...BASE.noche, ac: ac(o.season) || BASE.noche.ac };
  if (st.style === 'equipo') return { ...BASE.noche, ac: ac(o.teamColor) || BASE.noche.ac };
  return (PAL[st.style] || PAL.noche)[1];
}
function wrapLines(x, text, maxW){
  const words = text.split(/\s+/), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const bitmaps = new Map();
// imágenes vía fetch CORS + createImageBitmap (como las miniaturas del Estudio); SVG con <img> sobre URL blob
export function loadBitmap(src){
  const viaImg = b => new Promise((ok, no) => { const u = URL.createObjectURL(b), i = new Image(); i.onload = () => ok(i); i.onerror = () => { URL.revokeObjectURL(u); no(new Error('imagen no válida')); }; i.src = u; });
  if (!bitmaps.has(src)) bitmaps.set(src, fetch(src, { mode: 'cors', credentials: 'omit' }).then(r => { if (!r.ok) throw new Error('imagen ' + r.status); return r.blob(); }).then(b => createImageBitmap(b).catch(() => viaImg(b))).catch(e => { bitmaps.delete(src); throw e; }));
  return bitmaps.get(src);
}
function drawCover(x, img, dx, dy, dw, dh, fy = .5){
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(dw / iw, dh / ih), sw = dw / s, sh = dh / s;
  const sx = (iw - sw) / 2, sy = Math.max(0, Math.min(ih - sh, (ih - sh) * fy));
  x.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
const fillBg = (x, S, X, Y, w, h) => { if (Array.isArray(S.bg)) { const g = x.createLinearGradient(X, Y, X + w * .4, Y + h); g.addColorStop(0, S.bg[0]); g.addColorStop(1, S.bg[1]); x.fillStyle = g; } else x.fillStyle = S.bg; x.fillRect(X, Y, w, h); };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
// conserva los saltos entre párrafos (una cita puede abarcar varios) y limpia los espacios de cada uno
const paras = s => String(s || '').split(/\n+/).map(clean).filter(Boolean).join('\n');

// o: { quote, title, sub, team, user, site, season, teamColor } · st: opciones · image: ImageBitmap | <img> | null
export async function quoteCard(o, st, image){
  st = { ...DEF, ...st };
  const q = paras(st.text || o.quote);
  const S = palette(o, st), [W, H] = SIZES[st.fmt] || SIZES.post, k = Math.min(W, H) / 1080, P = Math.round(86 * k * (W > H ? 1.3 : 1));
  const F = FONTS[st.font] || FONTS.mincho, [qo, qc] = QUOTES[st.quotes] || QUOTES.ja;
  try { await Promise.all([document.fonts?.load?.(`${F[1]} 48px ${F[2]}`), document.fonts?.load?.('600 30px "IBM Plex Sans"'), document.fonts?.load?.('700 30px "IBM Plex Sans"')]); } catch {}
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const img = image && st.bg !== 'color' ? image : null, land = W >= H, lay = img ? st.layout : 'color';
  // líneas del pie
  const foot = [st.showSub && o.sub, st.showTeam && o.team && 'Traducción: ' + o.team, st.showUser && o.user && 'Compartido por @' + o.user].filter(Boolean).map(clean);
  const footFor = w => { x.font = `700 ${Math.round(34 * k)}px "IBM Plex Sans", sans-serif`; const tl = st.showTitle ? wrapLines(x, o.title || '', w).slice(0, 2) : []; return { tl, h: tl.length * 42 * k + foot.length * 38 * k + 120 * k }; };
  // ajusta el tamaño de la cita al alto disponible
  const fit = (w, h) => {
    // hasta el largo recomendado la letra no baja de 26 px; con más texto puede bajar hasta QUOTE_MIN_PX
    const big = (land ? 54 : W / H < .6 ? 66 : 58) * k * (SCALE[st.size] || 1), min = (q.length > QUOTE_TIP ? QUOTE_MIN_PX : 26) * k, who = clean(st.who);
    const height = (ls, lh, size) => ls.length * lh + ls.filter(l => l.gap).length * lh * .45 + (who ? size * 1.3 : 0);
    for (let size = big; ; size -= 2 * k) {
      x.font = `${F[1]} ${Math.round(size)}px ${F[2]}`;
      const lh = size * (st.font === 'sans' ? 1.38 : 1.45), ps = q.split('\n'), lines = [];
      // cada párrafo se ajusta por separado; entre párrafos hay medio renglón de aire
      ps.forEach((t2, i) => wrapLines(x, (i === 0 ? qo : '') + t2 + (i === ps.length - 1 ? qc : ''), w).forEach((l, j) => lines.push({ t: l, gap: i > 0 && j === 0 })));
      let th = height(lines, lh, size), cut = false;
      if (th > h && size - 2 * k < min) {
        // ni con la letra mínima cabe en este formato: se quitan renglones del final para no pisar el pie
        while (lines.length > 1 && height(lines, lh, size) > h) lines.pop();
        const last = lines[lines.length - 1]; last.t = last.t.replace(/[\s,;:.…」»”]*$/, '') + '…' + qc; th = height(lines, lh, size); cut = true;
      }
      if (th <= h || cut || size - 2 * k < min) return { size: Math.round(size), lines, lh, h: th, who, cut };
    }
  };
  let panel, anchor = 'top';
  if (lay === 'full') {
    x.save(); if (st.blur) { x.filter = `blur(${st.blur * k}px)`; drawCover(x, img, -st.blur * 2, -st.blur * 2, W + st.blur * 4, H + st.blur * 4, st.focus); } else drawCover(x, img, 0, 0, W, H, st.focus); x.restore();
    x.fillStyle = rgba(S.veil, st.dim / 100); x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, H * .25, 0, H); g.addColorStop(0, rgba(S.veil, 0)); g.addColorStop(.5, rgba(S.veil, .8)); g.addColorStop(1, rgba(S.veil, .95)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    panel = { x: P, y: H * .22, w: W - 2 * P, h: H * .78 - P * .7 }; anchor = 'bottom';
  } else if (lay === 'obi') {
    const ff = footFor(W - 2 * P), Q = fit(W - 2 * P, H * (land ? .34 : .3));
    const band = Math.min(H * (land ? .7 : .64), Math.max(H * (land ? .5 : .38), Q.h + ff.h + 170 * k)), by = H - band;
    drawCover(x, img, 0, 0, W, by + 20, st.focus);
    fillBg(x, S, 0, by, W, band); x.fillStyle = S.ac; x.fillRect(0, by, W, 12 * k); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, by + 12 * k, W, 4 * k);
    panel = { x: P, y: by + 60 * k, w: W - 2 * P, h: band - 60 * k - P * .6 };
  } else if (lay === 'split') {
    fillBg(x, S, 0, 0, W, H);
    if (land) { const iw = Math.round(W * .44); drawCover(x, img, 0, 0, iw, H, st.focus); x.fillStyle = S.ac; x.fillRect(iw, 0, 8 * k, H); panel = { x: iw + P * .8, y: P, w: W - iw - P * 1.8, h: H - 2 * P }; }
    else { const ih = Math.round(H * .47); drawCover(x, img, 0, 0, W, ih, st.focus); x.fillStyle = S.ac; x.fillRect(0, ih, W, 8 * k); panel = { x: P, y: ih + 56 * k, w: W - 2 * P, h: H - ih - 56 * k - P * .7 }; }
  } else if (lay === 'frame') {
    // «marco»: la imagen como un libro sobre la mesa, con sombra
    fillBg(x, S, 0, 0, W, H);
    const iw0 = img.naturalWidth || img.width, ih0 = img.naturalHeight || img.height, ar = Math.min(1.5, Math.max(.6, iw0 / ih0));
    let bw, bh, bx, by;
    if (land) { bh = H - 2 * P; bw = bh * ar; if (bw > W * .42) { bw = W * .42; bh = bw / ar; } bx = P; by = (H - bh) / 2; panel = { x: bx + bw + P * .8, y: P, w: W - bx - bw - P * 1.8, h: H - 2 * P }; }
    else { bh = H * (W / H < .6 ? .42 : .4); bw = bh * ar; if (bw > W - 2 * P) { bw = W - 2 * P; bh = bw / ar; } bx = (W - bw) / 2; by = P * .9; panel = { x: P, y: by + bh + 70 * k, w: W - 2 * P, h: H - by - bh - 70 * k - P * .7 }; }
    x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 40 * k; x.shadowOffsetY = 18 * k; x.fillStyle = '#000'; x.fillRect(bx, by, bw, bh); x.restore();
    drawCover(x, img, bx, by, bw, bh, st.focus); x.strokeStyle = S.ac; x.lineWidth = 6 * k; x.strokeRect(bx - 3 * k, by - 3 * k, bw + 6 * k, bh + 6 * k);
  } else {
    fillBg(x, S, 0, 0, W, H); x.fillStyle = S.ac; x.fillRect(0, 0, W, 14 * k);
    panel = { x: P, y: P + 60 * k, w: W - 2 * P, h: H - 2 * P - 60 * k }; anchor = 'middle';
  }
  // texto: raya de acento, cita, «dicho por», pie y sitio
  const ff = footFor(panel.w), Q = fit(panel.w, Math.max(80 * k, panel.h - ff.h - 70 * k)), center = st.align === 'center';
  const tx = center ? panel.x + panel.w / 2 : panel.x; x.textAlign = center ? 'center' : 'left';
  const block = 26 * k + Q.h, free = panel.h - ff.h - block;
  let y = panel.y + (anchor === 'bottom' ? Math.max(0, free - 30 * k) : anchor === 'middle' ? Math.max(0, free / 2 - 20 * k) : 0);
  x.fillStyle = S.ac; x.fillRect(center ? tx - 28 * k : tx, y, 56 * k, 5 * k); y += 26 * k;
  x.fillStyle = S.fg; x.font = `${F[1]} ${Q.size}px ${F[2]}`;
  Q.lines.forEach(l => { if (l.gap) y += Q.lh * .45; x.fillText(l.t, tx, y + Q.size); y += Q.lh; });
  if (Q.who) { x.fillStyle = S.mute; x.font = `italic ${F[1]} ${Math.round(Q.size * .72)}px ${F[2]}`; x.fillText('— ' + Q.who, tx, y + Q.size * 1.05); }
  let fy = panel.y + panel.h - ff.h + 34 * k;
  x.fillStyle = S.fg; x.font = `700 ${Math.round(34 * k)}px "IBM Plex Sans", sans-serif`; ff.tl.forEach(l => { x.fillText(l, tx, fy); fy += 42 * k; });
  x.fillStyle = S.mute; x.font = `400 ${Math.round(28 * k)}px "IBM Plex Sans", sans-serif`;
  foot.forEach(l => { x.fillText(wrapLines(x, l, panel.w)[0] || '', tx, fy + 4 * k); fy += 38 * k; });
  x.fillStyle = S.fg; x.font = `600 ${Math.round(28 * k)}px "IBM Plex Sans", sans-serif`; x.fillText('帯  ' + (o.site || 'elobidellector.com'), tx, panel.y + panel.h);
  const png = await new Promise((r, j) => { try { c.toBlob(r, 'image/png'); } catch (e) { j(e); } });
  if (png) png.cut = !!Q.cut;   // el panel avisa si la cita no cupo completa en este formato
  return png;
}

// Panel para personalizar y compartir. host: la hoja del glosario del lector.
// o = { quote, title, sub, team, teamColor, season, user: () => Promise<string|null>, site, text(q), toast, cover: { src, label } | null, images: () => Promise<[{ src, label }]> }
const QC_KEY = 'obi-quote-card', KEEP = Object.keys(DEF);
export function quoteSheet(host, o){
  let pref = {}; try { pref = JSON.parse(localStorage.getItem(QC_KEY)) || {}; } catch {}
  const st = { ...DEF, ...Object.fromEntries(Object.entries(pref).filter(([k2]) => KEEP.includes(k2))), text: paras(o.quote), who: '', pick: null };
  if (st.bg === 'cover' && !o.cover) st.bg = 'color'; if (st.bg === 'ilus') st.bg = 'color';
  if (st.style === 'equipo' && !o.teamColor) st.style = 'noche';
  let tab = 'img', url = null, blob = null, imgs = null, seq = 0, uname = null, tT = 0; const bad = new Set();
  const save = () => { try { localStorage.setItem(QC_KEY, JSON.stringify(Object.fromEntries(KEEP.map(k2 => [k2, k2 === 'bg' && st.bg === 'ilus' ? 'color' : st[k2]])))); } catch {} };
  const src = () => st.bg === 'cover' ? o.cover?.src : st.bg === 'ilus' && imgs && st.pick != null ? imgs[st.pick]?.src : null;
  const seg = (name, label, opts, cur) => `<div class="qc-row"><span class="mono">${label}</span><div class="qc-seg" role="group" aria-label="${label}">${opts.map(([v, l, dis]) => `<button type="button" class="btn ghost${String(cur) === String(v) ? ' on' : ''}" data-k="${name}" data-v="${v}" aria-pressed="${String(cur) === String(v)}"${dis ? ' disabled' : ''}>${l}</button>`).join('')}</div></div>`;
  const chk = (name, label, dis) => `<label class="rd-scope qc-chk"><input type="checkbox" data-c="${name}" ${st[name] ? 'checked' : ''}${dis ? ' disabled' : ''}> ${label}</label>`;
  const TABS = [['img', 'Imagen'], ['txt', 'Texto'], ['col', 'Colores'], ['fmt', 'Formato']];
  const controls = () => {
    const hasImg = st.bg !== 'color';
    let h = `<div class="qc-tabs" role="tablist">${TABS.map(([t, l]) => `<button type="button" role="tab" class="${tab === t ? 'on' : ''}" aria-selected="${tab === t}" data-tab="${t}">${l}</button>`).join('')}</div><div class="qc-pane" role="tabpanel">`;
    if (tab === 'img') {
      h += seg('bg', 'Fondo', [['color', 'Color'], ['cover', 'Portada', !o.cover], ['ilus', 'Ilustración']], st.bg);
      if (src() && bad.has(src())) h += '<p class="gl-n qc-bad" role="status">No se pudo usar esa imagen: la tarjeta queda con fondo de color. Prueba otra.</p>';
      if (st.bg === 'ilus') h += `<div class="qc-pick" role="listbox" aria-label="Elige una ilustración">${imgs == null ? '<span class="gl-n">Buscando ilustraciones del volumen…</span>' : imgs.length ? imgs.map((m, i) => `<button type="button" role="option" data-pick="${i}" class="${st.pick === i ? 'on' : ''}" aria-selected="${st.pick === i}" aria-label="${esc(m.label || 'Ilustración ' + (i + 1))}" title="${esc(m.label || '')}"><img src="${esc(m.src)}" alt="" loading="lazy" decoding="async"></button>`).join('') : '<span class="gl-n">Este volumen no tiene ilustraciones.</span>'}</div>`;
      if (hasImg) {
        h += seg('layout', 'Diseño', [['obi', 'Obi'], ['full', 'Imagen completa'], ['split', 'Dividido'], ['frame', 'Marco']], st.layout)
          + seg('focus', 'Encuadre', [[0, 'Arriba'], [.3, 'Centro alto'], [.5, 'Centro'], [.75, 'Centro bajo'], [1, 'Abajo']], st.focus);
        if (st.layout === 'full') h += `<div class="qc-row"><span class="mono">Oscurecer imagen · <b data-dim-l>${st.dim} %</b></span><input type="range" min="0" max="80" step="5" value="${st.dim}" data-r="dim" aria-label="Oscurecer imagen"></div>` + seg('blur', 'Desenfoque', [[0, 'Nítida'], [6, 'Suave'], [16, 'Fuerte']], st.blur);
      } else h += '<p class="gl-n">Elige portada o ilustración para ver los diseños con imagen: Obi, imagen completa, dividido y marco.</p>';
    } else if (tab === 'txt') {
      h += `<div class="qc-row"><span class="mono">Cita · solo puedes recortarla</span><textarea data-t="text" rows="${Math.min(8, 2 + st.text.split('\n').length)}" aria-describedby="qc-tx-n">${esc(st.text)}</textarea><span class="gl-n" id="qc-tx-n" aria-live="polite"></span></div>`
        + seg('font', 'Tipografía', Object.entries(FONTS).map(([v, f]) => [v, `<span style="font-family:${f[2].replace(/"/g, "'")}">${f[0]}</span>`]), st.font)
        + seg('size', 'Tamaño', [['auto', 'Automático'], ['l', 'Grande'], ['m', 'Mediano'], ['s', 'Pequeño']], st.size)
        + seg('align', 'Alineación', [['left', 'Izquierda'], ['center', 'Centrada']], st.align)
        + seg('quotes', 'Comillas', Object.entries(QUOTES).map(([v, q2]) => [v, q2[2]]), st.quotes)
        + `<div class="qc-row"><span class="mono">Dicho por (opcional)</span><input data-t="who" maxlength="40" placeholder="Ej.: Ren, a Aiko" value="${esc(st.who)}"></div>`;
    } else if (tab === 'col') {
      h += `<div class="qc-row"><span class="mono">Paleta</span><div class="qc-sw">${Object.entries(PAL).map(([v, [l, P2]]) => { const S2 = palette(o, { style: v }), bg = Array.isArray(S2.bg) ? `linear-gradient(135deg,${S2.bg[0]},${S2.bg[1]})` : S2.bg, dis = v === 'equipo' && !o.teamColor;
        return `<button type="button" class="${st.style === v ? 'on' : ''}" data-k="style" data-v="${v}" aria-pressed="${st.style === v}"${dis ? ' disabled title="El equipo no tiene color propio"' : ''}><i style="background:${bg};color:${S2.fg};border-color:${S2.ac}">Aa<b style="background:${S2.ac}"></b></i>${l}</button>`; }).join('')}</div></div>`
        + (st.bg !== 'color' ? '<p class="gl-n">Con imagen, la paleta colorea la banda, el velo y el texto.</p>' : '');
    } else {
      h += seg('fmt', 'Formato', Object.entries(SIZES).map(([v, s2]) => [v, s2[2]]), st.fmt)
        + `<div class="qc-row"><span class="mono">Mostrar</span>${chk('showTitle', 'Título de la obra')}${chk('showSub', 'Volumen y capítulo')}${o.team ? chk('showTeam', 'Equipo de traducción (' + esc(o.team) + ')') : ''}${chk('showUser', uname ? 'Mi usuario (@' + esc(uname) + ')' : 'Mi usuario (entra con tu cuenta)', !uname)}</div>`
        + '<p class="gl-n">La dirección de El Obi siempre aparece en la tarjeta.</p>';
    }
    return h + '</div>';
  };
  host.innerHTML = `<div class="gl-card qc-card" role="dialog" aria-modal="true" aria-labelledby="qc-t"><div class="gl-top"><div><span class="mono">Compartir cita</span><strong id="qc-t">Tarjeta para redes</strong></div><button class="gl-x" aria-label="Cerrar">×</button></div>
    <div class="qc-body"><div class="qc-prev"><img alt="Vista previa de la tarjeta con la cita"><span class="qc-busy" hidden>Preparando…</span></div><div class="qc-ctl"></div></div>
    <div class="qc-acts"><button type="button" class="btn" data-qa="share">Compartir imagen</button><button type="button" class="btn ghost" data-qa="save">Descargar</button><button type="button" class="btn ghost" data-qa="copy">Copiar imagen</button><button type="button" class="btn ghost" data-qa="text">Copiar texto</button><button type="button" class="lnk" data-qa="reset">Restablecer</button></div>
    ${paras(o.quote).length > QUOTE_TIP ? `<span class="gl-n">Recomendación: hasta ${QUOTE_TIP} caracteres se lee mejor en redes. Si quieres, recórtala en Texto.</span>` : ''}</div>`;
  host.hidden = false;
  const card = host.querySelector('.qc-card'), ctl = host.querySelector('.qc-ctl'), img = host.querySelector('.qc-prev img'), busy = host.querySelector('.qc-busy');
  const paint = () => { const sc = ctl.scrollTop; ctl.innerHTML = controls(); ctl.scrollTop = sc; img.closest('.qc-prev').dataset.fmt = st.fmt; counter(); };
  const counter = () => { const n = ctl.querySelector('#qc-tx-n'); if (n) n.textContent = `${st.text.length} caracteres · recomendado: hasta ${QUOTE_TIP}`
    + (blob?.cut ? ' · no cabe completa en este formato: prueba Historia 9:16, tamaño Pequeño o recórtala' : st.text.length > QUOTE_TIP ? ' · la letra se hará más pequeña para que quepa' : ''); };
  const draw = async () => {
    const my = ++seq, s = src(); busy.hidden = false;
    let image = null;
    if (s && !bad.has(s)) { try { image = await loadBitmap(s); } catch { if (my !== seq) return; bad.add(s); paint(); } }
    if (my !== seq) return;
    const data = { ...o, user: uname };
    try { blob = await quoteCard(data, st, image); } catch { blob = null; }
    if (!blob && image) { bad.add(s); paint(); try { blob = await quoteCard(data, st, null); } catch {} }   // imagen sin CORS: canvas «sucio»
    if (my !== seq) return; busy.hidden = true; counter();
    if (!blob) return;
    if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); img.src = url;
  };
  const loadImgs = async () => { if (imgs) return; try { imgs = (await o.images?.()) || []; } catch { imgs = []; } if (st.bg === 'ilus') { if (imgs.length && st.pick == null) st.pick = 0; paint(); draw(); } };
  paint(); draw();
  Promise.resolve(o.user?.()).then(u => { if (!u) return; uname = u; if (tab === 'fmt') paint(); if (st.showUser) draw(); }).catch(() => {});
  card.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled || !card.contains(b)) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab; return paint(); }
    if (d.qa) return act(d.qa);
    if (d.pick != null) st.pick = +d.pick;
    else if (d.k) { const v = d.v, num = ['focus', 'blur'].includes(d.k); st[d.k] = num ? +v : v; if (d.k === 'bg' && v === 'ilus') { if (imgs?.length && st.pick == null) st.pick = 0; loadImgs(); } }
    else return;
    save(); paint(); draw();
  });
  // escribir y deslizar no redibujan los controles (perderían el foco): solo la tarjeta
  card.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.r === 'dim') { st.dim = +t.value; ctl.querySelector('[data-dim-l]').textContent = st.dim + ' %'; save(); }
    else if (t.dataset.t === 'who') st.who = t.value;
    else if (t.dataset.t === 'text') {
      // solo recortar: lo escrito tiene que estar dentro de la cita original (no se puede atribuir a la obra algo que no dice)
      const v = clean(t.value), n = ctl.querySelector('#qc-tx-n');
      if (!v || !clean(o.quote).toLowerCase().includes(v.toLowerCase())) { t.setAttribute('aria-invalid', 'true'); if (n) n.textContent = 'Solo puedes recortar la cita, no cambiar lo que dice. Se usa la última versión válida.'; return; }
      t.removeAttribute('aria-invalid'); st.text = paras(t.value); counter();
    } else return;
    clearTimeout(tT); tT = setTimeout(draw, 250);
  });
  card.addEventListener('change', e => { const c2 = e.target.dataset.c; if (c2) { st[c2] = e.target.checked; save(); draw(); } });
  async function act(a){
    if (a === 'reset') { Object.assign(st, DEF, { text: paras(o.quote), who: '', pick: null }); try { localStorage.removeItem(QC_KEY); } catch {} paint(); return draw(); }
    if (a === 'text') { try { await navigator.clipboard.writeText(o.text(st.text)); o.toast?.('Cita copiada'); } catch { o.toast?.('No se pudo copiar'); } return; }
    if (!blob) return;
    if (a === 'copy') { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); o.toast?.('Imagen copiada: pégala donde quieras'); } catch { o.toast?.('Tu navegador no copia imágenes; usa Descargar'); } return; }
    const file = new File([blob], 'cita-el-obi.png', { type: 'image/png' });
    if (a === 'share') { try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: o.text(st.text) }); return; } } catch (er) { if (er?.name === 'AbortError') return; } o.toast?.('Tu navegador no comparte imágenes: se descargó para que la subas'); }
    const l = document.createElement('a'); l.href = url; l.download = 'cita-el-obi.png'; document.body.appendChild(l); l.click(); l.remove();
  }
  return () => { seq++; if (url) URL.revokeObjectURL(url); };
}

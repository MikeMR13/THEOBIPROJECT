// Menú unificado para enlaces públicos; no altera el sistema de citas ni los carnets.
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const BASE_TITLE = 'El Obi del Lector';
let wired = false;
function publicPath() {
  const p = location.pathname;
  return /^\/serie\/[\w-]+$/.test(p) || /^\/leer\/[\w-]+\/\d+$/.test(p) || /^\/equipo\/[\w-]+$/.test(p);
}
function currentTitle() {
  const p = location.pathname;
  const heading = p.startsWith('/serie/') ? document.querySelector('.ui-series-page h1')
    : p.startsWith('/leer/') ? document.querySelector('.rd h1, .rd-where a, .rd-title')
    : document.querySelector('.tp2-page h1');
  return (heading?.textContent || document.title || BASE_TITLE).replace(/\s+/g, ' ').trim().slice(0, 170);
}
function currentURL() {
  // No propagar tokens de vista previa ni parámetros de preferencias/usuario.
  return location.origin + location.pathname;
}
function menu(url = currentURL(), title = currentTitle()) {
  const msg = encodeURIComponent(title + '\n' + url);
  const tg = encodeURIComponent(url);
  return '<details class="obi-share" data-share-url="' + esc(url) + '" data-share-title="' + esc(title) + '"><summary aria-label="Opciones para compartir esta página">↗ Compartir</summary>' +
    '<div class="obi-share-menu"><button type="button" data-obi-share="native">Compartir…</button>' +
    '<button type="button" data-obi-share="copy">Copiar enlace</button>' +
    '<a rel="noopener noreferrer" target="_blank" href="https://wa.me/?text=' + msg + '">WhatsApp</a>' +
    '<a rel="noopener noreferrer" target="_blank" href="https://t.me/share/url?url=' + tg + '&text=' + encodeURIComponent(title) + '">Telegram</a>' +
    '<span class="obi-share-status" role="status" aria-live="polite"></span></div></details>';
}
function setupCSS() {
  if (document.getElementById('obi-share-css')) return;
  const s = document.createElement('style');
  s.id = 'obi-share-css';
  s.textContent = '.obi-share{position:relative;display:inline-block;z-index:4;font-family:"IBM Plex Sans",sans-serif;font-size:13px;margin:8px 0}.obi-share>summary{list-style:none;display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px 14px;border:1px solid #79633e;background:#241e14;color:#f3ecd9;cursor:pointer;font-weight:700}.obi-share>summary::-webkit-details-marker{display:none}.obi-share>summary:focus-visible,.obi-share-menu a:focus-visible,.obi-share-menu button:focus-visible{outline:3px solid #f2c230;outline-offset:2px}.obi-share-menu{position:absolute;z-index:95;top:100%;left:0;min-width:200px;display:grid;padding:6px;background:#16140f;border:1px solid #79633e;box-shadow:0 12px 30px #0009}.obi-share-menu a,.obi-share-menu button{border:0;background:transparent;color:#f3ecd9;text-align:left;font:600 13px "IBM Plex Sans",sans-serif;cursor:pointer;text-decoration:none;padding:11px 12px}.obi-share-menu a:hover,.obi-share-menu button:hover{background:#302618;color:#f2c230}.obi-share-status{display:block;color:#a9d18e;padding:0 12px;font-size:12px}.rd-tools>.obi-share{margin:0}.rd-tools>.obi-share>summary{min-height:40px}.tp2-page>.obi-share{margin:12px 0}.obi-share[data-placement="team"]{margin-left:14px}';
  document.head.appendChild(s);
}
function insertMenu() {
  document.querySelectorAll('.obi-share').forEach(n => n.remove());
  if (!publicPath() || document.querySelector('.tp2-draft')) return;
  const p = location.pathname;
  const target = p.startsWith('/serie/') ? document.querySelector('.ui-series-page .ui-series-hero > div:last-child')
    : p.startsWith('/leer/') ? document.querySelector('.rd-tools')
    : document.querySelector('.tp2-page .tp2');
  if (!target) return;
  const slot = document.createElement('div');
  slot.innerHTML = menu();
  const el = slot.firstElementChild;
  if (p.startsWith('/equipo/')) { el.dataset.placement = 'team'; target.prepend(el); }
  else if (p.startsWith('/leer/')) target.append(el);
  else target.append(el);
  if (p.startsWith('/serie/')) {
    document.querySelectorAll('.ui-series-page .ui-vol-book[data-vol-num]').forEach(book => {
      if (book.dataset.lock === '1') return;
      const vol = Number(book.dataset.volNum);
      if (!Number.isInteger(vol) || vol < 1 || vol > 999) return;
      const title = (book.querySelector('h3')?.textContent || 'Volumen ' + vol).trim();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = menu(currentURL() + '?vol=' + vol, title);
      book.querySelector('.ui-v-heading')?.append(wrapper.firstElementChild);
    });
    const chosen = Number(new URLSearchParams(location.search).get('vol'));
    if (Number.isInteger(chosen) && chosen > 0 && chosen < 1000) {
      document.getElementById('serie-tab-vols')?.click();
      document.querySelector('.ui-vol-book[data-vol-num="' + chosen + '"]')?.scrollIntoView({ block: 'start' });
    }
  }
}
function headMeta() {
  const p = location.pathname;
  const can = document.querySelector('link[rel="canonical"]') || document.createElement('link');
  if (!can.isConnected) { can.rel = 'canonical'; document.head.append(can); }
  const requestedVol = p.startsWith('/serie/') ? Number(new URLSearchParams(location.search).get('vol')) : 0;
  can.href = location.origin + p + (Number.isInteger(requestedVol) && requestedVol > 0 && requestedVol < 1000 ? '?vol=' + requestedVol : '');
  const isDraft = p.startsWith('/equipo/') && new URLSearchParams(location.search).has('vista');
  const isRestrictedReader = p.startsWith('/lector/') && !document.querySelector('.lc-public');
  const isMissingPublic = (p.startsWith('/serie/') && !document.querySelector('.ui-series-page')) ||
    (p.startsWith('/leer/') && !document.querySelector('.rd')) ||
    (p.startsWith('/equipo/') && !document.querySelector('.tp2-page .tp2'));
  const isMissingVolume = p.startsWith('/serie/') && requestedVol > 0 &&
    !document.querySelector('.ui-vol-book[data-vol-num="' + requestedVol + '"]');
  const isPrivate = /^\/(?:estudio|bibliotecario|admin|perfil|preferencias|biblioteca|descargas|entrar|registro|anotaciones|invitacion|solicitud)(?:\/|$)/.test(p) ||
    isRestrictedReader || isMissingPublic || isMissingVolume;
  let robots = document.querySelector('meta[name="robots"]');
  if ((isPrivate || isDraft) && !robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    document.head.append(robots);
  }
  if (isPrivate || isDraft) robots.content = 'noindex,nofollow';
  else robots?.remove();

  const title = p === '/' ? BASE_TITLE + ' — Novelas ligeras en español latino'
    : p === '/catalogo' ? 'Catálogo de novelas ligeras — ' + BASE_TITLE
    : p === '/calendario' ? 'Calendario de lanzamientos — ' + BASE_TITLE
    : p === '/ranking' ? 'Más leídas y ranking — ' + BASE_TITLE
    : publicPath() ? currentTitle() + ' — ' + BASE_TITLE
    : p.startsWith('/lector/') ? (document.querySelector('.lc-name-row h1')?.textContent || 'Carnet de lector') + ' — ' + BASE_TITLE
    : BASE_TITLE;
  document.title = title.slice(0, 200);
  const d = document.querySelector('meta[name="description"]');
  const syn = p.startsWith('/serie/') ? document.querySelector('.ui-syn') : null;
  if (d && (syn?.textContent || p === '/')) d.content = (syn?.textContent || 'Biblioteca de novelas ligeras traducidas al español latino por grupos de fans.').trim().slice(0, 170);
}
export function installPublicShare() {
  setupCSS();
  if (!wired) {
    wired = true;
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-obi-share]');
      if (!btn) {
        if (!e.target.closest('.obi-share')) document.querySelectorAll('.obi-share[open]').forEach(x => { x.open = false; });
        return;
      }
      const container = btn.closest('.obi-share');
      const url = container?.dataset.shareUrl || currentURL(), title = container?.dataset.shareTitle || currentTitle();
      const status = container?.querySelector('.obi-share-status');
      const say = text => { if (status) status.textContent = text; };
      if (btn.dataset.obiShare === 'native' && navigator.share) {
        try { await navigator.share({ title, url }); say('Compartido'); }
        catch (err) { if (err?.name !== 'AbortError') say('No se pudo compartir. Prueba copiar el enlace.'); }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        say('Enlace copiado');
      } catch {
        window.prompt('Copia el enlace:', url);
        say('Enlace listo para copiar');
      }
    });
  }
  headMeta();
  insertMenu();
}

import { promptInApp } from './dialogs.js';
import {updateClientSeo} from './seo.js?v=1';
import {shareMenuPosition} from './share-placement.js?v=1';
// Menú unificado para enlaces públicos; no altera el sistema de citas ni los carnets.
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const BASE_TITLE = 'El Obi del Lector';
let wired = false;
let floatingOwner = null, floatingPanel = null;
let shareToastTimer = null;
// Reutiliza la notificación global del sitio; el panel Compartir se mueve a body
// cuando está abierto, por lo que su estado no siempre es hijo del <details>.
function shareNotice(message, fallbackPanel) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.style.display = 'block';
    // El menú flotante tiene z-index:9000 y podría tapar el aviso.
    toast.style.zIndex = '9100';
    clearTimeout(shareToastTimer);
    shareToastTimer = setTimeout(() => {
      if (toast.textContent !== message) return;
      toast.style.display = 'none';
      toast.style.removeProperty('z-index');
    }, 2800);
  } else {
    // Protección para páginas que reutilicen Compartir sin el contenedor #toast.
    const status = fallbackPanel?.querySelector('.obi-share-status');
    if (status) status.textContent = message;
  }
}
// No sobrescribir la decisión de indexación del SSR en la ruta inicial.
const ENTRY_PATH=location.pathname, ENTRY_URL=location.pathname+location.search;
const ENTRY_NOINDEX=/noindex/i.test(document.querySelector('meta[name="robots"]')?.content||'');
let clientNavigated=false;
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
  s.textContent = [
    '.obi-share{position:relative;display:inline-flex;vertical-align:middle;flex:none;font:700 14px "IBM Plex Sans",sans-serif;margin:8px 0;max-width:100%}',
    '.obi-share>summary{list-style:none;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 16px;border:2px solid #51432d;background:#19160e;color:#f3ecd9;cursor:pointer;font:inherit;line-height:1.3;white-space:normal;text-align:center}',
    '.obi-share>summary::-webkit-details-marker{display:none}',
    '.obi-share[open]>summary,.obi-share>summary:hover{background:#302510;border-color:#f2c230;color:#f2c230}',
    '.obi-share>summary:focus-visible,.obi-share-menu a:focus-visible,.obi-share-menu button:focus-visible{outline:3px solid #f2c230;outline-offset:2px}',
    '.obi-share-menu{position:absolute;z-index:95;top:calc(100% + 8px);left:0;min-width:220px;display:grid;padding:8px;background:#16140f;border:1px solid #9c7a38;box-shadow:0 16px 36px #000b;font:600 14px "IBM Plex Sans",sans-serif}',
    '.obi-share-menu.is-floating{position:fixed;z-index:9000;top:0;left:0;max-width:calc(100vw - 16px);overflow-y:auto;overscroll-behavior:contain}',
    '.obi-share-menu a,.obi-share-menu button{display:flex;align-items:center;min-height:44px;border:0;background:transparent;color:#f3ecd9;text-align:left;font:inherit;cursor:pointer;text-decoration:none;padding:11px 14px;width:100%}',
    '.obi-share-menu a:hover,.obi-share-menu button:hover{background:#302618;color:#f2c230}',
    '.obi-share-status{display:block;color:#a9d18e;padding:5px 14px;font-size:12px;line-height:1.4}',
    '.ui-series-actions>.obi-share{margin:0}',
    '.ui-series-actions>.obi-share>summary{min-height:44px}',
    '.rd-tools>.obi-share{margin:0}',
    '.rd-tools>.obi-share>summary{min-height:40px}',
    '.tp2-page>.obi-share{margin:12px 0}',
    '.obi-share[data-placement="team"]{margin-left:14px}',
    '@media(max-width:480px){.ui-series-actions>.obi-share{max-width:100%}.ui-series-actions>.obi-share>summary{min-height:46px}}'
  ].join('\n');
  document.head.appendChild(s);
}
// El hero de la obra tiene overflow:hidden; por eso el menú se monta en body
// mientras está abierto y se devuelve a su <details> al cerrarse.
function hideFloatingMenu() {
  const owner=floatingOwner, panel=floatingPanel;
  floatingOwner=null;floatingPanel=null;
  if (!panel) return;
  panel.classList.remove('is-floating');
  panel.removeAttribute('style');
  if (owner) owner.append(panel);
}
function positionFloatingMenu() {
  if (!floatingOwner || !floatingPanel) return;
  if (!floatingOwner.isConnected || !floatingOwner.open) {
    if (floatingOwner?.open) floatingOwner.open=false;
    hideFloatingMenu();
    return;
  }
  const panel=floatingPanel;
  panel.style.visibility='hidden';
  panel.style.maxHeight='none';
  panel.style.left='0px';
  panel.style.top='0px';
  const rect=floatingOwner.querySelector('summary').getBoundingClientRect();
  const measure=panel.getBoundingClientRect();
  const pos=shareMenuPosition(rect,measure,{width:window.innerWidth,height:window.innerHeight});
  panel.style.maxWidth=pos.maxWidth+'px';
  panel.style.maxHeight=pos.maxHeight+'px';
  panel.style.left=pos.left+'px';
  panel.style.top=pos.top+'px';
  panel.dataset.direction=pos.placement;
  panel.style.visibility='visible';
}
function bindFloatingMenu(details) {
  details.addEventListener('toggle',()=>{
    if (!details.open) {
      if (floatingOwner===details) hideFloatingMenu();
      return;
    }
    if (floatingOwner && floatingOwner!==details) {
      floatingOwner.open=false;
      hideFloatingMenu();
    }
    const panel=details.querySelector('.obi-share-menu');
    if (!panel || !details.isConnected) return;
    floatingOwner=details;floatingPanel=panel;
    panel.classList.add('is-floating');
    document.body.append(panel);
    positionFloatingMenu();
  });
}
function insertMenu() {
  if (floatingOwner) { floatingOwner.open=false; hideFloatingMenu(); }
  document.querySelectorAll('.obi-share').forEach(n => n.remove());
  if (!publicPath() || document.querySelector('.tp2-draft')) return;
  const p = location.pathname;
  const target = p.startsWith('/serie/') ? document.querySelector('.ui-series-page .ui-series-actions')
    : p.startsWith('/leer/') ? document.querySelector('.rd-tools')
    : document.querySelector('.tp2-page .tp2');
  if (!target) return;
  const slot = document.createElement('div');
  slot.innerHTML = menu();
  const el = slot.firstElementChild;
  // En escritorio, sin Web Share API, evitar una opción redundante que solo copiaba el enlace.
  if (!navigator.share) el.querySelector('[data-obi-share="native"]')?.remove();
  bindFloatingMenu(el);
  if (p.startsWith('/serie/')) el.dataset.placement='series';
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
      const volumeShare=wrapper.firstElementChild;
      if (!navigator.share) volumeShare.querySelector('[data-obi-share="native"]')?.remove();
      if (book.querySelector('.ui-v-heading')) { bindFloatingMenu(volumeShare); book.querySelector('.ui-v-heading').append(volumeShare); }
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
  const isPrivate = window.OBI_CONFIG?.preview === true || /^\/(?:estudio|bibliotecario|admin|perfil|preferencias|biblioteca|descargas|entrar|registro|restablecer|buscar|mi-equipo|elige-nombre|anotaciones|invitacion|solicitud)(?:\/|$)/.test(p) ||
    isRestrictedReader || isMissingPublic || isMissingVolume;
  let robots = document.querySelector('meta[name="robots"]');
  if ((isPrivate || isDraft || (ENTRY_NOINDEX && p===ENTRY_PATH)) && !robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    document.head.append(robots);
  }
  if (isPrivate || isDraft || (ENTRY_NOINDEX && p===ENTRY_PATH)) robots.content = 'noindex,nofollow';
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
  // El SSR sigue siendo la fuente de verdad al entrar directamente desde
  // WhatsApp/Google. Actualizar el head solo tras navegación SPA real.
  if(location.pathname+location.search!==ENTRY_URL) clientNavigated=true;
  if(clientNavigated) updateClientSeo({blocked:isPrivate||isDraft||isMissingPublic||
    (ENTRY_NOINDEX && p===ENTRY_PATH)});
}
export function installPublicShare() {
  setupCSS();
  if (!wired) {
    wired = true;
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-obi-share]');
      if (!btn) {
        const insidePanel=floatingPanel?.contains(e.target);
        if (!e.target.closest('.obi-share') && !insidePanel)
          document.querySelectorAll('.obi-share[open]').forEach(x => { x.open = false; });
        return;
      }
      const container=btn.closest('.obi-share') ||
        (floatingPanel?.contains(btn) ? floatingOwner : null);
      const url = container?.dataset.shareUrl || currentURL(), title = container?.dataset.shareTitle || currentTitle();
      const panel = floatingPanel?.contains(btn) ? floatingPanel : container;
      const say = text => shareNotice(text, panel);
      if (btn.dataset.obiShare === 'native' && navigator.share) {
        try { await navigator.share({ title, url }); say('Compartido'); }
        catch (err) { if (err?.name !== 'AbortError') say('No se pudo compartir. Prueba copiar el enlace.'); }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        say('Enlace copiado');
      } catch {
        await promptInApp('Copia el enlace:', url);
        say('Enlace listo para copiar');
      }
    });
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape'||!floatingOwner)return;
      const summary=floatingOwner.querySelector('summary');
      floatingOwner.open=false;
      hideFloatingMenu();
      summary?.focus();
      e.preventDefault();
    });
    window.addEventListener('resize',positionFloatingMenu,{passive:true});
    document.addEventListener('scroll',positionFloatingMenu,true);
  }
  headMeta();
  insertMenu();
}

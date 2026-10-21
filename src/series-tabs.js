// Pestañas públicas de cada obra: mantienen enlaces internos, teclado y deep links.
export function initSeriesTabs(root, win = window) {
  root.__obiSeriesTabsCleanup?.();
  const nav = root.querySelector('.ui-series-nav[role="tablist"]');
  if (!nav) return null;
  const tabs = [...nav.querySelectorAll('[role="tab"]')];
  const panels = new Map(tabs.map(tab => [tab.getAttribute('aria-controls'), root.querySelector('#' + tab.getAttribute('aria-controls'))]));
  if (!tabs.length || [...panels.values()].some(x => !x)) return null;

  const paneForHash = hash => {
    let raw = '';
    try { raw = decodeURIComponent(String(hash || '').replace(/^#/, '')); } catch { return null; }
    if (panels.has(raw)) return raw;
    if (/^descarga-vol-[\w.-]+$/.test(raw)) return 'serie-descargas';
    if (raw === 'serie-portada') return 'serie-info';
    return null;
  };
  const activate = (id, focus = false) => {
    const desired = panels.has(id) ? id : 'serie-info';
    for (const tab of tabs) {
      const active = tab.getAttribute('aria-controls') === desired;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panels.get(tab.getAttribute('aria-controls'));
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
      if (active && focus) tab.focus();
    }
    return desired;
  };
  const syncHash = () => {
    const pane = paneForHash(win.location.hash);
    if (!pane) return;
    activate(pane);
    // Cuando la SPA inyecta los paneles después de resolver datos, el navegador
    // podría haber intentado saltar a un destino que aún no existía.
    let hash = '';
    try { hash = decodeURIComponent(win.location.hash.slice(1)); } catch { return; }
    const destination = win.document.getElementById(hash);
    if (!destination || !root.contains(destination)) return;
    win.requestAnimationFrame(() => {
      if (paneForHash(win.location.hash) === pane) destination.scrollIntoView({ block: 'start' });
    });
  };
  const click = event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || !root.contains(link)) return;
    const pane = paneForHash(link.getAttribute('href'));
    if (pane) activate(pane);
  };
  const keydown = event => {
    const current = tabs.indexOf(event.target);
    if (current < 0) return;
    const key = event.key;
    const next = key === 'ArrowRight' || key === 'ArrowDown' ? (current + 1) % tabs.length :
      key === 'ArrowLeft' || key === 'ArrowUp' ? (current + tabs.length - 1) % tabs.length :
      key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    const tab = tabs[next];
    activate(tab.getAttribute('aria-controls'), true);
    // Navegación por teclado sin recargar ni dejar un panel oculto.
    win.history.replaceState(win.history.state, '', tab.getAttribute('href'));
  };
  const changed = () => syncHash();
  root.addEventListener('click', click);
  nav.addEventListener('keydown', keydown);
  win.addEventListener('hashchange', changed);
  win.addEventListener('popstate', changed);
  activate(paneForHash(win.location.hash) || 'serie-info');
  if (paneForHash(win.location.hash)) syncHash();
  const cleanup = () => {
    root.removeEventListener('click', click);
    nav.removeEventListener('keydown', keydown);
    win.removeEventListener('hashchange', changed);
    win.removeEventListener('popstate', changed);
  };
  root.__obiSeriesTabsCleanup = cleanup;
  return { activate, cleanup, tabs, panels };
}

// Navegación única para móviles. El menú horizontal de escritorio es independiente.
// Este módulo no consulta el backend y funciona en páginas públicas y sin conexión.
export const MAIN_TABS = [
  ['/', '家', 'Inicio'],
  ['/catalogo', '目', 'Catálogo'],
  ['/biblioteca', '書', 'Biblioteca'],
  ['/buscar', '探', 'Buscar'],
  ['/perfil', '人', 'Perfil']
];
export const EXTRA_TABS = [
  ['/calendario', 'Calendario'],
  ['/ranking', 'Ranking'],
  ['/apoyar', '援 Apoyar']
];

export function createMobileNavigation(){
  const tab = document.createElement('nav');
  tab.className = 'ob-tab';
  tab.setAttribute('aria-label', 'Navegación principal móvil');
  tab.innerHTML =
    MAIN_TABS.map(([path, symbol, title]) =>
      `<a href="${path}"><span aria-hidden="true">${symbol}</span>${title}</a>`).join('') +
    '<button type="button" class="ob-tab-more" aria-label="Más secciones" aria-expanded="false" aria-controls="ob-tab-panel"><span aria-hidden="true">⋯</span>Más</button>' +
    '<div class="ob-tab-panel" id="ob-tab-panel" role="group" aria-label="Secciones adicionales" hidden>' +
    EXTRA_TABS.map(([path,title]) =>
      `<a href="${path}"${path === '/apoyar' ? ' class="ob-sup"' : ''}>${title}</a>`).join('') +
    '</div>';
  return tab;
}

export function bindMobileNavigation(tab){
  const button = tab.querySelector('.ob-tab-more');
  const panel = tab.querySelector('#ob-tab-panel');
  const close = (restoreFocus = false) => {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  };
  const setOpen = on => {
    panel.hidden = !on;
    button.setAttribute('aria-expanded', String(on));
    if (on) panel.querySelector('a:not([hidden])')?.focus();
  };
  button.addEventListener('click', () => setOpen(panel.hidden));
  panel.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  document.addEventListener('click', e => { if (!tab.contains(e.target)) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(true); }
  });
  addEventListener('popstate', () => close());
  const mark = p => {
    for(const a of tab.querySelectorAll('a')){
      const href = a.getAttribute('href');
      const current = href === '/' ? p === '/' :
        p.startsWith(href) || (href === '/catalogo' && p.startsWith('/serie')) ||
        (href === '/perfil' && p.startsWith('/lector/'));
      a.classList.toggle('on', current);
      if (current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const secondary = EXTRA_TABS.some(([href]) => p === href || p.startsWith(href+'/'));
    button.classList.toggle('on', secondary);
    if (/^\/(leer|estudio)\b/.test(p)) close();
  };
  return { mark, close, button, panel };
}

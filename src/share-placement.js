// Posicionamiento puro del menú de compartir: no depende del DOM ni de la app.
// Evita que la ficha recorte el desplegable y que salga del viewport en móvil.
export function shareMenuPosition(anchor, panel, viewport, gap=8) {
  const inset=8;
  const vw=Math.max(1,Number(viewport.width)||1);
  const vh=Math.max(1,Number(viewport.height)||1);
  const width=Math.max(0,Math.min(Math.max(0,Number(panel.width)||0),vw-2*inset));
  const naturalHeight=Math.max(0,Number(panel.height)||0);
  const down=Math.max(0,vh-(Number(anchor.bottom)||0)-gap-inset);
  const up=Math.max(0,(Number(anchor.top)||0)-gap-inset);
  const above=down<naturalHeight&&up>down;
  const available=above?up:down;
  const height=Math.min(naturalHeight,available);
  const left=Math.max(inset,Math.min(Number(anchor.left)||0,vw-inset-width));
  const top=above?Math.max(inset,(Number(anchor.top)||0)-gap-height):
    Math.min(vh-inset-height,(Number(anchor.bottom)||0)+gap);
  return {left,top,maxHeight:available,maxWidth:Math.max(0,vw-2*inset),
    placement:above?'above':'below'};
}

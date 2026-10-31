import { formatChapterIndex } from './chapter-title-display.js';

// El orden de navegación es interno; el destino editorial puede ser cualquiera de sus partes.
// Solo elegir entre secciones que la consulta pública ya autorizó y filtró como disponibles.
const PRELIMINARES = new Set([
  'Portada', 'Créditos', 'Sinopsis', 'Índice', 'Dedicatoria',
  'Ilustraciones', 'Agradecimientos', 'Nota editorial', 'Avance'
]);

export function selectReadingStart(chapters = [], preferredId = null) {
  const available = (chapters || []).filter(c => c && Number.isFinite(Number(c.num)))
    .slice().sort((a, b) => Number(a.num) - Number(b.num));
  if (!available.length) return null;
  if (preferredId != null) {
    const chosen = available.find(c => c.id != null && String(c.id) === String(preferredId));
    if (chosen) return chosen;
  }
  // Prólogo si precede al capítulo 01; en ausencia de prólogo, primer capítulo narrativo.
  const parts = available.map(c => ({ c, shown: formatChapterIndex({ title: c.title, sectionType: c.section_type }) }));
  const numbered = parts.find(({ shown }) => shown.label === 'Prólogo' ||
    (shown.label === 'Capítulo' && !!shown.number));
  if (numbered) return numbered.c;
  // Compatibilidad con capítulos antiguos sin prefijo numérico, sin confundir Sinopsis con capítulo.
  return parts.find(({ c, shown }) =>
    !PRELIMINARES.has(shown.label) &&
    (shown.label === 'Sección' ? (c.section_type || 'Capítulo') === 'Capítulo' : true))?.c ||
    available[0];
}

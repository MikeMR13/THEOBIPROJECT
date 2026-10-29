// «Títulos inteligentes» se decide por importación. La obra y el EPUB original
// conservan todos los bloques; solo se marca el heading duplicado si se solicita.
import { formatChapterIndex } from './chapter-title-display.js?v=1';

const plain = text => String(text || '')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-MX').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function findRepeatedHeading(blocks, chapter) {
  if (!Array.isArray(blocks) || !blocks.length) return -1;
  const first = blocks.findIndex(b => String(b?.text || b?.html || '').trim());
  if (first < 0 || !['heading', 'h'].includes(blocks[first]?.type || blocks[first]?.t)) return -1;
  const shown = formatChapterIndex({ title: chapter?.title, sectionType: chapter?.section_type });
  // Si el título editorial es solo un número, no hay H2 visible equivalente.
  if (!String(shown.heading || '').trim()) return -1;
  const visible = plain(shown.heading), b = blocks[first];
  const rendered = plain(b.text || b.html);
  const editorial = formatChapterIndex({ title: b.text || b.html, sectionType: chapter?.section_type });
  const normalized = plain(editorial.heading);
  return visible.length >= 5 && (rendered === visible || normalized === visible) ? first : -1;
}

// Nunca se aplica de forma retroactiva a las obras existentes.
export function repeatedOpeningHeading(blocks, chapter) {
  const index = findRepeatedHeading(blocks, chapter);
  return index >= 0 && blocks[index]?.smart_title === true ? index : -1;
}

// Solo el checkbox del importador agrega una marca al bloque JSON del capítulo.
// La marca es reversible; ningún párrafo o encabezado se borra del archivo o DB.
export function smartTitleBlocks(blocks, chapter, enabled = false) {
  if (!Array.isArray(blocks)) return [];
  const duplicate = enabled ? findRepeatedHeading(blocks, chapter) : -1;
  return blocks.map((block, index) => {
    if (!block || typeof block !== 'object') return block;
    const { smart_title, ...rest } = block;
    return index === duplicate ? { ...rest, smart_title: true } : rest;
  });
}

// No modificar el contenido EPUB: únicamente omitir el primer heading repetido al presentar.
import { formatChapterIndex } from './chapter-title-display.js?v=1';
const plain = text => String(text || '')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-MX').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function repeatedOpeningHeading(blocks, chapter) {
  if (!Array.isArray(blocks) || !blocks.length) return -1;
  const first = blocks.findIndex(b => String(b?.text || b?.html || '').trim());
  if (first < 0 || !['heading', 'h'].includes(blocks[first]?.type || blocks[first]?.t)) return -1;
  const shown = formatChapterIndex({title:chapter?.title,sectionType:chapter?.section_type});
  const visible = plain(shown.heading || chapter?.title);
  const b = blocks[first];
  const rendered = plain(b.text || b.html);
  const editorial = formatChapterIndex({title:b.text || b.html,sectionType:chapter?.section_type});
  const normalized = plain(editorial.heading);
  // Si el título es genérico o ambiguo conservar el heading importado.
  return visible.length >= 5 && (rendered === visible || normalized === visible) ? first : -1;
}

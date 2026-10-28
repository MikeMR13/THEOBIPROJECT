// Presentación opcional del índice público por volumen.
// No altera títulos almacenados, bloques, rutas ni numeración global.
const CHAPTER_PREFIX = /^\s*(cap[íi]tulo|captiulo|cap\.?)[ \t]*(?:n(?:[úu]mero|[º°o])\.?[ \t]*)?0*([1-9]\d{0,3})(?=$|[\s:.\-–—])(?:[ \t]*[:\-–—][ \t]*|\.[ \t]+|\s+|$)/iu;

const SPECIAL_PREFIX = {
  'Prólogo': /^pr[oó]logo(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Epílogo': /^ep[íi]logo(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Interludio': /^interludio(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Créditos': /^cr[eé]ditos(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Ilustraciones': /^ilustraciones?(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Afterword': /^afterword(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Extra': /^extra(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Avance': /^avance(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu,
  'Episodio corto': /^episodio corto(?=$|[ \t]*[:\-–—])[ \t]*(?:[:\-–—][ \t]*)?/iu
};

export function formatChapterIndex({ title = '', sectionType = 'Capítulo', globalNum = '', enabled = false } = {}) {
  const original = String(title ?? '').trim();
  const type = String(sectionType || 'Capítulo');
  const global = String(globalNum ?? '');
  if (!enabled) return { label: '', number: global, heading: original, secondary: '', normalized: false, typo: false };
  const secondary = global ? 'Sección global ' + global : '';
  if (type !== 'Capítulo') {
    const match = original.match(SPECIAL_PREFIX[type] || /$^/);
    return { label: type, number: '', heading: match ? original.slice(match[0].length).trim() : original,
      secondary, normalized: !!match, typo: false };
  }
  const match = original.match(CHAPTER_PREFIX);
  if (!match) return { label: 'Sección', number: '', heading: original, secondary, normalized: false, typo: false };
  return { label: 'Capítulo', number: String(Number(match[2])).padStart(2, '0'),
    heading: original.slice(match[0].length).trim(), secondary, normalized: true,
    typo: /^captiulo$/iu.test(match[1]) };
}

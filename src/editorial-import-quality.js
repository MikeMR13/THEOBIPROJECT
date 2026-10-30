// Fase 1: análisis editorial determinista y NO destructivo, sin IA ni servicios externos.
// Los hallazgos informan; no alteran el texto ni cambian decisiones de publicación.
export const EDITORIAL_RULES = Object.freeze([
  ['dbl', 'Espacios repetidos'],
  ['quotes', 'Comillas mezcladas'],
  ['dash', 'Guiones de diálogo'],
  ['dots', 'Tres puntos seguidos'],
  ['space', 'Espacios antes de signos'],
  ['open', 'Signos de apertura'],
  ['alt', 'Ilustraciones sin descripción']
]);
export const isDecorativeImage = block => block?.decorative === true;

export function lintImportedBlocks(blocks = []) {
  const counts = Object.fromEntries(EDITORIAL_RULES.map(([key]) => [key, 0]));
  let previous = '';
  for (const b of blocks || []) {
    const type = b?.type || b?.t;
    if (type === 'image' || type === 'img') {
      if (!isDecorativeImage(b) && !String(b.alt ?? '').trim()) counts.alt++;
      continue;
    }
    if (!['paragraph','p','quote','heading','h','note','ruby'].includes(type)) continue;
    // Los importadores almacenan texto sin etiquetas; no se reinterpreta HTML.
    const text = String(b.text ?? '');
    counts.dbl += (text.match(/[ \u00a0]{2,}/g) || []).length;
    counts.dots += (text.match(/\.{3}/g) || []).length;
    counts.space += (text.match(/[ \u00a0]+[,.;:?!»)]/g) || []).length;
    if (text.includes('«') || previous.includes('«')) counts.quotes += Math.ceil((text.match(/["“”]/g) || []).length / 2);
    if (type === 'paragraph' || type === 'p' || type === 'quote') {
      if (/^\s*[-–]\s?\S/.test(text)) counts.dash++;
      if ((text.match(/\?/g)||[]).length > (text.match(/¿/g)||[]).length ||
          (text.match(/!/g)||[]).length > (text.match(/¡/g)||[]).length) counts.open++;
    }
    counts.dash += (text.match(/[?!.,…]\s[-–](?=\p{L})/gu)||[]).length;
    previous = text;
  }
  const total = Object.values(counts).reduce((sum,n)=>sum+n,0);
  return {counts,total};
}

export function inspectImport(chapters = []) {
  const included = chapters.filter(ch => !ch.skip);
  const chaptersWithFindings = included.map(ch => ({title:ch.title, ...lintImportedBlocks(ch.blocks)}));
  const counts = Object.fromEntries(EDITORIAL_RULES.map(([key]) => [key, 0]));
  for (const report of chaptersWithFindings) for (const key of Object.keys(counts))
    counts[key] += report.counts[key];
  return {chapters:chaptersWithFindings, counts, total:Object.values(counts).reduce((a,b)=>a+b,0),
    withWarnings:chaptersWithFindings.filter(c=>c.total>0).length};
}

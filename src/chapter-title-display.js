// Presentación editorial universal y escaneo optativo del importador.
// Nunca reescribe títulos, cuerpos, IDs, URLs ni números globales.
const CHAPTER_PREFIX = /^\s*(cap[íi]tulo|captiulo|cap\.?)[ \t]*(?:n(?:[úu]mero|[º°o])\.?[ \t]*)?0*([0-9]{1,4})(?=$|[\s:.\-–—])(?:[ \t]*[:\-–—][ \t]*|\.[ \t]+|\s+|$)/iu;

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

// Normalizar solo la presentación. El número de navegación nunca aparece en el índice.
export function formatChapterIndex({title = '', sectionType = 'Capítulo'} = {}) {
  const original = String(title ?? '').trim();
  const type = String(sectionType || 'Capítulo');
  if (type !== 'Capítulo') {
    const match = original.match(SPECIAL_PREFIX[type] || /$^/);
    return {label:type,number:'',heading:match ? original.slice(match[0].length).trim() : original,
      normalized:!!match,typo:false};
  }
  // Hay importaciones antiguas con section_type='Capítulo' y título de prólogo/epílogo.
  for(const [label,pattern] of Object.entries(SPECIAL_PREFIX)) {
    const match=original.match(pattern);
    if(match) return {label,number:'',heading:original.slice(match[0].length).trim(),normalized:true,typo:false};
  }
  const match=original.match(CHAPTER_PREFIX);
  if(!match) return {label:'Sección',number:'',heading:original,normalized:false,typo:false};
  return {label:'Capítulo',number:String(Number(match[2])).padStart(2,'0'),
    heading:original.slice(match[0].length).trim(),normalized:true,typo:/^captiulo$/iu.test(match[1])};
}

// Solo cuando el traductor marca «Escanear títulos»; no aplica cambios ni publica nada.
export function scanImportedChapterTitles(chapters = []) {
  const findings=[];
  for(const [index,chapter] of chapters.entries()) {
    if(chapter.skip) continue;
    const result=formatChapterIndex({title:chapter.title,sectionType:chapter.type});
    findings.push({index,original:String(chapter.title||''),label:result.label,number:result.number,
      heading:result.heading,recognized:result.normalized,typo:result.typo});
  }
  return {
    total:findings.length,
    numbered:findings.filter(x=>x.number!=='').length,
    special:findings.filter(x=>x.label!=='Capítulo'&&x.label!=='Sección').length,
    typo:findings.filter(x=>x.typo).length,
    unrecognized:findings.filter(x=>x.label==='Sección').length,
    findings
  };
}

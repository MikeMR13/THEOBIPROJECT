// Entrega visual 1: la vista previa comparte la presentación editorial del lector.
// Ninguna función altera bloques ni aplica títulos inteligentes retroactivamente.
import {formatChapterIndex} from './chapter-title-display.js?v=1';
import {repeatedOpeningHeading} from './reader-headings.js?v=1';

export function chapterPreviewModel({title='',sectionType='Capítulo',blocks=[]}={}){
  const shown=formatChapterIndex({title,sectionType});
  const hidden=repeatedOpeningHeading(blocks,{title,section_type:sectionType});
  return {label:shown.label+(shown.number?' '+shown.number:''),heading:shown.heading||'',
    blocks:(Array.isArray(blocks)?blocks:[]).map((block,index)=>({block,index})).filter(x=>x.index!==hidden),
    hiddenIndex:hidden};
}

export function tagPreviewBlock(html,index){
  return String(html||'').replace(/^\s*<([a-z][a-z0-9-]*)(?=[\s>])/i,
    (match)=>match.replace(/>$/,'')+' data-ed-block="'+index+'"'+(match.endsWith('>')?'>':''));
}

export function previewBlockScrollTop(pane,element){
  if(!pane||!element)return null;
  const pr=pane.getBoundingClientRect(),el=element.getBoundingClientRect();
  const target=pane.scrollTop+el.top-pr.top-Math.min(96,pr.height*.23);
  return Math.max(0,target);
}

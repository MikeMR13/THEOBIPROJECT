// Etiquetas editoriales para cualquier vista pública.
// chapters.num y chapter_num identifican la posición global y se usan SOLO en rutas/progreso.
import {formatChapterIndex} from './chapter-title-display.js';

export function editorialChapterLabel(chapter) {
  if (!chapter?.title) return 'Sección';
  const part=formatChapterIndex({title:chapter.title,sectionType:chapter.section_type});
  if(part.label==='Capítulo' && part.number) return 'Cap. '+part.number;
  return part.label==='Capítulo'?'Sección':part.label;
}
export function editorialChapterDescription(chapter) {
  if (!chapter?.title) return 'Sección';
  const part=formatChapterIndex({title:chapter.title,sectionType:chapter.section_type});
  const label=editorialChapterLabel(chapter);
  return part.heading ? label+' · '+part.heading : label;
}
// No inventar rangos entre volúmenes ni entre números editoriales no consecutivos.
export function editorialChapterGroup(chapters) {
  const parts=(chapters||[]).map(c=>({c,p:formatChapterIndex({title:c.title,sectionType:c.section_type})}));
  if (!parts.length) return 'Sin secciones';
  if (parts.length===1) return editorialChapterLabel(parts[0].c);
  const numbered=parts.filter(x=>x.p.label==='Capítulo' && x.p.number);
  const volumeKey=parts[0].c.volume_id ?? parts[0].c.vol;
  const sameVolume=volumeKey != null && parts.every(x=>String(x.c.volume_id ?? x.c.vol ?? '')===String(volumeKey));
  const nums=[...new Set(numbered.map(x=>Number(x.p.number)))].sort((a,b)=>a-b);
  if (sameVolume && numbered.length===parts.length && nums.length===parts.length &&
      nums.every((n,i)=>!i || n===nums[i-1]+1)) {
    return 'Caps. '+String(nums[0]).padStart(2,'0')+'–'+String(nums.at(-1)).padStart(2,'0');
  }
  return parts.length+' secciones';
}
export function editorialSectionCounts(chapters) {
  const total=(chapters||[]).length;
  const numbered=(chapters||[]).filter(ch=>{
    const p=formatChapterIndex({title:ch.title,sectionType:ch.section_type});
    return p.label==='Capítulo' && !!p.number;
  }).length;
  return {total,numbered,other:total-numbered};
}
export function editorialSectionSummary(chapters) {
  const {total,numbered,other}=editorialSectionCounts(chapters);
  if(!total)return 'Sin secciones';
  if(!numbered)return total+(total===1?' sección':' secciones');
  return numbered+(numbered===1?' capítulo numerado':' capítulos numerados')+
    (other?' · '+other+(other===1?' sección sin número':' secciones sin número'):'');
}
export function genericSectionCount(count) {
  const n=Number(count)||0;
  return n+' '+(n===1?'sección':'secciones');
}

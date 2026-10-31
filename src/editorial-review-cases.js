// Entrega 3: localización de incidencias y notas sobre sugerencias existentes.
// Funciones puras: no modifican el capítulo ni requieren backend.
const escRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const NOTE_TAG=/^\[Obi:p:(\d+)\]\s*/;
export function noteForParagraph(index,note){
  const n=Number(index);
  if(!Number.isSafeInteger(n)||n<0)throw Error('Párrafo inválido');
  const body=String(note||'').trim();
  if(!body||body.length>920)throw Error('La nota debe contener entre 1 y 920 caracteres');
  return '[Obi:p:'+(n+1)+'] '+body;
}
export function readParagraphNote(value){
  const text=String(value||''),match=text.match(NOTE_TAG);
  return match?{index:Number(match[1])-1,text:text.slice(match[0].length),anchored:true}:{index:null,text,anchored:false};
}
export function reviewTextCases(text,glossary=[]){
  const input=String(text||''),items=[];
  const push=(kind,re,replace)=>{
    for(const m of input.matchAll(re)){
      const value=m[0],fix=typeof replace==='function'?replace(value,m):replace;
      if(value!==fix)items.push({kind,start:m.index,end:m.index+value.length,excerpt:value,fix});
      if(items.length>=200)break;
    }
  };
  push('dbl',/ {2,}/g,' ');
  push('dots',/\.{3,}/g,'…');
  push('space',/[ \u00a0]+[,.;:?!»)]/g,v=>v.trimStart());
  push('dash',/^(\s*)[-–]\s?(?=\S)/gm,v=>v.replace(/[-–]\s?$/,'—'));
  push('quotes',/[\"“]([^\"“”\n]{1,180})[\"”]/g,v=>'«'+v.slice(1,-1)+'»');
  for(const raw of glossary.slice(0,100)){
    const term=String(raw?.term||'');
    if(term.length<2||term.length>80)continue;
    const re=new RegExp('(?<![\\p{L}\\p{N}])'+escRe(term)+'(?![\\p{L}\\p{N}])','giu');
    push('gloss',re,term);
    if(items.length>=200)break;
  }
  // Casos de tipos distintos que se solapan no se aplican a ciegas.
  return items.sort((a,b)=>a.start-b.start||a.end-b.end).slice(0,200);
}
export function applyReviewCase(current,issue){
  const text=String(current||'');
  if(!issue||text.slice(issue.start,issue.end)!==issue.excerpt)return null;
  return text.slice(0,issue.start)+issue.fix+text.slice(issue.end);
}

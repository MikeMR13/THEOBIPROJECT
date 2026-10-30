// Fase 3: resumen acotado y no destructivo entre bloques de revisiones.
export const suggestionIsStale = (base, current) => Number(base) !== Number(current);
export const editorialBlockText = b => {
  const type=b?.type||b?.t||'paragraph';
  if(type==='image'||type==='img')return '[Ilustración] '+String(b.alt||b.caption||b.url||'');
  if(type==='separator'||type==='sep')return '[Separador] '+String(b.text||'※');
  return String(b?.text||b?.html||'');
};
export function compareChapterVersions(before,after,limit=12){
 const a=Array.isArray(before?.body)?before.body.map(editorialBlockText):[];
 const b=Array.isArray(after?.body)?after.body.map(editorialBlockText):[];
 let prefix=0;
 while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
 let suffix=0;
 while(suffix<a.length-prefix&&suffix<b.length-prefix&&a[a.length-suffix-1]===b[b.length-suffix-1])suffix++;
 const old=a.slice(prefix,a.length-suffix),current=b.slice(prefix,b.length-suffix);
 const max=Math.max(1,Math.min(30,Math.trunc(Number(limit)||12)));
 return {
  titleChanged:String(before?.title||'')!==String(after?.title||''),
  beforeTitle:String(before?.title||''),afterTitle:String(after?.title||''),
  changed:old.length>0||current.length>0,
  sharedPrefix:prefix,sharedSuffix:suffix,
  removed:old.length,added:current.length,
  before:old.slice(0,max).map(x=>x.slice(0,350)),
  after:current.slice(0,max).map(x=>x.slice(0,350)),
  truncated:old.length>max||current.length>max
 };
}

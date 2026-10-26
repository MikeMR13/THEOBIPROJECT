// Borradores de Difusión: variables editoriales de lista blanca, sin HTML.
export const defaultDraftPresentation = () => ({showTitle:true,showTeam:true,showSynopsis:false,showCover:true});
export function normalizeDraftPresentation(raw){
  const base=defaultDraftPresentation();
  if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const k of Object.keys(base))
    if(typeof raw[k]==='boolean')base[k]=raw[k];
  return base;
}
const aliases=Object.freeze({novela:'novela',equipo_traductor:'equipo_traductor',
  'equipo traductor':'equipo_traductor',equipo_productor:'equipo_traductor','equpo traductor':'equipo_traductor',
  sinopsis:'sinopsis',autor:'autor'});
export function renderDraftTemplate(input,context={}){
  const errors=[];
  const text=String(input||'').replace(/\{\{\s*([^{}]{1,48})\s*\}\}/g,(_,name)=>{
    const key=aliases[name.trim().toLowerCase()];
    if(!key){errors.push('Variable no admitida: {{'+name+'}}.');return '';}
    const value=String(context[key]??'').trim();
    if(!value){errors.push('Falta '+key+' en la obra elegida.');return '';}
    return value;
  });
  if(/\{\{|\}\}/.test(text))errors.push('Revisa las variables mal escritas.');
  if(text.length>700)errors.push('El mensaje final supera los 700 caracteres.');
  return {text,errors:[...new Set(errors)]};
}

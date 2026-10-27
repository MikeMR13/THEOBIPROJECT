import { confirmInApp } from './dialogs.js?v=1';
import { cleanSiteSeo, SEO_LIMITS } from './seo-settings.js?v=1';
// Editor del SEO global. Debe ejecutarse solo tras whoami bibliotecario en admin.js
// y con las políticas RLS de platform_settings (UPDATE exclusivo Bibliotecario).
const specs=[
  ['title','Título SEO del Inicio','Si está vacío, se utiliza el título predeterminado.'],
  ['description','Descripción SEO','Resumen público para motores de búsqueda.'],
  ['socialTitle','Título de la tarjeta social','Si está vacío, se usa el título SEO.'],
  ['socialDescription','Descripción de la tarjeta social','Si está vacía, se usa la descripción SEO.']
];
const element = (tag, content = '', attrs = {}) => {
  const e=document.createElement(tag);
  if(content)e.textContent=content;
  for(const [k,v] of Object.entries(attrs)){
    if(k==='className')e.className=v;
    else e.setAttribute(k,v);
  }
  return e;
};
export async function renderAdminSeo({sb,view,toast}) {
  const root=view();
  root.replaceChildren(element('div','Cargando ajustes SEO…',{className:'bb-box'}));
  const {data:config,error:loadError}=await sb.from('platform_settings').select('id,seo').eq('id',1).single();
  if(loadError)throw new Error('No están instaladas las preferencias SEO del servidor QA (migración fase 4): '+loadError.message);
  const saved=cleanSiteSeo(config.seo);
  const box=element('section','',{className:'bb-box'});root.replaceChildren(box);
  box.append(element('h2','SEO y tarjetas del Inicio'),
    element('p','Solo cambia la presentación en buscadores y redes sociales. No modifica la visibilidad de las obras ni puede establecer URLs canónicas externas.',{className:'mono'}));
  const fields={}, counts={};
  for(const [key,label,help] of specs){
    const wrap=element('label',label);
    const control=element(key.toLowerCase().includes('description')?'textarea':'input');
    control.setAttribute('maxlength',SEO_LIMITS[key]);
    if(control.tagName==='TEXTAREA')control.rows=3;
    else control.type='text';
    control.value=saved[key];fields[key]=control;
    const count=element('small',help+' · '+saved[key].length+'/'+SEO_LIMITS[key]);counts[key]=count;
    wrap.append(control,count);box.append(wrap);
  }
  const preview=element('div','',{className:'bb-box'});
  preview.style.borderTop='3px solid #f2c230';
  box.append(element('h3','Vista previa del enlace al Inicio'),preview);
  const actions=element('div','',{className:'bb-row'});
  const save=element('button','Guardar SEO de Inicio',{className:'btn'});
  save.type='button';
  const reset=element('button','Restaurar valores automáticos',{className:'btn ghost'});
  reset.type='button';
  const status=element('span','',{role:'status',className:'mono'});
  const previewLink=element('a','Ver tarjeta social PNG (último guardado) ↗',{href:'/api/og-image?kind=home',target:'_blank',rel:'noopener noreferrer',className:'btn ghost'});
  actions.append(save,reset,previewLink,status);box.append(actions);
  let dirty=false;
  const read=()=>cleanSiteSeo(Object.fromEntries(Object.entries(fields).map(([k,control])=>[k,control.value])));
  const refresh=()=>{
    const v=read();
    preview.replaceChildren(element('strong',v.socialTitle||v.title||'El Obi del Lector — Novelas ligeras en español latino'),
      element('p',v.socialDescription||v.description||'Biblioteca de novelas ligeras en español latino.'),
      element('small','https://elobidellector.com/'));
    for(const [key,,help] of specs)counts[key].textContent=help+' · '+v[key].length+'/'+SEO_LIMITS[key];
    status.textContent=dirty?'Cambios sin guardar':'';
  };
  Object.values(fields).forEach(e=>e.addEventListener('input',()=>{dirty=true;refresh();}));
  reset.onclick=async()=>{
    if(!await confirmInApp('¿Restaurar el SEO automático de Inicio? Debes guardar para aplicar.'))return;
    Object.values(fields).forEach(e=>e.value='');dirty=true;refresh();
  };
  save.onclick=async()=>{
    if(save.disabled)return;
    save.disabled=true;
    try{
      const seo=read();
      const {data, error}=await sb.from('platform_settings').update({seo,updated_at:new Date().toISOString()}).eq('id',1).select('id');
      if(error)throw error;
      if(!data?.length)throw new Error('Sin permisos para guardar esta configuración');
      dirty=false;refresh();toast('Preferencias SEO de Inicio guardadas');
    }catch(e){status.textContent='Error al guardar: '+(e.message||'desconocido');}
    finally{save.disabled=false;}
  };
  refresh();
}

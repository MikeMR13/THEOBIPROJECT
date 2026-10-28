// QA visual real del formulario SEO: detecta checkbox con ancho global 100%.
// No usa credenciales ni consulta tablas reales.
import {bindSeriesSeo} from '/studio-seo.js?v=qa';
const out=document.querySelector('#qa-result');
try{
  const app=document.querySelector('#app');
  bindSeriesSeo({
    app,sb:{},series:{id:'demo',team_id:'team',slug:'obra-demo',title:'Obra de prueba',synopsis:'Resumen de prueba',theme:{},media:{gallery:[]},cover_path:null},
    canEdit:true,media:p=>'/fake/'+p,toast:()=>{},busy:()=>{},refresh:()=>{}
  });
  const label=app.querySelector('.wk-seo-noindex'),check=label?.querySelector('input[type=checkbox]'),
    caption=label?.querySelector('span'),block=app.querySelector('.wk-seo');
  if(!label||!check||!caption||!block)throw Error('No se creó la opción Noindex');
  const row=label.getBoundingClientRect(),cb=check.getBoundingClientRect(),text=caption.getBoundingClientRect(),
    wrapper=block.getBoundingClientRect(),viewport=document.documentElement.clientWidth;
  const measure={viewport,rowWidth:row.width,checkboxWidth:cb.width,textWidth:text.width,
    textX:text.left,checkboxX:cb.left,containerX:wrapper.left,containerWidth:wrapper.width,
    scrollWidth:document.documentElement.scrollWidth};
  if(getComputedStyle(label).display!=='flex')throw Error('Noindex dejó de ser fila flex: '+JSON.stringify(measure));
  if(cb.width<15||cb.width>28)throw Error('La casilla debe medir ~18px: '+JSON.stringify(measure));
  if(text.width<Math.min(160,row.width*.55))throw Error('Texto comprimido en una columna: '+JSON.stringify(measure));
  if(text.left<cb.right||text.right>wrapper.right+3)throw Error('Texto fuera de la fila: '+JSON.stringify(measure));
  if(measure.scrollWidth>viewport+2)throw Error('Hay desbordamiento horizontal: '+JSON.stringify(measure));
  if(check.checked||check.disabled)throw Error('El estado editable/indización cambió sin permiso');
  check.click();
  if(!check.checked)throw Error('La casilla no se puede seleccionar');
  out.dataset.status='pass';out.textContent='SEO noindex: '+JSON.stringify(measure)+' · interactivo';
}catch(e){out.dataset.status='fail';out.textContent=String(e?.stack||e).slice(0,1800)}

// Chromium real, vistas de 320 a 1024 px, sin Supabase ni archivos privados.
import {blocksToEditor} from '/blocks.js';
const state=document.querySelector('#qa-result');
const fail=msg=>{state.dataset.status='fail';state.textContent=String(msg);};
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body class="in-studio"><main class="s2" style="display:block;width:100%;min-width:0;padding:0"><section class="ed" style="width:100%;min-width:0;max-width:100%"><div class="ed-top"><input id="ttl" aria-label="Título del capítulo" value="Capítulo móvil"/><button class="btn">Guardar</button><span class="ed-state">Guardado</span></div><div class="ed-mobile-view" role="group" aria-label="Modo de edición en pantalla pequeña"><button class="ed-btn" data-view="edit">Editor</button><button class="ed-btn" data-view="preview">Vista previa</button><button class="ed-btn" data-view="split">Ambos</button><button class="ed-btn" data-view="orig">Original</button></div><p class="ed-toolbar-hint">Desliza la barra de formato horizontalmente</p><div class="ed-bar" role="toolbar" aria-label="Formato"><select aria-label="Tipo de bloque"><option>Párrafo</option></select><select aria-label="Tipografía"><option>Tipografía del cuerpo</option></select><button class="ed-btn">Negrita</button><button class="ed-btn">Cursiva</button><button class="ed-btn">Subrayado</button><button class="ed-btn">Furigana</button><button class="ed-btn">Imagen</button><button class="ed-btn">Buscar</button><span class="end"><button class="ed-btn">Lectores</button><button class="ed-btn" data-view="edit">Editor</button><button class="ed-btn" data-view="preview">Vista previa</button></span></div><div class="ed-split" data-view="edit"><div class="ed-docw"><div class="ed-doc" id="doc" contenteditable="true" role="textbox" aria-label="Contenido"></div></div><div class="ed-pvw"><div class="ed-pv">Vista del lector</div></div></div></section></main></body></html>';
const widths=[320,390,760,1024];
(async()=>{
 try{
  for(const width of widths){
   const frame=document.createElement('iframe');
   frame.setAttribute('title','Prueba del editor a '+width+' px');
   frame.style.cssText='display:block;border:0;width:'+width+'px;height:1000px;';
   document.body.append(frame);
   await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('iframe no cargó'));frame.srcdoc=html;});
   const d=frame.contentDocument, ed=d.querySelector('.ed'),bar=d.querySelector('.ed-bar'),mobile=d.querySelector('.ed-mobile-view');
   const doc=d.querySelector('#doc');
   doc.innerHTML=blocksToEditor([{type:'image',url:'img:decor.png',alt:'',decorative:true},{type:'paragraph',text:'Texto de prueba con letras extendidas y lectura cómoda.'}], x=>x);
   const fig=doc.querySelector('figure');
   if(!fig||fig.tabIndex!==0||fig.getAttribute('role')!=='button')throw Error('Figura sin acceso por teclado '+width);
   fig.focus();
   if(d.activeElement!==fig)throw Error('No se puede enfocar la figura '+width);
   if(ed.getBoundingClientRect().width>width+1||doc.getBoundingClientRect().width>width+1||d.documentElement.scrollWidth>width+2)
     throw Error('Desbordamiento horizontal '+width+'px '+d.documentElement.scrollWidth);
   const shown=getComputedStyle(mobile).display!=='none';
   if(shown!==(width<=760))throw Error('Selector de vistas no corresponde a '+width);
   if(width<=760){
    if(getComputedStyle(bar).overflowX!=='auto')throw Error('Barra no desplazable '+width);
    if(bar.scrollWidth<=bar.clientWidth)throw Error('Barra sin desplazamiento funcional '+width);
    bar.scrollLeft=200;
    if(bar.scrollLeft<10)throw Error('No desplazó barra '+width);
    if(getComputedStyle(d.querySelector('.ed-pvw')).display!=='none')throw Error('Vista previa se muestra en modo Editor '+width);
    if(d.querySelector('.ed-mobile-view .ed-btn').getBoundingClientRect().height<44)throw Error('Control táctil pequeño '+width);
   }
   frame.remove();
  }
  state.dataset.status='pass';state.textContent='Móvil 320, 390, 760 y escritorio 1024: sin desborde, barra desplazable y figuras accesibles';
 }catch(e){fail(e.stack||e.message)}
})();

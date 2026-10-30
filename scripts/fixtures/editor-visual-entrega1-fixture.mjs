// Geometría y fidelidad de títulos en Chromium, sin cuentas ni API.
import {chapterPreviewModel,tagPreviewBlock,previewBlockScrollTop} from '/editorial-visual-preview.js';
const out=document.querySelector('#qa-result');
const ok=(yes,msg)=>{if(!yes)throw Error(msg)};
const delay=ms=>new Promise(done=>setTimeout(done,ms));
try{
 const blocks=[{type:'heading',text:'La espada perdida',smart_title:true},{type:'paragraph',text:'El inicio de la historia'},{type:'paragraph',text:'El segundo párrafo'}];
 const original=JSON.stringify(blocks);
 const normalized=chapterPreviewModel({title:'Capítulo 007: La espada perdida',sectionType:'Capítulo',blocks});
 ok(normalized.label==='Capítulo 07'&&normalized.heading==='La espada perdida','Vista previa no normaliza como lector');
 ok(normalized.hiddenIndex===0&&normalized.blocks.length===2,'No respeta la marca optativa de título duplicado');
 ok(JSON.stringify(blocks)===original,'El modelo modificó los datos originales');
 ok(chapterPreviewModel({title:'Prólogo: Un encuentro',sectionType:'Prólogo',blocks:[]}).heading==='Un encuentro','Falló sección especial');
 ok(chapterPreviewModel({title:'Capítulo 3: Un día',sectionType:'Capítulo',blocks:[{type:'heading',text:'Un día'},{type:'paragraph',text:'x'}]}).blocks.length===2,'Ocultó encabezado sin opt-in');
 ok(tagPreviewBlock('<p class="texto">Hola</p>',3).includes('data-ed-block="3"'),'Falta índice de sincronización');
 const longTitle='Una noche larguísima en la ciudad olvidada de las mil estrellas y el regreso de los viajeros';
 for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:760}]){
   const frame=document.createElement('iframe');frame.style.cssText='position:fixed;left:0;top:0;width:'+size.width+'px;height:'+size.height+'px;opacity:.01;border:0;pointer-events:none';
   frame.src='/editor-visual-frame.html';frame.title='Editor de prueba '+size.width;
   document.body.append(frame);
   await new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=reject});
   const w=frame.contentWindow,d=w.document;
   const ttl=d.getElementById('ttl');ttl.value=longTitle;
   const panel=d.querySelector('.ed-pv'),wrapper=d.querySelector('.ed-pvw'),doc=d.querySelector('.ed-doc');
   ok(ttl.tagName==='TEXTAREA'&&ttl.maxLength===300,'Título no es multilínea con límite');
   ok(ttl.scrollWidth<=ttl.clientWidth+3,'Título cortado horizontalmente');
   ok(d.querySelector('#save')&&d.querySelector('.ed-panels-menu')&&d.querySelector('#pub'),'Faltan controles editoriales');
   if(size.width>1100){
     ok(w.getComputedStyle(wrapper).position==='sticky','La vista previa no es sticky en escritorio');
     w.scrollTo(0,3000);await delay(190);
     ok(w.scrollY>2900,'No hubo desplazamiento de 3000 px');
     const top=wrapper.getBoundingClientRect().top;
     ok(top>=-3&&top<=35,'Vista previa no se mantiene visible: '+top);
   }else{
     ok(w.getComputedStyle(wrapper).position!=='sticky','Sticky invade el móvil');
   }
   const fifth=d.querySelector('[data-ed-block="5"]');
   ok(!!fifth,'No hay índice de párrafo');
   const dest=previewBlockScrollTop(panel,fifth);
   ok(Number.isFinite(dest),'No se puede calcular posición del párrafo');
   panel.scrollTo({top:dest,behavior:'auto'});await delay(100);
   ok(Math.abs(panel.scrollTop-Math.min(dest,panel.scrollHeight-panel.clientHeight))<=5,'Vista previa no se desplaza al bloque activo');
   ok(d.documentElement.scrollWidth<=w.innerWidth+3,'Desbordamiento horizontal en '+size.width);
   frame.remove();
 }
 out.dataset.status='pass';out.textContent='Fidelidad de lector, título largo, controles, sticky y sincronización aprobados a 1440, 390 y 320px';
}catch(e){out.dataset.status='fail';out.textContent=e.stack||e.message;}

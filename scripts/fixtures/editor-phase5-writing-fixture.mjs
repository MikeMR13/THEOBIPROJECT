// Prueba en Chromium real, sin backend, importaciones ni cuentas.
import {attachWritingTools,typingCorrection,glossarySuggestions,textPrefix} from '/editorial-writing-tools.js';
const output=document.querySelector('#qa-result');
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
function setCaret(node,offset){
 const sel=getSelection(),range=document.createRange();
 range.setStart(node,offset);range.collapse(true);sel.removeAllRanges();sel.addRange(range);
}
function before(doc,data,isComposing=false){
 const ev=new InputEvent('beforeinput',{bubbles:true,cancelable:true,data,inputType:'insertText',isComposing});
 doc.dispatchEvent(ev);return ev;
}
try{
 check(typingCorrection('..','.')?.insert==='…','Puntos suspensivos');
 check(typingCorrection('-','-',true)?.insert==='—','Raya de diálogo');
 check(typingCorrection('abc-','-',true)===null,'No transformar dentro de palabra');
 check(typingCorrection('..','x')===null,'No cambiar caracteres ordinarios');
 check(textPrefix('Se llama Lodes')==='Lodes','Prefijo actual');
 check(glossarySuggestions([{term:'Lodestone'},{term:'Lodestar'},{term:'Otro'}],'Lod').length===2,'Sugerencias');
 const doc=document.querySelector('#doc'),box=document.querySelector('#hints'),checkbox=document.querySelector('#toggle');
 let changes=0;
 const handle=attachWritingTools({
   doc,box,checkbox,
   glossary:[{term:'Lodestone',category:'Lugar',definition:'Capital de la historia'},
             {term:'Lodestar',category:'Objeto',definition:'Nombre secundario'},
             {term:'<script>alert(1)</script>',definition:'Contenido de prueba'}],
   change:()=>changes++,toast:()=>{}
 });
 doc.focus();
 doc.innerHTML='<p>..</p>';let node=doc.querySelector('p').firstChild;
 setCaret(node,2);
 const off=before(doc,'.');
 check(!off.defaultPrevented && doc.textContent==='..','La autocorrección debe comenzar desactivada');
 checkbox.checked=true;checkbox.dispatchEvent(new Event('change'));
 setCaret(node,2);
 const on=before(doc,'.');
 check(on.defaultPrevented,'Debe interceptar puntos al activar autocorrección');
 check(doc.textContent==='…','Debe reemplazar puntos con un solo signo');
 doc.innerHTML='<p>-</p>';node=doc.querySelector('p').firstChild;
 setCaret(node,1);before(doc,'-');
 check(doc.textContent==='—','Diálogo: raya solo al inicio de párrafo');
 doc.innerHTML='<p>abc-</p>';node=doc.querySelector('p').firstChild;
 setCaret(node,4);const inner=before(doc,'-');
 check(!inner.defaultPrevented,'No corregir guiones dentro del texto');
 doc.innerHTML='<p>..</p>';node=doc.querySelector('p').firstChild;
 setCaret(node,2);const composition=before(doc,'.',true);
 check(!composition.defaultPrevented,'No interferir con IME');
 doc.innerHTML='<p>Lod</p>';node=doc.querySelector('p').firstChild;
 setCaret(node,3);doc.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'d'}));
 check(!box.hidden,'Glosario sugerido mientras se escribe');
 check(box.querySelectorAll('button').length===2,'Solo términos del prefijo');
 check(doc.textContent==='Lod','No reescribir contenido con sugerencias');
 const btn=[...box.querySelectorAll('button')].find(b=>b.dataset.term==='Lodestone');
 check(btn,'Opción glosario');
 btn.click();
 check(doc.textContent==='Lodestone','Inserción deliberada del término');
 check(box.hidden,'Ocultar sugerencia tras insertar');
 check(doc.querySelector('script')===null,'Glosario no debe inyectar HTML');
 handle.dispose();
 output.dataset.status='pass';
 output.textContent='Fase 5: opt-in, IME, puntuación, glosario y cursor aprobados';
}catch(err){output.dataset.status='fail';output.textContent=err.stack||err.message;}

// Entrega 3 · QA Chromium local de navegación y propuestas, sin Supabase.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runChromiumCdp} from './chromium-cdp-check.mjs';
const html=String.raw`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/studio-productivity.css"></head><body>
<div class="s2"><div class="ed" id="editor"><div id="p-rev" class="ed-box"><div id="ed-review-case"></div></div>
<div id="ed-inline-actions" class="ed-inline-actions" hidden><button id="ed-inline-suggest" class="btn">Sugerir cambio</button>
<button id="ed-inline-note" class="btn">Anotar párrafo</button></div>
<div id="doc" contenteditable="true"><p>A  B ... "cita" Dragón</p><p>Segundo párrafo para anotar.</p></div></div></div>
<div id="qa-result" data-status="loading">Ejecutando…</div>
<script type="module">
import {attachAdvancedEditor} from '/editorial-advanced-editor.js';
const el=document.getElementById('qa-result'),root=document.getElementById('editor');
const doc=document.getElementById('doc'),panel=document.getElementById('p-rev'),toolbar=document.getElementById('ed-inline-actions');
const ok=(x,msg)=>{if(!x)throw Error(msg)};
let range=null,changes=0;const calls=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addon=attachAdvancedEditor({doc,root,reviewPanel:panel,inlinePanel:toolbar,getRange:()=>range,
 getBlocks:()=>[...doc.children],getTerms:()=>[{term:'dragón'}],can:()=>true,
 getDirty:()=>false,getConflict:()=>false,collaboration:{
  openWithSelection:excerpt=>calls.push({type:'suggest',excerpt}),
  openParagraphNote:(index,excerpt)=>calls.push({type:'note',index,excerpt})
 },changed:()=>changes++,showBlock:el=>el.scrollIntoView(),toast:s=>{throw Error(s)},
 openReview:()=>{panel.hidden=false},escapeHTML:esc});
try{
 addon.renderReview();
 ok(panel.textContent.includes('Caso 1 de'),'El navegador no muestra casos individuales');
 ok(panel.querySelector('[data-review-apply]'),'No existe corrección individual');
 const before=doc.textContent;
 panel.querySelector('[data-review-apply]').click();
 ok(changes===1&&doc.textContent!==before,'No se modificó únicamente el borrador');
 addon.renderReview();
 const p=doc.firstElementChild,first=p.firstChild;
 const sel=getSelection(),r=document.createRange();
 r.setStart(first,0);r.setEnd(first,3);range=r.cloneRange();
 sel.removeAllRanges();sel.addRange(r);document.dispatchEvent(new Event('selectionchange'));
 ok(!toolbar.hidden,'No aparece la barra de sugerencias sobre selección');
 const snap=doc.innerHTML;
 toolbar.querySelector('#ed-inline-suggest').click();
 ok(calls.length===1&&calls[0].type==='suggest'&&calls[0].excerpt.length>0,
  'La sugerencia no preserva el texto seleccionado');
 ok(doc.innerHTML===snap,'Una sugerencia modificó el capítulo');
 range=r.cloneRange();sel.removeAllRanges();sel.addRange(r);
 document.dispatchEvent(new Event('selectionchange'));
 toolbar.querySelector('#ed-inline-note').click();
 ok(calls.length===2&&calls[1].type==='note'&&calls[1].index===0,
   'La nota no conserva el párrafo y la versión local');
 ok(doc.innerHTML===snap,'Una nota alteró el capítulo');
 const count=panel.textContent.match(/Caso \d+ de (\d+)/);
 ok(count&&Number(count[1])>1,'No se encontraron casos de prueba');
 doc.dispatchEvent(new KeyboardEvent('keydown',{key:'j',altKey:true,shiftKey:true,bubbles:true}));
 ok(panel.textContent.includes('Caso 2 de'),'El atajo no navega entre casos');
 addon.dispose();
 el.dataset.status='pass';el.textContent='Entrega 3: navegación por incidencias, corrección única, selección y notas sin escrituras';
}catch(e){el.dataset.status='fail';el.textContent=e.stack||e.message}
</script></body></html>`;
const files={
 '/':html,
 '/editorial-advanced-editor.js':readFileSync('src/editorial-advanced-editor.js','utf8'),
 '/editorial-review-cases.js':readFileSync('src/editorial-review-cases.js','utf8'),
 '/studio-productivity.css':readFileSync('src/studio-productivity.css','utf8')
};
const server=createServer((req,res)=>{
 const path=new URL(req.url||'/','http://127.0.0.1').pathname;
 const has=Object.hasOwn(files,path);
 res.writeHead(has?200:404,{'Content-Type':path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':'text/html'});
 res.end(has?files[path]:'Not found');
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let chrome=process.env.QA_CHROME;
if(!chrome)for(const name of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){
 try{chrome=execFileSync('which',[name],{encoding:'utf8'}).trim();break}catch{}
}
assert(chrome,'Chromium requerido para la prueba de colaboración');
try{
 const r=await runChromiumCdp(chrome,'http://127.0.0.1:'+server.address().port+'/',60000);
 assert.equal(r.status,'pass',r.text+' '+r.stderr);
 console.log('✓ '+r.text);
}finally{await new Promise(ok=>server.close(ok))}

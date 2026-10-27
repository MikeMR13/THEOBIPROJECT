// Prueba real de diálogos de El Obi en Chromium, sin cuentas ni peticiones externas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn,execFileSync } from 'node:child_process';

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><output id="result" data-qa-status="running">RUNNING</output>
<script type="module">
const out=document.getElementById('result');
const check=(value,reason)=>{if(!value)throw Error(reason)};
window.confirm=()=>{throw Error('Se invocó ventana nativa confirm')};
window.alert=()=>{throw Error('Se invocó ventana nativa alert')};
window.prompt=()=>{throw Error('Se invocó ventana nativa prompt')};
try{
 const {confirmObi,inputObi,noticeObi}=await import('/obi-dialog.js');
 const closed=confirmObi('¿Eliminar esta lectura?');
 let dialog=document.querySelector('dialog.obi-dialog');
 check(dialog?.open===true,'confirmación no visible');
 check(dialog.getAttribute('aria-labelledby')==='obi-dialog-title','título accesible');
 check(getComputedStyle(dialog.querySelector('.obi-dialog-accept')).minHeight==='44px','botón táctil');
 dialog.querySelector('.obi-dialog-cancel').click();
 check(await closed===false,'Cancelar debe rechazar la acción');
 const accepted=confirmObi('¿Publicar este capítulo?');
 dialog=document.querySelector('dialog.obi-dialog');dialog.querySelector('.obi-dialog-accept').click();
 check(await accepted===true,'Confirmar debe autorizar la acción');
 const text=inputObi('Motivo de revocación',{title:'Revocar invitación',minLength:12,multiline:true});
 dialog=document.querySelector('dialog.obi-dialog');
 const field=dialog.querySelector('textarea');check(!!field,'Campo de texto en plataforma');
 field.value='corto';dialog.querySelector('.obi-dialog-accept').click();
 check(dialog.open,'Validación debe mantener abierto el diálogo');
 field.value='Razón suficiente';dialog.querySelector('.obi-dialog-accept').click();
 check(await text==='Razón suficiente','Texto confirmado incorrecto');
 const escaped=confirmObi('¿Descartar borrador?');
 dialog=document.querySelector('dialog.obi-dialog');
 dialog.dispatchEvent(new Event('cancel',{cancelable:true}));
 check(await escaped===false,'Escape nunca debe confirmar');
 const a=noticeObi('Primer mensaje'),b=confirmObi('Segunda pregunta');
 check(document.querySelectorAll('dialog.obi-dialog').length===1,'Los diálogos no deben solaparse');
 dialog=document.querySelector('dialog.obi-dialog');dialog.querySelector('.obi-dialog-accept').click();await a;
 dialog=document.querySelector('dialog.obi-dialog');check(dialog?.open===true,'La cola no avanzó');
 dialog.querySelector('.obi-dialog-cancel').click();check(await b===false,'La cola cambió el resultado');
 check(document.querySelectorAll('dialog.obi-dialog').length===0,'Se dejó un diálogo oculto');
 out.dataset.qaStatus='pass';out.textContent='Diálogos propios: confirmar/cancelar/texto/Escape/cola/accesibilidad — PASS';
}catch(e){out.dataset.qaStatus='fail';out.textContent=e.message}
</script></body></html>`;
const src=readFileSync('src/obi-dialog.js','utf8');
const server=createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url?.startsWith('/obi-dialog.js')){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});res.end(src)}
 else{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)}
});
const chrome=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(c=>{try{return execFileSync('which',[c],{encoding:'utf8'}).trim()}catch{return null}}).find(Boolean);
assert(chrome,'Chromium necesario para probar diálogos');
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const url='http://127.0.0.1:'+server.address().port+'/';
 const stdout=await new Promise((resolve,reject)=>{
  const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--virtual-time-budget=15000','--window-size=1100,900','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
  let output='',err='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>err+=c);
  child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(err.slice(-600))));
 });
 const m=stdout.match(/<output id="result" data-qa-status="(pass|fail)">([^<]*)<\/output>/);
 assert(m,'No se pudo leer el resultado del navegador');
 assert.equal(m[1],'pass',m[2]);console.log(m[2]);
}finally{server.close()}

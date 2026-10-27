// QA real del componente de diálogo: Firefox no requerido, Chromium local sin red externa.
// Prueba confirmación, cancelación, Escape, foco, prompt, alerta, cola y geometría móvil.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
const moduleSource=readFileSync(new URL('../src/dialogs.js',import.meta.url),'utf8');
const widths=[320,390,768,1024,1440];
const test=String.raw`
import {confirmObi,promptObi,alertObi} from '/dialogs.js';
const errs=[],result=document.getElementById('case-result');
const ok=(condition,message)=>{if(!condition)errs.push(message)};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const host=()=>document.querySelector('.obi-native-dialog');
const panel=()=>host()?.querySelector('.obi-native-panel');
const accept=()=>host()?.querySelector('[data-accept]');
const cancel=()=>host()?.querySelector('.obi-native-actions button:not([data-accept])');
const origin=document.getElementById('start');
async function visible(){
 await tick();await tick();
 ok(!!panel(),'no se montó diálogo');
 ok(panel()?.getAttribute('role')==='dialog','falta role=dialog');
 ok(panel()?.getAttribute('aria-modal')==='true','falta aria-modal');
 ok(!!panel()?.getAttribute('aria-labelledby'),'falta título accesible');
 const box=panel()?.getBoundingClientRect();
 if(box){ok(box.left>=-1&&box.right<=innerWidth+1,'desborda horizontalmente');ok(box.height<=innerHeight*0.96,'desborda verticalmente');}
 ok([...panel().querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=43),'controles táctiles pequeños');
}
(async()=>{
 origin.focus();
 const cancelWait=confirmObi('¿Eliminar el capítulo de ejemplo?');
 await visible();if(window.frameElement===window.parent.document.activeElement)ok(document.activeElement===cancel(),'foco inicial no es Cancelar');
 cancel().click();ok(await cancelWait===false,'Cancelar modificó decisión');
 ok(document.activeElement===origin,'no devuelve foco');
 const approveWait=confirmObi('¿Publicar ahora?');
 await visible();accept().click();ok(await approveWait===true,'Confirmar no devuelve true');
 const escWait=confirmObi('¿Borrar definitivamente?');
 await visible();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 ok(await escWait===false,'Escape no cancela');
 const fieldWait=promptObi('Nombre del tema','Anterior',{label:'Nombre',maxLength:45});
 await visible();const input=panel().querySelector('input');
 ok(input?.value==='Anterior','prompt no conserva valor previo');
 input.value='Tema dorado';accept().click();
 ok(await fieldWait==='Tema dorado','prompt no devuelve texto');
 const shareWait=promptObi('Copia el enlace','https://elobidellector.com',{readOnly:true,selectAll:true});
 await visible();const link=panel().querySelector('input');
 ok(link?.readOnly&&link.selectionStart===0,'enlace no es campo de solo lectura seleccionado');
 accept().click();await shareWait;
 const alertWait=alertObi('No se pudieron procesar algunos capítulos');
 await visible();ok(!cancel(),'un aviso no necesita botón cancelar');accept().click();await alertWait;
 const safe=confirmObi('<img src=x onerror=alert(1)>');
 await visible();ok(!panel().querySelector('img'),'el contenido de usuario se interpretó como HTML');
 accept().click();await safe;
 const first=confirmObi('Primera acción'),second=confirmObi('Segunda acción');
 await visible();ok(panel().querySelector('p')?.textContent==='Primera acción','cola: primer aviso perdido');
 accept().click();await first;await visible();
 ok(panel().querySelector('p')?.textContent==='Segunda acción','cola: segunda confirmación superpuesta');
 cancel().click();ok(await second===false,'cola: cancelación errónea');
 ok(host()?.hidden===true,'diálogo final quedó abierto');
 result.dataset.qaStatus=errs.length?'fail':'pass';
 result.textContent=errs.join(' | ')||'Diálogos UI accesibles en '+innerWidth+'px OK';
})().catch(err=>{result.dataset.qaStatus='fail';result.textContent='Excepción: '+err.message;});
`;
const sample='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
'<style>body{margin:0;padding:12px;background:#0e0c09;color:#f3e3c3;font:14px system-ui}button{min-height:44px}</style></head><body>'+
'<button type="button" id="start">Abrir confirmación</button><p id="case-result" data-qa-status="running">RUNNING</p>'+
'<script type="module">'+test+'</script></body></html>';
const frames=widths.map(w=>'<iframe src="/sample" width="'+w+'" height="800" title="Diálogos '+w+'"></iframe>').join('');
const parent='<!doctype html><html><head><meta charset="utf-8"></head><body><p id="qa-result" data-qa-status="running">RUNNING</p>'+frames+
'<script>let n=0;const timer=setInterval(()=>{const rs=[...document.querySelectorAll("iframe")].map(x=>x.contentDocument?.getElementById("case-result"));if(rs.every(x=>x&&x.dataset.qaStatus!=="running")||++n>900){clearInterval(timer);const bad=rs.flatMap((x,i)=>x?.dataset.qaStatus==="pass"?[]:['+JSON.stringify(widths)+'[i]+": "+(x?.textContent||"sin respuesta")]);const p=document.getElementById("qa-result");p.dataset.qaStatus=bad.length?"fail":"pass";p.textContent=bad.join(" | ")||"Diálogos Chromium 320/390/768/1024/1440 OK";}},20)</script></body></html>';
const server=createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; object-src 'none'");
 if(req.url==='/dialogs.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(moduleSource);}
 else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url?.startsWith('/sample')?sample:parent);}
});
const binary=process.env.QA_CHROME||['chromium','chromium-browser','google-chrome','google-chrome-stable'].map(s=>{try{return execFileSync('which',[s],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(binary,'Chromium no disponible');
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const url='http://127.0.0.1:'+server.address().port;
 const child=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-proxy-server','--virtual-time-budget=25000','--window-size=1600,900','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
 let output='',errors='';child.stdout.on('data',c=>output+=String(c));child.stderr.on('data',c=>errors+=String(c).slice(0,700));
 const status=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium excedió tiempo'))},60000);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('close',n=>{clearTimeout(timer);resolve(n)})});
 assert.equal(status,0,errors.slice(-1500));
 const match=output.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(match,'Falta resultado QA de diálogos');
 assert.equal(match[1],'pass',match[2]);
 console.log(match[2]);
}finally{await new Promise(resolve=>server.close(resolve));}

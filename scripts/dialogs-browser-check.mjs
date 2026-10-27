import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
const css=readFileSync('src/styles.css','utf8'), moduleSource=readFileSync('src/dialogs.js','utf8');
const checker="import {confirmInApp,promptInApp,alertInApp} from '/dialogs.js';\nconst q=document.getElementById('case-result'), base=document.getElementById('test-focus'), errors=[];\nconst tick=()=>new Promise(r=>setTimeout(r,35));\nconst assert=(ok,s)=>{if(!ok)errors.push(s)};\ntry {\n base.focus();\n const no=confirmInApp('¿Borrar el capítulo?');\n await tick();let d=document.querySelector('dialog.obi-dialog');\n assert(!!d?.open,'modal cerrado');assert(d?.getBoundingClientRect().left>=0&&d?.getBoundingClientRect().right<=innerWidth,'modal desbordado');\n assert(document.activeElement===d?.querySelector('.obi-dialog-cancel'),'foco en cancelar');\n d?.querySelector('.obi-dialog-cancel')?.click();assert(await no===false,'cancelar incorrecto');\n assert(document.activeElement===base,'no restaura foco');\n const yes=confirmInApp('¿Publicar?');\n await tick();d=document.querySelector('dialog.obi-dialog');d?.querySelector('.obi-dialog-accept')?.click();\n assert(await yes===true,'confirmar incorrecto');\n const p=promptInApp('Nuevo nombre','Mi tema');\n await tick();d=document.querySelector('dialog.obi-dialog');const field=d?.querySelector('textarea.obi-dialog-field');\n assert(field?.value==='Mi tema','valor inicial incorrecto');\n if(field)field.value='Nuevo nombre';\n d?.querySelector('.obi-dialog-accept')?.click();assert(await p==='Nuevo nombre','el campo no devolvió valor');\n const esc=promptInApp('Motivo');await tick();d=document.querySelector('dialog.obi-dialog');\n d?.dispatchEvent(new Event('cancel',{cancelable:true}));assert(await esc===null,'Escape no canceló');\n const a=alertInApp('No se pudo publicar');await tick();d=document.querySelector('dialog.obi-dialog');\n assert(d?.querySelector('.obi-dialog-cancel')?.hidden===true,'aviso con cancelar');\n d?.querySelector('.obi-dialog-accept')?.click();await a;\n const a1=confirmInApp('Primera acción'),a2=confirmInApp('Segunda acción');\n await tick();d=document.querySelector('dialog.obi-dialog');\n assert(document.querySelectorAll('dialog.obi-dialog').length===1,'diálogos superpuestos');\n d?.querySelector('.obi-dialog-cancel')?.click();await a1;await tick();\n d=document.querySelector('dialog.obi-dialog');\n assert(d?.querySelector('.obi-dialog-message')?.textContent==='Segunda acción','cola no ordenada');\n d?.querySelector('.obi-dialog-accept')?.click();assert(await a2===true,'segundo diálogo no resuelto');\n assert(!document.querySelector('dialog.obi-dialog'),'diálogo residual');\n}catch(e){errors.push(String(e?.stack||e))}\nq.dataset.qaStatus=errors.length?'fail':'pass';q.textContent=errors.join(' | ')||'OK';";
const page='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<main><h1>El Obi del Lector</h1><button id="test-focus">Abrir</button></main><p id="case-result" data-qa-status="running">RUNNING</p><script type="module">'+checker+'</script></body></html>';
const server=createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',req.url==='/dialogs.js'?'application/javascript; charset=utf-8':'text/html; charset=utf-8');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; connect-src 'none'");
 res.end(req.url==='/dialogs.js'?moduleSource:page);
});
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(c=>{try{return execFileSync('which',[c],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(chrome,'Se requiere Chromium de GitHub Actions');
async function run(width,url){
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-proxy-server','--virtual-time-budget=18000','--window-size='+width+',900','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
 let html='',err='';
 child.stdout.on('data',x=>html+=x);child.stderr.on('data',x=>err+=x);
 const code=await new Promise((resolve,reject)=>{const t=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium timeout'))},50000);child.once('error',e=>{clearTimeout(t);reject(e)});child.once('close',c=>{clearTimeout(t);resolve(c)})});
 assert.equal(code,0,'Chromium salió con errores '+err.slice(-650));
 const found=html.match(/<p id="case-result" data-qa-status="(pass|fail)">([^<]*)<\/p>/);
 assert(found,'Chromium no devolvió resultado en '+width+'px: '+html.slice(-600));
 assert.equal(found[1],'pass','Vista '+width+'px: '+found[2]);
}
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 const url='http://127.0.0.1:'+server.address().port;
 for(const width of [320,390,768,1440])await run(width,url);
 console.log('✓ Confirmar, cancelar, texto, aviso, Escape, foco y cola · 320/390/768/1440 px');
}finally{await new Promise(ok=>server.close(ok))}

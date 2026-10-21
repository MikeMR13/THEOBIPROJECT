// QA de continuidad TTS en Chromium con voz simulada: sin red ni audio externo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
const tts=readFileSync('src/tts.js','utf8');
const reader=readFileSync('src/reader.js','utf8');
assert(reader.includes('window.__obiReaderTTS = { info: ttsInfo, nextChapter: ttsNextChapter }'));
assert(reader.includes("!window.__obiTTS?.isActive?.()"),'El paginado visual no debe interrumpir TTS');
assert(reader.includes('data-k="autosecs"'),'Segundos ajustables desde Aa');
assert(tts.includes("document.addEventListener('visibilitychange'"),'Guardar estado al ocultar');
assert(tts.includes("window.addEventListener('pagehide', () => stop())"),'Salida segura');
assert(!tts.includes('<audio'), 'No debe incorporarse un reproductor de archivos de audio');

function fixture(){
 const q=document.getElementById('qa');
 const errors=[], synth={calls:[], cancelled:0,
   getVoices(){return [{voiceURI:'es-mx',name:'Español México',lang:'es-MX',localService:true}]},
   addEventListener(){},
   speak(u){this.calls.push(u);this.last=u},
   cancel(){this.cancelled++}
 };
 Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t},configurable:true});
 Object.defineProperty(window,'MediaMetadata',{value:function(x){Object.assign(this,x)},configurable:true});
 function check(value,msg){if(!value)throw Error(msg)}
 function delay(ms){return new Promise(r=>setTimeout(r,ms))}
 function chapter(id){
   return '<section class="rd"><nav class="rd-bar"><a class="rd-back">Novela</a><div class="rd-tools"><span class="rd-wide"></span><details><summary>⋯</summary><div class="rd-more-m"></div></details></div></nav><div id="rd-flow"><article class="rd-ch" data-ch="'+id+'"><header class="rd-head"><h2>Título '+id+'</h2></header><div class="rd-body"><p data-b="0">Párrafo narrado del capítulo '+id+'.</p></div></article></div></section>';
 }
 const app=document.getElementById('app');
 app.innerHTML=chapter('ch1');
 history.replaceState({},'','/leer/demo/1');
 let activeMode='off', allowAuto=true, secs=3, navCount=0;
 const bridge={
   info(id){
     if(id!=='ch1'&&id!=='ch2')return null;
     return {id,slug:'demo',user:'userA',num:id==='ch1'?1:2,
       continuous:activeMode,autonext:allowAuto,seconds:secs,
       canContinue:id==='ch1'&&activeMode==='all',
       next:id==='ch1'?{id:'ch2',num:2,vol:1}:null};
   },
   nextChapter(id,num){
     if(id!=='ch1'||num!==2)return false;
     navCount++;
     history.pushState({},'','/leer/demo/2');
     app.innerHTML='<p>Cargando capítulo...</p>';
     setTimeout(()=>{app.innerHTML=chapter('ch2')},20);
     return true;
   }
 };
 window.__obiReaderTTS=bridge;
 async function run(){
   try{
     await delay(120);
     check(app.querySelectorAll('[data-tts]').length===2,'Botones en escritorio y móvil');
     app.querySelector('[data-tts]').click();
     await delay(50);
     check(synth.last?.text==='Título ch1','Comienza primer capítulo');
     check(window.__obiTTS.isActive(),'Paginado visual queda suspendido mientras habla');
     const bkey='obi-tts-cursor-v1:userA:demo';
     check(JSON.parse(localStorage.getItem(bkey)).chapterId==='ch1','Marcador TTS guardado');
     synth.last.onend();
     check(synth.last.text.includes('Párrafo narrado'),'Avanza al siguiente fragmento');
     const c=synth.cancelled;
     Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
     document.dispatchEvent(new Event('visibilitychange'));
     check(synth.cancelled===c,'Ocultar pantalla no cancela lectura TTS');
     synth.last.onend();
     check(document.querySelector('.tts-status').textContent.includes('3 s'),'Espera comienza después del audio');
     await delay(1200);
     check(navCount===0,'No navegar antes de los segundos configurados');
     await delay(2200);
     check(navCount===1,'Navega al capítulo siguiente tras 3 segundos');
     await delay(150);
     check(location.pathname==='/leer/demo/2','Ruta SPA del capítulo 2');
     check(synth.last.text==='Título ch2','Audio continúa tras cambiar de capítulo');
     check(JSON.parse(localStorage.getItem(bkey)).chapterId==='ch2','Marcador actualizado al capítulo siguiente');
     const oldText=synth.last.text;
     document.dispatchEvent(new Event('visibilitychange'));
     window.dispatchEvent(new Event('pagehide'));
     check(!window.__obiTTS.isActive(),'Salir desactiva reproductor');
     check(localStorage.getItem(bkey),'Se conserva posición al salir');
     app.querySelector('[data-tts]').click();
     await delay(60);
     check(synth.last.text===oldText,'Retomar desde el mismo fragmento');
     document.querySelector('[data-t="close"]').click();
     check(!window.__obiTTS.isActive(),'Cerrar libera paginado visual');
     // Modo continuo: transición inmediata sin contador ni cambio de motor de voz.
     activeMode='all';allowAuto=false;navCount=0;
     history.replaceState({},'','/leer/demo/1');app.innerHTML=chapter('ch1');
     await delay(80);
     app.querySelector('[data-tts]').click();
     await delay(40);
     synth.last.onend();synth.last.onend();
     check(navCount===1,'Modo continuo avanza al terminar la voz sin espera');
     q.dataset.status='pass';q.textContent='PASS: 13 verificaciones de control, espera, continuidad, marcador y ocultación';
   }catch(e){q.dataset.status='fail';q.textContent=String(e.stack||e);}
 }
 setTimeout(run,20);
}
const page='<!doctype html><html lang="es"><body><main id="app"></main><output id="qa" data-status="running">RUNNING</output><script>('+fixture.toString()+')()</script><script>'+tts.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'No está instalado Chromium');
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const p=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--virtual-time-budget=19000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
 let out='',err='';
 p.stdout.on('data',d=>out+=String(d).slice(0,250000));p.stderr.on('data',d=>err+=String(d).slice(0,12000));
 const exit=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Chromium timeout'))},55000);p.once('error',e=>{clearTimeout(timer);fail(e)});p.once('close',c=>{clearTimeout(timer);ok(c)})});
 assert.equal(exit,0,err.slice(-700));
 const match=out.match(/<output id="qa" data-status="(pass|fail)">([\s\S]*?)<\/output>/);
 assert(match,'No hay resultado del navegador');
 assert.equal(match[1],'pass',match[2]);console.log('QA TTS: '+match[2]);
}finally{await new Promise(ok=>server.close(ok))}

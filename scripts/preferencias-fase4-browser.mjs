// Chromium real, backend simulado y cuatro anchuras para Preferencias.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

const views=[320,390,768,1280];
const source='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--gold:#f2c230;--paper:#eee2cf;--mute:#a79a82;--line:#665942}*,*:before,*:after{box-sizing:border-box}body{margin:0;padding:8px;background:#0d0c0a;color:var(--paper);font-family:Arial,sans-serif}</style></head><body><main id="app"></main><p id="result" data-qa-status="running">EJECUTANDO</p><script type="module" src="/harness.js"></script></body></html>';
const parent='<!doctype html><html><body><p id="qa-result" data-qa-status="running">EJECUTANDO</p><script>'+
  'const expected='+JSON.stringify(views)+';const results=new Map();'+
  'window.addEventListener("message",e=>{if(e.data?.type!=="qa-result")return;results.set(e.data.width,e.data);if(results.size===expected.length){const fails=[...results.values()].flatMap(x=>x.errors.map(err=>x.width+": "+err));const p=document.getElementById("qa-result");p.dataset.qaStatus=fails.length?"fail":"pass";p.textContent=fails.length?fails.join(" | "):"Preferencias fase 4: "+expected.join(",")+" px OK";}});'+
  'expected.forEach(w=>{const f=document.createElement("iframe");f.src="/case";f.width=w;f.height=1700;f.style.display="block";document.body.appendChild(f)});'+
  '</script></body></html>';
const server=createServer((req,res)=>{
 const path=(req.url||'/').split('?')[0];
 res.setHeader('Cache-Control','no-store');
 if(path==='/harness.js'){
  res.setHeader('Content-Type','text/javascript; charset=utf-8');
  res.end(readFileSync('scripts/qa-preferencias-browser-harness.js','utf8'));return;
 }
 if(['/profile.js','/reader-pref-cache.js','/preferences-preview.js'].includes(path)){
  res.setHeader('Content-Type','text/javascript; charset=utf-8');
  res.end(readFileSync('src/'+path.slice(1),'utf8'));return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(path==='/case'?source:parent);
});
const browser=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>{try{return execFileSync('which',[name],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(browser,'Chromium requerido');
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server','--incognito','--window-size=1500,900','--virtual-time-budget=22000','--dump-dom','http://127.0.0.1:'+server.address().port];
 const p=spawn(browser,args,{stdio:['ignore','pipe','pipe']});
 let out='',err='';
 p.stdout.on('data',d=>out+=String(d).slice(0,220000));
 p.stderr.on('data',d=>err+=String(d).slice(0,25000));
 const status=await new Promise((yes,no)=>{
  const timeout=setTimeout(()=>{p.kill('SIGKILL');no(Error('Chromium timeout'))},85000);
  p.once('error',e=>{clearTimeout(timeout);no(e)});
  p.once('close',code=>{clearTimeout(timeout);yes(code)});
 });
 assert.equal(status,0,err.slice(-1600));
 const result=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(result,'No se obtuvo resultado del navegador: '+out.slice(-2500)+' stderr '+err.slice(-1200));
 assert.equal(result[1],'pass',result[2]);
 console.log(result[2]);
}finally{await new Promise(resolve=>server.close(resolve))}

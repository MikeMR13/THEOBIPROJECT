// Fase 3: accesibilidad responsive con CSS real, datos ficticios y Chromium local.
// No informa LCP ni accesibilidad real de producción.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';

const html=readFileSync('src/index.html','utf8');
const ui=readFileSync('src/ui.js','utf8');
const match=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(match,'CSS2 de cabecera ausente');
const css=readFileSync('src/styles.css','utf8')+'\n'+readFileSync('src/reader-a11y.css','utf8')+'\n'+JSON.parse(match[1]);
const skip=html.match(/<a class="ob-skip"[^>]*>[^<]+<\/a>/)?.[0];
const header=html.match(/<header class="top">[\s\S]*?<\/header>/)?.[0];
assert(skip&&header&&skip.includes('href="#app"'),'Falta salto accesible al contenido');
assert(/<main id="app"[^>]*tabindex="-1"/.test(html),'Falta destino enfocable');
assert(html.includes('<html lang="es-419"'),'Falta idioma es-419');
assert(css.includes('@media(prefers-reduced-motion:reduce)'),'No se respeta movimiento reducido');
const widths=[320,375,390,430,768,1024];
function inspect(){
 const errors=[],w=document.documentElement.clientWidth;
 const skip=document.querySelector('.ob-skip'),rect=skip.getBoundingClientRect();
 if(rect.top>=0&&rect.bottom>0)errors.push('Salto visible sin foco');
 for(const [selector,label] of [
  ['.ob-skip','Salto'],['header.top nav a','Navegación'],['.ui-chip','Filtro'],
  ['.rd-back','Volver'],['.rd-tools button','Lector'],['.rd-panel[data-kind=toc] a','Índice']
 ]){
  const el=document.querySelector(selector);
  if(!el){errors.push('Ausente: '+label);continue}
  if(!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')continue;
  el.focus();const st=getComputedStyle(el);
  if(document.activeElement!==el||st.outlineStyle==='none'||parseFloat(st.outlineWidth)<2)errors.push('Foco no visible: '+label);
 }
 skip.focus();if(skip.getBoundingClientRect().top < -2)errors.push('Salto no aparece al enfocar');
 for(const [selector,label] of [['.rd-panel[data-kind=toc] a','Índice'],['.rd-tools button','Lector']]){
  const el=document.querySelector(selector);
  if(el.getBoundingClientRect().height<43.5)errors.push('Área táctil bajo 44px: '+label);
 }
 if(document.documentElement.scrollWidth>w+4)errors.push('Desbordamiento horizontal: '+document.documentElement.scrollWidth+'/'+w);
 const out=document.querySelector('#result');out.dataset.qa=errors.length?'fail':'pass';out.textContent=errors.join(' | ')||'Accesibilidad OK '+w;
}
function inspectParent(){
 const frames=[...document.querySelectorAll('iframe')],out=document.querySelector('#qa');let tries=0;
 const poll=()=>{
  const states=frames.map(f=>{try{const v=f.contentDocument.querySelector('#result');return [f.title,v?.dataset.qa||'running',v?.textContent||'sin respuesta']}catch(e){return[f.title,'running',String(e)]}});
  if(states.some(x=>x[1]==='running')&&++tries<600)return requestAnimationFrame(poll);
  const bad=states.filter(x=>x[1]!=='pass').map(x=>x[0]+': '+x[2]);
  out.dataset.qa=bad.length?'fail':'pass';out.textContent=bad.join(' | ')||'Accesibilidad responsive en seis anchuras OK';
 };
 requestAnimationFrame(poll);
}
const fixture='<!doctype html><html lang="es-419"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+
 '\n.qa{padding:12px;max-width:100%}.qa .rd{margin:12px 0;padding:12px;min-height:0}</style></head><body>'+skip+header+
 '<main id="app" class="qa" tabindex="-1"><h1>Lectura de prueba</h1><button class="ui-chip">Filtrar novelas</button>'+
 '<section class="rd"><div class="rd-bar"><div class="rd-where"><a class="rd-back" href="/catalogo">Volver a catálogo</a><span class="rd-left">Capítulo 1</span></div>'+
 '<div class="rd-tools"><button class="btn ghost">Índice</button><button class="btn ghost">Preferencias</button></div></div>'+
 '<nav class="rd-panel" data-kind="toc" aria-label="Índice de capítulos"><a href="#c1">Capítulo 1</a></nav>'+
 '<article class="rd-ch" id="c1"><h2>Una novela de prueba</h2><p>Contenido ficticio.</p></article></section>'+
 '<output id="result" data-qa="running">RUNNING</output></main><script>addEventListener("load",('+inspect.toString()+'))</script></body></html>';
const parent='<!doctype html><html lang="es"><body><p id="qa" data-qa="running">RUNNING</p>'+
 widths.map(w=>'<iframe src="/case" title="QA '+w+'" width="'+w+'" height="850"></iframe>').join('')+
 '<script>('+inspectParent.toString()+')()</script></body></html>';
const server=createServer((req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");
 res.end(req.url?.startsWith('/case')?fixture:parent);
});
const chrome=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(cmd=>{try{return execFileSync('which',[cmd],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Se requiere Chromium en GitHub Actions');
try {
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--window-size=1650,1000','--virtual-time-budget=18000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
 let out='',err='';browser.stdout.on('data',d=>out+=String(d));browser.stderr.on('data',d=>err+=String(d).slice(0,12000));
 const code=await new Promise((ok,fail)=>{const t=setTimeout(()=>{browser.kill('SIGKILL');fail(Error('Chromium timeout'))},65000);browser.once('error',e=>{clearTimeout(t);fail(e)});browser.once('close',n=>{clearTimeout(t);ok(n)})});
 assert.equal(code,0,err.slice(-800));const result=out.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(result,'Sin resultado de Chromium');assert.equal(result[1],'pass',result[2]);console.log(result[2]);
}finally{await new Promise(ok=>server.close(ok))}

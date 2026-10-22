// Preferencias fase 2 — geometría real del CSS en Chromium, con datos ficticios.
// Sin Supabase, sin sesiones y sin consultas externas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import vm from 'node:vm';

const profile=readFileSync('src/profile.js','utf8');
const cssStart='const CSS = `', a=profile.indexOf(cssStart), b=profile.indexOf('`;',a+cssStart.length);
assert(a>=0&&b>a,'CSS de perfil ausente');
const css=profile.slice(a+cssStart.length,b);
const findArray=prefix=>{
  const start=profile.indexOf(prefix);assert(start>=0,prefix);
  return vm.runInNewContext(profile.slice(start+prefix.length,profile.indexOf(';',start+prefix.length)));
};
const tabs=findArray('const TABS = '), groups=findArray('const NAV_GROUPS = ');
const dict=new Map(tabs);
const href=k=>'/preferencias'+(k==='perfil'?'':'?s='+k);
const nav=groups.map(([title,keys])=>'<div class="pf-nav-group"><p class="pf-nav-title">'+title+'</p>'+keys.map(k=>'<a '+(k==='lectura'?'class="on" aria-current="page" ':'')+'href="'+href(k)+'">'+dict.get(k)+'</a>').join('')+'</div>').join('');
const select='<label for="pf-mobile-tab">Sección de preferencias</label><select id="pf-mobile-tab" aria-label="Ir a otra sección de preferencias">'+groups.map(([name,keys])=>'<optgroup label="'+name+'">'+keys.map(k=>'<option value="'+k+'" '+(k==='lectura'?'selected':'')+'>'+dict.get(k)+'</option>').join('')+'</optgroup>').join('')+'</select>';
const checks=`
(() => {
 const errs=[], width=document.documentElement.clientWidth, mobile=width<=760;
 const by=s=>document.querySelector(s), css=e=>getComputedStyle(e), rect=e=>e.getBoundingClientRect();
 const side=by('.pf-nav'), chooser=by('.pf-mobile-nav'), sel=by('#pf-mobile-tab');
 if(!side||!chooser||!sel)errs.push('No se encuentra la navegación');
 else {
   if((css(side).display==='none')!==mobile)errs.push('Barra lateral incorrecta');
   if((css(chooser).display==='none')===mobile)errs.push('Selector móvil incorrecto');
   if(sel.value!=='lectura'||sel.options.length!==8||sel.querySelectorAll('optgroup').length!==4)errs.push('Opciones móviles incorrectas');
   if(side.querySelectorAll('a').length!==8||side.querySelectorAll('a[aria-current="page"]').length!==1)errs.push('Pestañas de escritorio incorrectas');
 }
 const touch=['.pf-tg','.pf-sw button','.pf-fav-remove','.lc-tabs button'];
 for(const k of touch)for(const el of document.querySelectorAll(k)) {
   const r=rect(el);if(r.width<43||r.height<43)errs.push(k+' demasiado pequeño: '+r.width+'x'+r.height);
 }
 if(document.documentElement.scrollWidth>width+3)errs.push('Desbordamiento a '+width+': '+document.documentElement.scrollWidth);
 for(const el of document.querySelectorAll('.pf-body,.pf-save,.pf-mobile-nav')) {
   const r=rect(el);if(r.left < -3 || r.right>width+3)errs.push(el.className+' recortado');
 }
 const p=by('#case-result');p.dataset.qaStatus=errs.length?'fail':'pass';p.textContent=errs.join(' | ')||'OK '+width;
})();
`;
function sample(){
 return '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--gold:#f2c230;--paper:#e9e1cd;--mute:#a49a87;--line:#504938}body{margin:0;padding:12px;background:#0d0c0a;color:var(--paper);font-family:Arial,sans-serif;box-sizing:border-box}*,*:before,*:after{box-sizing:border-box}</style><style>'+css+'</style></head><body><h1>Preferencias</h1><div class="pf"><nav class="pf-nav" aria-label="Secciones de preferencias">'+nav+'</nav><div class="pf-mobile-nav">'+select+'</div><div class="pf-body"><h2>Lectura</h2><p class="pf-note">Selecciona tu experiencia de lectura.</p><div class="pf-row"><span>Mostrar ilustraciones</span><button type="button" class="pf-tg" aria-pressed="true" aria-label="Mostrar ilustraciones"><i></i></button></div><div class="pf-f">Color de acento<div class="pf-sw"><button type="button" style="--swatch:#f2c230" class="on" aria-pressed="true" aria-label="Dorado"></button><button type="button" style="--swatch:#c9a8f2" aria-pressed="false" aria-label="Lavanda"></button></div></div><div class="lc-tabs"><button type="button" class="on" aria-pressed="true">Claro</button><button type="button" aria-pressed="false">Sepia</button><button type="button" aria-pressed="false">Oscuro</button></div><div class="pf-favs"><article class="pf-fav"><span class="lc-cv pf-fav-cover">Novela</span><span class="pf-fav-title">Novela</span><button class="pf-fav-remove" type="button" aria-label="Quitar novela">Quitar</button></article></div><div class="pf-save"><span class="mono">Guardado</span><a class="btn ghost" href="/perfil">Ver mi perfil</a><button class="btn" type="button">Guardar cambios</button></div></div></div><p id="case-result" data-qa-status="running"></p><script>'+checks+'</script></body></html>';
}
const widths=[320,390,760,768,1024,1440];
const parent='<html><body><p id="qa-result" data-qa-status="running"></p>'+widths.map(w=>'<iframe title="Ancho '+w+'" width="'+w+'" height="1000" src="/sample"></iframe>').join('')+'<script>const frames=[...document.querySelectorAll("iframe")];let count=0,err=[];frames.forEach(x=>x.addEventListener("load",()=>{const el=x.contentDocument.getElementById("case-result");if(el?.dataset.qaStatus!=="pass")err.push(x.width+": "+(el?.textContent||"No hay resultado"));if(++count===frames.length){const out=document.getElementById("qa-result");out.dataset.qaStatus=err.length?"fail":"pass";out.textContent=err.join("; ")||"Preferencias responsive 320/390/760/768/1024/1440 OK";}}));</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(req.url?.startsWith('/sample')?sample():parent)});
const binary=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(binary,'Chromium no está instalado');
try {
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server','--incognito','--window-size=1600,900','--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+server.address().port];
 const proc=spawn(binary,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
 proc.stdout.on('data',d=>out+=String(d).slice(0,180000));
 proc.stderr.on('data',d=>err+=String(d).slice(0,20000));
 const status=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{proc.kill('SIGKILL');fail(Error('Chromium agotó el tiempo'))},55000);proc.once('error',e=>{clearTimeout(timer);fail(e)});proc.once('close',n=>{clearTimeout(timer);ok(n)})});
 assert.equal(status,0,err.slice(-1000));
 const match=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(match,'No se encontraron resultados de Chromium');
 assert.equal(match[1],'pass',match[2]);
 console.log(match[2]);
} finally {await new Promise(ok=>server.close(ok))}

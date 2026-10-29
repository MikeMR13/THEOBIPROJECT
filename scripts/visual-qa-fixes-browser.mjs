// CSS real del Ranking y Login; prueba con Chromium gratuito, sin credenciales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
const ui=readFileSync('src/ui.js','utf8'),app=readFileSync('src/app.js','utf8'),index=readFileSync('src/index.html','utf8');
const css2=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(css2,'CSS2 no encontrada');
const q=String.fromCharCode(96), marker='const RK_CSS = '+q;
let i=ui.indexOf(marker);assert(i>=0,'Ranking CSS no encontrado');
let rankingCSS=ui.slice(i+marker.length).split(q+';')[0];
const navMarker='const SR_CSS = '+q,navStart=ui.indexOf(navMarker);
assert(navStart>=0,'CSS de navegación móvil no encontrado');
const navCss=ui.slice(navStart+navMarker.length).split(q+';')[0];
const css=readFileSync('src/styles.css','utf8')+'\n'+JSON.parse(css2[1])+'\n'+rankingCSS+'\n'+navCss;
assert(app.includes('class="ob-auth-page"'),'Formulario sin clase protectora');
const appVersion=Number(index.match(/app\.js\?v=(\d+)/)?.[1]||0);
const uiVersion=Number(index.match(/ui\.js\?v=(\d+)/)?.[1]||0);
const stylesVersion=Number(index.match(/styles\.css\?v=(\d+)/)?.[1]||0);
assert(appVersion>=34&&uiVersion>=56&&stylesVersion>=25,
 'Versiones de módulos no renovadas');
assert(app.includes('/ui.js?v='+uiVersion),'El app.js no coincide con la UI precargada');
const names=['Más leídas','Tendencia','Mejor calificadas','Más terminadas','Novedades en ascenso','Por equipo'];
const chips=names.map(n=>'<button class="ui-chip">'+n+'</button>').join('');
const page='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<header class="top"><a href="/">El Obi</a></header><main id="app">'+
 '<div class="rk-bar" id="rk"><div class="ui-chips">'+chips+'</div><div class="rk-seg"><button>Hoy</button><button>Semana</button></div></div>'+
 '<section class="ob-auth-page"><h1>Entrar</h1><div class="ob-auth-providers" style="display:grid;gap:14px;max-width:380px;margin:0 0 14px">'+
 '<button type="button" style="min-height:46px">Google</button><button type="button" style="min-height:46px">Patreon</button><div>O CON TU CORREO</div></div>'+
 '<form id="f" style="display:grid;gap:10px;max-width:380px"><label>Correo<input type="email"></label><label>Contraseña<input type="password"></label>'+
 '<p style="min-height:1.2em"></p><div id="cf-ts" style="min-height:65px;max-width:380px"></div><button id="go" class="btn">Entrar</button></form>'+
 '<p>¿No tienes cuenta? Regístrate</p></section></main>'+
 '<nav class="ob-tab"><a>Inicio</a><a>Catálogo</a><a>Biblioteca</a><a>Buscar</a><a>Perfil</a></nav>'+
 '<div id="result" data-status="running"></div><script>(function(){'+
 'const res=document.querySelector("#result");try{'+
 'const chips=[...document.querySelectorAll("#rk .ui-chip")];let n=0;'+
 'for(const b of chips){if(b.getBoundingClientRect().height<43.5)throw Error("Filtro "+b.textContent+" demasiado bajo");b.onclick=()=>n++;b.click()}'+
 'if(n!==6)throw Error("Seis filtros no reciben clic");'+
 'document.getElementById("rk").style.display="none";const button=document.getElementById("go");'+
 'button.scrollIntoView({block:"center",behavior:"instant"});'+
 'const r=button.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);'+
 'if(!(t===button||button.contains(t)))throw Error("Entrar está tapado");'+
 'if(r.height<43.5)throw Error("Entrar demasiado pequeño");'+
 'if(innerWidth<=760){const nav=document.querySelector(".ob-tab").getBoundingClientRect();if(r.bottom>nav.top-2)throw Error("Entrar debajo del menú");}'+
 'res.dataset.status="pass";res.textContent="OK 6 filtros y Entrar accesible";'+
 '}catch(e){res.dataset.status="fail";res.textContent=e.message}})();</script></body></html>';
const chrome=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser']
 .map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Falta Chromium');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(page)});
try{
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 for(const width of [320,390,768,1440]){
  const p=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-background-networking','--window-size='+width+',850','--virtual-time-budget=2300',
  '--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
  let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);
  const code=await new Promise((ok,no)=>{const t=setTimeout(()=>{p.kill('SIGKILL');no(Error('Timeout '+width))},45000);
   p.once('error',e=>{clearTimeout(t);no(e)});p.once('close',c=>{clearTimeout(t);ok(c)})});
  assert.equal(code,0,err.slice(-600));
  const m=out.match(/<div id="result" data-status="(pass|fail)">([^<]*)<\/div>/);
  assert(m,'Sin respuesta '+width);
  assert.equal(m[1],'pass',width+'px: '+m[2]);
  console.log('✓',width+'px',m[2]);
 }
}finally{server.closeAllConnections();await new Promise(ok=>server.close(ok))}

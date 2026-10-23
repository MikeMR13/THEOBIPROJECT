import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {publicationAge} from '../src/publication-dates.js';
const s=readFileSync('src/ui.js','utf8'), tick=String.fromCharCode(96);
const css2=s.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);assert(css2,'Falta CSS2');
const cssPart=n=>{let k='const '+n+' = '+tick,a=s.indexOf(k),b=s.indexOf(tick+';',a+k.length);assert(a>=0&&b>a,n);return s.slice(a+k.length,b)};
const css=readFileSync('src/styles.css','utf8')+'\n'+JSON.parse(css2[1])+'\n'+cssPart('CSS')+'\n'+cssPart('HOME_CSS')+'\n'+readFileSync('src/reader-a11y.css','utf8');
for(const x of ['@keyframes obTicker','function heroSlide(feat','const bindCars = root',"fill('ob-s-ann'",'id="ob-rank-car"','id="rk-team-tab"','id="rk-team-sel"','const drawTeam = async my','const card = (s, st, lc, p)','const ficha = (s, st, lc, i, p)','data-view="portadas"','id="cat-q"','data-page="prev"','F.gout.includes(g)',"$('#cat-top').onchange",'const ageTag =','.ob-pager2>span button[data-j]{height:44px!important'])assert(s.includes(x),'Elemento no conservado: '+x);
// El contenido de clasificaciones no se duplica en Inicio: cada categoría pertenece a Ranking.
const h=s.slice(s.indexOf('    app.innerHTML = `<div class="ob-page">'),s.indexOf('    const bindCars = root'));
assert(h.includes('Más leídas') && h.includes('Nuevos volúmenes y capítulos'),'Escaparates principales no conservados');
assert(h.indexOf('Nuevos volúmenes y capítulos') < h.indexOf('Continuar leyendo'),'Novedades deben aparecer antes de la biblioteca personal');
assert(!h.includes('ob-s-trend') && !h.includes('ob-s-rated') && !h.includes('Lo más visto de cada equipo'),'Inicio no debe duplicar clasificaciones');
assert(s.includes(".eq('period', 'semana').in('series_id', ids)"),'Ranking por equipo sin estadísticas semanales');
// Rendimiento: los datos auxiliares ya no retienen la primera visualización.
const homePerf=s.slice(s.indexOf('  async function home(){'),s.indexOf('  let heroPaused'));
assert(homePerf.includes('const [FD, prog, pr, VR] = await Promise.all(['),'Inicio vuelve a bloquear en destacados secundarios');
assert(homePerf.indexOf('Promise.all([trendRequest, teamRequest])')>homePerf.indexOf('app.innerHTML = \`<div class="ob-page">'),'La carga complementaria debe ocurrir tras pintar Inicio');
assert(homePerf.includes('loadedTeamSignature = teamSignature(teamResult?.data)'),'Se perdió la supervisión de destacados');
const rankPerf=s.slice(s.indexOf('  async function ranking(){'),s.indexOf('  async function ',s.indexOf('  async function ranking(){')+25));
assert(rankPerf.includes('const loadTeams = () => teamPromise ||='),'La vista Por equipo debe consultar equipos bajo demanda');
assert(!rankPerf.includes("const { data: gs } = await sb.from('series')"),'El ranking no debe bloquear esperando todos los equipos');
assert(rankPerf.includes('if (R.teamView) return drawTeam(my)'),'El ranking estándar debe cargar sin consulta de equipos');
// Navegación a la ficha: primer contenido visible antes de las consultas secundarias.
const appCode=readFileSync('src/app.js','utf8');
const seriesCode=s.slice(s.indexOf('  async function series(slug){'),s.indexOf('  // ---------- Ranking ----------'));
assert(seriesCode.includes("app.innerHTML = '<div class=\"ui-wrap ui-series-page\"><p class=\"mono\" role=\"status\">Cargando ficha de la novela"),'Falta estado inmediato al abrir una novela');
assert(seriesCode.includes('aria-busy="true"') && seriesCode.includes('Preparando capítulos, volúmenes y descargas'), 'Falta portada progresiva');
assert(seriesCode.indexOf('Preparando capítulos, volúmenes y descargas')<seriesCode.indexOf('const details = await Promise.all(['),'La portada se debe mostrar antes de esperar el índice');
assert(seriesCode.includes('const stillHere = () => seq === seriesSeq && location.pathname === targetPath'),'Una carga anterior podría sobrescribir otra página');
assert(seriesCode.includes('if (!details || !stillHere()) return'),'Falta protección de navegación al resolver detalles');
assert(s.includes('const prefetchSeries = slug =>') && s.includes('seriesCache.set(slug'),'Precarga de ficha no disponible');
assert(appCode.includes("document.addEventListener('pointerover', warmSeries") && appCode.includes("document.addEventListener('focusin', warmSeries"),'No se anticipa la carga de fichas');
assert(seriesCode.includes("d.locked || vLk") && seriesCode.includes("sb.rpc('series_downloads_v2'"),'No se deben modificar restricciones de descarga');
for(const bad of ['96','1996-01-01T00:00:00Z','not-a-date'])assert.equal(publicationAge(bad),'','Fecha fantasma');
// Regresión: las descargas aparecen en su propia pestaña, por volumen y accesibles.
const volMarkup=s.slice(s.indexOf('const dlOf = v =>'),s.indexOf("app.querySelectorAll('[data-buy]')"));
assert(volMarkup.includes('class="ui-dl ui-dl-featured"'),'Falta el bloque destacado');
assert(volMarkup.includes('role="group" aria-label="Descargas del volumen ${v.num}"'),'Falta nombre accesible');
assert(volMarkup.includes('id="serie-descargas"') && volMarkup.indexOf('ui-dl-featured')>volMarkup.indexOf('id="serie-descargas"'),'Descargas fuera de su panel');
assert(volMarkup.includes('href="#serie-descargas"'),'No hay acceso desde cada libro');
assert(volMarkup.includes('d.locked || vLk')&&volMarkup.includes('data-dl="${d.id}"'),'Protección o apertura alterada');
assert(css.includes('.ui-series-downloads .ui-dl-featured'),'Sin CSS de descargas en su pestaña');
const dots=Array.from({length:6},(_,i)=>'<button data-j="'+i+'" aria-current="'+(i===0)+'" style="height:10px;flex:0 0 10px;min-width:10px;position:relative;overflow:hidden;background:#555"><i class="ob-hp" style="position:absolute;inset:0;background:var(--gold)"></i></button>').join('');
const checker="addEventListener('load',()=>{const q=document.querySelector('#case'),errors=[],w=document.documentElement.clientWidth,p=document.querySelector('.ob-pager2');try{if(w<=760){for(const b of p.querySelectorAll('button')){const r=b.getBoundingClientRect();if(r.width<43||r.height<43)errors.push('botón pequeño '+Math.round(r.width)+'x'+Math.round(r.height));}const r=p.getBoundingClientRect();if(r.left< -3||r.right>w+3)errors.push('pager desbordado: '+Math.round(r.left)+'..'+Math.round(r.right)+' viewport '+w+' hero '+Math.round(document.querySelector('.ob-hero').getBoundingClientRect().width));}if(getComputedStyle(document.querySelector('.ob-track')).animationName==='none')errors.push('ticker inactivo');for(const selector of ['.ob-ann','.ob-car','.ui-card','.ui-fc'])if(!document.querySelector(selector))errors.push('ausente '+selector);}catch(e){errors.push(String(e))}q.dataset.status=errors.length?'fail':'pass';q.textContent=errors.join(';')||'PASS '+w;});";
const sample='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><style>body{margin:0;background:#0d0c0a}.ob-page{padding:16px;margin:auto;max-width:1200px}</style></head><body><div class="ob-page"><div class="ob-tick"><div class="ob-track"><span>NOVEDADES ·　</span><span>NOVEDADES ·　</span></div></div><section class="ob-hero"><div class="ob-cov"><div class="f"></div></div><div class="ob-txt"><h1>Novela</h1></div><div class="ob-pager2" style="position:absolute;left:16px;right:16px;bottom:14px;display:flex;align-items:center;gap:10px"><button data-j="5" style="width:40px;height:40px">‹</button><span style="display:flex;gap:6px;align-items:center;flex:1;min-width:0">'+dots+'</span><button data-hp aria-label="Pausar" style="height:40px;padding:0 12px">Ⅱ Pausar</button><button data-j="1" style="width:40px;height:40px">›</button></div></section><div class="ob-car"></div><div class="ob-anns"><article class="ob-ann">Aviso</article></div><div class="ui-grid"><a class="ui-card">Galería</a></div><a class="ui-fc">Fichero</a><p id="case" data-status="running"></p></div><script>'+checker+'</script></body></html>';
const sizes=[320,390,768,1024,1440];
const parent='<html><body><p id="qa" data-status="running">RUNNING</p>'+sizes.map(w=>'<iframe width="'+w+'" height="900" src="/sample"></iframe>').join('')+'<script>const ifs=[...document.querySelectorAll("iframe")];let n=0,bad=[];ifs.forEach(f=>f.addEventListener("load",()=>{let p=f.contentDocument.querySelector("#case");if(p?.dataset.status!=="pass")bad.push(f.width+": "+(p?.textContent||"sin resultado"));if(++n===ifs.length){let q=document.querySelector("#qa");q.dataset.status=bad.length?"fail":"pass";q.textContent=bad.join(" | ")||"QA_320_390_768_1024_1440_OK";}}));</script></body></html>';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(req.url?.startsWith('/sample')?sample:parent)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);assert(bin,'Chromium no disponible');
try{await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});const p=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--window-size=1600,1000','--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',d=>out+=String(d).slice(0,220000));p.stderr.on('data',d=>err+=String(d).slice(0,12000));const exit=await new Promise((ok,fail)=>{const to=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Chromium timeout'))},55000);p.once('error',e=>{clearTimeout(to);fail(e)});p.once('close',n=>{clearTimeout(to);ok(n)})});assert.equal(exit,0,err.slice(-700));const m=out.match(/<p id="qa" data-status="(pass|fail)">([\s\S]*?)<\/p>/);assert(m,'Sin resultado');assert.equal(m[1],'pass',m[2]);console.log('Fase 6.1: '+m[2]);}finally{await new Promise(ok=>server.close(ok))}
await import('./series-download-visibility-check.mjs');

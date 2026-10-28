// QA de la auditoría iPhone: tema de temporada, menú y títulos con CSS real.
// Chromium local + datos inventados; nunca conecta a Supabase ni a producción.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const index = readFileSync('src/index.html', 'utf8');
const ui = readFileSync('src/ui.js', 'utf8');
const m = ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(m, 'Falta el CSS dinámico de navegación');
const css = readFileSync('src/styles.css', 'utf8') + '\n' +
  readFileSync('src/reader-a11y.css', 'utf8') + '\n' + JSON.parse(m[1]);
const widths = [320,375,390,430,760,768,1024];
function inspect(S,mobile){
  const out = document.getElementById('result'), errors = [], fail = x => errors.push(x);
  const w = document.documentElement.clientWidth;
  const fake = { from(table){
    if (table === 'platform_settings') return {
      select(){return this}, eq(){return this},
      maybeSingle:async()=>({data:{seasons:{auto:['halloween'],intensity:'sutil',density:'pocas'}}})
    };
    if (table === 'season_calendar') return {
      select(){return this}, in(){return this}, not:async()=>({data:[]})
    };
    throw Error('Acceso de backend no permitido: ' + table);
  }};
  return (async()=>{
    await S.load(fake,true);
    if (S.platformKey(new Date('2026-10-28T12:00:00')) !== 'halloween')
      fail('Halloween no se activa dentro de su calendario');
    S.apply('home');
    const root = document.documentElement;
    if (root.dataset.season !== 'halloween') fail('Tema no aplicado a la página');
    if (!document.querySelector('header.top .ob-brand .obi-sea-stamp'))
      fail('Falta sello de temporada en la marca');
    const bg = document.querySelector('.obi-sea-pat');
    if (!bg || getComputedStyle(bg).zIndex === '-1') fail('Patrón estacional detrás del fondo');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = document.querySelector('.obi-sea-layer');
    if (!reduced && (!layer || Number(getComputedStyle(layer).zIndex) < 0))
      fail('Partículas invisibles detrás de la página');
    if (reduced && layer) fail('No se respetó movimiento reducido');
    if (!document.querySelector('#hero .obi-sea-cor'))
      fail('Faltan motivos de portada');
    const header=document.querySelector('header.top');
    const bottom=document.querySelector('.ob-tab');
    const links=[...bottom.querySelectorAll(':scope > a')];
    const more=bottom.querySelector('.ob-tab-more'),panel=bottom.querySelector('.ob-tab-panel');
    if (header.querySelector('.ob-mbtn')) fail('Hamburguesa superior persiste');
    if (links.length!==5||!more||!panel) fail('Navegación móvil incompleta');
    if (new Set(links.map(a=>a.getAttribute('href'))).size!==5) fail('Destinos principales duplicados');
    const extras=[...panel.querySelectorAll('a')];
    if (extras.map(a=>a.getAttribute('href')).join('|')!=='/calendario|/ranking|/apoyar')
      fail('Falta una sección secundaria');
    if(w<=760){
      const brand=header.querySelector('.ob-brand').getBoundingClientRect();
      const tools=header.querySelector('.ob-tools').getBoundingClientRect();
      if (brand.right>tools.left+2) fail('Marca y cuenta superpuestos');
      if (header.getBoundingClientRect().height>94) fail('Cabecera demasiado alta');
      if (getComputedStyle(header.querySelector('.ob-nav')).display!=='none') fail('Navegación superior duplicada');
      if (getComputedStyle(header.querySelector('.ob-search')).display!=='none') fail('Buscador superior invade cabecera');
      if (getComputedStyle(bottom).display!=='grid') fail('Falta barra inferior');
      if (getComputedStyle(bottom).gridTemplateColumns.split(' ').length!==6) fail('Seis espacios esperados');
      if (links.some(a=>a.getBoundingClientRect().height<43.5)||more.getBoundingClientRect().height<43.5)
        fail('Destinos inferiores demasiado pequeños');
      if(!panel.hidden||more.getAttribute('aria-expanded')!=='false')fail('Más debe iniciar cerrado');
      more.click();
      if(panel.hidden||more.getAttribute('aria-expanded')!=='true')fail('Más no abre');
      if(extras.some(a=>a.getBoundingClientRect().height<43.5))fail('Destino secundario demasiado pequeño');
      const pr=panel.getBoundingClientRect();
      if(pr.left< -2||pr.right>w+2)fail('Panel se sale del móvil');
      mobile.mark('/ranking');
      if(!more.classList.contains('on')||extras[1].getAttribute('aria-current')!=='page')
        fail('Falla estado activo de Ranking');
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      if(!panel.hidden||more.getAttribute('aria-expanded')!=='false'||document.activeElement!==more)
        fail('Escape no restaura foco');
      mobile.mark('/');
      if(more.classList.contains('on'))fail('Más sigue activo en Inicio');
      const title=document.querySelector('#hero h1').getBoundingClientRect();
      const cover=document.querySelector('#hero .ob-cov').getBoundingClientRect();
      if(w<=600&&title.top>=cover.top)fail('El título queda debajo de portada');
    }else{
      if(getComputedStyle(bottom).display!=='none')fail('Barra móvil en escritorio');
      if(getComputedStyle(header.querySelector('.ob-nav')).display==='none')fail('Menú escritorio no visible');
    }
    const category = document.querySelector('.ui-ch-type');
    const heading = document.querySelector('.ui-ch-name');
    const tag = document.querySelector('.ui-ch-meta .fx-tag');
    if (!tag || !tag.textContent.includes('NUEVO')) fail('Novedad fuera del bloque editorial');
    if (category.getBoundingClientRect().width > 145) fail('Categoría ocupa demasiado ancho');
    if (parseFloat(getComputedStyle(heading).fontSize) < 16.9)
      fail('Título reducido por debajo de 17 px');
    if (heading.getBoundingClientRect().width < Math.min(120, w * .32))
      fail('Título estrechado por otros elementos');
    for (const button of document.querySelectorAll('.ui-chl li>button')) {
      if (button.getBoundingClientRect().height < 43.5) fail('Botón táctil pequeño');
    }
    if (document.documentElement.scrollWidth > w + 4)
      fail('Desbordamiento horizontal: ' + document.documentElement.scrollWidth + '/' + w);
    out.dataset.qa = errors.length ? 'fail' : 'pass';
    out.textContent = errors.join(' | ') || 'Temporada, menú y títulos OK ' + w;
  })().catch(e => {out.dataset.qa='fail';out.textContent=String(e.stack||e)});
}
const sample = '<!doctype html><html lang="es-419"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>' + css + '\n.qa{max-width:100%;padding:12px;box-sizing:border-box}.qa .ui-vols{margin:12px 0}</style></head>'+
  '<body><header class="top">'+
  '<a href="/" class="ob-brand"><span class="ob-seal">帯</span><span class="ob-word"><b>El Obi del Lector</b></span></a>'+
  '<nav class="ob-nav"><a href="/">Inicio</a><a href="/catalogo">Catálogo</a><a href="/biblioteca">Mi biblioteca</a>'+
  '<a href="/calendario">Calendario</a><a href="/ranking">Ranking</a><a class="ob-sup" href="/apoyar">Apoyar</a></nav>'+

  '<div class="ob-tools"><input class="ob-search" type="search" aria-label="Buscar" placeholder="Buscar títulos, autores…">'+
  '<div id="session"><button type="button" aria-label="Continuar">続</button><button type="button" aria-label="Avisos">鈴</button></div></div></header>'+
  '<main id="app" class="qa" tabindex="-1"><section class="ob-hero" id="hero">'+
  '<div class="ob-cov"><div class="f"></div></div><div class="ob-txt"><h1>Secretos de la Bruja del Silencio</h1></div></section>'+
  '<div class="ui-wrap ui-series-page"><section class="ui-vols is-galeria"><article class="ui-vol ui-vol-book">'+
  '<div class="ui-v-content"><details class="ui-v-index" open><summary>Índice de capítulos y secciones <span>17 · desplegar</span></summary>'+
  '<ul class="ui-chl"><li><a href="/leer/demo/1"><span class="n" aria-hidden="true">◆</span>'+
  '<span class="ui-ch-display"><span class="ui-ch-meta"><small class="ui-ch-type">PRÓLOGO</small><em class="fx-tag">NUEVO</em></span>'+
  '<span class="ui-ch-name">Bernie Jones y Everett la Muda</span></span></a>'+
  '<button type="button" class="ui-read-chapter">✓ Leído</button><button type="button" class="obi-offline-btn">↓ Descargar capítulo</button>'+
  '</li></ul></details></div></article></section></div>'+
  '<p id="result" data-qa="running">RUNNING</p></main>'+
  '<script type="module">import * as S from "/season.js?v=4";import{createMobileNavigation,bindMobileNavigation}from "/mobile-navigation.js?v=1";'+
  'const tab=createMobileNavigation();document.body.appendChild(tab);const mobile=bindMobileNavigation(tab);'+
  'Promise.resolve((' + inspect.toString() + ')(S,mobile)).then(()=>{if(new URLSearchParams(location.search).has("panel"))mobile.button.click()});'+
  '</script></body></html>';

const parent = '<!doctype html><html lang="es"><body><p id="qa" data-qa="running">RUNNING</p>'+
  widths.map(w => '<iframe title="Ancho '+w+'" width="'+w+'" height="1350" src="/case"></iframe>').join('')+
  '<script>(()=>{const out=document.querySelector("#qa"),fs=[...document.querySelectorAll("iframe")];let turns=0;'+
  'const poll=()=>{const states=fs.map(f=>{try{const a=f.contentDocument.querySelector("#result");return[f.title,a?.dataset.qa||"running",a?.textContent||"sin resultado"]}catch(e){return[f.title,"running",String(e)]}});'+
  'if(states.some(s=>s[1]==="running")&&++turns<850)return requestAnimationFrame(poll);'+
  'const bad=states.filter(s=>s[1]!=="pass").map(s=>s[0]+": "+s[2]);out.dataset.qa=bad.length?"fail":"pass";out.textContent=bad.join(" | ")||"Siete anchuras OK";};requestAnimationFrame(poll)})()</script></body></html>';
const server = createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; frame-src 'self'");
  const path = new URL(req.url,'http://localhost').pathname;
  if (/^\/[\w-]+\.js$/.test(path)) {
    const src='src'+path;
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    if (!existsSync(src)) {res.statusCode=404;res.end('Not found');return}
    res.end(readFileSync(src)); return;
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(path==='/case'?sample:parent);
});
const chrome = process.env.QA_CHROME ||
  ['chromium','google-chrome','google-chrome-stable','chromium-browser']
    .map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Chromium no disponible');
try {
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  for (const reduced of [false,true]) {
    const args=['--headless=new','--no-sandbox','--no-first-run','--disable-gpu',
      '--disable-dev-shm-usage','--disable-background-networking','--window-size=1600,1050',
      '--virtual-time-budget=22000','--dump-dom'];
    if(reduced)args.push('--force-prefers-reduced-motion=reduce');
    args.push('http://127.0.0.1:'+server.address().port);
    const p=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
    let out='',err='';
    p.stdout.on('data',d=>{out+=String(d)});
    p.stderr.on('data',d=>{err+=String(d).slice(0,13000)});
    const code=await new Promise((ok,fail)=>{
      const t=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Timeout Chromium'))},70000);
      p.once('error',e=>{clearTimeout(t);fail(e)});
      p.once('close',c=>{clearTimeout(t);ok(c)});
    });
    assert.equal(code,0,err.slice(-700));
    const status=out.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);
    assert(status,'Sin resultado de DOM en Chromium '+(reduced?'reducido':'normal'));
    assert.equal(status[1],'pass',status[2]);
    console.log((reduced?'Movimiento reducido':'Normal')+': '+status[2]);
  }
  // Evidencia visual descargable durante 24 horas: fixture, NO captura de producción.
  // Chromium en el runner Linux, sin servicios pagos ni credenciales reales.
  mkdirSync('qa-capturas', {recursive:true});
  for (const [width,reduced,openMore] of [[320,false,false],[390,false,false],[430,false,false],[768,false,false],[390,true,false],[390,false,true]]) {
    const name = 'qa-capturas/temporada-menu-titulos-' + width + (reduced?'-movimiento-reducido':'') + (openMore?'-mas-abierto':'') + '.png';
    const args = [
      '--headless=new','--no-sandbox','--no-first-run','--disable-gpu',
      '--disable-dev-shm-usage','--disable-background-networking',
      '--hide-scrollbars','--window-size='+width+',1150',
      '--virtual-time-budget=9000','--screenshot='+name
    ];
    if(reduced) args.push('--force-prefers-reduced-motion=reduce');
    args.push('http://127.0.0.1:'+server.address().port+'/case'+(openMore?'?panel=more':''));
    const p=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
    let stderr='';
    p.stderr.on('data',d=>{stderr+=String(d).slice(0,12000)});
    p.stdout.resume();
    const code=await new Promise((ok,fail)=>{
      const t=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Timeout de captura '+name))},45000);
      p.once('error',e=>{clearTimeout(t);fail(e)});
      p.once('close',n=>{clearTimeout(t);ok(n)});
    });
    assert.equal(code,0,stderr.slice(-800));
    assert(existsSync(name) && statSync(name).size > 4000,'Captura vacía: '+name);
    console.log('Captura de fixture: '+name);
  }
} finally {await new Promise(ok=>server.close(ok))}

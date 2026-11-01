// QA visual específica de /descargas: temporada activa, texto responsive y botones alcanzables.
// Datos ficticios en Chromium local; no consulta Supabase, Vercel ni producción.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const read = f => readFileSync(f, 'utf8');
const appSource = read('src/app.js'), readerSource = read('src/reader.js');
assert(appSource.includes("app.classList.add('obi-downloads-page')"), 'La ruta debe aislar el fondo');
assert(readerSource.includes('class="off-empty"'), 'La vista vacía necesita texto responsive');
const ui = read('src/ui.js');
const match = ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(match, 'Falta CSS de cabecera de la aplicación');
const css = read('src/styles.css') + '\n' + read('src/reader-a11y.css') + '\n' + JSON.parse(match[1]);
const widths = [320, 390, 745, 1024], themes = ['halloween', 'muertos', 'navidad'];

function inspect(state, theme) {
  const errors = [], fail = s => errors.push(s);
  const app = document.querySelector('#app'), w = document.documentElement.clientWidth;
  const season = document.documentElement.dataset.season;
  const patt = document.querySelector('.obi-sea-pat');
  if (season !== theme) fail('Tema incorrecto: ' + season);
  if (!patt || getComputedStyle(patt).pointerEvents !== 'none') fail('Patrón intercepta interacción');
  if (getComputedStyle(app).backgroundColor !== 'rgb(13, 12, 10)') fail('Fondo transparente delante de la temporada');
  if (document.documentElement.scrollWidth > w + 2) fail('Desbordamiento horizontal: ' + document.documentElement.scrollWidth + '/' + w);
  for (const p of document.querySelectorAll('.off-empty')) {
    const rect = p.getBoundingClientRect(), style = getComputedStyle(p);
    if (rect.left < -2 || rect.right > w + 2 || p.scrollWidth > p.clientWidth + 2) fail('Texto del estado vacío cortado');
    if (style.whiteSpace !== 'normal' || style.overflowWrap !== 'anywhere') fail('El estado vacío no envuelve texto');
  }
  const buttons = [...document.querySelectorAll('#off .btn, .obi-downloads-page [data-install], .obi-downloads-page #off-retry')];
  if (buttons.length < (state === 'saved' ? 3 : 1)) fail('Botones insuficientes');
  for (const b of buttons) {
    const r = b.getBoundingClientRect();
    if (r.height < 43.5) fail('Botón táctil menor de 44px: ' + b.textContent);
    if (r.left < -2 || r.right > w + 2) fail('Botón fuera de pantalla: ' + b.textContent);
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || (hit !== b && !b.contains(hit))) fail('Elemento tapa el botón: ' + b.textContent);
  }
  const close = document.querySelector('.obi-sea-greet button');
  if (close && close.getBoundingClientRect().height < 43.5) fail('Cerrar saludo menor de 44px');
  const result = document.querySelector('#result');
  result.dataset.qa = errors.length ? 'fail' : 'pass';
  result.textContent = errors.join(' | ') || theme + ' · ' + state + ' · ' + w + 'px OK';
}

const empty = '<p class="off-empty">Todavía no tienes descargas en este dispositivo. Puedes guardar novelas, volúmenes o capítulos desde Obras y Mi biblioteca, o un volumen desde el lector.</p>';
const saved = '<div class="off-list"><div class="off-it"><span><b>Una novela con un título muy largo para probar anchuras pequeñas y saltos de línea</b><small>Volumen 4.5 · 18 capítulos · guardado 1 nov</small></span><a class="btn" href="/leer/obra/115">Continuar · cap. 115</a><button class="btn ghost" data-off="demo">Borrar</button></div></div>';
const fixture = (theme, state) => `<!doctype html><html lang="es-419"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<header class="top"><a class="ob-brand" href="/"><span class="ob-seal">帯</span><span class="ob-word"><b>El Obi del Lector</b></span></a></header>
<main id="app" class="obi-downloads-page"><div class="ui-cath"><div><h1>Mis descargas</h1><p>Capítulos y volúmenes guardados en este dispositivo para leer sin internet.</p><p class="mono">0 descargas guardadas en este dispositivo</p></div></div>
<div id="off">${state === 'empty' ? empty : saved}</div>
<p style="margin-top:18px"><button class="btn ghost" type="button" data-install>Instalar la app para leer sin conexión</button></p>
<output id="result" data-qa="running">RUNNING</output></main>
<script type="module">import * as S from '/season.js?v=5'; S.apply('page',{key:${JSON.stringify(theme)}}); (${inspect.toString()})(${JSON.stringify(state)},${JSON.stringify(theme)});</script></body></html>`;
const cases = themes.flatMap(t => widths.flatMap(w => ['empty','saved'].map(state => ({t,w,state}))));
const parent = '<!doctype html><html><body><p id="qa" data-qa="running">RUNNING</p>' +
  cases.map(c => '<iframe title="' + c.t + ' ' + c.w + ' ' + c.state + '" src="/case?theme=' + c.t + '&state=' + c.state + '" width="' + c.w + '" height="870"></iframe>').join('') +
  '<script>(()=>{const result=document.querySelector("#qa"),frames=[...document.querySelectorAll("iframe")];let tries=0;const poll=()=>{const states=frames.map(f=>{try{const x=f.contentDocument.querySelector("#result");return[f.title,x?.dataset.qa||"running",x?.textContent||"sin respuesta"]}catch(e){return[f.title,"running",String(e)]}});if(states.some(s=>s[1]==="running")&&++tries<1000)return requestAnimationFrame(poll);const bad=states.filter(s=>s[1]!=="pass").map(s=>s[0]+": "+s[2]);result.dataset.qa=bad.length?"fail":"pass";result.textContent=bad.join(" | ")||"24 casos: Halloween, Muertos, Navidad; vacío y guardado; 320–1024px OK"};requestAnimationFrame(poll)})()</script></body></html>';
const server = createServer((req,res) => {
  const u=new URL(req.url,'http://localhost'),path=u.pathname;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; frame-src 'self'");
  if (/^\/[\w-]+\.js$/.test(path)) {
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    try {res.end(read('src'+path));}catch{res.statusCode=404;res.end('Not found');} return;
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(path === '/case' ? fixture(u.searchParams.get('theme')||'muertos',u.searchParams.get('state')||'empty') : parent);
});
const chrome=process.env.QA_CHROME || ['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(n=>{try{return execFileSync('which',[n],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Chromium debe estar disponible en GitHub Actions');
try {
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  const p=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--window-size=1500,1050','--virtual-time-budget=25000','--dump-dom','http://127.0.0.1:'+server.address().port],{stdio:['ignore','pipe','pipe']});
  let out='',err='';p.stdout.on('data',d=>out+=String(d));p.stderr.on('data',d=>err+=String(d).slice(0,12000));
  const code=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{p.kill('SIGKILL');fail(Error('Tiempo agotado Chromium'))},85000);p.once('error',e=>{clearTimeout(timer);fail(e)});p.once('close',n=>{clearTimeout(timer);ok(n)})});
  assert.equal(code,0,err.slice(-900));
  const result=out.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(result,'Chromium no entregó resultado de la prueba visual');
  assert.equal(result[1],'pass',result[2]);
  console.log(result[2]);
} finally {await new Promise(ok=>server.close(ok))}

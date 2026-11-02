// Regresión aislada del Catálogo en WebKit (motor de Safari).
// Sirve el build local, intercepta Supabase con datos ficticios y nunca toca producción.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { webkit } from 'playwright';

assert(existsSync('dist/app.js') && existsSync('dist/index.html'), 'Compilar antes del test WebKit');
const ui = readFileSync('src/ui.js', 'utf8');
const cat = ui.slice(ui.indexOf('  async function catalog(){'), ui.indexOf('  // ---------- Lanzamientos ----------'));
const agenda = readFileSync('src/agenda.js','utf8');
const appSource = readFileSync('src/app.js','utf8');
assert(ui.includes('const SERIES_FAST = SERIES.replace('), 'Las vistas públicas deben evitar los conteos SQL lentos');
assert(!ui.includes('.select(SERIES)'), 'Ninguna ruta pública debe solicitar los conteos anidados originales');
assert(ui.includes('await softWait(creditsRequest, null, 650)'), 'Inicio no debe bloquearse por créditos');
assert(ui.includes('void creditsRequest.then(() => {'), 'Créditos tardíos deben hidratarse después del primer dibujo');
assert(agenda.includes('id="ag-retry"') && agenda.includes('agendaVisitSeq'), 'Calendario requiere reintento y protección de navegación');
assert(appSource.includes('routeRenderSeq') && appSource.includes('id="profile-retry"'), 'Navegación y perfil deben recuperarse');
assert(cat.includes("SERIES.replace(',chapters(count),volumes(count)', '')"), 'La consulta inicial no debe solicitar conteos anidados');
assert(cat.indexOf('    draw();\n    // Mostrar primero las obras') < cat.indexOf('const [counted] = await Promise.all(['),
  'El catálogo debe aparecer antes de los conteos y créditos');
assert(cat.includes('const live = () => request === catalogRequestSeq'), 'Las respuestas tardías deben ser descartadas');
assert(cat.includes('id="cat-retry"'), 'Debe existir reintento después de errores');
const lab = readFileSync('scripts/performance-full-routes-lab-check.mjs', 'utf8');
const a = lab.indexOf('function fakeCreateClient(){');
const b = lab.indexOf('\nfunction instrument(){', a);
assert(a >= 0 && b > a, 'Falta simulador de Supabase existente');
let mock = lab.slice(a, b);
assert(mock.includes('select(){return q}'), 'Contrato del simulador cambió');
mock = mock.replace('select(){return q}', "select(fields){ if(name==='series' && String(fields).includes('chapters(count)')) throw Error('Conteos costosos en primera consulta'); return q }");
mock = mock.replace("let data=name==='series'?Q.series", "if(name==='series' && Q.failSeries)throw Error('HTTP 500 de prueba');\n     let data=name==='series'?Q.series");
mock = mock.replace('then(ok,bad){return Promise.resolve(q.result()).then(ok,bad)}',
  "then(ok,bad){if(name==='series_last'&&Q.hangLatest)return new Promise(()=>{}).then(ok,bad);if(name==='series'&&Q.delaySeries)return new Promise(resolve=>setTimeout(()=>resolve(q.result()),Q.delaySeries)).then(ok,bad);return Promise.resolve(q.result()).then(ok,bad)}");
assert(mock.includes('Q.hangLatest') && mock.includes('Q.failSeries'), 'Falta inyección de fallos del simulador');
mock = mock.replace('rpc:async(name,opts)=>{', "rpc:async(name,opts)=>{if(name==='series_public_credits'&&Q.hangCredits)return new Promise(()=>{});if(name==='agenda_events'&&Q.delayAgenda)return new Promise(resolve=>setTimeout(()=>resolve({data:[],error:null}),Q.delayAgenda));");
assert(mock.includes('Q.hangCredits') && mock.includes('Q.delayAgenda'), 'El laboratorio debe simular esperas en otras pestañas');
mock += '\nexport { fakeCreateClient as createClient };\n';

const work = {
  id:'mock-01',team_id:'team-01',slug:'obra-prueba',title:'Novela de prueba en Safari',
  short:'Prueba pública',original:'Original',author:'Autora de ejemplo',synopsis:'Sinopsis de laboratorio',
  genres:['Fantasía'],tags:[],theme:{color:'#a48c46'},cover_path:null,cover_thumb_path:null,
  translation_status:'active',original_status:'ongoing',work_type:'Novela ligera',published:true,
  adult:false,views:7,teams:{name:'Traducción de prueba',slug:'equipo-prueba',color:'#a48c46'},
  chapters:[{count:2}],volumes:[{count:1}]
};
const fixture = {
  series:[work],latest:[{series_id:work.id,num:2,publish_at:new Date().toISOString()}],
  ranks:[{series_id:work.id,pos:1,score:9,list:'leidas',period:'semana'}],volumes:[],settings:{id:1,seasons:{}},
  feed:{series:[work],latest:[],rkW:[],rkH:[],top10:[],nextRel:[],featured:[],reviews:[],ann:[]}
};
let origin = '';
const root = resolve('dist');
const index = readFileSync('dist/index.html','utf8');
const server = createServer((req,res) => {
  const path = new URL(req.url,origin||'http://localhost').pathname;
  if(path==='/config.js'){
    res.setHeader('Content-Type','application/javascript');
    return res.end('window.OBI_CONFIG='+JSON.stringify({url:origin,key:'sb_publishable_fake',preview:true})+';');
  }
  if(path==='/supabase.js'){
    res.setHeader('Content-Type','application/javascript');
    return res.end(mock);
  }
  if(path==='/sw.js'){
    res.setHeader('Content-Type','application/javascript');
    return res.end('// Sin service worker para este test aislado.');
  }
  if(['/', '/catalogo', '/buscar', '/ranking', '/calendario'].includes(path)){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end(index);
  }
  const file = resolve(root,'.'+path);
  if(!file.startsWith(root+'/') || !existsSync(file)){res.statusCode=404;return res.end('No existe');}
  const mime = {'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml',
    '.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(readFileSync(file));
});
let browser;
try {
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
  origin='http://127.0.0.1:'+server.address().port;
  browser=await webkit.launch({headless:true});
  const makePage=async flags=>{
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    const page=await ctx.newPage();
    await page.addInitScript(data=>{window.OBI_FIXTURE=data}, {...fixture,...flags});
    await page.route('https://**/*',route=>route.abort());
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    return {ctx,page,errors};
  };
  // 1. Una consulta secundaria que jamás responde no puede impedir el catálogo.
  {
    const {ctx,page,errors}=await makePage({hangLatest:true});
    await page.goto(origin+'/catalogo');
    await page.waitForSelector('#cat-grid .ui-fc',{timeout:10000});
    assert.match(await page.locator('#cat-grid').innerText(),/Novela de prueba en Safari/);
    assert.equal(errors.length,0,'Errores JavaScript inesperados: '+errors.join(', '));
    await ctx.close();
  }
  // 2. Un HTTP 500 simulado muestra reintento; al recuperar la red aparecen las obras.
  {
    const {ctx,page,errors}=await makePage({failSeries:true});
    await page.goto(origin+'/catalogo');
    await page.waitForSelector('#cat-retry',{timeout:10000});
    await page.evaluate(()=>{window.OBI_FIXTURE.failSeries=false});
    await page.locator('#cat-retry').click();
    await page.waitForSelector('#cat-grid .ui-fc',{timeout:10000});
    assert.equal(errors.length,0,'Errores JavaScript inesperados al reintentar: '+errors.join(', '));
    await ctx.close();
  }
  // 3. Una consulta inicial lenta no debe devolver al lector al catálogo tras salir.
  {
    const {ctx,page,errors}=await makePage({delaySeries:1700});
    await page.goto(origin+'/catalogo');
    await page.locator('nav.ob-tab a[href="/"]').click();
    await page.waitForTimeout(2100);
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal(await page.locator('#cat-grid').count(),0,'Una consulta anterior sobrescribió la nueva pantalla');
    assert.equal(errors.length,0,'Errores JavaScript durante navegación: '+errors.join(', '));
    await ctx.close();
  }
  // 4. Inicio debe mostrar contenido aunque la RPC de créditos no responda.
  {
    const {ctx,page,errors}=await makePage({hangCredits:true});
    await page.goto(origin+'/');
    await page.waitForSelector('.ob-page',{timeout:12000});
    assert.equal(errors.length,0,'Inicio con créditos lentos: '+errors.join(', '));
    await ctx.close();
  }
  // 5. Buscar y Ranking deben recuperar novelas sin los conteos SQL anidados.
  {
    const {ctx,page,errors}=await makePage({});
    await page.goto(origin+'/buscar?q=Novela');
    await page.waitForSelector('#sr-res .sr-g',{timeout:12000});
    assert.match(await page.locator('#sr-res').innerText(),/Novela de prueba en Safari/);
    await page.goto(origin+'/ranking');
    await page.waitForSelector('#rk .rk-c',{timeout:12000});
    assert.equal(errors.length,0,'Buscar y Ranking: '+errors.join(', '));
    await ctx.close();
  }
  // 6. Calendario no debe reemplazar otra pestaña si llega una respuesta tardía.
  {
    const {ctx,page,errors}=await makePage({delayAgenda:1650});
    await page.goto(origin+'/calendario');
    await page.locator('nav.ob-tab a[href="/buscar"]').click();
    await page.waitForSelector('#sr-q',{timeout:10000});
    await page.waitForTimeout(1900);
    assert.equal(new URL(page.url()).pathname,'/buscar');
    assert.equal(await page.locator('#ag-body').count(),0,'Calendario antiguo sobrescribió la pestaña Buscar');
    assert.equal(errors.length,0,'Navegación Calendario: '+errors.join(', '));
    await ctx.close();
  }
  // 7. El calendario también muestra su vista cuando no hay errores de servidor.
  {
    const {ctx,page,errors}=await makePage({});
    await page.goto(origin+'/calendario');
    await page.waitForSelector('#ag-body',{timeout:12000});
    assert.equal(errors.length,0,'Calendario: '+errors.join(', '));
    await ctx.close();
  }
  console.log('✓ WebKit 390 px: Catálogo, Inicio, Buscar, Ranking y Calendario; créditos lentos, HTTP 500 y cambios de pestaña');
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}

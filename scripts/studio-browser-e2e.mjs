// Navegador Chromium real + servidor HTTP efímero en 127.0.0.1.
// Solo sirve código local del repositorio; mock Supabase sin credenciales,
// cookies, claves reales ni servicios externos. No requiere paquetes nuevos.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const root = process.cwd();
const whitelist = new Map([
 ['/studio.js','src/studio.js'],
 ['/studio-works-utils.js','src/studio-works-utils.js'],
 ['/studio-works-view.js','src/studio-works-view.js'],
 ['/prelaunch-discovery.js','src/prelaunch-discovery.js'],
 ['/studio-cover-image.js','src/studio-cover-image.js'],
 ['/obi-dialog.js','src/obi-dialog.js'],
 ['/studio-team-permissions.js','src/studio-team-permissions.js'],
 ['/studio-diffusion.js','src/studio-diffusion.js'],
 ['/diffusion-panel.js','src/diffusion-panel.js'],
 ['/diffusion.css','src/diffusion.css'],
 ['/studio-seo.js','src/studio-seo.js'],
 ['/seo-settings.js','src/seo-settings.js'],
 ['/studio-collaboration-picker.js','src/studio-collaboration-picker.js'],
 ['/studio-series-publication.js','src/studio-series-publication.js'],
 ['/studio-preview-share.js','src/studio-preview-share.js'],
 ['/studio-reader-defaults.js','src/studio-reader-defaults.js'],
 ['/reader-team-defaults.js','src/reader-team-defaults.js'],
 ['/studio-work-fields.js','src/studio-work-fields.js'],
 ['/studio-related-works.js','src/studio-related-works.js'],
 ['/studio-related-editor.js','src/studio-related-editor.js'],
 ['/paging.js','src/paging.js'],
 ['/volume-cover-gallery.js','src/volume-cover-gallery.js'],
 ['/volume-cover-gallery.css','src/volume-cover-gallery.css'],
 ['/series-cover-editor.js','src/series-cover-editor.js'],
 ['/series-cover-editor.css','src/series-cover-editor.css'],
 ['/section-types.js','src/section-types.js'],
 ['/chapter-title-display.js','src/chapter-title-display.js'],
 ['/reader-headings.js','src/reader-headings.js'],
  ['/editorial-announcements.js','src/editorial-announcements.js'],
 ['/studio.css','src/studio.css'],
 ['/studio-obras.css','src/studio-obras.css'],
 ['/reader-a11y.css','src/reader-a11y.css'],
 ['/studio-editor.js','src/studio-editor.js'],
 ['/studio-importer.js','src/studio-importer.js'],
 ['/import-safety.js','src/import-safety.js'],
 ['/studio-media.js','src/studio-media.js'],
 ['/blocks.js','src/blocks.js'],
 ['/__qa__/fixture.mjs','scripts/fixtures/studio-browser-fixture.mjs'],
 ['/__qa__/parent.js','scripts/fixtures/studio-browser-parent.js']
]);
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio QA — datos ficticios</title><link rel="stylesheet" href="/reader-a11y.css"></head><body><p id="qa-result" data-qa-status="running">QA_BROWSER_RUNNING</p><main id="app"></main><script type="module" src="/__qa__/fixture.mjs"></script></body></html>';
const compact = width => '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio QA — '+width+'px</title></head><body><p id="qa-result" data-qa-status="running">QA_BROWSER_RUNNING</p><iframe title="Estudio responsive a '+width+'px" id="qa-frame" width="'+width+'" height="844" style="border:0" src="/"></iframe><script src="/__qa__/parent.js"></script></body></html>';
const server = createServer((req,res)=>{
  const u = new URL(req.url || '/', 'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; form-action 'none'; frame-src 'self'");
  if (u.pathname === '/') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); res.end(u.searchParams.get('compact')==='1'?compact([320,390,768].includes(Number(u.searchParams.get('width')))?Number(u.searchParams.get('width')):390):html);return;
  }
  const file=whitelist.get(u.pathname);
  if (!file) {res.writeHead(404);res.end('Not found');return;}
  try{
    const ext=file.endsWith('.css');
    res.writeHead(200,{'Content-Type':ext?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});
    res.end(readFileSync(resolve(root,file)));
  }catch(e){res.writeHead(500);res.end('QA fixture unavailable');}
});
function chromeBinary(){
  if(process.env.QA_CHROME)return process.env.QA_CHROME;
  for(const binary of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{return execFileSync('which',[binary],{encoding:'utf8'}).trim()}catch{}
  }
  throw new Error('Chrome/Chromium no está instalado en el runner de CI');
}
async function runBrowser(binary,port,viewport){
  const args=[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--disable-component-update',
    '--no-first-run','--no-default-browser-check','--disable-extensions',
    '--no-proxy-server','--incognito','--window-size='+(viewport.startsWith('mobile')?'900,960':viewport),
    '--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+port+'/'+(viewport.startsWith('mobile')?'?compact=1&width='+Number(viewport.slice(6)):'')
  ];
  const proc=spawn(binary,args,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  proc.stdout.on('data',chunk=>{stdout+=String(chunk).slice(0,500000);});
  proc.stderr.on('data',chunk=>{stderr+=String(chunk).slice(0,200000);});
  const code=await new Promise((fulfill,reject)=>{
    const timer=setTimeout(()=>{proc.kill('SIGKILL');reject(new Error('Chromium excedió 45 segundos; '+stderr.slice(-600)))},45000);
    proc.once('error',e=>{clearTimeout(timer);reject(e)});
    proc.once('close',c=>{clearTimeout(timer);fulfill(c)});
  });
  if(code!==0)throw new Error('Chromium terminó con código '+code+' '+stderr.slice(-1000));
  const match=stdout.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
  if(!match)throw new Error('No se obtuvo resultado del DOM ('+viewport+'): '+stdout.slice(-950)+' '+stderr.slice(-600));
  if(match[1]!=='pass')throw new Error('Fallo en navegador ('+viewport+'): '+match[2].slice(0,1500));
  console.log('Chromium '+viewport+': '+match[2].replace(/&[^;]+;/g,' '));
}
try{
  const bin=chromeBinary();
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
  const port=server.address().port;
  for(const v of ['1280,900','1024,900','mobile320','mobile390','mobile768']) await runBrowser(bin,port,v);
  console.log('Navegador real: flujos Studio, permisos, carga diferida y CSS OK; sin red externa');
}finally{
  await new Promise(done=>server.close(done));
}

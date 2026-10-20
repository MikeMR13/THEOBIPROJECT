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
 ['/studio-preview-share.js','src/studio-preview-share.js'],
 ['/studio.css','src/studio.css'],
 ['/studio-editor.js','src/studio-editor.js'],
 ['/studio-importer.js','src/studio-importer.js'],
 ['/studio-media.js','src/studio-media.js'],
 ['/blocks.js','src/blocks.js'],
 ['/__qa__/fixture.mjs','scripts/fixtures/studio-browser-fixture.mjs'],
 ['/__qa__/parent.js','scripts/fixtures/studio-browser-parent.js']
]);
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio QA — datos ficticios</title></head><body><p id="qa-result" data-qa-status="running">QA_BROWSER_RUNNING</p><main id="app"></main><script type="module" src="/__qa__/fixture.mjs"></script></body></html>';
const compact = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio QA — 390px</title></head><body><p id="qa-result" data-qa-status="running">QA_BROWSER_RUNNING</p><iframe title="Estudio con viewport móvil" id="qa-frame" width="390" height="844" style="border:0" src="/"></iframe><script src="/__qa__/parent.js"></script></body></html>';
const server = createServer((req,res)=>{
  const u = new URL(req.url || '/', 'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; form-action 'none'; frame-src 'self'");
  if (u.pathname === '/') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); res.end(u.searchParams.get('compact')==='1'?compact:html);return;
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
    '--no-proxy-server','--incognito','--window-size='+(viewport==='mobile390'?'900,960':viewport),
    '--virtual-time-budget=12000','--dump-dom','http://127.0.0.1:'+port+'/'+(viewport==='mobile390'?'?compact=1':'')
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
  for(const v of ['1280,900','mobile390']) await runBrowser(bin,port,v);
  console.log('Navegador real: flujos Studio, permisos, carga diferida y CSS OK; sin red externa');
}finally{
  await new Promise(done=>server.close(done));
}

// Chromium real, CSS real de Studio, sin backend ni dependencias nuevas.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const files={
 '/styles.css':'src/styles.css','/studio.css':'src/studio.css',
 '/studio-seo.js':'src/studio-seo.js','/seo-settings.js':'src/seo-settings.js',
 '/obi-dialog.js':'src/obi-dialog.js',
 '/__qa__/test.mjs':'scripts/fixtures/seo-noindex-browser-qa.mjs'
};
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/studio.css"></head><body class="in-studio"><main><div class="s2"><aside class="s2-side" aria-label="Estudio">El Obi</aside><div class="s2-main" id="app" style="min-width:0"><div id="wk-seo-form" style="padding:16px;min-width:0"></div></div></div></main><p id="qa-result" data-status="running">SEO QA…</p><script type="module" src="/__qa__/test.mjs"></script></body></html>';
const server=createServer((req,res)=>{
  const path=(req.url||'/').split('?')[0];
  if(path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return}
  if(!files[path]){res.writeHead(404);res.end('Not found: '+path);return}
  try{res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});
      res.end(readFileSync(files[path]));}
  catch(e){res.writeHead(500);res.end(e.message)}
});
const chrome=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{
  try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}
}).find(Boolean);
assert(chrome,'Chromium no está instalado en el runner');
async function check(url,width){
  const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--window-size='+width+',900','--virtual-time-budget=5500','--dump-dom',url],
    {stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',b=>{out+=String(b)});
  child.stderr.on('data',b=>{err+=String(b).slice(0,20000)});
  const exit=await new Promise((resolve,reject)=>{
    const t=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium no respondió en 25s'))},25000);
    child.once('error',e=>{clearTimeout(t);reject(e)});
    child.once('close',code=>{clearTimeout(t);resolve(code)});
  });
  assert.equal(exit,0,err.slice(-1200));
  const match=out.match(/<p id="qa-result" data-status="(pass|fail)">([\s\S]*?)<\/p>/);
  assert(match,'Sin respuesta del QA: '+out.slice(-1100)+' '+err.slice(-500));
  assert.equal(match[1],'pass','Ancho '+width+': '+match[2]);
  console.log('SEO noindex '+width+'px: '+match[2]);
}
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const url='http://127.0.0.1:'+server.address().port+'/';
  for(const width of [390,768,1365])await check(url,width);
}finally{await new Promise(resolve=>server.close(resolve))}

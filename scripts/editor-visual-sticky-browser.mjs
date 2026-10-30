// Smoke visual de la barra sticky: hojas reales de src/styles.css,
// src/studio.css y la CSS2 inyectada por src/ui.js (no CSS inventado).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runChromiumCdp} from './chromium-cdp-check.mjs';

const ui=readFileSync('src/ui.js','utf8');
const base=readFileSync('src/styles.css','utf8');
const studio=readFileSync('src/studio.css','utf8');
const fixture=readFileSync('scripts/fixtures/editor-visual-sticky-fixture.mjs','utf8');
const match=ui.match(/const CSS2 = ("(?:[^"\\]|\\.)*");/);
assert(match,'No se pudo extraer la CSS2 real del sitio');
const css2=JSON.parse(match[1]);
assert(base.includes('html,body{overflow-x:clip}'),'La hoja base ya no conserva overflow-x:clip');
assert(ui.includes('body{overflow-x:clip}'),'El parche en CSS2 no está presente');
assert(!ui.includes('body{overflow-x:hidden}'),'La anulación dañina ha regresado');
assert(css2.includes('body{overflow-x:clip}'),'La hoja inyectada sigue anulando overflow-x:clip');
assert(/\.ed-bar\{position:sticky/.test(base),'La barra dejó de ser sticky');
assert(/body\.in-studio \.ed-bar/.test(studio),'Se perdió el offset sticky del Estudio');

const content=Array.from({length:190},(_,i)=>'<p class="ed-line">Párrafo de prueba '+(i+1)+' con texto de longitud normal para desplazar la página sin alterar datos de producción.</p>').join('');
const frame=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/studio.css"><link rel="stylesheet" href="/ui-css2.css"></head>
<body class="in-studio"><main id="app"><div class="s2">
<aside class="s2-side"><strong>Estudio</strong><nav class="s2-nav"><a href="#ed">Editor</a></nav></aside>
<section class="s2-main"><div class="ed" id="ed">
<div class="ed-top"><label>Título <input value="Capítulo largo de prueba"></label></div>
<div class="ed-bar" role="toolbar" aria-label="Formato"><button class="ed-btn">Párrafo</button><button class="ed-btn">Negrita</button><button class="ed-btn">Cursiva</button><button class="ed-btn">Furigana</button><button class="ed-btn">Buscar y reemplazar</button></div>
<div class="ed-split" data-view="edit"><div class="ed-docw"><div class="ed-doc" id="doc">${content}</div></div></div>
</div></section></div></main></body></html>`;
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="qa-result" data-status="loading">Cargando Chromium…</div><div id="fixture-screen"></div><script type="module" src="/fixture.mjs"></script></body></html>';
const paths={'/':html,'/sticky-frame.html':frame,'/styles.css':base,'/studio.css':studio,'/ui-css2.css':css2,'/fixture.mjs':fixture};
const server=createServer((req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1');
 const found=Object.hasOwn(paths,url.pathname);
 res.writeHead(found?200:404,{'Content-Type':url.pathname.endsWith('.mjs')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(found?paths[url.pathname]:'No encontrado');
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let chrome=process.env.QA_CHROME;
if(!chrome)for(const name of ['chromium','chromium-browser','google-chrome','google-chrome-stable'])try{
 chrome=execFileSync('which',[name],{encoding:'utf8'}).trim();break;
}catch{}
assert(chrome,'Se necesita Chromium real para comprobar position:sticky');
try{
 const result=await runChromiumCdp(chrome,'http://127.0.0.1:'+server.address().port+'/',60000);
 assert.equal(result.status,'pass',result.text+' '+result.stderr);
 console.log('✓ Parche visual '+result.text);
}finally{await new Promise(ok=>server.close(ok));}

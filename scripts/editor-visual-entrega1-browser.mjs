// Editor visual Entrega 1. Local Chromium, sin Supabase ni usuarios reales.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runChromiumCdp} from './chromium-cdp-check.mjs';
import {chapterPreviewModel,tagPreviewBlock,previewBlockScrollTop} from '../src/editorial-visual-preview.js';
const editor=readFileSync('src/studio-editor.js','utf8');
const studio=readFileSync('src/studio.js','utf8');
const css=readFileSync('src/studio.css','utf8');
const globalCss=readFileSync('src/styles.css','utf8');
const fixture=readFileSync('scripts/fixtures/editor-visual-entrega1-fixture.mjs','utf8');
assert.equal(chapterPreviewModel({title:'Capítulo 12: La gran batalla'}).heading,'La gran batalla');
assert.equal(chapterPreviewModel({title:'Capítulo 12: La gran batalla'}).label,'Capítulo 12');
assert.equal(chapterPreviewModel({title:'Prólogo: Bienvenidos',sectionType:'Prólogo'}).label,'Prólogo');
assert.match(tagPreviewBlock('<p class="hello">Hi</p>',2),/data-ed-block="2"/);
assert.equal(previewBlockScrollTop(null,null),null);
for(const marker of [
 'id="ttl" rows="2" maxlength="300"',
 'id="ttlcount"',
 'titleCount();',
 'if($(\'#ttl\').value.trim().length>300)',
 'chapterPreviewModel({title:tt,sectionType:meta.section_type,blocks})',
 'tagPreviewBlock(renderBlock(block,index,{media}),index)',
 'queuePreviewSync();',
 'previewBlockScrollTop(pv,target)',
 'previewManualUntil=Date.now()+2500',
 'ed-panels-menu','ed-top-actions'
])assert(editor.includes(marker),'Falta contrato de entrega visual: '+marker);
assert(studio.includes('ed-loading')&&studio.length<280000,'Sin esqueleto o Studio excede límite 280k');
assert(css.includes('.ed-panels-actions')&&css.includes('.ed-title-label')&&css.includes('.ed-pv-active'),'CSS visual insuficiente');
const text=Array.from({length:190},(_,i)=>'<p class="ed-line">Párrafo de prueba '+i+' lorem ipsum, lectura cómoda y contenido largo.</p>').join('');
const reader=Array.from({length:110},(_,i)=>'<p data-ed-block="'+i+'">Párrafo del lector '+i+' con contenido correspondiente a la traducción.</p>').join('');
const frame=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/studio.css"></head>
<body class="in-studio"><main><div class="s2"><aside class="s2-side">Estudio</aside><section class="s2-main">
<div class="ed"><div class="ed-top"><label class="ed-title-label" for="ttl">Título <span id="ttlcount">90 / 300</span></label><textarea id="ttl" rows="2" maxlength="300"></textarea>
<div class="ed-top-actions"><span id="state">Guardado</span><button id="save">Guardar</button><details class="ed-panels-menu"><summary>Revisión y equipo</summary><div class="ed-panels-actions"><button>Revisar</button></div></details></div><div class="ed-pub" id="pub">Publicación</div></div>
<div class="ed-bar" role="toolbar">Negrita · Cursiva · Buscar</div>
<div class="ed-split" data-view="split"><div class="ed-docw"><div class="ed-doc">${text}</div></div>
<div class="ed-pvw"><div class="ed-pvbar">Vista del lector</div><div class="ed-pv"><div class="rd"><article class="rd-ch"><div class="rd-body">${reader}</div></article></div></div></div></div>
</section></div></main></body></html>`;
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="qa-result" data-status="loading">Comprobando…</div><script type="module" src="/fixture.mjs"></script></body></html>';
const urls={'/':html,'/editor-visual-frame.html':frame,'/styles.css':globalCss,'/studio.css':css,
 '/fixture.mjs':fixture,'/editorial-visual-preview.js':readFileSync('src/editorial-visual-preview.js','utf8'),
 '/chapter-title-display.js':readFileSync('src/chapter-title-display.js','utf8'),
 '/reader-headings.js':readFileSync('src/reader-headings.js','utf8')};
const server=createServer((req,res)=>{
 const path=new URL(req.url||'/','http://127.0.0.1').pathname,exists=Object.hasOwn(urls,path);
 res.writeHead(exists?200:404,{'Content-Type':/\.m?js$/.test(path)?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(exists?urls[path]:'No encontrado');
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let chrome=process.env.QA_CHROME;
if(!chrome)for(const exe of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){
 try{chrome=execFileSync('which',[exe],{encoding:'utf8'}).trim();break;}catch{}
}
assert(chrome,'Chromium obligatorio en QA visual');
try{
 const r=await runChromiumCdp(chrome,'http://127.0.0.1:'+server.address().port+'/',75000);
 assert.equal(r.status,'pass',r.text+' '+r.stderr);
 console.log('✓ Entrega 1: '+r.text);
}finally{await new Promise(ok=>server.close(ok));}

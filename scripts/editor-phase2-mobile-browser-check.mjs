// QA móvil del editor: HTTP local y Chromium sin cuentas ni servicios externos.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runChromiumCdp} from './chromium-cdp-check.mjs';
const editor=readFileSync('src/studio-editor.js','utf8');
const blocks=readFileSync('src/blocks.js','utf8');
const css=readFileSync('src/styles.css','utf8');
const fixture=readFileSync('scripts/fixtures/editor-phase2-mobile-fixture.mjs','utf8');
for(const marker of [
 "window.matchMedia?.('(max-width: 760px)').matches ? 'edit' : 'split'",
 'class="ed-mobile-view"',
 'role="group" aria-label="Modo de edición en pantalla pequeña"',
 'aria-pressed',
 "doc.addEventListener('keydown'",
 "['Enter',' '].includes(e.key)",
 "f.click()",
 "root.querySelector('[data-act=\"find\"]')",
 'id="ed-toolbar-hint"'
]) assert(editor.includes(marker),'Falta contrato de accesibilidad: '+marker);
assert(blocks.includes('contenteditable="false" tabindex="0" role="button"'),'La figura carece de activación con teclado');
assert(css.includes('.ed-mobile-view')&&css.includes('.ed-bar{max-width:100%;flex-wrap:nowrap;overflow-x:auto'),'Falta barra móvil horizontal');
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><p id="qa-result" data-status="loading"></p><script type="module" src="/fixture.mjs"></script></body></html>';
const server=createServer((req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1');
 const value=url.pathname==='/fixture.mjs'?fixture:url.pathname==='/blocks.js'?blocks:url.pathname==='/styles.css'?css:html;
 res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')||url.pathname.endsWith('.mjs')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(value);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let chrome=process.env.QA_CHROME;
if(!chrome) for(const exe of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){try{chrome=execFileSync('which',[exe],{encoding:'utf8'}).trim();break;}catch{}}
assert(chrome,'Chromium es obligatorio para QA Fase 2');
try{
 const result=await runChromiumCdp(chrome,'http://127.0.0.1:'+server.address().port+'/',60000);
 assert.equal(result.status,'pass',result.text+' '+result.stderr);
 console.log('✓ Fase 2: '+result.text);
}finally{await new Promise(ok=>server.close(ok));}

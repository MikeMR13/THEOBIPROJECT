// QA Fase 5: contratos de conservación + Chromium local sin credenciales ni backend.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runChromiumCdp} from './chromium-cdp-check.mjs';
import {typingCorrection,glossarySuggestions,textPrefix,TYPING_PREF_KEY} from '../src/editorial-writing-tools.js';
assert.equal(TYPING_PREF_KEY,'obi-editor-autocorrect-v1');
assert.deepEqual(typingCorrection('..','.'),{remove:2,insert:'…'});
assert.deepEqual(typingCorrection('-','-',true),{remove:1,insert:'—'});
assert.equal(typingCorrection('abc-','-',true),null);
assert.equal(typingCorrection('..','x'),null);
assert.equal(textPrefix('Capítulo de Lodes'),'Lodes');
assert.equal(textPrefix('A '),'');
assert.deepEqual(glossarySuggestions([{term:'Mango'},{term:'Mandarina'},{term:'Mango'},{term:'Otra'}],'Man').map(t=>t.term),['Mango','Mandarina']);
const editor=readFileSync('src/studio-editor.js','utf8');
const css=readFileSync('src/styles.css','utf8');
for(const marker of ["attachWritingTools({","id=\"ed-smart-typing\"","id=\"ed-gloss-inline\"",
 "definition').eq('series_id', c.series_id)","queueDraft();","draftTimer=setTimeout",
 "if(dirty)flushDraft()","addEventListener('pagehide',flushDraft)",
 "clearTimeout(draftTimer); draftTimer=0; localStorage.removeItem(KEY)"]){
 assert(editor.includes(marker),'Fase 5: falta contrato '+marker);
}
assert(!editor.includes("localStorage.setItem(KEY, JSON.stringify({ html: doc.innerHTML"),'No persistir copia local en cada tecla');
assert(css.includes('::highlight(obi-ed-glossary-current)')&&css.includes('.ed-gloss-inline'),'Glosario no tiene estilo visible');
const code=readFileSync('src/editorial-writing-tools.js','utf8');
for(const marker of ['if(!checkbox.checked||composing||e.isComposing','e.preventDefault()',
 'document.execCommand(\'insertText\'','document.createTextNode','setAttribute',
 'node.textContent','rangeForInsertion=info.r.cloneRange()']){
 if(marker==='setAttribute'||marker==='node.textContent')continue;
 assert(code.includes(marker),'Falta protección contra corrupción '+marker);
}
const fixture=readFileSync('scripts/fixtures/editor-phase5-writing-fixture.mjs','utf8');
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>#doc{min-height:80px;border:1px solid}</style></head><body><p id="qa-result" data-status="loading"></p><label><input type="checkbox" id="toggle"> Autocorrección</label><div id="doc" contenteditable="true" role="textbox"></div><div id="hints" hidden></div><script type="module" src="/fixture.mjs"></script></body></html>';
const server=createServer((req,res)=>{
 const path=new URL(req.url||'/','http://127.0.0.1').pathname;
 const value=path==='/fixture.mjs'?fixture:path==='/editorial-writing-tools.js'?code:html;
 res.writeHead(200,{'Content-Type':path.endsWith('.js')||path.endsWith('.mjs')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; connect-src 'none'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'"});
 res.end(value);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let chrome=process.env.QA_CHROME;
if(!chrome)for(const exe of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){try{chrome=execFileSync('which',[exe],{encoding:'utf8'}).trim();break;}catch{}}
assert(chrome,'Chromium obligatorio para QA Fase 5');
try{
 const result=await runChromiumCdp(chrome,'http://127.0.0.1:'+server.address().port+'/',60000);
 assert.equal(result.status,'pass',result.text+' '+result.stderr);
 console.log('✓ Fase 5: '+result.text);
}finally{await new Promise(ok=>server.close(ok));}

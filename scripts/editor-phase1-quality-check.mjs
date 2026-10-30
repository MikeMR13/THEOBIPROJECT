// Fase 1: checks reales sobre importador/editor, sin Supabase ni cuentas/medios externos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {lintImportedBlocks,inspectImport,isDecorativeImage} from '../src/editorial-import-quality.js';
import {runChromiumCdp} from './chromium-cdp-check.mjs';

const blocks=[
 {type:'heading',text:'Un prólogo'},
 {type:'paragraph',text:'—Una historia...  con  errores , y un signo?'},
 {type:'image',url:'img:one.png',alt:''},
 {type:'image',url:'img:two.png',alt:'Boceto de un faro'},
 {type:'image',url:'img:three.png',alt:'',decorative:true}
];
const orig=structuredClone(blocks);
const one=lintImportedBlocks(blocks);
assert.equal(one.counts.alt,1);
assert.equal(one.counts.dbl,2);
assert.equal(one.counts.dots,1);
assert.equal(one.counts.space,1);
assert.equal(one.counts.open,1);
assert.equal(one.total,Object.values(one.counts).reduce((a,b)=>a+b,0));
assert.deepEqual(blocks,orig,'La revisión no debe reescribir el original');
assert.equal(isDecorativeImage(blocks[4]),true);
assert.equal(isDecorativeImage(blocks[2]),false);
const all=inspectImport([
 {title:'A',blocks},
 {title:'Omitida',skip:true,blocks:[{type:'image',url:'x',alt:''}]},
 {title:'B',blocks:[{type:'paragraph',text:'Sin alertas.'}]}
]);
assert.equal(all.chapters.length,2);
assert.equal(all.counts.alt,1);
assert.equal(all.withWarnings,1);
assert.equal(lintImportedBlocks([{t:'img',src:'x'}]).counts.alt,1,'Alias heredado');

const importer=readFileSync('src/studio-importer.js','utf8');
const editor=readFileSync('src/studio-editor.js','utf8');
const shared=readFileSync('src/blocks.js','utf8');
const css=readFileSync('src/styles.css','utf8');
for(const [src,marker] of [
 [importer,"inspectImport(inc)"],
 [importer,"data-image-alt"],
 [importer,"data-image-deco"],
 [importer,"qualityPreflight.total && !await confirmObi"],
 [importer,"lint:report.counts,lint_count:report.total"],
 [importer,"body:rows[i].body,lint:rows[i].lint,lint_count:rows[i].lint_count"],
 [importer,"lint,lint_count,deleted_at"],
 [importer,"editorial_quality:{"],
 [editor,"f.dataset.decorative !== '1'"],
 [editor,"id=\\\"askdeco\\\""],
 [editor,"['all','gloss'].includes(d.fix) && !await confirmObi"],
 [shared,"data-decorative="],
 [shared,"decorative:true"],
 [css,".imp-quality-images{"]
])assert(src.includes(marker),'Falta contrato: '+marker);

const page=`<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><p id="qa-result" data-status="loading"></p>
<script type="module">
import {blocksToEditor,editorToBlocks,renderBlock} from '/blocks.js';
import {lintImportedBlocks} from '/editorial-import-quality.js';
const el=document.getElementById('qa-result');
try {
 const source=[
 {type:'image',url:'img:decor.png',alt:'',decorative:true,caption:'Adorno'},
 {type:'image',url:'img:untagged.png',alt:''},
 {type:'image',url:'img:meaning.png',alt:'Un faro'}
 ];
 const html=blocksToEditor(source, x=>x);
 const doc=document.createElement('div');doc.innerHTML=html;
 const out=editorToBlocks(doc);
 if(!out[0].decorative || out[0].alt!=='' || out[0].caption!=='Adorno')throw Error('Se perdió la opción decorativa');
 if(out[1].decorative || out[1].alt!=='')throw Error('La imagen sin alt se etiquetó decorativa sin permiso');
 if(out[2].alt!=='Un faro')throw Error('Se perdió la descripción existente');
 if(lintImportedBlocks(out).counts.alt!==1)throw Error('Conteo alt tras ida y vuelta incorrecto');
 const view=renderBlock(out[0],0,{media:x=>x});
 if(!view.includes('alt=""'))throw Error('Figura decorativa sin alt vacío');
 if(!doc.querySelector('figure[data-decorative="1"]'))throw Error('Editor perdió marca decorativa');
 el.dataset.status='pass';el.textContent='Fase 1 · round-trip y alt decorativo correctos';
}catch(e){el.dataset.status='fail';el.textContent=e.stack||e.message}
</script></body></html>`;
const server=createServer((req,res)=>{
 const p=req.url||'/';
 res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');
 res.end(p==='/blocks.js'?shared:p==='/editorial-import-quality.js'?readFileSync('src/editorial-import-quality.js','utf8'):page);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let chrome=process.env.QA_CHROME;
if(!chrome)for(const name of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){try{chrome=execFileSync('which',[name],{encoding:'utf8'}).trim();break;}catch{}}
assert(chrome,'Chromium es obligatorio para verificar la semántica de ilustraciones');
try{
 const r=await runChromiumCdp(chrome,'http://127.0.0.1:'+server.address().port+'/',45000);
 assert.equal(r.status,'pass',r.text+' '+r.stderr);
}finally{await new Promise(ok=>server.close(ok))}
console.log('✓ Fase 1: importación no destructiva, avisos y alt decorativo en Chromium');

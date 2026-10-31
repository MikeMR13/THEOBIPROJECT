// Reproduce la lectura real con Chromium: fuente del cuerpo, encabezados y fragmentos
// con estilos EPUB. Sin claves, red externa, servicios, Supabase ni archivos de fuente ajenos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {execFileSync,spawn} from 'node:child_process';
import {fontVars,familiesOf,fontRoles} from '../src/reader-epub-fonts.js';

const vol={id:'volumen16',num:16,epub_fonts:[
  {family:'Alba',style:'normal',weight:'normal'},
  {family:'Alba Matter',style:'normal',weight:'normal',use:['heading']},
  {family:'Cambria Math'},
  {family:'Pixel Digivolve'},
  {family:'Quantico'},
  {family:'Segoe UI Symbol'},
  {family:'Times New Roman',weight:'bold',style:'oblique',use:['body']},
  {family:'Times New Roman',weight:'bold',style:'normal',use:['body']},
  {family:'Times New Roman',weight:'normal',style:'normal',use:['body']}
]};
const original=fontVars(vol,{font:'original'}),other=fontVars(vol,{font:'Literata'});
assert.equal(familiesOf(vol).length,7);
assert.deepEqual(fontRoles(vol),{body:'Times New Roman',head:'Alba Matter'});
assert.ok(original.includes("--f6:'obi-16-Times New Roman',Literata"));
assert.ok(original.includes("--f1:'obi-16-Alba Matter',Literata"));
assert.ok(!original.includes(',inherit'),'Nunca mezclar inherit con nombres de fuentes');
assert.ok(other.includes('--f6:inherit'),'Una fuente elegida por lector debe prevalecer');
assert.ok(!other.includes('obi-16'));
const reader=readFileSync('src/reader.js','utf8');
const preview=readFileSync('src/studio-importer.js','utf8');
const styles=readFileSync('src/styles.css','utf8');
assert.ok(reader.includes("import { familiesOf, fontVars } from './reader-epub-fonts.js?v=1'"));
assert.ok(reader.includes('fontVars(vol, p)'));
assert.ok(!preview.includes("'imp-${i}',inherit"),'Vista previa no debe producir familias CSS inválidas');
assert.ok(preview.includes("'imp-${i}',Literata,serif"));
assert.ok(styles.includes('.rd[data-font="original"] .rd-body{font-family:var(--fb)}'));

const js=String.raw`
import {fontVars} from '/reader-epub-fonts.js';
import {cleanInline} from '/blocks.js';
const vol=${JSON.stringify(vol)};
const errors=[];
const check=(condition,reason)=>{if(!condition)errors.push(reason)};
const app=document.getElementById('sample');
const paint=(choice)=>{
 app.className='rd';app.dataset.font=choice;
 const vars=fontVars(vol,{font:choice});
 const heading=cleanInline('<span data-epub-family="1">Capítulo 1</span>');
 const paragraph=cleanInline('<span data-epub-family="6">El texto utiliza la familia original.</span>');
 const dialogue=cleanInline('<span data-epub-family="1"><span data-epub-family="4">Diálogo de prueba</span></span>');
 app.innerHTML='<article class="rd-ch" style="'+vars+'"><header class="rd-head"><h2>'+heading+'</h2></header><div class="rd-body"><p id="body-font">'+paragraph+'</p><p id="dialogue">'+dialogue+'</p></div></article>';
};
const normalized=(sel)=>getComputedStyle(document.querySelector(sel)).fontFamily.replace(/["']/g,'').replace(/\\s+/g,' ').trim();
paint('original');
const body=normalized('#body-font span');
const header=normalized('.rd-head h2 span');
const dialogue=normalized('#dialogue span span');
const outer=normalized('.rd-body');
check(body.startsWith('obi-16-Times New Roman'),'Original: la fuente del párrafo no fue aplicada: '+body);
check(outer.startsWith('obi-16-Times New Roman'),'Original: el cuerpo general no respeta el EPUB: '+outer);
check(header.startsWith('obi-16-Alba Matter'),'Original: el título perdió Alba Matter: '+header);
check(dialogue.startsWith('obi-16-Quantico'),'Original: el diálogo perdió Quantico: '+dialogue);
check(!getComputedStyle(document.querySelector('.rd-ch')).getPropertyValue('--f6').includes('inherit'),'La variable fuente contiene keyword inválido');
paint('Literata');
const userBody=normalized('#body-font span');
check(!userBody.includes('obi-16-'),'Preferencias: fuente EPUB supera la elección del usuario: '+userBody);
const result=document.getElementById('qa-result');
result.dataset.qaStatus=errors.length?'fail':'pass';
result.textContent=errors.length?errors.join(' | '):'PASS: cuerpo Times New Roman, título Alba Matter, diálogo Quantico, preferencias respetadas';
`;
const server=createServer((req,res)=>{
 const path=(req.url||'/').split('?')[0];
 res.setHeader('Cache-Control','no-store');
 if(path==='/qa-browser.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(js);}
 else if(path==='/reader-epub-fonts.js'||path==='/blocks.js'){
   res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(readFileSync('src/'+path.slice(1)));
 }else if(path==='/styles.css'){
   res.setHeader('Content-Type','text/css; charset=utf-8');res.end(styles);
 }else{
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head><body><div id="sample"></div><p id="qa-result" data-qa-status="running">Cargando</p><script type="module" src="/qa-browser.js"></script></body></html>');
 }
});
const chrome=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .map(name=>{try{return execFileSync('which',[name],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(chrome,'Se requiere Chromium en el CI gratuito de GitHub Actions');
try {
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const url='http://127.0.0.1:'+server.address().port+'/';
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
   '--disable-background-networking','--no-proxy-server','--incognito','--virtual-time-budget=3500','--dump-dom',url],
   {stdio:['ignore','pipe','pipe']});
 let out='',err='';
 child.stdout.on('data',v=>out+=String(v).slice(0,500000));
 child.stderr.on('data',v=>err+=String(v).slice(0,20000));
 const code=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium superó 40 s'))},40000);
   child.once('error',e=>{clearTimeout(timer);reject(e)});
   child.once('close',n=>{clearTimeout(timer);resolve(n)});
 });
 assert.equal(code,0,err.slice(-1000));
 const match=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([^<]*)<\/p>/);
 assert(match,'No se ejecutó el test de fuentes en Chromium: '+err.slice(-600)+' '+out.slice(-700));
 assert.equal(match[1],'pass',match[2]);
 console.log('EPUB fuentes calculadas en Chromium: '+match[2]);
} finally { await new Promise(resolve=>server.close(resolve)); }

// QA: anuncios son datos editoriales con expiración; nunca activan notificaciones.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {validateEditorialSelection,createEditorialRecord,chooseActiveEditorial,saveEditorialRecord,editorialForm} from '../src/editorial-announcements.js';
const type=(mode,extra={})=>({mode,days:14,color:'#f2c230',style:'solid',...extra});
assert.equal(validateEditorialSelection(type('volumen')).text,'¡Nuevo volumen!');
assert.equal(validateEditorialSelection(type('capitulo')).text,'¡Nuevo capítulo!');
assert.equal(validateEditorialSelection(type('completo')).days,14);
assert.equal(validateEditorialSelection(type('especial')).text,'¡Contenido especial!');
assert.equal(validateEditorialSelection(type('personalizado',{text:'¡Volumen 5 disponible!'})).text,'¡Volumen 5 disponible!');
assert.equal(validateEditorialSelection({mode:'ninguno'}).days,0);
for(const days of [0,'',-2,91,1.25,'abc',null]){
  assert.throws(()=>validateEditorialSelection(type('volumen',{days})),/duración/i);
}
assert.throws(()=>validateEditorialSelection(type('personalizado',{text:''})),/caracteres/);
assert.throws(()=>validateEditorialSelection(type('personalizado',{text:'a'.repeat(41)})),/caracteres/);
assert.equal(validateEditorialSelection(type('personalizado',{text:'a'.repeat(40)})).text.length,40);
const start='2031-03-29T05:30:00.000Z';
const a=createEditorialRecord(type('volumen',{days:7}),{kind:'volume',id:'vol-1',startsAt:start});
assert.equal(a.expires_at,'2031-04-05T05:30:00.000Z');
assert.equal(chooseActiveEditorial({editorial_releases:[a]},'2031-03-29T05:29:59Z'),null);
assert.equal(chooseActiveEditorial({editorial_releases:[a]},'2031-03-30T12:00:00Z').text,'¡Nuevo volumen!');
assert.equal(chooseActiveEditorial({editorial_releases:[a]},a.expires_at),null);
const future=createEditorialRecord(type('capitulo'),{kind:'chapter',id:'ch-2',startsAt:'2031-04-01T05:30:00Z'});
assert.equal(chooseActiveEditorial({editorial_releases:[a,future]},'2031-04-02T00:00:00Z').text,'¡Nuevo capítulo!');
const silent=createEditorialRecord({mode:'ninguno'},{kind:'chapter',id:'ch-3',startsAt:'2031-04-02T10:00:00Z'});
assert.equal(chooseActiveEditorial({editorial_releases:[a,future,silent]},'2031-04-03T00:00:00Z'),null);
assert.equal(chooseActiveEditorial({editorial_releases:[silent]},'2031-04-03T00:00:00Z'),null);
assert.equal(chooseActiveEditorial({update_tag:{on:true,text:'Viejo'}}).text,'Viejo');
const theme={color:'#101010',update_tag:{on:true,text:'Legacy',until:'2032-12-31'},editorial_releases:[a]};
let writes=0,reads=0;
const fake={
  from(name){assert.equal(name,'series');return {
    select(field){assert.equal(field,'theme');return {eq(k,id){assert.equal(k,'id');assert.equal(id,'serie');return {async single(){reads++;return {data:{theme:structuredClone(theme)},error:null}}}}}},
    update(patch){return {eq(k,id){assert.equal(k,'id');assert.equal(id,'serie');return {async select(){writes++;Object.assign(theme,patch.theme);return {data:[{id:'serie',theme:structuredClone(theme)}],error:null}}}}}}
  }}
};
const result=await saveEditorialRecord(fake,'serie',type('capitulo',{days:30}),{kind:'chapter',id:'ch-99',startsAt:'2031-04-07T08:00:00Z'});
assert.equal(result.days,30);assert.equal(writes,1);assert.equal(reads,1);assert.equal(theme.color,'#101010');
assert.equal(theme.update_tag.text,'Legacy');assert.equal(theme.editorial_releases.length,2);
assert.equal(chooseActiveEditorial(theme,'2031-04-08T08:00:00Z').text,'¡Nuevo capítulo!');
const duplicate=await saveEditorialRecord(fake,'serie',type('personalizado',{text:'¡Corregido!'}),{kind:'chapter',id:'ch-99',startsAt:'2031-04-07T08:00:00Z'});
assert.equal(duplicate.text,'¡Corregido!');assert.equal(theme.editorial_releases.length,2);
assert(!readFileSync('src/editorial-announcements.js','utf8').includes("sb.from('notifications')"));
const studio=readFileSync('src/studio.js','utf8'),editor=readFileSync('src/studio-editor.js','utf8'),importer=readFileSync('src/studio-importer.js','utf8'),publicUi=readFileSync('src/ui.js','utf8'),css=readFileSync('src/styles.css','utf8');
for(const token of ["on('[data-pub]'", "on('[data-sch]'", "on('[data-cpub]'",'askEditorialAnnouncement','saveEditorialRecord','Último anuncio de publicación']) assert(studio.includes(token),'Studio sin '+token);
for(const token of ['askEditorialAnnouncement','saveEditorialRecord','Capítulo programado']) assert(editor.includes(token),'Editor sin '+token);
for(const token of ['Último paso · anuncio editorial','D.noticeGetter?.()','saveEditorialRecord','publish_volume']) assert(importer.includes(token),'Importador sin '+token);
assert(importer.indexOf("await saveEditorialRecord(sb,w.id")>importer.indexOf("const r = await sb.rpc('publish_volume'"),'Aviso debe guardarse después de publicar');
assert(publicUi.includes('chooseActiveEditorial(s?.theme)'), 'Vista pública usa aviso global en vez de publicación');
assert(publicUi.includes("v ? (fresh ? '¡NUEVO VOLUMEN! · VOL. '") && publicUi.includes("newsBySeries[s.id]"),'Portada debe anunciar el volumen completo confirmado sin desglosarlo en capítulos');
assert(css.includes('.ea-modal')&&css.includes('@media(max-width:420px)'),'Falta interfaz responsive');
assert(editorialForm(s=>s,'volume').includes('data-ea="mode"'),'Formulario inválido');

// Interacción real: entradas, días obligatorios, estado sin anuncio, 320–1440.
const sizes=[320,390,768,1024,1440];
const script=[
"import {editorialForm,bindEditorialForm} from '/editorial-announcements.js';",
"const holder=document.querySelector('#holder'),errors=[],check=(yes,msg)=>{if(!yes)errors.push(msg)};",
"holder.innerHTML=editorialForm(s=>s,'volume');const read=bindEditorialForm(holder);",
"const q=k=>holder.querySelector('[data-ea=\"'+k+'\"]');",
"check(read().text==='¡Nuevo volumen!','volumen predeterminado');",
"q('mode').value='personalizado';q('mode').dispatchEvent(new Event('change',{bubbles:true}));",
"check(!holder.querySelector('[data-ea-custom]').hidden,'campo personalizado oculto');",
"q('text').value='¡Volumen terminado!';q('duration').value='custom';q('duration').dispatchEvent(new Event('change',{bubbles:true}));",
"q('days').value='0';try{read();errors.push('aceptó 0 días')}catch(e){check(/duración/.test(e.message),'error de días incorrecto')}",
"q('days').value='45';check(read().days===45&&read().text==='¡Volumen terminado!','personalización');",
"q('mode').value='ninguno';q('mode').dispatchEvent(new Event('change',{bubbles:true}));check(read().mode==='ninguno','sin anuncio');",
"check(holder.querySelector('[data-ea-settings]').hidden,'duración aparece sin anuncio');",
"check(document.documentElement.scrollWidth<=innerWidth+2,'overflow '+innerWidth);",
"const result=document.querySelector('#result');result.dataset.qa=errors.length?'fail':'pass';result.textContent=errors.join(' | ')||'OK';"
].join('\n');
const page='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><style>:root{--paper:#fff6dd;--gold:#f2c230}body{margin:0;padding:10px;box-sizing:border-box;background:#12100b;color:var(--paper);font-family:Arial,sans-serif}</style></head><body><main id="holder"></main><p id="result" data-qa="running"></p><script type="module">'+script+'</script></body></html>';
const parent='<html><body><p id="qa" data-qa="running"></p>'+sizes.map(n=>'<iframe src="/case" width="'+n+'" height="760"></iframe>').join('')+'<script>let done=0,bad=[];document.querySelectorAll("iframe").forEach(f=>f.addEventListener("load",()=>{let ticks=0;const check=()=>{const a=f.contentDocument.querySelector("#result");if(a?.dataset.qa==="running"&&++ticks<60)return requestAnimationFrame(check);if(a?.dataset.qa!=="pass")bad.push(f.width+": "+(a?.textContent||"sin respuesta"));if(++done===5){const o=document.querySelector("#qa");o.dataset.qa=bad.length?"fail":"pass";o.textContent=bad.join(" | ")||"Anuncios: cinco resoluciones y duración obligatoria OK";}};check();}));</script></body></html>';
const srv=createServer((req,res)=>{const js=req.url==='/editorial-announcements.js';res.setHeader('Content-Type',js?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'");res.end(js?readFileSync('src/editorial-announcements.js','utf8'):req.url==='/case'?page:parent)});
const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(bin,'Chromium no disponible');
try {
  await new Promise((ok,no)=>{srv.once('error',no);srv.listen(0,'127.0.0.1',ok)});
  const ch=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--window-size=1680,1000','--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:'+srv.address().port],{stdio:['ignore','pipe','pipe']});
  let output='',err='';ch.stdout.on('data',d=>output+=String(d).slice(0,175000));ch.stderr.on('data',d=>err+=String(d).slice(0,10000));
  const code=await new Promise((yes,no)=>{const t=setTimeout(()=>{ch.kill('SIGKILL');no(Error('Chromium timeout'))},55000);ch.once('error',e=>{clearTimeout(t);no(e)});ch.once('close',c=>{clearTimeout(t);yes(c)})});
  assert.equal(code,0,err.slice(-600));
  const match=output.match(/<p id="qa" data-qa="(pass|fail)">([\s\S]*?)<\/p>/);assert(match,'Sin resultados');assert.equal(match[1],'pass',match[2]);console.log(match[2]);
} finally{await new Promise(ok=>srv.close(ok))}

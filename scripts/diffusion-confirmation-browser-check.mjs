import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
const html="<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body>\n<main id=\"app\"></main><output id=\"result\" data-qa-status=\"running\">Preparando QA</output>\n<script type=\"module\">\nconst out=document.getElementById('result');\nconst calls=[], errors=[];\ntry{\n  window.confirm=()=>{throw Error('NO se permite confirm() nativo en Enviar')};\n  const {renderDiffusionPanel}=await import('/diffusion-panel.js');\n  const data={\n    diffusion_connections:[\n      {id:'aaaaaaaa-0000-4000-8000-000000000001',provider:'discord',label:'Noticias',status:'active'},\n      {id:'aaaaaaaa-0000-4000-8000-000000000002',provider:'telegram',label:'Lectores',status:'active'}\n    ],\n    diffusion_rules:[],diffusion_campaigns:[],diffusion_jobs:[],diffusion_scheduled_announcements:[],\n    series:[{id:'bbbbbbbb-0000-4000-8000-000000000001',title:'Obra ficticia QA',slug:'obra-qa'}]\n  };\n  class Query{\n    constructor(table){this.table=table}\n    select(){return this} order(){return this} limit(){return this}\n    eq(){return this} is(){return this}\n    then(ok,fail){return Promise.resolve({data:data[this.table]||[],error:null}).then(ok,fail)}\n  }\n  const preview={\n    title:'Obra ficticia QA',description:'Sinopsis pública ficticia',\n    url:'https://elobidellector.com/serie/obra-qa',\n    cover_path:'qa/obra.jpg',message:'Nueva obra ficticia'\n  };\n  const sb={\n    supabaseUrl:'https://ci-fake.supabase.co',\n    from:table=>new Query(table),\n    rpc:async(name,params)=>{\n      if(name==='diffusion_discord_announcement_preview'||name==='diffusion_telegram_announcement_preview')\n        return {data:preview,error:null};\n      errors.push(name);return {data:null,error:{message:'RPC no simulada'}};\n    },\n    functions:{invoke:async(name,req)=>{\n      calls.push({name,id:req.body.connection_id,source:req.body.source_id});\n      return name==='diffusion-telegram'\n        ?{data:null,error:{context:{status:502}}}\n        :{data:{ok:true},error:null};\n    }}\n  };\n  const check=(ok,msg)=>{if(!ok)throw Error(msg)};\n  const wait=async(fn,name)=>{for(let i=0;i<60;i++){if(fn())return;await new Promise(r=>setTimeout(r,40))}throw Error('Timeout: '+name)};\n  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('\"','&quot;');\n  await renderDiffusionPanel({sb,root:document.getElementById('app'),esc,toast:s=>errors.push(s)});\n  document.querySelector('[data-dtab=\"anuncios\"]').click();\n  await wait(()=>document.querySelectorAll('[data-ann-target]').length===2,'checkboxes');\n  let boxes=[...document.querySelectorAll('[data-ann-target]')];\n  check(boxes[0].checked&&!boxes[1].checked,'El formulario debería preseleccionar solamente el primer canal');\n  boxes[1].checked=true;\n  boxes[1].dispatchEvent(new Event('change',{bubbles:true}));\n  boxes=[...document.querySelectorAll('[data-ann-target]')];\n  check(boxes.every(x=>x.checked),'Las dos casillas no permanecieron activas');\n  document.getElementById('df-ann-preview').click();\n  await wait(()=>!!document.getElementById('df-ann-send'),'vista previa');\n  const text=document.getElementById('df-ann-text');text.value='Texto para dos canales sin enviar hasta confirmar';\n  document.getElementById('df-ann-send').click();\n  const modal=document.getElementById('df-ann-confirm-dialog');\n  check(modal?.open===true,'La ventana de confirmación propia no apareció');\n  check(modal.textContent.includes('Noticias')&&modal.textContent.includes('Lectores'),\n    'La confirmación no enumera ambos destinos');\n  check(calls.length===0,'Se envió antes de la segunda confirmación');\n  document.getElementById('df-ann-confirm-cancel').click();\n  check(calls.length===0,'Cancelar provocó un envío');\n  check(!document.getElementById('df-ann-confirm-dialog'),'Cancelar no cerró la confirmación');\n  check(document.getElementById('df-ann-text')?.value==='Texto para dos canales sin enviar hasta confirmar',\n    'Cancelar debe preservar el mensaje');\n  document.getElementById('df-ann-send').click();\n  check(document.getElementById('df-ann-confirm-dialog')?.open===true,'La segunda confirmación no se abrió');\n  document.getElementById('df-ann-confirm-accept').click();\n  await wait(()=>!!document.getElementById('df-ann-result-summary'),'resultado multicanal');\n  const result=document.getElementById('df-ann-result-summary');\n  check(calls.length===2,'Se deben intentar ambos canales exactamente una vez');\n  check(calls[0].name==='diffusion-announcement'&&calls[1].name==='diffusion-telegram',\n    'El proveedor de cada canal debe ser correcto');\n  check(result.textContent.includes('DISCORD')&&result.textContent.includes('Enviado')&&\n    result.textContent.includes('TELEGRAM')&&result.textContent.includes('Entrega sin confirmar'),\n    'No se muestran los resultados por canal');\n  check(!document.getElementById('df-ann-send'),'No debe quedar un botón listo para repetir el envío');\n  check(errors.length===0,'Errores de simulación: '+errors.join(','));\n  out.dataset.qaStatus='pass';out.textContent='Confirmar, cancelar y resultados por canal — PASS';\n}catch(e){out.dataset.qaStatus='fail';out.textContent=e.message}\n</script></body></html>";
const routes={'/diffusion-panel.js':'src/diffusion-panel.js',
 '/diffusion-manual-batch.js':'src/diffusion-manual-batch.js',
 '/diffusion.css':'src/diffusion.css'};
const server=createServer((req,res)=>{
 const path=(req.url||'').split('?')[0];
 res.setHeader('Cache-Control','no-store');
 if(path==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
 if(!routes[path]){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'content-type':path.endsWith('.css')?'text/css':'text/javascript; charset=utf-8'});
 res.end(readFileSync(routes[path]));
});
function browser(){
 if(process.env.QA_CHROME)return process.env.QA_CHROME;
 for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
  try{return execFileSync('which',[cmd],{encoding:'utf8'}).trim()}catch{}
 }
 throw Error('Chromium requerido para confirmar la regresión de Difusión');
}
const port=await new Promise((resolve,reject)=>{
 server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address().port));
});
async function run(width){
 return await new Promise((resolve,reject)=>{
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-background-networking','--no-first-run','--no-default-browser-check',
   '--window-size='+width+',850','--virtual-time-budget=12000',
   '--dump-dom','http://127.0.0.1:'+port+'/'];
  const child=spawn(browser(),args,{stdio:['ignore','pipe','pipe']});
  let output='',stderr='';
  child.stdout.on('data',c=>output+=String(c));
  child.stderr.on('data',c=>stderr+=String(c));
  child.on('error',reject);
  child.on('close',code=>{
   try{
    assert.equal(code,0,stderr.slice(-650));
    assert.match(output,/data-qa-status="pass"/,
      'Falló QA a '+width+'px: '+(output.match(/<output[^>]*>[^<]*/)?.[0]||stderr.slice(-450)));
    resolve();
   }catch(e){reject(e);}
  });
 });
}
try{
 for(const width of [390,1200]){await run(width);console.log('Difusión confirmación real Chromium, '+width+'px — PASS');}
}finally{server.close();}

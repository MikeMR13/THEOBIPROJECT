// Regresión visual real: los campos de "equipo existente" no deben verse
// cuando se invita a crear uno nuevo. Chromium + mock local, cero credenciales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';

const html=`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/styles.css"></head>
<body><main class="bb"><div id="out"></div><output id="qa-result" data-qa-status="running">Iniciando QA</output></main>
<script type="module">
const result=document.getElementById('qa-result');
try {
  const {renderAdminInvitations}=await import('/admin-invitations.js');
  const fake={
    from: name => { if(name!=='teams')throw Error('Unexpected table '+name);
      return {select: () => ({order: async () => ({data:[{
        id:'11111111-1111-4111-8111-111111111111',name:'Equipo existente ficticio',
        slug:'ejemplo'}],error:null})})}; },
    rpc: async name => {
      if(name==='admin_invitation_list')return {data:[],error:null};
      throw Error('Unexpected RPC '+name);
    }
  };
  const esc=s=>String(s);
  await renderAdminInvitations({
    sb:fake,view:()=>document.getElementById('out'),esc,toast:()=>{},
    rpc:async()=>{throw Error('No se deben crear invitaciones en prueba visual')},
    when:x=>String(x)
  });
  const form=document.getElementById('inv-form');
  const shown=id=>getComputedStyle(document.getElementById(id)).display!=='none';
  const check=(yes,why)=>{if(!yes)throw Error(why)};
  check(form.elements.kind.value==='create_team','Modalidad inicial incorrecta');
  check(!shown('inv-team-wrap'),'Error: equipo existente visible al crear uno nuevo');
  check(!shown('inv-role-wrap'),'Error: rol ajeno visible al crear uno nuevo');
  check(shown('inv-new-name-wrap')&&shown('inv-new-slug-wrap'),'Faltan campos nuevo equipo');
  check(shown('inv-owner-role'),'No aparece la autoridad de Propietario');

  form.elements.kind.value='join';form.elements.kind.dispatchEvent(new Event('change',{bubbles:true}));
  check(shown('inv-team-wrap')&&shown('inv-role-wrap'),'Error: campos de equipo existente ocultos');
  check(!shown('inv-new-name-wrap')&&!shown('inv-new-slug-wrap'),'Campos nuevo equipo visibles en invitación existente');
  check(!shown('inv-owner-role'),'Texto de Propietario aparece en invitación existente');
  check(shown('inv-target-wrap')&&shown('inv-email-wrap'),'Debe verse modo por correo');
  form.elements.target.value='open';
  form.elements.target.dispatchEvent(new Event('change',{bubbles:true}));
  check(!shown('inv-email-wrap')&&shown('inv-open-warning'),'Enlace libre debe ocultar correo y mostrar advertencia');
  check(!form.elements.email.required,'Correo oculto no puede ser obligatorio');
  check(form.elements.role.value!=='admin','Enlace libre no debe elegir administrador');
  check([...form.elements.role.options].find(o=>o.value==='admin').disabled,'Administrador debe estar inhabilitado');
  form.elements.target.value='email';
  form.elements.target.dispatchEvent(new Event('change',{bubbles:true}));
  check(shown('inv-email-wrap')&&!shown('inv-open-warning')&&form.elements.email.required,'Modo correo no se restauró');
  check(!form.elements.newName.required&&!form.elements.newSlug.required,'Requerimientos ocultos bloquean el formulario');
  check(![...form.elements.role.options].some(x=>x.value==='owner'),
    'No debe poder asignarse propietario de un equipo existente por invitación');

  form.elements.kind.value='create_team';form.elements.kind.dispatchEvent(new Event('change',{bubbles:true}));
  check(!shown('inv-team-wrap')&&shown('inv-new-name-wrap'),'Error al volver a crear equipo');
  check(!shown('inv-target-wrap')&&shown('inv-email-wrap')&&form.elements.email.required,'Crear propietario exige correo');
  check(form.elements.newName.required&&form.elements.newSlug.required,'Nuevo equipo requiere nombre y slug');
  result.dataset.qaStatus='pass';result.textContent='OK: ocultamiento correcto en ambos modos';
} catch (error) {
  result.dataset.qaStatus='fail';result.textContent=error.message;
}
</script></body></html>`;
const server=createServer((req,res)=>{
  const path=(req.url||'').split('?')[0];
  res.setHeader('Cache-Control','no-store');
  if(path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  const files={'/styles.css':'src/styles.css','/admin-invitations.js':'src/admin-invitations.js'};
  if(!files[path]){res.writeHead(404);res.end('No disponible');return;}
  res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'});
  res.end(readFileSync(files[path]));
});
function browser(){
  if(process.env.QA_CHROME)return process.env.QA_CHROME;
  for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{return execFileSync('which',[cmd],{encoding:'utf8'}).trim();}catch{}
  }
  throw Error('Chromium no disponible en runner QA');
}
const port=await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve(server.address().port));
});
async function run(width){
 return await new Promise((resolve,reject)=>{
  const cmd=browser();
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-background-networking','--no-first-run','--no-default-browser-check',
    '--window-size='+width+',850','--virtual-time-budget=12000',
    '--dump-dom','http://127.0.0.1:'+port+'/'];
  const child=spawn(cmd,args,{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',d=>out+=d.toString());
  child.stderr.on('data',d=>err+=d.toString());
  child.on('error',reject);
  child.on('close',code=>{
    try{
      assert.equal(code,0,'Chromium falló: '+err.slice(-600));
      assert(out.includes('data-qa-status="pass"'),
        'Visibilidad incorrecta a '+width+'px: '+out.match(/<output[^>]*>[^<]*/)?.[0]);
      resolve();
    }catch(e){reject(e);}
  });
 });
}
try{
 for(const width of [390,1200]){await run(width);console.log('OK: invitaciones modos visibles/ocultos a '+width+'px');}
}finally{server.close();}

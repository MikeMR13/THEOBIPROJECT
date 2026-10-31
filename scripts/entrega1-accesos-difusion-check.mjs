import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPages} from '../src/paging.js';
import {handleDispatch} from '../supabase/functions/diffusion-dispatch/handler.mjs';

// Acceso y Patreon: preservar todas las filas, incluso con más de una página.
const studio=readFileSync(new URL('../src/studio.js',import.meta.url),'utf8');
assert.match(studio,/!Array\.isArray\(chapters\?\.data\)/,'No aceptar respuestas de capítulos incompletas');
assert.match(studio,/CH = chapters\.data;/,'La vista debe recibir filas, nunca el objeto {data,error}');
assert.doesNotMatch(studio,/CH = chapters \|\| \[\]/,'No regresar al error original');
for(const count of [301,44,0]){
 const work=Array.from({length:count},(_,i)=>({id:'chapter-'+i,num:i+1,vol:(i%3)+1,access:i%2?'tier':'public'}));
 const ranges=[];
 const result=await readPages(async(from,to)=>{
  ranges.push([from,to]);
  return {data:work.slice(from,to+1),error:null};
 },{size:250});
 assert.deepEqual(result.data,work,'No truncar capítulos al superar una página');
 assert.ok(Array.isArray(result.data),'La salida debe ser un arreglo');
 assert.equal(ranges.length,count>=250?2:1,'Paginación mínima por obra');
}
await assert.rejects(
 ()=>readPages(async()=>({data:null,error:null})),
 /Respuesta incompleta de Supabase/,'Fallos de respuesta no deben producir un panel vacío');
await assert.rejects(
 ()=>readPages(async()=>({data:null,error:{message:'Sin permisos'}})),
 error=>error?.message==='Sin permisos','Los errores de consulta no se deben ignorar');

// PostgREST devuelve thenables sin .catch(): reproducir ese contrato, sin red real.
const thenable=value=>({then(resolve,reject){return Promise.resolve(value).then(resolve,reject);}});
const now=Date.UTC(2026,9,30,12,0,0);
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const claim={
 plan_id:uuid(1),job_id:uuid(2),connection_id:uuid(3),provider:'discord',
 payload:{title:'Obra de prueba',message:'Capítulo público de prueba',cover_path:'team/cover.webp',
   url:'https://elobidellector.com/serie/obra-de-prueba',description:'QA sin envíos reales'}
};
const webhook='https://discord.com/api/webhooks/12345678901234567/'+'A'.repeat(40);
const request=()=>new Request('https://ci.example/functions/v1/diffusion-dispatch',{
 method:'POST',headers:{'x-diffusion-ticket':'a'.repeat(64)}
});
function client({overdue=false,queryError=false,queryMissing=false,throwRpc='',claims=[]}={}){
 const calls=[],fetches=[];let index=0,cutoff=null,filters=[];
 const admin={
  rpc(name,args){
   calls.push(name);
   if(name===throwRpc)throw new Error('fallo simulado');
   if(name==='diffusion_4b_consume_ticket')return thenable({data:true,error:null});
   if(name==='diffusion_4b_claim')return thenable({data:claims[index++]??null,error:null});
   if(name==='diffusion_4b_complete')return thenable({data:true,error:null});
   if(name==='diffusion_discord_secret_resolve')return thenable({data:webhook,error:null});
   throw new Error('RPC inesperada: '+name);
  },
  from(table){
   assert.equal(table,'diffusion_scheduled_announcements');
   const builder={
    select(cols){assert.equal(cols,'id');return this;},
    eq(key,value){filters.push([key,value]);return this;},
    lte(key,value){assert.equal(key,'scheduled_at');cutoff=value;return this;},
    limit(n){assert.equal(n,1);return thenable(queryMissing?{data:null,error:null}:
      queryError?{data:null,error:{message:'consulta fallida'}}:
      {data:overdue?[{id:'revisar'}]:[],error:null});}
   };
   return builder;
  }
 };
 const fetcher=async(url,options)=>{
  fetches.push({url,options});
  return new Response(JSON.stringify({id:'discord-post-ficticio'}),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {admin,calls,fetches,fetcher,get cutoff(){return cutoff;},get filters(){return filters;}};
}
async function run(fixture){
 const response=await handleDispatch(request(),{
  createAdmin:()=>fixture.admin,baseUrl:'https://db-ci.example',fetcher:fixture.fetcher,
  now:()=>now
 });
 return {status:response.status,body:await response.json()};
}
const missingTicket=await handleDispatch(new Request('https://ci.example/dispatch',{method:'POST'}),{
 createAdmin:()=>{throw new Error('No debe consultar Supabase');},baseUrl:'https://db-ci.example'});
assert.equal(missingTicket.status,401,'No se consume ticket faltante');

const stale=client({overdue:true,claims:[claim]});
let result=await run(stale);
assert.equal(result.status,409);
assert.equal(result.body.error,'overdue_plans_require_review');
assert.ok(!stale.calls.includes('diffusion_4b_claim'),'Anuncio vencido no puede reclamarse');
assert.equal(stale.fetches.length,0,'Nunca enviar anuncios antiguos');
assert.equal(stale.cutoff,new Date(now-15*60*1000).toISOString());
assert.deepEqual(stale.filters,[['status','planned'],['delivery_mode','automatic']]);

for(const fixture of [client({queryError:true}),client({queryMissing:true})]){
 result=await run(fixture);
 assert.equal(result.status,503,'Si falla la revisión de atrasados, no se envía');
 assert.ok(!fixture.calls.includes('diffusion_4b_claim'));
 assert.equal(fixture.fetches.length,0);
}
const good=client({claims:[claim]});
result=await run(good);
assert.equal(result.status,200);
assert.deepEqual(result.body,{ok:true,sent:1,uncertain:0,blocked:0});
assert.equal(good.fetches.length,1,'Solo una publicación ante un claim válido');
assert.deepEqual(good.calls.filter(x=>x==='diffusion_4b_claim').length,2);
assert.ok(good.calls.includes('diffusion_4b_complete'),'Registrar el resultado');
assert.match(good.fetches[0].url,/^https:\/\/discord\.com\/api\/webhooks\//);

for(const fail of ['diffusion_4b_consume_ticket','diffusion_4b_claim']){
 const broken=client({throwRpc:fail});
 result=await run(broken);
 assert.equal(result.status,fail==='diffusion_4b_consume_ticket'?401:503);
 assert.equal(broken.fetches.length,0,'Una RPC fallida no puede disparar envíos');
}
const uncertain=client({claims:[claim],throwRpc:'diffusion_4b_complete'});
result=await run(uncertain);
assert.equal(result.status,200);
assert.equal(result.body.uncertain,1,'No confirmar entregas con error al completar');
assert.equal(result.body.sent,0);
console.log('Entrega 1 — Acceso y Patreon / Difusión segura: PASS (sin red ni escrituras remotas)');

import assert from 'node:assert/strict';
import {handleDispatch,isDiscordWebhook,photoUrl} from '../supabase/functions/diffusion-dispatch/handler.mjs';
const ticket='a'.repeat(64);
const rpc=[];
const admin={async rpc(name,args){rpc.push({name,args});
 if(name==='diffusion_4b_consume_ticket')return {data:true,error:null};
 if(name==='diffusion_4b_claim')return {data:null,error:null};
 return {data:null,error:null};
}};
const opts={createAdmin:()=>admin,baseUrl:'https://example.supabase.co',fetcher:async()=>{throw Error('must not send')}};
let res=await handleDispatch(new Request('https://edge.example/',{method:'POST'}),opts);
assert.equal(res.status,401);assert.equal(rpc.length,0,'Una llamada sin ticket no puede tocar DB');
res=await handleDispatch(new Request('https://edge.example/',{method:'GET',headers:{'x-diffusion-ticket':ticket}}),opts);
assert.equal(res.status,405);assert.equal(rpc.length,0);
res=await handleDispatch(new Request('https://edge.example/',{method:'POST',headers:{'x-diffusion-ticket':ticket}}),opts);
assert.equal(res.status,200);assert.deepEqual(rpc.map(x=>x.name),['diffusion_4b_consume_ticket','diffusion_4b_claim']);
assert.equal(isDiscordWebhook('https://evil.example/api/webhooks/123/token'),false);
assert.equal(isDiscordWebhook('https://discord.com.evil.org/api/webhooks/123/token'),false);
assert.equal(photoUrl('https://cdn.example','../../token'),null);
assert.equal(photoUrl('https://cdn.example','covers/image.jpg'),'https://cdn.example/storage/v1/object/public/obi-media/covers/image.jpg');
const plan='11111111-1111-4111-8111-111111111111',job='22222222-2222-4222-8222-222222222222',
 conn='33333333-3333-4333-8333-333333333333';
let count=0,requests=[],last=[];
const testAdmin={async rpc(name,args){
 last.push({name,args});
 if(name==='diffusion_4b_consume_ticket')return {data:true,error:null};
 if(name==='diffusion_4b_claim')return {data:count++===0?{
  plan_id:plan,job_id:job,connection_id:conn,provider:'discord',
  payload:{title:'Obra QA',message:'Volumen público',description:'Ficha',cover_path:'qa/test.jpg',
   url:'https://elobidellector.com/serie/prueba'}}:null,error:null};
 if(name==='diffusion_discord_secret_resolve')return {data:'https://discord.com/api/webhooks/'+
  '123456789012345678'+'/'+'x'.repeat(40),error:null};
 if(name==='diffusion_4b_complete')return {data:true,error:null};
 return {data:null,error:new Error('unexpected')};
}};
res=await handleDispatch(new Request('https://edge.example/',{method:'POST',headers:{'x-diffusion-ticket':ticket}}),{
 createAdmin:()=>testAdmin,baseUrl:'https://example.supabase.co',
 fetcher:async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({id:'abc'}),{status:200})}
});
assert.equal(res.status,200);assert.equal((await res.json()).sent,1);
assert.equal(requests.length,1);assert.deepEqual(requests[0].body.allowed_mentions,{parse:[]});
assert.equal(last.filter(x=>x.name==='diffusion_4b_complete').length,1);
assert.equal(last.find(x=>x.name==='diffusion_4b_complete').args.p_post_id,'abc');
console.log('Difusión 4B Edge: fail-closed, tickets, formatos seguros y confirmación — PASS');

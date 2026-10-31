// Handler puro: también se prueba en Node sin red ni credenciales reales.
export const isDiscordWebhook = input => {
 if(typeof input!=='string'||input.length>250||!/^https:\/\/discord[.]com\/api\/webhooks\/[0-9]{15,25}\/[A-Za-z0-9_-]{30,}$/.test(input))return false;
 try {const u=new URL(input);return u.hostname==='discord.com'&&u.protocol==='https:'
  &&!u.username&&!u.password&&!u.search&&!u.hash&&!u.port;}catch{return false;}
};
export const isTelegramToken = x => typeof x==='string'&&/^[0-9]{5,15}:[A-Za-z0-9_-]{30,80}$/.test(x);
export const isTelegramChat = x => typeof x==='string'&&/^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{6,16})$/.test(x);
export function photoUrl(base,path){
 if(typeof path!=='string'||!path||path.length>450||path.includes('..')||path.startsWith('/')
   ||!/^[A-Za-z0-9_./-]+$/.test(path))return null;
 return base+'/storage/v1/object/public/obi-media/'+path.split('/').map(encodeURIComponent).join('/');
}
const boolId = input=>typeof input==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
async function providerPost(item,admin,base,fetcher){
 const payload=item?.payload,provider=item?.provider,conn=item?.connection_id;
 if(!boolId(item?.plan_id)||!boolId(item?.job_id)||!boolId(conn)
   ||!payload||typeof payload!=='object'||!['discord','telegram'].includes(provider))
    return {ok:false};
 const r=await admin.rpc(provider==='discord'?'diffusion_discord_secret_resolve':'diffusion_telegram_secret_resolve',{p_id:conn});
 if(r.error||!r.data)return {ok:false};
 const title=String(payload.title||'El Obi del Lector').slice(0,256);
 const msg=String(payload.message||'').trim().slice(0,700);
 const url=String(payload.url||'');
 const picture=photoUrl(base,payload.cover_path);
 if(!msg||!picture||!url.startsWith('https://elobidellector.com/'))return {ok:false};
 try {
  if(provider==='discord'){
   if(!isDiscordWebhook(r.data))return {ok:false};
   const response=await fetcher(r.data+'?wait=true',{
    method:'POST',redirect:'error',headers:{'content-type':'application/json'},
    body:JSON.stringify({embeds:[{title,url,description:(msg+'\n\n'+String(payload.description||'')).slice(0,1800),
      color:14002251,thumbnail:{url:picture},footer:{text:'El Obi del Lector · Programado'}}],
      allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)return {ok:false};
   const json=await response.json().catch(()=>null);
   return {ok:true,postId:typeof json?.id==='string'?json.id:null};
  }
  const token=r.data?.token,chat=r.data?.chat_id;
  if(!isTelegramToken(token)||!isTelegramChat(chat))return {ok:false};
  const text=(title+'\n\n'+msg+'\n\n'+url).slice(0,1000).replace(/@/g,'@\u200b');
  const response=await fetcher('https://api.telegram.org/bot'+token+'/sendPhoto',{
   method:'POST',redirect:'error',headers:{'content-type':'application/json'},
   body:JSON.stringify({chat_id:chat,photo:picture,caption:text}),signal:AbortSignal.timeout(8000)});
  const body=await response.json().catch(()=>null);
  return {ok:response.ok&&body?.ok===true&&typeof body?.result?.message_id==='number',
    postId:body?.result?.message_id!=null?String(body.result.message_id):null};
 }catch{return {ok:false};}
}
const respond=(code,body)=>new Response(JSON.stringify(body),{status:code,headers:{
 'content-type':'application/json','cache-control':'no-store'}});
// PostgREST devuelve un thenable (implementa then(), pero no necesariamente catch()).
async function callRpc(admin,name,args){
 try {
  const result=await admin.rpc(name,args);
  return result && typeof result==='object' ? result : {error:true};
 }catch{return {error:true};}
}
// Nunca liberar automáticamente el atraso acumulado al reparar el despachador.
// Se detienen TODOS los envíos automáticos hasta que una persona revise los vencidos.
const OVERDUE_REVIEW_MS=15*60*1000;
async function unreviewedOverdue(admin,now){
 try {
  const limit=new Date(now()-OVERDUE_REVIEW_MS).toISOString();
  const result=await admin.from('diffusion_scheduled_announcements').select('id')
   .eq('status','planned').eq('delivery_mode','automatic').lte('scheduled_at',limit).limit(1);
  if(result?.error||!Array.isArray(result?.data))return null; // fail closed
  return result.data.length>0;
 }catch{return null;}
}
export async function handleDispatch(request,{createAdmin,baseUrl,fetcher=fetch,now=Date.now}){
 if(request.method!=='POST'||request.headers.get('origin'))return respond(405,{error:'method_not_allowed'});
 const ticket=request.headers.get('x-diffusion-ticket')||'';
 if(!/^[a-f0-9]{64}$/.test(ticket))return respond(401,{error:'unauthorized'});
 if(typeof baseUrl!=='string'||!baseUrl.startsWith('https://'))return respond(503,{error:'server_not_configured'});
 let admin;try{admin=createAdmin()}catch{return respond(503,{error:'server_not_configured'})}
 const consumed=await callRpc(admin,'diffusion_4b_consume_ticket',{p_ticket:ticket});
 if(consumed.error||consumed.data!==true)return respond(401,{error:'unauthorized'});
 const overdue=await unreviewedOverdue(admin,now);
 if(overdue===null)return respond(503,{error:'overdue_check_failed'});
 if(overdue)return respond(409,{error:'overdue_plans_require_review'});
 let sent=0,uncertain=0,blocked=0;
 for(let i=0;i<3;i++){
  const result=await callRpc(admin,'diffusion_4b_claim');
  if(result.error)return respond(503,{error:'claim_failed',sent,uncertain,blocked});
  const item=result.data;
  if(!item)break;
  if(item.skipped===true){blocked++;continue}
  let delivery={ok:false};
  try{delivery=await providerPost(item,admin,baseUrl,fetcher)}catch{}
  const saved=await callRpc(admin,'diffusion_4b_complete',{p_plan:item.plan_id,p_job:item.job,
    p_success:delivery.ok===true,p_post_id:delivery.postId||null});
  if(saved.error||saved.data!==true)uncertain++;
  else if(delivery.ok)sent++;
  else uncertain++;
 }
 return respond(200,{ok:true,sent,uncertain,blocked});
}

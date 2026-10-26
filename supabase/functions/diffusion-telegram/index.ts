// Telegram fase 2c: prueba o anuncio manual. Sin polling, cron ni destinos arbitrarios.
import { createClient } from 'npm:@supabase/supabase-js@2';
const origins=new Set(['https://elobidellector.com','https://www.elobidellector.com',
 'https://theobiproject.vercel.app','http://localhost:3000']);
const supa=Deno.env.get('SUPABASE_URL')||'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const options={auth:{persistSession:false,autoRefreshToken:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenValid=/^[0-9]{5,15}:[A-Za-z0-9_-]{30,80}$/;
const chatValid=/^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{6,16})$/;
function answer(body:Record<string,unknown>,status:number,origin:string|null){
 return new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json','access-control-allow-origin':origin&&origins.has(origin)?origin:'https://elobidellector.com',
  'access-control-allow-headers':'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods':'POST, OPTIONS','cache-control':'no-store','vary':'Origin'
 }});
}
function photoUrl(input:unknown):string|null{
 if(typeof input!=='string'||!input||input.length>450||input.includes('..')
    ||input.startsWith('/')||!/^[A-Za-z0-9_./-]+$/.test(input))return null;
 return supa+'/storage/v1/object/public/obi-media/'
   +input.split('/').map(encodeURIComponent).join('/');
}
// Códigos controlados: nunca devolver las URLs privadas del bot, respuesta ni token.
class TelegramRequestError extends Error {
 code:string;
 constructor(code:string){super(code);this.code=code;}
}
async function telegram(token:string,method:string,body:Record<string,unknown>){
 let response:Response;
 try {
  response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{
   method:'POST',redirect:'error',headers:{'content-type':'application/json'},
   body:JSON.stringify(body),signal:AbortSignal.timeout(8000)
  });
 }catch{throw new TelegramRequestError('telegram_api_unreachable');}
 const parsed=await response.json().catch(()=>null);
 if(!response.ok||parsed?.ok!==true){
  let code='telegram_api_error';
  if(response.status===429)code='telegram_api_rate_limited';
  else if(method==='getMe'&&(response.status===401||response.status===404))
   code='telegram_token_invalid';
  else if(method==='getChat'&&(response.status===400||response.status===403))
   code='telegram_channel_unavailable';
  else if(method==='getChatMember'&&(response.status===400||response.status===403))
   code='telegram_bot_not_member';
  else if(method==='sendMessage'&&response.status===403)
   code='telegram_bot_blocked';
  else if(method==='sendMessage'&&response.status===400)
   code='telegram_cannot_send';
  else if(method==='sendPhoto'&&response.status===400)
   code='telegram_photo_unavailable';
  throw new TelegramRequestError(code);
 }
 return parsed.result;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 if(origin&&!origins.has(origin))return answer({error:'origin_denied'},403,origin);
 if(req.method==='OPTIONS')return answer({ok:true},200,origin);
 if(req.method!=='POST')return answer({error:'method_not_allowed'},405,origin);
 if(!supa||!anon||!service)return answer({error:'server_not_configured'},503,origin);
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))return answer({error:'unauthorized'},401,origin);
 let input:Record<string,unknown>;
 try{
  input=await req.json();
  if(!input||typeof input!=='object'||Array.isArray(input)
     ||typeof input.connection_id!=='string'||!uuid.test(input.connection_id)
     ||!['test','announce'].includes(String(input.action))
     ||(input.action==='announce'&&(
       typeof input.source_id!=='string'||!uuid.test(input.source_id)
       ||!['series','volume','chapter'].includes(String(input.kind))
       ||typeof input.message!=='string'||!input.message.trim()
       ||input.message.trim().length>700)))
   return answer({error:'invalid_request'},400,origin);
 }catch{return answer({error:'invalid_request'},400,origin);}
 const user=createClient(supa,anon,{...options,global:{headers:{Authorization:bearer}}});
 const verified=await user.auth.getUser(bearer.slice(7));
 if(verified.error||!verified.data.user||verified.data.user.is_anonymous)
   return answer({error:'unauthorized'},401,origin);
 const isTest=input.action==='test';
 const claim=await user.rpc(isTest?'diffusion_telegram_test_claim':'diffusion_telegram_announcement_claim',
  isTest?{p_id:input.connection_id}:{
   p_connection:input.connection_id,p_kind:input.kind,p_source:input.source_id
  });
 if(claim.error||(isTest?claim.data!==true:!claim.data?.job_id)){
  const reason=claim.error?.message||'';
  const known=['rate_limited','already_announced','not_public','missing_volume_cover','missing_work_cover','invalid_cover_path'];
  const error=known.includes(reason)?reason:'forbidden';
  return answer({error},error==='rate_limited'?429:error==='already_announced'?409:403,origin);
 }
 const server=createClient(supa,service,options);
 const secret=await server.rpc('diffusion_telegram_secret_resolve',{p_id:input.connection_id});
 const token=secret.data?.token,chat=secret.data?.chat_id;
 const valid=!secret.error&&typeof token==='string'&&tokenValid.test(token)
   &&typeof chat==='string'&&chatValid.test(chat);
 let sent=false,messageId:string|null=null;
 let failure='telegram_delivery_failed';
 if(!valid)failure='telegram_credential_unavailable';
 if(valid){
  try{
   if(isTest){
    const bot=await telegram(token,'getMe',{});
    if(!bot?.id)throw new TelegramRequestError('telegram_token_invalid');
    const destination=await telegram(token,'getChat',{chat_id:chat});
    if(!destination)throw new TelegramRequestError('telegram_channel_unavailable');
    if(destination.type==='group'||destination.type==='supergroup')
      throw new TelegramRequestError('telegram_group_not_supported');
    if(destination.type!=='channel')
      throw new TelegramRequestError('telegram_not_channel');
    const member=await telegram(token,'getChatMember',{chat_id:chat,user_id:bot.id});
    if(!member)throw new TelegramRequestError('telegram_bot_not_member');
    const canPost=member.status==='creator'
      ||(member.status==='administrator'&&member.can_post_messages===true);
    if(!canPost)throw new TelegramRequestError('telegram_bot_no_post_permission');
    const res=await telegram(token,'sendMessage',{
     chat_id:chat,
     text:'🧪 Prueba de conexión · El Obi del Lector\nMensaje enviado manualmente. No activa publicaciones automáticas.',
     link_preview_options:{is_disabled:true}
    });
    sent=typeof res?.message_id==='number';
    if(!sent)failure='telegram_delivery_failed';
   }else{
    const payload=claim.data as Record<string,unknown>;
    const cover=photoUrl(payload.cover_path);
    if(cover){
     const title=String(payload.title||'El Obi del Lector').slice(0,180);
     const url=String(payload.url||'').slice(0,240);
     const description=String(input.message).trim().slice(0,650);
     const caption=(title+'\n\n'+description+'\n\n'+url).slice(0,1000);
     const res=await telegram(token,'sendPhoto',{
      chat_id:chat,photo:cover,caption,protect_content:false
     });
     sent=typeof res?.message_id==='number';
     if(sent)messageId=String(res.message_id);
    }
   }
  }catch(e){
   sent=false;
   failure=e instanceof TelegramRequestError?e.code:'telegram_api_unreachable';
  }
 }
 if(isTest){
  const result=await server.rpc('diffusion_telegram_mark_test',{p_id:input.connection_id,p_success:sent});
  if(result.error)return answer({error:'state_update_failed'},503,origin);
  return sent?answer({ok:true},200,origin):answer({error:failure},502,origin);
 }
 const complete=await server.rpc('diffusion_telegram_announcement_complete',{
  p_job:claim.data.job_id,p_success:sent,p_post_id:messageId
 });
 if(complete.error)return answer({error:'delivery_state_unconfirmed'},503,origin);
 return sent?answer({ok:true},200,origin):answer({error:'delivery_unconfirmed'},502,origin);
});

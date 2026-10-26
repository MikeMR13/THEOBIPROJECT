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
async function telegram(token:string,method:string,body:Record<string,unknown>){
 // Origin fijo: la credencial nunca llega a URL controlada por navegador.
 const response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{
  method:'POST',redirect:'error',headers:{'content-type':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(8000)
 });
 const parsed=await response.json().catch(()=>null);
 return response.ok&&parsed?.ok===true?parsed?.result:null;
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
 if(valid){
  try{
   if(isTest){
    const bot=await telegram(token,'getMe',{});
    const destination=bot?.id?await telegram(token,'getChat',{chat_id:chat}):null;
    const member=destination?.type==='channel'
      ?await telegram(token,'getChatMember',{chat_id:chat,user_id:bot.id}):null;
    const canPost=member?.status==='creator'
      ||(member?.status==='administrator'&&member?.can_post_messages===true);
    if(canPost){
     const res=await telegram(token,'sendMessage',{
      chat_id:chat,
      text:'🧪 Prueba de conexión · El Obi del Lector\nMensaje enviado manualmente. No activa publicaciones automáticas.',
      link_preview_options:{is_disabled:true}
     });
     sent=typeof res?.message_id==='number';
    }
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
  }catch{sent=false;}
 }
 if(isTest){
  const result=await server.rpc('diffusion_telegram_mark_test',{p_id:input.connection_id,p_success:sent});
  if(result.error)return answer({error:'state_update_failed'},503,origin);
  return sent?answer({ok:true},200,origin):answer({error:'telegram_delivery_failed'},502,origin);
 }
 const complete=await server.rpc('diffusion_telegram_announcement_complete',{
  p_job:claim.data.job_id,p_success:sent,p_post_id:messageId
 });
 if(complete.error)return answer({error:'delivery_state_unconfirmed'},503,origin);
 return sent?answer({ok:true},200,origin):answer({error:'delivery_unconfirmed'},502,origin);
});

// Anuncios editoriales manuales: revalidación antes de enviar, cero automatización.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateDiscordWebhook } from './validate.mjs';
const origins=new Set(['https://elobidellector.com','https://www.elobidellector.com',
  'https://theobiproject.vercel.app','http://localhost:3000']);
const url=Deno.env.get('SUPABASE_URL')||'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const options={auth:{persistSession:false,autoRefreshToken:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function answer(body:Record<string,unknown>,status:number,origin:string|null) {
 return new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json','access-control-allow-origin':
    origin&&origins.has(origin)?origin:'https://elobidellector.com',
  'access-control-allow-headers':'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods':'POST, OPTIONS','cache-control':'no-store','vary':'Origin'
 }});
}
function cover(path:unknown):string|null {
 if(typeof path!=='string'||!path||path.length>450||path.includes('..')
    ||path.startsWith('/')||!/^[A-Za-z0-9_./-]+$/.test(path))return null;
 return url+'/storage/v1/object/public/obi-media/'
   +path.split('/').map(encodeURIComponent).join('/');
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 if(origin&&!origins.has(origin))return answer({error:'origin_denied'},403,origin);
 if(req.method==='OPTIONS')return answer({ok:true},200,origin);
 if(req.method!=='POST')return answer({error:'method_not_allowed'},405,origin);
 if(!url||!anon||!service)return answer({error:'server_not_configured'},503,origin);
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))return answer({error:'unauthorized'},401,origin);
 let input:Record<string,unknown>;
 try{
  input=await req.json();
  if(!input||typeof input!=='object'||Array.isArray(input)
     ||typeof input.connection_id!=='string'||!uuid.test(input.connection_id)
     ||typeof input.source_id!=='string'||!uuid.test(input.source_id)
     ||!['series','volume','chapter'].includes(String(input.kind))
     ||typeof input.message!=='string'||!input.message.trim()
     ||input.message.trim().length>700)
    return answer({error:'invalid_request'},400,origin);
 }catch{return answer({error:'invalid_request'},400,origin);}
 const user=createClient(url,anon,{...options,global:{headers:{Authorization:bearer}}});
 const verified=await user.auth.getUser(bearer.slice(7));
 if(verified.error||!verified.data.user||verified.data.user.is_anonymous)
   return answer({error:'unauthorized'},401,origin);
 // El cliente no puede indicar una URL o un título. SQL reconstruye y valida el contenido.
 const claim=await user.rpc('diffusion_discord_announcement_claim',{
  p_connection:input.connection_id,p_kind:input.kind,p_source:input.source_id
 });
 if(claim.error||!claim.data?.job_id) {
  const r=claim.error?.message||'';
  const code=['already_announced','rate_limited','not_public'].includes(r)?r:'forbidden';
  return answer({error:code},code==='already_announced'?409:code==='rate_limited'?429:403,origin);
 }
 const data=claim.data as Record<string,unknown>;
 const server=createClient(url,service,options);
 const secret=await server.rpc('diffusion_discord_secret_resolve',{p_id:input.connection_id});
 let sent=false,discordId:string|null=null;
 if(!secret.error&&validateDiscordWebhook(secret.data)){
  const embed:Record<string,unknown>={
    title:String(data.title||'Nueva publicación').slice(0,256),
    url:String(data.url||''),
    description:(String(input.message).trim()+'\n\n'+String(data.description||'')).slice(0,1800),
    color:14002251,footer:{text:'El Obi del Lector · Difusión manual'}
  };
  const picture=cover(data.cover_path);
  if(picture)embed.thumbnail={url:picture};
  try {
   const res=await fetch(secret.data+'?wait=true',{
    method:'POST',redirect:'error',headers:{'content-type':'application/json'},
    body:JSON.stringify({embeds:[embed],allowed_mentions:{parse:[]}}),
    signal:AbortSignal.timeout(8000)
   });
   sent=res.ok;
   if(sent){try{const info=await res.json();if(typeof info?.id==='string')discordId=info.id;}catch{}}
  }catch{sent=false;}
 }
 // Un timeout podría significar entregado: registrar 'unknown' evita reenvíos duplicados.
 const done=await server.rpc('diffusion_discord_announcement_complete',{
  p_job:data.job_id,p_success:sent,p_post_id:discordId
 });
 if(done.error)return answer({error:'delivery_state_unconfirmed'},503,origin);
 return sent?answer({ok:true},200,origin):answer({error:'delivery_unconfirmed'},502,origin);
});

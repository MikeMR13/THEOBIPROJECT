// Despachador 4B: invocable solo con ticket efímero generado por pg_cron.
 // JWT desactivado SOLO en este endpoint; el ticket se consume atómicamente antes de cualquier envío.
import {createClient} from 'npm:@supabase/supabase-js@2';
import {handleDispatch} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')||'';
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const options={auth:{persistSession:false,autoRefreshToken:false}};
Deno.serve(req=>handleDispatch(req,{baseUrl:url,createAdmin:()=>{
 if(!key||!url)throw new Error('not_configured');
 return createClient(url,key,options);
}}));

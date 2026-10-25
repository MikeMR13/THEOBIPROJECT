// Difusión Discord: SOLO pruebas manuales explícitas con JWT de usuario.
// No admite destinos HTTP arbitrarios, contenido editable, cron ni envíos automáticos.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateDiscordWebhook } from './validate.mjs';

const originList = new Set([
  'https://elobidellector.com',
  'https://www.elobidellector.com',
  'https://theobiproject.vercel.app',
  'http://localhost:3000'
]);
const key = Deno.env.get('SUPABASE_ANON_KEY') || '';
const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const url = Deno.env.get('SUPABASE_URL') || '';
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

function response(body: Record<string, unknown>, status: number, origin: string | null) {
  const allow = origin && originList.has(origin) ? origin : 'https://elobidellector.com';
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': allow,
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'Origin',
    'cache-control': 'no-store',
  }});
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin && !originList.has(origin)) return response({ error:'origin_denied' },403,origin);
  if (req.method === 'OPTIONS') return response({ ok: true },200,origin);
  if (req.method !== 'POST') return response({ error:'method_not_allowed' },405,origin);
  if (!url || !key || !serverKey) return response({ error:'server_not_configured' },503,origin);
  const bearer = req.headers.get('authorization') || '';
  if (!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer)) return response({ error:'unauthorized' },401,origin);
  const jwt = bearer.slice(7);
  let id: string;
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || typeof body.connection_id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.connection_id)) {
      return response({ error:'invalid_request' },400,origin);
    }
    id = body.connection_id;
  } catch { return response({ error:'invalid_request' },400,origin); }

  const user = createClient(url,key,{ ...opts, global:{ headers:{ Authorization:bearer } } });
  const verified = await user.auth.getUser(jwt);
  if (verified.error || !verified.data.user || verified.data.user.is_anonymous)
    return response({ error:'unauthorized' },401,origin);

  // El claim comprueba pertenencia/permiso y limita a un envío cada 60 segundos.
  const claim = await user.rpc('diffusion_discord_test_claim',{ p_id:id });
  if (claim.error || claim.data !== true)
    return response({ error: claim.error?.message === 'rate_limited' ? 'rate_limited' : 'forbidden' },
      claim.error?.message === 'rate_limited' ? 429 : 403,origin);

  const server = createClient(url,serverKey,opts);
  const secret = await server.rpc('diffusion_discord_secret_resolve',{ p_id:id });
  if (secret.error || !validateDiscordWebhook(secret.data))
    return response({ error:'destination_unavailable' },503,origin);

  let ok = false;
  try {
    const discord = await fetch(secret.data+'?wait=true',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({
        content:'🧪 Prueba de conexión · El Obi del Lector\nEste mensaje fue enviado manualmente desde el Centro de Difusión. No activa publicaciones automáticas.',
        allowed_mentions:{ parse:[] }
      }),
      signal:AbortSignal.timeout(8000)
    });
    ok = discord.ok;
    // No registrar URL, token, respuesta de Discord ni encabezados.
  } catch { ok=false; }
  const mark = await server.rpc('diffusion_discord_mark_test',{p_id:id,p_success:ok});
  if (mark.error) return response({error:'state_update_failed'},503,origin);
  return ok ? response({ok:true,message:'Discord recibió la prueba'},200,origin)
    : response({ok:false,error:'discord_delivery_failed'},502,origin);
});

// Webhook de Patreon: activa/retira el nivel de donador en profiles según el email o patreon_user_id.
import { createHmac, timingSafeEqual } from 'node:crypto';
const sb = (env, path, init = {}) => fetch(env.SUPABASE_URL + '/rest/v1/' + path, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...(init.headers || {}) } });
export default {
  async fetch(req, env){
    if (req.method !== 'POST') return new Response('El Obi · patreon');
    const raw = await req.text();
    const sig = req.headers.get('x-patreon-signature') || '';
    const mac = createHmac('md5', env.PATREON_WEBHOOK_SECRET).update(raw).digest('hex');
    if (sig.length !== mac.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(mac))) return new Response('firma inválida', { status: 401 });
    const event = req.headers.get('x-patreon-event'), body = JSON.parse(raw);
    const member = body.data, attrs = member?.attributes || {};
    const patreonUserId = member?.relationships?.user?.data?.id;
    const tierId = member?.relationships?.currently_entitled_tiers?.data?.[0]?.id;
    let tier = null;
    if (tierId) tier = (await (await sb(env, 'patreon_tiers?select=id,team_id&patreon_tier_id=eq.' + tierId)).json())[0] || null;
    const active = event !== 'members:pledge:delete' && attrs.patron_status === 'active_patron';
    const patch = active ? { donor_tier: tier?.id || 'mesa', donor_until: null, patreon_user_id: patreonUserId } : { donor_until: attrs.next_charge_date || new Date().toISOString() };
    const users = await (await sb(env, 'rpc/obi_user_by_email', { method: 'POST', body: JSON.stringify({ e: attrs.email || '' }) })).json();
    const target = Array.isArray(users) && users[0] ? 'id=eq.' + users[0] : 'patreon_user_id=eq.' + patreonUserId;
    await sb(env, 'profiles?' + target, { method: 'PATCH', body: JSON.stringify(patch) });
    await sb(env, 'patreon_events', { method: 'POST', body: JSON.stringify({ team_id: tier?.team_id || null, event, payload: { email: attrs.email, status: attrs.patron_status, tier: tier?.id } }) });
    return new Response('ok');
  }
};
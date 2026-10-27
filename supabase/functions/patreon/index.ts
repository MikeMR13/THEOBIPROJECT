// Patreon: conexión de campañas (equipos y plataforma), vinculación/entrada de lectores, webhook y sincronización.
// Secretos: PATREON_CLIENT_ID, PATREON_CLIENT_SECRET, SITE_URL (https://tu-dominio). Desplegar con --no-verify-jwt.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const SB_URL = Deno.env.get('SUPABASE_URL')!, SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CID = Deno.env.get('PATREON_CLIENT_ID')!, CSEC = Deno.env.get('PATREON_CLIENT_SECRET')!;
const SITE = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '');
const SELF = SB_URL + '/functions/v1/patreon';
const API = 'https://www.patreon.com/api/oauth2';
const db = createClient(SB_URL, SRK, { auth: { persistSession: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
const back = (path: string, q: Record<string, string>) => Response.redirect(SITE + path + '?' + new URLSearchParams(q), 302);
const SCOPES = { creator: 'identity identity[email] campaigns campaigns.members campaigns.members[email] w:campaigns.webhook', link: 'identity identity[email] identity.memberships', login: 'identity identity[email] identity.memberships' };
const RET = { creator: (o: string) => o === 'platform' ? '/bibliotecario' : '/estudio/perfil', link: () => '/preferencias', login: () => '/entrar' };

async function token(body: Record<string, string>) {
  const r = await fetch(API + '/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CID, client_secret: CSEC, ...body }) });
  if (!r.ok) throw new Error('token ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return await r.json() as { access_token: string; refresh_token: string; expires_in: number };
}
async function get(path: string, tok: string) {
  const r = await fetch(path.startsWith('http') ? path : API + '/v2' + path, { headers: { authorization: 'Bearer ' + tok, 'user-agent': 'ObiDelLector' } });
  if (!r.ok) throw new Error('api ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return await r.json();
}
// deno-lint-ignore no-explicit-any
const tiersOf = (m: any) => (m?.relationships?.currently_entitled_tiers?.data || []).map((t: any) => String(t.id));

async function campaignToken(owner: string) {
  const { data: c } = await db.from('patreon_campaigns').select('*').eq('owner', owner).maybeSingle();
  if (!c?.access_token) throw new Error('not_connected');
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now() + 120000) {
    const t = await token({ grant_type: 'refresh_token', refresh_token: c.refresh_token });
    await db.from('patreon_campaigns').update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString() }).eq('owner', owner);
    c.access_token = t.access_token;
  }
  return c;
}

async function syncCampaign(owner: string) {
  const c = await campaignToken(owner), teamId = owner === 'platform' ? null : owner;
  const cj = await get('/campaigns?include=tiers&fields[campaign]=creation_name,vanity,url,patron_count&fields[tier]=title,amount_cents,published,description,patron_count', c.access_token);
  const camp = cj.data?.[0]; if (!camp) throw new Error('Esta cuenta de Patreon no tiene campaña de creador');
  const tiers = (cj.included || []).filter((x: any) => x.type === 'tier' && x.attributes.published && x.attributes.amount_cents > 0);
  await db.from('patreon_public').upsert({ owner, team_id: teamId, name: camp.attributes.creation_name || camp.attributes.vanity, url: camp.attributes.url, patrons: camp.attributes.patron_count || 0, synced_at: new Date().toISOString() });
  for (const t of tiers) {
    const row = { team_id: teamId, name: t.attributes.title, price_usd: t.attributes.amount_cents / 100, description: (t.attributes.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 600), patrons: t.attributes.patron_count || 0, patreon_tier_id: String(t.id) };
    const { data: ex } = await db.from('patreon_tiers').select('id').eq('patreon_tier_id', String(t.id)).maybeSingle();
    if (ex) await db.from('patreon_tiers').update(row).eq('id', ex.id); else await db.from('patreon_tiers').insert(row);
  }
  const ids = tiers.map((t: any) => String(t.id));
  let q = teamId ? db.from('patreon_tiers').delete().eq('team_id', teamId) : db.from('patreon_tiers').delete().is('team_id', null);
  q = q.not('patreon_tier_id', 'is', null); if (ids.length) q = q.not('patreon_tier_id', 'in', `(${ids.join(',')})`); await q;
  let next: string | null = `/campaigns/${camp.id}/members?include=user,currently_entitled_tiers&fields[member]=patron_status,currently_entitled_amount_cents&page[count]=500`, n = 0;
  const seen: string[] = [];
  while (next && n++ < 40) {
    const mj = await get(next, c.access_token);
    const rows = (mj.data || []).map((m: any) => ({ patreon_user_id: String(m.relationships?.user?.data?.id || ''), owner, tier_ids: tiersOf(m), cents: m.attributes.currently_entitled_amount_cents || 0, status: m.attributes.patron_status, updated_at: new Date().toISOString() })).filter((r: any) => r.patreon_user_id);
    if (rows.length) await db.from('patreon_pledges').upsert(rows); rows.forEach((r: any) => seen.push(r.patreon_user_id));
    next = mj.links?.next || null;
  }
  if (seen.length) await db.from('patreon_pledges').update({ status: 'former_patron' }).eq('owner', owner).not('patreon_user_id', 'in', `(${seen.join(',')})`);
  await db.from('patreon_campaigns').update({ campaign_id: String(camp.id), synced_at: new Date().toISOString(), last_error: null }).eq('owner', owner);
  return { tiers: tiers.length, members: seen.length };
}

async function ensureWebhook(owner: string) {
  const c = await campaignToken(owner); if (c.webhook_id) return;
  const r = await fetch(API + '/v2/webhooks', { method: 'POST', headers: { authorization: 'Bearer ' + c.access_token, 'content-type': 'application/json' }, body: JSON.stringify({ data: { type: 'webhook', attributes: { triggers: ['members:create', 'members:update', 'members:delete', 'members:pledge:create', 'members:pledge:update', 'members:pledge:delete'], uri: SELF + '?hook=' + encodeURIComponent(owner) }, relationships: { campaign: { data: { type: 'campaign', id: c.campaign_id } } } } }) });
  if (!r.ok) { await db.from('patreon_campaigns').update({ last_error: 'webhook ' + r.status }).eq('owner', owner); return; }
  const w = await r.json(); await db.from('patreon_campaigns').update({ webhook_id: String(w.data.id), webhook_secret: w.data.attributes.secret }).eq('owner', owner);
}

// deno-lint-ignore no-explicit-any
async function saveMemberships(pid: string, ij: any) {
  const mem = (ij.included || []).filter((x: any) => x.type === 'member');
  const { data: camps } = await db.from('patreon_campaigns').select('owner,campaign_id');
  const byC = Object.fromEntries((camps || []).map(c => [String(c.campaign_id), c.owner]));
  const rows = mem.map((m: any) => ({ owner: byC[String(m.relationships?.campaign?.data?.id)], patreon_user_id: pid, tier_ids: tiersOf(m), cents: m.attributes.currently_entitled_amount_cents || 0, status: m.attributes.patron_status, updated_at: new Date().toISOString() })).filter((r: any) => r.owner);
  if (rows.length) await db.from('patreon_pledges').upsert(rows);
}

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 }); if (error) throw error;
    const u = data.users.find(x => (x.email || '').toLowerCase() === email.toLowerCase()); if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}
async function magic(email: string) {
  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: SITE + '/' } });
  if (error) throw error; return data.properties.action_link;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const u = new URL(req.url);
  try {
    // Webhook de Patreon
    const hook = u.searchParams.get('hook');
    if (hook && req.method === 'POST') {
      const raw = await req.text(), { data: c } = await db.from('patreon_campaigns').select('webhook_secret').eq('owner', hook).maybeSingle();
      if (!c?.webhook_secret) return json({ error: 'unknown' }, 404);
      const sig = createHmac('md5', c.webhook_secret).update(raw).digest('hex');
      if (sig !== req.headers.get('x-patreon-signature')) return json({ error: 'bad_signature' }, 401);
      const ev = req.headers.get('x-patreon-event') || '', b = JSON.parse(raw), m = b.data, pid = String(m?.relationships?.user?.data?.id || '');
      if (pid) await db.from('patreon_pledges').upsert({ owner: hook, patreon_user_id: pid, tier_ids: ev.endsWith('delete') ? [] : tiersOf(m), cents: ev.endsWith('delete') ? 0 : (m.attributes?.currently_entitled_amount_cents || 0), status: ev === 'members:delete' ? 'deleted' : ev === 'members:pledge:delete' ? 'former_patron' : m.attributes?.patron_status, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }
    // Sincronizar a mano (desde el Estudio o el Bibliotecario)
    if (req.method === 'POST') {
      const { action, owner } = await req.json(), jwt = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
      const asUser = createClient(SB_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { authorization: 'Bearer ' + jwt } }, auth: { persistSession: false } });
      const { data: info, error } = await asUser.rpc('patreon_campaign_info', { p_owner: owner });
      if (error || !info) return json({ error: 'forbidden' }, 403);
      if (action === 'sync') { const r = await syncCampaign(owner); await ensureWebhook(owner); return json(r); }
      return json({ error: 'bad_action' }, 400);
    }
    // OAuth: inicio
    const st = u.searchParams.get('state'), code = u.searchParams.get('code');
    if (!st) return json({ error: 'missing_state' }, 400);
    const { data: S } = await db.from('patreon_states').select('*').eq('state', st).maybeSingle();
    if (!S || Date.now() - new Date(S.created_at).getTime() > 600000) return back('/entrar', { patreon: 'caducado' });
    const kind = S.kind as 'creator' | 'link' | 'login', ret = RET[kind](S.owner);
    if (!code) {
      if (u.searchParams.get('error')) { await db.from('patreon_states').delete().eq('state', st); return back(ret, { patreon: 'cancelado' }); }
      return Response.redirect('https://www.patreon.com/oauth2/authorize?' + new URLSearchParams({ response_type: 'code', client_id: CID, redirect_uri: SELF, scope: SCOPES[kind], state: st }), 302);
    }
    // OAuth: regreso
    await db.from('patreon_states').delete().eq('state', st);
    const t = await token({ grant_type: 'authorization_code', code, redirect_uri: SELF });
    if (kind === 'creator') {
      await db.from('patreon_campaigns').upsert({ owner: S.owner, team_id: S.owner === 'platform' ? null : S.owner, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(), connected_by: S.user_id, connected_at: new Date().toISOString(), webhook_id: null, webhook_secret: null });
      try { await syncCampaign(S.owner); await ensureWebhook(S.owner); } catch (e) { await db.from('patreon_campaigns').update({ last_error: String((e as Error).message).slice(0, 300) }).eq('owner', S.owner); return back(ret, { patreon: 'error', m: String((e as Error).message).slice(0, 120) }); }
      return back(ret, { patreon: 'conectado' });
    }
    const ij = await get('/identity?include=memberships,memberships.campaign,memberships.currently_entitled_tiers&fields[user]=email,full_name,is_email_verified,image_url&fields[member]=patron_status,currently_entitled_amount_cents', t.access_token);
    const pid = String(ij.data.id), email = ij.data.attributes.email as string | undefined, verified = !!ij.data.attributes.is_email_verified;
    const { data: owner, error: ownerError } = await db.from('profiles').select('id').eq('patreon_user_id', pid).maybeSingle();
    if (ownerError) throw ownerError;
    if (kind === 'link') {
      // Un Patreon solo se vincula al lector que inició el OAuth. No fusionar perfiles por correo.
      if (!S.user_id) return back(ret, { s: 'cuenta', patreon: 'error' });
      if (owner && owner.id !== S.user_id) return back(ret, { s: 'cuenta', patreon: 'en_uso' });
      const { data: linked, error: linkError } = await db.from('profiles')
        .update({ patreon_user_id: pid }).eq('id', S.user_id).select('id').maybeSingle();
      if (linkError || linked?.id !== S.user_id) return back(ret, { s: 'cuenta', patreon: 'error' });
      await saveMemberships(pid, ij); return back(ret, { s: 'cuenta', patreon: 'vinculado' });
    }
    // login / registro
    await saveMemberships(pid, ij);
    if (owner) { const { data: au } = await db.auth.admin.getUserById(owner.id); if (!au?.user?.email) return back(ret, { patreon: 'sin_correo' }); return Response.redirect(await magic(au.user.email), 302); }
    if (!email || !verified) return back(ret, { patreon: 'sin_correo' });
    if (await findUserByEmail(email)) return back(ret, { patreon: 'existe' });
    const { data: nu, error: ce } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: ij.data.attributes.full_name, avatar_url: ij.data.attributes.image_url, provider: 'patreon' } });
    if (ce) throw ce;
    for (let i = 0; i < 5; i++) { const { data: p } = await db.from('profiles').update({ patreon_user_id: pid }).eq('id', nu.user.id).select('id'); if (p?.length) break; await new Promise(r => setTimeout(r, 400)); }
    return Response.redirect(await magic(email), 302);
  } catch (e) {
    console.error(e); return back('/entrar', { patreon: 'error', m: String((e as Error).message).slice(0, 120) });
  }
});

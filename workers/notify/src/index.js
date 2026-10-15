// Avisos de capítulos por Discord y Telegram + caché KV de capítulos públicos.
const sbFetch = (env, path, init = {}) => fetch(env.SUPABASE_URL + '/rest/v1/' + path, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) } });
async function announce(env, ch){
  const s = await (await sbFetch(env, 'series?select=title,slug&id=eq.' + ch.series_id)).json();
  const serie = s[0]; if (!serie) return;
  const link = env.SITE_URL + '/leer/' + serie.slug + '/' + ch.num;
  const text = '📖 ' + serie.title + ' · Cap. ' + ch.num + ' — ' + ch.title + '\n' + link;
  const jobs = [];
  if (env.DISCORD_WEBHOOK_URL) jobs.push(fetch(env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) }));
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) jobs.push(fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }) }));
  const followers = await (await sbFetch(env, 'follows?select=user_id&series_id=eq.' + ch.series_id)).json();
  if (followers.length) jobs.push(sbFetch(env, 'notifications', { method: 'POST', body: JSON.stringify(followers.map(f => ({ user_id: f.user_id, kind: 'Capítulo', body: serie.title + ' · Cap. ' + ch.num, link: { slug: serie.slug, num: ch.num } }))) }));
  await Promise.all(jobs);
  await env.OBI_CACHE.put('announced:' + ch.id, '1', { expirationTtl: 60 * 60 * 24 * 30 });
}
export default {
  async fetch(req, env){
    const u = new URL(req.url);
    if (req.method === 'POST' && u.pathname === '/chapter') {
      if (req.headers.get('x-obi-secret') !== env.WEBHOOK_SECRET) return new Response('no', { status: 401 });
      const { record } = await req.json();
      if (record?.status === 'published' && !(await env.OBI_CACHE.get('announced:' + record.id))) await announce(env, record);
      return new Response('ok');
    }
    const m = u.pathname.match(/^\/cache\/([\w-]+)\/(\d+)$/);
    if (m) {
      const k = 'ch:' + m[1] + ':' + m[2]; let body = await env.OBI_CACHE.get(k);
      if (!body) {
        const r = await sbFetch(env, 'chapters?select=title,num,body,series!inner(slug)&status=eq.published&public_at=lte.' + new Date().toISOString() + '&series.slug=eq.' + m[1] + '&num=eq.' + m[2]);
        body = await r.text(); if (body !== '[]') await env.OBI_CACHE.put(k, body, { expirationTtl: 3600 });
      }
      return new Response(body, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': env.SITE_URL } });
    }
    return new Response('El Obi · notify', { status: 200 });
  },
  async scheduled(_e, env){
    // Publica capítulos agendados cuya hora ya llegó y los anuncia
    const now = new Date().toISOString();
    const due = await (await sbFetch(env, 'chapters?select=*&status=eq.scheduled&publish_at=lte.' + now)).json();
    for (const ch of due) { await sbFetch(env, 'chapters?id=eq.' + ch.id, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) }); await announce(env, { ...ch, status: 'published' }); }
  }
};
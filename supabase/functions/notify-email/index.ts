// Supabase Edge Function «notify-email»: envía los avisos por correo (al momento / resumen diario / semanal) vía Resend.
// Secretos: RESEND_API_KEY (ya existe para el SMTP), EMAIL_FROM, SITE_URL, CRON_SECRET (opcional).
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = Deno.env.get('EMAIL_FROM') ?? 'El Obi del Lector <biblioteca@TU-DOMINIO>';
const SITE = (Deno.env.get('SITE_URL') ?? 'https://theobiproject-cronica.vercel.app').replace(/\/$/, '');
const SECRET = Deno.env.get('CRON_SECRET');
const LBL: Record<string, string> = { capitulo: 'Capítulos nuevos', respuesta: 'Respuestas', errata: 'Erratas', tablero: 'Estudio', moderacion: 'Tu cuenta' };
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const link = (h?: string) => h && /^\/(?!\/)/.test(h) ? SITE + h : SITE + '/';
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

type Item = { id: number; kind: string; body: string; href?: string; at: string };
type U = { user_id: string; username: string; email: string; freq: string; items: Item[] };

function mail(u: U) {
  const groups = new Map<string, Item[]>();
  for (const it of u.items) groups.set(it.kind, [...(groups.get(it.kind) ?? []), it]);
  const one = u.items.length === 1;
  const subject = one ? u.items[0].body.slice(0, 110) : u.freq === 'semanal' ? `Tu semana en El Obi del Lector · ${u.items.length} avisos` : u.freq === 'diario' ? `Tu resumen de hoy · ${u.items.length} avisos` : `${u.items.length} avisos nuevos en El Obi del Lector`;
  const rows = [...groups].map(([k, l]) => `<tr><td style="padding:22px 0 6px;font:700 11px/1 monospace;letter-spacing:.14em;color:#b8952a;text-transform:uppercase">${esc(LBL[k] ?? 'Avisos')}</td></tr>`
    + l.map(i => `<tr><td style="padding:10px 0;border-top:1px solid #2c281e"><a href="${link(i.href)}" style="color:#f1ead8;text-decoration:none;font:16px/1.45 Georgia,serif">${esc(i.body)}</a></td></tr>`).join('')).join('');
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#0d0c0a;padding:28px 16px"><table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#14120e;border:1px solid #2c281e"><tr><td style="padding:28px 28px 8px">
    <p style="margin:0;font:700 22px/1.2 Georgia,serif;color:#f2c230">El Obi del Lector</p><p style="margin:6px 0 0;font:14px/1.4 sans-serif;color:#a49a82">Hola, ${esc(u.username)}.</p></td></tr>
    <tr><td style="padding:0 28px"><table role="presentation" width="100%">${rows}</table></td></tr>
    <tr><td style="padding:24px 28px 28px"><a href="${SITE}/" style="display:inline-block;background:#f2c230;color:#14120e;padding:12px 18px;font:700 14px sans-serif;text-decoration:none">Abrir la biblioteca</a>
    <p style="margin:22px 0 0;font:12px/1.5 sans-serif;color:#7d7462">Recibes este correo porque lo activaste en tus preferencias. <a href="${SITE}/preferencias?s=avisos" style="color:#a49a82">Cambiar o desactivar avisos por correo</a>.</p></td></tr></table></body></html>`;
  const text = u.items.map(i => `• ${i.body}\n  ${link(i.href)}`).join('\n') + `\n\nCambiar avisos: ${SITE}/preferencias?s=avisos`;
  return { from: FROM, to: [u.email], subject, html, text, headers: { 'List-Unsubscribe': `<${SITE}/preferencias?s=avisos>` } };
}

Deno.serve(async req => {
  if (SECRET && req.headers.get('x-cron-secret') !== SECRET) return new Response('no', { status: 401 });
  const { data, error } = await sb.rpc('email_batch', { p_limit: 40 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const ok: string[] = [], fail: string[] = [];
  for (const u of (data ?? []) as U[]) {
    if (!u.items?.length) continue;
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mail(u)) });
    (r.ok ? ok : fail).push(u.user_id);
    if (!r.ok) console.error('resend', u.user_id, r.status, await r.text());
    await wait(550); // límite de Resend: 2 por segundo
  }
  if (ok.length) { const { error: e } = await sb.rpc('email_mark_sent', { p_users: ok }); if (e) console.error('mark', e.message); }
  return Response.json({ sent: ok.length, failed: fail.length });
});

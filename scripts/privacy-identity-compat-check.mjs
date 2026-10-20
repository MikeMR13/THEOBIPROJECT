// SEG-01: el acceso público mínimo no debe afectar correo, Google ni Patreon.
// Es QA estática y local: la validación RLS funcional requiere Supabase aislado.
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
const read = p => readFileSync(p,'utf8');
const sql = read('supabase/migrations/20261114_profiles_private_owner.sql');
const required = [
  'create or replace function public.my_profile()',
  'returns jsonb','security definer',"set search_path = ''",
  'v_uid uuid := (select auth.uid())','where p.id = v_uid',
  'create or replace function public.my_adult_ok()',
  'revoke all on function public.my_profile() from public, anon',
  'revoke all on function public.my_adult_ok() from public, anon',
  'grant execute on function public.my_profile() to authenticated',
  'grant execute on function public.my_adult_ok() to authenticated',
  'revoke select on table public.profiles from public, anon, authenticated',
  'grant select (id, username, avatar_url) on table public.profiles to anon, authenticated',
  "has_column_privilege('anon','public.profiles','patreon_user_id','SELECT')",
  "has_column_privilege('service_role','public.profiles','patreon_user_id','SELECT')",
  'commit;'
];
for (const term of required)assert(sql.includes(term),'Falta protección SQL: '+term);
for (const forbidden of [
  /(?:drop|truncate)\s+table/i,
  /\b(?:delete|update|insert)\s+(?:from\s+|into\s+)?(?:auth\.users|auth\.identities|public\.patreon_pledges|public\.team_members)\b/i,
  /alter\s+table\s+(?:auth\.users|auth\.identities|public\.patreon_pledges)\b/i,
  /drop\s+policy/i,
  /alter\s+table\s+public\.profiles\s+drop/i,
  /revoke\s+(?:all|update|insert)\s+on\s+table\s+public\.profiles/i
])assert(!forbidden.test(sql),'La migración altera las vinculaciones o privilegios previos: '+forbidden);

const app=read('src/app.js'), profile=read('src/profile.js'),ui=read('src/ui.js'),patreon=read('src/patreon.js');
const expected=[
  [app,"sb.rpc('my_profile')",'carga de sesión'],
  [profile,"sb.rpc('my_profile')",'Preferencias'],
  [patreon,"sb.rpc('my_profile')",'Patreon de la cuenta'],
  [ui,"sb.rpc('my_adult_ok')",'restricción de contenido adulto'],
  [app,"sb.auth.signInWithOAuth({ provider: 'google'",'login Google'],
  [profile,"sb.auth.linkIdentity({ provider: 'google'",'vincular Google'],
  [profile,"sb.auth.unlinkIdentity(gid)",'desvincular Google'],
  [profile,"sb.auth.updateUser({ email: v }",'cambiar correo'],
  [profile,"sb.auth.resetPasswordForEmail(user.email",'recuperación por correo'],
  [patreon,"sb.rpc('patreon_begin'",'OAuth y vinculación Patreon'],
  [patreon,"sb.rpc('patreon_unlink')",'desvinculación Patreon'],
  [patreon,"sb.rpc('patreon_campaign_info'",'Patreon de equipos y plataforma'],
  [app,"sb.rpc('whoami')",'roles de cuenta'],
  [app,"sb.from('profiles').update({ hidden_series:",'biblioteca privada'],
  [profile,"sb.from('profiles').update({ notify:",'preferencias de correo'],
  [patreon,"sb.from('profiles').update({ patron_wall:",'muro de Patreon']
];
for (const [src,needle,label] of expected)assert(src.includes(needle),'Regresión de '+label+' ('+needle+')');
assert(!app.includes("sb.from('profiles').select('*')"),'La sesión todavía obtiene datos privados con SELECT *');
assert(!profile.includes("sb.from('profiles').select('username,avatar_url,bio"),'Preferencias todavía consulta campos privados directamente');
assert(!patreon.includes("sb.from('profiles').select('patreon_user_id"),'Patreon consulta su ID en tabla públicamente legible');
assert(!ui.includes("sb.from('profiles').select('adult_ok')"),'Inicio necesita el RPC de contenido adulto');
assert.equal(ui.match(/sb\.rpc\('my_adult_ok'\)/g)?.length,2,'Inicio y buscador deben ser independientes');

for (const path of readdirSync('src').filter(x=>x.endsWith('.js'))) {
  const s=read('src/'+path);
  const re=/\.from\(['"]profiles['"]\)\.select\(['"]([^'"]+)['"]\)/g;
  let m;
  while((m=re.exec(s))){
    const bad=m[1].split(',').map(x=>x.trim()).filter(x=>!['id','username','avatar_url'].includes(x));
    assert.equal(bad.length,0,'Consulta directa de campo privado en '+path+': '+bad.join(','));
  }
}
const patEdge=read('supabase/functions/patreon/index.ts');
for (const needle of [
  "db.from('profiles').select('id').eq('patreon_user_id', pid)",
  "db.from('profiles').update({ patreon_user_id: pid }).eq('id', S.user_id)",
  "db.auth.admin.getUserById(owner.id)",
  "return back(ret, { patreon: 'en_uso' })"
])assert(patEdge.includes(needle),'Contrato existente de Patreon alterado: '+needle);
const emailEdge=read('supabase/functions/notify-email/index.ts');
assert(emailEdge.includes("sb.rpc('email_batch'"),'Correo de notificaciones debe conservar sus consultas internas');
const schema=read('supabase/migrations/20261104_google_auth.sql');
assert(schema.includes('private.handle_new_user()'),'Alta Google original preservada');

console.log('SEG-01: privacidad mínima y contratos de correo, Google, Patreon, Studio y lector preservados.');

// Pruebas de estructura y seguridad sin conexión al backend productivo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const path of ['src/app.js','src/admin.js','src/admin-invitations.js','src/team-invitations.js']) {
  const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr || ('Sintaxis inválida en '+path));
}
const sql=readFileSync('supabase/migrations/20261022231500_team_invitations_one_time.sql','utf8');
const app=readFileSync('src/app.js','utf8');
const admin=readFileSync('src/admin.js','utf8');
const invites=readFileSync('src/admin-invitations.js','utf8');
const redeem=readFileSync('src/team-invitations.js','utf8');

const requireMatch=(source,pattern,msg)=>assert.match(source,pattern,msg);
requireMatch(sql,/alter table public\.team_invitations enable row level security/i,'RLS requerido');
requireMatch(sql,/revoke all on table public\.team_invitations from public, anon, authenticated/i,'La tabla no puede exponerse');
requireMatch(sql,/extensions\.gen_random_bytes\(32\)/i,'Token aleatorio de 256 bits requerido');
requireMatch(sql,/pg_catalog\.sha256\(/i,'Almacenar hash y no token');
requireMatch(sql,/invited_role <> 'owner'/i,'Nunca otorgar propiedad por enlace');
requireMatch(sql,/if auth\.uid\(\) is null or not private\.is_admin\(\)/i,'Crear invitaciones requiere Bibliotecario');
requireMatch(sql,/p_role not in \('admin','translator','editor','proofreader','collaborator'\)/i,'Roles restringidos');
requireMatch(sql,/p_hours not in \(24,48,168\)/i,'Caducidad restringida');
requireMatch(sql,/lower\(email\)[\s\S]*?email_confirmed_at is not null/i,'Validar correo confirmado en el servidor');
requireMatch(sql,/if v_email<>v_inv\.invite_email/i,'Invitación vinculada al correo');
requireMatch(sql,/for update;/i,'Canje serializado bajo bloqueo');
requireMatch(sql,/insert into public\.team_members/i,'Alta atómica al equipo');
requireMatch(sql,/set redeemed_at=now\(\),redeemed_by=auth\.uid\(\)/i,'Canje marcado como usado');
requireMatch(sql,/private\.audit\('invitacion_equipo_canjeada'/i,'Auditoría de canjes');
for(const fn of [
 'admin_invitation_create\\(uuid,text,text,integer\\)',
 'admin_invitation_list\\(integer\\)',
 'admin_invitation_revoke\\(uuid,text\\)',
 'team_invitation_preview\\(text\\)',
 'team_invitation_redeem\\(text\\)'
]) {
  requireMatch(sql,new RegExp('revoke all on function public\\.'+fn+' from public, anon','i'),'RPC no revocado: '+fn);
  requireMatch(sql,new RegExp('grant execute on function public\\.'+fn+' to authenticated','i'),'RPC sin grant: '+fn);
}
requireMatch(app,/'\/invitacion': async \(\) =>/,'Ruta de invitación registrada');
requireMatch(app,/pendingInviteToken\(\); go\(pendingInvite \? '\/invitacion' : '\/'\)/,'Volver a la invitación tras login');
requireMatch(admin,/\['invitaciones','Invitaciones'\]/,'Pestaña del Mostrador');
requireMatch(admin,/renderAdminInvitations/,'Vista del Bibliotecario');
requireMatch(invites,/admin_invitation_create/,'Creación desde UI');
requireMatch(invites,/admin_invitation_revoke/,'Revocación desde UI');
requireMatch(invites,/navigator\.clipboard\.writeText\(link\)/,'Enlace privado copiable');
requireMatch(redeem,/new URLSearchParams\(location\.hash\.slice\(1\)\)/,'URL fragment para secreto');
requireMatch(redeem,/team_invitation_preview/,'Comprobación con sesión');
requireMatch(redeem,/team_invitation_redeem/,'Canje explícito');
requireMatch(redeem,/sessionStorage\.removeItem\(KEY\)/,'Descartar token tras canje');
assert.doesNotMatch(redeem,/localStorage\.setItem/,'No guardar secreto persistentemente');
assert.doesNotMatch(sql,/update public\\.profiles[\\s\\S]{0,160}platform_role/i,'No se debe promover el rol de plataforma directamente');

console.log('OK: invitaciones, seguridad estática, sintaxis y flujo de acceso.');
console.log('FALTA: integración en Supabase staging, pruebas de concurrencia y correo real.');

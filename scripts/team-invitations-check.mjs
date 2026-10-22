// Pruebas de estructura y seguridad sin conexión al backend productivo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const path of ['src/app.js','src/admin.js','src/admin-invitations.js','src/team-invitations.js']) {
  const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr || ('Sintaxis inválida en '+path));
}
const sql=readFileSync('supabase/migrations/20261022231500_team_invitations_one_time.sql','utf8');
const openSql=readFileSync('supabase/migrations/20261022232000_team_invitation_open_links.sql','utf8');
const app=readFileSync('src/app.js','utf8');
const admin=readFileSync('src/admin.js','utf8');
const invites=readFileSync('src/admin-invitations.js','utf8');
const redeem=readFileSync('src/team-invitations.js','utf8');

const requireMatch=(source,pattern,msg)=>assert.match(source,pattern,msg);
requireMatch(sql,/alter table public\.team_invitations enable row level security/i,'RLS requerido');
requireMatch(sql,/revoke all on table public\.team_invitations from public, anon, authenticated/i,'La tabla no puede exponerse');
requireMatch(sql,/extensions\.gen_random_bytes\(32\)/i,'Token aleatorio de 256 bits requerido');
requireMatch(sql,/pg_catalog\.sha256\(/i,'Almacenar hash y no token');
requireMatch(sql,/invitation_kind='join' and team_id is not null and invited_role<>'owner'/i,
  'Invitaciones a equipos existentes no deben conceder propiedad');
requireMatch(sql,/invitation_kind='create_team' and invited_role='owner'/i,
  'El creador invitado debe asumir la propiedad de su nuevo equipo');
requireMatch(sql,/new_team_name text/i,'Conservar nombre del equipo nuevo');
requireMatch(sql,/new_team_slug text/i,'Conservar identificador del equipo nuevo');
requireMatch(sql,/if auth\.uid\(\) is null or not private\.is_admin\(\)/i,'Crear invitaciones requiere Bibliotecario');
requireMatch(sql,/p_kind='join' and p_role not in \('admin','translator','editor','proofreader','collaborator'\)/i,'Roles existentes restringidos');
requireMatch(sql,/p_kind='create_team' and p_role<>'owner'/i,'El equipo nuevo sólo puede tener propietario');
requireMatch(sql,/p_hours not in \(24,48,168\)/i,'Caducidad restringida');
requireMatch(sql,/pg_advisory_xact_lock/i,'Prevención de invitaciones duplicadas');
requireMatch(sql,/length\(btrim\(coalesce\(p_reason,''\)\)\)<12/i,'Motivo obligatorio');
requireMatch(sql,/lower\(email\)[\s\S]*?email_confirmed_at is not null/i,'Validar correo confirmado en el servidor');
requireMatch(sql,/if v_email<>v_inv\.invite_email/i,'Invitación vinculada al correo');
requireMatch(sql,/for update;/i,'Canje serializado bajo bloqueo');
requireMatch(sql,/insert into public\.teams\(name,slug\)/i,
  'El equipo nuevo sólo nace al canjear la invitación');
requireMatch(sql,/insert into public\.team_members/i,'Alta atómica al equipo');
requireMatch(sql,/set team_id=v_team_id,redeemed_at=now\(\),redeemed_by=auth\.uid\(\)/i,
  'El canje asocia el equipo creado y consume el enlace');
assert.equal((sql.match(/create function public\./g) || []).length,5,
  'El archivo SQL debe contener las 5 RPC una sola vez');
assert.equal((sql.match(/create table public\.team_invitations/g) || []).length,1,
  'La tabla de invitaciones sólo debe aparecer una vez');
requireMatch(sql,/set team_id=v_team_id,redeemed_at=now\(\),redeemed_by=auth\.uid\(\)/i,
  'Canje debe vincular el equipo antes de marcarlo como utilizado');
requireMatch(sql,/private\.audit\('invitacion_equipo_canjeada'/i,'Auditoría de canjes');
for(const fn of [
 'admin_invitation_create\\(uuid,text,text,integer,text,text,text,text\\)',
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
requireMatch(invites,/value="create_team"/,'Opción crear equipo en Mostrador');
requireMatch(invites,/role = create \? 'owner'/,'Rol de propietario en creación');
requireMatch(invites,/p_new_team_name: newName/,'La UI envía el nombre del equipo');
requireMatch(invites,/p_new_team_slug: newSlug/,'La UI envía el identificador del equipo');
requireMatch(invites,/p_reason: reason/,'La invitación envía el motivo al backend');
requireMatch(invites,/admin_invitation_revoke/,'Revocación desde UI');
requireMatch(invites,/navigator\.clipboard\.writeText\(link\)/,'Enlace privado copiable');
requireMatch(redeem,/new URLSearchParams\(location\.hash\.slice\(1\)\)/,'URL fragment para secreto');
requireMatch(redeem,/team_invitation_preview/,'Comprobación con sesión');
requireMatch(redeem,/invitation.kind === 'create_team'/,'Explicar creación del equipo al invitado');
requireMatch(redeem,/team_invitation_redeem/,'Canje explícito');
requireMatch(openSql,/alter column invite_email drop not null/i,'Enlace libre requiere email opcional');
requireMatch(openSql,/invitation_kind='join'/i,'Enlace libre solo permite equipos existentes');
requireMatch(openSql,/invited_role in \('translator','editor','proofreader','collaborator'\)/i,
  'Enlace libre prohibido para propietario y administrador');
requireMatch(openSql,/p_kind <> 'join' or p_role not in \('translator','editor','proofreader','collaborator'\)/i,
  'El servidor debe negar invitaciones libres de privilegios altos');
requireMatch(openSql,/v_inv\.invite_email is not null and v_email<>v_inv\.invite_email/g,
  'La comprobación de correo solo aplica a invitaciones personalizadas');
requireMatch(openSql,/email_confirmed_at is not null/g,
  'Correo confirmado requerido incluso en enlace libre');
assert.equal((openSql.match(/if v_inv\.invite_email is not null and v_email<>v_inv\.invite_email then/g) || []).length,2,
  'Preview y canje deben comprobar explícitamente el correo opcional');
requireMatch(openSql,/'open_link',v_inv\.invite_email is null/i,
  'El preview comunica cuando el enlace es libre');
const ownerSql=readFileSync('supabase/migrations/20261022233700_team_invitation_open_owner.sql','utf8');
requireMatch(ownerSql,/invitation_kind='create_team' and invited_role='owner'/,
  'Solo rol propietario para enlace libre que crea equipo');
requireMatch(ownerSql,/p_kind='create_team' and p_role='owner'/,
  'Backend acepta invitación libre para nuevo equipo');
requireMatch(ownerSql,/p_kind='join' and p_role in \('translator','editor','proofreader','collaborator'\)/,
  'Backend sigue rechazando administradores por enlace libre en equipo existente');
requireMatch(ownerSql,/if auth\.uid\(\) is null or not private\.is_admin\(\)/,
  'Sólo el Bibliotecario emite enlaces de nuevo equipo');
requireMatch(ownerSql,/pg_advisory_xact_lock/,
  'La emisión sigue serializada');

requireMatch(invitationUi,/const open = form\.elements\.target\.value === 'open'/,
  'Enlace libre también para equipo nuevo');
requireMatch(invitationUi,/ATENCIÓN: la primera persona/,
  'Se advierte la entrega de propiedad al primer reclamante');
const invitationUi=readFileSync('src/admin-invitations.js','utf8');
requireMatch(invitationUi,/name="target"/,'Selector de destinatario');
requireMatch(invitationUi,/option value="open"/,'Opción enlace libre');
requireMatch(invitationUi,/email = open \? null/,'UI envía email nulo para enlace libre');
requireMatch(invitationUi,/adminOption\.disabled = open && !create/,'Admin inhabilitado solo en enlace libre a equipo existente');

requireMatch(redeem,/sessionStorage\.removeItem\(KEY\)/,'Descartar token tras canje');
assert.doesNotMatch(redeem,/localStorage\.setItem/,'No guardar secreto persistentemente');
assert.doesNotMatch(sql,/update public[.]profiles.{0,160}platform_role/is,'No se debe promover el rol de plataforma directamente');

console.log('OK: invitaciones, seguridad estática, sintaxis y flujo de acceso.');
console.log('FALTA: integración en Supabase staging, pruebas de concurrencia y correo real.');

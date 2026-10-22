// Integración funcional: GoTrue + PostgREST + PostgreSQL efímeros en GitHub Actions.
// Nunca acepta conexión a un proyecto alojado. Usa únicamente usuarios ficticios.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url=process.env.OBI_QA_API_URL, anon=process.env.OBI_QA_ANON_KEY, service=process.env.OBI_QA_SERVICE_KEY;
assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url||''),'Bloqueado: solo Supabase local HTTP');
assert(anon && service && anon!==service,'Faltan claves de Supabase local');
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const c=key=>createClient(url,key,opts);
const root=c(service), guest=c(anon);
const ok=(r,step)=>{assert.equal(r.error,null,step+': '+(r.error?.message||''));return r.data};
const denied=(r,step)=>assert(r.error,step+': operación indebida permitida');
const pw='TestingPass123!QA';
async function account(name,admin=false){
  const email='qa-inv-'+name+'@example.test';
  const session=c(anon);
  const signup=ok(await session.auth.signUp({email,password:pw}),name+' signup');
  const uid=signup.user?.id;
  assert(uid,name+' no recibió ID de GoTrue');
  assert.equal(signup.session,null,name+' debe confirmar correo antes de iniciar sesión');
  const beforeConfirm=await session.auth.signInWithPassword({email,password:pw});
  denied(beforeConfirm,name+' no inicia sesión con correo sin confirmar');
  // La simulación local confirma el correo por la API administrativa de GoTrue.
  // No toca cuentas alojadas ni depende de servicios de correo comerciales.
  ok(await root.auth.admin.updateUserById(uid,{email_confirm:true}),name+' confirmar correo local');
  ok(await root.from('profiles').insert({id:uid,username:'qa_'+name,platform_role:admin?'bibliotecario':'lector'}),name+' profile');
  const login=ok(await session.auth.signInWithPassword({email,password:pw}),name+' inicio de sesión');
  assert(login.session?.access_token,name+' token JWT real');
  return {uid,email,session};
}
console.log('QA: crear 4 identidades GoTrue reales de prueba');
const bibliotecario=await account('bibliotecario',true);
const owner=await account('propietario');
const outsider=await account('ajeno');
const nextMember=await account('colaborador');
const openOne=await account('enlace-libre-uno');
const openTwo=await account('enlace-libre-dos');

const make=async (args)=>bibliotecario.session.rpc('admin_invitation_create',{
  p_team:null,p_email:owner.email,p_role:'owner',p_hours:48,
  p_reason:'Alta de equipo solicitada por el Bibliotecario',
  p_kind:'create_team',p_new_team_name:'Equipo QA Lector',
  p_new_team_slug:'equipo-qa-unico',...args
});
console.log('QA: autorización de invitaciones y límites de privilegios');
denied(await guest.rpc('admin_invitation_list',{p_limit:100}),'anon no puede listar');
denied(await outsider.session.rpc('admin_invitation_list',{p_limit:100}),'lector no puede listar');
denied(await outsider.session.rpc('admin_invitation_create',{
  p_team:null,p_email:outsider.email,p_role:'owner',p_hours:48,
  p_reason:'Motivo de prueba suficiente',p_kind:'create_team',
  p_new_team_name:'Malicioso',p_new_team_slug:'equipo-malicioso'
}),'lector no puede invitar');
denied(await make({p_role:'admin'}),'equipo nuevo exige propietario');
denied(await make({p_reason:'corto'}),'motivo obligatorio');
const created=ok(await make(),'crear invitación de equipo');
assert(/^[0-9a-f]{64}$/.test(created.token),'Token debe ser 256 bits');
assert.equal(created.kind,'create_team');
const before=ok(await root.from('teams').select('id').eq('slug','equipo-qa-unico'),'no crear anticipadamente');
assert.equal(before.length,0,'El equipo se creó antes de aceptar la invitación');
const status=ok(await bibliotecario.session.rpc('admin_invitation_list',{p_limit:100}),'listar invitaciones');
assert(status.some(x=>x.invitation_kind==='create_team'&&x.status==='pendiente'),'No aparece invitación pendiente');
const hashes=ok(await root.from('team_invitations').select('token_hash,invited_role').eq('id',created.id),'comprobar hash');
assert.equal(hashes.length,1);
assert.notEqual(hashes[0].token_hash,created.token,'Se almacenó un token sin hash');
assert.equal(hashes[0].invited_role,'owner');

console.log('QA: acceso únicamente desde la cuenta y correo invitado');
denied(await guest.rpc('team_invitation_preview',{p_token:created.token}),'anon no puede consultar');
denied(await outsider.session.rpc('team_invitation_preview',{p_token:created.token}),'correo diferente en preview');
denied(await outsider.session.rpc('team_invitation_redeem',{p_token:created.token}),'correo diferente en canje');
const preview=ok(await owner.session.rpc('team_invitation_preview',{p_token:created.token}),'consulta con correo correcto');
assert.equal(preview.kind,'create_team');
assert.equal(preview.role,'owner');
assert.equal(preview.team_name,'Equipo QA Lector');

console.log('QA: dos canjes simultáneos, propietario único, no se duplican equipos');
const duo=await Promise.all([
  owner.session.rpc('team_invitation_redeem',{p_token:created.token}),
  owner.session.rpc('team_invitation_redeem',{p_token:created.token})
]);
assert.equal(duo.filter(r=>!r.error).length,1,'Debe completarse exactamente un canje');
assert.equal(duo.filter(r=>!!r.error).length,1,'Un segundo canje debe ser rechazado');
const redeemed=duo.find(r=>!r.error).data;
assert.equal(redeemed.kind,'create_team');
assert.equal(redeemed.role,'owner');
const teams=ok(await root.from('teams').select('id,name,slug,official_verified').eq('slug','equipo-qa-unico'),'equipo creado');
assert.equal(teams.length,1,'Se crearon equipos duplicados');
assert.equal(teams[0].id,redeemed.team_id);
assert.equal(teams[0].official_verified,false,'La invitación no verifica automáticamente');
const members=ok(await root.from('team_members').select('user_id,role').eq('team_id',redeemed.team_id),'miembros equipo');
assert.deepEqual(members,[{user_id:owner.uid,role:'owner'}],'Propietario debe ser único');
const platformOwner=ok(await root.from('profiles').select('platform_role').eq('id',owner.uid).single(),'perfil del nuevo propietario');
assert.equal(platformOwner.platform_role,'publicador','Debe ser publicador, no Bibliotecario');
denied(await owner.session.rpc('admin_invitation_list',{p_limit:100}),'owner no es Bibliotecario');
denied(await owner.session.rpc('team_invitation_redeem',{p_token:created.token}),'segundo canje posterior');
const used=ok(await bibliotecario.session.rpc('admin_invitation_list',{p_limit:100}),'comprobar estado final');
assert(used.some(x=>x.id===created.id&&x.status==='utilizada'));

console.log('QA: invitación normal para un segundo miembro, sin transferir propiedad');
const join=ok(await bibliotecario.session.rpc('admin_invitation_create',{
  p_team:redeemed.team_id,p_email:nextMember.email,p_role:'admin',p_hours:24,
  p_reason:'Incorporación como administrador interno',p_kind:'join',
  p_new_team_name:null,p_new_team_slug:null
}),'invitar admin al equipo existente');
const joined=ok(await nextMember.session.rpc('team_invitation_redeem',{p_token:join.token}),'aceptar admin de equipo');
assert.equal(joined.role,'admin');
const after=ok(await root.from('team_members').select('user_id,role').eq('team_id',redeemed.team_id),'roles tras invitación');
assert(after.some(x=>x.user_id===owner.uid&&x.role==='owner'),'Propietario inicial intacto');
assert(after.some(x=>x.user_id===nextMember.uid&&x.role==='admin'),'Administrador agregado');

console.log('QA: enlace libre sin destinatario, con límites de rol y correo verificado');
const basicOpen = {
  p_team:redeemed.team_id,p_email:null,p_role:'translator',p_hours:24,
  p_reason:'Compartir invitación de traductor con equipo existente',
  p_kind:'join',p_new_team_name:null,p_new_team_slug:null
};
denied(await bibliotecario.session.rpc('admin_invitation_create',{
  ...basicOpen,p_role:'admin'
}),'Enlace libre no permite administrador');
denied(await bibliotecario.session.rpc('admin_invitation_create',{
  ...basicOpen,p_role:'owner'
}),'Enlace libre no permite propietario');
denied(await bibliotecario.session.rpc('admin_invitation_create',{
  ...basicOpen,p_kind:'create_team',p_team:null,p_role:'owner',
  p_new_team_name:'Prohibido',p_new_team_slug:'prohibido-open-team'
}),'Enlace libre no permite crear equipo');
const openCreated=ok(await bibliotecario.session.rpc('admin_invitation_create',basicOpen),'enlace libre válido');
const openStatus=ok(await bibliotecario.session.rpc('admin_invitation_list',{p_limit:100}),'listar enlaces libres');
assert(openStatus.some(x=>x.id===openCreated.id&&x.invite_email===null&&x.status==='pendiente'),
  'Enlace libre debe aparecer sin correo y como pendiente');
const openPreview=ok(await openOne.session.rpc('team_invitation_preview',{p_token:openCreated.token}),
  'preview libre desde correo diferente');
assert.equal(openPreview.open_link,true,'El preview debe identificar enlace libre');
assert.equal(openPreview.role,'translator');
assert.equal(openPreview.kind,'join');
denied(await guest.rpc('team_invitation_redeem',{p_token:openCreated.token}),
  'Visitante sin sesión no puede reclamar enlace');
const race=await Promise.all([
  openOne.session.rpc('team_invitation_redeem',{p_token:openCreated.token}),
  openTwo.session.rpc('team_invitation_redeem',{p_token:openCreated.token})
]);
assert.equal(race.filter(x=>!x.error).length,1,'Enlace libre debe aceptar exactamente una cuenta');
assert.equal(race.filter(x=>!!x.error).length,1,'Un segundo reclamante debe ser rechazado');
const winner=race.find(x=>!x.error).data;
assert.equal(winner.team_id,redeemed.team_id);
assert.equal(winner.role,'translator');
const openMembers=ok(await root.from('team_members').select('user_id,role').eq('team_id',redeemed.team_id),
  'miembros tras enlace libre');
const openNewMembers=openMembers.filter(x=>x.user_id===openOne.uid||x.user_id===openTwo.uid);
assert.equal(openNewMembers.length,1,'El enlace libre incorporó múltiples personas');
assert.equal(openNewMembers[0].role,'translator');
assert(openMembers.some(x=>x.user_id===owner.uid&&x.role==='owner'),'Propietario debe mantenerse');
assert(openMembers.some(x=>x.user_id===nextMember.uid&&x.role==='admin'),'Administrador existente debe mantenerse');
denied(await openOne.session.rpc('admin_invitation_list',{p_limit:100}),
  'Quien reclama enlace libre no puede gestionar invitaciones');
denied(await openTwo.session.rpc('admin_invitation_list',{p_limit:100}),
  'Segundo usuario no puede gestionar invitaciones');
denied(await openOne.session.rpc('team_invitation_redeem',{p_token:openCreated.token}),
  'No reutilizar enlace libre');
const openUsed=ok(await bibliotecario.session.rpc('admin_invitation_list',{p_limit:100}),
  'enlace libre consumido');
assert(openUsed.some(x=>x.id===openCreated.id&&x.status==='utilizada'),
  'Enlace libre debe quedar consumido');

console.log('QA: revocación y no reutilización');
const pending=ok(await bibliotecario.session.rpc('admin_invitation_create',{
  p_team:redeemed.team_id,p_email:outsider.email,p_role:'translator',p_hours:48,
  p_reason:'Evaluación de traductor de prueba',p_kind:'join',
  p_new_team_name:null,p_new_team_slug:null
}),'crear invitación revocable');
ok(await bibliotecario.session.rpc('admin_invitation_revoke',{
  p_id:pending.id,p_reason:'Revocación para comprobar seguridad'
}),'revocar invitación');
denied(await outsider.session.rpc('team_invitation_redeem',{p_token:pending.token}),'revocado no canjeable');
denied(await bibliotecario.session.rpc('admin_invitation_revoke',{
  p_id:created.id,p_reason:'Intento de revocar enlace ya usado'
}),'No revocar usado');
const audit=ok(await root.from('moderation_audit').select('action,target_id,detail'),'bitácora');
assert(audit.some(x=>x.action==='invitacion_equipo_creada'),'Falta auditoría creación');
assert(audit.some(x=>x.action==='invitacion_equipo_canjeada'),'Falta auditoría canje');
assert(audit.some(x=>x.action==='invitacion_equipo_revocada'),'Falta auditoría revocación');
assert(!JSON.stringify(audit).includes(created.token),'El token fue expuesto en bitácora');
console.log('INVITACIONES FUNCIONALES OK — Auth/JWT, RPC/RLS, owner, admin, concurrencia, revocación y auditoría');

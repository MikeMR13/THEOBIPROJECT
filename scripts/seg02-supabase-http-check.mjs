// SEG-02: Auth + PostgREST HTTP integration against an ephemeral Supabase CLI stack.
// All accounts and data are synthetic. Never point this suite at a hosted instance.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.OBI_QA_API_URL;
const anonKey = process.env.OBI_QA_ANON_KEY;
const serviceKey = process.env.OBI_QA_SERVICE_KEY;
assert(url && anonKey && serviceKey, 'Missing local CLI API URL/keys');
assert(/^https?:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url), 'Refusing any non-loopback Supabase URL');
assert.notEqual(anonKey, serviceKey, 'Must test separate anon/service roles');

const opts={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const client=(key)=>createClient(url,key,opts);
const root=client(serviceKey);
const visitor=client(anonKey);
const team='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const chapter='ffffffff-ffff-4fff-8fff-ffffffffffff';
const unrelated='99999999-9999-4999-8999-999999999999';
const requireOk=(res,label)=>{assert.equal(res.error,null,label+': '+(res.error?.message||''));return res.data};
const isDenied=(res,label)=>assert(res.error,label+': expected explicit error, got data');

async function signup(label){
  const email='seg02-'+label+'@example.test';
  const password='QaStrongPa55!Local';
  const session=client(anonKey);
  const initial=await session.auth.signUp({email,password});
  requireOk(initial,'Auth signUp '+label);
  const login=await session.auth.signInWithPassword({email,password});
  requireOk(login,'Auth login '+label);
  assert(login.data.session?.access_token,'Real GoTrue access token missing: '+label);
  assert(login.data.user?.id,'GoTrue user ID missing: '+label);
  assert.equal(login.data.user.is_anonymous,false,'Email login unexpectedly anonymous');
  return {id:login.data.user.id,session,email};
}

console.log('SEG-02 HTTP: GoTrue signup/password login y dos sesiones JWT reales');
const A=await signup('alfa'), B=await signup('beta');
requireOk(await root.from('profiles').insert([
  {id:A.id,username:'http_alfa',profile_visibility:'all',public_activity:true,notify:{freq:'diario'},ui_prefs:{font:'serif'}},
  {id:B.id,username:'http_beta',profile_visibility:'auth',public_activity:true,notify:{freq:'semanal'},ui_prefs:{font:'sans'}}
]),'service_role seeds profiles');
requireOk(await root.from('team_members').insert([
  {team_id:team,user_id:A.id,role:'owner'},
  {team_id:team,user_id:B.id,role:'editor'}
]),'service_role seeds team membership');

console.log('SEG-02 HTTP: anon bloqueado ante tabla de perfiles y RPC privadas');
isDenied(await visitor.from('profiles').select('id,notify').limit(1),'anon SELECT profiles');
isDenied(await visitor.rpc('studio_profile_names',{p_ids:[A.id]}),'anon studio RPC');
isDenied(await visitor.rpc('export_my_data'),'anon account export');
isDenied(await visitor.rpc('request_account_deletion'),'anon account delete');
const ownIds=requireOk(await B.session.from('profiles').select('id'),'authenticated own id');
assert.deepEqual(ownIds.map(row=>row.id),[B.id]);
isDenied(await B.session.from('profiles').select('notify'),'authenticated private field SELECT');
const bProfile=requireOk(await B.session.rpc('my_profile'),'B my_profile');
assert.equal(bProfile.id,B.id);
assert.equal(bProfile.notify.freq,'semanal');
assert.equal(bProfile.ui_prefs.font,'sans');
assert.notEqual(bProfile.id,A.id,'A data leaked to B');

console.log('SEG-02 HTTP: actualizaciones permitidas sólo para la cuenta propia');
requireOk(await B.session.from('profiles').update({notify:{freq:'off'},ui_prefs:{font:'mono'}}).eq('id',B.id),'B save own prefs');
const after=requireOk(await B.session.rpc('my_profile'),'B refresh profile');
assert.equal(after.notify.freq,'off');
assert.equal(after.ui_prefs.font,'mono');
requireOk(await B.session.from('profiles').update({notify:{freq:'off'}}).eq('id',A.id),'cross-account update request');
const aOwn=requireOk(await A.session.rpc('my_profile'),'A retained profile');
assert.equal(aOwn.notify.freq,'diario','B changed A settings');
isDenied(await B.session.from('profiles').update({platform_role:'admin'}).eq('id',B.id),'B elevate privilege');

console.log('SEG-02 HTTP: lector all/auth/none y búsqueda');
const publicA=requireOk(await visitor.rpc('reader_public',{p_username:'http_alfa'}),'public carnet A');
assert.equal(publicA.username,'http_alfa');
assert(!('private' in publicA),'Public profile degraded to private');
const privateB=requireOk(await visitor.rpc('reader_public',{p_username:'http_beta'}),'private carnet B');
assert.equal(privateB.private,'auth');
const accountView=requireOk(await A.session.rpc('reader_public',{p_username:'http_beta'}),'registered profile access');
assert.equal(accountView.username,'http_beta');
assert(!('private' in accountView));
const hidden=requireOk(await A.session.rpc('reader_public',{p_username:'qa_gamma'}),'hidden carnet C');
assert.equal(hidden.private,'none');
const searchAnon=requireOk(await visitor.rpc('search_readers',{p_q:'http_'}),'anon search');
assert.equal(searchAnon.some(x=>x.username==='http_beta'),false,'Auth-only profile in anonymous search');
const searchB=requireOk(await A.session.rpc('search_readers',{p_q:'http_'}),'registered search');
assert(searchB.some(x=>x.username==='http_beta'),'Registered user cannot find auth-only profile');
assert.equal(requireOk(await visitor.rpc('reader_stats',{p_user:B.id}),'anon stats B'),null);
assert(requireOk(await A.session.rpc('reader_stats',{p_user:B.id}),'registered stats B')!==null);

console.log('SEG-02 HTTP: miembros, autores de comentarios, colaboradores y permisos');
const members=requireOk(await visitor.rpc('team_public_members',{p_team:team}),'public team members');
assert(members.some(m=>m.username==='http_alfa'));
assert(members.some(m=>m.username==='http_beta'));
const authors=requireOk(await visitor.rpc('comment_public_authors',{p_chapter:chapter}),'public chapter authors');
assert(authors.some(x=>x.username==='qa_gamma'));
const comments=requireOk(await visitor.from('comments').select('id,body').eq('chapter_id',chapter),'public comments query');
assert(comments.some(c=>c.id===1));
const names=requireOk(await B.session.rpc('studio_profile_names',{p_ids:[A.id,B.id,unrelated]}),'studio names');
assert(names.some(x=>x.id===A.id));
assert(names.some(x=>x.id===B.id));
assert(!names.some(x=>x.id===unrelated),'Studio leaked unrelated account');

console.log('SEG-02 HTTP: cuenta anónima auténtica de GoTrue');
const anonymousSession=client(anonKey);
const guest=await anonymousSession.auth.signInAnonymously();
requireOk(guest,'Auth anonymous sign in');
assert(guest.data.session?.access_token,'No GoTrue anonymous token');
assert.equal(guest.data.user.is_anonymous,true,'GoTrue missing anonymous marker');
const authOnly=requireOk(await anonymousSession.rpc('reader_public',{p_username:'http_beta'}),'anonymous-auth carnet');
assert.equal(authOnly.private,'auth');
const guestSearch=requireOk(await anonymousSession.rpc('search_readers',{p_q:'http_'}),'anonymous-auth search');
assert(!guestSearch.some(x=>x.username==='http_beta'));
assert.equal(requireOk(await anonymousSession.rpc('reader_stats',{p_user:B.id}),'anonymous-auth stats'),null);

console.log('SEG-02 HTTP: autenticación y datos propios al cambiar cuenta');
requireOk(await B.session.auth.signOut(),'B logout');
isDenied(await B.session.rpc('my_profile'),'logged-out private profile');
const stillA=requireOk(await A.session.rpc('my_profile'),'A remains authenticated');
assert.equal(stillA.id,A.id);

console.log('SEG-02 HTTP PASSED — Auth login, JWT/anon, PostgREST, RLS, RPC, preferencias, comentarios y equipo');

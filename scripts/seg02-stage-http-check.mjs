// Comprueba por HTTP que antes de retirar SELECT pueden convivir frontend viejo
// y nuevas funciones. Solo usa localhost, jamás Supabase alojado.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url=process.env.OBI_QA_API_URL,key=process.env.OBI_QA_ANON_KEY;
assert(/^https?:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url||''),'QA aislada obligatoria');
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const profiles=await sb.from('profiles').select('id,username,avatar_url').limit(1);
assert.equal(profiles.error,null,'Fase A rompió frontend legado: '+profiles.error?.message);
const team=await sb.rpc('team_public_members',{p_team:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'});
assert.equal(team.error,null,'Fase A no expone miembros públicos: '+team.error?.message);
assert.equal(team.data?.length,2,'Equipo ficticio no visible');
const comment=await sb.rpc('comment_public_authors',{p_chapter:'ffffffff-ffff-4fff-8fff-ffffffffffff'});
assert.equal(comment.error,null,'Fase A rompió autores de comentarios: '+comment.error?.message);
assert.equal(comment.data?.length,1);
const prohibited=await sb.rpc('studio_profile_names',{p_ids:[]});
assert(prohibited.error,'RPC de Estudio no puede quedar abierta a visitantes');
console.log('SEG-02 FASE A HTTP PASS: consultas antiguas funcionales y RPC nuevas listas');

// SEG-02: contratos de aislamiento. Sin credenciales ni acceso a datos reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync('supabase/migrations/20261022055000_secure_reader_profiles.sql','utf8');
const studio=readFileSync('src/studio.js','utf8');
const app=readFileSync('src/app.js','utf8');
const profile=readFileSync('src/profile.js','utf8');
function requireSQL(pattern,description){assert.match(sql,pattern,description)}
requireSQL(/REVOKE ALL PRIVILEGES ON TABLE public\.profiles FROM anon, authenticated;/i,'retirar SELECT, INSERT, DELETE y MAINTAIN');
requireSQL(/GRANT UPDATE \(username, avatar_url, discord_id, telegram_id, adult_ok,[\s\S]*?hidden_series, notify, ui_prefs\)/i,'retener solo edición autorizada');
requireSQL(/GRANT SELECT \(id\) ON TABLE public\.profiles TO authenticated;/i,'UPDATE conserva lectura mínima id');
requireSQL(/DROP POLICY IF EXISTS "profiles read" ON public\.profiles;/i,'eliminar RLS público permisivo');
requireSQL(/CREATE POLICY "profiles self read" ON public\.profiles[\s\S]*?FOR SELECT TO authenticated[\s\S]*?USING \(id = \(SELECT auth\.uid\(\)\)\)/i,'RLS propietario');
requireSQL(/CREATE OR REPLACE FUNCTION public\.studio_profile_names\(p_ids uuid\[\]\)[\s\S]*?private\.is_admin\(\)[\s\S]*?JOIN public\.team_members member[\s\S]*?viewer\.user_id = \(SELECT auth\.uid\(\)\)/i,'RPC equipo/administrador');
requireSQL(/REVOKE ALL ON FUNCTION public\.studio_profile_names\(uuid\[\]\) FROM PUBLIC, anon;/i,'RPC de equipo no expuesto anon');
requireSQL(/CREATE OR REPLACE FUNCTION public\.reader_stats\([\s\S]*?pr\.public_activity[\s\S]*?pr\.delete_requested_at is null[\s\S]*?pr\.profile_visibility = 'all'[\s\S]*?pr\.profile_visibility = 'auth'[\s\S]*?user_blocks b/i,'estadísticas privadas o bloqueadas inaccesibles');
requireSQL(/CREATE OR REPLACE FUNCTION public\.search_readers\([\s\S]*?is_anonymous/i,'buscar solo usuarios registrados');
requireSQL(/CREATE OR REPLACE FUNCTION private\.reader_public_core\([\s\S]*?is_anonymous/i,'carnet solo usuarios registrados');
for(const name of ['export_my_data','deletion_preview','request_account_deletion','cancel_account_deletion','favorite_candidates','patreon_unlink','patreon_begin','patreon_disconnect','admin_review_queue','admin_review_resolve']){
 assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.'+name+'('),'falta cierre del RPC '+name);
 assert(sql.includes('GRANT EXECUTE ON FUNCTION public.'+name+'('),'falta acceso de autenticados al RPC '+name);
}
assert.match(studio,/sb\.rpc\('studio_profile_names',\s*\{\s*p_ids:/,'Estudio usa RPC');
assert.doesNotMatch(studio,/sb\.from\('profiles'\)\.select\(/,'Estudio no debe leer tabla de perfiles');
assert.match(app,/sb\.rpc\('my_profile'\)/,'perfil autenticado utiliza my_profile');
assert.match(profile,/sb\.rpc\('reader_public'/,'carnet utiliza reader_public');
assert.match(profile,/sb\.rpc\('my_profile'\)/,'Preferencias utiliza my_profile');
assert.match(sql,/\bBEGIN;/,'migración transaccional');
assert.match(sql,/\bCOMMIT;/,'migración transaccional');
console.log('SEG-02 OK · permisos mínimos, visibilidad real, sesión anónima y colaboradores');

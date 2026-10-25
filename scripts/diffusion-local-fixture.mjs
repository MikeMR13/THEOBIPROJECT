// Prepara solo el esquema y miembros ficticios para Supabase CLI local.
import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync('supabase/tests/fixtures/diffusion_postgres_fixture.sql','utf8');
const start=source.indexOf('create table public.teams(');
const stop=source.indexOf('-- Vault API simulado');
if (start<0||stop<start) throw Error('Fixture drift');
const header = [
 '-- QA Supabase local. Auth/Gotrue, vault y roles ya existen.',
 'create schema if not exists private;',
 'grant usage on schema private to authenticated;',
 'grant usage on schema public to authenticated, anon;',
 "create function private.is_admin() returns boolean language sql stable set search_path=\'\' as $ select coalesce(nullif(current_setting(\'request.jwt.claim.is_admin\',true),\'\')::boolean,false) $;",
 '-- Auth nativo: conservamos sus funciones y permisos originales.',
].join('\n');
const sql=header+'\n'+source.slice(start,stop)+'\n';
const out=process.argv[2];if(!out) throw Error('Usage: node scripts/diffusion-local-fixture.mjs <output.sql>');
writeFileSync(out,sql);
console.log('Fixture de equipos sintéticos preparado para Supabase CLI local con Vault real');

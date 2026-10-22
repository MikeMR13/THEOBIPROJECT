// Bridge synthetic PostgreSQL fixture into Supabase's local Auth/PostgREST stack.
// No hosted credentials, accounts, or production data.
import { readFileSync, writeFileSync } from 'node:fs';
const source=readFileSync('supabase/tests/fixtures/seg02_postgres_fixture.sql','utf8');
const from=source.indexOf('CREATE TABLE public.profiles (');
if(from<0) throw Error('Fixture drift: profiles marker missing');
const header=[
  '-- SEG-02: fixture para Auth y PostgREST locales con datos ficticios.',
  '-- Auth schema y roles ya existen por supabase start.',
  'CREATE SCHEMA IF NOT EXISTS private;',
  "CREATE OR REPLACE FUNCTION private.is_admin() RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $auth$ SELECT coalesce(nullif(current_setting('request.jwt.claim.is_admin',true),'')::boolean,false) $auth$;",
].join('\n');
const footer=[
  'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;',
  'GRANT SELECT ON public.comments, public.team_members TO anon, authenticated;',
  "NOTIFY pgrst, 'reload schema';"
].join('\n');
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/seg02-make-supabase-fixture.mjs <output-sql>');
writeFileSync(path,header+'\n'+source.slice(from)+'\n'+footer+'\n');
console.log('SEG-02 fixture local generado (datos sintéticos, sin credenciales alojadas)');

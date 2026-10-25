-- PostgreSQL 17 efimero: esquema sintético, sin datos ni llaves alojadas.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create schema private;
grant usage on schema auth,private,public to authenticated;
grant usage on schema auth,public to anon;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable set search_path='' as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant execute on function auth.uid() to anon,authenticated;
create function private.is_admin() returns boolean language sql stable set search_path='' as $$
 select coalesce(nullif(current_setting('request.jwt.claim.is_admin',true),'')::boolean,false) $$;
create table public.teams(id uuid primary key,name text);
create table public.team_roles(id uuid primary key,team_id uuid references public.teams(id),name text,base text,perms jsonb not null default '{}');
create table public.team_members(team_id uuid references public.teams(id),user_id uuid references auth.users(id),role text,role_id uuid references public.team_roles(id),overrides jsonb not null default '{}',primary key(team_id,user_id));
create table public.team_log(id bigint generated always as identity primary key,team_id uuid,actor uuid,kind text,summary text,detail jsonb,series_id uuid,chapter_id uuid,created_at timestamptz default now());
create function private.team_role_of(t uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.team_members where team_id=t and user_id=auth.uid() limit 1 $$;
create function private.team_can(t uuid,action text) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists(
 select 1 from public.team_members m left join public.team_roles r on r.id=m.role_id and r.team_id=m.team_id
 where m.team_id=t and m.user_id=auth.uid() and
 (m.role='owner' or action='view' or coalesce((m.overrides->>action)::boolean,(r.perms->>action)::boolean,m.role in ('admin','editor','translator')))) $$;
create function private.log(t uuid,k text,s text,d jsonb,sid uuid,cid uuid) returns void
 language plpgsql security definer set search_path='' as $$
 begin insert into public.team_log(team_id,actor,kind,summary,detail,series_id,chapter_id)
 values(t,auth.uid(),k,s,d,sid,cid); end $$;
create function private.perm_keys() returns text[] language sql immutable as $$
 select array['view','publish','schedule','members','log'] $$;
create function private.clean_perms(p jsonb) returns jsonb language sql immutable as $$ select p $$;
create function public.my_team_permissions(t uuid) returns jsonb language sql stable security definer set search_path='' as $$ select '{}'::jsonb $$;

-- Identidades simuladas: A(owner,editor,collaborator,custom), B(owner), Bibliotecario(sin equipo).
insert into auth.users(id) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
('ffffffff-ffff-4fff-8fff-ffffffffffff');
insert into public.teams values
('11111111-1111-4111-8111-111111111111','Equipo A'),
('22222222-2222-4222-8222-222222222222','Equipo B');
insert into public.team_roles(id,team_id,name,base,perms) values
('11111111-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Editor','editor','{"publish":true,"schedule":true,"edit":true}'),
('11111111-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Colaborador','collaborator','{"publish":false,"schedule":false}'),
('11111111-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Rol personalizado',null,'{"diffusion_view":true,"diffusion_compose":true,"diffusion_manage":false}');
insert into public.team_members(team_id,user_id,role,role_id,overrides) values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner',null,'{}'),
('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','editor','11111111-0000-4000-8000-000000000001','{}'),
('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','collaborator','11111111-0000-4000-8000-000000000002','{}'),
('22222222-2222-4222-8222-222222222222','dddddddd-dddd-4ddd-8ddd-dddddddddddd','owner',null,'{}'),
('11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff','proofreader','11111111-0000-4000-8000-000000000003','{"diffusion_compose":false}');

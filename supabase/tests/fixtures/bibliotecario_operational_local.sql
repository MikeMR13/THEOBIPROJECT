-- PostgreSQL 17 efímero. Identidades ficticias; sin Supabase de producción.
create role anon nologin; create role authenticated nologin;
create schema auth; create schema private;
grant usage on schema auth,private,public to authenticated;
grant usage on schema auth,public to anon;
create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create type public.team_role as enum ('owner','admin','translator','editor','proofreader','collaborator');
create table auth.users(id uuid primary key,email text,last_sign_in_at timestamptz);
create table public.profiles(id uuid primary key,username text unique,platform_role text,avatar_url text,created_at timestamptz default now());
create table public.teams(id uuid primary key,name text,slug text,color text);
create table public.team_roles(id uuid primary key,perms jsonb);
create table public.team_members(
 team_id uuid references public.teams(id),user_id uuid references public.profiles(id),
 role public.team_role not null,role_id uuid,overrides jsonb,
 primary key(team_id,user_id));
create table public.series(id uuid primary key,team_id uuid);
create table public.review_reports(series_id uuid,author_id uuid,status text,resolved_at timestamptz,resolved_by uuid);
create table public.series_reviews(series_id uuid,user_id uuid);
create table public.notifications(user_id uuid,kind text,body text,link jsonb);
create table public.moderation_audit(actor uuid,action text,target_type text,target_id text,detail jsonb,created_at timestamptz default now());
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path to ''
as $$select exists(select 1 from public.profiles where id=auth.uid() and platform_role='bibliotecario')$$;
create or replace function private.audit(p_action text,p_type text,p_id text,p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path to ''
as $$insert into public.moderation_audit(actor,action,target_type,target_id,detail)
 values(auth.uid(),p_action,p_type,p_id,p_detail)$$;
create or replace function private.team_can(t uuid,action text) returns boolean
language sql stable security definer set search_path to '' as $$select private.is_admin()$$;
create or replace function private.can_edit_team(t uuid) returns boolean
language sql stable security definer set search_path to ''
as $$select private.team_can(t,'edit')$$;
alter table public.series enable row level security;
create policy "series admin" on public.series for all using (private.is_admin()) with check (private.is_admin());
create policy "series read" on public.series for select using (private.is_admin());
grant select,update,delete,insert on public.series to authenticated;
grant select on public.profiles to authenticated;
grant usage on type public.team_role to authenticated;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function private.is_admin() to authenticated;

insert into auth.users(id,email) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bibliotecario@qa.invalid'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner@qa.invalid'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','editor@qa.invalid'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','nuevo@qa.invalid');
insert into public.profiles(id,username,platform_role)
 select u.id,split_part(u.email,'@',1),
 case when u.email='bibliotecario@qa.invalid' then 'bibliotecario' else 'lector' end from auth.users u;
insert into public.teams(id,name,slug,color) values
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Equipo QA','equipo-qa','#f2c230');
insert into public.team_members(team_id,user_id,role) values
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc','editor');
insert into public.series(id,team_id) values
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
insert into public.review_reports(series_id,author_id,status) values
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','cccccccc-cccc-4ccc-8ccc-cccccccccccc','open');
insert into public.series_reviews(series_id,user_id) values
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','cccccccc-cccc-4ccc-8ccc-cccccccccccc');

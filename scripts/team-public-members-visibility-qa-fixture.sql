\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
grant execute on function auth.uid(),auth.jwt() to anon,authenticated;

create table public.teams (
  id uuid primary key,
  settings jsonb not null default '{}'::jsonb
);
create table public.profiles (
  id uuid primary key,
  username text not null,
  profile_visibility text not null,
  delete_requested_at timestamptz,
  discoverable boolean not null default false
);
create table public.team_roles (
  id uuid primary key, team_id uuid, name text, color text
);
create table public.team_members (
  user_id uuid not null,
  team_id uuid not null,
  role text,
  role_id uuid
);
insert into public.teams (id,settings) values
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"show_members":true}'::jsonb),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','{"show_members":false}'::jsonb);
insert into public.profiles(id,username,profile_visibility,delete_requested_at,discoverable) values
('11111111-1111-1111-1111-111111111111','Publico QA','all',null,false),
('22222222-2222-2222-2222-222222222222','Solo sesion QA','auth',null,false),
('33333333-3333-3333-3333-333333333333','Privado QA','none',null,false),
('44444444-4444-4444-4444-444444444444','Borrado QA','all',now(),false);
insert into public.team_members(user_id,team_id,role) select id,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','reader' from public.profiles;
insert into public.team_members(user_id,team_id,role) values ('11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','reader');
CREATE OR REPLACE FUNCTION public.team_public_members(p_team uuid)
 RETURNS TABLE(role text, username text, role_name text, role_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT m.role::text, p.username, tr.name, tr.color
  FROM public.team_members m
  JOIN public.profiles p ON p.id = m.user_id
  JOIN public.teams t ON t.id = m.team_id
  LEFT JOIN public.team_roles tr ON tr.id = m.role_id AND tr.team_id = m.team_id
  WHERE m.team_id = p_team
    AND coalesce((t.settings->>'show_members')::boolean, true)
  ORDER BY m.role::text, p.username
  LIMIT 1000
$function$
;

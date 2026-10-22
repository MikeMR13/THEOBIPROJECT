-- QA funcional de invitaciones: Supabase local desechable, jamás datos de producción.
-- Autenticación GoTrue, esquema auth y roles ya creados por "supabase start".
create schema if not exists private;

do $do$
begin
  if not exists (select 1 from pg_type where typnamespace='public'::regnamespace and typname='team_role') then
    create type public.team_role as enum ('owner','admin','translator','editor','proofreader','collaborator');
  end if;
end $do$;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique,
 platform_role text not null default 'lector'
);
create table public.teams (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text not null unique,
 official_verified boolean not null default false
);
create table public.team_members (
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role public.team_role not null,
 primary key(team_id,user_id)
);
create table public.moderation_audit (
 id bigint generated always as identity primary key,
 actor uuid,
 action text not null,
 target_type text not null,
 target_id text not null,
 detail jsonb not null default '{}'::jsonb
);

create function private.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid()
    and p.platform_role='bibliotecario')
$$;
create function private.audit(p_action text,p_type text,p_id text,p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path=''
as $$
 insert into public.moderation_audit(actor,action,target_type,target_id,detail)
 values(auth.uid(),p_action,p_type,p_id,p_detail)
$$;
create function private.sync_publisher()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_uid uuid := coalesce(new.user_id,old.user_id);
begin
 if tg_op='INSERT' then
   update public.profiles set platform_role='publicador'
     where id=v_uid and platform_role='lector';
 elsif tg_op='DELETE' and not exists
   (select 1 from public.team_members where user_id=v_uid) then
   update public.profiles set platform_role='lector'
     where id=v_uid and platform_role='publicador';
 end if;
 return null;
end $$;
create trigger team_members_sync_publisher after insert or delete
on public.team_members for each row execute function private.sync_publisher();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.moderation_audit enable row level security;
-- Conservar una réplica mínima del permiso SELECT de equipos, no escrituras.
create policy "teams read" on public.teams for select to authenticated using (true);
create policy "members read" on public.team_members for select to authenticated using (true);
grant usage on schema public to anon,authenticated;
grant select on public.teams, public.team_members to authenticated;
revoke all on public.profiles,public.moderation_audit from anon,authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
notify pgrst,'reload schema';

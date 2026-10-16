-- Preferencias de la página del equipo: diseño publicado, borrador con enlace de vista previa e historial (10).
alter table public.teams add column if not exists design jsonb not null default '{}'::jsonb;
alter table public.teams drop constraint if exists teams_design_size;
alter table public.teams add constraint teams_design_size check (pg_column_size(design) < 20000);
create table if not exists public.team_design_drafts (team_id uuid primary key references public.teams(id) on delete cascade, design jsonb not null default '{}'::jsonb check (pg_column_size(design) < 20000), token uuid not null default gen_random_uuid(), updated_by uuid references public.profiles(id) on delete set null, updated_at timestamptz not null default now());
alter table public.team_design_drafts enable row level security;
drop policy if exists "draft read" on public.team_design_drafts;
create policy "draft read" on public.team_design_drafts for select using (private.team_can(team_id, 'profile'));
create table if not exists public.team_design_versions (id bigint generated always as identity primary key, team_id uuid not null references public.teams(id) on delete cascade, design jsonb not null, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now());
create index if not exists team_design_versions_team_idx on public.team_design_versions(team_id, created_at desc);
alter table public.team_design_versions enable row level security;
drop policy if exists "versions read" on public.team_design_versions;
create policy "versions read" on public.team_design_versions for select using (private.team_can(team_id, 'profile'));
create or replace function public.team_design_save(p_team uuid, p_design jsonb) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare t timestamptz := now();
begin
  if not private.team_can(p_team, 'profile') then raise exception 'forbidden' using hint = 'Tu rol no permite personalizar la página del equipo'; end if;
  if jsonb_typeof(p_design) <> 'object' or pg_column_size(p_design) >= 20000 then raise exception 'design_invalid'; end if;
  insert into public.team_design_drafts (team_id, design, updated_by, updated_at) values (p_team, p_design, auth.uid(), t)
    on conflict (team_id) do update set design = excluded.design, updated_by = excluded.updated_by, updated_at = t;
  return t;
end $$;
create or replace function public.team_design_publish(p_team uuid) returns void language plpgsql security definer set search_path = '' as $$
declare d jsonb;
begin
  if not private.team_can(p_team, 'profile') then raise exception 'forbidden'; end if;
  select design into d from public.team_design_drafts where team_id = p_team;
  if d is null then raise exception 'no_draft' using hint = 'No hay cambios en borrador'; end if;
  update public.teams set design = d where id = p_team;
  insert into public.team_design_versions (team_id, design, created_by) values (p_team, d, auth.uid());
  delete from public.team_design_versions where team_id = p_team and id not in (select id from public.team_design_versions where team_id = p_team order by created_at desc, id desc limit 10);
  perform private.log(p_team, 'edicion', 'Publicó un nuevo diseño de la página del equipo', '{}', null);
end $$;
create or replace function public.team_design_restore(p_version bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.team_design_versions;
begin
  select * into v from public.team_design_versions where id = p_version;
  if v.id is null then raise exception 'not_found'; end if;
  if not private.team_can(v.team_id, 'profile') then raise exception 'forbidden'; end if;
  perform public.team_design_save(v.team_id, v.design);
  return v.design;
end $$;
create or replace function public.team_design_new_token(p_team uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare k uuid := gen_random_uuid();
begin
  if not private.team_can(p_team, 'profile') then raise exception 'forbidden'; end if;
  insert into public.team_design_drafts (team_id, design, token, updated_by) values (p_team, coalesce((select design from public.teams where id = p_team), '{}'), k, auth.uid())
    on conflict (team_id) do update set token = k;
  return k;
end $$;
create or replace function public.team_design_preview(p_slug text, p_token uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select d.design from public.team_design_drafts d join public.teams t on t.id = d.team_id where t.slug = p_slug and d.token = p_token $$;
revoke all on function public.team_design_save(uuid, jsonb), public.team_design_publish(uuid), public.team_design_restore(bigint), public.team_design_new_token(uuid) from public, anon;
grant execute on function public.team_design_save(uuid, jsonb), public.team_design_publish(uuid), public.team_design_restore(bigint), public.team_design_new_token(uuid) to authenticated;
revoke all on function public.team_design_preview(text, uuid) from public;
grant execute on function public.team_design_preview(text, uuid) to anon, authenticated;

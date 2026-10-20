-- Fase 3 · Equipo: roles a medida, tablero de trabajo, bitácora y perfil del equipo.

-- ---------- roles a medida ----------
create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text not null default '#a89f8a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  description text check (char_length(description) <= 200),
  perms jsonb not null default '{}'::jsonb,
  base text check (base in ('admin','translator','editor','proofreader','collaborator')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);
alter table public.team_roles enable row level security;
drop policy if exists "roles read" on public.team_roles;
create policy "roles read" on public.team_roles for select using (private.in_team(team_id));

alter table public.team_members add column if not exists role_id uuid references public.team_roles(id) on delete set null;
create index if not exists team_members_role_idx on public.team_members(role_id);

create or replace function private.perm_keys() returns text[] language sql immutable as $$
  select array['view','edit','create','import','publish','schedule','delete','review','board','members','profile','log'] $$;

create or replace function private.clean_perms(p jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, coalesce((p->>k)::boolean, false)), '{}'::jsonb) || '{"view":true}'::jsonb
  from unnest(private.perm_keys()) k $$;

create or replace function private.seed_roles(t uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.team_roles (team_id, name, color, description, perms, base, sort) values
    (t, 'Administrador', '#f2c230', 'Acceso completo, incluidos integrantes, roles, perfil y bitácora.', private.clean_perms('{"edit":true,"create":true,"import":true,"publish":true,"schedule":true,"delete":true,"review":true,"board":true,"members":true,"profile":true,"log":true}'), 'admin', 1),
    (t, 'Traductor', '#d9922b', 'Traduce, importa, publica y programa capítulos.', private.clean_perms('{"edit":true,"create":true,"import":true,"publish":true,"schedule":true,"delete":true,"review":true,"board":true}'), 'translator', 2),
    (t, 'Editor', '#8cc3f2', 'Edita y publica, pero no borra.', private.clean_perms('{"edit":true,"create":true,"import":true,"publish":true,"schedule":true,"review":true,"board":true}'), 'editor', 3),
    (t, 'Corrector', '#a9d18e', 'Corrige el texto y aprueba revisiones. No publica.', private.clean_perms('{"edit":true,"review":true,"board":true}'), 'proofreader', 4),
    (t, 'Colaborador', '#a89f8a', 'Solo puede ver el Estudio.', private.clean_perms('{}'), 'collaborator', 5)
  on conflict (team_id, name) do nothing;
end $$;
select private.seed_roles(id) from public.teams;
update public.team_members m set role_id = r.id from public.team_roles r
  where m.role_id is null and m.role <> 'owner' and r.team_id = m.team_id and r.base = m.role::text;

create or replace function private.teams_seed_roles() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.seed_roles(new.id); return null; end $$;
drop trigger if exists teams_seed_roles on public.teams;
create trigger teams_seed_roles after insert on public.teams for each row execute function private.teams_seed_roles();

-- propietario: todo; luego excepción individual; luego el rol a medida; luego el rol heredado
create or replace function private.team_can(t uuid, action text) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.team_members m left join public.team_roles r on r.id = m.role_id
    where m.team_id = t and m.user_id = auth.uid() and (
      m.role = 'owner' or action = 'view'
      or coalesce((m.overrides->>action)::boolean, (r.perms->>action)::boolean,
           case when m.role = 'admin' then true
             when action in ('members','profile','log') then false
             when action = 'review' then m.role in ('translator','editor','proofreader')
             when action = 'board' then m.role in ('translator','editor','proofreader')
             when action = 'delete' then m.role = 'translator'
             else m.role in ('translator','editor') end)))
$$;
create or replace function public.my_team_permissions(t uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(a, private.team_can(t, a)) || jsonb_build_object('owner', private.team_role_of(t) = 'owner') from unnest(private.perm_keys()) a
$$;
-- can_edit_team sigue significando «editar contenido»; el perfil y las solicitudes usan sus propios permisos
create or replace function private.can_edit_team(t uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.team_can(t, 'edit') $$;
drop policy if exists "teams edit" on public.teams;
create policy "teams edit" on public.teams for update using (private.team_can(id, 'profile'))
  with check (private.team_can(id, 'profile') and ((official_verified = (select t.official_verified from public.teams t where t.id = teams.id)) or private.is_admin()));
drop policy if exists "join read" on public.team_join_requests;
create policy "join read" on public.team_join_requests for select using (user_id = auth.uid() or private.team_can(team_id, 'members'));
drop policy if exists "join decide" on public.team_join_requests;
create policy "join decide" on public.team_join_requests for update using (private.team_can(team_id, 'members')) with check (private.team_can(team_id, 'members'));

create or replace function public.team_find_user(p_team uuid, p_email text) returns table(id uuid, username text) language sql stable security definer set search_path = '' as $$
  select p.id, p.username from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email)) and (private.is_admin() or private.team_can(p_team, 'members'))
$$;

-- Solo el propietario crea o edita roles con «members»; nadie que no sea propietario edita el rol que tiene.
create or replace function public.team_role_save(p_team uuid, p_id uuid, p_name text, p_color text, p_desc text, p_perms jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_owner boolean := private.is_admin() or private.team_role_of(p_team) = 'owner'; v_perms jsonb := private.clean_perms(p_perms);
begin
  if not private.team_can(p_team, 'members') then raise exception 'forbidden' using hint = 'No puedes gestionar roles'; end if;
  if not v_owner and (v_perms->>'members')::boolean then raise exception 'forbidden' using hint = 'Solo el propietario puede dar el permiso de gestionar integrantes'; end if;
  if p_id is not null then
    if not v_owner and exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid() and role_id = p_id) then raise exception 'forbidden' using hint = 'No puedes editar tu propio rol'; end if;
    if not v_owner and exists (select 1 from public.team_roles where id = p_id and (perms->>'members')::boolean) then raise exception 'forbidden' using hint = 'Solo el propietario edita roles que gestionan integrantes'; end if;
    update public.team_roles set name = btrim(p_name), color = p_color, description = nullif(btrim(p_desc), ''), perms = v_perms where id = p_id and team_id = p_team returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  else
    if (select count(*) from public.team_roles where team_id = p_team) >= 20 then raise exception 'too_many' using hint = 'Máximo 20 roles por equipo'; end if;
    insert into public.team_roles (team_id, name, color, description, perms, sort)
      values (p_team, btrim(p_name), p_color, nullif(btrim(p_desc), ''), v_perms, coalesce((select max(sort) + 1 from public.team_roles where team_id = p_team), 1)) returning id into v_id;
  end if;
  return v_id;
exception when unique_violation then raise exception 'duplicate' using hint = 'Ya hay un rol con ese nombre';
end $$;

create or replace function public.team_role_delete(p_team uuid, p_id uuid, p_move_to uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_owner boolean := private.is_admin() or private.team_role_of(p_team) = 'owner';
begin
  if not private.team_can(p_team, 'members') then raise exception 'forbidden'; end if;
  if not v_owner and exists (select 1 from public.team_roles where id = p_id and (perms->>'members')::boolean) then raise exception 'forbidden' using hint = 'Solo el propietario borra roles que gestionan integrantes'; end if;
  if exists (select 1 from public.team_members where team_id = p_team and role_id = p_id) then
    if p_move_to is null or not exists (select 1 from public.team_roles where id = p_move_to and team_id = p_team and id <> p_id) then raise exception 'move_required' using hint = 'Elige a qué rol pasan sus integrantes'; end if;
    if not v_owner and exists (select 1 from public.team_roles where id = p_move_to and (perms->>'members')::boolean) then raise exception 'forbidden'; end if;
    update public.team_members set role_id = p_move_to where team_id = p_team and role_id = p_id;
  end if;
  delete from public.team_roles where id = p_id and team_id = p_team;
end $$;

create or replace function private.member_guard(p_team uuid, p_user uuid, p_role uuid) returns void language plpgsql stable security definer set search_path = '' as $$
declare v_owner boolean := private.is_admin() or private.team_role_of(p_team) = 'owner';
begin
  if not private.team_can(p_team, 'members') then raise exception 'forbidden' using hint = 'No puedes gestionar integrantes'; end if;
  if exists (select 1 from public.team_members where team_id = p_team and user_id = p_user and role = 'owner') then raise exception 'forbidden' using hint = 'El propietario no se puede modificar'; end if;
  if p_user = auth.uid() and not v_owner then raise exception 'forbidden' using hint = 'No puedes cambiar tu propio rol'; end if;
  if p_role is not null and not exists (select 1 from public.team_roles where id = p_role and team_id = p_team) then raise exception 'not_found' using hint = 'Ese rol no es de este equipo'; end if;
  if not v_owner and p_role is not null and exists (select 1 from public.team_roles where id = p_role and (perms->>'members')::boolean) then raise exception 'forbidden' using hint = 'Solo el propietario asigna roles que gestionan integrantes'; end if;
end $$;

create or replace function public.team_member_add(p_team uuid, p_email text, p_role uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_name text; v_base text;
begin
  select p.id, p.username into v_user, v_name from auth.users u join public.profiles p on p.id = u.id where lower(u.email) = lower(btrim(p_email));
  if v_user is null then raise exception 'not_found' using hint = 'No hay una cuenta con ese correo'; end if;
  perform private.member_guard(p_team, v_user, p_role);
  if exists (select 1 from public.team_members where team_id = p_team and user_id = v_user) then raise exception 'duplicate' using hint = 'Ya pertenece al equipo'; end if;
  select base into v_base from public.team_roles where id = p_role;
  insert into public.team_members (team_id, user_id, role, role_id) values (p_team, v_user, coalesce(v_base, 'collaborator')::public.team_role, p_role);
  return v_name;
end $$;

create or replace function public.team_member_set(p_team uuid, p_user uuid, p_role uuid, p_overrides jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare v_o jsonb := '{}'::jsonb; k text; v_owner boolean := private.is_admin() or private.team_role_of(p_team) = 'owner';
begin
  perform private.member_guard(p_team, p_user, p_role);
  for k in select jsonb_object_keys(coalesce(p_overrides, '{}'::jsonb)) loop
    if k = any(private.perm_keys()) and k <> 'view' and jsonb_typeof(p_overrides->k) = 'boolean' then
      if k = 'members' and (p_overrides->>k)::boolean and not v_owner then raise exception 'forbidden' using hint = 'Solo el propietario da el permiso de gestionar integrantes'; end if;
      v_o := v_o || jsonb_build_object(k, p_overrides->k);
    end if;
  end loop;
  update public.team_members set role_id = coalesce(p_role, role_id), overrides = v_o,
    role = coalesce((select base from public.team_roles where id = p_role), role::text)::public.team_role
  where team_id = p_team and user_id = p_user;
end $$;

create or replace function public.team_member_remove(p_team uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user = auth.uid() then
    if private.team_role_of(p_team) = 'owner' then raise exception 'forbidden' using hint = 'El propietario no puede salir del equipo'; end if;
  else perform private.member_guard(p_team, p_user, null); end if;
  update public.chapters set assigned_to = null where assigned_to = p_user and private.series_team(series_id) = p_team;
  delete from public.team_members where team_id = p_team and user_id = p_user;
end $$;

drop policy if exists "members owner update" on public.team_members;
revoke all on function public.team_role_save(uuid, uuid, text, text, text, jsonb), public.team_role_delete(uuid, uuid, uuid), public.team_member_add(uuid, text, uuid), public.team_member_set(uuid, uuid, uuid, jsonb), public.team_member_remove(uuid, uuid) from public, anon;
grant execute on function public.team_role_save(uuid, uuid, text, text, text, jsonb), public.team_role_delete(uuid, uuid, uuid), public.team_member_add(uuid, text, uuid), public.team_member_set(uuid, uuid, uuid, jsonb), public.team_member_remove(uuid, uuid) to authenticated;

-- ---------- tablero de trabajo ----------
alter table public.chapters
  add column if not exists stage text not null default 'traduciendo',
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists stage_at timestamptz;
alter table public.chapters drop constraint if exists chapters_stage_check;
alter table public.chapters add constraint chapters_stage_check check (stage in ('traduciendo','correccion','listo'));
create index if not exists chapters_board_idx on public.chapters(series_id, status, stage) where deleted_at is null;

create or replace function private.ch_label(c public.chapters) returns text language sql immutable set search_path = '' as $$
  select case when coalesce(c.section_type, 'Capítulo') = 'Capítulo' then 'Cap. ' || c.num else c.section_type end
    || coalesce(' — ' || nullif(regexp_replace(c.title, '^(Cap[íi]tulo|Cap\.)\s*\d+\s*[—–:-]?\s*', ''), ''), '') $$;

create or replace function public.chapter_move(p_id uuid, p_stage text, p_assignee uuid, p_set_assignee boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.chapters; t uuid; v_new uuid;
begin
  select * into c from public.chapters where id = p_id for update;
  if not found or c.deleted_at is not null then raise exception 'not_found'; end if;
  t := private.series_team(c.series_id);
  if not private.team_can(t, 'board') then raise exception 'forbidden' using hint = 'Tu rol no permite mover tarjetas'; end if;
  if p_stage is not null and p_stage not in ('traduciendo','correccion','listo') then raise exception 'bad_stage'; end if;
  v_new := case when p_set_assignee then p_assignee else c.assigned_to end;
  if v_new is not null and not exists (select 1 from public.team_members where team_id = t and user_id = v_new) then raise exception 'not_member' using hint = 'Esa persona no está en el equipo'; end if;
  update public.chapters set stage = coalesce(p_stage, stage), assigned_to = v_new, stage_at = now() where id = p_id;
  if v_new is not null and v_new <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     and (v_new is distinct from c.assigned_to or coalesce(p_stage, c.stage) <> c.stage) then
    insert into public.notifications (user_id, kind, body, link) values (v_new, 'tablero',
      private.ch_label(c) || ' · ' || case coalesce(p_stage, c.stage) when 'traduciendo' then 'Traduciendo' when 'correccion' then 'En corrección' else 'Listo' end || ' · asignado a ti',
      jsonb_build_object('href', '/estudio/editar/' || c.id));
  end if;
end $$;
revoke all on function public.chapter_move(uuid, text, uuid, boolean) from public, anon;
grant execute on function public.chapter_move(uuid, text, uuid, boolean) to authenticated;

-- ---------- bitácora ----------
create table if not exists public.team_log (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  actor uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('publicacion','edicion','permisos','borrado','tablero','equipo')),
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  series_id uuid, chapter_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists team_log_team_idx on public.team_log(team_id, created_at desc);
alter table public.team_log enable row level security;
drop policy if exists "log read" on public.team_log;
create policy "log read" on public.team_log for select using (private.team_can(team_id, 'log'));

create or replace function private.log(t uuid, k text, s text, d jsonb default '{}'::jsonb, sid uuid default null, cid uuid default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.team_log (team_id, actor, kind, summary, detail, series_id, chapter_id) select t, auth.uid(), k, left(s, 500), coalesce(d, '{}'::jsonb), sid, cid where t is not null $$;

create or replace function private.log_chapters() returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.chapters := coalesce(new, old); t uuid := private.series_team(c.series_id); l text := private.ch_label(c); w text;
  ST constant jsonb := '{"traduciendo":"Traduciendo","correccion":"En corrección","listo":"Listo"}';
begin
  select coalesce(short, title) into w from public.series where id = c.series_id;
  l := coalesce(w || ' · ', '') || l;
  if tg_op = 'INSERT' then perform private.log(t, 'edicion', 'Creó ' || l, '{}', c.series_id, c.id);
  elsif tg_op = 'DELETE' then perform private.log(t, 'borrado', 'Borró ' || l, '{}', c.series_id, null);
  else
    if new.deleted_at is not null and old.deleted_at is null then perform private.log(t, 'borrado', 'Envió a la papelera ' || l, '{}', c.series_id, c.id); end if;
    if new.status is distinct from old.status then
      perform private.log(t, 'publicacion', case
        when new.status = 'published' then case when auth.uid() is null then 'Se publicó automáticamente ' else 'Publicó ' end || l
        when new.status = 'scheduled' then 'Programó ' || l
        when old.status = 'published' then 'Retiró de publicación ' || l
        else 'Canceló la programación de ' || l end,
        case when new.status = 'scheduled' then jsonb_build_object('at', new.publish_at) else '{}' end, c.series_id, c.id);
    elsif new.status = 'scheduled' and new.publish_at is distinct from old.publish_at then
      perform private.log(t, 'publicacion', 'Reprogramó ' || l, jsonb_build_object('at', new.publish_at), c.series_id, c.id);
    end if;
    if new.stage is distinct from old.stage then perform private.log(t, 'tablero', 'Movió ' || l || ' a «' || (ST->>new.stage) || '»', '{}', c.series_id, c.id); end if;
    if new.assigned_to is distinct from old.assigned_to then
      perform private.log(t, 'tablero', case when new.assigned_to is null then 'Quitó la asignación de ' || l
        else 'Asignó ' || l || ' a ' || coalesce((select username from public.profiles where id = new.assigned_to), 'alguien') end, '{}', c.series_id, c.id);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists chapters_log on public.chapters;
create trigger chapters_log after insert or update of status, publish_at, stage, assigned_to, deleted_at or delete on public.chapters for each row execute function private.log_chapters();

create or replace function private.log_revisions() returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.chapters;
begin
  if new.kind not in ('manual','restore') then return null; end if;
  select * into c from public.chapters where id = new.chapter_id;
  perform private.log(private.series_team(c.series_id), 'edicion', case when new.kind = 'restore' then 'Restauró una versión anterior de ' else 'Guardó una versión de ' end || private.ch_label(c), jsonb_build_object('version', new.version), c.series_id, c.id);
  return null;
end $$;
drop trigger if exists revisions_log on public.chapter_revisions;
create trigger revisions_log after insert on public.chapter_revisions for each row execute function private.log_revisions();

create or replace function private.log_members() returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.team_members := coalesce(new, old); u text; r text;
begin
  select username into u from public.profiles where id = m.user_id;
  select name into r from public.team_roles where id = m.role_id;
  if tg_op = 'INSERT' then perform private.log(m.team_id, 'permisos', 'Agregó a ' || coalesce(u, 'un integrante') || coalesce(' como ' || r, ''));
  elsif tg_op = 'DELETE' then perform private.log(m.team_id, case when old.user_id = auth.uid() then 'equipo' else 'permisos' end, case when old.user_id = auth.uid() then coalesce(u, 'Alguien') || ' salió del equipo' else 'Retiró a ' || coalesce(u, 'un integrante') || ' del equipo' end);
  else
    if new.role_id is distinct from old.role_id then perform private.log(m.team_id, 'permisos', 'Cambió el rol de ' || coalesce(u, 'un integrante') || ' a ' || coalesce(r, 'sin rol')); end if;
    if new.overrides is distinct from old.overrides then perform private.log(m.team_id, 'permisos', 'Ajustó las excepciones de permisos de ' || coalesce(u, 'un integrante'), jsonb_build_object('overrides', new.overrides)); end if;
  end if;
  return null;
end $$;
drop trigger if exists team_members_log on public.team_members;
create trigger team_members_log after insert or update of role_id, overrides or delete on public.team_members for each row execute function private.log_members();

create or replace function private.log_roles() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return null; end if;
  if tg_op = 'INSERT' then perform private.log(new.team_id, 'permisos', 'Creó el rol «' || new.name || '»');
  elsif tg_op = 'DELETE' then perform private.log(old.team_id, 'permisos', 'Borró el rol «' || old.name || '»');
  elsif new.perms is distinct from old.perms or new.name is distinct from old.name then perform private.log(new.team_id, 'permisos', 'Editó el rol «' || new.name || '»'); end if;
  return null;
end $$;
drop trigger if exists team_roles_log on public.team_roles;
create trigger team_roles_log after insert or update or delete on public.team_roles for each row execute function private.log_roles();

create or replace function private.log_teams() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and (new.name, new.slug, new.bio, new.color, new.langs, new.settings, new.avatar_path, new.banner_path) is distinct from (old.name, old.slug, old.bio, old.color, old.langs, old.settings, old.avatar_path, old.banner_path) then
    perform private.log(new.id, 'equipo', 'Actualizó el perfil del equipo');
  end if;
  return null;
end $$;
drop trigger if exists teams_log on public.teams;
create trigger teams_log after update on public.teams for each row execute function private.log_teams();

create or replace function private.log_series() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform private.log(new.team_id, 'edicion', 'Creó la obra «' || coalesce(new.short, new.title) || '»', '{}', new.id);
  elsif new.archived_at is not null and old.archived_at is null then perform private.log(new.team_id, 'borrado', 'Archivó la obra «' || coalesce(new.short, new.title) || '»', '{}', new.id); end if;
  return null;
end $$;
drop trigger if exists series_log on public.series;
create trigger series_log after insert or update of archived_at on public.series for each row execute function private.log_series();

-- se conserva 12 meses
select cron.unschedule('obi_team_log_purge') where exists (select 1 from cron.job where jobname = 'obi_team_log_purge');
select cron.schedule('obi_team_log_purge', '27 4 * * *', $$delete from public.team_log where created_at < now() - interval '12 months'$$);

-- ---------- perfil del equipo ----------
alter table public.teams drop constraint if exists teams_profile_checks;
alter table public.teams add constraint teams_profile_checks check (
  char_length(name) between 2 and 80 and slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
  and (bio is null or char_length(bio) <= 600) and (color is null or color ~ '^#[0-9a-fA-F]{6}$')) not valid;

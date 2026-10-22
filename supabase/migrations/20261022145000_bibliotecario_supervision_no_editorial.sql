-- El Obi del Lector: separar administracion global de trabajo editorial.
-- PENDIENTE DE APLICACION: ejecutar EXCLUSIVAMENTE en una base de validacion aislada
-- y pasar los ensayos de supabase/tests antes de planificar una ventana de produccion.
-- No ejecutar este archivo en la base Supabase conectada desde ChatGPT.

begin;

-- La migracion no debe consolidar equipos que ya carecen de propietario.
do $check$
begin
  if exists (
    select 1 from public.teams t
    where not exists (
      select 1 from public.team_members m
      where m.team_id = t.id and m.role = 'owner'::public.team_role
    )
  ) then
    raise exception 'Existen equipos sin propietario; corregirlos antes de aplicar esta migracion';
  end if;
end
$check$;

-- Solo la pertenencia editorial real otorga capacidades editoriales.
-- Ser Bibliotecario no equivale a ser miembro ni propietario de un equipo.
create or replace function private.team_can(t uuid, action text)
returns boolean
language sql stable security definer
set search_path to ''
as $fn$
  select (not private.is_admin()) and exists (
    select 1
    from public.team_members m
    left join public.team_roles r on r.id = m.role_id
    where m.team_id = t and m.user_id = auth.uid()
      and (
        m.role = 'owner' or action = 'view'
        or coalesce(
          (m.overrides->>action)::boolean,
          (r.perms->>action)::boolean,
          case
            when m.role = 'admin' then true
            when action in ('members','profile','log') then false
            when action = 'review' then m.role in ('translator','editor','proofreader')
            when action = 'board' then m.role in ('translator','editor','proofreader')
            when action = 'delete' then m.role = 'translator'
            else m.role in ('translator','editor')
          end
        )
      )
  )
$fn$;

-- Mantenemos private.in_team() para lectura de borradores y supervision:
-- nunca emplearlo para conceder permisos de escritura/editoriales al Bibliotecario.

-- Eliminar accesos administrativos directos y amplios: la administracion
-- se realiza a traves de RPC SECURITY DEFINER que validan y auditan.
drop policy if exists "series admin" on public.series;
drop policy if exists "teams admin" on public.teams;
drop policy if exists "members admin" on public.team_members;

-- Evitar que el Bibliotecario pueda subir/sobrescribir recursos de equipos
-- solo porque private.in_team() le concede visibilidad de supervision.
drop policy if exists "media write" on storage.objects;
create policy "media write" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('obi-media', 'obi-epub')
  and not private.is_admin()
  and private.in_team(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "media update" on storage.objects;
create policy "media update" on storage.objects
for update to authenticated
using (
  bucket_id in ('obi-media', 'obi-epub')
  and not private.is_admin()
  and private.in_team(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id in ('obi-media', 'obi-epub')
  and not private.is_admin()
  and private.in_team(((storage.foldername(name))[1])::uuid)
);
-- "media delete" usa private.can_edit_team(), que ahora excluye al Bibliotecario.

-- Ninguna salida/cambio de rol podra dejar a un equipo sin propietario.
-- La eliminacion del equipo por CASCADE no se considera salida del propietario.
create or replace function private.protect_last_team_owner()
returns trigger
language plpgsql security definer
set search_path to ''
as $fn$
begin
  if old.role = 'owner'::public.team_role
     and (tg_op = 'DELETE' or new.role is distinct from 'owner'::public.team_role
          or new.team_id is distinct from old.team_id) then
    perform 1 from public.teams where id = old.team_id for update;
    if found and not exists (
      select 1 from public.team_members
      where team_id = old.team_id
        and user_id <> old.user_id
        and role = 'owner'::public.team_role
    ) then
      raise exception 'last_team_owner'
        using hint = 'Transfiere primero la propiedad del equipo.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$fn$;

drop trigger if exists team_members_protect_owner on public.team_members;
create trigger team_members_protect_owner
before delete or update of role, team_id on public.team_members
for each row execute function private.protect_last_team_owner();

-- El RPC anterior admitia crear un equipo vacio.
-- El nuevo RPC exige un propietario, creado en la MISMA transaccion.
drop function if exists public.admin_create_team(text, text, text);
create function public.admin_create_team(
  p_name text, p_slug text, p_color text, p_owner text
) returns uuid
language plpgsql security definer
set search_path to ''
as $fn$
declare tid uuid; uid uuid;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'El identificador solo admite minusculas, numeros y guiones';
  end if;
  select p.id into uid
  from public.profiles p join auth.users u on u.id = p.id
  where lower(u.email) = lower(btrim(p_owner))
     or lower(p.username) = lower(btrim(p_owner))
  limit 1;
  if uid is null then raise exception 'El propietario debe tener una cuenta registrada'; end if;
  if exists (
    select 1 from public.profiles
    where id = uid and platform_role = 'bibliotecario'
  ) then
    raise exception 'El Bibliotecario no puede ser propietario de un equipo';
  end if;

  insert into public.teams (name, slug, color)
  values (btrim(p_name), p_slug, coalesce(p_color, '#f2c230'))
  returning id into tid;

  insert into public.team_members (team_id, user_id, role)
  values (tid, uid, 'owner'::public.team_role);

  perform private.audit('crear_equipo', 'team', tid::text,
    jsonb_build_object('name', p_name, 'owner_id', uid));
  return tid;
end
$fn$;

-- No permitir otorgar o sustituir la propiedad desde el alta ordinaria.
drop function if exists public.admin_add_publisher(text, uuid, text);
create function public.admin_add_publisher(
  p_user text, p_team uuid, p_role text, p_reason text
) returns void
language plpgsql security definer
set search_path to ''
as $fn$
declare uid uuid;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 12 then
    raise exception 'Explica el motivo de la intervencion (12 caracteres minimo)';
  end if;
  if p_role not in ('admin','translator','editor','proofreader','collaborator') then
    raise exception 'El rol Propietario requiere un procedimiento de transferencia';
  end if;
  perform 1 from public.teams where id = p_team for update;
  if not found then raise exception 'El equipo no existe'; end if;
  select p.id into uid
  from public.profiles p join auth.users u on u.id = p.id
  where lower(u.email) = lower(btrim(p_user))
     or lower(p.username) = lower(btrim(p_user))
  limit 1;
  if uid is null then raise exception 'No existe esa cuenta'; end if;
  if exists (
    select 1 from public.profiles
    where id = uid and platform_role = 'bibliotecario'
  ) then
    raise exception 'El Bibliotecario no se incorpora como integrante editorial';
  end if;
  if exists (
    select 1 from public.team_members
    where team_id = p_team and user_id = uid and role = 'owner'::public.team_role
  ) then
    raise exception 'El propietario solo puede cambiar mediante transferencia';
  end if;

  insert into public.team_members (team_id, user_id, role, role_id, overrides)
  values (p_team, uid, p_role::public.team_role, null, '{}'::jsonb)
  on conflict (team_id, user_id)
  do update set role = excluded.role, role_id = null, overrides = '{}'::jsonb;

  perform private.audit('agregar_o_cambiar_publicador', 'team', p_team::text,
    jsonb_build_object('user', uid, 'role', p_role, 'reason', btrim(p_reason)));
end
$fn$;

-- Al retirar un integrante, conservar asignaciones coherentes y auditar.
drop function if exists public.admin_remove_member(uuid, uuid);
create function public.admin_remove_member(
  p_team uuid, p_user uuid, p_reason text
) returns void
language plpgsql security definer
set search_path to ''
as $fn$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 12 then
    raise exception 'Explica el motivo de la intervencion (12 caracteres minimo)';
  end if;
  perform 1 from public.teams where id = p_team for update;
  if not found then raise exception 'El equipo no existe'; end if;
  if exists (
    select 1 from public.team_members
    where team_id = p_team and user_id = p_user and role = 'owner'::public.team_role
  ) then
    raise exception 'El propietario solo puede retirarse tras transferir la propiedad';
  end if;
  if not exists (
    select 1 from public.team_members where team_id = p_team and user_id = p_user
  ) then
    raise exception 'El usuario no pertenece a este equipo';
  end if;
  update public.chapters
  set assigned_to = null
  where assigned_to = p_user and private.series_team(series_id) = p_team;
  delete from public.team_members where team_id = p_team and user_id = p_user;
  perform private.audit('quitar_publicador', 'team', p_team::text,
    jsonb_build_object('user', p_user, 'reason', btrim(p_reason)));
end
$fn$;

revoke all on function public.admin_create_team(text, text, text, text) from public, anon;
revoke all on function public.admin_add_publisher(text, uuid, text, text) from public, anon;
revoke all on function public.admin_remove_member(uuid, uuid, text) from public, anon;
grant execute on function public.admin_create_team(text, text, text, text) to authenticated;
grant execute on function public.admin_add_publisher(text, uuid, text, text) to authenticated;
grant execute on function public.admin_remove_member(uuid, uuid, text) to authenticated;

commit;

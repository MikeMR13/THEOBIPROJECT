-- El Obi del Lector — Invitaciones de un solo uso a equipos traductores.
-- PREPARADA PARA STAGING. NO APLICAR A PRODUCCION SIN PRUEBAS CON ROLES REALES.
-- La URL lleva el token exclusivamente en el fragmento (#token=...).
-- El token solo se revela una vez al Bibliotecario; DB conserva SHA-256.

begin;

create table public.team_invitations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  invitation_kind text not null default 'join',
  new_team_name text,
  new_team_slug text,
  invite_email text not null,
  invited_role public.team_role not null,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoke_reason text,
  constraint team_invitation_email_valid
    check (invite_email = lower(btrim(invite_email)) and length(invite_email) <= 254
      and invite_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  -- 'owner' incluye la administración total del equipo; no requiere duplicar el rol 'admin'.
  constraint team_invitation_mode check (
    (invitation_kind='join' and team_id is not null and invited_role<>'owner'
      and new_team_name is null and new_team_slug is null)
    or
    (invitation_kind='create_team' and invited_role='owner'
      and new_team_name is not null and new_team_slug is not null
      and (team_id is null or redeemed_at is not null))
  ),
  constraint team_invitation_name check (
    new_team_name is null or
    (length(new_team_name) between 2 and 60 and new_team_name=btrim(new_team_name))
  ),
  constraint team_invitation_slug check (
    new_team_slug is null or new_team_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
  ),
  constraint team_invitation_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint team_invitation_valid_dates check (expires_at > created_at),
  constraint team_invitation_state check (redeemed_at is null or revoked_at is null),
  constraint team_invitation_redeemer_pair check ((redeemed_at is null) = (redeemed_by is null)),
  constraint team_invitation_revoker_pair check ((revoked_at is null) = (revoked_by is null))
);
create index team_invitations_team_created_idx on public.team_invitations(team_id,created_at desc);
create index team_invitations_email_idx on public.team_invitations(invite_email);

alter table public.team_invitations enable row level security;
-- Ningún cliente puede leer o alterar tokens/reservas directamente.
-- Todas las operaciones se realizan en RPC con comprobaciones de identidad.
revoke all on table public.team_invitations from public, anon, authenticated;

create function public.admin_invitation_create(
  p_team uuid, p_email text, p_role text default 'admin', p_hours integer default 48,
  p_reason text default '', p_kind text default 'join',
  p_new_team_name text default null, p_new_team_slug text default null
)
returns jsonb
language plpgsql security definer
set search_path to ''
as $fn$
declare
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_name text;
  v_new_name text := nullif(btrim(coalesce(p_new_team_name,'')),'');
  v_new_slug text := nullif(btrim(coalesce(p_new_team_slug,'')),'');
  v_token text; v_id uuid; v_expires timestamptz;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'forbidden'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(v_email)>254 then raise exception 'Correo de invitación inválido'; end if;
  if p_kind is null or p_kind not in ('join','create_team') then
    raise exception 'Tipo de invitación inválido';
  end if;
  if p_role is null
    or (p_kind='join' and p_role not in ('admin','translator','editor','proofreader','collaborator'))
    or (p_kind='create_team' and p_role<>'owner') then
    raise exception 'Rol incompatible con el destino';
  end if;
  if p_hours is null or p_hours not in (24,48,168) then
    raise exception 'Caducidad inválida (24, 48 o 168 horas)';
  end if;
  if length(btrim(coalesce(p_reason,'')))<12 then
    raise exception 'Explica el motivo de invitación (mínimo 12 caracteres)';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));

  if p_kind='join' then
    if p_team is null or v_new_name is not null or v_new_slug is not null then
      raise exception 'Selecciona un equipo existente';
    end if;
    select t.name into v_name from public.teams t where t.id=p_team
      and exists (select 1 from public.team_members m
        where m.team_id=t.id and m.role='owner'::public.team_role);
    if v_name is null then raise exception 'El equipo debe tener propietario'; end if;
  else
    if p_team is not null then raise exception 'El equipo todavía no debe existir'; end if;
    if v_new_name is null or length(v_new_name) not between 2 and 60 then
      raise exception 'Escribe el nombre del equipo (2-60 caracteres)';
    end if;
    if v_new_slug is null
       or v_new_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
      raise exception 'Identificador inválido (3-40 caracteres)';
    end if;
    if exists(select 1 from public.teams where slug=v_new_slug) then
      raise exception 'El identificador ya existe';
    end if;
    if exists(select 1 from public.team_invitations
      where invitation_kind='create_team' and new_team_slug=v_new_slug
        and redeemed_at is null and revoked_at is null and expires_at>now()) then
      raise exception 'Ya hay una invitación activa para crear ese equipo';
    end if;
    v_name:=v_new_name;
  end if;

  if (select count(*) from public.team_invitations
    where created_by=auth.uid() and created_at>now()-interval '24 hours') >= 30 then
    raise exception 'Límite diario de invitaciones alcanzado';
  end if;
  if exists (select 1 from public.team_invitations
    where invitation_kind=p_kind and invite_email=v_email
      and ((p_kind='join' and team_id=p_team)
        or (p_kind='create_team' and new_team_slug=v_new_slug))
      and redeemed_at is null and revoked_at is null and expires_at>now()) then
    raise exception 'Ya existe una invitación activa para ese correo y destino';
  end if;
  v_token:=pg_catalog.encode(extensions.gen_random_bytes(32),'hex');
  v_expires:=now()+make_interval(hours => p_hours);
  insert into public.team_invitations(
    team_id,invitation_kind,new_team_name,new_team_slug,
    invite_email,invited_role,token_hash,created_by,expires_at
  ) values (
    p_team,p_kind,v_new_name,v_new_slug,v_email,p_role::public.team_role,
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_token,'UTF8')),'hex'),
    auth.uid(),v_expires
  ) returning id into v_id;
  perform private.audit('invitacion_equipo_creada','team_invitation',v_id::text,
    pg_catalog.jsonb_build_object('kind',p_kind,'team_id',p_team,
      'new_team_name',v_new_name,'new_team_slug',v_new_slug,
      'email',v_email,'role',p_role,'expires_at',v_expires,'reason',btrim(p_reason)));
  return pg_catalog.jsonb_build_object('id',v_id,'token',v_token,
    'team_name',v_name,'kind',p_kind,'expires_at',v_expires);
end
$fn$;

create function public.admin_invitation_list(p_limit integer default 100)
returns table(
  id uuid, team_id uuid, team_name text, invitation_kind text, invite_email text,
  invited_role text, created_at timestamptz, expires_at timestamptz,
  status text, redeemed_at timestamptz
)
language plpgsql security definer
set search_path to ''
as $fn$
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'forbidden'; end if;
  return query
  select i.id,i.team_id,coalesce(t.name,i.new_team_name),i.invitation_kind,
    i.invite_email,i.invited_role::text,
    i.created_at,i.expires_at,
    case when i.redeemed_at is not null then 'utilizada'
      when i.revoked_at is not null then 'revocada'
      when i.expires_at<=now() then 'caducada'
      else 'pendiente' end,
    i.redeemed_at
  from public.team_invitations i
  left join public.teams t on t.id=i.team_id
  order by i.created_at desc
  limit least(greatest(coalesce(p_limit,100),1),200);
end
$fn$;

create function public.admin_invitation_revoke(p_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path to ''
as $fn$
declare v_team uuid;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'forbidden'; end if;
  if length(btrim(coalesce(p_reason,'')))<12 then
    raise exception 'Explica el motivo de revocación (mínimo 12 caracteres)';
  end if;
  update public.team_invitations
  set revoked_at=now(), revoked_by=auth.uid(), revoke_reason=btrim(p_reason)
  where id=p_id and redeemed_at is null and revoked_at is null and expires_at>now()
  returning team_id into v_team;
  if not found then raise exception 'La invitación no está pendiente o no existe'; end if;
  perform private.audit('invitacion_equipo_revocada','team_invitation',p_id::text,
    pg_catalog.jsonb_build_object('team_id',v_team,'reason',btrim(p_reason)));
end
$fn$;

-- Solo una cuenta ya iniciada y con el correo confirmado puede ver el destino.
create function public.team_invitation_preview(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path to ''
as $fn$
declare v_inv public.team_invitations%rowtype;
        v_email text;
        v_name text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para ver la invitación'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Enlace inválido'; end if;
  select lower(email) into v_email from auth.users
  where id=auth.uid() and email_confirmed_at is not null
    and deleted_at is null and (banned_until is null or banned_until<=now());
  if v_email is null then raise exception 'Verifica tu correo antes de aceptar'; end if;
  select * into v_inv from public.team_invitations
  where token_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'Enlace inválido'; end if;
  if v_inv.revoked_at is not null then raise exception 'La invitación fue revocada'; end if;
  if v_inv.redeemed_at is not null then raise exception 'La invitación ya fue utilizada'; end if;
  if v_inv.expires_at<=now() then raise exception 'La invitación ha caducado'; end if;
  if v_email<>v_inv.invite_email then
    raise exception 'Inicia sesión con el correo al que se envió la invitación';
  end if;
  if v_inv.invitation_kind='create_team' then
    v_name:=v_inv.new_team_name;
  else
    select name into v_name from public.teams where id=v_inv.team_id;
    if v_name is null then raise exception 'El equipo ya no existe'; end if;
  end if;
  return pg_catalog.jsonb_build_object('team_name',v_name,
    'kind',v_inv.invitation_kind,'role',v_inv.invited_role::text,
    'expires_at',v_inv.expires_at);
end
$fn$;

-- SELECT FOR UPDATE impide doble canje, incluso en solicitudes simultáneas.
-- La membresía y el marcado del token se confirman juntos o no se confirman.
create function public.team_invitation_redeem(p_token text)
returns jsonb
language plpgsql security definer
set search_path to ''
as $fn$
declare v_inv public.team_invitations%rowtype;
        v_email text;
        v_platform_role text;
        v_team_id uuid;
        v_slug text;
        v_name text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Enlace inválido'; end if;
  select lower(email) into v_email from auth.users
    where id=auth.uid() and email_confirmed_at is not null
      and deleted_at is null and (banned_until is null or banned_until<=now());
  if v_email is null then raise exception 'Debes verificar tu correo'; end if;
  -- Un solo canje incluso con peticiones simultáneas.
  select * into v_inv from public.team_invitations
    where token_hash=pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')),'hex')
    for update;
  if not found then raise exception 'Enlace inválido'; end if;
  if v_inv.revoked_at is not null or v_inv.redeemed_at is not null
    or v_inv.expires_at<=now() then raise exception 'Enlace caducado o utilizado'; end if;
  if v_email<>v_inv.invite_email then
    raise exception 'Inicia sesión con el correo invitado';
  end if;
  select platform_role into v_platform_role from public.profiles where id=auth.uid();
  if v_platform_role is null then raise exception 'Completa tu registro antes de aceptar'; end if;
  if v_platform_role='bibliotecario' then
    raise exception 'El Bibliotecario no participa como propietario editorial';
  end if;

  if v_inv.invitation_kind='create_team' then
    -- No se crea un grupo vacío: las tres escrituras se confirman juntas.
    if exists (select 1 from public.teams where slug=v_inv.new_team_slug) then
      raise exception 'El identificador fue ocupado; solicita una invitación nueva';
    end if;
    insert into public.teams(name,slug)
    values(v_inv.new_team_name,v_inv.new_team_slug)
    returning id,slug,name into v_team_id,v_slug,v_name;
  else
    v_team_id:=v_inv.team_id;
    if exists(select 1 from public.team_members
      where team_id=v_team_id and user_id=auth.uid()) then
      raise exception 'Ya perteneces a este equipo';
    end if;
    select slug,name into v_slug,v_name from public.teams where id=v_team_id;
    if v_slug is null then raise exception 'El equipo ya no existe'; end if;
  end if;

  insert into public.team_members(team_id,user_id,role)
  values(v_team_id,auth.uid(),v_inv.invited_role);
  update public.team_invitations
  set team_id=v_team_id,redeemed_at=now(),redeemed_by=auth.uid()
  where id=v_inv.id;
  perform private.audit('invitacion_equipo_canjeada','team_invitation',v_inv.id::text,
    pg_catalog.jsonb_build_object('kind',v_inv.invitation_kind,
      'team_id',v_team_id,'user_id',auth.uid(),'role',v_inv.invited_role::text));
  return pg_catalog.jsonb_build_object('team_id',v_team_id,'team_slug',v_slug,
    'team_name',v_name,'kind',v_inv.invitation_kind,'role',v_inv.invited_role::text);
end
$fn$;

-- EXECUTE sobre RPC SECURITY DEFINER nunca debe heredarse de PUBLIC.
revoke all on function public.admin_invitation_create(uuid,text,text,integer,text,text,text,text) from public, anon;
revoke all on function public.admin_invitation_list(integer) from public, anon;
revoke all on function public.admin_invitation_revoke(uuid,text) from public, anon;
revoke all on function public.team_invitation_preview(text) from public, anon;
revoke all on function public.team_invitation_redeem(text) from public, anon;
grant execute on function public.admin_invitation_create(uuid,text,text,integer,text,text,text,text) to authenticated;
grant execute on function public.admin_invitation_list(integer) to authenticated;
grant execute on function public.admin_invitation_revoke(uuid,text) to authenticated;
grant execute on function public.team_invitation_preview(text) to authenticated;
grant execute on function public.team_invitation_redeem(text) to authenticated;

commit;

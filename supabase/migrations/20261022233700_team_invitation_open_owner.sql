-- El Obi del Lector — invitación libre para formar un equipo nuevo.
-- El enlace público de un solo uso entrega propiedad al primer usuario
-- autenticado con correo verificado que lo acepte expresamente.
-- El Bibliotecario es el único facultado para emitirlo; nunca se otorga rol global.
begin;

alter table public.team_invitations drop constraint team_invitation_email_valid;
alter table public.team_invitations add constraint team_invitation_email_valid
check (
  (invite_email is not null
    and invite_email=lower(btrim(invite_email))
    and length(invite_email)<=254
    and invite_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
  or
  (invite_email is null and
    (
      (invitation_kind='create_team' and invited_role='owner')
      or (invitation_kind='join'
          and invited_role in ('translator','editor','proofreader','collaborator'))
    )
  )
);

create or replace function public.admin_invitation_create(
  p_team uuid, p_email text, p_role text default 'admin', p_hours integer default 48,
  p_reason text default '', p_kind text default 'join',
  p_new_team_name text default null, p_new_team_slug text default null
)
returns jsonb
language plpgsql security definer
set search_path to ''
as $fn$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email,''))),'');
  v_name text;
  v_new_name text := nullif(btrim(coalesce(p_new_team_name,'')),'');
  v_new_slug text := nullif(btrim(coalesce(p_new_team_slug,'')),'');
  v_token text; v_id uuid; v_expires timestamptz;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'forbidden'; end if;
  if v_email is not null and (
    v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(v_email)>254) then
    raise exception 'Correo de invitación inválido';
  end if;
  if p_kind is null or p_kind not in ('join','create_team') then
    raise exception 'Tipo de invitación inválido';
  end if;
  if p_role is null
    or (p_kind='join' and p_role not in ('admin','translator','editor','proofreader','collaborator'))
    or (p_kind='create_team' and p_role<>'owner') then
    raise exception 'Rol incompatible con el destino';
  end if;
  -- Un enlace libre para crear un equipo sólo se emite desde el Bibliotecario.
  -- El primer usuario con correo confirmado que lo canjee será el único owner.
  -- En equipos existentes, un enlace libre nunca concede rol admin.
  if v_email is null and not (
    (p_kind='create_team' and p_role='owner')
    or
    (p_kind='join' and p_role in ('translator','editor','proofreader','collaborator'))
  ) then
    raise exception 'Esta invitación requiere un correo específico';
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
  if v_email is not null and exists (select 1 from public.team_invitations
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

-- SECURITY DEFINER sólo para usuarios autenticados; la función comprueba is_admin().
revoke execute on function public.admin_invitation_create(uuid,text,text,integer,text,text,text,text)
  from public,anon;
grant execute on function public.admin_invitation_create(uuid,text,text,integer,text,text,text,text)
  to authenticated;
commit;

-- Reforzar condición explícita de correo en canjes de enlaces libres.
-- Esta corrección se instala tras team_invitation_open_links.
begin;
create or replace function public.team_invitation_redeem(p_token text)
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
  if v_inv.invite_email is not null and v_email<>v_inv.invite_email then
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
revoke execute on function public.team_invitation_redeem(text) from public,anon;
grant execute on function public.team_invitation_redeem(text) to authenticated;
commit;

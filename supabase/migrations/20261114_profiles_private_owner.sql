-- Corrección SEG-01 — acceso por columna a profiles sin modificar identidades.
-- FASE PREPARADA, NO APLICAR A PRODUCCIÓN sin QA de correo / Google / Patreon.
-- No cambia auth.users, auth.identities, profiles.id, patreon_user_id ni RLS.
-- Ejecutar como una migración transaccional, solo tras probar en backend aislado.

begin;

-- Lectura propia completa exclusivamente para una cuenta autenticada.
-- El dueño de la función debe ser un rol con acceso a profiles (postgres).
create or replace function public.my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile jsonb;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select to_jsonb(p) into v_profile
  from public.profiles as p
  where p.id = v_uid;
  return v_profile;
end;
$$;

-- Inicio y Catálogo necesitan solo saber si la cuenta habilitó +18.
-- No se revelan el resto de preferencias ni identificadores.
create or replace function public.my_adult_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.adult_ok from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.my_profile() from public, anon;
revoke all on function public.my_adult_ok() from public, anon;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.my_adult_ok() to authenticated;

-- Limitar TODAS las lecturas directas a los tres datos de identidad visual.
-- RLS se conserva. El perfil público completo se muestra vía reader_public,
-- que ya aplica la visibilidad / bloqueos definidos por el usuario.
-- No revocar UPDATE de campos privados: el propietario debe poder editarlos.
revoke select on table public.profiles from public, anon, authenticated;
grant select (id, username, avatar_url) on table public.profiles to anon, authenticated;

-- Validaciones de privilegios inmediatas (abortan y revierten si fallan).
do $$
begin
  if has_column_privilege('anon','public.profiles','patreon_user_id','SELECT')
     or has_column_privilege('authenticated','public.profiles','patreon_user_id','SELECT')
     or has_column_privilege('anon','public.profiles','notify','SELECT')
     or has_column_privilege('authenticated','public.profiles','ui_prefs','SELECT')
  then raise exception 'privacy_grants_not_restricted'; end if;
  if not has_column_privilege('anon','public.profiles','username','SELECT')
     or not has_column_privilege('authenticated','public.profiles','avatar_url','SELECT')
     or not has_column_privilege('service_role','public.profiles','patreon_user_id','SELECT')
  then raise exception 'public_identity_or_service_role_broken'; end if;
end;
$$;

commit;

-- REVISIÓN OBLIGATORIA EN QA:
-- Como anon: SELECT id,username,avatar_url permitido; SELECT notify/patreon_user_id denegado.
-- Como otro usuario: SELECT private de otro mediante my_profile nunca posible.
-- Como dueño: my_profile retorna SOLO fila auth.uid(); UPDATE notify/ui_prefs/patron_wall intacto.
-- Como Google/correo: auth.identities.user_id inalterado.
-- Como Patreon: Edge service_role y patreon_begin/login/link/unlink siguen intactos.

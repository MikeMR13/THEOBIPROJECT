-- Corrección SEG-01 — acceso por columna a profiles sin modificar identidades.
-- FASE PREPARADA, NO APLICAR A PRODUCCIÓN sin QA de correo / Google / Patreon.
-- No cambia auth.users, auth.identities, profiles.id, patreon_user_id ni RLS.
-- PASO 1 (aditivo): instalar funciones antes de actualizar el frontend.
-- No revoca permisos, no cambia políticas RLS ni perfiles existentes.

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

-- No se alteran los permisos de lectura en este paso.
commit;

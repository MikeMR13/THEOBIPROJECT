-- SEG-01 / PASO 3 — Bloqueo público final, exclusivamente DESPUÉS de:
--   1) aplicar 20261114_profiles_private_owner.sql,
--   2) desplegar y probar la interfaz nueva (RPC my_profile / my_adult_ok),
--   3) verificar vinculación correo + Google + Patreon en el mismo auth.users.id,
--   4) comprobar Studio, lector, usuarios anónimos y perfiles públicos.
-- No incluir en migraciones automáticas. Requiere ejecución supervisada con rollback.
-- Prohibido aplicarlo mientras la UI antigua siga consultando perfiles privados.

begin;

-- Preflight: la interfaz depende de estas funciones y el servicio de Patreon
-- depende de mantener SELECT de service_role a sus vínculos.
do $$
begin
  if to_regprocedure('public.my_profile()') is null
     or to_regprocedure('public.my_adult_ok()') is null
     or not has_function_privilege('authenticated','public.my_profile()','EXECUTE')
     or not has_function_privilege('authenticated','public.my_adult_ok()','EXECUTE')
     or not has_column_privilege('service_role','public.profiles','patreon_user_id','SELECT')
  then raise exception 'SEG01 prerequisites not satisfied'; end if;
end
$$;

-- Únicos campos públicos mínimos necesarios para mostrar comentarios,
-- miembros de equipo y menciones. Perfil público completo: reader_public().
revoke select on table public.profiles from public, anon, authenticated;
grant select (id, username, avatar_url) on table public.profiles to anon, authenticated;

-- Verificar permisos antes de confirmar la transacción.
do $$
begin
  if has_column_privilege('anon','public.profiles','patreon_user_id','SELECT')
     or has_column_privilege('authenticated','public.profiles','patreon_user_id','SELECT')
     or has_column_privilege('anon','public.profiles','notify','SELECT')
     or has_column_privilege('authenticated','public.profiles','ui_prefs','SELECT')
  then raise exception 'SEG01 private columns still available'; end if;
  if not has_column_privilege('anon','public.profiles','username','SELECT')
     or not has_column_privilege('authenticated','public.profiles','avatar_url','SELECT')
     or not has_column_privilege('service_role','public.profiles','patreon_user_id','SELECT')
  then raise exception 'SEG01 core identity or server grants broken'; end if;
end
$$;

commit;

-- Guion de reversión de permisos (solo ante incidente comprobado, auditado):
-- BEGIN;
-- GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
-- COMMIT;
-- Reversión temporal reabre SEG-01: programar una corrección segura inmediata.
-- Nunca modificar auth.users/auth.identities o patreon_pledges para revertir permisos.

-- SEG-02 / FASE C — CIERRE FINAL de perfiles. EJECUCIÓN MANUAL SUPERVISADA.
-- Requisitos operativos obligatorios, fuera de esta transacción:
-- A) Fase A ya aplicada, RPC disponibles en PostgREST.
-- B) Frontend nuevo ya desplegado y verificado para Estudio, equipos, comentarios.
-- C) Comprobadas cuentas y navegación real antes de quitar SELECT antiguo.
-- Si aún existe algún frontend viejo que use JOIN de profiles, NO ejecutar.
BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '20s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.studio_profile_names(uuid[])') IS NULL
    OR to_regprocedure('public.team_public_members(uuid)') IS NULL
    OR to_regprocedure('public.comment_public_authors(uuid)') IS NULL
    OR to_regprocedure('public.reader_stats(uuid)') IS NULL
    OR to_regprocedure('public.my_profile()') IS NULL
    OR NOT has_function_privilege('authenticated','public.studio_profile_names(uuid[])','EXECUTE')
    OR NOT has_function_privilege('anon','public.team_public_members(uuid)','EXECUTE')
    OR NOT has_function_privilege('anon','public.comment_public_authors(uuid)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.my_profile()','EXECUTE')
    OR NOT has_column_privilege('service_role','public.profiles','patreon_user_id','SELECT')
    OR NOT has_column_privilege('authenticated','public.profiles','notify','UPDATE')
    OR NOT has_column_privilege('authenticated','public.profiles','ui_prefs','UPDATE')
    OR NOT has_column_privilege('authenticated','public.profiles','patron_wall','UPDATE')
  THEN RAISE EXCEPTION 'SEG-02: falta fase A, privilegios o servicio de Patreon'; END IF;
END $preflight$;

-- 1. Retirar la lectura directa de campos privados de perfiles.
-- El ACL anterior daba SELECT, INSERT, DELETE y MAINTAIN a anon/authenticated.
-- RLS no se aplica a todas las operaciones de mantenimiento: retirar los grants
-- de tabla y restaurar únicamente los permisos mínimos necesarios.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;
-- SELECT(id) permite el filtro por id de UPDATE, bajo policy de propietario.
GRANT SELECT (id) ON TABLE public.profiles TO authenticated;
-- Restaurar exclusivamente los campos editables por el lector (ACL previo).
-- No habilitar edición de id, roles, tier, datos de pago ni atributos internos.
GRANT UPDATE (username, avatar_url, discord_id, telegram_id, adult_ok,
  bio, banner_url, discoverable, public_library, public_activity,
  seal_kanji, accent, links, favorites, profile_sections, profile_visibility,
  show_since, hide_reading, hidden_series, notify, ui_prefs, patron_wall)
ON TABLE public.profiles TO authenticated;
DROP POLICY IF EXISTS "profiles read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
-- Conservar "profiles self update" y "profiles admin" existentes.
-- my_profile() y reader_public() mantienen sus contratos seguros.

-- Comprobar permisos DENTRO de la transacción: aborta sin cambios en caso de fallo.
DO $verify$
BEGIN
  IF has_column_privilege('anon','public.profiles','notify','SELECT')
    OR has_column_privilege('anon','public.profiles','patreon_user_id','SELECT')
    OR has_column_privilege('authenticated','public.profiles','hidden_series','SELECT')
    OR has_table_privilege('anon','public.profiles','SELECT')
    OR NOT has_column_privilege('authenticated','public.profiles','id','SELECT')
    OR NOT has_column_privilege('service_role','public.profiles','patreon_user_id','SELECT')
    OR NOT has_column_privilege('authenticated','public.profiles','patron_wall','UPDATE')
  THEN RAISE EXCEPTION 'SEG-02: falla verificación final de grants'; END IF;
END $verify$;
COMMIT;

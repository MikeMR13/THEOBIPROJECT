-- SEG-02 · Fase A: comprobación de compatibilidad con el frontend anterior.
-- Solo en QA con datos sintéticos. Debe aprobar ANTES de la fase C.
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='profiles read')
    OR NOT has_column_privilege('anon','public.profiles','username','SELECT')
    OR NOT has_column_privilege('anon','public.profiles','avatar_url','SELECT')
    OR NOT has_column_privilege('authenticated','public.profiles','notify','SELECT')
  THEN RAISE EXCEPTION 'SEG02 FASE A rompió acceso legacy del frontend'; END IF;

  IF to_regprocedure('public.studio_profile_names(uuid[])') IS NULL
    OR to_regprocedure('public.team_public_members(uuid)') IS NULL
    OR to_regprocedure('public.comment_public_authors(uuid)') IS NULL
    OR NOT has_function_privilege('anon','public.team_public_members(uuid)','EXECUTE')
    OR NOT has_function_privilege('anon','public.comment_public_authors(uuid)','EXECUTE')
    OR has_function_privilege('anon','public.studio_profile_names(uuid[])','EXECUTE')
    OR has_function_privilege('anon','public.export_my_data()','EXECUTE')
  THEN RAISE EXCEPTION 'SEG02 FASE A no preparó RPC y permisos de la interfaz nueva'; END IF;
END $verify$;
SELECT 'SEG02 FASE A OK: convivencia del frontend anterior y las RPC nuevas' AS result;

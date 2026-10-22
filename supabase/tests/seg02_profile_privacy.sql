-- SEG-02. Ejecutar exclusivamente en el proyecto Supabase QA TRAS aplicar la migración.
-- No modifica datos ni autentica usuarios reales.
DO $check$
BEGIN
  IF has_table_privilege('anon', 'public.profiles', 'SELECT')
    OR has_column_privilege('anon', 'public.profiles', 'notify', 'SELECT')
    OR has_column_privilege('anon', 'public.profiles', 'id', 'SELECT')
    OR has_column_privilege('anon', 'public.profiles', 'ui_prefs', 'SELECT')
    OR has_column_privilege('anon', 'public.profiles', 'hidden_series', 'SELECT')
  THEN RAISE EXCEPTION 'SEG-02: anon todavía lee profiles'; END IF;

  IF has_table_privilege('authenticated','public.profiles','SELECT')
     OR has_column_privilege('authenticated','public.profiles','notify','SELECT')
     OR has_column_privilege('authenticated','public.profiles','hidden_series','SELECT')
  THEN RAISE EXCEPTION 'SEG-02: usuarios pueden leer campos privados de otros perfiles'; END IF;

  IF has_table_privilege('anon','public.profiles','INSERT')
    OR has_table_privilege('anon','public.profiles','DELETE')
    OR has_table_privilege('anon','public.profiles','MAINTAIN')
    OR has_table_privilege('authenticated','public.profiles','INSERT')
    OR has_table_privilege('authenticated','public.profiles','DELETE')
  THEN RAISE EXCEPTION 'SEG-02: permisos de tabla peligrosos'; END IF;

  IF NOT has_column_privilege('authenticated','public.profiles','notify','UPDATE')
    OR NOT has_column_privilege('authenticated','public.profiles','bio','UPDATE')
    OR NOT has_column_privilege('authenticated','public.profiles','patron_wall','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','platform_role','UPDATE')
  THEN RAISE EXCEPTION 'SEG-02: permisos UPDATE demasiado amplios o insuficientes'; END IF;

  IF NOT has_column_privilege('authenticated','public.profiles','id','SELECT')
  THEN RAISE EXCEPTION 'SEG-02: UPDATE por id perdería selección mínima'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='profiles read'
  )
  THEN RAISE EXCEPTION 'SEG-02: persiste política pública antigua'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='profiles self read'
      AND roles = ARRAY['authenticated']::name[]
      AND qual LIKE '%auth.uid()%'
  )
  THEN RAISE EXCEPTION 'SEG-02: falta política propia de SELECT'; END IF;

  IF has_function_privilege('anon','public.studio_profile_names(uuid[])','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.studio_profile_names(uuid[])','EXECUTE')
  THEN RAISE EXCEPTION 'SEG-02: RPC colaboraciones mal expuesta'; END IF;

  IF has_function_privilege('anon','public.export_my_data()','EXECUTE')
    OR has_function_privilege('anon','public.request_account_deletion()','EXECUTE')
    OR has_function_privilege('anon','public.deletion_preview()','EXECUTE')
    OR has_function_privilege('anon','public.patreon_unlink()','EXECUTE')
    OR has_function_privilege('anon','public.admin_review_queue()','EXECUTE')
  THEN RAISE EXCEPTION 'SEG-02: funciones sensibles siguen siendo anónimas'; END IF;

  IF NOT has_function_privilege('anon','public.team_public_members(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.team_public_members(uuid)','EXECUTE')
     OR NOT has_function_privilege('anon','public.comment_public_authors(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'SEG-02: faltan RPC públicas compatibles con equipos y comentarios'; END IF;
  IF NOT has_function_privilege('authenticated','public.studio_profile_names(uuid[])','EXECUTE')
  THEN RAISE EXCEPTION 'SEG-02: administración y Estudio sin acceso a nombres'; END IF;

  IF NOT has_function_privilege('anon','public.reader_public(text)','EXECUTE')
    OR NOT has_function_privilege('anon','public.search_readers(text)','EXECUTE')
  THEN RAISE EXCEPTION 'SEG-02: se rompió interfaz pública de carnet o buscador'; END IF;

  IF position('is_anonymous' IN pg_get_functiondef('public.reader_public(text)'::regprocedure)) > 0
  THEN NULL;  -- reader_public delega privacidad a private.reader_public_core
  END IF;
  IF position('is_anonymous' IN pg_get_functiondef('private.reader_public_core(text)'::regprocedure)) = 0
    OR position('is_anonymous' IN pg_get_functiondef('public.search_readers(text)'::regprocedure)) = 0
  THEN RAISE EXCEPTION 'SEG-02: sesiones anónimas deben seguir siendo visitantes'; END IF;

  IF position('public_activity' IN pg_get_functiondef('public.reader_stats(uuid)'::regprocedure)) = 0
    OR position('profile_visibility' IN pg_get_functiondef('public.reader_stats(uuid)'::regprocedure)) = 0
    OR position('user_blocks' IN pg_get_functiondef('public.reader_stats(uuid)'::regprocedure)) = 0
  THEN RAISE EXCEPTION 'SEG-02: estadísticas no respetan privacidad y bloqueos'; END IF;
END
$check$;
SELECT 'SEG-02 CHECK OK: permisos y contratos públicos' AS qa_result;

-- SEG-02: pruebas ejecutables con identidades y obras ficticias.
-- Se ejecutan en una base desechable; no se conectan a producción.
\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{}',true);
DO $qa$
DECLARE n int; x jsonb;
BEGIN
  BEGIN
    EXECUTE 'SELECT count(*) FROM public.profiles' INTO n;
    RAISE EXCEPTION 'FAIL: anon logró SELECT sobre profiles';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF NOT has_function_privilege('anon','public.reader_public(text)','EXECUTE')
  THEN RAISE EXCEPTION 'FAIL: carnet público perdió permisos'; END IF;
  IF has_function_privilege('anon','public.studio_profile_names(uuid[])','EXECUTE')
  THEN RAISE EXCEPTION 'FAIL: anon consulta RPC interna del Estudio'; END IF;
  IF has_function_privilege('anon','public.export_my_data()','EXECUTE')
  THEN RAISE EXCEPTION 'FAIL: anon puede exportar cuenta'; END IF;
  IF (SELECT count(*) FROM public.team_public_members('dddddddd-dddd-4ddd-8ddd-dddddddddddd')) <> 2
  THEN RAISE EXCEPTION 'FAIL: integrantes públicos de equipos'; END IF;
  IF (SELECT count(*) FROM public.comment_public_authors('ffffffff-ffff-4fff-8fff-ffffffffffff')) <> 1
  THEN RAISE EXCEPTION 'FAIL: autores públicos de comentarios'; END IF;
  x := public.reader_public('qa_alfa');
  IF x IS NULL OR x->>'username' IS DISTINCT FROM 'qa_alfa'
      OR x ? 'private'
  THEN RAISE EXCEPTION 'FAIL: carnet público completo dejó de funcionar'; END IF;
  x := public.reader_public('qa_beta');
  IF x->>'private' IS DISTINCT FROM 'auth'
  THEN RAISE EXCEPTION 'FAIL: perfil solo con cuenta visible al visitante'; END IF;
  x := public.reader_public('qa_gamma');
  IF x->>'private' IS DISTINCT FROM 'none'
  THEN RAISE EXCEPTION 'FAIL: perfil oculto visible al visitante'; END IF;
  x := public.search_readers('qa_');
  IF jsonb_array_length(x) <> 1
  THEN RAISE EXCEPTION 'FAIL: búsqueda anon descubre perfiles auth/none'; END IF;
  x := public.reader_stats('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  IF x IS NOT NULL THEN RAISE EXCEPTION 'FAIL: estadísticas de perfil none públicas'; END IF;
END $qa$;
ROLLBACK;
\echo 'SEG-02 ANON OK'

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT set_config('request.jwt.claims','{}',true);
DO $qa$
DECLARE n int; x jsonb;
BEGIN
  SELECT count(*) INTO n FROM public.profiles;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: B ve perfiles ajenos (%).',n; END IF;
  BEGIN
    EXECUTE 'SELECT notify FROM public.profiles' INTO x;
    RAISE EXCEPTION 'FAIL: B puede leer notify directamente de otros';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  x := public.my_profile();
  IF x->>'username' IS DISTINCT FROM 'qa_beta'
     OR x->'notify'->>'freq' IS DISTINCT FROM 'diario'
  THEN RAISE EXCEPTION 'FAIL: my_profile no devuelve preferencias de B'; END IF;
  UPDATE public.profiles SET notify='{"freq":"off"}' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  IF public.my_profile()->'notify'->>'freq' IS DISTINCT FROM 'off'
  THEN RAISE EXCEPTION 'FAIL: preferencia B no guardada'; END IF;
  UPDATE public.profiles SET notify='{"freq":"off"}' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: B editó ajustes de A'; END IF;
  BEGIN
    UPDATE public.profiles SET platform_role='admin' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    RAISE EXCEPTION 'FAIL: el lector puede cambiar rol de plataforma';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SELECT count(*) INTO n FROM public.studio_profile_names(ARRAY[
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
  ]);
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL: nombres de equipo/comentarista (%).',n; END IF;
  SELECT count(*) INTO n FROM public.studio_profile_names(ARRAY[
    '99999999-9999-4999-8999-999999999999'::uuid
  ]);
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: Estudio enumeró un usuario externo no relacionado'; END IF;
  x := public.reader_stats('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  IF x IS NOT NULL THEN RAISE EXCEPTION 'FAIL: B consulta estadísticas privadas de C'; END IF;
  x := public.reader_public('qa_gamma');
  IF x->>'private' IS DISTINCT FROM 'none'
  THEN RAISE EXCEPTION 'FAIL: B accede al carnet privado C'; END IF;
  x := public.search_readers('qa_');
  IF jsonb_array_length(x) <> 2
  THEN RAISE EXCEPTION 'FAIL: búsqueda autenticada no respeta visibilidad'; END IF;
END $qa$;
ROLLBACK;
\echo 'SEG-02 B / RLS / STUDIO OK'

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
SELECT set_config('request.jwt.claims','{"is_anonymous":true}',true);
DO $qa$
DECLARE x jsonb;
BEGIN
  x := public.reader_public('qa_beta');
  IF x->>'private' IS DISTINCT FROM 'auth'
  THEN RAISE EXCEPTION 'FAIL: sesión anónima de Auth accede al perfil auth'; END IF;
  x := public.search_readers('qa_');
  IF jsonb_array_length(x) <> 1
  THEN RAISE EXCEPTION 'FAIL: búsqueda con sesión anónima filtra cuentas'; END IF;
  x := public.reader_stats('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  IF x IS NOT NULL THEN RAISE EXCEPTION 'FAIL: estadística auth accesible a sesión anónima'; END IF;
END $qa$;
ROLLBACK;
\echo 'SEG-02 ANONYMOUS-AUTH OK'

BEGIN;
-- Bloqueo explícito impide ver estadísticas públicas aun desde cuenta registrada.
INSERT INTO public.user_blocks(user_id,blocked_id,kind)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','block');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT set_config('request.jwt.claims','{}',true);
DO $qa$
DECLARE x jsonb;
BEGIN
  x := public.reader_stats('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  IF x IS NOT NULL THEN RAISE EXCEPTION 'FAIL: usuario bloqueado ve estadísticas de A'; END IF;
END $qa$;
ROLLBACK;
\echo 'SEG-02 BLOCKS OK'

BEGIN;
-- Equipo oculta nombres aunque los usuarios sigan vinculados.
UPDATE public.teams SET settings='{"show_members":false}'
WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
SET LOCAL ROLE anon;
DO $qa$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.team_public_members('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: página de equipo oculto sigue mostrando miembros'; END IF;
END $qa$;
ROLLBACK;
\echo 'SEG-02 TEAM SETTINGS OK'

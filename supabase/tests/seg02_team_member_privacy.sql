-- SEG-02: identidades del equipo solo para integrantes autenticados.
-- Base sintética; no modificar usuarios ni registros de producción.
DO $verify$
BEGIN
 IF to_regprocedure('public.studio_team_member_profiles(uuid)') IS NULL
  OR has_function_privilege('anon','public.studio_team_member_profiles(uuid)','EXECUTE')
  OR NOT has_function_privilege('authenticated','public.studio_team_member_profiles(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'SEG02: función interna no preparada o pública'; END IF;
END $verify$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
SELECT set_config('request.jwt.claims','{}',true);
DO $verify$
DECLARE n int; av text;
BEGIN
 SELECT count(*) INTO n FROM public.studio_team_member_profiles('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 IF n<>2 THEN RAISE EXCEPTION 'Miembro B debería leer dos integrantes, obtuvo %',n; END IF;
 SELECT avatar_url INTO av FROM public.studio_team_member_profiles('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
 WHERE username='qa_alfa';
 IF av IS DISTINCT FROM 'a.png' THEN RAISE EXCEPTION 'Avatar público de equipo perdido'; END IF;
END $verify$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
SELECT set_config('request.jwt.claims','{}',true);
DO $verify$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM public.studio_team_member_profiles('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 IF n<>0 THEN RAISE EXCEPTION 'Usuario externo pudo enumerar % integrantes',n; END IF;
END $verify$;
ROLLBACK;
SELECT 'SEG-02 STUDIO TEAM MEMBERS PASS' AS result;
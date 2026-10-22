-- SEG-02 / Preparación antes del cierre final de profiles.
-- La pantalla de roles de Estudio todavía hacía un JOIN a perfiles.
-- Retornar solo identificador, nombre y avatar a un integrante del mismo equipo.
BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '20s';
CREATE OR REPLACE FUNCTION public.studio_team_member_profiles(p_team uuid)
RETURNS TABLE(user_id uuid, username text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $studio_members$
  SELECT m.user_id, p.username, p.avatar_url
  FROM public.team_members m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.team_id = p_team
    AND (SELECT auth.uid()) IS NOT NULL
    AND NOT coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    AND EXISTS (
      SELECT 1 FROM public.team_members viewer
      WHERE viewer.team_id = p_team AND viewer.user_id = (SELECT auth.uid())
    )
  LIMIT 1000
$studio_members$;
REVOKE ALL ON FUNCTION public.studio_team_member_profiles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_team_member_profiles(uuid) TO authenticated;
COMMIT;

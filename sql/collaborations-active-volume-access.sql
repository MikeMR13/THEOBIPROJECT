-- APLICACIÓN CONTROLADA (NO EJECUTADA SOBRE PRODUCCIÓN)
-- Requisito para reconocer los accesos por colaboración aceptada en volúmenes.
-- Estado vigente de public.collaborations_status_check: pending, active, declined, revoked.
-- ANTES: private.collab_team comparaba c.status = 'accepted' (estado imposible).
-- DESPUÉS: compara 'active'; se conservan firma, SECURITY DEFINER, search_path vacío
-- y el requisito de pertenencia al equipo invitado.
-- Ejecutar únicamente después de validar en un entorno aislado.
BEGIN;

CREATE OR REPLACE FUNCTION private.collab_team(s uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.collaborations c
    JOIN public.team_members m
      ON m.team_id = c.invited_team
     AND m.user_id = auth.uid()
    WHERE c.series_id = s
      AND c.status = 'active'
  )
$function$;

COMMIT;

-- Comprobación posterior, únicamente lectura:
-- SELECT pg_get_functiondef('private.collab_team(uuid)'::regprocedure);
-- Debe comprobarse con un usuario real del equipo invitado una vez acepte;
-- no se modifica ni acepta ninguna invitación con este script.

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

-- Restringir quién puede decidir una invitación.
-- Antes, `collab respond` aceptaba UPDATE por el equipo invitado O remitente;
-- el remitente podía aceptar en lugar del invitado usando la API directamente.
-- Se conservan los permisos existentes de consulta e inserción.
DROP POLICY IF EXISTS "collab respond" ON public.collaborations;
DROP POLICY IF EXISTS "collab decide" ON public.collaborations;
DROP POLICY IF EXISTS "collab revoke sender" ON public.collaborations;

CREATE POLICY "collab decide"
ON public.collaborations FOR UPDATE TO authenticated
USING (
  status = 'pending'
  AND private.can_edit_team(invited_team)
)
WITH CHECK (
  status IN ('active', 'declined')
  AND private.can_edit_team(invited_team)
);

CREATE POLICY "collab revoke sender"
ON public.collaborations FOR UPDATE TO authenticated
USING (
  status IN ('pending', 'active', 'declined')
  AND private.can_edit_team(inviter_team)
)
WITH CHECK (
  status = 'revoked'
  AND private.can_edit_team(inviter_team)
);

COMMIT;

-- Comprobación posterior, únicamente lectura:
-- SELECT pg_get_functiondef('private.collab_team(uuid)'::regprocedure);
-- Debe comprobarse con un usuario real del equipo invitado una vez acepte;
-- no se modifica ni acepta ninguna invitación con este script.

-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname='public' AND tablename='collaborations';
-- Debe haber dos reglas UPDATE: invitado decide (active/declined);
-- remitente revoca (revoked). La SELECT de colaboradores permanece igual.

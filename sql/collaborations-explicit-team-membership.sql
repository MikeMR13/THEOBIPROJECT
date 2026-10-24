-- Segunda migración: la identidad que decide debe PERTENECER al equipo.
-- Las funciones private.can_edit_team() incluyen a Bibliotecarios globales;
-- ese privilegio no permite actuar como el destinatario/remitente en invitaciones.
-- La primera migración ya restringió UPDATE a la columna status.
DROP POLICY IF EXISTS "collab decide" ON public.collaborations;
DROP POLICY IF EXISTS "collab revoke sender" ON public.collaborations;

CREATE POLICY "collab decide"
ON public.collaborations FOR UPDATE TO authenticated
USING (
  status = 'pending'
  AND private.team_role_of(invited_team) IS NOT NULL
  AND private.can_edit_team(invited_team)
)
WITH CHECK (
  status IN ('active', 'declined')
  AND private.team_role_of(invited_team) IS NOT NULL
  AND private.can_edit_team(invited_team)
);

CREATE POLICY "collab revoke sender"
ON public.collaborations FOR UPDATE TO authenticated
USING (
  status IN ('pending', 'active', 'declined')
  AND private.team_role_of(inviter_team) IS NOT NULL
  AND private.can_edit_team(inviter_team)
)
WITH CHECK (
  status = 'revoked'
  AND private.team_role_of(inviter_team) IS NOT NULL
  AND private.can_edit_team(inviter_team)
);

-- Conserva invitaciones, SELECT/INSERT, permisos por columna y collab_team.
-- Verificación tras aplicar:
-- SELECT policyname, qual, with_check FROM pg_policies
-- WHERE schemaname='public' AND tablename='collaborations' AND cmd='UPDATE';

-- Restaurar versión observada previamente de team_public_members.
-- Reabre visibilidad anterior y requiere revisión.
begin;
CREATE OR REPLACE FUNCTION public.team_public_members(p_team uuid)
 RETURNS TABLE(role text, username text, role_name text, role_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT m.role::text, p.username, tr.name, tr.color
  FROM public.team_members m
  JOIN public.profiles p ON p.id = m.user_id
  JOIN public.teams t ON t.id = m.team_id
  LEFT JOIN public.team_roles tr ON tr.id = m.role_id AND tr.team_id = m.team_id
  WHERE m.team_id = p_team
    AND coalesce((t.settings->>'show_members')::boolean, true)
  ORDER BY m.role::text, p.username
  LIMIT 1000
$function$
;
commit;

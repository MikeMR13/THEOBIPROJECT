-- El Obi del Lector | Perfil público de equipos: visibilidad por lector.
-- CANDIDATO DE QA; nunca ejecutar sobre producción sin validar.
begin;
do $preflight$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='team_public_members'
      and pg_get_function_identity_arguments(p.oid)='p_team uuid'
      and pg_get_userbyid(p.proowner)='postgres'
      and p.prosecdef
      and position('p.delete_requested_at' in p.prosrc)=0
      and position('show_members' in p.prosrc)>0
  ) then
    raise exception 'team_public_members no coincide con definición original: detener';
  end if;
end
$preflight$;
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
    AND p.delete_requested_at IS NULL
    AND (
      p.id = (SELECT auth.uid())
      OR p.profile_visibility = 'all'
      OR (
        p.profile_visibility = 'auth'
        AND (SELECT auth.uid()) IS NOT NULL
        AND NOT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
      )
    )
  ORDER BY m.role::text, p.username
  LIMIT 1000
$function$
;
commit;

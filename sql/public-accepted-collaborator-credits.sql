-- Solo identidad pública y logos de equipos asociados a obras publicadas.
-- No expone la tabla collaborations ni las invitaciones pendientes, rechazadas o revocadas.
-- Requiere que el editor y la obra sean visibles públicamente.
CREATE OR REPLACE FUNCTION public.series_public_credits(p_series_ids uuid[])
RETURNS TABLE (
  series_id uuid, team_id uuid, name text, slug text, avatar_path text,
  status text, show_reader_logo boolean, is_primary boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH requested AS (
    SELECT DISTINCT ids.id
    FROM unnest(COALESCE(p_series_ids, ARRAY[]::uuid[])) AS ids(id)
    WHERE ids.id IS NOT NULL
    LIMIT 200
  ), available AS (
    SELECT s.id, s.team_id
    FROM public.series s
    JOIN requested r ON r.id = s.id
    WHERE s.published IS TRUE
      AND s.archived_at IS NULL
      AND s.translation_status NOT IN ('abandoned','withdrawn')
  ), credits AS (
    SELECT a.id AS series_id, a.team_id, TRUE AS is_primary
    FROM available a
    UNION ALL
    SELECT a.id, c.invited_team, FALSE
    FROM available a
    JOIN public.collaborations c ON c.series_id = a.id
    WHERE c.status = 'active'
      AND c.invited_team <> a.team_id
  )
  SELECT c.series_id, t.id, t.name, t.slug, t.avatar_path, t.status,
    COALESCE((t.settings->>'show_reader_logo')::boolean, TRUE), c.is_primary
  FROM credits c
  JOIN public.teams t ON t.id = c.team_id
  ORDER BY c.series_id, c.is_primary DESC, t.name
$function$;

REVOKE ALL ON FUNCTION public.series_public_credits(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.series_public_credits(uuid[]) TO anon, authenticated;

-- Comprobar: una obra no publicada no debe devolver ninguna fila.
-- La invitación pending de Saitou tampoco debe devolver crédito hasta que se acepte.

-- Listado inverso para la página pública del equipo colaborador.
-- Solo identificadores de obras publicadas con colaboración activa, nunca invitaciones.
CREATE OR REPLACE FUNCTION public.team_public_collaboration_series(p_team_id uuid)
RETURNS TABLE(series_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT DISTINCT s.id
  FROM public.collaborations c
  JOIN public.series s ON s.id = c.series_id
  WHERE c.invited_team = p_team_id
    AND c.status = 'active'
    AND s.team_id <> p_team_id
    AND s.published IS TRUE
    AND s.archived_at IS NULL
    AND s.translation_status NOT IN ('abandoned','withdrawn')
$function$;

REVOKE ALL ON FUNCTION public.team_public_collaboration_series(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_public_collaboration_series(uuid) TO anon, authenticated;

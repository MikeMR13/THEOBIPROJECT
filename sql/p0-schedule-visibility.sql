-- P0-1 | Candidato en repo: requiere migracion y prueba PostgreSQL aislada.
-- No se ejecuta automaticamente desde este archivo ni modifica produccion.
-- Basada en la politica existente "schedule read" (USING true),
-- la funcion private.prelaunch_public_series y los estados editoriales actuales.
-- Objetivo: no revelar etiquetas/fechas/IDs de programaciones privadas
-- a anonimos u otros equipos, preservando los tres preestrenos anunciados.
--
-- En una aplicacion futura crear migracion mediante supabase migration new
-- y realizar pruebas transaccionales con datos ficticios antes de aplicarla.
-- No modificar las funciones de publicacion, cron, lectores ni permisos de escritura.

BEGIN;

CREATE OR REPLACE FUNCTION private.schedule_public_visible(p_schedule_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.schedule sc
    JOIN public.series s ON s.id = sc.series_id
    JOIN public.teams t ON t.id = s.team_id
    WHERE sc.id = p_schedule_id
      AND s.archived_at IS NULL
      AND s.adult IS FALSE
      AND s.translation_status NOT IN ('abandoned', 'withdrawn')
      AND t.status = 'Activo'
      AND (
        (
          sc.kind::text = 'volume'
          AND EXISTS (
            SELECT 1
            FROM public.volumes v
            WHERE v.id = sc.volume_id
              AND v.series_id = s.id
              AND v.deleted_at IS NULL
              AND v.status = 'scheduled'
              AND v.announce_prelaunch IS TRUE
              AND v.access = 'public'
              AND v.published_at > now()
              AND v.published_at = sc.at
              AND private.prelaunch_public_series(s.id)
          )
        )
        OR
        (
          sc.kind::text = 'chapter'
          AND s.published IS TRUE
          AND EXISTS (
            SELECT 1
            FROM public.chapters c
            WHERE c.id = sc.chapter_id
              AND c.series_id = s.id
              AND c.deleted_at IS NULL
              AND c.status::text = 'scheduled'
              AND c.publish_at > now()
              AND c.publish_at = sc.at
          )
        )
      )
  );
$function$;

-- Solo quienes deban evaluar la politica SELECT ejecutan la funcion.
-- El esquema private NO debe estar expuesto por PostgREST.
REVOKE ALL ON FUNCTION private.schedule_public_visible(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.schedule_public_visible(bigint) TO anon, authenticated;

-- Conservar el nombre y el tipo de politica existente; esta operacion NO
-- elimina la politica "schedule write" de autores, editores y administradores.
ALTER POLICY "schedule read" ON public.schedule
TO anon, authenticated
USING (
  private.in_team(private.series_team(series_id))
  OR private.collab_team(series_id)
  OR private.is_admin()
  OR private.schedule_public_visible(id)
);

COMMIT;

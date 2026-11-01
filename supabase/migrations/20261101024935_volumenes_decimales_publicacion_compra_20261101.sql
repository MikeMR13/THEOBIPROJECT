-- Completar compatibilidad decimal en publicación y cola de compras.
-- Sin cambios en registros existentes, ni permisos de nuevas tablas, ni cron.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Este campo heredado era INTEGER; debe admitir el mismo 4.5 que volumes.num.
ALTER TABLE public.series
  ALTER COLUMN final_volume TYPE numeric(5,1)
  USING final_volume::numeric(5,1);

-- La cola del Bibliotecario retorna purchase_links.vol (ahora NUMERIC).
-- Su firma INTEGER anterior fallaría al consultar compras de cualquier novela.
DROP FUNCTION public.admin_purchase_queue();
CREATE FUNCTION public.admin_purchase_queue()
RETURNS TABLE (
  id bigint, series_title text, series_slug text, team_name text,
  vol numeric, store text, region text, fmt text, url text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF NOT private.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, s.title, s.slug, t.name, p.vol,
           p.store, p.region, p.fmt, p.url, p.created_at
    FROM public.purchase_links p
    JOIN public.series s ON s.id=p.series_id
    JOIN public.teams t ON t.id=s.team_id
    WHERE NOT p.verified
    ORDER BY p.created_at;
END
$function$;
REVOKE ALL ON FUNCTION public.admin_purchase_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_purchase_queue() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

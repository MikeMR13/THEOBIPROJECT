-- Volúmenes 4.5 y similares: un decimal, conservando IDs, permisos, datos y enlaces.
-- Una sola transacción: no dejar la API a medias si falla un cambio de tipo o una función.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Cambian sus tipos de salida; recrearlas dentro de la misma transacción.
DROP FUNCTION public.series_downloads(uuid);
DROP FUNCTION public.series_downloads_v2(uuid);
DROP FUNCTION public.renumber_volume(uuid, integer);

-- Estos triggers incluyen UPDATE OF num/vol en su definición; recrearlos con igual semántica.
DROP TRIGGER volumes_schedule ON public.volumes;
DROP TRIGGER chapters_fill_volume ON public.chapters;

ALTER TABLE public.volumes ALTER COLUMN num TYPE numeric(5,1) USING num::numeric(5,1);
ALTER TABLE public.chapters ALTER COLUMN vol TYPE numeric(5,1) USING vol::numeric(5,1);
ALTER TABLE public.download_links ALTER COLUMN vol TYPE numeric(5,1) USING vol::numeric(5,1);
ALTER TABLE public.purchase_links ALTER COLUMN vol TYPE numeric(5,1) USING vol::numeric(5,1);

CREATE TRIGGER volumes_schedule AFTER INSERT OR DELETE OR UPDATE OF status, published_at, deleted_at, num ON public.volumes FOR EACH ROW EXECUTE FUNCTION private.sync_schedule_volume();
CREATE TRIGGER chapters_fill_volume BEFORE INSERT OR UPDATE OF vol, volume_id ON public.chapters FOR EACH ROW EXECUTE FUNCTION private.chapter_fill_volume();

-- Seguir usando la misma RPC de Studio; los volúmenes existentes (1, 2...) no se alteran.
-- Solo permitir un decimal. Se mantiene el intercambio de números y la verificación de equipo.
CREATE FUNCTION public.renumber_volume(p_volume uuid, p_num numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_series uuid;
  v_team uuid;
  v_old numeric;
  o_id uuid;
  o_title text;
  t numeric;
  tmp numeric;
BEGIN
  SELECT vo.series_id, s.team_id, vo.num INTO v_series, v_team, v_old
  FROM public.volumes vo JOIN public.series s ON s.id = vo.series_id
  WHERE vo.id = p_volume FOR UPDATE OF vo;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING hint='No encontré el volumen'; END IF;
  IF NOT private.team_can(v_team,'edit') THEN
    RAISE EXCEPTION 'forbidden' USING hint='No tienes permiso para editar este volumen';
  END IF;
  IF p_num IS NULL OR p_num < 1 OR p_num > 999 OR p_num * 10 <> trunc(p_num * 10) THEN
    RAISE EXCEPTION 'bad_num' USING hint='Usa un número de 1 a 999, con hasta un decimal (ej. 4.5)';
  END IF;
  IF p_num = v_old THEN RETURN; END IF;

  SELECT id,title INTO o_id,o_title FROM public.volumes
  WHERE series_id = v_series AND num = p_num AND id <> p_volume
  LIMIT 1 FOR UPDATE;
  IF o_id IS NOT NULL THEN
    FOREACH t IN ARRAY ARRAY[0, -1, 999, 998, 997, 996, 995]::numeric[] LOOP
      IF NOT EXISTS(SELECT 1 FROM public.volumes WHERE series_id=v_series AND num=t) THEN
        BEGIN
          UPDATE public.volumes SET num=t WHERE id=o_id;
          tmp := t;
          EXIT;
        EXCEPTION WHEN check_violation THEN NULL;
        END;
      END IF;
    END LOOP;
    IF tmp IS NULL THEN RAISE EXCEPTION 'busy' USING hint='No pude liberar el número'; END IF;
  END IF;

  -- Vincular los enlaces heredados por ID antes de tocar sus números;
  -- así también se preservan en un intercambio 4.5 <-> 5.
  UPDATE public.download_links SET volume_id=p_volume
  WHERE series_id=v_series AND volume_id IS NULL AND vol=v_old;
  UPDATE public.purchase_links SET volume_id=p_volume
  WHERE series_id=v_series AND volume_id IS NULL AND vol=v_old;
  IF o_id IS NOT NULL THEN
    UPDATE public.download_links SET volume_id=o_id
    WHERE series_id=v_series AND volume_id IS NULL AND vol=p_num;
    UPDATE public.purchase_links SET volume_id=o_id
    WHERE series_id=v_series AND volume_id IS NULL AND vol=p_num;
  END IF;

  UPDATE public.volumes SET num=p_num,
    title=CASE WHEN title=v_old::text THEN p_num::text ELSE title END
    WHERE id=p_volume;
  UPDATE public.chapters SET vol=p_num WHERE volume_id=p_volume;
  UPDATE public.download_links SET vol=p_num WHERE volume_id=p_volume;
  UPDATE public.purchase_links SET vol=p_num WHERE volume_id=p_volume;

  IF o_id IS NOT NULL THEN
    UPDATE public.volumes SET num=v_old,
      title=CASE WHEN o_title=p_num::text THEN v_old::text ELSE o_title END
      WHERE id=o_id;
    UPDATE public.chapters SET vol=v_old WHERE volume_id=o_id;
    UPDATE public.download_links SET vol=v_old WHERE volume_id=o_id;
    UPDATE public.purchase_links SET vol=v_old WHERE volume_id=o_id;
  END IF;
END
$function$;
REVOKE ALL ON FUNCTION public.renumber_volume(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renumber_volume(uuid,numeric) TO authenticated, service_role;

CREATE FUNCTION public.series_downloads(p_series uuid)
RETURNS TABLE(id bigint, volume_id uuid, vol numeric, fmt text, provider text, label text,
              donor_only boolean, locked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT d.id,d.volume_id,d.vol,d.fmt,d.provider,d.label,
         false,
         d.patreon_only AND NOT (private.in_team(s.team_id) OR private.is_team_patron(s.team_id))
  FROM public.download_links d
  JOIN public.series s ON s.id=d.series_id
  WHERE d.series_id=p_series AND s.archived_at IS NULL
    AND (private.in_team(s.team_id) OR (
      coalesce(s.published,false) AND EXISTS(
        SELECT 1 FROM public.volumes v
        WHERE v.series_id=d.series_id
          AND (v.id=d.volume_id OR (d.volume_id IS NULL AND v.num=d.vol))
          AND v.deleted_at IS NULL AND v.status='published'
          AND (v.published_at IS NULL OR v.published_at<=now())
      )
    ))
  ORDER BY d.vol,d.sort,d.id
$function$;
REVOKE ALL ON FUNCTION public.series_downloads(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.series_downloads(uuid) TO anon, authenticated, service_role;

CREATE FUNCTION public.series_downloads_v2(p_series uuid)
RETURNS TABLE(id bigint, volume_id uuid, vol numeric, fmt text, provider text, label text,
              donor_only boolean, patreon_only boolean, locked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT d.id,d.volume_id,d.vol,d.fmt,d.provider,d.label,
         false,d.patreon_only,
         d.patreon_only AND NOT (private.in_team(s.team_id) OR private.is_team_patron(s.team_id))
  FROM public.download_links d
  JOIN public.series s ON s.id=d.series_id
  WHERE d.series_id=p_series AND s.archived_at IS NULL
    AND (private.in_team(s.team_id) OR (
      coalesce(s.published,false) AND EXISTS(
        SELECT 1 FROM public.volumes v
        WHERE v.series_id=d.series_id
          AND (v.id=d.volume_id OR (d.volume_id IS NULL AND v.num=d.vol))
          AND v.deleted_at IS NULL AND v.status='published'
          AND (v.published_at IS NULL OR v.published_at<=now())
      )
    ))
  ORDER BY d.vol,d.sort,d.id
$function$;
REVOKE ALL ON FUNCTION public.series_downloads_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.series_downloads_v2(uuid) TO anon, authenticated, service_role;

-- Actualizar la caché de esquemas de PostgREST tras cambiar firmas RPC.
NOTIFY pgrst, 'reload schema';
COMMIT;

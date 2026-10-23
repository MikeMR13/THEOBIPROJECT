-- Evitar ambigüedad entre "v" (registro PL/pgSQL) y "v" (alias de la tabla).
-- Conserva firmas, privilegios, lógica de publicación y notificaciones existentes.
-- El cron instalado continuará ejecutando la función corregida cada minuto.
CREATE OR REPLACE FUNCTION private.run_publications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v record;
begin
  for v in
    update public.volumes
      set status = 'published'
      where status = 'scheduled'
        and published_at <= now() and deleted_at is null
      returning id, series_id, num
  loop
    update public.chapters
      set status = 'published', publish_at = coalesce(publish_at, now())
      where volume_id = v.id and status = 'draft' and deleted_at is null;
  end loop;

  update public.chapters c
    set status = 'published'
    where c.status = 'scheduled'
      and c.publish_at <= now() and c.deleted_at is null
      and (
        c.volume_id is null
        or exists (
          select 1 from public.volumes ready_volume
          where ready_volume.id = c.volume_id
            and ready_volume.status = 'published'
            and ready_volume.deleted_at is null
        )
      );

  for v in
    select vo.id, vo.series_id, vo.num, s.title, s.slug
    from public.volumes vo
    join public.series s on s.id = vo.series_id
    where vo.status = 'published' and vo.announced_at is null
    for update of vo skip locked
  loop
    insert into public.notifications(user_id, kind, body, link)
      select f.user_id, 'Volumen',
        v.title || ' · Volumen ' || v.num || ' ya está disponible',
        jsonb_build_object('slug', v.slug, 'vol', v.num)
      from public.follows f
      where f.series_id = v.series_id
        and coalesce((f.channels->>'volumes')::boolean, true);
    update public.volumes set announced_at = now() where id = v.id;
  end loop;
end
$function$;

-- Estrenos programados: Inicio se actualiza en el mismo minuto del lanzamiento.
-- Problema: obi-home-snapshot (*/5) y obi_publication_runner (* * * * *) arrancan
-- en el mismo segundo; los estrenos suelen programarse a :00/:30, así que la foto
-- de Inicio se construía ANTES de que el runner publicara y la obra/volumen nuevo
-- no aparecía hasta 5 minutos después (verificado el 2026-11-22 a las 18:30 UTC).
-- Solución: si el runner publicó algo, reconstruir la foto en la misma transacción.
-- Sin costo adicional: una ejecución de build_home solo en los minutos con estreno.
create or replace function private.run_publications()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v record; changed int := 0; n int;
begin
  for v in
    update public.volumes
      set status = 'published'
      where status = 'scheduled'
        and published_at <= now() and deleted_at is null
      returning id, series_id, num
  loop
    changed := changed + 1;
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
  get diagnostics n = row_count;
  changed := changed + n;

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

  if changed > 0 then
    -- Nunca bloquear un estreno por un fallo de la foto de Inicio.
    begin
      perform private.refresh_home();
    exception when others then
      raise warning 'refresh_home tras estreno: %', sqlerrm;
    end;
  end if;
end
$function$;

-- Transición editorial de una novela completa. NO ejecutar en producción sin validación.
-- La RPC es transaccional: permisos, cambios y cron son consistentes al confirmar.
create or replace function public.series_publication_transition(
  p_series uuid, p_mode text, p_volume uuid default null, p_at timestamptz default null
)
returns text
language plpgsql security definer set search_path = ''
as $function$
declare
  s record;
  v public.volumes%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_mode is null or p_mode not in ('draft','prelaunch','published') then
    raise exception 'invalid_publication_mode';
  end if;
  select id, team_id, published into s
    from public.series where id = p_series and archived_at is null for update;
  if not found then raise exception 'series_not_found'; end if;
  if not private.team_can(s.team_id, 'publish') then
    raise exception 'forbidden_publish';
  end if;

  if p_mode = 'prelaunch' then
    if not private.team_can(s.team_id, 'schedule') then
      raise exception 'forbidden_schedule';
    end if;
    if p_at is null or p_at <= now() then
      raise exception 'future_date_required';
    end if;
  elsif p_at is not null then
    raise exception 'date_only_for_prelaunch';
  end if;

  if p_mode <> 'draft' then
    select * into v from public.volumes
      where id = p_volume and series_id = p_series and deleted_at is null
      for update;
    if not found then raise exception 'volume_not_in_series'; end if;
    if v.status = 'hidden' then raise exception 'hidden_volume'; end if;
  end if;

  if p_mode in ('draft','prelaunch') then
    -- Bloquear primero la lectura pública de toda la novela.
    update public.series set published = false where id = p_series;
    -- Los volúmenes ocultos no se alteran. Las fechas históricas
    -- de los publicados se conservan; las programadas se cancelan.
    update public.volumes
      set status = case when status in ('published','scheduled') then 'draft' else status end,
          published_at = case when status = 'scheduled' then null else published_at end,
          announce_prelaunch = false
      where series_id = p_series and deleted_at is null
        and (status in ('published','scheduled') or announce_prelaunch is true);

    -- El cron heredado publica capítulos programados sin volumen. Esos
    -- capítulos podrían disparar series_autopublish antes del estreno.
    update public.chapters
      set status = 'draft', publish_at = null
      where series_id = p_series and deleted_at is null
        and volume_id is null and status::text = 'scheduled';

    if p_mode = 'prelaunch' then
      -- El runner existente promueve el volumen a published;
      -- volumes_promote_prelaunch promociona entonces la novela.
      update public.volumes
        set status = 'scheduled', published_at = p_at,
            announce_prelaunch = true, announced_at = null
        where id = v.id;
    end if;
  else
    -- Al publicar manualmente un preestreno, los demás volúmenes
    -- programados de una novela privada dejan de estar programados.
    if not coalesce(s.published, false) then
      update public.volumes
        set status = 'draft', published_at = null,
            announce_prelaunch = false
        where series_id = p_series and id <> v.id and deleted_at is null
          and status = 'scheduled';
    end if;
    -- Publicación estándar con permisos, revisiones y notificaciones.
    if v.status <> 'published' then
      perform public.publish_volume(v.id);
    end if;
    update public.series set published = true where id = p_series;
  end if;
  return p_mode;
end;
$function$;

revoke execute on function public.series_publication_transition(uuid,text,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.series_publication_transition(uuid,text,uuid,timestamptz)
  to authenticated;

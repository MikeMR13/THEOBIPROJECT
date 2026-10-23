-- Modo preestreno (propuesta para la rama de validación).
-- NO ejecutar en producción sin revisión y pruebas de RLS.
-- Opt-in por volumen. No altera el valor published de la serie antes del estreno.
alter table public.volumes
  add column if not exists announce_prelaunch boolean not null default false;

comment on column public.volumes.announce_prelaunch is
  'Permite anunciar un volumen programado y mostrar una ficha pública limitada, sin exponer capítulos.';

-- Lectura anónima, deliberadamente limitada a campos editoriales aprobados.
-- SECURITY DEFINER necesario para consultar una serie aún privada, pero no retorna filas de chapters.
create or replace function public.prelaunch_series(p_slug text)
returns jsonb language sql stable security definer set search_path = ''
as $pre$
  select pg_catalog.jsonb_build_object(
    'series', pg_catalog.jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'title', s.title, 'short', s.short,
      'synopsis', s.synopsis, 'work_type', s.work_type,
      'author', s.author, 'illustrator', s.illustrator,
      'genres', s.genres, 'adult', s.adult,
      'cover_path', s.cover_path, 'cover_thumb_path', s.cover_thumb_path,
      'team_name', t.name, 'team_slug', t.slug
    ),
    'volumes', (
      select pg_catalog.coalesce(
        pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'id', v.id, 'num', v.num, 'title', v.title,
          'cover_path', v.cover_path, 'synopsis', v.synopsis,
          'published_at', v.published_at
        ) order by v.num), '[]'::jsonb)
      from public.volumes v
      where v.series_id = s.id and v.deleted_at is null
        and v.status = 'scheduled' and v.published_at > now()
        and v.announce_prelaunch is true
    )
  )
  from public.series s
  join public.teams t on t.id = s.team_id
  where s.slug = p_slug and s.archived_at is null
    and exists (
      select 1 from public.volumes v
      where v.series_id = s.id and v.deleted_at is null
        and v.status = 'scheduled' and v.published_at > now()
        and v.announce_prelaunch is true
    )
  limit 1;
$pre$;
revoke execute on function public.prelaunch_series(text) from public, anon, authenticated;
grant execute on function public.prelaunch_series(text) to anon, authenticated;

-- Feed del calendario: solo el volumen anunciado, sin metadatos de capítulos.
create or replace function public.prelaunch_calendar(
  p_from timestamptz, p_to timestamptz
)
returns table (
  kind text, at timestamptz, series_id uuid, volume_id uuid,
  vnum numeric, vcover text, label text, acc text, can_read boolean,
  slug text, title text, short text, cover_path text,
  cover_thumb_path text, work_type text, team_name text, team_slug text
)
language sql stable security definer set search_path = ''
as $pre$
  select 'volp'::text, v.published_at, s.id, v.id,
    v.num::numeric, v.cover_path::text, v.title::text,
    'public'::text, false,
    s.slug::text, s.title::text, s.short::text,
    s.cover_path::text, s.cover_thumb_path::text,
    s.work_type::text, t.name::text, t.slug::text
  from public.volumes v
  join public.series s on s.id = v.series_id
  join public.teams t on t.id = s.team_id
  where v.announce_prelaunch is true
    and v.status = 'scheduled' and v.deleted_at is null
    and s.archived_at is null and v.published_at > now()
    and v.published_at between p_from and p_to
  order by v.published_at
  limit 1000;
$pre$;
revoke execute on function public.prelaunch_calendar(timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.prelaunch_calendar(timestamptz,timestamptz) to anon, authenticated;

-- Programación atómica (status, fecha y consentimiento de anuncio).
-- Conserva las verificaciones y efectos de publish_volume.
create or replace function public.schedule_prelaunch_volume(
  p_volume uuid, p_at timestamptz, p_announce boolean default false
)
returns text language plpgsql security definer set search_path = ''
as $pre$
declare t uuid;
begin
  if p_at is null or p_at <= now() then
    raise exception 'future_date_required';
  end if;
  select s.team_id into t
  from public.volumes v
  join public.series s on s.id = v.series_id
  where v.id = p_volume and v.deleted_at is null;
  if t is null then raise exception 'not_found'; end if;
  if not private.team_can(t, 'schedule') then raise exception 'forbidden_schedule'; end if;
  perform public.publish_volume(p_volume, p_at);
  update public.volumes
    set announce_prelaunch = pg_catalog.coalesce(p_announce, false)
    where id = p_volume;
  return 'scheduled';
end;
$pre$;
revoke execute on function public.schedule_prelaunch_volume(uuid,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.schedule_prelaunch_volume(uuid,timestamptz,boolean) to authenticated;

-- Cuando el runner EXISTENTE cambia de scheduled a published, la serie nueva sale del preestreno.
-- Nunca se marca como publicada antes de la fecha; el lector sigue protegido por RLS.
create or replace function private.promote_prelaunch_series()
returns trigger language plpgsql security definer set search_path = ''
as $pre$
begin
  if old.status = 'scheduled' and new.status = 'published'
    and old.announce_prelaunch is true and new.deleted_at is null then
    update public.series set published = true
    where id = new.series_id and published is distinct from true
      and archived_at is null;
  end if;
  return new;
end;
$pre$;
drop trigger if exists volumes_promote_prelaunch on public.volumes;
create trigger volumes_promote_prelaunch
after update of status on public.volumes
for each row execute function private.promote_prelaunch_series();

-- Validación posterior (en entorno de pruebas):
-- select * from public.prelaunch_calendar(now(), now()+interval '60 days');
-- select public.prelaunch_series('<slug-anunciado>');
-- SET LOCAL ROLE anon: inspeccionar RPC públicos / imposibilidad de SELECT de chapters.

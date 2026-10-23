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
      select coalesce(
        pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'id', v.id, 'num', v.num, 'title', v.title,
          'cover_path', v.cover_path,
          'synopsis', case when coalesce(v.synopsis_spoiler,false) then null else v.synopsis end,
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
  cover_thumb_path text, work_type text, adult boolean, genres text[], team_name text, team_slug text
)
language sql stable security definer set search_path = ''
as $pre$
  select 'volp'::text, v.published_at, s.id, v.id,
    v.num::numeric, v.cover_path::text, v.title::text,
    'public'::text, false,
    s.slug::text, s.title::text, s.short::text,
    s.cover_path::text, s.cover_thumb_path::text,
    s.work_type::text, s.adult, s.genres, t.name::text, t.slug::text
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
    set announce_prelaunch = coalesce(p_announce, false)
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


-- Mantener recordatorios coherentes tras reprogramar, cancelar o adelantar el estreno.
create or replace function private.sync_prelaunch_reminders()
returns trigger language plpgsql security definer set search_path = ''
as $pre$
declare next_at timestamptz;
begin
  if old.status <> 'scheduled' or old.announce_prelaunch is not true
    or old.published_at is null then return new; end if;
  if new.deleted_at is not null or (new.status not in ('scheduled','published'))
    or (new.status = 'scheduled' and new.announce_prelaunch is not true) then
    delete from public.reminders r where r.series_id = old.series_id
      and r.kind = 'volp' and r.at = old.published_at and r.sent_at is null;
    return new;
  end if;
  next_at := case when new.status = 'published' then now() else new.published_at end;
  if next_at is distinct from old.published_at then
    -- Evitar conflicto de UNIQUE(user_id,series_id,kind,at) si ya existe el nuevo horario.
    delete from public.reminders r where r.series_id = old.series_id
      and r.kind = 'volp' and r.at = old.published_at and r.sent_at is null
      and exists (select 1 from public.reminders d
        where d.user_id = r.user_id and d.series_id = r.series_id
          and d.kind = r.kind and d.at = next_at);
    update public.reminders r set at = next_at
      where r.series_id = old.series_id and r.kind = 'volp'
        and r.at = old.published_at and r.sent_at is null;
  end if;
  return new;
end;
$pre$;
drop trigger if exists volumes_sync_prelaunch_reminders on public.volumes;
create trigger volumes_sync_prelaunch_reminders
after update of status, published_at, announce_prelaunch, deleted_at
on public.volumes for each row
execute function private.sync_prelaunch_reminders();

-- Respetar el consentimiento también en la RPC heredada (no solo en la UI).
CREATE OR REPLACE FUNCTION public.agenda_events(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(kind text, at timestamp with time zone, series_id uuid, chapter_id uuid, num numeric, vnum numeric, volume_id uuid, vcover text, acc text, min_price numeric, tier_name text, open_at timestamp with time zone, early_at timestamp with time zone, can_read boolean, label text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with base as (
    select c.id, c.num::numeric num, c.series_id, s.team_id, c.volume_id, v.num::numeric vnum, v.cover_path::text vcover, c.publish_at, c.status::text st,
      x.acc, x.mp, g.gated, g.open_at,
      private.viewer_in_team(s.team_id) or private.chapter_row_open(c.series_id, c.volume_id, c.access, c.access_min_price, c.access_until) can_read
    from public.chapters c
    join public.series s on s.id = c.series_id
    left join public.volumes v on v.id = c.volume_id and v.deleted_at is null
    cross join lateral private.chapter_gate(c.id) g
    cross join lateral (
      select case when bool_or(l.a = 'tier') then 'tier' when bool_or(l.a = 'donors') then 'donors' else 'public' end acc,
        max(l.m) filter (where l.a = 'tier') mp
      from (values (s.access, s.access_min_price, s.access_until), (v.access, v.access_min_price, v.access_until), (c.access, c.access_min_price, c.access_until)) l(a, m, u)
      where l.a is not null and l.a <> 'public' and (l.u is null or l.u > now())) x
    where coalesce(s.published, false) and c.deleted_at is null and c.status::text in ('published', 'scheduled')
      and ((c.publish_at between p_from and p_to) or (g.gated and g.open_at between p_from and p_to))),
  tiered as (
    select b.*, (select t.name::text from public.patreon_tiers t where t.team_id = b.team_id and t.price_usd >= b.mp order by t.price_usd limit 1) tier
    from base b)
  select 'pub', publish_at, series_id, id, num, vnum, volume_id, vcover, acc, mp, tier, open_at, null::timestamptz, can_read, null::text
    from tiered where st = 'published' and publish_at between p_from and least(p_to, now())
  union all
  select 'prog', publish_at, series_id, id, num, vnum, volume_id, vcover, acc, mp, tier, open_at, null, can_read, null
    from tiered where publish_at > now() and publish_at between p_from and p_to
  union all
  select 'open', open_at, series_id, id, num, vnum, volume_id, vcover, 'public', null, null, open_at, publish_at, true, null
    from tiered where gated and open_at between p_from and p_to and (publish_at is null or open_at > publish_at)
  union all
  select 'vol', v.published_at, v.series_id, null, null, v.num::numeric, v.id, v.cover_path::text, 'public', null, null, null, null, true, v.title::text
    from public.volumes v join public.series s on s.id = v.series_id
    where coalesce(s.published, false) and v.deleted_at is null and v.status::text = 'published' and v.published_at between p_from and least(p_to, now())
  union all
  select 'volp', sc.at, sc.series_id, null, null, null, null, null, 'public', null, null, null, null, true, sc.label::text
    from public.schedule sc join public.series s on s.id = sc.series_id
    where coalesce(s.published, false) and sc.kind::text = 'volume' and sc.at > now() and sc.at between p_from and p_to
      and exists (select 1 from public.volumes announced where announced.id = sc.volume_id
        and announced.status = 'scheduled' and announced.deleted_at is null
        and announced.announce_prelaunch is true)
  order by 2
  limit 4000
$function$
;

-- Validación posterior (en entorno de pruebas):
-- select * from public.prelaunch_calendar(now(), now()+interval '60 days');
-- select public.prelaunch_series('<slug-anunciado>');
-- SET LOCAL ROLE anon: inspeccionar RPC públicos / imposibilidad de SELECT de chapters.

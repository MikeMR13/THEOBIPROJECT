-- Fase 0: seguridad de anuncios públicos y permisos de programación.
-- Solo datos públicos autorizados; nunca se muestran contenidos adultos en la vista anónima.
-- Mantener RPCs y esquema para clientes existentes.

create or replace function private.prelaunch_public_series(p_series uuid)
returns boolean
language sql stable
set search_path = ''
as $body$
  select exists(
    select 1 from public.series s
    join public.teams t on t.id = s.team_id
    where s.id = p_series
      and s.archived_at is null
      and s.access = 'public'
      and s.adult is false
      and s.translation_status not in ('abandoned','withdrawn')
      and t.status = 'Activo'
  );
$body$;
revoke all on function private.prelaunch_public_series(uuid) from public, anon, authenticated;

create or replace function public.prelaunch_series(p_slug text)
returns jsonb
language sql stable security definer
set search_path = ''
as $body$
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
        and v.access = 'public'
        and v.status = 'scheduled' and v.published_at > now()
        and v.announce_prelaunch is true
    )
  )
  from public.series s
  join public.teams t on t.id = s.team_id
  where s.slug = p_slug
    and private.prelaunch_public_series(s.id)
    and exists (
      select 1 from public.volumes v
      where v.series_id = s.id and v.deleted_at is null
        and v.access = 'public'
        and v.status = 'scheduled' and v.published_at > now()
        and v.announce_prelaunch is true
    )
  limit 1;
$body$;

create or replace function public.prelaunch_calendar(
  p_from timestamptz, p_to timestamptz
)
returns table (
  kind text, at timestamptz, series_id uuid, volume_id uuid,
  vnum numeric, vcover text, label text, acc text, can_read boolean,
  slug text, title text, short text, cover_path text,
  cover_thumb_path text, work_type text, adult boolean,
  genres text[], team_name text, team_slug text
)
language sql stable security definer
set search_path = ''
as $body$
  select 'volp'::text, v.published_at, s.id, v.id,
    v.num::numeric, v.cover_path::text, v.title::text,
    'public'::text, false, s.slug::text, s.title::text,
    s.short::text, s.cover_path::text, s.cover_thumb_path::text,
    s.work_type::text, s.adult, s.genres, t.name::text, t.slug::text
  from public.volumes v
  join public.series s on s.id = v.series_id
  join public.teams t on t.id = s.team_id
  where v.announce_prelaunch is true
    and v.status = 'scheduled' and v.deleted_at is null
    and v.access = 'public'
    and private.prelaunch_public_series(s.id)
    and v.published_at > now()
    and v.published_at between p_from and p_to
  order by v.published_at
  limit 1000;
$body$;

create or replace function public.public_prelaunch_social(p_slug text)
returns jsonb
language sql stable security definer
set search_path = ''
as $body$
  select pg_catalog.jsonb_build_object(
    'id', s.id, 'team_id', s.team_id, 'slug', s.slug,
    'title', s.title, 'synopsis', s.synopsis,
    'cover_path', s.cover_path, 'cover_thumb_path', s.cover_thumb_path,
    'author', s.author, 'genres', s.genres,
    'seo', coalesce(s.theme -> 'seo', '{}'::jsonb),
    'team_name', t.name
  )
  from public.series s
  join public.teams t on t.id = s.team_id
  where s.slug = p_slug
    and s.published is false
    and private.prelaunch_public_series(s.id)
    and exists (
      select 1 from public.volumes v
      where v.series_id = s.id and v.deleted_at is null
        and v.access = 'public'
        and v.status = 'scheduled' and v.announce_prelaunch is true
        and v.published_at > now()
    )
  limit 1;
$body$;

-- Cancelar un volumen programado requiere Publicar o Programar, no solo Editar.
create or replace function public.unschedule_volume(p_volume uuid)
returns text
language plpgsql security definer
set search_path = ''
as $body$
declare v public.volumes%rowtype; t uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_volume is null then raise exception 'volume_not_found'; end if;
  select * into v from public.volumes
  where id=p_volume and deleted_at is null for update;
  if not found then raise exception 'volume_not_found'; end if;
  select s.team_id into t from public.series s
  where s.id=v.series_id and s.archived_at is null;
  if t is null then raise exception 'series_not_found'; end if;
  if not (private.team_can(t,'publish') or private.team_can(t,'schedule')) then
    raise exception 'forbidden_unschedule' using errcode='42501';
  end if;
  if v.status <> 'scheduled' then raise exception 'volume_not_scheduled'; end if;
  update public.volumes
     set status='draft', published_at=null, announce_prelaunch=false
   where id=p_volume;
  -- Los disparadores existentes sincronizan calendario y recordatorios.
  -- No modificar las fechas individuales de los capítulos.
  return 'draft';
end;
$body$;
revoke all on function public.unschedule_volume(uuid) from public, anon;
grant execute on function public.unschedule_volume(uuid) to authenticated, service_role;

-- El UPDATE directo autorizado por "edit" nunca puede programar,
-- cancelar ni alterar una fecha de anuncio sin permisos editoriales.
create or replace function private.guard_publish()
returns trigger
language plpgsql security definer
set search_path = ''
as $body$
declare t uuid := private.series_team(new.series_id);
begin
  if auth.uid() is null then return new; end if; -- procesos de servicio
  if new.status is distinct from old.status then
    if new.status = 'published' and not private.team_can(t,'publish') then
      raise exception 'forbidden_publish' using errcode='42501';
    end if;
    if new.status = 'scheduled' and not private.team_can(t,'schedule') then
      raise exception 'forbidden_schedule' using errcode='42501';
    end if;
    if old.status = 'published' and not private.team_can(t,'publish') then
      raise exception 'forbidden_unpublish' using errcode='42501';
    end if;
    if old.status = 'scheduled' and not (
      private.team_can(t,'publish') or private.team_can(t,'schedule')
    ) then
      raise exception 'forbidden_unschedule' using errcode='42501';
    end if;
  end if;
  if old.status = 'scheduled' and new.status = 'scheduled'
    and (new.published_at is distinct from old.published_at
      or new.announce_prelaunch is distinct from old.announce_prelaunch)
    and not private.team_can(t,'schedule') then
    raise exception 'forbidden_reschedule' using errcode='42501';
  end if;
  return new;
end;
$body$;

drop trigger if exists volumes_guard_publish on public.volumes;
create trigger volumes_guard_publish
before update of status, published_at, announce_prelaunch on public.volumes
for each row execute function private.guard_publish();

-- El resto de funciones públicas mantienen sus privilegios originales.
revoke all on function public.prelaunch_series(text) from public;
revoke all on function public.prelaunch_calendar(timestamptz,timestamptz) from public;
revoke all on function public.public_prelaunch_social(text) from public;
grant execute on function public.prelaunch_series(text) to anon,authenticated,service_role;
grant execute on function public.prelaunch_calendar(timestamptz,timestamptz) to anon,authenticated,service_role;
grant execute on function public.public_prelaunch_social(text) to anon,authenticated,service_role;

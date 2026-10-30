-- Aperturas agregadas del primer vistazo, sin perfiles, IP, cookies ni identificadores de sesión.
-- Solo contadores por obra/día en esquema privado. Datos hasta 90 días.
-- Máximos estrictos: 60 aperturas/minuto y 2 500/día en total; 500 por obra/día.
-- Reutiliza el cron de mantenimiento de métricas ya existente. Sin cron nuevo.

create table if not exists private.prelaunch_view_daily (
  day date not null,
  series_id uuid not null references public.series(id) on delete cascade,
  opens integer not null default 0 check (opens between 0 and 500),
  primary key (day, series_id)
);
create table if not exists private.prelaunch_view_limits (
  period text not null check (period in ('minute', 'day')),
  bucket timestamptz not null,
  accepted integer not null default 0 check (accepted >= 0),
  primary key (period, bucket)
);
revoke all on table private.prelaunch_view_daily from public, anon, authenticated;
revoke all on table private.prelaunch_view_limits from public, anon, authenticated;

-- La RPC jamás recibe IP, user_id, session_id, fecha ni contador arbitrario.
-- La obra debe tener un anuncio opt-in públicamente permitido, aún no publicado.
create or replace function public.prelaunch_view_record(p_slug text)
returns boolean language plpgsql security definer
set search_path = ''
as $body$
declare
  v_series uuid;
  v_now timestamptz := clock_timestamp();
  v_day date := (clock_timestamp() at time zone 'America/Monterrey')::date;
  v_minute timestamptz;
  v_bucket timestamptz;
  v_admitted integer;
begin
  if p_slug is null or length(p_slug) > 100 or p_slug !~ '^[A-Za-z0-9_-]+$' then
    return false;
  end if;
  select s.id into v_series
    from public.series s
    where s.slug = p_slug
      and s.published is false
      and private.prelaunch_public_series(s.id)
      and exists (
        select 1 from public.volumes v
        where v.series_id = s.id and v.deleted_at is null
          and v.status = 'scheduled' and v.announce_prelaunch is true
          and v.access = 'public' and v.published_at > v_now
      )
    limit 1;
  if v_series is null then return false; end if;
  v_minute := date_trunc('minute', v_now);
  v_bucket := date_trunc('day', v_now at time zone 'America/Monterrey')
             at time zone 'America/Monterrey';
  insert into private.prelaunch_view_limits as lim(period,bucket,accepted)
    values ('minute',v_minute,1)
    on conflict(period,bucket) do update set accepted=lim.accepted+1
      where lim.accepted < 60
    returning accepted into v_admitted;
  if v_admitted is null then return false; end if;
  v_admitted := null;
  insert into private.prelaunch_view_limits as lim(period,bucket,accepted)
    values ('day',v_bucket,1)
    on conflict(period,bucket) do update set accepted=lim.accepted+1
      where lim.accepted < 2500
    returning accepted into v_admitted;
  if v_admitted is null then return false; end if;
  v_admitted := null;
  insert into private.prelaunch_view_daily as v(day,series_id,opens)
    values (v_day,v_series,1)
    on conflict(day,series_id) do update set opens=v.opens+1
      where v.opens < 500
    returning opens into v_admitted;
  return v_admitted is not null;
end;
$body$;
revoke all on function public.prelaunch_view_record(text) from public, anon, authenticated;
grant execute on function public.prelaunch_view_record(text) to anon, authenticated;

-- Lectura exclusivamente agregada para un miembro autorizado del equipo.
create or replace function public.prelaunch_team_view_metrics(p_team uuid)
returns table(series_id uuid, view_opens_30d bigint)
language plpgsql stable security definer
set search_path = ''
as $body$
begin
  if auth.uid() is null or p_team is null or not private.team_can(p_team, 'view') then
    raise exception 'forbidden_prelaunch_view_metrics' using errcode='42501';
  end if;
  return query
    with announced as (
      select distinct s.id
      from public.series s join public.volumes v on v.series_id = s.id
      where s.team_id = p_team and private.prelaunch_public_series(s.id)
        and v.announce_prelaunch is true and v.status='scheduled'
        and v.deleted_at is null and v.access='public'
        and v.published_at > now()
    )
    select a.id, coalesce(sum(d.opens),0)::bigint
    from announced a
    left join private.prelaunch_view_daily d on d.series_id = a.id
      and d.day >= (now() at time zone 'America/Monterrey')::date - 29
    group by a.id order by a.id;
end;
$body$;
revoke all on function public.prelaunch_team_view_metrics(uuid) from public, anon, authenticated;
grant execute on function public.prelaunch_team_view_metrics(uuid) to authenticated;

-- Reutiliza la tarea ya programada 'obi-carousel-metrics-retention'.
create or replace function private.prune_carousel_metrics()
returns void language plpgsql set search_path = ''
as $body$
begin
  delete from private.carousel_metrics_daily
    where day < (now() at time zone 'America/Monterrey')::date - 89;
  delete from private.carousel_metric_limits
    where (period='minute' and bucket < clock_timestamp()-interval '48 hours')
       or (period='day' and bucket < clock_timestamp()-interval '48 hours');
  delete from private.prelaunch_view_daily
    where day < (now() at time zone 'America/Monterrey')::date - 89;
  delete from private.prelaunch_view_limits
    where bucket < clock_timestamp()-interval '48 hours';
end;
$body$;

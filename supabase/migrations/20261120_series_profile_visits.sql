-- Ranking independiente de visitas reales a fichas /serie/, sin modificar lecturas.
-- La migración queda en GitHub; no ejecuta cambios sobre producción por sí sola.
create table if not exists public.series_profile_daily (
  series_id uuid not null references public.series(id) on delete cascade,
  day date not null,
  n integer not null default 0 check (n >= 0),
  primary key (series_id, day)
);
alter table public.series_profile_daily enable row level security;
revoke all on public.series_profile_daily from public, anon, authenticated;
comment on table public.series_profile_daily is
  'Visitas diarias a fichas; no son lecturas de capítulos ni visitantes entre obras';

create table if not exists private.series_profile_seen (
  series_id uuid not null references public.series(id) on delete cascade,
  day date not null,
  viewer_hash text not null,
  primary key (series_id, day, viewer_hash)
);
create index if not exists series_profile_seen_day_idx
  on private.series_profile_seen (day);
revoke all on private.series_profile_seen from public, anon, authenticated;

-- Cuenta como máximo una visita por obra y día por cuenta o token anónimo.
-- Nunca guarda un usuario, IP o identificador de dispositivo en claro.
create or replace function public.track_series_profile_visit(
  p_series uuid, p_device uuid default null
) returns boolean language plpgsql security definer
set search_path = ''
as $$
declare
  v_viewer text;
  v_fresh integer;
begin
  if p_series is null or not exists (
    select 1 from public.series s
    where s.id = p_series and s.published = true and s.archived_at is null
      and s.translation_status::text not in ('abandoned','withdrawn')
      and (not coalesce(s.adult,false)
        or coalesce((select pr.adult_ok from public.profiles pr where pr.id = (select auth.uid())),false))
  ) then return false; end if;

  v_viewer := case
    when (select auth.uid()) is not null then 'u:' || (select auth.uid())::text
    when p_device is not null then 'd:' || p_device::text
    else null
  end;
  if v_viewer is null then return false; end if;

  insert into private.series_profile_seen (series_id,day,viewer_hash)
  values (p_series,current_date,md5(p_series::text || ':' || current_date::text || ':' || v_viewer))
  on conflict do nothing;
  get diagnostics v_fresh = row_count;
  if v_fresh = 0 then return false; end if;

  insert into public.series_profile_daily (series_id,day,n)
  values (p_series,current_date,1)
  on conflict (series_id,day)
    do update set n = public.series_profile_daily.n + 1;

  -- Limpieza amortizada, sin añadir cron ni servicios de pago.
  if random() < 0.01 then
    delete from private.series_profile_seen where day < current_date - 2;
  end if;
  return true;
end;
$$;
revoke all on function public.track_series_profile_visit(uuid,uuid) from public,anon,authenticated;
grant execute on function public.track_series_profile_visit(uuid,uuid) to anon,authenticated;

-- Clasificación consultada a demanda; NO escribe en rankings, series.views,
-- series_daily, chapter_views ni read_chapters.
create or replace function public.series_profile_ranking(
  p_period text default 'semana',
  p_genre text default null,
  p_status text default null,
  p_limit integer default 20
) returns table (
  series_id uuid, pos integer, gpos integer, prev_pos integer,
  score numeric, votes integer, computed_at timestamptz
) language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_days integer;
begin
  if p_period not in ('hoy','semana','mes','anio','historico') then
    return;
  end if;
  v_days := case p_period
    when 'hoy' then 1 when 'semana' then 7 when 'mes' then 30
    when 'anio' then 365 else null end;
  return query
  with counts as (
    select d.series_id, sum(d.n)::numeric as score
    from public.series_profile_daily d
    where v_days is null or d.day > current_date - v_days
    group by d.series_id
  ), eligible as (
    select s.id, s.genres, s.translation_status::text as st, c.score
    from counts c join public.series s on s.id = c.series_id
    where s.published = true and s.archived_at is null
      and s.translation_status::text not in ('abandoned','withdrawn')
      and (not coalesce(s.adult,false)
        or coalesce((select pr.adult_ok from public.profiles pr where pr.id = (select auth.uid())),false))
      and c.score > 0
  ), all_positions as (
    select e.*, row_number() over (order by e.score desc, e.id)::integer as global_pos
    from eligible e
  )
  select a.id,
    row_number() over (order by a.score desc,a.id)::integer as position,
    a.global_pos, null::integer, a.score, null::integer, now()
  from all_positions a
  where (p_genre is null or a.genres::text like '%' || p_genre || '%')
    and (p_status is null
      or (p_status = 'terminada' and a.st = 'completed')
      or (p_status = 'en_curso' and a.st in ('active','paused')))
  order by a.score desc,a.id
  limit least(greatest(coalesce(p_limit,20),1),100);
end;
$$;
revoke all on function public.series_profile_ranking(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.series_profile_ranking(text,text,text,integer) to anon,authenticated;
comment on function public.series_profile_ranking(text,text,text,integer) is
  'Ranking de aperturas de ficha, independiente del ranking existente de capítulos';

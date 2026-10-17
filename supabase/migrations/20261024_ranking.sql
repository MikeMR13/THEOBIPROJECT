-- Ranking de obras: lecturas únicas, calificaciones, capítulos terminados con fecha, instantáneas cada 6 h y avisos de Top 10.

-- ---------- 1. Lecturas únicas: 1 por lector (o dispositivo) y día por obra ----------
create table if not exists public.series_daily (
  series_id uuid not null references public.series(id) on delete cascade,
  day date not null default current_date,
  n int not null default 0,
  primary key (series_id, day)
);
alter table public.series_daily enable row level security; -- sin políticas: solo vía funciones
create table if not exists private.series_seen (series_id uuid not null, day date not null, viewer text not null, primary key (series_id, day, viewer));

drop function if exists public.track_view(uuid);
create or replace function public.track_view(p_chapter uuid, p_device text default null) returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid; who text; fresh int;
begin
  select series_id into sid from public.chapters where id = p_chapter and status = 'published' and deleted_at is null;
  if sid is null then return; end if;
  -- por capítulo: igual que antes (estadísticas del Estudio)
  insert into public.chapter_views (chapter_id, day, n) values (p_chapter, current_date, 1)
    on conflict (chapter_id, day) do update set n = public.chapter_views.n + 1;
  -- por obra: una sola vez por lector y día
  who := coalesce('u:' || auth.uid()::text, case when p_device ~ '^[A-Za-z0-9-]{8,64}$' then 'd:' || p_device end);
  if who is null then return; end if;
  insert into private.series_seen (series_id, day, viewer) values (sid, current_date, who) on conflict do nothing;
  get diagnostics fresh = row_count;
  if fresh = 0 then return; end if;
  insert into public.series_daily (series_id, day, n) values (sid, current_date, 1)
    on conflict (series_id, day) do update set n = public.series_daily.n + 1;
  update public.series set views = coalesce(views, 0) + 1 where id = sid;
end $$;
revoke all on function public.track_view(uuid, text) from public;
grant execute on function public.track_view(uuid, text) to anon, authenticated;

-- ---------- 2. Calificaciones (1 a 5 estrellas) ----------
create table if not exists public.series_ratings (
  series_id uuid not null references public.series(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (series_id, user_id)
);
create index if not exists series_ratings_upd on public.series_ratings (updated_at);
alter table public.series_ratings enable row level security;
drop policy if exists "sr own read" on public.series_ratings; create policy "sr own read" on public.series_ratings for select using (user_id = auth.uid());
drop policy if exists "sr own ins" on public.series_ratings; create policy "sr own ins" on public.series_ratings for insert with check (user_id = auth.uid());
drop policy if exists "sr own upd" on public.series_ratings; create policy "sr own upd" on public.series_ratings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sr own del" on public.series_ratings; create policy "sr own del" on public.series_ratings for delete using (user_id = auth.uid());

-- Si la tabla antigua `ratings` tiene votos por serie, se copian (detecta el nombre de la columna de puntuación).
do $$
declare col text;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ratings' and column_name = 'series_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ratings' and column_name = 'user_id') then
    select column_name into col from information_schema.columns where table_schema = 'public' and table_name = 'ratings' and column_name in ('score', 'stars', 'value', 'rating') limit 1;
    if col is not null then
      execute format('insert into public.series_ratings (series_id, user_id, score) select series_id, user_id, least(greatest(round(%I)::int, 1), 5) from public.ratings where %I is not null and series_id in (select id from public.series) and user_id in (select id from public.profiles) on conflict do nothing', col, col);
    end if;
  end if;
end $$;

create or replace function public.series_rating(p_series uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'avg', (select round(avg(score)::numeric, 2) from public.series_ratings where series_id = p_series),
    'n', (select count(*) from public.series_ratings where series_id = p_series),
    'mine', (select score from public.series_ratings where series_id = p_series and user_id = auth.uid()));
$$;
grant execute on function public.series_rating(uuid) to anon, authenticated;

-- ---------- 3. Capítulos terminados con fecha ----------
alter table public.read_chapters add column if not exists read_at timestamptz;  -- los anteriores quedan sin fecha (solo cuentan en Histórico)
alter table public.read_chapters alter column read_at set default now();
create index if not exists read_chapters_ch_at on public.read_chapters (chapter_id, read_at);

-- ---------- 4. Instantáneas del ranking ----------
-- list: leidas | tendencia | calificadas | terminadas | novedades · period: hoy | semana | mes | anio | historico
create table if not exists public.rankings (
  list text not null, period text not null,
  series_id uuid not null references public.series(id) on delete cascade,
  pos int not null, prev_pos int, score numeric not null, votes int,
  computed_at timestamptz not null default now(),
  primary key (list, period, series_id)
);
create index if not exists rankings_pos on public.rankings (list, period, pos);
alter table public.rankings enable row level security;
drop policy if exists "rk read" on public.rankings; create policy "rk read" on public.rankings for select using (true);

create table if not exists private.rankings_stage (list text, period text, series_id uuid, pos int, score numeric, votes int);
create table if not exists private.ranking_notices (series_id uuid not null, list text not null, sent_at timestamptz not null default now(), primary key (series_id, list));

create or replace function private.compute_rankings() returns void language plpgsql security definer set search_path = '' as $$
declare first_run boolean := not exists (select 1 from public.rankings);
begin
  delete from private.rankings_stage;
  insert into private.rankings_stage (list, period, series_id, pos, score, votes)
  with p(period, d) as (values ('hoy', 1), ('semana', 7), ('mes', 30), ('anio', 365), ('historico', null::int)),
  ser as (select id from public.series where published),
  v as (select sd.series_id, p.period, sum(sd.n)::numeric n from public.series_daily sd cross join p where p.d is not null and sd.day > current_date - p.d group by sd.series_id, p.period),
  vprev as (select sd.series_id, p.period, sum(sd.n)::numeric n from public.series_daily sd cross join p where p.period in ('hoy', 'semana', 'mes') and sd.day > current_date - 2 * p.d and sd.day <= current_date - p.d group by sd.series_id, p.period),
  lastch as (select distinct on (c.series_id) c.series_id, c.id from public.chapters c where c.status = 'published' and c.deleted_at is null order by c.series_id, c.vol desc nulls last, c.num desc),
  firstpub as (select c.series_id, min(coalesce(c.publish_at, c.created_at)) at from public.chapters c where c.status = 'published' and c.deleted_at is null group by c.series_id),
  sc as (
    select 'leidas' list, v.period, v.series_id, v.n score, null::int votes from v
    union all select 'leidas', 'historico', s.id, coalesce(s.views, 0)::numeric, null from public.series s
    union all select 'tendencia', v.period, v.series_id, v.n - coalesce(pv.n, 0), null from v left join vprev pv on pv.series_id = v.series_id and pv.period = v.period where v.period in ('hoy', 'semana', 'mes')
    union all select 'calificadas', p.period, r.series_id, round(avg(r.score)::numeric, 3), count(*)::int from public.series_ratings r cross join p
      where p.d is null or r.updated_at > now() - make_interval(days => p.d) group by p.period, r.series_id having count(*) >= 25
    union all select 'terminadas', p.period, l.series_id, count(distinct rc.user_id)::numeric, null from lastch l join public.read_chapters rc on rc.chapter_id = l.id cross join p
      where p.d is null or rc.read_at > now() - make_interval(days => p.d) group by p.period, l.series_id
    union all select 'novedades', v.period, v.series_id, v.n, null from v join firstpub f on f.series_id = v.series_id where v.period in ('hoy', 'semana', 'mes') and f.at > now() - interval '30 days'
  ),
  ranked as (select sc.*, row_number() over (partition by sc.list, sc.period order by sc.score desc, sc.votes desc nulls last, sc.series_id)::int pos from sc join ser on ser.id = sc.series_id where sc.score > 0)
  select list, period, series_id, pos, score, votes from ranked where pos <= 500;

  -- Aviso al equipo: su obra entra al Top 10 de una lista semanal (como mucho uno por obra y lista cada 7 días; no en la primera corrida).
  if not first_run then
    with hit as (
      select s.series_id, s.list, s.pos from private.rankings_stage s
      left join public.rankings r on r.list = s.list and r.period = 'semana' and r.series_id = s.series_id
      where s.period = 'semana' and s.pos <= 10 and (r.pos is null or r.pos > 10)
        and not exists (select 1 from private.ranking_notices n where n.series_id = s.series_id and n.list = s.list and n.sent_at > now() - interval '7 days')),
    mark as (insert into private.ranking_notices (series_id, list, sent_at) select series_id, list, now() from hit
      on conflict (series_id, list) do update set sent_at = excluded.sent_at returning 1)
    insert into public.notifications (user_id, kind, body, link)
    select m.user_id, 'tablero',
      '«' || se.title || '» entró al Top 10 de ' || case h.list when 'leidas' then 'Más leídas' when 'tendencia' then 'Tendencia' when 'calificadas' then 'Mejor calificadas' when 'terminadas' then 'Más terminadas' else 'Novedades en ascenso' end || ' de la semana (#' || h.pos || ').',
      jsonb_build_object('href', '/ranking?lista=' || h.list || '&periodo=semana')
    from hit h join public.series se on se.id = h.series_id join public.team_members m on m.team_id = se.team_id;
  end if;

  delete from public.rankings r where not exists (select 1 from private.rankings_stage s where s.list = r.list and s.period = r.period and s.series_id = r.series_id);
  insert into public.rankings (list, period, series_id, pos, prev_pos, score, votes, computed_at)
    select list, period, series_id, pos, null, score, votes, now() from private.rankings_stage
    on conflict (list, period, series_id) do update set prev_pos = public.rankings.pos, pos = excluded.pos, score = excluded.score, votes = excluded.votes, computed_at = excluded.computed_at;
  update public.rankings set computed_at = now();

  delete from private.series_seen where day < current_date - 1;
end $$;

-- Lista pública filtrada (respeta +18 según el perfil del lector). pos = posición dentro del filtro; gpos = posición general.
create or replace function public.ranking_list(p_list text, p_period text, p_genre text default null, p_status text default null, p_limit int default 20)
returns table(series_id uuid, pos int, gpos int, prev_pos int, score numeric, votes int, computed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.series_id, (row_number() over (order by r.pos))::int, r.pos, r.prev_pos, r.score, r.votes, r.computed_at
  from public.rankings r join public.series s on s.id = r.series_id
  where r.list = p_list and r.period = p_period
    and (not coalesce(s.adult, false) or coalesce((select pr.adult_ok from public.profiles pr where pr.id = auth.uid()), false))
    and (p_genre is null or p_genre = any(s.genres))
    and (p_status is null or (p_status = 'terminada' and s.translation_status = 'completed') or (p_status = 'en_curso' and s.translation_status in ('active', 'paused')))
  order by r.pos
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
grant execute on function public.ranking_list(text, text, text, text, int) to anon, authenticated;

select cron.unschedule('obi-rankings') where exists (select 1 from cron.job where jobname = 'obi-rankings');
select cron.schedule('obi-rankings', '7 */6 * * *', 'select private.compute_rankings()');
select private.compute_rankings();

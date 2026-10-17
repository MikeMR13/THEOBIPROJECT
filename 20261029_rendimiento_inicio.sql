-- Rendimiento · Fases 4 y 5: inicio precalculado, insignia en un solo RPC, último capítulo por obra y miniaturas de portada.
-- Aplicar ANTES de desplegar el frontend que lee cover_thumb_path.

-- ---------- 1. Miniaturas de portada ----------
alter table public.series add column if not exists cover_thumb_path text;
-- Si cambia la portada, la miniatura vieja deja de valer (el Estudio genera la nueva).
create or replace function private.series_thumb_reset() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.cover_path is distinct from old.cover_path and new.cover_thumb_path is not distinct from old.cover_thumb_path then new.cover_thumb_path := null; end if;
  return new;
end $$;
drop trigger if exists series_thumb_reset on public.series;
create trigger series_thumb_reset before update of cover_path on public.series for each row execute function private.series_thumb_reset();

-- Guarda la miniatura solo si la portada sigue siendo la misma y el archivo está en la carpeta del equipo.
create or replace function public.series_set_thumb(p_series uuid, p_cover text, p_thumb text) returns boolean language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  select team_id into t from public.series where id = p_series;
  if t is null or not exists (select 1 from public.team_members m where m.team_id = t and m.user_id = auth.uid()) then raise exception 'forbidden'; end if;
  if p_thumb is null or p_thumb not like t::text || '/thumbs/%' then raise exception 'thumb_invalid'; end if;
  update public.series set cover_thumb_path = p_thumb where id = p_series and cover_path is not distinct from p_cover;
  return found;
end $$;
revoke all on function public.series_set_thumb(uuid, text, text) from public, anon;
grant execute on function public.series_set_thumb(uuid, text, text) to authenticated;

-- ---------- 2. Último capítulo publicado por obra (catálogo) ----------
create index if not exists chapters_series_publish_idx on public.chapters (series_id, publish_at desc) where deleted_at is null;
create or replace view public.series_last with (security_invoker = true) as
  select distinct on (c.series_id) c.series_id, c.num, c.publish_at
  from public.chapters c
  where c.status::text = 'published' and c.deleted_at is null and (c.publish_at is null or c.publish_at <= now())
  order by c.series_id, c.publish_at desc nulls last, c.num desc;
grant select on public.series_last to anon, authenticated;

-- ---------- 3. Insignia de capítulos nuevos: un solo RPC ----------
-- { series_id: n } · capítulos publicados después del progreso del lector, en obras que sigue, que aún no leyó.
create or replace function public.unread_counts() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.series_id, x.n), '{}'::jsonb) from (
    select c.series_id, count(*)::int n
    from public.follows f
    join public.reading_progress p on p.user_id = f.user_id and p.series_id = f.series_id
    join public.series s on s.id = f.series_id and coalesce(s.published, false)
    join public.chapters c on c.series_id = f.series_id and c.num > p.chapter_num
    where f.user_id = auth.uid() and c.status::text = 'published' and c.deleted_at is null and (c.publish_at is null or c.publish_at <= now())
      and not exists (select 1 from public.read_chapters r where r.user_id = f.user_id and r.chapter_id = c.id)
    group by c.series_id) x;
$$;
revoke all on function public.unread_counts() from public, anon;
grant execute on function public.unread_counts() to authenticated;

-- ---------- 4. Inicio precalculado ----------
-- Todo lo público del inicio en un JSON. El filtro +18 se aplica en el navegador con el perfil del lector (como antes).
create table if not exists private.home_snapshot (id int primary key default 1 check (id = 1), data jsonb not null, built_at timestamptz not null default now());

create or replace function private.build_home() returns jsonb language sql stable security definer set search_path = '' as $$
  with s as (
    select x.id, x.slug, x.title, x.short, x.original, x.author, left(x.synopsis, 600) synopsis, x.genres, x.theme, x.cover_path, x.cover_thumb_path,
      x.adult, x.work_type, x.translation_status::text translation_status, x.views,
      case when t.id is null then null else jsonb_build_object('name', t.name, 'slug', t.slug, 'color', t.color) end teams,
      jsonb_build_array(jsonb_build_object('count', (select count(*) from public.chapters c where c.series_id = x.id and c.status::text = 'published' and c.deleted_at is null and (c.publish_at is null or c.publish_at <= now())))) chapters
    from public.series x left join public.teams t on t.id = x.team_id
    where coalesce(x.published, false) and x.translation_status::text not in ('abandoned', 'withdrawn')
  ),
  rk as (select r.list, r.period, r.series_id, r.pos, r.score, r.votes from public.rankings r join s on s.id = r.series_id)
  select jsonb_build_object(
    'built_at', now(),
    'series', coalesce((select jsonb_agg(to_jsonb(s) order by s.views desc nulls last) from s), '[]'::jsonb),
    'latest', coalesce((select jsonb_agg(to_jsonb(c)) from (
        select c.num, c.title, c.publish_at, c.series_id from public.chapters c join s on s.id = c.series_id
        where c.status::text = 'published' and c.deleted_at is null and (c.publish_at is null or c.publish_at <= now())
        order by c.publish_at desc nulls last limit 80) c), '[]'::jsonb),
    'rkW', coalesce((select jsonb_agg(to_jsonb(r) order by r.pos) from (select series_id, pos, score, votes from rk where list = 'leidas' and period = 'semana' order by pos limit 100) r), '[]'::jsonb),
    'rkH', coalesce((select jsonb_agg(to_jsonb(r) order by r.pos) from (select series_id, pos, score, votes from rk where list = 'leidas' and period = 'historico' order by pos limit 20) r), '[]'::jsonb),
    'top10', coalesce((select jsonb_agg(jsonb_build_object('series_id', series_id, 'pos', pos, 'list', list)) from rk where period = 'semana' and pos <= 10), '[]'::jsonb),
    'trend', coalesce((select jsonb_agg(to_jsonb(r) order by r.pos) from (select series_id, pos, score, votes from rk where list = 'tendencia' and period = 'semana' order by pos limit 20) r), '[]'::jsonb),
    'novedades', coalesce((select jsonb_agg(to_jsonb(r) order by r.pos) from (select series_id, pos, score, votes from rk where list = 'novedades' and period = 'semana' order by pos limit 20) r), '[]'::jsonb),
    'rated', coalesce((select jsonb_agg(to_jsonb(r) order by r.pos) from (select series_id, pos, score, votes from rk where list = 'calificadas' and period = 'historico' order by pos limit 24) r), '[]'::jsonb),
    'nextRel', coalesce((select jsonb_agg(to_jsonb(e) order by e.at) from (
        select sc.label, sc.at, sc.kind, sc.series_id, jsonb_build_object('title', s.title, 'slug', s.slug) series
        from public.schedule sc join s on s.id = sc.series_id where sc.at >= now() order by sc.at limit 15) e), '[]'::jsonb),
    'featured', coalesce((select ps.featured from public.platform_settings ps where ps.id = 1), '[]'::jsonb),
    'ann', coalesce((select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name, 'color', t.color, 'ann', t.design->'announce'))
        from public.teams t where jsonb_typeof(t.design->'announce') = 'object' and (t.status is null or t.status::text = 'active')), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(v)) from (
        select r.series_id, s.slug, s.title, s.cover_path, s.cover_thumb_path, p.username, left(r.body, 280) body, r.updated_at at, sr.score
        from public.series_reviews r join s on s.id = r.series_id left join public.profiles p on p.id = r.user_id
        left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
        where length(trim(coalesce(r.body, ''))) > 20 order by r.updated_at desc limit 12) v), '[]'::jsonb)
  );
$$;

create or replace function private.refresh_home() returns jsonb language plpgsql security definer set search_path = '' as $$
declare d jsonb := private.build_home();
begin
  insert into private.home_snapshot (id, data, built_at) values (1, d, now()) on conflict (id) do update set data = excluded.data, built_at = excluded.built_at;
  return d;
end $$;

-- Lo que llama el navegador: la instantánea si tiene menos de 6 min; si no, la recalcula al momento.
create or replace function public.home_feed() returns jsonb language plpgsql security definer set search_path = '' as $$
declare d jsonb;
begin
  select data into d from private.home_snapshot where id = 1 and built_at > now() - interval '6 minutes';
  return coalesce(d, private.refresh_home());
end $$;
grant execute on function public.home_feed() to anon, authenticated;

select cron.unschedule('obi-home-snapshot') where exists (select 1 from cron.job where jobname = 'obi-home-snapshot');
select cron.schedule('obi-home-snapshot', '*/5 * * * *', 'select private.refresh_home()');
do $$ begin perform private.refresh_home(); exception when others then raise warning 'Instantánea inicial pendiente: %', sqlerrm; end $$;

notify pgrst, 'reload schema';

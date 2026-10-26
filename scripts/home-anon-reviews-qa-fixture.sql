\set ON_ERROR_STOP on
create role anon;
create schema private;
create table public.series (
  id uuid primary key, team_id uuid, slug text, title text, short text,
  original text, author text, synopsis text, genres text[], theme jsonb,
  cover_path text, cover_thumb_path text, adult boolean,
  work_type text, translation_status text, views integer, published boolean
);
create table public.teams (
  id uuid primary key, name text, slug text, color text,
  avatar_path text, design jsonb, status text
);
create table public.chapters (
  id uuid, series_id uuid, status text, deleted_at timestamptz,
  publish_at timestamptz, num numeric, title text
);
create table public.rankings (list text, period text, series_id uuid, pos int, score numeric, votes int);
create table public.schedule (label text, at timestamptz, kind text, series_id uuid);
create table public.platform_settings(id int primary key, featured jsonb);
create table public.profiles (
  id uuid primary key, username text, adult_ok boolean, delete_requested_at timestamptz
);
create table public.series_reviews (
  series_id uuid, user_id uuid, body text, anonymous boolean, updated_at timestamptz
);
create table public.series_ratings (series_id uuid, user_id uuid, score numeric);
create table private.home_snapshot (
  id integer primary key, data jsonb not null,
  built_at timestamptz not null
);
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

insert into public.series(id,team_id,slug,title,published,translation_status,adult,views) values
 ('11111111-1111-1111-1111-111111111111',null,'obra-qa','Obra QA',true,'active',false,10);
insert into public.profiles(id,username,delete_requested_at) values
 ('22222222-2222-2222-2222-222222222222','qa-hidden',null),
 ('33333333-3333-3333-3333-333333333333','qa-visible',null);
insert into public.series_reviews(series_id,user_id,body,anonymous,updated_at) values
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Esta reseña anónima contiene texto de QA suficiente',true,now()),
 ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','Esta reseña pública contiene texto de QA suficiente',false,now());
-- Emulación fiel de las funciones de producción, incluyendo versión vulnerable original.
CREATE OR REPLACE FUNCTION private.build_home()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with s as (
    select x.id, x.team_id, x.slug, x.title, x.short, x.original, x.author, left(x.synopsis, 600) synopsis, x.genres, x.theme, x.cover_path, x.cover_thumb_path,
      x.adult, x.work_type, x.translation_status::text translation_status, x.views,
      case when t.id is null then null else jsonb_build_object('name', t.name, 'slug', t.slug, 'color', t.color, 'avatar_path', t.avatar_path) end teams,
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
$function$
;
CREATE OR REPLACE FUNCTION public.home_feed()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d jsonb;
begin
  select data into d from private.home_snapshot where id = 1 and built_at > now() - interval '15 minutes';
  return coalesce(d, private.build_home());
end $function$
;
CREATE OR REPLACE FUNCTION public.home_reviews(p_limit integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select r.series_id, s.slug, s.title, s.cover_path, case when r.anonymous then null else p.username end username, r.anonymous anon,
      left(r.body, 280) body, r.updated_at at, sr.score
    from public.series_reviews r join public.series s on s.id = r.series_id left join public.profiles p on p.id = r.user_id
    left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
    where coalesce(s.published, false) and p.delete_requested_at is null
      and (not coalesce(s.adult, false) or coalesce((select pr.adult_ok from public.profiles pr where pr.id = auth.uid()), false))
    order by r.updated_at desc
    limit least(greatest(coalesce(p_limit, 6), 1), 20)) x;
$function$
;

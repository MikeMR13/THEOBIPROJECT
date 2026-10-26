-- Corrección mínima de privacidad para la colección reviews de home_feed.
-- Basada en la definición real de private.build_home() revisada en octubre 2026.
-- Solo cambia la proyección de username; no cambia otras secciones del Inicio.
-- CANDIDATO DE QA: no aplicar directamente a producción.

do $preflight$
begin
  if not exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname='build_home' and p.prosecdef
      and pg_get_userbyid(p.proowner)='postgres'
      and p.prosrc like '%p.username, left(r.body, 280) body%'
      and p.prosrc not like '%case when r.anonymous then null else p.username end username%'
  ) then
    raise exception 'La versión actual de private.build_home() cambió: abortar';
  end if;
end $preflight$;

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
        select r.series_id, s.slug, s.title, s.cover_path, s.cover_thumb_path, case when r.anonymous then null else p.username end username, left(r.body, 280) body, r.updated_at at, sr.score
        from public.series_reviews r join s on s.id = r.series_id left join public.profiles p on p.id = r.user_id
        left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
        where length(trim(coalesce(r.body, ''))) > 20 order by r.updated_at desc limit 12) v), '[]'::jsonb)
  );
$function$
;

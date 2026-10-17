-- Perfil público de lector (carnet) + página /preferencias.
-- Nuevos campos editables por el propio lector; reader_public devuelve todo lo que la página necesita en una sola llamada.

create or replace function private.valid_links(l jsonb) returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(l) = 'array' and jsonb_array_length(l) <= 12 and not exists (
    select 1 from jsonb_array_elements(l) e
    where jsonb_typeof(e) <> 'object'
       or coalesce(e->>'k', '') not in ('discord', 'x', 'instagram', 'tiktok', 'web', 'youtube', 'twitch', 'facebook', 'threads', 'bluesky', 'reddit', 'telegram', 'patreon', 'kofi', 'wattpad', 'goodreads', 'anilist', 'myanimelist', 'pixiv', 'spotify', 'steam', 'github')
       or coalesce(e->>'url', '') !~ '^https://[^\s<>"]{3,200}$'
       or (e ? 'on' and jsonb_typeof(e->'on') <> 'boolean'))
$$;

alter table public.profiles
  add column if not exists seal_kanji text check (seal_kanji ~ '^[一-鿿㐀-䶿豈-﫿]$'),
  add column if not exists accent text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists links jsonb not null default '[]'::jsonb check (private.valid_links(links)),
  add column if not exists favorites uuid[] not null default '{}' check (cardinality(favorites) <= 5),
  add column if not exists profile_sections jsonb not null default '{"favs":true,"seals":true,"shelves":false,"reviews":false}'::jsonb;

grant update (seal_kanji, accent, links, favorites, profile_sections) on public.profiles to authenticated;

create or replace function public.reader_public(p_username text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pr public.profiles; sec jsonb; v_adult boolean; n_ch bigint; r jsonb;
begin
  select * into pr from public.profiles where lower(username) = lower(p_username) limit 1;
  if pr.id is null then return null; end if;
  sec := coalesce(pr.profile_sections, '{}'::jsonb);
  select coalesce(p.adult_ok, false) into v_adult from public.profiles p where p.id = auth.uid();
  v_adult := coalesce(v_adult, false);
  select count(*) into n_ch from public.read_chapters where user_id = pr.id;

  with ok as (
    select s.id, s.slug, s.title, s.cover_path, s.cover_thumb_path, coalesce(s.theme->>'color', '#f2c230') color
    from public.series s where s.published and s.archived_at is null and (not s.adult or v_adult)),
  rc as (select c.series_id, count(*) n from public.read_chapters x join public.chapters c on c.id = x.chapter_id
         where x.user_id = pr.id and c.deleted_at is null group by c.series_id),
  tot as (select c.series_id, count(*) n from public.chapters c where c.status = 'published' and c.deleted_at is null group by c.series_id),
  done as (select rc.series_id from rc join tot using (series_id) join public.series s on s.id = rc.series_id
           where s.translation_status::text = 'completed' and rc.n >= tot.n),
  reading as (select p.series_id, p.updated_at from public.reading_progress p where p.user_id = pr.id and p.series_id not in (select series_id from done)),
  plan as (select f.series_id from public.follows f where f.user_id = pr.id and f.series_id not in (select series_id from reading) and f.series_id not in (select series_id from done)),
  shelf as (
    select 'reading' k, o.*, rd.updated_at o_at from reading rd join ok o on o.id = rd.series_id
    union all select 'done', o.*, null from done d join ok o on o.id = d.series_id
    union all select 'plan', o.*, null from plan p join ok o on o.id = p.series_id),
  rv as (
    select v.*, (select count(*) from public.review_votes w where w.review_id = v.id) votes from public.reviews v
    where v.user_id = pr.id and v.series_id in (select id from ok))
  select jsonb_build_object(
    'id', pr.id, 'username', pr.username, 'avatar_url', pr.avatar_url, 'bio', pr.bio, 'banner_url', pr.banner_url,
    'kanji', pr.seal_kanji, 'accent', pr.accent, 'since', pr.created_at, 'sections', sec,
    'links', coalesce((select jsonb_agg(jsonb_build_object('k', e->>'k', 'url', e->>'url')) from jsonb_array_elements(pr.links) e where coalesce((e->>'on')::boolean, true)), '[]'::jsonb),
    'favorites', case when coalesce((sec->>'favs')::boolean, true) then coalesce((select jsonb_agg(to_jsonb(o) order by array_position(pr.favorites, o.id)) from ok o where o.id = any(pr.favorites)), '[]'::jsonb) end,
    'seals', case when coalesce((sec->>'seals')::boolean, true) then jsonb_build_object(
        'donor', pr.donor_tier is not null and (pr.donor_until is null or pr.donor_until > now()),
        'chapters', n_ch,
        'useful', exists (select 1 from rv where votes >= 3)) end,
    'shelves', case when coalesce((sec->>'shelves')::boolean, false) then coalesce((
        select jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'items', g.items)) from (
          select s1.k, count(*) n, (select jsonb_agg(z) from (
              select jsonb_build_object('id', s2.id, 'slug', s2.slug, 'title', s2.title, 'cover_path', s2.cover_path, 'cover_thumb_path', s2.cover_thumb_path, 'color', s2.color) z
              from shelf s2 where s2.k = s1.k order by s2.o_at desc nulls last, s2.title limit 6) q) items
          from shelf s1 group by s1.k) g), '{}'::jsonb) end,
    'reviews', case when coalesce((sec->>'reviews')::boolean, false) then coalesce((
        select jsonb_agg(x) from (select jsonb_build_object('id', v.id, 'stars', v.stars, 'title', v.title, 'body', left(v.body, 400), 'spoiler', v.spoiler, 'votes', v.votes,
               'series', jsonb_build_object('slug', o.slug, 'title', o.title, 'cover_path', o.cover_path, 'cover_thumb_path', o.cover_thumb_path, 'color', o.color)) x
          from rv v join ok o on o.id = v.series_id order by v.votes desc, v.created_at desc limit 3) t), '[]'::jsonb) end,
    'public_activity', coalesce(pr.public_activity, false),
    'stats', case when coalesce(pr.public_activity, false) then public.reader_stats(pr.id) end)
  into r;
  return r;
end $$;

grant execute on function public.reader_public(text) to anon, authenticated;

-- Series para el buscador de favoritas en /preferencias (respeta +18 del propio lector).
create or replace function public.favorite_candidates(p_q text) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'slug', s.slug, 'cover_path', s.cover_thumb_path, 'color', coalesce(s.theme->>'color', '#f2c230'))), '[]'::jsonb)
  from (select * from public.series s
        where s.published and s.archived_at is null and length(trim(p_q)) >= 2
          and (s.title ilike '%' || trim(p_q) || '%' or s.short ilike '%' || trim(p_q) || '%' or s.original ilike '%' || trim(p_q) || '%')
          and (not s.adult or coalesce((select adult_ok from public.profiles where id = auth.uid()), false))
        order by s.views desc nulls last limit 8) s
$$;
grant execute on function public.favorite_candidates(text) to authenticated;

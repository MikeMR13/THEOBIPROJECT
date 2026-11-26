-- Fase 6 · Lectores: glosario unificado con personajes, estados manuales con nota, estanterías y listas,
-- reacciones, aviso de obra reanudada, «Joyas por descubrir», meta anual + resumen del año y retos de temporada.
-- Todo corre en Postgres + pg_cron (ya en uso). Sin Edge Functions nuevas.

-- ---------- 1. Glosario unificado ----------
-- El código solo usa glossary_terms. «glossary» y «characters» estaban vacías (verificado el 26 nov 2026);
-- igual se copian por si acaso antes de borrarlas. Los personajes pasan a ser términos de categoría «Personaje».
alter table public.glossary_terms
  add column if not exists role text check (role is null or char_length(role) <= 60),
  add column if not exists portrait_path text check (portrait_path is null or char_length(portrait_path) <= 300);

do $$ begin
  if to_regclass('public.glossary') is not null then
    insert into public.glossary_terms (series_id, term, category, definition)
    select g.series_id, left(trim(g.term), 60), coalesce(nullif(trim(g.cat), ''), 'Otro'), left(trim(g.def), 600)
    from public.glossary g
    where trim(coalesce(g.term, '')) <> '' and trim(coalesce(g.def, '')) <> ''
    on conflict (series_id, term) do nothing;
    drop table public.glossary;
  end if;
  if to_regclass('public.characters') is not null then
    insert into public.glossary_terms (series_id, term, category, definition, role, portrait_path)
    select c.series_id, left(trim(c.name), 60), 'Personaje', left(coalesce(nullif(trim(c.descr), ''), 'Sin descripción'), 600), left(c.role, 60), c.portrait_path
    from public.characters c where trim(coalesce(c.name, '')) <> ''
    on conflict (series_id, term) do update set role = excluded.role, portrait_path = excluded.portrait_path;
    drop table public.characters;
  end if;
end $$;

-- ---------- 2. Estado manual por obra + nota personal ----------
-- «shelves» ya guardaba un estado por obra (reading|plan|done|drop) sin interfaz. Se añade «hold» (En pausa) y la nota.
alter table public.shelves drop constraint if exists shelves_shelf_check;
alter table public.shelves add constraint shelves_shelf_check check (shelf in ('reading', 'plan', 'done', 'drop', 'hold'));
alter table public.shelves
  add column if not exists note text check (note is null or char_length(note) <= 500),
  add column if not exists updated_at timestamptz not null default now();

-- ---------- 3. Estanterías propias y listas públicas ----------
-- Una sola estructura: «shelf» = estantería (privada por defecto), «list» = lista de recomendaciones.
alter table public.collections
  add column if not exists kind text not null default 'list' check (kind in ('list', 'shelf')),
  add column if not exists updated_at timestamptz not null default now();
alter table public.collections drop constraint if exists collections_description_check;
alter table public.collections add constraint collections_description_check check (description is null or char_length(description) <= 400);
alter table public.collection_items drop constraint if exists collection_items_note_check;
alter table public.collection_items add constraint collection_items_note_check check (note is null or char_length(note) <= 200);
create index if not exists collections_user_kind on public.collections (user_id, kind);

-- Listas públicas para una ficha o un perfil, con portadas y cuántos la guardaron.
create or replace function public.collections_public(p_user uuid default null, p_series uuid default null, p_limit int default 12)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by (x->>'saves')::int desc, x->>'title'), '[]'::jsonb) from (
    select jsonb_build_object('id', c.id, 'title', c.title, 'description', c.description, 'kind', c.kind,
      'owner', pr.username, 'n', (select count(*) from public.collection_items i where i.collection_id = c.id),
      'saves', (select count(*) from public.collection_saves v where v.collection_id = c.id),
      'covers', coalesce((select jsonb_agg(z) from (select jsonb_build_object('cover_path', s.cover_path, 'cover_thumb_path', s.cover_thumb_path, 'color', s.theme->>'color') z
          from public.collection_items i join public.series s on s.id = i.series_id where i.collection_id = c.id and s.published order by i.sort limit 3) q), '[]'::jsonb)) x
    from public.collections c join public.profiles pr on pr.id = c.user_id
    where c.is_public and (p_user is null or c.user_id = p_user)
      and (p_series is null or exists (select 1 from public.collection_items i where i.collection_id = c.id and i.series_id = p_series))
    limit least(greatest(coalesce(p_limit, 12), 1), 50)) t;
$$;
grant execute on function public.collections_public(uuid, uuid, int) to anon, authenticated;

-- ---------- 4. Reacciones por capítulo ----------
create or replace function public.chapter_reactions(p_chapter uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from public.reactions where chapter_id = p_chapter group by kind) t), '{}'::jsonb),
    'mine', (select kind from public.reactions where chapter_id = p_chapter and user_id = auth.uid()))
  where private.chapter_readable(p_chapter);
$$;
grant execute on function public.chapter_reactions(uuid) to anon, authenticated;

-- ---------- 5. Aviso cuando una obra en pausa o abandonada vuelve a traducirse ----------
create or replace function private.tg_series_resumed() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.translation_status::text in ('paused', 'abandoned') and new.translation_status::text = 'active' and coalesce(new.published, false) then
    insert into public.notifications (user_id, kind, body, link)
    select f.user_id, 'reanudada', '«' || new.title || '» volvió a traducirse.', jsonb_build_object('href', '/serie/' || new.slug, 'series', new.id)
    from public.follows f
    where f.series_id = new.id and coalesce(f.channels->>'web', 'true') <> 'false'
      and not exists (select 1 from public.shelves sh where sh.user_id = f.user_id and sh.series_id = new.id and sh.shelf = 'drop')
      and not exists (select 1 from public.team_members m where m.team_id = new.team_id and m.user_id = f.user_id);
  end if;
  return null;
exception when others then
  raise warning 'series_resumed %: %', new.id, sqlerrm; -- nunca bloquea el cambio de estado
  return null;
end $$;
drop trigger if exists series_notify_resumed on public.series;
create trigger series_notify_resumed after update of translation_status on public.series
  for each row execute function private.tg_series_resumed();

-- ---------- 6. Joyas por descubrir ----------
-- Obras publicadas con capítulo en los últimos 30 días y menos de p_max lectores distintos.
create or replace function public.hidden_gems(p_max int default 50, p_limit int default 12)
returns table(series_id uuid, readers int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with recent as (
    select c.series_id, max(coalesce(c.publish_at, c.created_at)) last_at from public.chapters c
    where c.status = 'published' and c.deleted_at is null and coalesce(c.publish_at, c.created_at) between now() - interval '30 days' and now()
    group by c.series_id),
  rd as (select p.series_id, count(*)::int n from public.reading_progress p where p.series_id in (select series_id from recent) group by p.series_id)
  select s.id, coalesce(rd.n, 0), r.last_at
  from recent r join public.series s on s.id = r.series_id left join rd on rd.series_id = s.id
  where coalesce(s.published, false) and s.archived_at is null and s.translation_status::text not in ('abandoned', 'withdrawn')
    and coalesce(rd.n, 0) < greatest(coalesce(p_max, 50), 1)
    and (not coalesce(s.adult, false) or coalesce((select pr.adult_ok from public.profiles pr where pr.id = auth.uid()), false))
  order by r.last_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;
grant execute on function public.hidden_gems(int, int) to anon, authenticated;

-- ---------- 7. Meta anual y resumen del año (sin racha) ----------
-- La meta vive en profiles.ui_prefs->'reading_goal' ({"year":2026,"volumes":40}); solo la ve su dueño.
create or replace function public.reader_year(p_year int default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid(); y int := coalesce(p_year, extract(year from now())::int); a timestamptz; b timestamptz;
begin
  if u is null then return null; end if;
  a := make_timestamptz(y, 1, 1, 0, 0, 0, 'UTC'); b := make_timestamptz(y + 1, 1, 1, 0, 0, 0, 'UTC');
  return (
    with yr as (select r.chapter_id, r.read_at, c.series_id, c.volume_id from public.read_chapters r join public.chapters c on c.id = r.chapter_id
                where r.user_id = u and r.read_at >= a and r.read_at < b and c.deleted_at is null),
    vols as (
      select v.volume_id from (select distinct volume_id from yr where volume_id is not null) v
      where not exists (select 1 from public.chapters c where c.volume_id = v.volume_id and c.status = 'published' and c.deleted_at is null
                          and not exists (select 1 from public.read_chapters r where r.user_id = u and r.chapter_id = c.id))),
    top as (select series_id, count(*) n from yr group by series_id order by 2 desc limit 1),
    gen as (select g, count(*) n from yr join public.series s on s.id = yr.series_id cross join lateral unnest(coalesce(s.genres, '{}')) g group by g order by 2 desc limit 1),
    dow as (select extract(isodow from read_at)::int d, count(*) n from yr group by 1 order by 2 desc limit 1)
    select jsonb_build_object(
      'year', y, 'chapters', (select count(*) from yr), 'series', (select count(distinct series_id) from yr), 'volumes', (select count(*) from vols),
      'goal', (select case when (pr.ui_prefs->'reading_goal'->>'year')::int = y then (pr.ui_prefs->'reading_goal'->>'volumes')::int end from public.profiles pr where pr.id = u),
      'genre', (select g from gen), 'weekday', (select d from dow),
      'top', (select jsonb_build_object('slug', s.slug, 'title', s.title, 'chapters', top.n) from top join public.series s on s.id = top.series_id)));
end $$;
grant execute on function public.reader_year(int) to authenticated;

-- ---------- 8. Retos de temporada ----------
-- Apagados por defecto: el Bibliotecario los activa en su mostrador (platform_settings.features.challenges).
alter table public.platform_settings add column if not exists features jsonb not null default '{}'::jsonb;
alter table public.platform_settings drop constraint if exists platform_settings_features_check;
alter table public.platform_settings add constraint platform_settings_features_check check (jsonb_typeof(features) = 'object' and octet_length(features::text) <= 2000);
create table if not exists public.reading_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 80),
  description text check (description is null or char_length(description) <= 300),
  goal text not null check (goal in ('finish_series', 'start_series', 'chapters')),
  target int not null check (target between 1 and 1000),
  kanji text check (kanji is null or char_length(kanji) <= 2),
  season_key text,
  starts date not null,
  ends date not null check (ends >= starts),
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now());
alter table public.reading_challenges enable row level security;
drop policy if exists "challenges read" on public.reading_challenges;
create policy "challenges read" on public.reading_challenges for select using (true);
drop policy if exists "challenges admin" on public.reading_challenges;
create policy "challenges admin" on public.reading_challenges for all using (private.is_admin()) with check (private.is_admin());

create table if not exists public.challenge_joins (
  challenge_id uuid not null references public.reading_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id));
alter table public.challenge_joins enable row level security;
drop policy if exists "cjoins own" on public.challenge_joins;
create policy "cjoins own" on public.challenge_joins for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Retos vigentes o recién terminados con el progreso de quien pregunta (solo lecturas dentro del periodo).
create or replace function public.my_challenges() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  return coalesce((select jsonb_agg(x order by (x->>'ends')) from (
    select jsonb_build_object('id', ch.id, 'title', ch.title, 'description', ch.description, 'goal', ch.goal, 'target', ch.target,
      'kanji', ch.kanji, 'season_key', ch.season_key, 'starts', ch.starts, 'ends', ch.ends,
      'joined', u is not null and exists (select 1 from public.challenge_joins j where j.challenge_id = ch.id and j.user_id = u),
      'progress', case when u is null then 0 else (
        with rd as (select c.series_id, r.read_at, c.id from public.read_chapters r join public.chapters c on c.id = r.chapter_id
                    where r.user_id = u and r.read_at >= ch.starts and r.read_at < ch.ends + 1 and c.deleted_at is null)
        select case ch.goal
          when 'chapters' then (select count(*) from rd)
          when 'start_series' then (select count(*) from (select series_id from rd group by series_id
              having not exists (select 1 from public.read_chapters r2 join public.chapters c2 on c2.id = r2.chapter_id
                                 where r2.user_id = u and c2.series_id = rd.series_id and r2.read_at < ch.starts)) q)
          else (select count(*) from (select rd.series_id from rd group by rd.series_id
              having (select count(*) from public.chapters c3 where c3.series_id = rd.series_id and c3.status = 'published' and c3.deleted_at is null)
                   <= (select count(*) from public.read_chapters r3 join public.chapters c4 on c4.id = r3.chapter_id where r3.user_id = u and c4.series_id = rd.series_id)
                and (select translation_status::text from public.series where id = rd.series_id) = 'completed') q)
        end) end) x
    from public.reading_challenges ch
    where ch.starts <= current_date + 7 and ch.ends >= current_date - 14) t), '[]'::jsonb);
end $$;
grant execute on function public.my_challenges() to anon, authenticated;

notify pgrst, 'reload schema';

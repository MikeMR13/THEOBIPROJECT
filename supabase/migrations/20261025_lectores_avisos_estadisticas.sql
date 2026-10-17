-- Avisos de capítulos nuevos a quien sigue la obra (agrupados) y estadísticas del lector.

-- ---------- 1. Avisos de capítulo nuevo ----------
create table if not exists private.chapter_notified (chapter_id uuid primary key, at timestamptz not null default now());

-- Avisa una vez por capítulo. Si el lector tiene un aviso sin leer de la misma obra, lo actualiza: «3 capítulos nuevos de X».
create or replace function private.notify_chapter(p_chapter uuid) returns void language plpgsql security definer set search_path = '' as $$
declare c record; s record;
begin
  select * into c from public.chapters where id = p_chapter;
  if c is null or c.status <> 'published' or c.deleted_at is not null or coalesce(c.publish_at, now()) > now() then return; end if;
  insert into private.chapter_notified (chapter_id) values (c.id) on conflict do nothing;
  if not found then return; end if;
  select id, slug, title, published into s from public.series where id = c.series_id;
  if s is null or not coalesce(s.published, false) then return; end if;

  with fol as (
    select f.user_id from public.follows f
    where f.series_id = s.id and coalesce(f.channels->>'web', 'true') <> 'false'
      and not exists (select 1 from public.team_members m join public.series se on se.team_id = m.team_id where se.id = s.id and m.user_id = f.user_id)),
  upd as (
    update public.notifications n set
      link = jsonb_build_object('href', '/leer/' || s.slug || '/' || least((n.link->>'from')::numeric, c.num), 'series', s.id, 'n', coalesce((n.link->>'n')::int, 1) + 1, 'from', least((n.link->>'from')::numeric, c.num)),
      body = (coalesce((n.link->>'n')::int, 1) + 1) || ' capítulos nuevos de «' || s.title || '» · desde el cap. ' || least((n.link->>'from')::numeric, c.num),
      created_at = now()
    where n.kind = 'capitulo' and not n.read and n.link->>'series' = s.id::text and n.user_id in (select user_id from fol)
    returning n.user_id)
  insert into public.notifications (user_id, kind, body, link)
  select f.user_id, 'capitulo', 'Nuevo capítulo de «' || s.title || '» · Cap. ' || c.num || coalesce(' — ' || nullif(c.title, ''), ''),
    jsonb_build_object('href', '/leer/' || s.slug || '/' || c.num, 'series', s.id, 'n', 1, 'from', c.num)
  from fol f where f.user_id not in (select user_id from upd);
exception when others then
  raise warning 'notify_chapter %: %', p_chapter, sqlerrm; -- nunca bloquea la publicación
end $$;

create or replace function private.tg_chapter_published() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and new.deleted_at is null and coalesce(new.publish_at, now()) <= now()
     and (tg_op = 'INSERT' or old.status is distinct from 'published' or old.publish_at is distinct from new.publish_at) then
    perform private.notify_chapter(new.id);
  end if;
  return null;
end $$;
drop trigger if exists chapters_notify_followers on public.chapters;
create trigger chapters_notify_followers after insert or update of status, publish_at on public.chapters
  for each row execute function private.tg_chapter_published();

-- Capítulos programados que llegan a su hora sin que nadie toque la fila.
create or replace function private.notify_due_chapters() returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select c.id from public.chapters c
    where c.status = 'published' and c.deleted_at is null and c.publish_at <= now() and c.publish_at > now() - interval '2 days'
      and not exists (select 1 from private.chapter_notified n where n.chapter_id = c.id)
  loop perform private.notify_chapter(r.id); end loop;
end $$;

-- Lo ya publicado no genera avisos de golpe.
insert into private.chapter_notified (chapter_id) select id from public.chapters where status = 'published' and coalesce(publish_at, now()) <= now() on conflict do nothing;

select cron.unschedule('obi-chapter-notify') where exists (select 1 from cron.job where jobname = 'obi-chapter-notify');
select cron.schedule('obi-chapter-notify', '*/10 * * * *', 'select private.notify_due_chapters()');

-- ---------- 2. Estadísticas del lector ----------
-- Totales (sin racha). Las ve el propio lector; las demás personas solo si activó «public_activity».
create or replace function public.reader_stats(p_user uuid default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := coalesce(p_user, auth.uid()); ok boolean;
begin
  if u is null then return null; end if;
  select (u = auth.uid()) or coalesce(pr.public_activity, false) into ok from public.profiles pr where pr.id = u;
  if not coalesce(ok, false) then return null; end if;
  return (
    with rc as (select c.series_id, count(*) n from public.read_chapters r join public.chapters c on c.id = r.chapter_id where r.user_id = u and c.deleted_at is null group by c.series_id),
    tot as (select c.series_id, count(*) n from public.chapters c where c.status = 'published' and c.deleted_at is null and c.series_id in (select series_id from rc) group by c.series_id),
    gen as (select g, sum(rc.n) n from rc join public.series s on s.id = rc.series_id cross join lateral jsonb_array_elements_text(coalesce(to_jsonb(s.genres), '[]'::jsonb)) g group by g order by 2 desc limit 5)
    select jsonb_build_object(
      'chapters', coalesce((select sum(n) from rc), 0),
      'series', (select count(*) from rc),
      'finished', (select count(*) from rc join tot on tot.series_id = rc.series_id join public.series s on s.id = rc.series_id where s.translation_status::text = 'completed' and rc.n >= tot.n),
      'following', (select count(*) from public.follows where user_id = u),
      'month', (select count(*) from public.read_chapters r where r.user_id = u and r.read_at > now() - interval '30 days'),
      'genres', coalesce((select jsonb_agg(jsonb_build_object('g', g, 'n', n)) from gen), '[]'::jsonb)));
end $$;
grant execute on function public.reader_stats(uuid) to anon, authenticated;

-- Perfil público por nombre de usuario (solo datos públicos).
create or replace function public.reader_public(p_username text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', pr.id, 'username', pr.username, 'avatar_url', pr.avatar_url, 'bio', pr.bio, 'banner_url', pr.banner_url, 'public_activity', coalesce(pr.public_activity, false),
    'stats', case when coalesce(pr.public_activity, false) then public.reader_stats(pr.id) end)
  from public.profiles pr where lower(pr.username) = lower(p_username) limit 1;
$$;
grant execute on function public.reader_public(text) to anon, authenticated;

notify pgrst, 'reload schema';

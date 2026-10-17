-- Privacidad del lector: visibilidad del perfil, reseñas anónimas, obras ocultas, exportar datos y eliminación con 30 días de gracia.

-- 1. Perfil
alter table public.profiles
  add column if not exists profile_visibility text not null default 'auth' check (profile_visibility in ('all', 'auth', 'none')),
  add column if not exists show_since boolean not null default true,
  add column if not exists hide_reading boolean not null default false,
  add column if not exists hidden_series uuid[] not null default '{}' check (cardinality(hidden_series) <= 500),
  add column if not exists delete_requested_at timestamptz;
grant update (profile_visibility, show_since, hide_reading, hidden_series) on public.profiles to authenticated;
-- delete_requested_at solo cambia por las funciones de abajo.

-- 2. Reseñas anónimas. Nadie más puede leer la tabla directamente (así no se filtra el autor); la ficha y el inicio usan funciones.
alter table public.series_reviews add column if not exists anonymous boolean not null default false;
drop policy if exists "rv read" on public.series_reviews;
create policy "rv read" on public.series_reviews for select using (user_id = auth.uid() or private.is_admin());

-- Referencia opaca para reportar una reseña anónima sin revelar al autor.
create or replace function private.review_ref(p_user uuid, p_series uuid) returns text language sql immutable set search_path = '' as $$
  select 'a' || substr(md5(p_user::text || ':' || p_series::text || ':obi'), 1, 20)
$$;

create or replace function public.series_reviews_list(p_series uuid, p_limit int default 20) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.mine desc, x.at desc), '[]'::jsonb) from (
    select r.user_id = auth.uid() mine,
      case when r.anonymous and r.user_id is distinct from auth.uid() then null else r.user_id end uid,
      case when r.anonymous and r.user_id is distinct from auth.uid() then private.review_ref(r.user_id, r.series_id) else r.user_id::text end ref,
      r.anonymous anon,
      case when r.anonymous and r.user_id is distinct from auth.uid() then null else p.username end username,
      case when r.anonymous and r.user_id is distinct from auth.uid() then null else p.avatar_url end avatar_url,
      r.body, r.updated_at at, r.created_at, sr.score
    from public.series_reviews r left join public.profiles p on p.id = r.user_id
    left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
    where r.series_id = p_series and p.delete_requested_at is null
    order by (r.user_id = auth.uid()) desc, r.updated_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)) x;
$$;

create or replace function public.home_reviews(p_limit int default 6) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select r.series_id, s.slug, s.title, s.cover_path, case when r.anonymous then null else p.username end username, r.anonymous anon,
      left(r.body, 280) body, r.updated_at at, sr.score
    from public.series_reviews r join public.series s on s.id = r.series_id left join public.profiles p on p.id = r.user_id
    left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
    where coalesce(s.published, false) and p.delete_requested_at is null
      and (not coalesce(s.adult, false) or coalesce((select pr.adult_ok from public.profiles pr where pr.id = auth.uid()), false))
    order by r.updated_at desc
    limit least(greatest(coalesce(p_limit, 6), 1), 20)) x;
$$;

create or replace function public.report_review(p_series uuid, p_ref text, p_reason text, p_note text default null) returns void language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para reportar'; end if;
  select r.user_id into a from public.series_reviews r
   where r.series_id = p_series and (r.user_id::text = p_ref or private.review_ref(r.user_id, r.series_id) = p_ref);
  if a is null then raise exception 'Reseña no encontrada'; end if;
  if a = auth.uid() then raise exception 'No puedes reportar tu propia reseña'; end if;
  insert into public.review_reports (series_id, author_id, reporter, reason, note)
  values (p_series, a, auth.uid(), left(p_reason, 40), nullif(left(trim(coalesce(p_note, '')), 500), ''))
  on conflict do nothing;
end $$;
grant execute on function public.report_review(uuid, text, text, text) to authenticated;

-- 3. Perfil público con privacidad aplicada
create or replace function public.reader_public(p_username text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pr public.profiles; sec jsonb; v_adult boolean; n_ch bigint; r jsonb; me uuid := auth.uid();
begin
  select * into pr from public.profiles where lower(username) = lower(p_username) limit 1;
  if pr.id is null or pr.delete_requested_at is not null then return null; end if;
  if pr.id is distinct from me and (pr.profile_visibility = 'none' or (pr.profile_visibility = 'auth' and me is null)) then
    return jsonb_build_object('private', pr.profile_visibility, 'username', pr.username, 'avatar_url', pr.avatar_url, 'accent', pr.accent);
  end if;
  sec := coalesce(pr.profile_sections, '{}'::jsonb);
  select coalesce(p.adult_ok, false) into v_adult from public.profiles p where p.id = me;
  v_adult := coalesce(v_adult, false);
  select count(*) into n_ch from public.read_chapters where user_id = pr.id;
  with ok as (
    select s.id, s.slug, s.title, s.cover_path, s.cover_thumb_path, coalesce(s.theme->>'color', '#f2c230') color
    from public.series s where s.published and s.archived_at is null and (not s.adult or v_adult)),
  vis as (select * from ok where not (id = any(pr.hidden_series))),
  rc as (select c.series_id, count(*) n from public.read_chapters x join public.chapters c on c.id = x.chapter_id
         where x.user_id = pr.id and c.deleted_at is null group by c.series_id),
  tot as (select c.series_id, count(*) n from public.chapters c where c.status = 'published' and c.deleted_at is null group by c.series_id),
  done as (select rc.series_id from rc join tot using (series_id) join public.series s on s.id = rc.series_id
           where s.translation_status::text = 'completed' and rc.n >= tot.n),
  reading as (select p.series_id, p.updated_at from public.reading_progress p where p.user_id = pr.id and not pr.hide_reading and p.series_id not in (select series_id from done)),
  plan as (select f.series_id from public.follows f where f.user_id = pr.id and f.series_id not in (select series_id from public.reading_progress where user_id = pr.id) and f.series_id not in (select series_id from done)),
  shelf as (
    select 'reading' k, o.*, rd.updated_at o_at from reading rd join vis o on o.id = rd.series_id
    union all select 'done', o.*, null from done d join vis o on o.id = d.series_id
    union all select 'plan', o.*, null from plan p join vis o on o.id = p.series_id),
  rv as (
    select v.series_id, v.body, v.updated_at, sr.score from public.series_reviews v
    left join public.series_ratings sr on sr.series_id = v.series_id and sr.user_id = v.user_id
    where v.user_id = pr.id and not v.anonymous and v.series_id in (select id from vis))
  select jsonb_build_object(
    'id', pr.id, 'username', pr.username, 'avatar_url', pr.avatar_url, 'bio', pr.bio, 'banner_url', pr.banner_url,
    'kanji', pr.seal_kanji, 'accent', pr.accent, 'since', case when pr.show_since then pr.created_at end, 'sections', sec,
    'links', coalesce((select jsonb_agg(jsonb_build_object('k', e->>'k', 'url', e->>'url')) from jsonb_array_elements(pr.links) e where coalesce((e->>'on')::boolean, true)), '[]'::jsonb),
    'favorites', case when coalesce((sec->>'favs')::boolean, true) then coalesce((select jsonb_agg(to_jsonb(o) order by array_position(pr.favorites, o.id)) from ok o where o.id = any(pr.favorites)), '[]'::jsonb) end,
    'seals', case when coalesce((sec->>'seals')::boolean, true) then jsonb_build_object(
        'donor', pr.donor_tier is not null and (pr.donor_until is null or pr.donor_until > now()),
        'chapters', n_ch,
        'reviews', (select count(*) from rv)) end,
    'shelves', case when coalesce((sec->>'shelves')::boolean, false) then coalesce((
        select jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'items', g.items)) from (
          select s1.k, count(*) n, (select jsonb_agg(z) from (
              select jsonb_build_object('id', s2.id, 'slug', s2.slug, 'title', s2.title, 'cover_path', s2.cover_path, 'cover_thumb_path', s2.cover_thumb_path, 'color', s2.color) z
              from shelf s2 where s2.k = s1.k order by s2.o_at desc nulls last, s2.title limit 6) q) items
          from shelf s1 group by s1.k) g), '{}'::jsonb) end,
    'hide_reading', pr.hide_reading,
    'reviews', case when coalesce((sec->>'reviews')::boolean, false) then coalesce((
        select jsonb_agg(x) from (select jsonb_build_object('stars', v.score, 'body', left(v.body, 400), 'at', v.updated_at,
               'series', jsonb_build_object('slug', o.slug, 'title', o.title, 'cover_path', o.cover_path, 'cover_thumb_path', o.cover_thumb_path, 'color', o.color)) x
          from rv v join ok o on o.id = v.series_id order by v.updated_at desc limit 3) t), '[]'::jsonb) end,
    'public_activity', coalesce(pr.public_activity, false),
    'stats', case when coalesce(pr.public_activity, false) then public.reader_stats(pr.id) end)
  into r;
  return r;
end $$;

-- Buscador de lectores (solo quien activó «Aparecer en la búsqueda»).
create or replace function public.search_readers(p_q text) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('username', username, 'avatar_url', avatar_url, 'kanji', seal_kanji)), '[]'::jsonb) from (
    select username, avatar_url, seal_kanji from public.profiles
    where coalesce(discoverable, false) and delete_requested_at is null and length(trim(p_q)) >= 2
      and (profile_visibility = 'all' or (profile_visibility = 'auth' and auth.uid() is not null))
      and username ilike '%' || trim(p_q) || '%'
    order by length(username), username limit 8) q
$$;
grant execute on function public.search_readers(text) to anon, authenticated;

-- 4. Exportar mis datos
create or replace function public.export_my_data() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Inicia sesión'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'patreon_user_id' from public.profiles p where p.id = u),
    'reading_progress', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.reading_progress x where x.user_id = u),
    'read_chapters', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.read_chapters x where x.user_id = u),
    'reading_history', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.reading_history x where x.user_id = u),
    'follows', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.follows x where x.user_id = u),
    'reviews', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.series_reviews x where x.user_id = u),
    'ratings', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.series_ratings x where x.user_id = u),
    'bookmarks', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.bookmarks x where x.user_id = u),
    'annotations', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]') from public.annotations x where x.user_id = u),
    'reader_prefs', (select to_jsonb(x) - 'user_id' from public.reader_prefs x where x.user_id = u),
    'teams', (select coalesce(jsonb_agg(jsonb_build_object('team', t.name, 'role', m.role)), '[]') from public.team_members m join public.teams t on t.id = m.team_id where m.user_id = u));
end $$;
grant execute on function public.export_my_data() to authenticated;

-- 5. Eliminar cuenta (30 días de gracia). team_members no guardaba fecha de ingreso: se agrega; los actuales quedan empatados y se desempata por nombre.
alter table public.team_members add column if not exists joined_at timestamptz not null default now();

create or replace function private.team_heir(p_team uuid, p_user uuid) returns uuid language sql stable set search_path = '' as $$
  select m.user_id from public.team_members m join public.profiles p on p.id = m.user_id
  where m.team_id = p_team and m.user_id <> p_user and m.role::text = 'admin' and p.delete_requested_at is null
  order by m.joined_at, p.username limit 1
$$;

create or replace function public.deletion_preview() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('requested_at', (select delete_requested_at from public.profiles where id = auth.uid()),
    'teams', coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'heir', (select username from public.profiles where id = private.team_heir(t.id, auth.uid())))), '[]'::jsonb))
  from public.team_members m join public.teams t on t.id = m.team_id where m.user_id = auth.uid() and m.role::text = 'owner'
$$;
grant execute on function public.deletion_preview() to authenticated;

create or replace function public.request_account_deletion() returns timestamptz language plpgsql security definer set search_path = '' as $$
declare d timestamptz;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  update public.profiles set delete_requested_at = coalesce(delete_requested_at, now()) where id = auth.uid() returning delete_requested_at into d;
  return d + interval '30 days';
end $$;
create or replace function public.cancel_account_deletion() returns void language sql security definer set search_path = '' as $$
  update public.profiles set delete_requested_at = null where id = auth.uid();
$$;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

create table if not exists private.deletion_log (user_id uuid, at timestamptz default now(), ok boolean, note text);

create or replace function private.purge_deleted_accounts() returns int language plpgsql security definer set search_path = '' as $$
declare u record; t record; h uuid; n int := 0;
begin
  for u in select id from public.profiles where delete_requested_at < now() - interval '30 days' loop
    begin
      for t in select m.team_id from public.team_members m where m.user_id = u.id and m.role::text = 'owner' loop
        h := private.team_heir(t.team_id, u.id);
        if h is not null then update public.team_members set role = 'owner' where team_id = t.team_id and user_id = h;
        else update public.teams set status = 'En pausa' where id = t.team_id; end if;
      end loop;
      delete from public.translator_requests where user_id = u.id;
      delete from auth.users where id = u.id;
      insert into private.deletion_log (user_id, ok) values (u.id, true); n := n + 1;
    exception when others then
      insert into private.deletion_log (user_id, ok, note) values (u.id, false, sqlerrm);
    end;
  end loop;
  return n;
end $$;

select cron.unschedule('obi-purge-accounts') where exists (select 1 from cron.job where jobname = 'obi-purge-accounts');
select cron.schedule('obi-purge-accounts', '17 4 * * *', 'select private.purge_deleted_accounts()');

-- El inicio cachea reseñas: rehacer la copia para que ya salga con el formato nuevo.
select private.refresh_home();

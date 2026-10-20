-- Moderación de reseñas, preferencias de avisos por obra y recepción de cada obra en el Estudio.

-- ---------- 1. Reportes de reseñas ----------
create table if not exists public.review_reports (
  id bigint generated always as identity primary key,
  series_id uuid not null, author_id uuid not null,
  reporter uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spoiler', 'ofensiva', 'spam', 'otra')),
  note text check (char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz, resolved_by uuid references public.profiles(id) on delete set null,
  foreign key (series_id, author_id) references public.series_reviews(series_id, user_id) on delete cascade
);
create unique index if not exists review_reports_once on public.review_reports (series_id, author_id, reporter) where status = 'open';
alter table public.review_reports enable row level security;
drop policy if exists "rr ins" on public.review_reports; create policy "rr ins" on public.review_reports for insert with check (reporter = auth.uid() and author_id <> auth.uid());
drop policy if exists "rr admin" on public.review_reports; create policy "rr admin" on public.review_reports for select using (private.is_admin() or reporter = auth.uid());

-- Cola del Bibliotecario: reportes abiertos agrupados por reseña.
create or replace function public.admin_review_queue() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(x order by x.last desc) from (
    select rr.series_id, rr.author_id, s.title, s.slug, p.username author, rv.body, rv.updated_at,
      count(*) n, max(rr.created_at) last, jsonb_agg(jsonb_build_object('reason', rr.reason, 'note', rr.note, 'by', pr.username) order by rr.created_at desc) reports
    from public.review_reports rr
    join public.series_reviews rv on rv.series_id = rr.series_id and rv.user_id = rr.author_id
    join public.series s on s.id = rr.series_id
    left join public.profiles p on p.id = rr.author_id left join public.profiles pr on pr.id = rr.reporter
    where rr.status = 'open' group by rr.series_id, rr.author_id, s.title, s.slug, p.username, rv.body, rv.updated_at) x), '[]'::jsonb);
end $$;
grant execute on function public.admin_review_queue() to authenticated;

-- Resolver: 'removed' borra la reseña y avisa al autor; 'dismissed' la deja.
create or replace function public.admin_review_resolve(p_series uuid, p_author uuid, p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare t text; sl text;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_action not in ('removed', 'dismissed') then raise exception 'bad_action'; end if;
  update public.review_reports set status = p_action, resolved_at = now(), resolved_by = auth.uid() where series_id = p_series and author_id = p_author and status = 'open';
  if p_action = 'removed' then
    select title, slug into t, sl from public.series where id = p_series;
    delete from public.series_reviews where series_id = p_series and user_id = p_author;
    insert into public.notifications (user_id, kind, body, link) values (p_author, 'moderacion', 'Se retiró tu reseña de «' || coalesce(t, 'una obra') || '» por no cumplir las normas de la comunidad.', jsonb_build_object('href', '/serie/' || coalesce(sl, '')));
  end if;
end $$;
grant execute on function public.admin_review_resolve(uuid, uuid, text) to authenticated;

-- ---------- 2. Preferencias de avisos por obra ----------
-- follows.channels.web = false → no recibe avisos de capítulos nuevos de esa obra (sigue en su biblioteca).
drop policy if exists "follows own update" on public.follows;
create policy "follows own update" on public.follows for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 3. Recepción de la obra (Estudio) ----------
create or replace function public.series_feedback(p_series uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare tm uuid;
begin
  select team_id into tm from public.series where id = p_series;
  if tm is null or not private.team_can(tm, 'view') then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'avg', (select round(avg(score)::numeric, 2) from public.series_ratings where series_id = p_series),
    'n', (select count(*) from public.series_ratings where series_id = p_series),
    'month', (select count(*) from public.series_ratings where series_id = p_series and updated_at > now() - interval '30 days'),
    'dist', (select jsonb_agg(coalesce(c, 0) order by v) from generate_series(1, 5) v left join (select score, count(*) c from public.series_ratings where series_id = p_series group by score) x on x.score = v),
    'reviews_n', (select count(*) from public.series_reviews where series_id = p_series),
    'reviews', coalesce((select jsonb_agg(r) from (select p.username, left(rv.body, 400) body, rv.updated_at at, sr.score from public.series_reviews rv left join public.profiles p on p.id = rv.user_id left join public.series_ratings sr on sr.series_id = rv.series_id and sr.user_id = rv.user_id where rv.series_id = p_series order by rv.updated_at desc limit 5) r), '[]'::jsonb),
    'ranks', coalesce((select jsonb_agg(jsonb_build_object('list', list, 'period', period, 'pos', pos, 'prev', prev_pos) order by pos) from public.rankings where series_id = p_series and period in ('semana', 'historico') and pos <= 100), '[]'::jsonb));
end $$;
grant execute on function public.series_feedback(uuid) to authenticated;

-- La lista de reseñas incluye el id del autor (para poder reportarla).
create or replace function public.series_reviews_list(p_series uuid, p_limit int default 20) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.mine desc, x.at desc), '[]'::jsonb) from (
    select r.user_id = auth.uid() mine, r.user_id uid, p.username, p.avatar_url, r.body, r.updated_at at, r.created_at, sr.score
    from public.series_reviews r left join public.profiles p on p.id = r.user_id
    left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
    where r.series_id = p_series
    order by (r.user_id = auth.uid()) desc, r.updated_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)) x;
$$;
grant execute on function public.series_reviews_list(uuid, int) to anon, authenticated;

notify pgrst, 'reload schema';

-- Reseñas de obras: una por lector y obra (texto de 30 a 1500 caracteres). Se muestran en la ficha y en el inicio.

create table if not exists public.series_reviews (
  series_id uuid not null references public.series(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 30 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (series_id, user_id)
);
create index if not exists series_reviews_at on public.series_reviews (created_at desc);
alter table public.series_reviews enable row level security;
drop policy if exists "rv read" on public.series_reviews; create policy "rv read" on public.series_reviews for select using (true);
drop policy if exists "rv ins" on public.series_reviews; create policy "rv ins" on public.series_reviews for insert with check (user_id = auth.uid());
drop policy if exists "rv upd" on public.series_reviews; create policy "rv upd" on public.series_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "rv del" on public.series_reviews; create policy "rv del" on public.series_reviews for delete using (user_id = auth.uid() or private.is_admin());

-- Si la tabla antigua `reviews` tiene texto por obra y usuario, se copia.
do $$
declare tcol text;
begin
  if to_regclass('public.reviews') is null then return; end if;
  select column_name into tcol from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name in ('body', 'text', 'content', 'review') limit 1;
  if tcol is null or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'series_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'user_id') then return; end if;
  execute format('insert into public.series_reviews (series_id, user_id, body) select series_id, user_id, left(trim(%1$I::text), 1500) from public.reviews where char_length(trim(coalesce(%1$I::text, ''''))) >= 30 and series_id in (select id from public.series) and user_id in (select id from public.profiles) on conflict do nothing', tcol);
exception when others then raise warning 'No se copiaron reseñas antiguas: %', sqlerrm;
end $$;

-- Reseñas de una obra, con nombre y estrellas del autor de la reseña.
create or replace function public.series_reviews_list(p_series uuid, p_limit int default 20) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.mine desc, x.at desc), '[]'::jsonb) from (
    select r.user_id = auth.uid() mine, p.username, p.avatar_url, r.body, r.updated_at at, r.created_at, sr.score
    from public.series_reviews r left join public.profiles p on p.id = r.user_id
    left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
    where r.series_id = p_series
    order by (r.user_id = auth.uid()) desc, r.updated_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)) x;
$$;
grant execute on function public.series_reviews_list(uuid, int) to anon, authenticated;

-- El inicio ahora lee de series_reviews.
create or replace function public.home_reviews(p_limit int default 6) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select r.series_id, s.slug, s.title, s.cover_path, p.username, left(r.body, 280) body, r.updated_at at, sr.score
    from public.series_reviews r join public.series s on s.id = r.series_id left join public.profiles p on p.id = r.user_id
    left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
    where coalesce(s.published, false)
      and (not coalesce(s.adult, false) or coalesce((select pr.adult_ok from public.profiles pr where pr.id = auth.uid()), false))
    order by r.updated_at desc
    limit least(greatest(coalesce(p_limit, 6), 1), 20)) x;
$$;
grant execute on function public.home_reviews(int) to anon, authenticated;

notify pgrst, 'reload schema';

-- Inicio: destacadas elegidas por el Bibliotecario, fecha en los anuncios de equipo y reseñas recientes.

-- ---------- 1. Destacadas del inicio ----------
alter table public.platform_settings add column if not exists featured jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.platform_settings add constraint platform_settings_featured_chk check (jsonb_typeof(featured) = 'array' and jsonb_array_length(featured) <= 8);
exception when duplicate_object then null; end $$;

-- ---------- 2. Anuncios de equipo con fecha (para ordenarlos en el inicio) ----------
create or replace function public.team_announce_set(p_team uuid, p_announce jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare a jsonb;
begin
  if not private.team_can(p_team, 'profile') then raise exception 'forbidden' using hint = 'Tu rol no permite publicar anuncios'; end if;
  if jsonb_typeof(p_announce) <> 'object' or pg_column_size(p_announce) > 4000 then raise exception 'announce_invalid'; end if;
  a := case when coalesce(p_announce->>'title', '') = '' and coalesce(p_announce->>'text', '') = '' then p_announce - 'at' else p_announce || jsonb_build_object('at', now()) end;
  update public.teams set design = jsonb_set(coalesce(design, '{}'::jsonb), '{announce}', a) where id = p_team;
  update public.team_design_drafts set design = jsonb_set(coalesce(design, '{}'::jsonb), '{announce}', a), updated_at = now() where team_id = p_team;
  perform private.log(p_team, 'edicion', case when a ? 'at' then 'Publicó el anuncio «' || left(coalesce(nullif(a->>'title', ''), a->>'text'), 60) || '»' else 'Quitó el anuncio de la página del equipo' end, '{}', null);
end $$;
revoke all on function public.team_announce_set(uuid, jsonb) from public, anon;
grant execute on function public.team_announce_set(uuid, jsonb) to authenticated;

-- ---------- 3. Reseñas recientes ----------
-- Detecta los nombres de columna de `reviews` (texto y fecha) para no depender de su estructura exacta.
create or replace function public.home_reviews(p_limit int default 6) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare tcol text; dcol text; ok boolean; out jsonb;
begin
  if to_regclass('public.reviews') is null then return '[]'::jsonb; end if;
  select column_name into tcol from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name in ('body', 'text', 'content', 'review') order by array_position(array['body', 'text', 'content', 'review'], column_name::text) limit 1;
  select column_name into dcol from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name in ('created_at', 'updated_at') order by column_name limit 1;
  if tcol is null or dcol is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'series_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'user_id') then return '[]'::jsonb; end if;
  ok := coalesce((select pr.adult_ok from public.profiles pr where pr.id = auth.uid()), false);
  execute format($q$
    select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select r.series_id, s.slug, s.title, s.cover_path, p.username, left(r.%1$I::text, 280) body, r.%2$I at, sr.score
      from public.reviews r join public.series s on s.id = r.series_id left join public.profiles p on p.id = r.user_id
      left join public.series_ratings sr on sr.series_id = r.series_id and sr.user_id = r.user_id
      where coalesce(s.published, false) and (not coalesce(s.adult, false) or $1) and length(trim(coalesce(r.%1$I::text, ''))) > 20
      order by r.%2$I desc limit least(greatest(coalesce($2, 6), 1), 20)) x $q$, tcol, dcol)
    into out using ok, p_limit;
  return out;
end $$;
grant execute on function public.home_reviews(int) to anon, authenticated;

notify pgrst, 'reload schema';

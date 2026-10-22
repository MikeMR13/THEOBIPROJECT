-- El Obi — privacidad por defecto / reparación SEG-01.
-- Basado en funciones reales inspeccionadas en Supabase, sin leer datos personales.
-- Aplicar SOLO después de verificar en backend aislado.
BEGIN;

-- 1. Retirar la lectura directa de campos privados de perfiles.
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;
-- El cliente autenticado necesita filtrar por ID para UPDATE bajo RLS.
GRANT SELECT (id) ON TABLE public.profiles TO authenticated;
DROP POLICY IF EXISTS "profiles read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
-- Conservar "profiles self update" y "profiles admin" existentes.
-- my_profile() y reader_public() mantienen sus contratos seguros.

-- 2. Nombres de colaboradores por equipo; nunca enumeración pública de lectores.
CREATE OR REPLACE FUNCTION public.studio_profile_names(p_ids uuid[])
RETURNS TABLE(id uuid, username text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $obi$
  SELECT p.id,p.username
  FROM public.profiles p
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND p.id = ANY (COALESCE(p_ids, ARRAY[]::uuid[]))
    AND (
      p.id = (SELECT auth.uid())
      OR (SELECT private.is_admin())
      OR EXISTS (
        SELECT 1
        FROM public.team_members viewer
        JOIN public.team_members member ON member.team_id = viewer.team_id
        WHERE viewer.user_id = (SELECT auth.uid()) AND member.user_id = p.id
      )
    )
  ORDER BY p.username
  LIMIT 100
$obi$;
REVOKE ALL ON FUNCTION public.studio_profile_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_profile_names(uuid[]) TO authenticated;

-- 3. Estadísticas: el propietario siempre puede consultar las suyas.
-- Terceros solo si el perfil es visible para su audiencia, con actividad
-- pública habilitada, sin solicitud de eliminación y sin bloqueo.
CREATE OR REPLACE FUNCTION public.reader_stats(p_user uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid := coalesce(p_user, auth.uid()); ok boolean;
begin
  if u is null then return null; end if;
  select (u = auth.uid()) or (
    coalesce(pr.public_activity, false)
    and pr.delete_requested_at is null
    and (
      pr.profile_visibility = 'all'
      or (pr.profile_visibility = 'auth'
          and auth.uid() is not null
          and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
    )
    and not exists (
      select 1 from public.user_blocks b
      where b.user_id = u
        and b.blocked_id = auth.uid()
        and b.kind = 'block'
    )
  )
  into ok from public.profiles pr where pr.id = u;
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
end $function$;

-- 4. Autenticación realmente registrada: las sesiones anónimas de Supabase
-- no pueden consultar carnets configurados "Solo con cuenta".
CREATE OR REPLACE FUNCTION public.search_readers(p_q text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('username', username, 'avatar_url', avatar_url, 'kanji', seal_kanji)), '[]'::jsonb) from (
    select username, avatar_url, seal_kanji from public.profiles
    where coalesce(discoverable, false) and delete_requested_at is null and length(trim(p_q)) >= 2
      and (profile_visibility = 'all' or (profile_visibility = 'auth' and auth.uid() is not null and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)))
      and username ilike '%' || trim(p_q) || '%'
    order by length(username), username limit 8) q
$function$;
CREATE OR REPLACE FUNCTION private.reader_public_core(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pr public.profiles; sec jsonb; v_adult boolean; n_ch bigint; r jsonb; me uuid := auth.uid();
begin
  select * into pr from public.profiles where lower(username) = lower(p_username) limit 1;
  if pr.id is null or pr.delete_requested_at is not null then return null; end if;
  if pr.id is distinct from me and (pr.profile_visibility = 'none' or (pr.profile_visibility = 'auth' and (me is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)))) then
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
end $function$;

-- 5. RPC sensibles requieren una sesión autenticada.
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deletion_preview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.favorite_candidates(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.patreon_unlink() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.patreon_begin(text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.patreon_disconnect(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_queue() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_resolve(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deletion_preview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.favorite_candidates(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.patreon_unlink() TO authenticated;
GRANT EXECUTE ON FUNCTION public.patreon_begin(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.patreon_disconnect(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_resolve(uuid,uuid,text) TO authenticated;

COMMIT;

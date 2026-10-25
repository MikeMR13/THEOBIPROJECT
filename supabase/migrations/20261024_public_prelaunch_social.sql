-- SEO de preestrenos: exposición explícita y mínima, sin publicar volúmenes.
-- La función devuelve solo campos editoriales ya visibles en el anuncio público.
-- No devuelve capítulos, tokens, diseños internos ni metadatos de equipos privados.
create or replace function public.public_prelaunch_social(p_slug text)
returns jsonb
language sql stable security definer
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'id', s.id,
    'team_id', s.team_id,
    'slug', s.slug,
    'title', s.title,
    'synopsis', s.synopsis,
    'cover_path', s.cover_path,
    'cover_thumb_path', s.cover_thumb_path,
    'author', s.author,
    'genres', s.genres,
    'seo', coalesce(s.theme -> 'seo', '{}'::jsonb),
    'team_name', t.name
  )
  from public.series s
  join public.teams t on t.id = s.team_id
  where s.slug = p_slug
    and s.published is false
    and s.access = 'public'
    and s.adult is not true
    and s.archived_at is null
    and s.translation_status not in ('abandoned','withdrawn')
    and t.status <> 'Proyecto privado'
    and exists (
      select 1 from public.volumes v
      where v.series_id = s.id and v.deleted_at is null
        and v.access = 'public'
        and v.status = 'scheduled'
        and v.announce_prelaunch is true
        and v.published_at > now()
    )
  limit 1;
$function$;
revoke all on function public.public_prelaunch_social(text) from public;
grant execute on function public.public_prelaunch_social(text) to anon, authenticated;
comment on function public.public_prelaunch_social(text) is
  'Metadatos seguros de ficha de preestreno anunciado. No libera volumen ni capítulo.';

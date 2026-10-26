-- Cambia exclusivamente el filtro de visibilidad de dos funciones de metadatos.
-- Las URLs reales se controlan además por public.download_open().
-- Este SQL es candidato para QA; no se aplica a producción.
begin;

do $preflight$
declare v_name text; v_oid oid;
begin
  foreach v_name in array array['series_downloads','series_downloads_v2'] loop
    select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname=v_name
       and pg_get_function_identity_arguments(p.oid)='p_series uuid'
       and p.prosecdef and pg_get_userbyid(p.proowner)='postgres'
       and p.prosrc like '%where d.series_id = p_series and s.archived_at is null%'
       and p.prosrc not like '%and exists (%public.volumes v%';
    if v_oid is null then
      raise exception 'La definición de public.%(uuid) ha cambiado; detener',v_name;
    end if;
  end loop;
end $preflight$;

CREATE OR REPLACE FUNCTION public.series_downloads(p_series uuid)
 RETURNS TABLE(id bigint, volume_id uuid, vol integer, fmt text, provider text, label text, donor_only boolean, locked boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
         false,
         d.patreon_only and not (
           private.in_team(s.team_id) or private.is_team_patron(s.team_id)
         )
  from public.download_links d
  join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
    and (
      private.in_team(s.team_id)
      or (
        coalesce(s.published,false)
        and exists (
          select 1 from public.volumes v
          where v.series_id = d.series_id
            and (v.id = d.volume_id or (d.volume_id is null and v.num = d.vol))
            and v.deleted_at is null
            and v.status = 'published'
            and (v.published_at is null or v.published_at <= now())
        )
      )
    )
  order by d.vol, d.sort, d.id
$function$
;

CREATE OR REPLACE FUNCTION public.series_downloads_v2(p_series uuid)
 RETURNS TABLE(id bigint, volume_id uuid, vol integer, fmt text, provider text, label text, donor_only boolean, patreon_only boolean, locked boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
         false, d.patreon_only,
         d.patreon_only and not (
           private.in_team(s.team_id) or private.is_team_patron(s.team_id)
         )
  from public.download_links d
  join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
    and (
      private.in_team(s.team_id)
      or (
        coalesce(s.published,false)
        and exists (
          select 1 from public.volumes v
          where v.series_id = d.series_id
            and (v.id = d.volume_id or (d.volume_id is null and v.num = d.vol))
            and v.deleted_at is null
            and v.status = 'published'
            and (v.published_at is null or v.published_at <= now())
        )
      )
    )
  order by d.vol, d.sort, d.id
$function$
;

commit;

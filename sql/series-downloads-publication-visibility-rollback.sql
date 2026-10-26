-- Rollback a definiciones anteriores; reabre metadatos de borradores.
begin;
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
  order by d.vol, d.sort, d.id
$function$
;
commit;

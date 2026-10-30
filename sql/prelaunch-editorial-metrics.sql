-- Métricas editoriales de preestrenos: agregados por obra y solo para el equipo.
-- Sin tablas, logs, seguimiento de visitas, cron jobs ni datos personales.
-- El alcance de una obra se determina por el mismo predicado público endurecido.
create or replace function public.prelaunch_team_metrics(p_team uuid)
returns table(series_id uuid, followers bigint, pending_reminders bigint)
language plpgsql stable security definer
set search_path = ''
as $body$
begin
  if auth.uid() is null or p_team is null or not private.team_can(p_team, 'view') then
    raise exception 'forbidden_prelaunch_metrics' using errcode = '42501';
  end if;

  return query
    with announced as (
      select distinct s.id
      from public.series s
      join public.volumes v on v.series_id = s.id
      where s.team_id = p_team
        and private.prelaunch_public_series(s.id)
        and v.announce_prelaunch is true
        and v.status = 'scheduled'
        and v.deleted_at is null
        and v.access = 'public'
        and v.published_at > now()
    )
    select a.id,
      (select count(*) from public.follows f where f.series_id = a.id)::bigint,
      (select count(*) from public.reminders r
        where r.series_id = a.id
          and r.kind = 'volp'
          and r.sent_at is null
          and exists (
            select 1 from public.volumes v
            where v.series_id = a.id
              and v.announce_prelaunch is true
              and v.status = 'scheduled'
              and v.deleted_at is null
              and v.access = 'public'
              and v.published_at > now()
              and v.published_at = r.at
          ))::bigint
    from announced a
    order by a.id;
end;
$body$;

revoke all on function public.prelaunch_team_metrics(uuid) from public, anon, authenticated;
grant execute on function public.prelaunch_team_metrics(uuid) to authenticated;

-- Recomendaciones efímeras del carrusel: una obra por equipo durante siete días.
-- El filtro de lectura hace que una obra caduque exactamente al alcanzar el plazo;
-- pg_cron limpia físicamente los registros con un máximo de un minuto de demora.
create index if not exists team_featured_series_updated_at_idx
  on public.team_featured_series(updated_at);

drop policy if exists team_feature_public_read on public.team_featured_series;
create policy team_feature_public_read on public.team_featured_series
  for select to anon, authenticated
  using (
    updated_at <= now()
    and updated_at > now() - interval '7 days'
    and exists (
      select 1 from public.series s
      where s.id=series_id
        and s.team_id=team_id
        and s.published=true
        and s.archived_at is null
        and s.translation_status not in ('abandoned','withdrawn')
    )
  );

-- «Destacar» sobre otra obra ya restablece los 7 días mediante el UPSERT original.
-- Eliminamos registros caducados aunque nadie visite Inicio ni Estudio.
select cron.schedule(
  'obi-team-featured-expire',
  '* * * * *',
  $$delete from public.team_featured_series where updated_at <= now() - interval '7 days'$$
);

comment on table public.team_featured_series is
  'Una obra destacada por equipo, visible exactamente siete días desde updated_at; expiración por RLS y limpieza automática cada minuto.';

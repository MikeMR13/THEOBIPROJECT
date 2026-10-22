-- Corregir la referencia ambigua de team_id en la política de lectura.
-- Usar la columna explícita de la tabla de recomendaciones, nunca s.team_id = s.team_id.
drop policy if exists team_feature_public_read on public.team_featured_series;
create policy team_feature_public_read on public.team_featured_series
  for select to anon, authenticated
  using (
    public.team_featured_series.updated_at <= now()
    and public.team_featured_series.updated_at > now() - interval '7 days'
    and exists (
      select 1 from public.series as s
      where s.id = public.team_featured_series.series_id
        and s.team_id = public.team_featured_series.team_id
        and s.published = true
        and s.archived_at is null
        and s.translation_status not in ('abandoned','withdrawn')
    )
  );

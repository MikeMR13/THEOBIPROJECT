-- Corrección: al crear capítulos (INSERT … RETURNING) la regla de lectura no veía la fila nueva y rechazaba la operación.
-- Esta regla permite al equipo leer sus capítulos usando las columnas de la propia fila.
drop policy if exists "chapters read team" on public.chapters;
create policy "chapters read team" on public.chapters for select using (private.in_team(private.series_team(series_id)));

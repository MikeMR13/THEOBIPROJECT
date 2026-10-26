-- Reversión específica del candidato sql/home-snapshot-row-level-invalidation.sql
-- Solo tras revisión; ejecutar en una transacción y verificar esquema.
-- La reversión restaura la invalidación por sentencia (incluye UPDATE sin filas).

begin;

drop trigger chapters_home_stale on public.chapters;
create trigger chapters_home_stale
  after insert or update or delete on public.chapters
  for each statement execute function private.home_stale();

drop trigger series_home_stale on public.series;
create trigger series_home_stale
  after insert or update or delete on public.series
  for each statement execute function private.home_stale();

drop trigger volumes_home_stale on public.volumes;
create trigger volumes_home_stale
  after insert or update or delete on public.volumes
  for each statement execute function private.home_stale();

commit;

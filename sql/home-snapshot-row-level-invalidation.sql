-- El Obi del Lector: propuesta de corrección para la invalidación de Inicio.
-- CANDIDATO DE QA: ejecutar solamente en una base aislada primero.
--
-- Problema: los triggers AFTER ... FOR EACH STATEMENT de chapters,
-- series y volumes invalidan home_snapshot aunque UPDATE afecte cero filas.
-- private.run_publications() ejecuta UPDATEs cada minuto incluso sin estrenos.
--
-- Este parche NO cambia la función private.home_stale(), el cron ni home_feed().
-- Conserva la invalidación inmediata cuando realmente existe una fila afectada.
-- Antes de desplegar, generar la migración oficial con Supabase CLI
-- y seguir el procedimiento documentado en docs/QA-HOME-SNAPSHOT-ROW-TRIGGERS.md.

begin;

do $preflight$
declare table_name text;
begin
  foreach table_name in array array['chapters', 'series', 'volumes'] loop
    if not exists (
      select 1
      from pg_catalog.pg_trigger tr
      join pg_catalog.pg_class rel on rel.oid = tr.tgrelid
      join pg_catalog.pg_namespace ns on ns.oid = rel.relnamespace
      where ns.nspname = 'public'
        and rel.relname = table_name
        and tr.tgname = table_name || '_home_stale'
        and tr.tgfoid = 'private.home_stale()'::regprocedure
        and not tr.tgisinternal
        and pg_catalog.pg_get_triggerdef(tr.oid) like '%FOR EACH STATEMENT%'
    ) then
      raise exception 'El trigger %.% no coincide con la versión esperada; detener despliegue', 'public', table_name;
    end if;
  end loop;
end
$preflight$;

drop trigger chapters_home_stale on public.chapters;
create trigger chapters_home_stale
  after insert or update or delete on public.chapters
  for each row execute function private.home_stale();

drop trigger series_home_stale on public.series;
create trigger series_home_stale
  after insert or update or delete on public.series
  for each row execute function private.home_stale();

drop trigger volumes_home_stale on public.volumes;
create trigger volumes_home_stale
  after insert or update or delete on public.volumes
  for each row execute function private.home_stale();

commit;

-- PROPUESTA PARA REVISIÓN, NO ES UNA MIGRACIÓN Y NO DEBE EJECUTARSE EN PRODUCCIÓN SIN VALIDACIÓN.
-- El Obi del Lector / THEOBIPROJECT
--
-- Situación verificada por lectura de definición remota:
--   public.track_view() -> UPDATE public.series SET views = views + 1
--   AFTER UPDATE (cualquier columna) -> private.home_stale()
--   home_stale -> UPDATE private.home_snapshot SET built_at='-infinity'
-- Al invalidarse continuamente, public.home_feed() reconstruye el JSON frecuentemente.
--
-- Comportamiento deseado: los contadores de vistas pueden esperar al siguiente cron
-- obi-home-snapshot (cada cinco minutos). Los cambios editoriales sí invalidan al instante.
--
-- APLICAR SOLO EN BASE AISLADA DESPUÉS DE TOMAR UN BACKUP Y VERIFICAR EL ESQUEMA:
create or replace trigger series_home_stale
after insert or delete or update of
  team_id, slug, title, short, original, author, synopsis, genres, theme,
  cover_path, cover_thumb_path, adult, work_type, translation_status, published
on public.series
for each statement execute function private.home_stale();

-- Verificar definición de trigger (lectura):
select pg_get_triggerdef(oid)
from pg_trigger
where tgrelid = 'public.series'::regclass
  and tgname = 'series_home_stale' and not tgisinternal;

-- EN BASE AISLADA: comprobar al hacer una visita que un UPDATE de views
-- no altera built_at; editar titulo/cubierta sí invalida; cron lo refresca.
-- Confirmar que el home incluye el conteo actualizado después del cron.
--
-- REVERSIÓN: restaurar trigger original (también solo en entorno autorizado):
-- create or replace trigger series_home_stale
-- after insert or delete or update on public.series
-- for each statement execute function private.home_stale();

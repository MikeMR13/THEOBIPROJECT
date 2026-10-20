-- Fase 2: invalidación selectiva de home_snapshot.
-- PROPUESTA VERSIONADA. NO se aplica automáticamente a la base remota.
-- Compatible con PostgreSQL 17 y el código SQL nativo utilizado por el proyecto.
--
-- Línea base verificada:
--   public.track_view() incrementa series.views
--   series_home_stale ejecutaba private.home_stale() en TODOS los UPDATE
--   el cron obi-home-snapshot reconstruye home_snapshot cada 5 minutos
--
-- En la publicación este script debe convertirse en migración CLI con
-- un nombre/orden compatible con el historial remoto, tras prueba en staging.
-- El trigger viejo se conserva ante error dentro de una migración transaccional.

create or replace trigger series_home_stale
after insert or delete or update of
  id, team_id, slug, title, short, original, author, work_type, status,
  genres, synopsis, adult, warnings, theme, cover_path, official_url,
  official_verified, created_at, original_status, translation_status,
  sequel_status, final_volume, archived_at, demographic, published,
  legacy_id, tags, illustrator, publisher, title_romaji,
  cover_thumb_path, relations, media, access, access_min_price, access_until
on public.series
for each statement execute function private.home_stale();

-- La columna views se excluye intencionadamente. El contador de vistas en
-- home_feed estará actualizado después del próximo refresco del cron.
-- Las modificaciones editoriales de cualquier columna existente sí invalidan
-- inmediatamente. Revisar esta lista cuando se añadan columnas a series.

-- Comprobación posterior (solo lectura):
select pg_get_triggerdef(t.oid) as trigger_sql
from pg_trigger t
where t.tgrelid = 'public.series'::regclass and t.tgname='series_home_stale'
  and not t.tgisinternal;

-- Reversión si se observa una regresión, en una migración de rollback controlada:
-- create or replace trigger series_home_stale
-- after insert or delete or update on public.series
-- for each statement execute function private.home_stale();

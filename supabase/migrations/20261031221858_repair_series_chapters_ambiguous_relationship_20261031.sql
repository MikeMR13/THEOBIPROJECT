-- Reparación aplicada en Supabase el 2026-10-31 (versión 20261031221858).
-- No reescribe novelas ni progreso. La FK inversa series->chapters
-- introducida en 20261031220515 produce PGRST201/HTTP 300 en
-- series.select('...,chapters(count),...') de las fichas públicas.
ALTER TABLE public.series
  DROP CONSTRAINT IF EXISTS series_reading_start_same_series_fk;

-- El índice compuesto solo servía a la FK inversa.
ALTER TABLE public.chapters
  DROP CONSTRAINT IF EXISTS chapters_series_start_pair_unique;

CREATE OR REPLACE FUNCTION private.validate_series_reading_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.reading_start_chapter_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.chapters c
       WHERE c.id = NEW.reading_start_chapter_id
         AND c.series_id = NEW.id
         AND c.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION 'reading_start_chapter_invalid'
      USING ERRCODE = '23503',
            DETAIL = 'El inicio editorial debe pertenecer a esta novela y no estar eliminado.';
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS series_reading_start_validate ON public.series;
CREATE TRIGGER series_reading_start_validate
  BEFORE INSERT OR UPDATE OF reading_start_chapter_id
  ON public.series
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_series_reading_start();

COMMENT ON FUNCTION private.validate_series_reading_start() IS
  'Valida pertenencia del inicio editorial sin FK inversa que vuelva ambiguas las consultas PostgREST series->chapters.';

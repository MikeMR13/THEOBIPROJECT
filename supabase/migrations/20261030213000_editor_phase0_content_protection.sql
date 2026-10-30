-- Fase 0 del editor: copia recuperable, guardia de bloques y versiones al importar.
-- Deliberadamente NO altera chapters.body, estado, numeración, rutas ni permisos.
-- La copia histórica no reemplaza una copia de seguridad externa de toda la base.
BEGIN;

-- Distinguir estados recuperados de las versiones del editor existentes.
ALTER TABLE public.chapter_revisions
  DROP CONSTRAINT chapter_revisions_kind_check;
ALTER TABLE public.chapter_revisions
  ADD CONSTRAINT chapter_revisions_kind_check
  CHECK (kind IN ('manual','auto','restore','publish','baseline','import','before_import'));

-- Verificar tipos conocidos y el límite que ya utiliza save_chapter.
CREATE OR REPLACE FUNCTION private.editor_phase0_valid_body(p_body jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p_body IS NULL OR jsonb_typeof(p_body) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(p_body) > 6000 OR pg_column_size(p_body) > 3000000 THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_body) AS x(block)
    WHERE jsonb_typeof(x.block) IS DISTINCT FROM 'object'
       OR NOT (x.block ? 'type' OR x.block ? 't')
       OR coalesce(x.block->>'type', x.block->>'t', '') NOT IN
          ('paragraph','p','heading','h','quote','note','separator','sep','image','img','ruby')
  ) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

-- Un UPDATE directo del importador no pasaba por save_chapter y no versionaba.
-- La escritura de la versión previa y nueva sucede en la MISMA transacción del UPDATE.
-- save_chapter ya incrementa version y conserva su propia política de snapshots.
CREATE OR REPLACE FUNCTION private.editor_phase0_guard_body()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.editor_phase0_valid_body(NEW.body) THEN
    RAISE EXCEPTION 'body_invalid' USING ERRCODE = '22023',
      HINT = 'El capítulo contiene tipos de bloque desconocidos o excede los límites';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (NEW.body IS DISTINCT FROM OLD.body OR NEW.title IS DISTINCT FROM OLD.title)
       AND NEW.version = OLD.version THEN
    -- La versión actual puede no tener historial: protegerla antes del reemplazo.
    INSERT INTO public.chapter_revisions
      (chapter_id, created_by, title, body, note, kind, version, lint_count)
    SELECT OLD.id, auth.uid(), OLD.title, OLD.body,
           'Estado anterior a reemplazo; preservado sin editar la versión publicada',
           'before_import', OLD.version, OLD.lint_count
    WHERE NOT EXISTS (
      SELECT 1 FROM public.chapter_revisions r
      WHERE r.chapter_id = OLD.id AND r.version = OLD.version
        AND r.body = OLD.body AND r.title IS NOT DISTINCT FROM OLD.title
    );

    NEW.version := OLD.version + 1;
    INSERT INTO public.chapter_revisions
      (chapter_id, created_by, title, body, note, kind, version, lint_count)
    VALUES
      (NEW.id, auth.uid(), NEW.title, NEW.body,
       'Estado tras reemplazo directo del contenido', 'import',
       NEW.version, NEW.lint_count);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.editor_phase0_initial_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.chapter_revisions
    (chapter_id, created_by, title, body, note, kind, version, lint_count)
  VALUES
    (NEW.id, auth.uid(), NEW.title, NEW.body,
     'Estado inicial creado con el capítulo; no es el archivo original de importación',
     'import', NEW.version, NEW.lint_count);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chapters_editor_phase0_guard ON public.chapters;
CREATE TRIGGER chapters_editor_phase0_guard
  BEFORE INSERT OR UPDATE OF body, title ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION private.editor_phase0_guard_body();

DROP TRIGGER IF EXISTS chapters_editor_phase0_initial ON public.chapters;
CREATE TRIGGER chapters_editor_phase0_initial
  AFTER INSERT ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION private.editor_phase0_initial_revision();

REVOKE ALL ON FUNCTION private.editor_phase0_valid_body(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.editor_phase0_guard_body() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.editor_phase0_initial_revision() FROM PUBLIC, anon, authenticated;

-- Backfill sin incrementar chapters.version: preserva también los archivados.
-- Una revisión previa equivalente se respeta. No se finge reconstruir el EPUB.
INSERT INTO public.chapter_revisions
  (chapter_id, created_by, title, body, note, kind, version, lint_count)
SELECT c.id, NULL, c.title, c.body,
       'Estado recuperado el 2026-10-30; no representa el EPUB original',
       'baseline', c.version, c.lint_count
FROM public.chapters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chapter_revisions r
  WHERE r.chapter_id = c.id AND r.version = c.version
    AND r.body = c.body AND r.title IS NOT DISTINCT FROM c.title
);

-- Evitar declarar la migración terminada si algún capítulo queda sin copia fiel.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chapters c WHERE NOT EXISTS (
      SELECT 1 FROM public.chapter_revisions r
      WHERE r.chapter_id = c.id AND r.version = c.version
        AND r.body = c.body AND r.title IS NOT DISTINCT FROM c.title
    )
  ) THEN RAISE EXCEPTION 'editor_phase0_backfill_incomplete'; END IF;
END;
$$;
COMMIT;

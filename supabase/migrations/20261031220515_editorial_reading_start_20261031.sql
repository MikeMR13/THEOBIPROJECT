-- No cambia capítulos, progreso ni números internos ya guardados.
-- Aplicar ANTES de desplegar el código que consulta reading_start_chapter_id.
ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_section_type_check;
ALTER TABLE public.chapters ADD CONSTRAINT chapters_section_type_check
  CHECK (section_type IN (
    'Portada', 'Créditos', 'Sinopsis', 'Índice', 'Dedicatoria', 'Ilustraciones',
    'Prólogo', 'Capítulo', 'Interludio', 'Epílogo', 'Afterword', 'Extra',
    'Episodio corto', 'Avance', 'Agradecimientos', 'Nota editorial'
  ));

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS reading_start_chapter_id uuid;

-- Evita asignar como inicio una sección perteneciente a otra novela.
ALTER TABLE public.chapters
  ADD CONSTRAINT chapters_series_start_pair_unique UNIQUE (series_id, id);
ALTER TABLE public.series
  ADD CONSTRAINT series_reading_start_same_series_fk
  FOREIGN KEY (id, reading_start_chapter_id)
  REFERENCES public.chapters(series_id, id)
  ON DELETE SET NULL (reading_start_chapter_id);

COMMENT ON COLUMN public.series.reading_start_chapter_id IS
  'Punto de inicio editorial opcional para lecturas nuevas. Nunca modifica reading_progress.';

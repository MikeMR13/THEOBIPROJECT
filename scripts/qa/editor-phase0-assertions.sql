-- Respaldo privado independiente de borrados en chapters y checksum estable.
DO $$
BEGIN
 IF (SELECT count(*) FROM private.editor_phase0_backups) <> 2
 THEN RAISE EXCEPTION 'No generó copias privadas iniciales'; END IF;
 IF EXISTS (SELECT 1 FROM private.editor_phase0_backups WHERE checksum <> md5(snapshot::text))
 THEN RAISE EXCEPTION 'Checksum del respaldo inválido'; END IF;
 IF has_table_privilege('anon','private.editor_phase0_backups','SELECT')
 THEN RAISE EXCEPTION 'Respaldo expuesto al rol anónimo'; END IF;
 IF (SELECT snapshot->>'title' FROM private.editor_phase0_backups
     WHERE chapter_id='00000000-0000-0000-0000-000000000001') <> 'Capítulo sin historial'
 THEN RAISE EXCEPTION 'Copia privada no preservó origen'; END IF;
END $$;

-- Aserciones transaccionales tras migración: no necesita datos reales.
DO $$
BEGIN
 IF (SELECT count(*) FROM public.chapter_revisions) <> 2
 THEN RAISE EXCEPTION 'No preservó historia previa y backfill'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.chapter_revisions
   WHERE chapter_id='00000000-0000-0000-0000-000000000001'
     AND kind='baseline' AND version=1
     AND body='[{"type":"paragraph","text":"Antes"}]'::jsonb)
 THEN RAISE EXCEPTION 'Snapshot inicial ausente'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.chapter_revisions
   WHERE chapter_id='00000000-0000-0000-0000-000000000002'
     AND kind='manual' AND version=1)
 THEN RAISE EXCEPTION 'La revisión original fue alterada'; END IF;
 IF EXISTS (SELECT 1 FROM public.chapters WHERE version <> 1)
 THEN RAISE EXCEPTION 'Backfill alteró la numeración interna'; END IF;
END $$;

-- Inserción normal crea historia en la misma operación.
INSERT INTO public.chapters (id,title,body) VALUES
 ('00000000-0000-0000-0000-000000000003','Nuevo',
  '[{"type":"image","url":"media/a.png","alt":""}]'::jsonb);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.chapter_revisions
     WHERE chapter_id='00000000-0000-0000-0000-000000000003' AND kind='import') <> 1
 THEN RAISE EXCEPTION 'INSERT sin versión inicial'; END IF;
END $$;

-- Un tipo desconocido y un contenido no arreglo deben rechazarse sin afectar capítulos.
DO $$
DECLARE blocked boolean := false;
BEGIN
 BEGIN
  INSERT INTO public.chapters (id,title,body) VALUES
    ('00000000-0000-0000-0000-000000000004','Inválido',
     '[{"type":"script","text":"x"}]'::jsonb);
 EXCEPTION WHEN SQLSTATE '22023' THEN blocked := true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Aceptó bloque desconocido'; END IF;
 blocked := false;
 BEGIN
  UPDATE public.chapters SET body='{"type":"paragraph"}'::jsonb
  WHERE id='00000000-0000-0000-0000-000000000003';
 EXCEPTION WHEN SQLSTATE '22023' THEN blocked := true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Aceptó contenido fuera de arreglo'; END IF;
END $$;

-- Reemplazo directo conserva contenido previo y nueva versión.
UPDATE public.chapters SET body='[{"type":"paragraph","text":"Después"}]'::jsonb
 WHERE id='00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
 IF (SELECT version FROM public.chapters
     WHERE id='00000000-0000-0000-0000-000000000001') <> 2
 THEN RAISE EXCEPTION 'No incrementó versión al reemplazar'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.chapter_revisions
     WHERE chapter_id='00000000-0000-0000-0000-000000000001'
       AND version=1 AND body='[{"type":"paragraph","text":"Antes"}]'::jsonb)
 THEN RAISE EXCEPTION 'Se perdió el texto previo'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.chapter_revisions
     WHERE chapter_id='00000000-0000-0000-0000-000000000001'
       AND version=2 AND kind='import'
       AND body='[{"type":"paragraph","text":"Después"}]'::jsonb)
 THEN RAISE EXCEPTION 'Falta revisión del texto reemplazado'; END IF;
END $$;

-- Cambiar solo el título también debe ser recuperable.
UPDATE public.chapters SET title='Nuevo título'
 WHERE id='00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
 IF (SELECT version FROM public.chapters
     WHERE id='00000000-0000-0000-0000-000000000001') <> 3
 THEN RAISE EXCEPTION 'El título directo no quedó versionado'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.chapter_revisions
     WHERE chapter_id='00000000-0000-0000-0000-000000000001'
       AND version=3 AND title='Nuevo título')
 THEN RAISE EXCEPTION 'Falta revisión del título nuevo'; END IF;
END $$;

-- Actualizaciones del editor que YA incrementan version no duplican snapshots.
UPDATE public.chapters SET body='[{"type":"heading","text":"Guardado RPC"}]'::jsonb,
   version=version+1
 WHERE id='00000000-0000-0000-0000-000000000002';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.chapter_revisions
     WHERE chapter_id='00000000-0000-0000-0000-000000000002') <> 1
 THEN RAISE EXCEPTION 'Se duplicó la política de save_chapter'; END IF;
END $$;

-- Una transacción abortada no deja revisiones huérfanas ni modifica contenido.
BEGIN;
UPDATE public.chapters SET body='[{"type":"paragraph","text":"Temporal"}]'::jsonb
 WHERE id='00000000-0000-0000-0000-000000000001';
ROLLBACK;
DO $$
BEGIN
 IF (SELECT version FROM public.chapters
     WHERE id='00000000-0000-0000-0000-000000000001') <> 3
 OR EXISTS (SELECT 1 FROM public.chapter_revisions
     WHERE chapter_id='00000000-0000-0000-0000-000000000001'
       AND body='[{"type":"paragraph","text":"Temporal"}]'::jsonb)
 THEN RAISE EXCEPTION 'Rollback dejó residuos'; END IF;
END $$;
-- Una copia privada permanece aunque se borre el registro (y su historial en cascada).
DELETE FROM public.chapters WHERE id='00000000-0000-0000-0000-000000000002';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM private.editor_phase0_backups
   WHERE chapter_id='00000000-0000-0000-0000-000000000002')
 THEN RAISE EXCEPTION 'Copia perdida al borrar capítulo'; END IF;
END $$;
SELECT 'EDITOR_PHASE0_OK' AS result;

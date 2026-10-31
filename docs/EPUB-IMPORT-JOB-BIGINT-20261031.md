# Corrección del error «Directorio o trabajo de importación inválido»

Fecha: 31/10/2026. Corrección concreta del importador EPUB sobre la versión de producción que ya reutiliza fuentes por SHA-256.

## Causa confirmada
La función `makeImportUploadPath(dir, job.id)` validaba `job.id` como UUID, cuando la tabla real `public.import_jobs` de Supabase lo define como `bigint` con `nextval('import_jobs_id_seq')`. Una consulta de solo lectura confirmó que todos los trabajos actuales tienen identificadores numéricos (50 filas en el corte de la auditoría). Por ello, incluso antes de procesar la primera imagen, el importador lanzaba «Directorio o trabajo de importación inválido» y realizaba el rollback.

## Solución
- `importJobStorageKey` convierte identificadores bigint positivos (number seguro, bigint o string decimal sin ceros iniciales) en sufijos seguros `jN`. Se aceptan hasta `9223372036854775807`, límite de PostgreSQL `int8`.
- Se mantiene compatibilidad con UUID para otros llamadores, y se rechazan números negativos, decimales, valores no seguros, rutas con traversal y otros valores no válidos.
- Se mantiene `upsert:false`, el sufijo de secuencia por archivo y el rollback que solo elimina multimedia realmente subida.
- No se cambian el esquema, la tabla, permisos, fuentes reutilizadas, imágenes existentes, capítulos ni archivos almacenados.

## QA
`scripts/epub-import-job-bigint-check.mjs`: rutas con ID numérico real, 10 secciones con imágenes de nombre repetido, evitar colisiones, rollback seguro, UUID previos y entradas inválidas. GitHub Actions ejecuta esta regresión junto con el CI, prueba de fuentes por SHA-256, prueba de `KeyAlreadyExist` y recorrido de navegador del importador.

No se utiliza Supabase real durante el test. **Validación adicional pendiente:** repetir con una cuenta de editor y el EPUB que presentó el mensaje en producción.

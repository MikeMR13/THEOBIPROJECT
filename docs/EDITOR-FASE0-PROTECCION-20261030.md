# Editor — Fase 0: protección del contenido (30 de octubre de 2026)

## Estado de entrega
- Rama aislada desde `main` (`b5b1e4a`).
- **Aplicada** la migración a Supabase en producción y verificadas sus invariantes; la interfaz del lector permanece sin cambios hasta fusionar la rama.
- Implementación: migración `20261030205428_editor_phase0_content_protection_20261030.sql`, etiqueta de historial y QA PostgreSQL aislado.
- Objetivo: conservar el contenido ya presente y proteger futuras importaciones/reemplazos con el mínimo cambio de arquitectura.

## Datos previos observados (solo lectura)
- 490 capítulos en `chapters`: 455 activos y 35 archivados.
- Solo una revisión en `chapter_revisions`.
- Textos almacenados: ~9 MB; tamaño global de BD ~44 MB.
- Las 454 fichas activas sin historial no contienen el EPUB original recuperable.
- Antes de aplicar revisar cuotas actuales de almacenamiento y límites de plan. No se autoriza ampliación facturable.

## Comportamiento
1. La migración crea `private.editor_phase0_backups` sin FK a `chapters`: guarda una sola copia por ID, el JSON completo del capítulo y `md5(snapshot::text)`. No crea una API pública ni da privilegios de lectura a `anon` o `authenticated`.
2. Inserta en `chapter_revisions` una fila `baseline` cuando el cuerpo+título+versión actual no tengan revisión fiel, tanto en capítulos activos como archivados; conserva revisiones existentes. **No cambia `chapters`** durante la migración.
3. Cada nuevo capítulo INSERT recibe `kind='import'` en el mismo commit de PostgreSQL.
4. Un UPDATE directo de texto o título que no modifique explícitamente `version` conserva el estado previo (si aún no existe) y el nuevo, e incrementa la versión. Esto cubre el reemplazo del importador, que antes actualizaba `body` directamente.
5. Un guardia BEFORE rechaza contenido no-array, más de 6000 bloques, más de 3 MB y tipos de bloque desconocidos. Se admiten los tipos y alias que lee `src/blocks.js`.
6. `save_chapter` sigue intacto: modifica `version` explícitamente y mantiene su esquema previo de revisiones manuales o periódicas. La migración no añade un snapshot por cada autoguardado.

## Alcance y límites
- No incluye EPUB fuente, imágenes binarias ni copia fuera del propio proyecto Supabase. El respaldo privado **no** protege frente a pérdida total de la BD. Para recuperación ante desastre seguir usando exportación/copia externa autorizada.
- Los cambios de otros campos que no sean título/cuerpo (por ejemplo `status`) siguen los procesos existentes; el respaldo inicial sí captura los campos existentes en su fecha.
- Las escrituras directas externas que alteren explícitamente `version` deben pasar por sus RPC autorizadas. No introducir rutas de escritura que eludan el guardado editorial.
- `chapter_revisions` conserva su FK ON DELETE CASCADE: solo `private.editor_phase0_backups` sobrevive al borrado del capítulo.
- No ejecuta tareas cron, almacenamiento externo ni APIs facturables nuevas.

## Verificación aislada (GitHub Actions)
`.github/workflows/editor-phase0-qa.yml` levanta PostgreSQL 17 temporal y verifica:
- backfill idempotente sin duplicar revisiones;
- preservación de revisión previa y de versión/cuerpo;
- checksum y aislamiento del respaldo;
- inserción de nueva versión;
- reemplazo y restauración del título y cuerpo;
- rechazo de tipos inválidos y valores JSON no-array;
- rollback sin huellas;
- no duplicación de versiones en actualizaciones que simulan `save_chapter`;
- copia privada intacta tras borrar un capítulo.

El CI principal del repositorio sigue siendo la regresión de integración. Se requiere que ambos terminen correctamente antes de autorizar un despliegue.

## Requisitos antes de activar en producción
1. Verificar que el repositorio, la rama y las migraciones están sincronizados con el `main` vigente; evitar aplicar sobre la rama histórica divergente.
2. Revisar la cuota gratuita disponible y el uso de BD; no contratar ni habilitar extras.
3. Confirmar una copia externa recuperable de la BD si la operación se considera de alto riesgo; la tabla privada no la sustituye.
4. Asegurar que `editor-phase0-qa` y regresiones existentes están en verde.
5. Autorizar por separado la aplicación de la migración y el despliegue.

## Comprobación de lectura después de una eventual activación
```sql
-- Capítulos sin referencia de contenido actual exacta: debe ser 0 al terminar migración.
SELECT count(*) AS without_matching_revision
FROM public.chapters c WHERE NOT EXISTS (
 SELECT 1 FROM public.chapter_revisions r
 WHERE r.chapter_id=c.id AND r.version=c.version
   AND r.body=c.body AND r.title IS NOT DISTINCT FROM c.title
);

-- Copias privadas sin integridad o ausentes: ambos contadores deben ser 0.
SELECT count(*) AS corrupt_backups
FROM private.editor_phase0_backups
WHERE checksum <> md5(snapshot::text);

SELECT count(*) AS missing_private_backups
FROM public.chapters c WHERE NOT EXISTS (
 SELECT 1 FROM private.editor_phase0_backups b WHERE b.chapter_id=c.id
);
```

## Contingencia
Ante un comportamiento inesperado **antes de fusionar**, no aplicar migraciones ni fusionar el PR. Ante una incidencia posterior a la activación, detener nuevas importaciones y evaluar desactivar temporalmente solo los dos triggers `chapters_editor_phase0_guard` y `chapters_editor_phase0_initial`, preservando las copias en `private` y las revisiones; nunca borrar respaldos automáticamente. Cualquier restauración de capítulos debe ser revisada por el equipo autorizado.

## Activación efectuada el 30 de octubre de 2026
- Plan existente de Supabase: Pro (incluye respaldos diarios); no se puede certificar desde el conector una copia diaria individual.
- Migración aplicada con éxito y registrada con versión `20261030205428`.
- 490 capítulos sin cambios de estado o número; 490 copias privadas íntegras; 491 revisiones (490 baseline y 1 auto previo).
- Zero capítulos sin revisión equivalente; copias no legibles para anon o authenticated; BD de 44 MB a 63 MB.
- Solo quedan pendientes fusión de código y confirmación de despliegue; no se ha contratado ningún complemento.

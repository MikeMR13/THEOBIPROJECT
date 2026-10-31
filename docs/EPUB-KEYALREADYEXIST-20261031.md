# Reparación: EPUB se deshace con KeyAlreadyExist

## Síntoma
`Se deshizo la importación: The resource already exists · código KeyAlreadyExist`.

## Causa localizada
El importador `src/studio-importer.js` consultaba nombres existentes **solo** en `obras/{slug}/vol-N/` y reutilizaba esa lista también para `vol-N/fuentes/`. Al importar el mismo EPUB, una fuente con nombre repetido podía colisionar con un objeto existente en Supabase Storage. El error de subida activaba correctamente el rollback, dejando al usuario sin el volumen esperado.

Este defecto también podía darse con rutas no listadas por paginación/limitación de Storage; la nueva corrección no depende de listar previamente carpetas. No hay evidencia de un fallo en el archivo EPUB proporcionado.

## Corrección implementada
- `src/import-upload-paths.js` crea rutas por **ID único del nuevo trabajo de importación**, número secuencial y nombre original normalizado (imágenes en raíz, fuentes en `fuentes/`). No cambia la estructura de las carpetas existentes.
- Al subir se usa `upsert:false`; nunca se sobrescribe un archivo anterior. Si Storage responde `KeyAlreadyExist` o 409 duplicado, se intenta otra ruta diferente hasta tres veces.
- Solo se añade a `uploaded` la ruta que se guardó realmente. Si después falla la operación, el rollback no borra archivos de importaciones anteriores.
- Se mantienen portadas, imágenes del capítulo, URLs de fuentes EPUB, estado y controles de importación existentes. No se cambian esquemas, permisos ni importaciones previas.
- Versiones incrementadas en `src/index.html`, `src/app.js` y `src/studio.js` para respetar `Cache-Control: immutable`.

## Pruebas
`node scripts/epub-storage-keyalreadyexist-check.mjs` simula recursos existentes de varias importaciones, fuentes duplicadas, conflicto Storage `KeyAlreadyExist`, retry 409, errores no recuperables, rollback y versiones de caché sin ejecutar operaciones en Supabase.

Mantener también `scripts/importer-safety-check.mjs` y `scripts/importer-formats-browser.mjs` en GitHub Actions. En producción, comprobar con una obra de pruebas importando dos veces el mismo EPUB (primero borrador, después anexo) con ilustraciones y fuentes; evitar publicar material durante QA.

## Anuncios
Por petición explícita, se cancelaron en Supabase los **dos** anuncios automáticos vencidos del 29/oct/2026 UTC (uno Discord y uno Telegram), y una consulta posterior confirmó ambos como `cancelled` y cero automáticos vencidos pendientes. Ninguna publicación fue enviada durante esta cancelación. La corrección EPUB no altera cron ni conexiones.

## Servicios y costes
No crea funciones, cron, Storage buckets, runners ni proveedores adicionales. Usa la configuración existente y GitHub Actions. La carga de archivos sigue consumiendo el espacio normal del servicio, por lo que conviene mantener los límites de tamaño ya aplicados por el importador.

# Editor Fase 1 — calidad editorial y accesibilidad (2026-10-30)

## Cambios
- Importación EPUB, DOCX y PDF: revisión editorial **sin cambios automáticos del texto**, con avisos agregados de espacios, comillas, rayas, puntos, signos e ilustraciones.
- Sección seleccionada: cada ilustración permite editar su descripción accesible o marcarla **deliberadamente decorativa**. Una descripción existente se conserva; nunca se añade una descripción inventada.
- Último paso: los avisos no bloquean importación/publicación, pero requieren confirmación explícita antes de subir archivos. Las secciones omitidas no cuentan.
- Capítulos insertados o reemplazados: persisten los campos existentes `chapters.lint` y `chapters.lint_count`, y el resumen también se registra en `import_jobs.result.editorial_quality`. La restauración de un reemplazo incluye estos campos.
- El editor conserva `decorative:true` durante ida/vuelta bloques ⇄ HTML, y omite esas imágenes del aviso de falta de `alt`. Las imágenes antiguas sin descripción siguen marcadas como pendientes, no se etiquetan artificialmente como decorativas.
- La opción de corrección masiva y la corrección global del glosario exigen confirmación.
- QA de importaciones y comportamiento real en Chromium, integrado en el CI existente, sin nuevas herramientas facturables.

## Qué no se altera
- Textos, versiones, estados, rutas, imágenes originales, configuración de publicación, permisos ni `source_text`.
- `save_chapter` y triggers de Fase 0.
- Sistema de lector, opciones de apariencia, historial, Patreon y difusión.
- No se reescriben en bloque los 490 capítulos históricos; los avisos se generan al editar o importar en adelante.

## Comprobación
1. Ejecutar `npm run check`.
2. Ejecutar `node scripts/editor-phase1-quality-check.mjs` con Chromium disponible.
3. Ejecutar `node scripts/importer-safety-check.mjs` y `node scripts/importer-formats-browser.mjs` con dependencias de QA ya instaladas.
4. Pasar CI general y Vercel Preview sin acceso a Supabase producción.
5. Tras integrar, verificar producción `READY` y conteo histórico intacto (490 respaldos privados, 491 revisiones al inicio).

## Límites
- La validación es heurística: un aviso no garantiza un error; la ausencia de avisos no certifica corrección idiomática.
- No se eliminan automáticamente errores ni se inventan descripciones de imágenes.
- La marca decorativa requiere decisión humana y es distinta del texto alternativo vacío por omisión.
- No se requiere ninguna migración: se usan campos de base de datos ya existentes.

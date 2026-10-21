# Ampliación del tipo de sección literaria — 21 de octubre de 2026

**Repositorio:** MikeMR13/THEOBIPROJECT  
**Rama:** `feat/tipos-seccion-creditos-ilustraciones-cortos-avance-20261021`  
**Alcance:** Studio, importador, lector, ficha de obra y restricción de Supabase. Sin cambios a notificaciones, preferencias, progresos ni permisos.

## Problema
El selector «Tipo de sección» del editor solo permitía Capítulo, Prólogo, Interludio, Epílogo, Afterword y Extra. Un `CHECK` real en `public.chapters.section_type` impedía guardar valores nuevos aunque se añadieran al HTML.

## Cambios
- Se añaden **Créditos**, **Ilustraciones**, **Episodio corto** y **Avance** al final del catálogo existente, conservando el orden, nombres y valores de las seis opciones anteriores.
- Catálogo y etiquetas compartidas en `src/section-types.js`; Studio y su importador usan la misma lista para no divergir.
- El lector conserva «Cap. N» exclusivamente para capítulos y muestra las otras secciones con su propio nombre, con lectura y navegación ordinarias.
- El importador EPUB reconoce encabezados inequívocos; el importador PDF reconoce nombres a través de sus separadores de encabezado; el DOCX conserva el selector manual. Todos permiten revisar o modificar el tipo antes de importar.
- Las páginas editoriales reconocidas (créditos, ilustraciones, episodio corto, avance) no se omiten por tener poco texto o ser solo imágenes; el equipo todavía puede desmarcarlas manualmente.
- En «Volúmenes» de la ficha pública se muestra el distintivo del tipo junto al título para secciones no «Capítulo», y el buscador incluye la etiqueta (p. ej., «créditos»).
- Nuevo test `scripts/section-types-check.mjs`: contrato de 10 opciones, heurísticas de títulos, lector, índice, importación, consulta y restricción.

## Requisito previo para despliegue
**La migración de Supabase debe aplicarse antes de publicar el nuevo frontend.**  
`supabase/migrations/20261021_chapters_section_types_expanded.sql` amplía la restricción `chapters_section_type_check`, sin alterar registros existentes. Se comprobó que el `CHECK` actual de producción acepta solo los seis tipos anteriores. No se requieren columnas ni tablas nuevas.

El orden seguro de liberación es:
1. Aprobación del PR y CI.
2. Aplicar migración en proyecto Supabase objetivo con permisos de administración.
3. Confirmar por consulta que `chapters_section_type_check` permite los diez valores.
4. Fusionar PR, ejecutar CI de `main`, desplegar la versión exacta a Vercel.
5. Prueba manual en Studio de guardar como «Ilustraciones» y volver a abrir; verificar encabezado en lector y ficha pública.

**Estado al crear esta rama:** la migración queda versionada, pero **no aplicada a producción**; el sitio continúa sirviendo el código anterior hasta una autorización de integración/despliegue.

## No se cambia
- IDs, números, orden, relaciones capítulo-volumen, estado de borrador/publicado.
- Sistema de notificaciones, avisos editoriales, suscripciones ni el progreso del lector.
- Galerías, EPUB/PDF descargables, fuentes incrustadas o enlaces externos.
- Colores y demás estilos de la plataforma.

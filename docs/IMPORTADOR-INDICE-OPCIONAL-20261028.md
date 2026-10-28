# Índice editorial universal y escaneo opcional al importar — 28/10/2026

Este documento sustituye el comportamiento del PR #169: la casilla del importador **ya no decide** el diseño público de cada volumen.

## Vista pública uniforme

- Todas las obras publicadas presentan el índice con la misma estructura, también en móviles.
- Si el título de origen comienza con `Capítulo 1`, `Capitulo 01`, `Captiulo 1`, `Cap. 02`, etc., se muestra el número editorial (01/02) en lugar de `chapters.num`. El prefijo se muestra una sola vez como categoría y se separa el subtítulo.
- Si un capítulo no tiene prefijo reconocible, se muestra como **Sección**, sin inventar ordinal editorial. Pró­logos, epílogos e ilustraciones se muestran sin números inventados.
- El índice público y el encabezado del lector no presentan la numeración global. El ordinal `chapters.num` permanece inalterado para enlaces, navegación, orden, lectura continua, descargas y seguimiento.
- Las obras publicadas previamente reciben el mismo diseño, sin modificar filas ni reimportarlas.
- Los atributos internos de cada fila (ID y número de navegación) siguen disponibles para la aplicación: no son contenido visible.

## Studio → Importar → Revisar

**«Escanear nombres y números de capítulos»** es una casilla opcional, apagada por defecto en cada nuevo intento de importación.

- Activada: analiza las secciones seleccionadas, muestra en la vista previa la separación editorial del título y resume capítulos numerados, secciones especiales, títulos sin prefijo y errores frecuentes «Captiulo».
- Desactivada: el traductor revisa los títulos originales sin ayuda del escaneo.
- No existe corrección ni renumeración automática. El traductor puede editar manualmente el título durante la revisión, si lo desea.
- Al importar con escaneo activado, se guarda un resumen técnico del escaneo dentro de `import_jobs.result.title_scan`, sin incluir cuerpos ni reescribir títulos.
- El formato público nunca depende de la selección del traductor durante la importación.

## Compatibilidad

El campo de legado `volumes.format_chapter_titles` creado en el PR #169 permanece en la base por compatibilidad, pero ya **no se consulta ni actualiza** en la aplicación. No hay migración destructiva.

El texto original del capítulo se conserva en `chapters.title`, así como sus bloques `body`, identificadores, permisos y fecha de publicación. Las rutas siguen usando el ordinal global interno.

## Validación

`node scripts/chapter-title-import-optin-check.mjs` comprueba prefijos, casos ambiguos, secciones especiales, integridad de datos, acceso a rutas y que Studio no guarde preferencias visuales.

La validación se integra con la compilación y los navegadores aislados en GitHub Actions; sin dependencias externas de pago.

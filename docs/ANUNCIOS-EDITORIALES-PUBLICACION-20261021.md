# Anuncios editoriales de publicaciones — 21/10/2026

Rama `feat/anuncios-editoriales-publicacion-20261021` · Proyecto `MikeMR13/THEOBIPROJECT`.

## Objetivo
Elegir **cómo anunciar cada publicación** (volumen completo o capítulo individual) al final de la preparación, sin alterar notificaciones personalizadas de los lectores.

## Rutas integradas
- Studio / obra / Volúmenes y capítulos: Publicar volumen, Programar volumen y Publicar capítulo.
- Editor de capítulo: Publicar ahora y Programar.
- Importador EPUB/DOCX/PDF: último paso, cuando se elige Publicar o Programar.
- Studio / obra / Avisos: consultar y editar el último anuncio de publicación.
- Inicio y Lanzamientos: etiqueta editorial vigente con el tipo de publicación.

## Opciones
Nuevo volumen, Volumen completo, Nuevo capítulo, Contenido especial, Personalizado (hasta 40 caracteres) y Sin anuncio destacado.
Duración obligatoria cuando se anuncia: 7 / 14 / 30 días o personalizada 1–90; color y estilo sólido/contorno.

La etiqueta entra en vigor en la fecha efectiva de publicación (también en programados) y caduca automáticamente; no retira el contenido ni crea tareas o llamadas recurrentes.
Las preferencias de notificación, las suscripciones y los RPC `publish_volume` y `save_chapter` permanecen sin modificar.

## Persistencia
Se reutiliza `series.theme` en JSON, con un campo `editorial_releases` limitado a 60 eventos identificados por tipo+ID y fechas precisas de inicio/vencimiento.
El campo legado `update_tag` se conserva. Una nueva selección «Sin anuncio destacado» impide resucitar etiquetas anteriores.

**Nota:** si la publicación ya tuvo éxito pero falla almacenar el anuncio (por RLS o conexión), se muestra una advertencia y nunca se deshace una publicación válida.

## Validaciones
`node scripts/editorial-announcements-check.mjs`: duración inválida, personalizado, caducidad programada, datos legados, conservación de JSON, no interferencia con notificaciones, Chromium en cinco resoluciones.

Pendiente antes de producción: prueba manual autorizada con cuenta de equipo y validación de RLS real de `series.theme`.

# Entrega 4 — Refinamiento de Estadísticas, SEO, lector y revisiones
Fecha: 31/10/2026. Rama independiente desde el `main` posterior a la Entrega 3.

## Implementación

- **Estadísticas de obra:** gráfico «Vistas por día» con escala vertical visible (máximo, mitad y cero) y fechas de inicio/fin debajo. El comportamiento del gráfico y las consultas RPC existentes no se alteran. Textos accesibles y tabla aclaran la diferencia confirmada en la RPC `series_stats`: `views` es la suma dentro de los últimos 7/30/90 días y `views_total` suma histórica registrada para cada capítulo. No se inventan lecturas anteriores a la instrumentación.
- **Etiquetas editoriales:** tanto la tabla de Estadísticas como las tarjetas del tablero reutilizan `editorialChapterLabel`, sin cambiar `chapter.num`, rutas, IDs o métricas.
- **Revisiones:** el tablero muestra recuentos por obra para revisiones pendientes, con correcciones, aprobadas y caducadas, a partir de `reviewRows` ya cargadas. Se respeta la selección de obra / asignado a mí; no hay consultas adicionales.
- **SEO y compartir:** la vista previa admite títulos y descripciones largos en pantallas estrechas; limita visualmente a 2/4 líneas, conserva el texto completo en el atributo `title` y **no trunca los metadatos guardados**. El enlace sigue mostrando el canonical fijo. Se renueva la versión de caché del módulo.
- **Lector:** al abrir Índice o Ajustes, reinicia solo el scroll interno del panel. No desplaza la página ni el progreso de lectura. Los cambios de opción que vuelven a renderizar Ajustes conservan la posición interna existente.

## Límites de seguridad

- Sin SQL, migraciones, alteración de permisos, publicaciones, cron, cargos ni cambios de Supabase.
- No modifica el diseño literario ni las funciones de lectura, SEO público, TTS o sistema de revisión; solo presentación y claridad.
- La auditoría identificó observaciones no reproducidas en logo, campana y barra lateral: **no** se modifican sin prueba visual real.
- La auditoría recomendó advertencias para títulos de obras parecidos; quedan fuera por requerir consulta/diseño editorial de similitud y se reservan para una entrega posterior sin bloquear nombres legítimos.
- Seguimiento: sesión real de editor, estadísticas con eventos históricos y navegador móvil para comprobar contraste y legibilidad; CI aislado no sustituye esa revisión.

## Pruebas

`node scripts/entrega4-refinamiento-ui-check.mjs` cubre semántica de métricas, gráficos vacíos, múltiples obras y revisiones, lectura sin salto, SEO y seguridad de datos. Se ejecuta junto con el CI existente en GitHub Actions. El PR debe permanecer en borrador hasta revisar las pruebas.

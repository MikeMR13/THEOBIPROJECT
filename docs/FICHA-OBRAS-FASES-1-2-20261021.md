# Ficha pública de obras — fases 1 y 2

**Repositorio:** `MikeMR13/THEOBIPROJECT`  
**Rama:** `feat/ficha-obras-editorial-fases1-2-20261021`  
**Alcance:** ficha pública `/serie/:slug` de todas las obras, sin modificar Studio, el lector ni la base de datos.  
**Fases:** 1. Ficha editorial; 2. Galería de volúmenes con vista de lista.

## Fase 1 — Ficha editorial

- Encabezado con portada, título, autor, ilustrador, editorial cuando exista, géneros, demografía, estatus de traducción, equipo traductor, calificaciones y seguimiento.
- Navegación local por anclas: Ficha, Sinopsis (cuando exista), Volúmenes y Reseñas.
- Acceso a «Explorar volúmenes» desde la cabecera, sin sustituir «Empezar a leer», «Seguir» ni «Mis anotaciones».
- Solo se cargan en la ficha pública volúmenes con `status = published` y `deleted_at IS NULL`, evitando revelar borradores o programación editorial.

## Fase 2 — Galería y lista

- La vista predeterminada es **Galería**: portadas con proporción 2:3 y una tarjeta individual por libro; respeta la portada específica del volumen y la de obra como respaldo.
- El lector puede cambiar a **Lista**. La selección se conserva localmente con `obi-serie-vol-view`, sin requerir migraciones ni credenciales.
- Los capítulos de cada volumen permanecen disponibles dentro de «Índice de capítulos» desplegable (sin limitar el número ni reordenar información).
- El botón «Leer volumen» dirige al primer capítulo del volumen; «Continuar leyendo» cuando el progreso coincide con un capítulo del volumen.
- Los enlaces `external_url`, descargas EPUB/PDF/etc., reglas de donadores, compra oficial y accesos al lector se mantienen.
- Diseño accesible para teclado, botones táctiles, móvil y movimiento reducido.

## Compatibilidad

Se preservan los elementos de la ficha ya publicados: calificación/ranking, progreso global, indicador de capítulos leídos, notificaciones de novedades, suscripción a la obra, Patreon y bloqueos, reseñas, vídeos, galería multimedia, relaciones editoriales, notas y descargas.

**Sin cambios en:** Supabase (SQL, políticas o datos), Cloudflare, sistemas de cuentas, importador, Studio, lector paginado o continuo.

## Validaciones

- `npm run check`, `npm run build` y los controles existentes de CI.
- `node scripts/series-editorial-phase12-check.mjs`: contratos de conservación + Chromium sintético a 320, 390, 768, 1024 y 1440 px para Galería, Lista, desplegables y botones de descarga.
- Compilación Preview aislada, sin conectar a la base productiva.
- **Pendiente de prueba manual con cuenta real**: lectura y progreso, compra y descarga, cambios de vista, notas y reseñas sobre datos reales.

## Publicación

Mantener el PR independiente hasta CI verde y revisión; nunca reemplazar producción con un Preview que use datos ficticios. El despliegue de producción corresponde a `main` tras integración y verificación, si se autoriza expresamente.

## Fase 3 — búsqueda de capítulos y progreso (21 de octubre de 2026)

- Búsqueda por número o título de capítulo, sin consultas adicionales al servidor, normalizando acentos y caracteres especiales.
- Filtros: todos, novedades y, para cuentas iniciadas, leídos y sin leer.
- Orden de volúmenes descendente/ascendente con preferencia local `obi-serie-vol-order`.
- Progreso individual de lectura por volumen, con barra y fracción `N de M`, visible solo en sesión de lector.
- Mensaje accesible de resultados, aviso sin coincidencias y botón para borrar filtros.
- Se preserva la preferencia previa «Ocultar leídos», desactivándola al elegir explícitamente el filtro «Leídos».

## Fase 4 — diseño móvil, rendimiento y accesibilidad

- Portadas de volúmenes con `loading="lazy"`, `decoding="async"` y `fetchpriority="low"`; sin carga inmediata por `background-image`.
- Controles de 44 píxeles como mínimo y `:focus-visible` para teclado.
- Ajustes responsive para 320, 390, 768, 1024 y 1440 píxeles.
- Respeto de `prefers-reduced-motion` y mensajes semánticos `role="status" aria-live="polite"`.
- Módulo puro `src/series-organization.js` sin dependencias, migraciones ni nuevas llamadas al backend.

### QA adicional

- `node scripts/series-editorial-phase34-check.mjs`: contratos de funciones puras, filtro por novedades y estado, número/título, orden natural, progreso, portadas diferidas y Chromium en cinco resoluciones.
- Fases 1–4 se mantienen en el PR #31, sin fusionar ni desplegar a producción hasta completar las validaciones funcionales.

## Integración y validación de producción

- PR #31 fusionado mediante squash en `main` el 21/10/2026, commit `ba0b3a844549c1000d0299bf4ef3d3d3885b139e`.
- CI previo del PR #31: `39607346528` aprobado, con comprobaciones de las cuatro fases en cinco resoluciones.
- Antes de publicar: ejecutar CI de `main` tras esta bitácora y comprobar que producción resuelva exactamente el nuevo SHA de `main`.
- Sin migraciones a Supabase ni nuevas dependencias. La prueba manual autenticada (descarga, progreso y reseñas) sigue recomendada.

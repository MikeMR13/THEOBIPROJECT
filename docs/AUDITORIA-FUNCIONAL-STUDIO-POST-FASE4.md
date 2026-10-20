# THEOBIPROJECT — Auditoría funcional de Studio posterior a Fase 4

**Fecha:** 20 de octubre de 2026.
**Estado:** correcciones y pruebas automáticas implementadas en rama de QA independiente; sin fusión, sin migraciones y sin publicación a producción.
**Rama:** `qa/native-js-studio-functional-20261020`.
**Base:** `optimization/native-js-studio-phase4-20261020` (PR #5).
**Código conservado:** HTML/CSS/JavaScript nativo con ES Modules, Supabase/PostgreSQL, Service Worker y Vercel; sin librerías nuevas.

## 1. Evidencia y entorno de validación

- El PR #5 de Fase 4 había superado GitHub Actions #39431548842 (`SUCCESS`) en el commit `8109abb4284712ba560428ea028425114c44ed44`.
- Revisión directa del código del panel `src/studio.js`, editor `src/studio-editor.js`, importador `src/studio-importer.js`, multimedia `src/studio-media.js` y archivo de compilación.
- Se añadieron **pruebas funcionales simuladas** en Node.js que crean una instancia real de `createStudio`, con DOM/PostgREST simulados **sin acceso a la base**, y ejecutan acciones de UI de creación; no son pruebas E2E en Chrome/Safari.
- Vercel genera **Preview READY** por cada commit de la rama. Esto solo verifica despliegue/compilación; el navegador externo no pudo abrir las URL de preview desde esta sesión, por lo que **no se declara verificación visual, de interacción real, móvil, LCP ni INP**.
- El `scripts/build.mjs` de la rama base conserva fallback del endpoint de Supabase real si faltan variables: **no utilizar Preview para importar, publicar o iniciar sesiones de prueba con datos reales** hasta aislar el backend y revisar variables del proyecto. El PR #1 de estabilización cambia la configuración de build y sigue independiente.

## 2. Incidencias encontradas y corregidas

| ID | Severidad | Archivo | Causa verificada | Corrección | Prueba añadida |
|---|---|---|---|---|---|
| QA-ST-001 | Alta | `src/studio.js` | La extracción del importador movió `slugify()` a `studio-importer.js`. La pantalla Nueva obra seguía llamando `slugify()` sin definirla, lo que lanzaba `ReferenceError` al crear la obra. | Se restauró la implementación literal de `slugify()` en el módulo principal, idéntica al importador, sin descargar el importador ni cambiar las URL generadas. | Simular título «Crónicas del Dragón», pulsar Crear y comprobar llamada `series.insert` con `slug=cronicas-del-dragon`; comparar las dos funciones. |
| QA-ST-002 | Media-alta | `src/studio.js` | Nueva obra inicializaba `work_type` con `WTYPES[0]?.[0]`. Con tipos almacenados como cadenas (`Novela ligera`, etc.), eso producía `N` y podía crear metadatos inválidos. | Se usa el valor completo de la opción inicial, manteniendo compatibilidad con opciones tipo arreglo. | La creación simulada verifica `work_type = 'Novela ligera'` y que la obra se crea con `published=false`. |

## 3. Pruebas nuevas y resultado

Archivo: `scripts/studio-functional-smoke.mjs`, sin dependencias externas.

- Crea `createStudio(ctx)` real e implementa las interfaces mínimas del DOM, session y Supabase con objetos en memoria.
- Ejecuta `newWork()`, entrada del título, guardado simulado de la obra, creación del Volumen 1 y del Capítulo 1.
- Comprueba que tanto volumen como capítulo nacen como borradores, que las rutas del editor se conservan y que no se ocultan errores en `toast()`.
- Crea otro Studio con permiso `create=false` y valida que se muestre bloqueo y que **no se envíe ninguna operación INSERT**.
- Comprueba que el importador sin permiso `import` no llegue a consultar obras en la base simulada.
- Prueba rutas de `ensure=false` en editor y multimedia.
- Se encadena en CI como `npm run studio-functional-check` y se añade la revisión de sintaxis del script al `scripts/build.mjs`.

**GitHub Actions #39433056889: SUCCESS**, commit `d428cfb8370f3db7f17a430a3832ae1d92ae1a54` (último commit de implementación antes de esta bitácora). Incluye `npm run check`, `npm run build`, comprobaciones de Fases 1–4 y `npm run studio-functional-check`.

El primer CI tras incorporar los mocks falló porque el *objeto falso de botón* carecía de `dataset`; se corrigió el mock para reproducir el botón del navegador. No fue una regresión del código productivo. La prueba positiva completa y la regresión de metadatos están verdes.

## 4. Auditoría de permisos: verificación SQL read-only

La base conectada contiene las funciones públicas:
- `save_chapter`: `SECURITY DEFINER`, `anon EXECUTE = false`. Su implementación consulta `private.team_can(private.series_team(c.series_id), 'edit')` antes de guardar.
- `publish_volume`: `SECURITY DEFINER`, `anon EXECUTE = false`. Verifica `private.team_can(..., 'schedule')` o permiso de publicación según operación.
- `media_in_use`: `SECURITY DEFINER`, `anon EXECUTE = false`, consulta `private.team_can(p_team, 'view')`.
- `my_team_permissions`: `SECURITY DEFINER`, `anon EXECUTE = false`, deriva permisos de `private.team_can`.

**Límite:** comprobar las definiciones de funciones y sus privilegios no demuestra de extremo a extremo la seguridad bajo todas las combinaciones de RLS, grupos y sesión. No se modificaron permisos ni funciones en Supabase.

## 5. Pendientes de pruebas funcionales y visuales en navegador

1. **Identidad:** inicio/cierre de sesión; cambio entre dos cuentas y entre dos equipos; roles Propietario/Admin/Editor/Traductor/Revisor/Lector. Verificar que no se reutiliza el estado de otra sesión.
2. **Editor:** abrir capítulo real en staging, guardar, autoguardar, restaurar, historial, conflictos de versión, editor paginado, notas, ruby, negritas, cursivas, ilustraciones, herramientas de revisión, publicación y programación.
3. **Importador:** EPUB con fuentes/CSS y múltiples capítulos, DOCX con imágenes, PDF con orden visual; revisar, cambiar portada, añadir al volumen, reemplazar, publicar y simular rollback. Confirmar que las fuentes EPUB se conservan en lectura.
4. **Multimedia:** navegar carpetas, paginar, subir archivos, copiar URL, portada por volumen, evitar borrar archivos en uso, restauración tras errores.
5. **Móvil/tema:** ancho móvil 360–430 px, tablet y escritorio; sin scroll horizontal inesperado, diálogos y botones accesibles, CSS cargado, sin FOUC.
6. **Rendimiento:** carga fría/caliente en vista de Studio, conteo de solicitudes, JS transferido, uso de CPU, Lighthouse y Web Vitals (LCP/INP/CLS), sin usar cuenta real.
7. **PWA:** comportamiento de Service Worker, caché de recursos Studio, reconexión offline, cambios de versión.
8. **Seguridad:** probar políticas RLS y RPC con roles reales en un backend aislado, no en producción.

## 6. Decisión de integración

- **Aprobación limitada:** CI y flujo de Nueva obra con mocks, junto con inspección SQL de RPC. No es autorización para fusionar o desplegar.
- Crear PR de QA **apilado sobre PR #5** y mantenerlo en borrador; no alterar `main` ni producción.
- Antes del merge, resolver aislamiento de Preview y completar pruebas de navegador. Se evita crear nuevas infraestructuras de costo adicional.
- Tras aprobar las pruebas E2E, fusionar/ordenar PR #1 y fases 1–4 con revisión de conflictos y migraciones.

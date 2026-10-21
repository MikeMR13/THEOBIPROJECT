# Estudio Editorial — Fase visual 4: unificación y auditoría final
Fecha: 2026-10-20
Rama: `feat/studio-visual-fase4-unificacion-qa-20261020`
Base: `feat/studio-visual-fase3-navegacion-responsive-20261020` (PR #26)
Dependencias: PR #23, PR #24, PR #25 y PR #26.

## Objetivo y límites
Auditar las fases editoriales previas y las pantallas de Estudio sin desplegar ni fusionar a producción. Mantener el código HTML, CSS y JavaScript nativo, la identidad de color negro/amarillo/naranja, las funciones editoriales existentes y los permisos.

## Cambios de Fase 4
1. `src/studio.css`: retiradas reglas heredadas sobre `.s2-nav-group` y `.s2-nav-label` anuladas por el sistema de navegación de Fase 3. Unificado aspecto de scrollbars y comportamiento con movimiento reducido para tabs, tablas, tablero, menú, importador y campos de géneros. Se mantiene la cascada deliberada por breakpoint y sección para no reescribir componentes estables.
2. `src/studio.js`: sincronizados `aria-controls` y `aria-expanded` de búsqueda y campana con su visibilidad real. Escape cierra popovers, devuelve foco a la campana cuando corresponde; cerrar una búsqueda cancela tanto el temporizador como los resultados asíncronos en curso, impidiendo reaperturas tardías.
3. `scripts/fixtures/studio-browser-fixture.mjs`: prueba del menú según permisos, del cierre de avisos y búsquedas y de la protección contra temporizadores tardíos; simula `ilike` sin backend.
4. `scripts/studio-browser-e2e.mjs` y `scripts/fixtures/studio-browser-parent.js`: cobertura real de módulos JS en Chromium a 320, 390, 768, 1024 y 1280 px, además de los seis tamaños sintéticos ya cubiertos por fases 1-3 (incluido 1690).
5. `scripts/studio-visual-phase4-check.mjs`: contrato de 14 rutas y sus grupos, vínculo a rutas de `src/app.js`, accesibilidad, demografía/géneros/relaciones, Multimedia y presupuesto CSS. Ejecutado dentro del comando de integración existente del CI.

## Matriz de auditoría

| Área | Automatizada | Manual pendiente antes de fusionar/desplegar |
| --- | --- | --- |
| Navegación lateral / 14 rutas | Mapa estático, permisos y menú móvil (Chromium) | Cuentas de traductor, corrector, administrador y propietario reales |
| Crear obra / Nueva obra | Inserciones simuladas y campos, géneros, relaciones | Crear borrador real, editarlo y revisar portada |
| Importar EPUB/DOCX/PDF | Entrada, MIME/límites, módulos bajo demanda y contrato de formulario | Importar muestras reales con portada, fuentes y capítulos |
| Datos editoriales | Contratos y CSS a seis anchuras | Ficha con metadatos reales y título largo |
| Volúmenes / capítulos | Creación simulada, formularios y tabla con scroll | Publicar, programar, actualizar y restaurar en entorno de pruebas |
| Multimedia | Etiquetas de carpetas, ruta y permisos con mock | Protección de imágenes en uso en Storage real |
| Glosario | Filtros y geometría CSS, identificadores accesibles | Guardar, buscar y visualizar términos reales en el lector |
| Equipo / roles | UI responsive y visibilidad de acciones en mock | Invitaciones por correo y RLS para cada rol real |
| Flujo editorial | Scroll y accesibilidad de etapas | Mover/asignar/programar usando cuentas del equipo |
| Comunidad / estadísticas / bitácora | Tablas, filtros, scroll y rutas | Datos reales de comentarios, estadísticas y registros |
| Preferencias / identidad | CI de integración, temporadas, temas y otras páginas | Auditoría visual manual con elementos personalizados |
| Responsividad | 320, 390, 768, 1024, 1280 y 1440/1690 en suites | Revisión visual en Chrome, Safari y móvil físico |

## Verificaciones automáticas
- `npm run check`, `npm run build`, `npm run verify`, `npm run integration-check` (incluye el contrato Fase 4), `npm run studio-functional-check`, `npm run studio-fields-check`.
- `npm run studio-browser-check`: cinco tamaños en Chromium, sin conexión externa ni secretos.
- `npm run studio-visual-phase1-check`, `npm run studio-visual-phase2-check`, `npm run studio-visual-phase3-check`: regresiones visuales de las fases anteriores.
- Accesibilidad, integración de preferencias, animaciones con movimiento reducido y compilación Preview aislada ya incluidas en el workflow.
- El CI usa una URL ficticia y claves de prueba no funcionales, por lo que **no escribe datos reales**.

## Riesgos, exclusiones y decisión de integración
**No equivale a un QA completo en sesión real.** No se ha ejecutado una prueba autenticada con una cuenta de los equipos, archivos EPUB/DOCX/PDF auténticos ni datos de producción; no se ha desplegado a ningún entorno desde esta fase. No se efectuaron migraciones ni cambios en Supabase, Cloudflare o Vercel.

Antes de una fusión o despliegue: comprobar CI final del PR #27, ejecutar los casos manuales en Preview con credenciales de prueba y revisar funcionalidad del lector respecto de imports y permisos. La integración debe respetar la cadena PR #23 → #24 → #25 → #26 → #27 o utilizar una fusión coordinada equivalente.

**Estado:** cambios implementados en rama de validación aislada, sujetos a CI y aceptación manual.

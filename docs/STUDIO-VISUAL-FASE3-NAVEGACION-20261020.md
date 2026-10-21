# Estudio Editorial — Fase visual 3: navegación y adaptación responsive
Fecha: 2026-10-20
Rama: `feat/studio-visual-fase3-navegacion-responsive-20261020`
Base: `feat/studio-visual-fase2-componentes-20261020` (PR #25)
Depende de Fases 1 y 2 y la ficha de Nueva obra / Importar (PR #23).

## Objetivos y alcance
Consolidar las secciones secundarias reales de Estudio, utilizando las clases y módulos que ya existen. No sustituir HTML/CSS/JavaScript nativo, no alterar permisos ni comportamiento editorial, sin costo adicional y sin despliegue a producción.

## Cambios aplicados
1. **Navegación** (`src/studio.css`): grupos identificables de «Publicaciones y contenido», «Difusión y seguimiento» e «Identidad y gestión» en escritorio; enlaces, estados activos, foco y textos largos sin desbordamiento. Mantener el menú plegable en móvil.
2. **Regreso al sitio**: enlace «Volver al sitio» visible cuando se abre el menú compacto en móvil, sin crear una ruta nueva.
3. **Importación** (`src/studio-importer.js` conserva lógica): revisión de secciones y vista previa en una o dos columnas según anchura disponible; campos y botones adaptables; vista previa con scroll independiente; navegación del asistente y selección de portadas legibles en móvil; formulario editorial completo conservado.
4. **Multimedia** (`src/studio-media.js`): ruta de carpetas semántica (`nav` con etiqueta), archivos y carpeta en galería adaptable, nombres largos legibles, acciones con superficie táctil y selecciones con `aria-label`. No cambia políticas de almacenamiento ni protección de archivos en uso.
5. **Glosario** (`src/studio.js`): selector de obra, búsqueda, edición y lote sin desbordamiento; controles con nombres accesibles; filas y acciones reorganizadas en móvil. No cambia términos ni las reglas del lector.
6. **Equipo y roles**: invitación por correo y formulario de roles adaptables; filas de miembros en dos columnas en pantallas estrechas; tarjetas de permisos conservadas sin editar la lógica de autorización.
7. **Flujo editorial**: tablero de cuatro etapas con desplazamiento horizontal local y «snap» táctil en móvil; región navegable con teclado (`tabindex=0`) y texto de orientación. Se mantienen las flechas para mover capítulos y asignaciones.
8. **Comunidad, estadísticas y bitácora**: filtros apilables, comentarios/erratas sin recortes y tablas estadísticas con scroll dentro del panel; región estadística navegable por teclado.

## Compatibilidad
- El CSS nuevo está acotado a `.s2`, exclusivo de Estudio, preservando los estilos públicos y del lector.
- Módulos `src/studio.js` y `src/studio-media.js` tienen ajustes semánticos menores; el flujo de datos, permisos y acciones permanecen intactos.
- `src/studio-importer.js` no requiere alteraciones funcionales de parsers o publicación.
- Sin migraciones SQL, nuevos paquetes o servicios externos.

## QA y CI
- `npm run check`, `npm run build`, `npm run verify`, `npm run studio-functional-check`.
- `npm run studio-browser-check`: prueba navegación móvil (secciones, Escape, «Volver al sitio»), inicio de obras, permisos e importador con Supabase simulado.
- `npm run studio-visual-phase1-check` y `npm run studio-visual-phase2-check`: regresión visual de las fases anteriores.
- `npm run studio-visual-phase3-check`: render de estructura realista del importador, multimedia, glosario, miembros y roles, tablero, comunidad y estadísticas en Chromium a **320, 390, 768, 1024, 1440 y 1690 px**. Verifica geometría, scroll local y navegación compacta sin datos reales.
- CI incluye las comprobaciones de accesibilidad existentes, compilación Preview aislada y QA visual de toda la web.

## Limitaciones y siguiente fase
El CI sintético no equivale a una revisión de sesión autenticada en un navegador conectado al proyecto; la Fase 4 debe ejecutar auditoría visual/funcional end-to-end y consolidar estilos redundantes antes de cualquier fusión y despliegue productivo.

Estado: en rama/PR independiente, sujeto a CI. Sin merge ni despliegue a producción.

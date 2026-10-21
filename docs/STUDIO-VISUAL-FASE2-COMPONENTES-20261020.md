# Estudio Editorial — Fase visual 2: componentes editoriales
Fecha: 2026-10-20
Rama: `feat/studio-visual-fase2-componentes-20261020`
Base: `feat/studio-visual-fase1-alineacion-20261020` (PR #24)
Depende del PR #23 (Nueva obra e Importar completo).

## Objetivo
Consistencia visual en el Estudio real, basándose en las propuestas aprobadas: formularios, tarjetas, volúmenes, capítulos, filtros y botones. Mantener paleta negro/dorado/naranja, semántica editorial y HTML/CSS/JavaScript nativos.

## Implementación
- Tokens CSS locales para bordes, paneles, contraste, tipografía y controles, limitados a `.s2`.
- Formularios de Datos de la obra, Nueva obra e Importar: campos de altura uniforme, espacio interior normalizado, etiquetas legibles, estados de foco, checkboxes y selectores consistentes. Se preservan validaciones, importación EPUB/DOCX/PDF, metadatos y relaciones.
- Chips de géneros/filtros: tamaño y estados seleccionados coherentes; interacción, selección y límite de cuatro géneros permanecen en JavaScript existente.
- Tarjetas de Obras: portada 2:3, retícula, detalles con separación estable, acciones acomodadas sin recortar; comportamiento responsive.
- Volúmenes: portada/editorial, estado, encabezado y barra de botones alineados.
- Capítulos: tabla más legible con títulos **multilínea**; desplazamiento horizontal limitado al interior del componente en pantallas pequeñas. Columna ACCIONES identificada y título completo disponible como atributo `title`.
- Filtros de capítulos: campo de búsqueda ampliable, chips con scroll contenido en móvil, claridad de selección.
- Barra de Guardar: estado de cambios distinguible y botón táctil accesible.
- Foco visible, controles deshabilitados y reducción de movimiento conforme a preferencias del dispositivo.

## Compatibilidad / precauciones
- Sin nuevos paquetes, migraciones SQL, servicios externos ni cambios a RLS.
- Sin modificaciones de endpoints, handlers de publicación, rutas ni permisos.
- CSS aplicado **solo dentro del Estudio**. El lector público y la página de obra no deberían recibir estilos nuevos.
- La tabla de capítulos conserva sus botones de edición, publicación y eliminación; el listado móvil utiliza scroll local.
- Los cambios de esta fase no incluyen navegación integral móvil ni rediseño de todas las herramientas complementarias; pertenecen a Fase 3.

## Pruebas
- Se conservan CI y QA de Fase 1.
- Nuevo `npm run studio-visual-phase2-check` con Chromium y datos ficticios a 320, 390, 768, 1024, 1440 y 1690 px; comprueba altura de inputs, tablas con scroll interno, títulos multilínea, filtros y tarjetas dentro del viewport.
- CI ejecuta test funcional de Estudio, QA navegador y responsive original, build, validaciones de preview aislada y nueva fase 2.

Estado de revisión: PR en borrador. No fusionar con la rama de validación ni desplegar a producción antes de CI aprobado y revisión humana en una sesión real.

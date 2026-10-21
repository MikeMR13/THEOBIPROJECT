# Estudio Editorial — Fase visual 1: alineación y distribución
Fecha de trabajo: 2026-10-20
Rama: `feat/studio-visual-fase1-alineacion-20261020`
Base: `feat/studio-ficha-importacion-relaciones-20261020` (PR #23)
Destino posterior a aprobación: `test/integracion-fases1-5-preferencias-20261020` — nunca producción directamente.

## Alcance
Auditoría visual basada en el defecto observado en la captura de Estudio > Obras > Datos de la obra. No altera rutas, permisos, servicios, datos almacenados, paleta ni componentes de publicación.

## Implementado
1. Encabezado de Estudio: retícula flexible para título largo y controles de zona horaria, campana y búsqueda. Títulos con salto de línea sin recortar controles.
2. Barra de estado y acciones de obra: separación estructural `.wk-summary` / `.wk-acts`, con salto de línea explícito si el ancho es insuficiente. Se evitan controles fuera de pantalla.
3. Pestañas editoriales: desbordamiento horizontal contenido **en la barra de pestañas**, sin ampliar toda la página.
4. Datos de la obra: distribución estable a dos columnas en escritorio y una en pantallas estrechas; controles ajustados a su celda; panel de géneros con altura limitada y scroll interno; controles relacionados con ancho flexible.
5. Volúmenes y capítulos: protección de anchuras mínimas, títulos largos, toolbar y scroll horizontal solo dentro de la tabla.
6. Estados de guardado y tarjetas: preservación de anchos, altura y comportamiento táctil en móviles.

## Tecnología y compatibilidad
Cambios circunscritos a `src/studio.css` y agrupación visual de la cabecera en `src/studio.js`. Sin bibliotecas nuevas. Se conservaron las mejoras previas de PR #23 (ficha completa, importador, demografías, géneros y relaciones).

## Verificación
- `npm run check`
- `npm run build` y `npm run verify`
- `npm run studio-functional-check`
- `npm run studio-browser-check`
- `npm run studio-visual-phase1-check`: seis tamaños (320, 390, 768, 1024, 1440, 1690 px), usando CSS real y datos ficticios; verifica ausencia de desplazamiento horizontal de la página, que acciones estén dentro de la barra, expansión de ficha y disposición de columnas.
- Flujo CI de GitHub Actions, sin llamar al backend productivo.

## Pendientes
Fase 2: homogeneizar formularios, tarjetas, tablas, filtros y botones.
Fase 3: navegación y experiencia responsive integrales del resto de Estudio.
Fase 4: consolidación de CSS y auditoría visual/funcional completa.

## Seguridad del despliegue
Esta rama no se fusiona ni despliega a producción mientras falten validaciones. CI verde no equivale a validación humana de sesión real en producción.

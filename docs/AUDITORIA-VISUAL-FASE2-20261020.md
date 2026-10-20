# Fase visual 2 — Studio y temas de temporada para móviles

Fecha: 20 de octubre de 2026. Propuesta visual aprobada para implementación, **sin autorización de fusión ni despliegue**.

## Estado y alcance

Rama: `feat/visual-fase2-mobile-studio-20261020`, creada desde `main` sin fusionar el PR #10 (fase 1). Los PR se mantienen independientes hasta completar validación manual. Mantener CSS, HTML y JavaScript nativos; sin dependencias ni servicios de pago.

### Paso 1. Menú compacto de Studio
- `src/studio.js`: agrupación visual de las 14 rutas originales usando la lista NAV y el filtrado de permisos vigente, con etiquetas de sección; botón con `aria-controls`/`aria-expanded`, cierre por Escape, navegación y clic exterior.
- `src/studio.css`: <=860 px muestra el menú solo al abrir; escritorio mantiene navegación lateral. Conserva el único selector de equipo, compatible con la fase 1.

### Paso 2. Cabecera adaptativa
- Reordena por CSS la búsqueda, la campana y el selector horario, sin duplicarlos y conservando sus identificadores/eventos.
- Las acciones rápidas se presentan en una fila desplazable sin suprimir botones.

### Paso 3. Obras y volúmenes
- Pestañas de ficha con desplazamiento horizontal, filtros por grupos desplazables y botón de búsqueda a ancho disponible.
- Banda de acciones en lote separada del área segura inferior.

### Paso 4. Preferencias y perfiles
- `src/profile.js`: señal de desplazamiento disponible, navegación horizontal con snap, pestaña activa marcada con `aria-current`.

### Paso 5. Navegación general
- `src/ui.js`: `aria-current=page` sincronizado en navegación principal y barra inferior, manteniendo rutas, estados visuales y cierre del menú actual.
- `src/admin.js`: pestañas del Bibliotecario desplazables; panel de temporadas y sus controles compatibles con móviles. No se altera su lógica de guardado.

### Paso 6. Temas de temporada en móvil (solo previsualización)
- `src/studio.js` y `src/studio.css`: selector de temporadas, alternancia entre decoración completa y solo colores, simulación real en `TP.render` y comparación de borrador/publicado.
- Los parámetros temporales de la vista previa viven en memoria local de la pantalla (`UI.sim` y `UI.mobDeco`). **No modifican `d`, ni llaman a `team_design_save`, `team_design_publish` o a Supabase.**
- A menos de 768 px siguen ocultos los controles de edición y publicación (`.pf-panel`, `#pf-pub` y `#pf-discard`). La edición completa permanece en tabletas y escritorio.

### Paso 7. Validación
- `scripts/visual-phase2-check.mjs` se integra en `npm run verify`, incluido en CI.
- Validación manual pendiente en 320, 390, 768, 860, 1024 y 1440 px, navegadores móviles reales y modo teclado.
- Revisar: menú sin overflow ni pérdida de accesos, selector equipo en usuarios con varios equipos, permisos, búsqueda y avisos; acceso a tabs y filtros; visualización de temporadas, comparación borrador/publicado sin escrituras, reducción de movimiento y contraste.

## Integración con fase 1
- PR #10 **permanece en borrador** y sin despliegue. Ambos PR se basan en `main` y tocan `studio.css` y `studio.js`. Cuando se solicite integrar, revisar el diff de ambas, resolver reglas equivalentes del selector y ejecutar CI y validación manual combinada; nunca fusionar de forma automática.
- La fase 1 además contiene ajustes para las tablas administrativas y áreas táctiles globales que no se repiten completos aquí.

## Fuera de alcance
No se alteran RLS, datos, rutas, tablas, Supabase Auth, Cloudflare, producción ni se habilita edición completa en teléfonos. No es evidencia de una auditoría visual con capturas reales.

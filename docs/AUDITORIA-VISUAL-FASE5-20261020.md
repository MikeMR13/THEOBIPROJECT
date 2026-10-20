# Auditoría visual — Fase 5: accesibilidad y comodidad de lectura

**Fecha:** 20 de octubre de 2026  
**Rama:** `feat/visual-fase5-lectura-accesible-20261020`  
**Base independiente:** `main` (`f0b3931`). **Sin permiso para fusionar ni desplegar producción.**

## Decisión de diseño

La fase 5 mejora la accesibilidad de la plataforma y del lector sin sustituir su identidad visual ni borrar funcionalidades.

**Se conservan expresamente:**
- Cinta deslizante de Inicio, carrusel principal, carruseles secundarios, avisos, anuncios y efectos de portada.
- Temas y decoraciones por temporada para usuarios con animaciones habilitadas.
- Lector por capítulo/continuo, EPUB, fuentes originales, ilustraciones, progreso, marcado de leídos, anotaciones, preferencias, navegación y enlaces.
- Distintos roles, permisos, Studio, estados editoriales y filtros. Sin Supabase, RLS, migraciones ni dependencias nuevas.

## Cambios

### `src/index.html`
- Enlace **Saltar al contenido principal** antes de la cabecera, visible al navegar con teclado y oculto normalmente.
- `tabindex=-1` en `#app` para que el salto de navegación funcione en SPA.
- Carga de hoja `/reader-a11y.css` tras los estilos base, con versionado por el proceso actual de compilación.

### `src/reader-a11y.css`
- Controles de foco perceptible para teclado (enlaces, botones, menús, controles del lector).
- Acciones móviles con tamaño táctil mínimo; menú «Más opciones» y panel de preferencias sin salir del ancho disponible.
- Imágenes del capítulo y figuras adaptables sin alterar su fuente ni distorsionar proporciones; bloques `pre` preparados para palabras largas.
- Posición de salto a encabezados del capítulo compatible con la barra del lector.
- **Preferencia de movimiento reducido:** CSS optativo exclusivamente dentro de `@media (prefers-reduced-motion: reduce)` desactiva transiciones y animaciones molestas, incluida la cinta, y evita desplazamientos animados. **En modo normal no se elimina ni cambia ninguna animación ni interacción.**
- Conserva logo lector con límites originales `220 × 64 px`, así como temas de texto y tipografía.

## Pruebas automáticas y resultado esperado

- `scripts/visual-phase5-check.mjs`: verifica HTML semántico, enlace de salto, CSS de foco, movimiento reducido, imágenes e integridad del lector, progreso, ticker, hero y avisos.
- `scripts/visual-phase5-browser.mjs`: ejecuta Chromium real con CSS del repositorio y contenido ficticio, sin red externa, en dos modalidades: animaciones normales y movimiento reducido. Evalúa el enlace de salto, adaptación de ilustraciones y animación normal/reducida a 320, 390, 768 y 1024 px.
- Nuevo par de pasos en el CI existente `.github/workflows/ci.yml`; sin nuevos paquetes ni modificaciones a `package.json`, para reducir los conflictos de integración con los PR previos.
- Se mantiene el CI existente de Studio, compilación, estabilidad y Preview aislada.

## Pendiente de evaluación manual

Comprobar en un dispositivo real: navegador móvil y lectores de pantalla; enfoque y lectura de controles, navegación del índice, menús y temporizador; encabezados largos, imágenes muy altas, renglones, furigana/ruby, cursivas/negritas y fuentes EPUB. Comparar modo reducido, normal y temporadas. Validar 320, 390, 768, 860, 1024 y 1440 px. Las pruebas automatizadas no certifican cumplimiento integral WCAG ni sustituyen pruebas de usuario reales.

## Estrategia de integración y conflictos

No integrar todavía las fases. PR #10 (fase 1), #11 (fase 2), #12 (fase 3), #13 (fase 4) y esta fase permanecen separados. La fase 5 modifica `src/index.html`, crea `src/reader-a11y.css`, crea pruebas y modifica `.github/workflows/ci.yml`; evita escribir `src/styles.css`, `src/ui.js`, `src/reader.js`, `src/studio.css`, `src/studio.js` y `package.json` que podrían superponerse con las fases anteriores.

El repositorio integra estilos dinámicos inyectados posteriormente, por lo que los overrides de movimiento reducido están expresamente marcados `!important` y limitados a esa preferencia. Revisar duplicados y ejecutar CI y QA visual del conjunto en una rama temporal separada **cuando el usuario autorice iniciar integración**.

## Resultado técnico

Poner fecha y estado definitivo del último CI del PR en la conversación cuando se confirme. No declarar «validación manual aprobada» si solo se ejecutaron pruebas sintéticas de Chromium.

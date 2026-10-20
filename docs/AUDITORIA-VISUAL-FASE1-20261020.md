# Fase visual 1 — Correcciones prioritarias

Fecha: 20 de octubre de 2026.

## Alcance autorizado
Selector de equipo visible en Studio móvil, tablas del Mostrador del Bibliotecario utilizables en pantallas pequeñas y áreas táctiles más cómodas. Se conserva HTML, CSS y JavaScript nativos. **Rama aislada; no fusionar ni desplegar a producción sin nueva autorización.**

## Archivos y decisiones
1. `src/studio.css`: entre pantallas de 860 px o menos ya no se oculta `.s2-team`. Se presenta como un bloque compacto de ancho disponible. No se crean nuevos menús ni selectores duplicados.
2. `src/studio.js`: `aria-label="Equipo activo"` al selector original `#tpick`; la función `bindPicker`, los permisos y los datos del equipo no cambian.
3. `src/admin.js`: en pantallas de hasta 760 px, `#bbv` tiene desplazamiento horizontal y las tablas conservan ancho mínimo de 720 px, todas las columnas y el marcado `<table>` original.
4. `src/styles.css`: superficies táctiles de al menos 44 px en controles pequeños, filtros, lector, notificaciones y preferencias. El aspecto de las barras del carrusel se conserva mediante pseudo-elementos.
5. `scripts/visual-phase1-check.mjs` y `package.json`: nueva batería de regresión de lectura estática integrada a `npm run verify`, que ya ejecuta GitHub Actions CI. Sin dependencias nuevas.

## Validación posterior necesaria
- Desktop 1440 px: cabecera, Studio, lector y Mostrador sin regresiones.
- Móvil 320/390 px y tableta 768/860 px: `#tpick` visible cuando hay varios equipos, accesible por teclado, cambio efectivo de equipo y permisos correctos.
- Mostrador en 320/390 px: recorrer las tablas de usuarios, equipos, compras y bitácora con desplazamiento horizontal **interno**, sin perder última columna.
- En un dispositivo táctil: campana, menú de cuenta, filtros, controles del lector y reordenamiento utilizables sin precisión extrema; indicadores del carrusel siguen teniendo barra fina y animación correcta.
- CI: `npm run verify`, `npm run build`, otras pruebas existentes, suite Studio en Chromium aislado y comprobación de aislamiento Preview.

## Límites
La prueba estática no sustituye las capturas reales, accesibilidad asistiva ni pruebas funcionales autenticadas. No se ejecutaron migraciones, cambios de Supabase ni despliegues. Las fases visuales 2–4 quedan fuera.

# Auditoría visual · Fase 3 — Refinamiento editorial sin eliminar componentes

**Fecha:** 20 de octubre de 2026  
**Rama independiente:** `feat/visual-fase3-editorial-20261020`  
**Base:** `main` (`f0b3931`). **No fusionar, ni desplegar a producción sin autorización**.

## Condición esencial aceptada

La fase 3 **no** rediseña ni elimina elementos existentes. Conserva:
- Cinta deslizante `.ob-tick / .ob-track` y animación `obTicker`, incluida su duración y contenido.
- Carrusel principal automático `heroSlide`, enlaces, navegación, temporizador, controles y comportamiento actual.
- Carruseles secundarios `.ob-car` y su vinculación `bindCars`.
- Avisos y anuncios de equipos `ob-s-ann / ob-ann`; sin alterar consultas, publicación o permisos.
- Cintas y tarjetas obi, opciones de diseños de equipo `portada`, `bolsillo`, `obi`.
- Temas de temporada, componentes del lector, recomendaciones, filtros, rutas y animaciones ya existentes.

## Cambios por archivo

### `src/ui.js`
- Mantiene `book(s,sub,slim)` pero distingue `has-art` y `no-art`: cuando hay imagen real, solo queda la firma del equipo en una banda discreta en el borde inferior, sin colocar un título grande sobre la ilustración.
- Si no hay portada, el título se muestra sobre un patrón editorial con cinta obi legible, tanto en tarjetas compactas como en vistas ampliadas.
- Contratos visuales de las tarjetas: títulos largos sin desbordamiento, metadatos adaptables, foco visible y tamaño móvil proporcionado.
- `HOME_CSS` añade **exclusivamente** estados de foco, animación pausada mientras se navega con teclado por la cinta, ajustes de espaciado de carruseles y mejor legibilidad de anuncios; no reemplaza ni elimina sus nodos o handlers.

### `src/studio.css`
- Ajustes limitados a tarjetas del catálogo de Studio: estados de foco y resaltado, portadas sin recortes, títulos largos y espaciado móvil. No cambia navegación, selección de equipo, rutas ni permisos.

### `src/teampage.js`
- `vars()` calcula colores visualmente legibles mediante mezcla incremental hasta contraste **4.5:1**; conserva el tema almacenado y sus valores originales, incluidos los avisos de contraste del editor. La protección afecta `--fg`, `--mu` y `--act`, no cambia bases de datos.
- Logotipo PNG/WebP/otros: aprovecha mejor su espacio sin deformarse ni perder transparencia (`object-fit:contain`). Se mantienen formatos cuadrado, círculo y hanko, y la opción `Bolsillo con obi`.
- Lector: no se cambia el límite existente de logotipo `220 × 64` ni sus enlaces.

## Validaciones

- `scripts/visual-phase3-check.mjs` se integra en `npm run verify`, ejecutado por el CI vigente: comprobación explícita de cinta, carrusel, avisos, ficha, variantes con/sin portada, diseño obi, logotipo, contraste de presets y colores extremos.
- `npm run check`, `npm run build`, `npm run verify`, `npm run studio-functional-check`, `npm run studio-browser-check` y las verificaciones CI existentes.

## Validación visual manual todavía necesaria

Antes de fusionar:
1. Capturas auténticas en **320, 390, 768, 860, 1024 y 1440 px**, con portada real, sin portada y título largo.
2. Inicio: comprobar cinta deslizante funcional, carrusel principal con varias novelas, carruseles secundarios, anuncios reales, foco y avance táctil.
3. Catálogo: Galería y Fichero, filtros y estados editorial/traducción, títulos largos, tarjetas de portada real/respaldo.
4. Fichas: enlaces, volúmenes, capítulos, progreso, logotipo y equipo.
5. Temas propios y temporadas (Hanami, Navidad, etc.): contrastes y preferencia de reducir movimiento.
6. Compatibilidad conjunta con los PR #10 y #11: ambos afectan `src/studio.css`; resolver estilos y repetir CI al integrar. **No fusionar automáticamente**.

## Exclusiones

Sin nuevos paquetes, migraciones, cambios en Supabase, Cloudflare, autenticación, pagos, permisos, publicación, datos ni despliegue manual. CI funcional no equivale a la revisión visual con cuentas reales.

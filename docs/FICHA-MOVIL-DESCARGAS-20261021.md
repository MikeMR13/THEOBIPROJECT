# Corrección de ficha pública — navegación móvil y descargas
Fecha: 2026-10-21
Rama: `fix/ficha-tabs-movil-descargas-20261021`

## Incidencia
La navegación «Ficha / Sinopsis / Volúmenes / Reseñas» no se ajustaba con claridad a pantallas pequeñas. Todas las secciones se sucedían en la misma página, y las descargas EPUB/PDF se escondían dentro de cada tarjeta de volumen.

## Solución
- Cinco pestañas independientes: **Ficha**, **Sinopsis** (solo con sinopsis), **Volúmenes**, **Descargas**, **Reseñas**.
- El encabezado de la novela permanece visible; los metadatos editoriales y contenidos complementarios pertenecen a Ficha.
- Descargas centralizadas, **agrupadas por volumen**, con identificación de EPUB/PDF y otros formatos registrados. Cada volumen mantiene un enlace directo a la pestaña Descargas.
- Indicaciones diferenciadas para volumen sin descargas y error al consultar `series_downloads`.
- No se modifican los enlaces existentes ni el RPC `download_open`; se preservan restricciones de donadores `d.locked || vLk`.
- La pestaña activa se representa con `aria-selected`, paneles `role="tabpanel"`, teclado con flechas/Home/End, enlaces profundos `#serie-descargas` y `#descarga-vol-N`. 
- Diseño móvil sin scroll lateral, tres columnas en anchuras móviles y dos en móviles estrechos; cada opción tiene zona táctil de 48 px.
- Solo se cambia `src/ui.js`, `src/styles.css`, nuevo módulo `src/series-tabs.js` y QA; sin migraciones, ajustes de Studio ni costos adicionales.

## Validación requerida
- `npm run check` / CI completo y regresiones de la ficha.
- `node scripts/series-tabs-mobile-check.mjs` prueba visibilidad de paneles, EPUB/PDF, teclado y cinco tamaños: 320/390/768/1024/1440.
- Validación posterior con una cuenta real y enlaces de obra existentes antes de desplegar a producción.

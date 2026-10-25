# Integración segura de los adjuntos SEO · 25 de octubre de 2026

## Entradas recibidas

- `index.html` aportado: SEO estático, schema.org SearchAction y etiqueta `<script src="/seo.js">`, pero también referencias antiguas de recursos.
- `seo.js` aportado: actualizar el título, descripción, Open Graph, canonical y robots tras navegar por una SPA mediante MutationObserver.

## Cambios admitidos

- `src/index.html`: añadido **SearchAction** al WebSite existente, manteniendo el grafo Organization/WebSite, OG dinámico 1200×630, `twitter:summary_large_image`, accesibilidad, TTS y versiones actuales de app/ui/reader.
- `api/public-meta.js`: el servidor SSR también emite SearchAction para Inicio; la ruta `/buscar?q=` ya funciona en la aplicación.
- `src/seo.js`: adaptación modular del SEO client-side para rutas estáticas, serie, capítulo y equipo; actualiza títulos/descripciones y metadatos compartidos **solo al navegar dentro de la SPA**.
- `src/share.js`: integra el módulo SEO en el ciclo `installPublicShare` ya existente; preserva robots `noindex` del SSR en la ruta inicial y borra metadatos sociales sensibles al pasar a una ruta privada.

## Conflictos evitados expresamente

- **No** reemplazar `src/index.html` con el adjunto completo: habría eliminado skip-link, lector accesible y TTS, además de revertir el OG dinámico y assets actuales.
- **No** insertar el `<script defer>` original de `seo.js`: crearía un segundo observador del DOM compitiendo con `share.js` y podría modificar `index,follow` sobre un `noindex` autorizado.
- **No** reemplazar la imagen social por `icon-512.png`: la tarjeta minimalista del generador Open Graph actual sigue siendo la fuente de verdad.
- **No** copiar la regla robots del adjunto que convierte páginas públicas a `index,follow` sin conocer el backend: la indexación se decide por el servidor y el estado de publicación.

## Reparaciones relacionadas de main

- `api/sitemap.js`: recuperada la implementación de Node probada con RLS, noindex, series/volúmenes/capítulos realmente publicados, 404 en Preview, timeouts y códigos seguros. La variante Edge añadida en los dos commits previos provocaba ERROR de build (`indexation-phase3-check.mjs`, `res.headers['content-type']` indefinido).
- `public/robots.txt`: retirado para que `/robots.txt` siga resuelto por `api/robots.js`, evitando bloquear los PNG de redes o permitir rastreo de Preview de forma accidental.
- `api/meta.js`: convertido en alias validado de `api/public-meta.js`, sin nueva consulta pública insegura ni clave incrustada; rutas existentes de SEO protegidas permanecen intactas.

## Validación

- `scripts/seo-adjuntos-check.mjs` forma parte de `npm run build`: verifica protección de OG, accesibilidad y TTS, canonical y noindex, datos estructurados de búsqueda, aislamiento y compatibilidad de `api/meta`.
- `scripts/indexation-phase3-check.mjs`: sitemap/robots/privacy y salida XML.
- `scripts/seo-social-image-check.mjs`: PNG 1200×630 y lógica estricta logo del equipo **PNG o texto**, sin sinopsis ni datos accesorios en el diseño.
- En Preview el backend QA sigue no disponible; por diseño se espera 503 para fichas públicas individuales. No reinterpretar esto como PASS real de integración de Supabase.
- No modificar RLS, estado editorial ni protecciones de Cloudflare.

## Puerta de fusión

- Verificar GitHub Actions `ci` y `SEO · contratos y build`: **success** para el último commit.
- Verificar Vercel Preview `READY`, `/robots.txt` 200 con `Disallow: /`, `/sitemap.xml` 404, `/api/og-image?kind=home` 200 `image/png` y HTML de catálogo con SearchAction.
- Fusionar a `main` y comprobar el nuevo despliegue en producción, rutas de novelas y preestrenos y PNG del traductor. Seguimiento aparte: acceso de bots sociales por Cloudflare.

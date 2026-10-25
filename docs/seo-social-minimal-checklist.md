# Checklist · Tarjetas sociales minimalistas (4 elementos)

**Objetivo:** PNG 1200×630 de novela, capítulo o preestreno, con únicamente **logo auténtico del sitio + nombre de la obra + portada + identidad del traductor**. No confundir texto oculto de metadatos HTML con contenido dibujado en PNG.

## 1. Limpieza visual
- [x] No dibujar sinopsis, descripción social ni teaser.
- [x] No dibujar autor ni géneros.
- [x] No dibujar badges de categoría, próxima publicación ni subtítulos.
- [x] No dibujar dominio, pie de página ni leyenda TRADUCCIÓN.
- [x] Conservar exactamente las cuatro categorías de elementos exigidas.

## 2. Identidad del sitio
- [x] Insertar `public/icon-512.png` (PNG real del proyecto), nunca un sello recreado en SVG.
- [x] Usar paleta negro cálido `#0d0c0a`, marfil `#f3ecd9`, oro `#f2c230`.
- [x] Panel editorial marfil a la izquierda y portada sobre fondo oscuro a la derecha.
- [x] Detalles decorativos discretos sin textos nuevos.

## 3. Título
- [x] Obtener título público del SSR (`socialTitle`/`heading`/`title`) sin cambiar la BD.
- [x] Separar la primera frase principal cuando hay subtítulo muy largo.
- [x] Ajustar tipografía de 49 a 66 px y máximo tres líneas, con puntos suspensivos.
- [x] Conservar fuente TrueType IBM Plex Sans incorporada y prueba de acentos rasterizados.

## 4. Portada
- [x] Mostrar imagen original de la obra con `fit: contain`, sin cortar ni deformar.
- [x] Área dominante a la derecha (378×539 px) dentro de marco dorado.
- [x] Ambientación tenue basada en la portada, subordinada al panel marfil.
- [x] Icono institucional como fallback cuando falla la imagen.

## 5. Traductor: PNG **O** texto
- [x] Usar créditos públicos existentes, con preferencia al `reader_logo_url` autorizado.
- [x] Si descarga y procesa el PNG, renderizar únicamente la imagen sin nombre, etiqueta ni repetición.
- [x] Si el PNG falta, se oculta o no se puede validar, mostrar solo nombre real.
- [x] Conservar validaciones de equipo público y preferencia `show_reader_logo`.
- [x] Ajustar bloques de uno a tres equipos y mantener logos horizontales con márgenes transparentes recortados.
- [x] Adaptar fondo claro u oscuro del logo según su luminancia.

## 6. Pruebas verificadas automáticamente
- [x] PNG de 1200×630 píxeles, tipo `image/png`, peso controlado y respuesta 200.
- [x] Prohibición de sinopsis, autor, géneros, categorías, dominio y etiquetas en el SVG rasterizado.
- [x] Título de varias líneas y símbolos compatibles con fuente TrueType.
- [x] Resultado distinto entre PNG auténtico y fallback textual, comparado en píxeles.
- [x] Simulación de miniatura WhatsApp (360×189) y contraste de áreas relevantes.
- [x] Preestrenos públicos anunciados sin abrir capítulo/volumen no liberado.
- [x] Protecciones `noindex`, privacidad, +18 y acceso restringido intactas.
- [x] Nueva clave de versión `obi-social-minimal-four-v4` para renovar URL Open Graph.

## 7. Integración y entrega
- [x] Código nuevo en `lib/social-card.js`.
- [x] `api/public-meta.js`: versión de imagen social nueva, SEO textual preservado.
- [x] Test actualizado `scripts/seo-social-image-check.mjs` en pipeline de build.
- [x] Preview de Vercel validada con build/test del PNG sintético.
- [x] CI general GitHub **PASS** y contratos SEO/build **PASS** para el commit de PR `10ad0e87`.
- [ ] Revisión humana de la apariencia exacta del PNG auténtico de OX-MR y del fallback. Los endpoints productivos respondieron 200, pero HTTP no equivale a inspección visual.
- [x] PR #110 fusionado a `main` (`bc4076b3`) y despliegue Vercel producción **READY**; PNG públicos de novela y preestreno HTTP 200, capítulos no liberados 404.
- [ ] Confirmar tarjetas dentro de WhatsApp/otras redes; Cloudflare podría impedir su rastreo.

**Importante:** las casillas `[x]` certifican implementación y pruebas deterministas, no acreditan por sí solas la revisión visual en WhatsApp ni el acceso por Cloudflare. No se alteraron Supabase ni el estado editorial de novelas o capítulos.


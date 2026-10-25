# Checklist verificable · Tarjetas sociales editoriales v2

**Base:** El Obi del Lector · 1200 × 630 px · rama `feat/seo-social-editorial-visual-v2-20261024`.

**Regla:** `[x]` significa implementado y cubierto por el build/regresión aislada; `[ ]` significa pendiente de revisión visual manual o de infraestructura, nunca un PASS implícito.

## 1 · Diseño y composición
- [x] Fondo procedente de la portada, desenfoque 25 px, brillo 0.50 y saturación 0.76.
- [x] Degradado negro cálido, halo radial y elementos gráficos dorados que aportan profundidad.
- [x] Marca editorial, ícono y borde dorado con área segura.
- [x] Portada original ampliada, `fit: contain`, sin recorte ni deformación.
- [x] Distribución fija: izquierda lectura, derecha portada, créditos y pie sin superponerse.
- [ ] Revisión visual manual final sobre las portadas reales, en miniatura y dispositivos.

## 2 · Títulos y descripción
- [x] El título de la **imagen** usa la primera frase principal cuando el subtítulo largo la hace ilegible. Los metadatos y la BD se conservan.
- [x] Máximo 3 líneas a 44–56 px, truncado con puntos suspensivos.
- [x] Separación clara entre etiqueta de categoría y titular.
- [x] Fuente TrueType IBM Plex Sans incluida en Vercel y prueba de caracteres rasterizados.
- [x] Sustitución solo visual de glifos `◎`, `○`, `△`, `×` por palabras legibles; no se alteran los datos originales.
- [x] Autor y hasta 2 géneros en línea secundaria cuando existan.
- [x] Sinopsis en máximo 2 líneas; no compite con los créditos.

## 3 · Traductores y logos
- [x] Nombres y avatares tomados del RPC público existente `series_public_credits`, no datos inventados.
- [x] Respetar la selección de equipos públicos y `show_reader_logo`.
- [x] Descarga segura HTTPS/MIME/tamaño desde el bucket público permitido.
- [x] **Recorte del margen uniforme/transparente** antes de escalar logos o wordmarks.
- [x] Logo sobre una baldosa marfil contrastada con borde dorado.
- [x] Dimensión de la baldosa adaptada a 1, 2 o 3 equipos; el equipo único recibe más espacio.
- [x] Nombre real visible junto al logo y fallback exclusivo a nombre cuando falte/esté oculto.
- [x] Prueba rasterizada que verifica que el logo añade píxeles y el fondo sigue siendo contrastado.
- [ ] Inspección manual de los PNG reales del equipo OX-MR y colaboradores en la tarjeta resultante.

## 4 · Publicación y privacidad
- [x] Mantener fichas públicas y tarjetas de preestrenos anunciados.
- [x] Mantener 404 para capítulos/volúmenes no liberados, borradores, lector y tarjetas privadas.
- [x] Respetar `noindex`, restricciones +18, acceso Patreon y proyectos privados.
- [x] Mantener fallback institucional de imagen cuando falle una portada.
- [x] Preservar créditos también en tarjetas de volumen **ya liberado**.

## 5 · Pruebas
- [x] PNG real 1200 × 630 con límite de 6 MB.
- [x] Render diferenciado de letras/tildes, sin glifos idénticos «cuadrados».
- [x] Título largo tipo «¡No existe una gyaru…!» abreviado sin borrar el metadato original.
- [x] Simulación de logo horizontal con transparencia extensa y recorte automático.
- [x] Casos de logo visible, oculto y múltiples equipos, sin invasión de portada.
- [x] Contraste en píxeles del bloque de traductores.
- [x] Prueba adicional de **miniatura de 360 × 189**, semejante al tamaño en WhatsApp.
- [x] Regresión aislada de preestreno, filtros 404 y fichas SEO.
- [x] Build Vercel con ejecución de `seo-social-image-check`.
- [ ] Verificación HTTP real de novela/capítulo/equipo en Preview con **Supabase QA aislado**, no conectado a producción.
- [ ] Prueba manual de render real en WhatsApp, Facebook, X, Telegram y Discord.

## 6 · Integración / despliegue
- [x] `lib/social-card.js`: nueva composición editorial, normalización visual y logos.
- [x] `api/public-meta.js`: conservar créditos públicos de volúmenes liberados.
- [x] Renovación del hash OG de la imagen para minimizar que WhatsApp reutilice un PNG anterior.
- [x] `scripts/seo-social-image-check.mjs`: tests visuales en píxeles y miniatura.
- [x] Preview automática compilada (READY) con las pruebas de diseño; HTTP Inicio PNG 200, 1200×630. El resto requiere QA aislado.
- [x] CI general **PASS** para código `56cad9c1` (GitHub Actions `ci`, run `40161497440`); SEO build PASS. El último cambio de este checklist es solo documental.
- [ ] Revisión manual de los PNG públicos reales tras autorización de publicación.
- [ ] Fusionar a `main` cuando se apruebe el PR.
- [ ] Confirmar el nuevo deployment de producción.
- [ ] Revisar acceso de bots sociales por Cloudflare: el geobloqueo y Bot Fight Mode siguen siendo externos al generador.
- [ ] Revalidar WhatsApp con nueva URL si conserva una caché antigua.

## Evidencia de control
- Fuente de verdad: GitHub Actions, build de Vercel y pruebas de `scripts/seo-social-image-check.mjs`.
- El test incluye: PNG binario, geometría, logo opaco sobre claro, título principal corto, símbolos normalizados, miniatura y permisos.
- **No equivale a una validación de WhatsApp real**. No se cambia la configuración regional de Cloudflare ni se apunta una Preview al backend de producción para simular QA.

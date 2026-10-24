# SEO y Compartir — Fases 1 y 2

## Alcance

Implementación aislada, sin migraciones SQL ni cambios de configuración en Supabase. Las páginas de Inicio siguen siendo estáticas; las rutas de novelas, volúmenes, capítulos, equipos y carnets usan `api/public-meta.js` para entregar metadatos desde el HTML inicial. La navegación y el lector siguen usando JavaScript nativo.

## Contrato de rutas

- `/`: metadatos predeterminados de `src/index.html`.
- `/serie/:slug`: título, sinopsis, portada y canonical según la obra pública.
- `/serie/:slug?vol=N`: volumen publicado, imagen de volumen y canonical específico. En la SPA se abre la sección de volúmenes.
- `/leer/:slug/:chapter`: título, descripción y tarjeta del capítulo disponible anónimamente.
- `/equipo/:slug`: metadatos del equipo público.
- `/lector/:username`: exclusivamente datos devueltos por `reader_public`; carnets restringidos reciben `noindex`.
- `/equipo/:slug?vista=token`: solo los metadatos de la versión pública y siempre `noindex`/sin caché. El token no aparece en el canonical.

El HTML compilado se incluye explícitamente en la función Vercel para que el SSR no necesite consultar la propia Preview, protegida por SSO. Se mantiene una alternativa HTTP únicamente para desarrollo local.

## Controles

`src/share.js` integra el menú Compartir/Copiar/WhatsApp/Telegram en novelas, volúmenes no bloqueados, capítulos y páginas de equipo. No reemplaza compartir carnets, compartir citas ni los enlaces de vista previa ya existentes.

## Privacidad y seguridad

- Los metadatos de Supabase se consultan con la clave publicable y los permisos anónimos existentes; nunca con `service_role`.
- Solo se consulta la ficha pública de series con `published=true` y `archived_at IS NULL`; volúmenes con `status=published`. Los capítulos dependen de las políticas públicas de la base.
- Los datos dinámicos se escapan antes de insertarlos en HTML.
- Las rutas privadas tienen `X-Robots-Tag: noindex`.
- Los enlaces copiados se construyen sin tokens de vista previa.

## Validación

Ejecutar `npm run seo-share-check`; también forma parte del `npm run build` de Vercel.

Antes de fusionar: comprobar en una Preview autenticada la apertura real de una novela, capítulo, volumen, equipo y carnet; comprobar cabeceras y HTML con la respuesta completa de la función; validar el aspecto en móvil y escritorio. Confirmar también que el proyecto de Supabase de Preview tiene datos de prueba públicos y políticas coherentes.

## Fase 3 — Indexación y datos estructurados

### Sitemap
- `/sitemap.xml` se genera en Vercel desde las lecturas anónimas de Supabase; se publica solo en Production.
- Se incluyen Inicio, Catálogo, Calendario, Lanzamientos, Ranking, Apoyar y los slugs publicados de obras, volúmenes, capítulos y equipos públicos.
- Se excluyen series no publicadas, archivadas, para adultos o con acceso distinto de `public`; volúmenes y capítulos no publicados, eliminados, programados/futuros o con acceso restringido; equipos con `status=Proyecto privado`.
- No se incluyen carnets de lectores automáticamente, ni siquiera los públicos: la descubribilidad individual requiere evaluación específica de privacidad. Un enlace directo al carnet público sigue teniendo metadatos propios.
- Las fechas `lastmod` provienen de `chapters.updated_at` y `volumes.published_at`, si son válidas; no se inventan fechas para otras rutas.
- Se controla la cantidad de URLs y el tamaño XML, y se devuelve HTTP 503 sin caché cuando falla Supabase. Si el catálogo crece más allá del límite de un único sitemap, se debe migrar a índice paginado.

### Robots y ambientes
- `/robots.txt` sirve reglas públicas en producción, con `Sitemap: https://elobidellector.com/sitemap.xml`.
- Las Previews devuelven `Disallow: /`; el sitemap no está disponible y la navegación cliente incorpora `noindex`.
- Las rutas privadas conservan sus encabezados `X-Robots-Tag`; bloquear el rastreo no reemplaza la autenticación ni la verificación de permisos.
- No se aplicó ninguna migración, no se tocaron configuraciones de dominios ni registros DNS.

### Datos estructurados
- Inicio: `Organization` y `WebSite`.
- Fichas: `WebPage`, `BreadcrumbList` y, donde corresponde, `Book`, `Chapter`, `Organization` o `ProfilePage`, únicamente si son públicas e indexables.
- La autoría de las novelas procede de `series.author`, **no** se atribuye automáticamente a los grupos traductores.
- Usar `Book` como schema.org no significa que Google otorgue funciones especiales para libros: el programa Book Actions tiene requisitos adicionales.

### Activación de Search Console tras fusionar a producción
1. Abrir [Google Search Console](https://search.google.com/search-console/) con la cuenta administradora del dominio.
2. Añadir una **propiedad de dominio** `elobidellector.com`. Google genera un TXT único que deberá instalar el propietario en DNS (Cloudflare o el proveedor DNS autoritativo). No se deben inventar tokens.
3. Comprobar la verificación del dominio con Google. Las propiedades de dominio abarcan el dominio y sus subdominios; confirmar también el dominio preferido `https://elobidellector.com/`.
4. Tras validar el deploy productivo, enviar `https://elobidellector.com/sitemap.xml` en la sección **Sitemaps**.
5. Revisar Indexación de páginas e Inspección de URLs, incluyendo /serie, /leer, /equipo y un carnet privado, y validar el HTML de 200, 404, 503 y noindex.
6. Auditar resultados en los días siguientes. El envío de un sitemap no garantiza que Google indexe ninguna URL.

### Pruebas automáticas
- `npm run seo-indexacion-check` valida sitemap, robots, límites de privacidad y comportamiento ante caída de Supabase. Forma parte de `npm run build`.
- `npm run seo-share-check` conserva validaciones previas y añade JSON-LD seguro.
- Pendiente del PR: pruebas manuales de HTTP y UX contra una Preview autenticada y verificación real con Search Console cuando se integre en producción.

## Próximas mejoras (fuera de este PR)

- Crear imágenes sociales horizontales 1200×630 dedicadas y mejorar las composiciones de portada.
- Añadir Search Console con verificación real del propietario tras producción y automatizar reportes si se conecta la cuenta.
- Exponer ajustes opcionales de metadatos desde el Bibliotecario/Studio manteniendo los permisos existentes.
- Verificar la indexación real en Google y las tarjetas sociales en los validadores de redes.

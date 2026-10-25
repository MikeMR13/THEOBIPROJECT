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
- Se excluyen series no publicadas, archivadas, para adultos o con acceso distinto de `public`; volúmenes y capítulos no publicados, eliminados, programados/futuros (incluido `public_at`) o con acceso restringido; equipos con `status=Proyecto privado`.
- No se incluyen carnets de lectores automáticamente, ni siquiera los públicos: la descubribilidad individual requiere evaluación específica de privacidad. Un enlace directo al carnet público sigue teniendo metadatos propios.
- Las fechas `lastmod` provienen de `chapters.updated_at` y `volumes.published_at`, si son válidas; no se inventan fechas para otras rutas.
- Se controla la cantidad de URLs y el tamaño XML, y se devuelve HTTP 503 sin caché cuando falla Supabase. Si el catálogo crece más allá del límite de un único sitemap, se debe migrar a índice paginado.

### Estados HTTP y errores
- Las rutas públicas dinámicas inexistentes devuelven `404`; caídas transitorias de Supabase devuelven `503` y `Retry-After` sin desindexarlas.
- La navegación SPA conocida conserva sus enlaces profundos; eliminamos el catch-all genérico que devolvía `200` a cualquier ruta inexistente.
- Las obras etiquetadas +18 tienen `noindex` por defecto, sin alterar su contenido ni los accesos de la plataforma.

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

## Auditoría HTTP de la Preview — bloqueo del 24-10-2026

Se verificaron las respuestas HTTP reales de una Preview con el acceso de Vercel. **La compilación y las pruebas unitarias pasan, pero la validación HTTP integrada NO pasa**.

| Ruta | Resultado real |
|---|---|
| `/` | 200, metadatos del Inicio |
| `/robots.txt` | 200, `Disallow: /`, noindex |
| `/sitemap.xml` | 404, correcto en Preview |
| Ruta desconocida | 404, correcto |
| `/serie/prueba` | 200 con el HTML de Inicio, incorrecto |
| `/leer/prueba/1` | 200 con el HTML de Inicio, incorrecto |
| `/equipo/prueba` | 503, backend QA no disponible |
| `/api/public-meta?kind=serie&slug=prueba` | 503, backend QA no disponible |

### Regla global de proyecto Vercel

La regla global `Obi SPA client navigation` (`65961c4a-fa11-433c-bbf0-bc7021c1ad84`) sobrescribe las rutas `/serie` y `/leer` con `/index.html`, por encima de los rewrites de `vercel.json`.

Se preparó una corrección **solamente en staging de Vercel** (versión `c1bad33b-f696-4d41-be48-6412a54075c8`). Esta versión conserva las rutas de sesión y catálogo, y retira las de novelas y capítulos para que las controle el repositorio. La versión live sigue siendo `4e5688bc-d6b7-4e41-8c9f-a5c51312f532`. No se ha promovido ni modificado producción.

**Publicación futura:** coordinar la activación de la ruta corregida con la fusión del código SSR. Activar el cambio global antes de disponer del código nuevo en producción puede afectar los enlaces profundos.

### Backend de Preview intencionadamente ficticio

El `config.js` de la Preview expone un backend `https://obi-qa-backend.invalid`, dirección no resoluble que sirve para mantener el aislamiento. Por tanto, ninguna ficha dinámica puede pasar la prueba con datos reales. No se debe apuntar la Preview a la base de producción: la compilación bloquea explícitamente ese uso.

La validación exige una instancia QA **aislada**, con datos ficticios publicados, políticas RLS comprobadas y acceso HTTPS configurado en las variables de entorno de Preview.

### Puerta de aprobación

Junto con la compilación, ejecutar `SEO_PREVIEW_URL=https://<preview>.vercel.app npm run seo-preview-check` desde un entorno con acceso autenticado a la Preview. Se admiten `SEO_PUBLIC_SERIES_SLUG` y `SEO_PUBLIC_CHAPTER_NUM` para probar contenido real. Solo considerar aprobada la validación si devuelve `SEO Preview HTTP: PASS` y la revisión visual/manual es satisfactoria.

**La fase 4 queda retenida hasta superar ambos bloqueos.**

## GitHub Actions — compuertas para continuar a fase 4

Se incorporaron dos workflows en el PR #105. Las comprobaciones de compilación NO se confunden con la verificación real de la Preview.

### 1. `SEO · contratos y build` — sin secretos

- Archivo: `.github/workflows/seo-ci.yml`.
- Se ejecuta al abrir/actualizar un PR contra `main` y admite ejecución manual.
- En un entorno aislado con URL `.invalid` y clave ficticia valida sintaxis, Open Graph, JSON-LD, sitemap, robots, rutas, privacidad, build y aislamiento Preview.
- Debe terminar en PASS sin conectar Supabase ni Vercel externos.

### 2. `SEO · Preview HTTP y Chromium` — secreto y QA protegidos

- Archivo: `.github/workflows/seo-preview-e2e.yml`.
- Se inicia automáticamente al abrir/actualizar el PR **solo desde la rama** `feat/seo-compartir-publico-20261024` dentro del mismo repositorio; también admite ejecución manual en esa rama.
- Usa el entorno GitHub `seo-qa` para requerir aprobación humana del commit exacto antes de permitir acceso a secretos. **Configurar Required Reviewers y la restricción de ramas antes de cargar secretos**. Si el plan de GitHub no permite proteger el entorno, no añadir secretos y no habilitar este trabajo hasta tener un mecanismo equivalente.
- Verifica por la API de Vercel que una Preview del proyecto y equipo correctos está `READY`, corresponde al SHA exacto y no es producción. Se niega a usar el URL como confiable solo porque aparezca en un comentario o variable no verificada.
- Valida los códigos HTTP reales, que las rutas inexistentes sean 404, metadatos por obra/capítulo/equipo, noindex/robots, backend QA aislado y sitemap de Preview no visible.
- Finalmente ejecuta Chromium con Playwright en 390 px y 1366 px, abre Catálogo, novela, capítulo, equipo y menú Compartir. El bypass de SSO solo se usa contra el origen verificado; la cookie se conserva en memoria, sin capturas ni archivos de autenticación.
- Un fallo de infraestructura debe aparecer como **FAIL**, nunca como aprobado u omitido.

### Configurar en GitHub (no colocar valores en código ni en el chat)

1. Settings → Environments → crear `seo-qa`. Establecer **Required reviewers** y limitar las ramas permitidas para deploys de QA.
2. En los secretos del entorno `seo-qa` guardar `VERCEL_TOKEN` (acceso de lectura al deployment del proyecto `theobiproject`) y `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection Bypass for Automation). No almacenar secretos en variables normales ni exponerlos en logs.
3. En las variables (no secretas) del mismo entorno configurar `SEO_PUBLIC_SERIES_SLUG`, `SEO_PUBLIC_CHAPTER_NUM` y `SEO_PUBLIC_TEAM_SLUG` con slugs/números ficticios **existentes y públicos** en el backend QA.
4. En Vercel Preview configurar `OBI_SUPABASE_URL` y `OBI_SUPABASE_PUBLISHABLE_KEY` apuntando a una **instancia QA accesible e independiente**. La configuración actual `https://obi-qa-backend.invalid` no permite superar las pruebas.
5. Comprobar que la regla global de Vercel no intercepte `/serie` y `/leer` en el proyecto de QA. La corrección de la regla global está preparada en staging y **no debe promoverse a producción antes de un release coordinado**.
6. Reejecutar el workflow y verificar los resultados de ambos checks. Solo entonces decidir el inicio de fase 4. La protección de `main` (Settings → Branches / Rulesets) puede requerir los contextos `SEO / build y privacidad` y `SEO / HTTP y navegador QA`; eso requiere permisos administrativos y no se activó automáticamente.

### Resultado inicial observado

- La primera ejecución real de `SEO · contratos y build` se completó con éxito.
- La primera ejecución real del E2E se detuvo en preflight con **`Configura VERCEL_TOKEN en el entorno protegido seo-qa`**. La ausencia de configuración es un bloqueo real, no un test aprobado.
- No se han creado ni solicitado tokens secretos, ni se ha usado Supabase de producción.

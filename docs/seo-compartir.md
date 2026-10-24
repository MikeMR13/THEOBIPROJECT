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

## Próximas mejoras (fuera de este PR)

- Crear imágenes sociales horizontales 1200×630 dedicadas y mejorar las composiciones de portada.
- Crear `sitemap.xml`, `robots.txt`, Search Console y datos estructurados.
- Exponer ajustes opcionales de metadatos desde el Bibliotecario/Studio manteniendo los permisos existentes.
- Verificar la indexación real en Google y las tarjetas sociales en los validadores de redes.

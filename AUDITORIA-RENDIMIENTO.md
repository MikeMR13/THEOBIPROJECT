# Auditoría de rendimiento · El Obi del Lector
Fecha: 17 oct 2026 · Alcance: `src/`, `public/sw.js`, `vercel.json`, `scripts/build.mjs`, consultas a Supabase.

## Resumen
El sitio carga lento sobre todo por **esperas en cadena**: un paso no empieza hasta que termina el anterior. No es un problema de tamaño. Antes de dibujar el inicio hay unas 6 esperas seguidas a la red, y luego otras 11 consultas a la base de datos.
Además, cada visita vuelve a descargar los archivos porque el service worker siempre pide primero a la red. Tampoco hay minificado y las portadas se descargan en tamaño original.

## Hallazgos (ordenados por impacto)

| # | Problema | Dónde | Impacto | Esfuerzo |
|---|---|---|---|---|
| 1 | El arranque espera, en cadena, a `app.js`, luego `reader.js`, luego `ui.js` (descargas una tras otra por `await import`) | app.js l.4-5 | Alto | Bajo |
| 2 | Antes de pintar: `auth.getUser()` (pregunta al servidor de Supabase), luego `profiles`, luego `whoami`. Son 3 viajes seguidos, incluso para visitantes sin cuenta | loadSession | Alto | Bajo |
| 3 | `render()` espera la configuración de temporadas (2 consultas) antes de dibujar cada página | app.js render | Alto | Bajo |
| 4 | El service worker pide siempre primero a la red; nunca sirve del caché si hay conexión | sw.js | Alto | Bajo |
| 5 | Al instalar, el service worker descarga `studio.js` (262 KB) para todos los lectores, aunque nunca usen el Estudio | sw.js SHELL | Medio | Bajo |
| 6 | Los archivos van sin minificar: ui.js 138 KB, studio.js 262 KB, app.js 46 KB, reader.js 42 KB | build.mjs | Medio | Bajo |
| 7 | Versionado manual (`?v=30`, `obi-v18`): si se olvida subir un número, se queda la versión vieja | app.js, sw.js | Medio | Bajo |
| 8 | Sin cabeceras de caché largas para archivos versionados (Vercel revalida en cada visita) | vercel.json | Medio | Bajo |
| 9 | El inicio hace unas 11 consultas y descarga **todas** las obras publicadas, con sus conteos de capítulos y volúmenes | ui.js home | Alto (crece con el catálogo) | Medio |
| 10 | Portadas en resolución original para miniaturas de 40–170 px | ui.js `media()` | Alto en móvil | Medio |
| 11 | `refreshBadge` hace 4 consultas (hasta 2000 capítulos) en cada inicio y en cada cambio de sesión | ui.js pendingMap | Medio | Bajo |
| 12 | La librería de Supabase viene de esm.sh y se carga en varias piezas pequeñas, una tras otra | app.js l.1 | Medio | Bajo |
| 13 | Las fuentes bloquean el primer pintado y faltan las conexiones anticipadas a fonts.gstatic.com y a Supabase | index.html | Bajo–medio | Bajo |
| 14 | Unos 40 KB de estilos van escritos dentro de ui.js: se procesan en cada carga y no se guardan aparte | ui.js CSS/CSS2 | Bajo | Medio |
| 15 | La ficha de la obra consulta dos veces la misma obra: la página y el tema de temporada del equipo | afterRender | Bajo | Bajo |
| 16 | El catálogo descarga 500 capítulos solo para saber cuál es el último de cada obra | ui.js catalog | Medio | Bajo |

## Plan de automatización

### Fase 1: arranque sin esperas
- Descargar `app.js`, `ui.js` y `reader.js` al mismo tiempo, avisando al navegador desde el `<head>` (`modulepreload`).
- Leer la sesión del almacenamiento local (`getSession`) y pintar de inmediato. El perfil y `whoami` llegan después y actualizan la barra superior.
- La temporada se aplica después de pintar, no antes.
- Conexiones anticipadas a Supabase, a esm.sh y a fonts.gstatic.com.
- Cargar la librería de Supabase en un solo archivo (`?bundle`).

### Fase 2: compilación automática en Vercel (sin pasos manuales)
`npm run build` haría, en cada push:
- Minificar JS y CSS con esbuild.
- Calcular un sello por contenido para cada archivo y reescribir solos los `?v=`. Ya no habría que subir números a mano.
- Generar `sw.js` con la versión de la compilación y la lista exacta de archivos, sin `studio.js`.
- Cabeceras en `vercel.json`: caché de un año para archivos versionados y `no-cache` para `index.html` y `sw.js`.
- El CI de GitHub ya ejecuta `npm run check`: le agregaría una verificación de sintaxis de todos los archivos.

### Fase 3: service worker inteligente
- Los archivos versionados se sirven del caché, porque nunca cambian.
- Las páginas se piden a la red con un límite de 2.5 s; si tarda más, se sirve la copia guardada.
- Portadas: se muestra la guardada al instante y se actualiza en segundo plano.

### Fase 4: datos precalculados en Supabase
- **`home_feed()`**: una sola consulta trae todo lo que el inicio necesita (destacadas, actualizaciones, ranking, equipos, terminadas, próximos). Hoy son unas 11.
- **Instantánea con cron cada 5 min** (`home_snapshot`): el inicio para visitantes sale de una tabla ya calculada.
- **`unread_counts()`**: un solo RPC reemplaza las 4 consultas de la insignia de capítulos nuevos.
- **`series_last`**: el último capítulo por obra, para el catálogo, sin descargar 500 filas.

### Fase 5: imágenes
- Al subir una portada en el Estudio, generar automáticamente una miniatura WebP de 360 px (`cover_thumb_path`) y usarla en tarjetas y carruseles. Se haría en el navegador, sin depender del plan de Supabase.
- Un script único para crear miniaturas de las portadas existentes.
- `loading="lazy"` y tamaños fijos en las portadas, para que la página no salte al cargar.

## Estado de ejecución (17 oct 2026)

**Fase 1 · hecha** (`src/app.js`, `src/index.html`)
- `reader.js` y `ui.js` pasan a importación estática + `modulepreload` de app, ui, reader, season, anim, teampage y supabase-js.
- Sesión con `getSession()` (local). La barra se pinta al instante con el perfil guardado en `localStorage` (`obi-me`); `profiles` y `whoami` van **en paralelo** y la actualizan. Las rutas que dependen del rol (`/estudio*`, `/perfil`, `/solicitud`, bienvenida) esperan `meReady`.
- `render()` ya no espera la temporada; se aplica en `afterRender`.
- Se omite el `INITIAL_SESSION` duplicado de `onAuthStateChange`.
- Preconnect a Supabase, esm.sh y fonts.gstatic.com; supabase-js con `?bundle`.

**Fase 2 · hecha** (`scripts/build.mjs`, `package.json`, `vercel.json`, `ci.yml`)
- esbuild minifica JS y CSS. Si no estuviera instalado, publica sin minificar y avisa.
- Sello por contenido: reescribe solos todos los `?v=` (también los encadenados, como season → anim). Los números de `src/` ya no importan.
- `sw.js` se genera con versión `obi-<sello>` y la lista exacta del arranque, **sin studio.js ni admin.js**.
- Cabeceras: `immutable` 1 año para `*.js|css?v=`, `no-cache` para páginas, `index.html` y `sw.js`.
- `npm run check` verifica la sintaxis de todos los JS; el CI ahora instala dependencias.

**Fase 3 · hecha** (`public/sw.js`)
- Archivos versionados: del caché primero.
- Páginas: red con límite de 2.5 s y la copia guardada como respaldo.
- Portadas (`destination: image`): la guardada al instante y se actualiza en segundo plano. Se piden en modo CORS (para no guardar respuestas opacas) y el caché se limita a 400.

**Pendiente:** medir con Lighthouse (móvil) después del despliegue.

## Medición de referencia (antes) · 17 oct 2026, PageSpeed móvil
Rendimiento **72** · FCP 3.3 s · LCP 5.6 s · TBT 30 ms · CLS 0.004 · SI 3.6 s.
Principal causa: la hoja de Google Fonts (120 KB) bloqueaba el render (ahorro estimado de 2.4 s). Corregido con `media="print"` + `boot.js`, que la activa al llegar. También se agregó la metadescripción (SEO 90).

Del árbol de dependencias (latencia crítica 2,385 ms):
- supabase-js llegaba en ~20 piezas desde esm.sh (incluidos buffer, process, events…). Ahora la compilación lo empaqueta en `/supabase.js`, un solo archivo propio, con sello y caché de un año. Si falla, usa esm.sh.
- El inicio esperaba a todo el JS para pedir los datos. Ahora `boot.js` pide `home_feed` (por GET) mientras se descarga el JS, y precarga la portada destacada con `fetchpriority=high` (aviso «Descubrimiento de LCP»).
- `blocks.js` iba sin versión: ahora lleva sello y precarga. La carpeta `dist-min/` ya no se usa y se puede borrar.

**Fases 4–5 · hechas en código** (falta aplicar la migración `20261029_rendimiento_inicio.sql` **antes** de desplegar)
- `home_feed()`: el inicio pasa de ~11 consultas a 1. Lee `private.home_snapshot`, que pg_cron recalcula cada 5 min (`obi-home-snapshot`); si la copia tiene más de 6 min, se recalcula al momento. El filtro +18 sigue en el navegador. Si el RPC falla, el inicio vuelve a las consultas de antes.
- `unread_counts()`: un RPC en lugar de 4 consultas (y hasta 2000 capítulos) para la insignia y Lanzamientos. Tiene el mismo respaldo.
- Vista `series_last` (con `security_invoker`): el catálogo ya no descarga 500 capítulos, y los rankings se piden en paralelo.
- Miniaturas: columna `series.cover_thumb_path`. Un trigger la vacía cuando cambia la portada. El Estudio (`src/thumbs.js`) crea en segundo plano, al abrir las obras del equipo, la miniatura WebP de 360 px de cada portada nueva o cambiada, y la guarda con `series_set_thumb`. Tarjetas, carruseles, rankings, búsqueda y reseñas usan la miniatura; la portada de la ficha y la destacada siguen en tamaño original.
- Portadas existentes: `npm i --no-save sharp && SUPABASE_SERVICE_ROLE_KEY=… node scripts/thumbs.mjs` (una vez, en tu equipo).
- Contrapartida: «Qúe hay de nuevo» y «Próximos» pueden ir hasta 5 min atrasados.

## Resultado esperado
Son estimaciones para un móvil 4G que todavía no he medido en tu sitio. Conviene medir antes y después con Lighthouse.

| Métrica | Hoy (estimado) | Tras fases 1–3 | Tras fases 4–5 |
|---|---|---|---|
| Esperas en cadena antes de pintar | ~6 | 1–2 | 1 |
| Consultas del inicio | ~11 | ~11 | 1–2 |
| JS descargado en la 1.ª visita | ~270 KB + supabase | ~120 KB (minificado y comprimido) | igual |
| Visitas repetidas | todo vuelve a la red | casi todo desde el caché | igual |
| Peso de portadas en el inicio | varios MB | igual | ~10× menos |

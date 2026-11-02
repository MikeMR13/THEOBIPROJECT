# Auditoría transversal de rendimiento · 2 de noviembre de 2026

**Sitio:** El Obi del Lector (web responsive y PWA). **Base:** `main` en `22f27f5869263a5e0f1b7ba7122a74cedeb98555`. **Rama de corrección:** `fix/auditoria-global-mobile-pwa-desktop-20261102`.

## Alcance y metodología

Se revisaron arranque HTML/JS, navegación SPA, Inicio, Catálogo, Buscar, Ranking, Calendario, fichas de novelas y equipos, sesión, Perfil/Preferencias, Biblioteca/Descargas, Lector, Estudio, Mostrador del Bibliotecario y PWA. Se contrastó el código con registros de Supabase de la ventana predeterminada de 24 h y con pruebas de repositorio: Chromium, WebKit (Safari), simulador PostgREST/RPC, accesibilidad, cache offline, PWA y controles de tamaño. Las pruebas no leen datos personales ni exigen nuevas funciones, migraciones ni infraestructura.

**Importante:** latencia de servidor y tiempos de usuario final son métricas diferentes. Las mediciones actuales de LCP/INP/CLS proceden solo de laboratorio cuando el runner lo permite; no se atribuyen a dispositivos físicos ni a usuarios reales.

## Evidencia del backend (registros de 24 h antes de los cambios)

| Endpoint | Respuestas 200 | P95 correcto (ms) | Respuestas 500 | Señal |
|---|---:|---:|---:|---|
| `/rest/v1/series` | 4810 | 788 | 59 | Las relaciones anidadas de conteos pueden llevar a `statement_timeout`. |
| `/rest/v1/chapters` | 3821 | 410 | Consultar por estado | Alta demanda compartida entre múltiples pantallas. |
| `/rest/v1/platform_settings` | 2439 | 522 | No determinado | Decoración/temporada y otros ajustes son reutilizados por múltiples rutas. |
| `/rest/v1/volumes` | 2069 | 428 | No determinado | Proteger la paginación y reutilizar metadatos de la sesión. |
| `/rest/v1/series_last` | 108 | 2971 | No determinado | Latencia de cola en la hidratación del catálogo. |
| `/rest/v1/rpc/agenda_events` | 521 | 1383 | No determinado | Carga crítica del calendario. |

Fuente: agregados de `edge_logs` (sin URL de usuario ni tokens). Las cifras no prueban por sí solas cuál es la pantalla que causó cada error.

## Hallazgos y correcciones

| Superficie | Problema verificado | Cambio en esta rama | Riesgo residual |
|---|---|---|---|
| Inicio/Catálogo (móvil/escritorio) | `series_last` tarda en el percentil 95, aunque las tarjetas ya se muestran progresivamente. | Espera primaria limitada a 1 s y alternativa pública limitada a 2 s, sin bloquear el catálogo. | Sin garantía de recuentos recientes si fallan ambos servicios; no se inventan datos. |
| Buscar (cualquier dispositivo) | La consulta de capítulos, la búsqueda de lectores, el progreso y los créditos podían retrasar resultados de obras. | Consultas secundarias en paralelo, esperas acotadas y conservación de resultados del índice. | Los resultados secundarios podrían omitirse temporalmente; reintentar la búsqueda los recupera. |
| Buscar / cambios de cuenta | El índice en memoria se reutilizaba hasta 20 s aunque la identidad cambiara. | Clave del índice por identidad; el permiso +18 sigue verificado y no se comparten resultados entre sesiones. | Se mantiene la caché breve solo dentro de la misma cuenta. |
| Calendario y enlace antiguo `/lanzamientos` | Guarda de ruta podía impedir pintar el alias; cada fecha construía un nuevo `Intl.DateTimeFormat`. | Alias compatible con normalización y un formateador compartido por visita. | RPC central del calendario sigue dependiendo de Supabase. |
| Perfil, Preferencias, Estudio | `team_members` de la barra de navegación bloqueaba la disponibilidad de `meReady`. | Membresías del menú asíncronas, separadas de `my_profile` y `whoami`; guardia de cuenta preservada. | Las rutas que requieren rol esperan `whoami` por seguridad. |
| Páginas públicas de equipos | `series` contenía `chapters(count)` incluso cuando el código ya consultaba `publicSectionCounts` a continuación; también en colaboraciones. | Eliminados los conteos anidados; recuentos públicos por el contrato vigente. Error de obras ahora es error recuperable, no “equipo vacío”. | La completitud de conteos depende del feed público disponible y su RLS. |
| Página de equipo | Novedades y colaboraciones se ejecutaban en secuencia. | Sus lecturas empiezan concurrentemente. | El render integral espera ambas; posible mejora posterior por hidratación sin rehacer el editor de diseño. |
| Todas las rutas | Un fallo no manejado de importación/módulo podía dejar pantalla antigua o error no recuperable. | Pantalla general de error con reintento y guardia de navegación; conserva el modo offline cuando realmente no hay conexión. | No sustituye la observabilidad en dispositivo físico. |
| PWA / lectura offline | Caché de capítulos y precaché del lector tienen contratos propios de privacidad y presupuesto. | **Sin cambio de almacenamiento**; se exige mantener sus pruebas y evitar cachear PostgREST autenticado. | Instalación y lectura sin red se verifican en navegador simulado, no en todas las versiones de SO. |
| Estudio/Mostrador | Correcciones recientes de carga progresiva y controles de permisos ya están en `main`. | Se preservan; se exige CI transversal sin modificar SQL ni políticas. | Rendimiento editorial real debe comprobarse con sesión autorizada. |

## Matriz obligatoria de validación

- **WebKit/Safari:** 320 px (Catálogo), 390 px (Inicio, Buscar, Ranking, Calendario, errores/esperas), 768 px (Calendario), 1440 px (Ranking); alias `/lanzamientos`, cambio rápido de pestaña, HTTP 500 simulado, RPC lenta.
- **Chromium/Escritorio y móvil:** tests preexistentes del arranque, catálogo 390/1440 px, Lector, Biblioteca, Perfil/Estudio y regresión responsive.
- **PWA/offline:** verificación de `sw.js`, pre-cache, presupuesto sin nuevas descargas al activar, modo avión, continuidad de lectura y preferencias.
- **Seguridad y datos:** ningún dato del usuario se agrega al Service Worker global; los permisos de cuenta, RLS y restricciones +18 permanecen vigentes.
- **Costos:** GitHub Actions estándar con backend ficticio; no crear funciones, cron, upgrades, despliegues adicionales de pago ni migraciones en Supabase/Cloudflare/Vercel.

## Pendientes no solucionados en esta intervención

- El grafo inicial carga `app.js` y `ui.js` de forma estática incluso en rutas privadas. Separar `ui.js` podría mejorar el arranque en pantallas sin interfaz pública, pero requiere una migración de precaché PWA y pruebas de lectura offline para evitar regresiones. No se introduce sin ese trabajo integral.
- No se han comparado Core Web Vitals **reales** (LCP/INP/CLS de usuarios) antes/después ni medido un dispositivo iPhone/Android físico.
- Los códigos 500 antiguos no se consideran resueltos hasta observar de nuevo los registros tras la publicación.

## Publicación

Las correcciones se preparan como PR independiente; no cambiar producción hasta que el usuario autorice fusionar/desplegar y las verificaciones estén aprobadas.

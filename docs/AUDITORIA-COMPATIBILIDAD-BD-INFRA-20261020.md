# Auditoría integral de compatibilidad — TheObiProject (20/10/2026)

**Alcance:** fase 7, PR #21, rama `release/candidata-fases1-6-20261020`.  
**Ámbitos revisados:** GitHub, CI, Preview de Vercel, dominio y DNS de Cloudflare, inventario y permisos de Supabase, Storage, funciones Edge, y contratos del frontend.
**Modalidad:** lectura y pruebas con datos ficticios. **CERO escrituras** en Supabase, Cloudflare, Vercel productivo o ramas `main`. Sin nuevos servicios ni costos.

## 1. Resultado de integración y despliegues

- Repositorio **`MikeMR13/THEOBIPROJECT`**, proyecto Vercel **`theobiproject`**, dominio principal **`elobidellector.com`**.
- PR #21 deriva de PR #20 e incluye las fases visuales 1–5 y funcionales 6.1–6.5. El último CI anterior a esta auditoría, **#39507493602**, pasó correctamente. La nueva prueba `scripts/phase7-platform-compat-check.mjs` requiere comprobar el CI del último commit de este informe.
- GitHub confirma que `main` no recibió estos cambios y que el PR #21 sigue en borrador.
- Preview existente: `https://theobiproject-76c27jcri-cronica.vercel.app/` (Vercel `READY`, commit `eff3beb9f3a384ed281b5978c301c5fd7930fbad`). La comparación de GitHub desde ese commit a la candidata (antes de la presente auditoría) mostró **solo documentación y scripts de pruebas**. Los **módulos de aplicación publicados son funcionalmente iguales**, aunque la Preview no representa el mismo SHA final.
- Se verificó por conexión autenticada de Vercel HTTP **200** para Inicio, `/catalogo`, `/config.js`, `/reader-pref-cache.js` y `/studio-reader-defaults.js`. El HTML contiene CSS accesible, entrada versionada y elementos de navegación.
- **Limitación de datos:** la configuración pública de esa Preview contiene `https://obi-qa-backend.invalid` y una clave *ficticia*, no un Supabase real. Esta Preview sirve para verificar artefactos y rutas estáticas, pero **no** para login, RLS o persistencia. No se consultaron ni expusieron secretos.
- La API de Vercel rechazó crear una Preview nueva del SHA final por el límite de despliegues gratuito diario (`402 api-deployments-free-per-day`). **No eludir cuota, no promover, no desplegar producción.**

## 2. Supabase productivo — inventario confirmado con SELECT de solo lectura

Proyecto: **THEOBIPROJECT**, referencia `qfllthjpjuaztppvpsrk`, estado `ACTIVE_HEALTHY`.

| Componente | Resultado |
|---|---|
| Tablas de aplicación en `public` | 68 |
| Tablas de `public` sin RLS | **0** |
| Políticas RLS en `public` | 132 |
| Migraciones registradas en backend | 32 |
| Scripts `.sql` del repositorio | 26, historial diferente al registrado: **no ejecutar automáticamente** |
| Equipos configurados | 1; con diseño personalizado: 1 |
| Equipo con `reader_defaults` personalizado | 0; el campo existe, `jsonb NOT NULL` |
| Registros de `reader_prefs` | 1, con excepciones por volumen: 0 |
| Perfiles con `ui_prefs` no vacías | 0 |
| Calendario de temporadas | 108 entradas |
| Obras, volúmenes, capítulos | 4 / 9 / 150 |

**Contratos de almacenamiento:** `profiles.ui_prefs`, `reader_prefs.global`, `reader_prefs.per_volume`, `teams.design`, `teams.reader_defaults`, `platform_settings.seasons` y `volumes.epub_fonts` existen con los tipos esperados. `chapters.body` sigue siendo `jsonb`.

**RLS comprobada:** `reader_prefs`, `reading_progress` y `read_chapters` restringen la fila a `user_id = auth.uid()`; `team_design_drafts` requiere `private.team_can(team_id,'profile')`. Las modificaciones de `teams` usan `private.team_can(id,'profile')`, con condición de verificación adicional. Las RPC `team_design_save`, `team_design_publish`, `team_design_new_token` y `my_team_permissions` solo conceden `EXECUTE` a usuarios autenticados, no a `anon`. Se inspeccionaron contratos; **no se ejecutaron escrituras ni pruebas de roles reales**.

**Storage:** `avatars` (público), `obi-app` (público), `obi-epub` (privado), `obi-media` (público). Los tipos de medios EPUB admitidos y las fuentes `woff`, `woff2`, `ttf` y `otf` permanecen configurados. Las políticas de `storage.objects` conservan escrituras por equipo/usuario y lectura de EPUB restringida.

**Edge Functions activas:** `migrate-nlobi` (nombre heredado), `publish-asset`, `season-sync`, `notify-email`, `patreon`, `push`. El nombre heredado de migración no significa que el despliegue actual esté conectado al Vercel `nlobi`; no renombrar funciones activas sin auditar consumidores.

## 3. Hallazgo BLOQUEANTE — Privacidad de profiles (SEG-01, alta)

La política `profiles read` en `public.profiles` tiene `USING (true)` y el rol `anon` posee `SELECT` sobre las **32 columnas**. Entre ellas figuran `patreon_user_id`, `discord_id`, `telegram_id`, `hidden_series`, `notify`, `ui_prefs` y `delete_requested_at`.

**Riesgo:** un cliente anónimo con acceso a la API de datos podría consultar valores sensibles de perfiles, incluso de usuarios que no sean el dueño. **La exposición potencial está sustentada por GRANT + RLS; no se realizó lectura de datos de personas.**

**No corregir con un REVOKE masivo en producción:** `src/app.js` consulta `profiles.select('*')` para el propietario, y las fichas públicas y búsquedas dependen de columnas públicas. Una restricción indiscriminada puede romper perfiles, Studio, preferencias y sesiones.

**Solución que requiere implementación y QA específicos antes de desplegar:**
1. Definir lista mínima pública (por ejemplo username, avatar, bio, ajustes explícitamente públicos), dejando fuera identificadores privados, notificaciones, obras ocultas y preferencias personales.
2. Proveer una vista o RPC pública con campos filtrados y contrato verificado; mover las consultas públicas existentes a esa interfaz.
3. Mantener acceso del propietario a datos privados mediante política/RPC separada y probada con `anon`, propietario, otro lector y administrador. Confirmar que `select('*')` de propietario siga funcionando después del cambio.
4. Revisar `SECURITY DEFINER`, `GRANT`, acceso a perfiles no descubribles y visibilidad de biblioteca. Aplicar cambios de SQL **solo** con migración revisada, base aislada y aprobación explícita.

**Estado:** ABIERTA — bloqueo de aprobación para producción; no se alteró la tabla ni su RLS.

## 4. Asesores de Supabase — hallazgos a clasificar, no correcciones automáticas

**Seguridad:** 5 tablas con RLS y sin políticas (casos internos/restringidos a verificar); **36 RPC `SECURITY DEFINER` ejecutables por anónimos** y 81 por autenticados; aviso sobre protección de contraseñas filtradas (opción conocida de pago, no se activa).

Examinamos una muestra de funciones: `admin_review_queue` y `admin_review_resolve` comprueban `private.is_admin()`; `export_my_data` exige `auth.uid()`; `home_feed` es intencionalmente público. **El asesor señala superficie a auditar, no prueba vulnerabilidad de todas las funciones.** [Asesor para funciones anónimas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

**Rendimiento:** 70 FK sin índice, 54 políticas con `auth_rls_initplan`, 3 tablas sin PK, 4 índices sin uso detectado, 165 casos de políticas permisivas múltiples y 1 índice duplicado. Estos son hallazgos para priorizar según consultas y `EXPLAIN`, no instrucciones para crear índices o quitar políticas de golpe. [Asesor para FK sin índice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## 5. Cloudflare, DNS y Vercel

- Zona Cloudflare **`elobidellector.com` activa**, plan **Free Website**, `paused=false`. Los registros A del dominio principal y de `www` están bajo proxy de Cloudflare, sin cambios.
- Vercel reconoce `elobidellector.com` como dominio del proyecto `theobiproject`, pero su comprobación de dominio devuelve `misconfigured=true` para raíz y `www` mientras DNS resuelve a IPs de Cloudflare.
- El proxy puede impedir que Vercel reconozca directamente el origen correcto, por lo que esto **no demuestra por sí solo que el sitio esté caído**. Existe discrepancia entre valores A de origen y las recomendaciones actuales de Vercel; requiere revisión de enrutamiento y HTTPS con evidencia del navegador.
- **No modificar DNS, proxy, CAA, MX, correo, ni el dominio de producción** hasta validar consecuencias. Especial atención a `www`, que no aparece entre los dominios explícitos de proyecto enumerados.
- Vercel no informó errores de funciones/runtime en el periodo consultado de 24 horas, pero una web SPA estática puede fallar en el navegador sin emitir errores de servidor.

## 6. Contratos conservados mediante tests y comparación Git

- Pruebas de fases 1–6.5 y fase 7: responsive, CSS, fechas, cinta, carruseles, catálogo, modo lector, EPUB, furigana/fuentes, publicaciones, temporada, Studio, permisos, edición y vista previa.
- Nueva `scripts/phase7-platform-compat-check.mjs`, incorporada al CI: comprueba archivos históricos de Supabase/Workers/PWA, CSP/headers, reglas Vercel, rutas y módulos esenciales de lectura/Studio. No ejecuta SQL ni redes.
- La comparación Git con `main` confirma que **no se cambiaron** `vercel.json`, `supabase/config.toml`, los archivos `supabase/migrations/*.sql`, las funciones Supabase y los Workers de Cloudflare.
- Se mantiene en borrador PR #21. **No** fusionar PR #10–#20 otra vez sobre `main`.

## 7. Qué se puede aprobar y qué no

**Aprobable técnicamente** (si último CI vuelve a quedar verde): compilación, recursos públicos, módulos, contratos estáticos, suite Chromium aislada y preservación de infra del repositorio.

**No aprobable para producción todavía:**
1. Resolver **SEG-01 `profiles`** con pruebas RLS reales y migración compatible.
2. Disponer de un **Supabase de pruebas funcional e independiente**, no el dominio `.invalid`, para probar login, permisos, perfil privado, Studio, escritura `reader_defaults`, lectura y progreso multiusuario.
3. Inspeccionar dominio HTTPS y enrutamiento DNS de Cloudflare/Vercel en navegador real.
4. QA manual real a 320/390/768/1024/1440 y EPUB importado, fuentes, ilustraciones, sesiones y progreso.
5. Crear o recuperar una Preview del SHA final si se requiere comprobación exacta de despliegue. Vercel bloqueó despliegues adicionales por cuota gratuita.
6. Aprobación expresa del responsable para fusionar y luego, por separado, para desplegar a producción.

**Conclusión:** no se detectaron escrituras inesperadas a las bases durante la auditoría. La preservación de configuraciones queda comprobada a nivel de archivos, inventario y RLS existente. **La seguridad de datos personales impide declarar validada toda la plataforma**, aunque CI esté verde.

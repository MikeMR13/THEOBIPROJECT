# Fase 3 — Integraciones y pruebas pendientes (26 de octubre de 2026)

## Alcance y límites de seguridad

Pruebas reales de **solo lectura** sobre Vercel, Supabase Data API, RLS, pg_cron, pg_net y correo. Se evita toda modificación o envío a personas reales. Se reutilizan GitHub Actions en un runner estándar. No hay ninguna cuenta Supabase de pruebas facturable.

## Lo que se verificó directamente en Supabase

- Histórico: las seis migraciones de seguridad y privacidad (#131/#132) constan en `supabase_migrations.schema_migrations`.
- `cron.job`: `obi_publication_runner`, `obi-chapter-notify`, `obi-email`, `obi-home-snapshot` y `obi-reminders` están activos y sin fallos recientes en la ventana de dos horas consultada. `obi-rankings` no debía considerarse fallido solo porque no se ejecutó dentro de esa ventana (consultar su frecuencia antes de concluir).
- `net._http_response`: las cinco respuestas observadas en los 45 minutos anteriores fueron HTTP 200, sin error ni timeout. **No se atribuye automáticamente cada respuesta al correo**.
- `private.email_queue`: cero pendientes y cero registros; no hay destinatarios que permitan medir una entrega real en ese momento.
- `public.email_batch` y `public.email_mark_sent`: sus únicos privilegios EXECUTE son `postgres` y `service_role`, no `anon` ni `authenticated`.
- Consultas read-only bajo `SET LOCAL ROLE anon`: ningún borrador de serie o volumen no publicado visible, 9 obras en `home_feed`, descargas de UUID ficticio vacías.
- Consultas bajo `SET LOCAL ROLE authenticated` **sin sesión real**: `profiles` devolvió cero filas para esa identidad sin JWT; `home_feed` devuelve las nueve obras. **No constituye QA de cuentas reales ni permisos editoriales.**
- Tres RPC privadas restringidas conservaron denegación para `anon` y permiso para `authenticated` según `has_function_privilege`.
- El asesor de seguridad de Supabase informa todavía 31 avisos de funciones públicas `SECURITY DEFINER` accesibles a `anon`; se revisan según finalidad, no se consideran 31 vulnerabilidades automáticas.

## Smoke HTTP de integración externa (GitHub Actions)

`scripts/production-integrations-smoke.mjs` y `.github/workflows/production-integrations-smoke.yml`:

1. Descarga HTML del alias Vercel de producción y valida que contiene el arranque de la aplicación.
2. Comprueba que `config.js` apunta al proyecto Supabase esperado y contiene únicamente una clave pública (sin imprimirla).
3. Ejecuta `home_feed` vía PostgREST como visitante y valida estructura/IDs.
4. Contrasta `series_downloads` / `series_downloads_v2`; valida UUID inexistente.
5. Comprueba `team_public_members` cuando la serie tiene equipo.
6. Verifica que `patreon_campaign_info` y `series_feedback` devuelven error 401/403 con `code=42501` bajo rol `anon`.
7. Realiza hasta tres peticiones **HEAD** para comprobar miniaturas de Storage; no descarga portadas de megabytes.
8. Registra solo estado HTTP, latencia y contadores agregados. No extrae correos, tokens ni perfiles privados. No envía correo ni ejecuta DML.

Cloudflare bloquea peticiones automatizadas desde regiones restringidas (403 challenge). Para probar la aplicación **sin cambiar las reglas Cloudflare**, el smoke usa su alias Vercel. Esto verifica el origen pero no sustituye una prueba del dominio público desde una red permitida.

## Pendientes que NO pueden darse por resueltos automáticamente

1. **QA autenticado real:** probar sesión de lector, lector +18, integrante de equipo/editor y bibliotecario, especialmente `team_public_members`, `series_feedback`, Studio y descargas de borradores. Crear cuentas o actuar como usuarios reales requiere acceso seguro y consentimiento; simular un JWT SQL no lo sustituye.
2. **Entrega real de correo:** no había mensajes pendientes; `pg_cron.succeeded` y HTTP 200 no demuestran entrega en bandejas reales. La cuenta de Resend conectada a este chat no expone dominios ni mensajes, por lo que no puede vincularse con la plataforma.
3. **Issue #124:** `obi-email` conserva una credencial literal en `cron.job.command`; requiere rotación coordinada y paso a Vault más configuración del secreto en Edge Function. No revelar, registrar ni alterar el secreto sin procedimiento controlado.
4. **Integraciones sociales:** Discord y Telegram tienen flujos manuales. Probar envíos reales exige mensajes de prueba autorizados a canales/grupos y se deja expresamente sin ejecutar.
5. **Producción:** no crear un entorno Supabase Branching facturable ni escribir datos de prueba en tablas productivas.

## Comportamiento futuro

El workflow se ejecuta con `workflow_dispatch` y durante este PR; no crea tareas periódicas automáticas. Cualquier fallo de la API o portadas debe investigarse antes de modificar producción. Mantener la documentación sincronizada con los resultados confirmados del smoke.

> **Actualización 22/10/2026:** SEG-02 fue dividido en **FASE A aditiva** (`supabase/migrations/20261022055000_secure_reader_profiles.sql`) y **FASE C manual de cierre RLS** (`supabase/release-gates/SEG02_FINAL_LOCK_PROFILES.sql`). Los laboratorios PostgreSQL y Supabase Auth/PostgREST aplican ambas secuencialmente y comprueban compatibilidad del frontend previo entre etapas. La migración automática **no** revoca `SELECT` sobre perfiles; ese cierre se coordina solo después de desplegar el frontend compatible. Plan vigente: [SEG02-RELEASE-POR-ETAPAS.md](./SEG02-RELEASE-POR-ETAPAS.md). Este documento conserva contexto histórico y no sustituye la puerta de lanzamiento.

# SEG-02 — Informe de integración de Supabase local

**Fecha:** 2026-10-22  
**Rama:** `test/preferencias-fase4-qa-integral-20261021`  
**Commit validado:** `b3cae4174f223b25cfc4e829fd6fc18797aeeee8`  
**Resultado de integración Auth + REST + SQL:** **SUCCESS**  
**Producción:** no modificada, sin fusión a `main`, sin deploy Vercel.

## Evidencia reproducible

- [GitHub Actions — SEG-02 integración Supabase Auth + REST](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39733333558): **SUCCESS**, paso final `SEG-02 HTTP PASSED`.
- [GitHub Actions — primera integración con GoTrue/PostgREST](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39732932730): **SUCCESS**.
- [GitHub Actions — PostgreSQL efímero puro](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39731586006): **SUCCESS**.
- `.github/workflows/seg02-supabase-integration.yml`: Supabase CLI local, PostgreSQL, Auth (GoTrue), API (PostgREST/Kong); detiene contenedores y descarta credenciales al terminar.
- `scripts/seg02-make-supabase-fixture.mjs`: adapta el fixture sintético a la pila local, que ya dispone de roles y funciones `auth`.
- `scripts/seg02-supabase-http-check.mjs`: pruebas funcionales con solicitudes HTTP por clientes separados.
- `supabase/migrations/20261022055000_secure_reader_profiles.sql`: migración íntegra ejecutada en local; `supabase/tests/seg02_profile_privacy.sql` y `supabase/tests/seg02_rls_integration.sql` también ejecutadas.

## Matriz comprobada

| Comprobación | Resultado |
|---|---|
| Alta y acceso real de dos cuentas sintéticas con correo y contraseña | PASS |
| Token JWT autenticado y token anónimo auténtico de GoTrue | PASS |
| Visitante sin SELECT de `profiles` ni llamadas a RPC de cuenta | PASS |
| Cuenta B solo puede leer su propio `id`; no puede leer columnas privadas | PASS |
| `my_profile()` recupera únicamente las preferencias de la cuenta actual | PASS |
| B guarda `notify` y `ui_prefs`; no puede actualizar A ni elevar su rol | PASS |
| Visibilidad `all/auth/none` en `reader_public` y `search_readers` | PASS |
| `reader_stats` oculta perfiles privados, bloqueados y sesiones anónimas | PASS |
| `studio_profile_names` devuelve integrantes vinculados, no usuarios ajenos | PASS |
| `team_public_members` devuelve integrantes y respeta `show_members=false` | PASS |
| `comment_public_authors` devuelve autores autorizados de capítulos públicos | PASS |
| `comments` mediante PostgREST y uso del RPC en el lector | PASS (API SQL; no UI final) |
| `service_role` conserva SELECT/UPDATE de `patreon_user_id` y lectura de `notify` | PASS |
| Cerrar sesión B impide leer `my_profile`; A conserva su sesión | PASS |
| ACL, RLS, sintaxis y ejecución de la migración completa | PASS |

Todos los registros usan valores ficticios dentro de GitHub Actions. Las pruebas se niegan explícitamente a acceder a una URL diferente de `localhost` o `127.0.0.1`. **No se crearon ramas alojadas con tarifa horaria en Supabase.**

## No probado

1. OAuth real de Google y redirecciones de proveedores externos; el entorno temporal verifica email/contraseña y acceso anónimo GoTrue, no el proveedor Google.
2. Conexión real con Patreon, entrega SMTP de correo, webhooks y Storage remoto. La prueba de `service_role` verifica el contrato de base de datos necesario para Patreon y avisos, **no** una operación completa contra terceros.
3. Navegación visual de una Preview Vercel conectada al backend temporal. El CI habitual del frontend tiene sus propios tests de Chromium.
4. El esquema productivo íntegro y sus datos/roles/triggers históricos: la pila local utiliza esquema sintético de las tablas pertinentes, no una copia de producción. No se expusieron datos reales.
5. El proceso coordinado de release con frontend anterior y nuevo coexistiendo. **No aplicar la revocación completa de `profiles` mientras el frontend antiguo siga invocando JOINs directos.** Se debe planificar instalación aditiva de RPC, cambio de frontend y cierre final de permisos, con controles entre fases.

## Observación de CI de navegador

Para el commit validado, [dos ejecuciones generales de CI](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39733338379) aprobaron; [otra ejecución](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39733333559) falló porque Chromium se bloqueó dos veces al lanzar el grupo responsive 768/1280 en la prueba `preferencias-fase4-browser.mjs`. Es un problema de fiabilidad del entorno de pruebas; no se observó en él un fallo funcional de Supabase. Debe estabilizarse o obtenerse una repetición completa satisfactoria antes de levantar todas las puertas de release.

## Decisión

**Integración local de Supabase aprobada** para Auth, API y seguridad de perfiles. **No se ha certificado un despliegue productivo sin interrupciones**. Continuar con el plan de liberación por fases y validaciones específicas de proveedores externos si se exige cobertura integral. Mantener PR #49 en borrador y conservar el estado actual de producción hasta coordinar el backend y el frontend.

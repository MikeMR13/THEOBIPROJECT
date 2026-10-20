# Auditoría de infraestructura de solo lectura — 20 de octubre de 2026

**Proyecto:** THEOBIPROJECT — rama `audit/infra-readonly-security-20261020` basada en `main`.
**Alcance:** Supabase, Cloudflare y Vercel, sin cambios de base, secretos, Workers o funciones remotas. Sin servicios adicionales ni framework nuevo.

## Evidencia confirmada directamente

### A. Supabase: correo programado

- La Edge Function **activa** `notify-email`, versión **3**, utiliza la guardia condicional `if (SECRET && req.headers.get('x-cron-secret') !== SECRET)`: **si `CRON_SECRET` falta en el entorno de esa función, una solicitud no autenticada no queda bloqueada por esa guardia**. El resto del handler también debe revisarse.
- El archivo ya fusionado en `main`, `supabase/functions/notify-email/index.ts`, cambia a `if (!SECRET || req.headers.get('x-cron-secret') !== SECRET)` y rechaza métodos distintos de POST. **Esta mejora todavía no está desplegada en la función remota**.
- El cron `obi-email` está activo, se ejecuta `*/10 * * * *`, apunta a `notify-email`, usa `http_post` e incluye cabecera `x-cron-secret`; 144 ejecuciones `succeeded` en las 24 horas revisadas. Esto NO demuestra que el secreto definido para la función coincida ni que Resend entregue correos.
- Se evitó leer, imprimir o modificar secretos. No se enviaron emails de prueba. **La prioridad es validar que `CRON_SECRET` exista y coincida con el valor utilizado por el cron** antes del despliegue de la función; de lo contrario, este cambio podría bloquear las notificaciones por correo.

### B. Home snapshot y PostgreSQL

- `obi-home-snapshot` activo, `*/5 * * * *`; **288 ejecuciones** `succeeded` en 24 horas.
- `private.home_snapshot.built_at` seguía valiendo `-infinity` en la muestra de **2026-10-20 15:22 UTC**, aunque el cron se había ejecutado a las 15:20 UTC. Por lo tanto, existe invalidación entre reconstrucciones.
- `series_home_stale` aún corre **AFTER INSERT OR DELETE OR UPDATE**, incluyendo la actualización del contador `series.views` causada por `track_view`. No se aplicó la propuesta `docs/SQL-FASE2-HOME-SNAPSHOT.sql`.
- Hay SQL para ensayar una invalidación selectiva de las columnas editoriales excepto `views`, pero requiere prueba con publicaciones/contadores reales en staging y una reversión documentada. **No ejecutar directamente este SQL de análisis como migración**.

### C. Alertas del asesor Supabase

Linter de seguridad:
- `rls_enabled_no_policy`: **5** observaciones INFO (p. ej., tablas internas de contadores, Patreon y alias). Sin políticas puede ser intencional; no dar acceso indiscriminadamente.
- `anon_security_definer_function_executable`: **36** observaciones WARN.
- `authenticated_security_definer_function_executable`: **81** observaciones WARN.
- `auth_leaked_password_protection`: **1** WARN, anteriormente fuera del alcance de opciones gratuitas; no activarlo si requiere un plan pagado.

Verificación manual de ejemplos: `admin_review_queue` y `admin_review_resolve` comprueban `private.is_admin()`; `report_review` y `request_account_deletion` comprueban `auth.uid()`. `patreon_disconnect` utiliza permisos del equipo/plataforma. Algunas funciones SECURITY DEFINER se exponen intencionalmente (catálogo, reseñas, estadísticas); una advertencia NO prueba un acceso indebido. **No revocar las 36 funciones en bloque**: revisar riesgo, argumentos, efectos y permisos internos una por una.

Remediación oficial Supabase: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

Asesor de rendimiento, sin alteraciones:
- 70 relaciones con posibles índices FK faltantes; 54 avisos `auth_rls_initplan`; 165 de políticas permisivas múltiples; 1 índice duplicado; 4 no usados; 3 tablas sin PK. No ejecutar cambios de índices o RLS sin planes de consulta y pruebas.

### D. Migraciones y Cloudflare

- Supabase registra **32 migraciones**; `main` contiene **26 archivos** SQL. Sus nombres, versiones y secuencias difieren. No ejecutar automáticamente un "push" de migraciones desde ese directorio: podría duplicar operaciones o desordenar el historial.
- `list_branches` de Supabase devolvió **cero ramas de desarrollo**.
- La cuenta Cloudflare disponible (única cuenta autorizada en esta conexión) enumera solo los scripts **`cronica`** y **`ddcronicaproject`**, modificados en septiembre de 2026. **No aparece `notify` ni un Worker identificable como THEOBIPROJECT.** Esto NO demuestra que el Worker no exista en otra cuenta o proveedor: se necesita identificar el nombre/cuenta real antes de desplegar.
- El repositorio contiene `workers/notify/src/index.js` con rechazo `/cache/` y status 404, pero no se ha confirmado su activación remota.

### E. Vercel

- Despliegue del commit `f0b3931bc30fa7e252795c8e039a7b3c5d9b8016` en `main`: Vercel **READY** (verificación previa y nueva consulta del servicio). 
- Las variables Preview fueron separadas de Production y apuntan deliberadamente a dominio `.invalid`, por lo que Preview **no** ofrece un backend staging real.
- GitHub CI de main pasó. Sin pruebas E2E con sesión real ni Lighthouse medido.

## Archivos añadidos a la auditoría

- `docs/DIAGNOSTICO-INFRA-READONLY-20261020.sql`: consultas read-only que omiten comandos con secretos.
- `scripts/infra-audit-check.mjs`: contratos automáticos del **código GitHub**, no del código desplegado: secret obligatorio, método POST, bloqueo de `/cache/`, seguridad de compilación y propuesta `home_snapshot`.
- El CI ejecuta `npm run infra-audit-check` además de los tests anteriores.

## Orden seguro para las siguientes acciones

1. Confirmar secreto de cron y preparar publicación de `notify-email`; validar código en staging o controlando 401/405 **sin mandar emails**.
2. Identificar la cuenta y script correctos de Cloudflare para THEOBIPROJECT y contrastar versión desplegada con GitHub.
3. Revisar funciones SECURITY DEFINER expuestas empezando por mutaciones, permisos administrativos y contenidos restringidos; separar públicas intencionales.
4. Reconciliar 32 migraciones remotas con 26 archivos locales antes de migrar nada.
5. Crear entorno aislado sin costo adicional (si es posible) y validar el trigger de `home_snapshot` antes de aplicarlo.
6. Ejecutar importación, publicación y permisos de Studio con datos de prueba; realizar medición Lighthouse del sitio.

**No aplicado en esta auditoría:** cambios remotos de Supabase, SQL, Cloudflare Worker, secretos, configuración Vercel o fusión a `main`.

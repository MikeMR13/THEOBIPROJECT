# Fase de seguridad — rutinas administrativas de pg_cron

## Alcance real y restricción de costos

Revisión de solo lectura del proyecto Supabase existente, **sin crear proyectos/ramas, servicios de pago ni funciones nuevas**. Se aplica el principio de mínimo privilegio a diez funciones administrativas ya programadas mediante `pg_cron`. Se mantiene el mismo sistema, cron y periodicidad.

Los diez procedimientos están en `private`, se ejecutan como `SECURITY DEFINER`, pertenecen a `postgres` y tienen firma sin argumentos. Cada uno está asociado con exactamente un trabajo activo o registrado de `pg_cron` como usuario `postgres`. La comprobación de ACL mostró `PUBLIC:EXECUTE` y `postgres:EXECUTE` para todas; `anon` y `authenticated` heredan actualmente permiso de ejecución. Los roles del lector también disponen de `USAGE` en el esquema `private`.

Esto **no demuestra que PostgREST exponga el esquema `private` ni una explotación**. Sí representa un permiso SQL innecesario para rutinas de publicación, purga y notificación. La documentación Supabase recomienda conceder `EXECUTE` únicamente a quienes deban llamar cada función.

### Funciones incluidas

- `private.run_publications()` — job `obi_publication_runner` (`postgres`)
- `private.refresh_home()` — job `obi-home-snapshot` (`postgres`)
- `private.compute_rankings()` — job `obi-rankings` (`postgres`)
- `private.purge_deleted_accounts()` — job `obi-purge-accounts` (`postgres`)
- `private.purge_old()` — job `obi_purge_old` (`postgres`)
- `private.send_reminders()` — job `obi-reminders` (`postgres`)
- `private.notify_due_chapters()` — job `obi-chapter-notify` (`postgres`)
- `private.notify_general_releases()` — job `obi-general-notify` (`postgres`)
- `private.notify_anniversaries()` — job `obi-anniversaries` (`postgres`)
- `private.notify_seasons()` — job `obi-season-notices` (`postgres`)

## Corrección

- `sql/cron-administrative-execute-20261025.sql`: comprobaciones de firma, propietario, tipo y existencia de job `postgres`; revoca `EXECUTE` a `PUBLIC`, `anon` y `authenticated`; confirma que `postgres` lo conserva, todo dentro de una transacción.
- `sql/cron-administrative-execute-rollback.sql`: restaura el permiso `PUBLIC:EXECUTE` que existía antes del parche **solo para estas diez funciones**.
- `scripts/cron-execute-qa-*.sql` y GitHub Actions: PostgreSQL temporal con funciones inocuas y un `pg_cron` simulado (solo estructura SQL). Comprueba rechazo de `anon` y `authenticated`, acceso de `postgres`, acceso público a `home_feed()` y reversión.

Ninguna de estas rutas altera el envío o el contenido de notificaciones, elimina datos ni ajusta trabajos programados. El runner de PostgreSQL utiliza la infraestructura estándar de GitHub para repositorios públicos.

## Límites, dependencias y QA de despliegue

1. Ejecutar y comprobar CI PostgreSQL aislado. No ejecutar los diez procedimientos reales como prueba: algunos envían notificaciones y otros borran datos.
2. Revisar que ninguna integración externa necesite invocar estas rutinas directamente. La inspección de fuentes SQL no encontró otras funciones que las llamen por nombre; los jobs de `postgres` sí.
3. Mantener intencionalmente **sin cambios** los 34 RPC públicos `SECURITY DEFINER` señalados por Supabase. Algunos sirven datos públicos y requieren revisión individual, no revocación masiva.
4. Dejar el PR en borrador mientras se revisan regresiones de CI y compatibilidad de la base existente.
5. Generar una migración versionada oficial usando Supabase CLI y ejecutar únicamente tras revisión/aprobación. **El archivo SQL candidato no está aplicado a producción.**
6. Una vez aplicado, comprobar por lectura `has_function_privilege`, estados de `cron.job_run_details` (incluyendo ejecuciones posteriores) y funcionamiento de Inicio, rankings, publicación y avisos.
7. Si algún sistema legítimo falla, investigar y restaurar solo los permisos mínimos necesarios. Como opción de emergencia existe rollback explícito, aunque amplía nuevamente permisos y exige aprobación.

**Lecturas:** [Guía oficial para asegurar Data API y grants](https://supabase.com/docs/guides/api/securing-your-api); [aviso oficial de funciones `SECURITY DEFINER` ejecutables por anónimos](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

**Estado:** candidato preparado para revisión, sin afectar producción ni contratar servicios.

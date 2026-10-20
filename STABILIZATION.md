# Estabilización — JavaScript nativo, sin cambio de framework

Rama independiente. Cambios propuestos para integrar solo tras aprobar CI y verificar los servicios.
No aplicar migraciones antiguas automáticamente ni publicar Workers/Edge Functions sin revisar sus secretos.

## Cambios incluidos
- `supabase/config.toml`: sección [auth] única, dominio principal alineado con Vercel y dominio anterior permitido como retorno.
- Se reparan dos delimitadores de funciones SQL en archivos históricos para facilitar reconstruir el esquema.
- Código de la función Patreon movido a `supabase/functions/patreon/index.ts`, sin despliegue ni cambio de comportamiento.
- `notify-email` exige CRON_SECRET y método POST. Configurar el secreto y el invocador ANTES de desplegar la función.
- La ruta /cache/ del Worker obi-notify respondía con capítulos consultados con service_role sin verificar bloqueos de acceso. La ruta se deshabilita con 404 hasta rediseñarla con controles de acceso; la lectura normal usa Supabase/RLS.
- `scripts/build.mjs` obliga a declarar variables de entorno por deployment para evitar conectar accidentalmente una preview a datos reales.
- CI: parseo TOML, revisión sintáctica JS, build y validaciones estáticas de SQL/importaciones/configuración.

## Variables requeridas para build
```
OBI_SUPABASE_URL=https://<ref>.supabase.co
OBI_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
Usar valores **distintos** para Preview y Production en Vercel. No añadir ninguna service_role al navegador.

## Estado de Supabase comprobado (lectura, 19-oct-2026)
- Proyecto THEOBIPROJECT activo, PostgreSQL 17; RLS habilitado en las tablas públicas visibles.
- `supabase_migrations.schema_migrations` contiene migraciones que no están representadas como archivos íntegros de origen en este repo.
- Algunas migraciones del repositorio no figuran con el mismo nombre/versión en el historial remoto.
- El asesor de seguridad señala funciones SECURITY DEFINER públicas ejecutables por anon. Requieren clasificación, no revocación indiscriminada: home_feed y otras RPC públicas son utilizadas por lectores anónimos.
- Algunos archivos LEEME referencian migraciones que faltan en GitHub. Conservarlos como histórico; no ejecutarlos como instrucciones de despliegue.

## Antes de integrar / publicar
1. Verificar y completar variables en Vercel (Preview + Production).
2. Respaldar y capturar un baseline de DDL remoto con Supabase CLI en un entorno seguro; no reejecutar migraciones históricas sobre producción.
3. Comparar seguridad/GRANT de cada RPC pública antes de cerrar avisos. Priorizar admin_review_queue, admin_review_resolve, request_account_deletion, export_my_data y Patreon.
4. Configurar CRON_SECRET en Supabase y el encabezado x-cron-secret en el invocador de notify-email.
5. Comprobar con pruebas de integración los flujos: inicio de sesión, permisos de grupo, importación, publicación, contenido de pago, emails y lectura offline.
6. Desplegar Workers solo después de verificar que el lector no consuma /cache/ y probar con una obra restringida.
7. Asegurar reglas de protección de main y ampliar tests de base de datos.

No se modifican datos, usuarios, permisos ni funciones activos en la base de datos por esta rama.

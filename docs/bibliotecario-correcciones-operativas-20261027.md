# Correcciones del Mostrador · plan de despliegue seguro (27 octubre 2026)

## Rama y alcance
PR #163: `fix/bibliotecario-operativo-visual-20261027`. No ejecutar SQL en producción ni fusionar frontend antes de las pruebas y la autorización de publicación.

### Operación
- El rol Bibliotecario mantiene la lectura global de obras y borradores; deja de heredar facultades de edición de equipos vía `private.team_can` y la política `series admin` de tipo ALL.
- Las acciones administrativas explícitas (`admin_add_publisher`, `admin_remove_member`, etc.) conservan guardas `private.is_admin()`.
- Eliminar o degradar al último Propietario se bloquea por trigger. La RPC del Mostrador rechaza retirar o degradar a cualquier Propietario y rechaza crear un segundo; asignar el primero sigue permitido.
- Moderación de reseñas agrega acción a `moderation_audit` sin almacenar contenido de reseñas en la bitácora.
- Se agregan `admin_users_page` y `admin_audit_page`, conservando las RPC anteriores por compatibilidad.

### Visual y experiencia
- Paginación de capítulos en Supervisión; obras con más de 50 capítulos dejan de truncarse.
- Paginación administrativa de usuarios y Bitácora, y consulta completa de miembros para la vista de Equipos.
- Respuestas antiguas de secciones asíncronas no deben sobrescribir una pestaña nueva.
- Aviso de cambios sin guardar en Inicio, Temporadas, SEO y Apoyar.
- Pestañas semánticas, navegación por teclado, foco visible y controles de mínimo 44 px.
- Formularios de Apoyar adaptativos y confirmación antes de verificar enlaces de compra o moderar reportes.

## Validación sin costo y sin acceso a producción
- `.github/workflows/bibliotecario-operational-qa.yml`: PostgreSQL 17 efímero con `supabase/tests/fixtures/bibliotecario_operational_local.sql`, migración real y aserciones SQL.
- `.github/workflows/ci.yml`: Chromium local para paginación, navegación y visual responsive, más suite general.

## Orden obligatorio de despliegue
1. Verificar PR aprobado y CI + PostgreSQL verde.
2. Antes de aplicar SQL, registrar las definiciones actuales de `private.team_can`, `admin_add_publisher`, `admin_remove_member`, `admin_review_resolve`, y la política `series admin` en un respaldo restringido a administradores. No guardar contraseñas ni datos personales en logs.
3. Aplicar `supabase/migrations/20261028032500_bibliotecario_operational_guardrails.sql` mediante la herramienta de migraciones de Supabase al proyecto correcto.
4. Hacer pruebas NO destructivas de lectura de obras publicadas/borradores como Bibliotecario, y validar presencia de las nuevas RPC y guardas del rol.
5. Fusionar el frontend y confirmar Vercel READY. Probar usuarios, capítulos, bitácora y navegación en una sesión real de Bibliotecario.
6. Si hay regresión, revertir primero el frontend al despliegue anterior. La migración no se revierte automáticamente; restaurar únicamente las funciones y política tomadas en el paso 2, previa revisión de datos/roles, sin eliminar la tabla ni los propietarios.

**Importante:** una implementación frontend antes de la migración provocará errores en Usuarios/Equipos/Bitácora por ausencia de las nuevas RPC. La migración contiene controles que deben revisarse en una cuenta Bibliotecario antes de usar cambios destructivos.

## Límites
La prueba de Chromium utiliza cuentas, obras y capítulos ficticios. No sustituye pruebas de lectores de pantalla o revisión de un Bibliotecario autenticado en producción. No se prueban ni se modifican datos reales.

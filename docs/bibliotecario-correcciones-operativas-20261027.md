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

## Publicación compatible y pendiente de seguridad
- El frontend detecta exclusivamente `PGRST202` (RPC administrativa nueva ausente) y usa temporalmente `admin_users` y `admin_audit`. Los apartados Usuarios, Equipos y Bitácora continúan funcionando con el máximo histórico de 200 registros hasta desplegar la migración.
- Supervisión con capítulos paginados, accesibilidad, avisos y navegación funcionan sin la migración.
- Las garantías de seguridad de la migración SQL **NO** están activas en producción por incluir la migración en el repositorio. Sólo se activan cuando se aplica en Supabase. No afirmar que el rol Bibliotecario ya perdió privilegios editoriales ni que el trigger de Propietario ya está instalado.
- La aplicación de la migración mediante la conexión de herramientas fue bloqueada por controles de seguridad. No eludir ese bloqueo ni desplegar por otro camino sin autorización y proceso adecuados.

## Pasos pendientes para activar las protecciones de Supabase
1. Respaldar las definiciones actuales de funciones y políticas, con acceso restringido.
2. Aplicar `supabase/migrations/20261028032500_bibliotecario_operational_guardrails.sql` por el proceso de migración autorizado.
3. Verificar `admin_users_page`, `admin_audit_page`, el bloqueo del último Propietario y la lectura global sin escritura editorial.
4. Comprobar permisos reales con una sesión del Bibliotecario y cuentas de equipo, sin alterar datos de los lectores.
5. Ante una regresión, revertir las definiciones según los respaldos; no eliminar datos ni miembros.

**Importante:** fusionar este PR con compatibilidad hacia atrás no instala ni activa las protecciones SQL. La automatización QA de PostgreSQL prueba una instancia aislada, no la producción.

## Límites
La prueba de Chromium utiliza cuentas, obras y capítulos ficticios. No sustituye pruebas de lectores de pantalla o revisión de un Bibliotecario autenticado en producción. No se prueban ni se modifican datos reales.

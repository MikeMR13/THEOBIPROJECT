# SEG-02 — Corrección de privacidad de perfiles

**Estado:** migración aplicada y probada con éxito en PostgreSQL 17 efímero de GitHub Actions, con estructura y usuarios ficticios. **NO aplicada a Supabase de producción ni validada en un clon completo de Supabase**.

## Alcance de la corrección

Migración: `supabase/migrations/20261022055000_secure_reader_profiles.sql`.

1. Retira de `anon` y `authenticated` los privilegios amplios de tabla sobre `profiles` (incluidos SELECT, INSERT, DELETE y MAINTAIN). Solo restituye `SELECT(id)` para cuentas autenticadas y `UPDATE` sobre las 21 columnas que anteriormente estaban explícitamente permitidas. No concede escritura de roles, membresías de donación ni identificadores internos.
2. Elimina la política `profiles read USING (true)` y la reemplaza por `profiles self read` limitada a `id = auth.uid()`. Conserva las políticas de actualización propia y administración.
3. Los datos propios se siguen obteniendo mediante `my_profile()`, ya protegido por identificación del usuario. El carnet público se sigue sirviendo por `reader_public()`.
4. El Estudio deja de leer nombres directamente desde `profiles`. El nuevo RPC `studio_profile_names(uuid[])` solo admite usuarios autenticados y permite nombres del propietario, personal administrador y personas relacionadas con un equipo: integrantes, autores de comentarios o erratas, colaboradores asignados, actores de bitácora, revisores de capítulos y autores de diseños. No concede SELECT directo.
5. El carnet público de equipos usa `team_public_members(uuid)` en lugar de la relación `team_members → profiles`, y entrega únicamente nombre, rol y color del rol cuando la visibilidad de integrantes está activada. La administración de solicitudes obtiene nombres con `studio_profile_names` en lotes de hasta 100 identificadores. Los comentarios del lector usan `comment_public_authors(uuid)` en lugar del join `comments → profiles`, sin acceder a preferencias privadas.
6. `reader_stats(uuid)` deja de publicar actividad de perfiles `none`, de perfiles `auth` a visitantes (incluidas sesiones anónimas de Supabase), de perfiles en eliminación y de usuarios bloqueados. El propio lector puede consultar sus estadísticas.
7. `search_readers` y `private.reader_public_core` ya no equiparan una sesión anónima de Supabase con una cuenta registrada.
8. Los RPC relacionados con exportación, eliminación de cuenta, favoritos, vinculación de Patreon y administración dejan de poder ejecutarse desde `anon`; se conserva `EXECUTE` para `authenticated`. Las funciones de lectura pública del catálogo continúan accesibles.

## Pruebas automatizadas

- `npm run seguridad-perfiles-check`: contratos estáticos del esquema, políticas, RPC y compatibilidad de llamadas del frontend; integrado en GitHub Actions.
- `supabase/tests/seg02_profile_privacy.sql`: aserciones ejecutadas exitosamente en PostgreSQL 17 desechable después de aplicar la migración. Comprueban ACL, RLS, RPC públicas y restricciones.
- `supabase/tests/seg02_rls_integration.sql`: pruebas ejecutadas exitosamente con roles `anon`/`authenticated`, identidades A/B ficticias, bloqueo de terceros, perfil público completo, sesión anónima, privacidad y nombres limitados.
- `.github/workflows/seg02-isolated-db.yml` y `supabase/tests/fixtures/seg02_postgres_fixture.sql`: levantan un contenedor desechable PostgreSQL 17, crean roles y funciones `auth.uid()` / `auth.jwt()` sintéticas y prueban la migración real; no acceden a Supabase alojado ni usan credenciales de producción.
- [GitHub Actions — validación aislada exitosa](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39731586006).
- El conjunto completo de CI (navegación, lector, Estudio, preferencias, PWA, build y otras pruebas) debe ser verde para el último SHA.

### Matriz de pruebas que aún requiere una instancia Supabase completa y cuentas reales de QA

| Prueba | Resultado esperado |
|---|---|
| Anónimo → Data API /profiles | No puede ejecutar SELECT ni leer columnas |
| B autenticado → Data API /profiles | Solo puede consultar `id` de su propia fila; no `notify`, `ui_prefs`, `hidden_series` de nadie |
| A autenticado → my_profile() | Obtiene su perfil y ajustes, no los de B |
| A autenticado → UPDATE profiles | Puede guardar `notify`, `ui_prefs`, bio y los campos autorizados únicamente para sí |
| B autenticado → UPDATE profiles de A | Rechazado por RLS |
| Anónimo → reader_public(A) con all/auth/none | Carnet completo solo con `all`; objeto mínimo para auth/none |
| B → reader_public(A) con all/auth/none | Carnet completo con `all`/`auth`; mínimo con `none` |
| Sesión anónima Supabase → reader_public(A) auth | Objeto mínimo, nunca carnet completo |
| Invitado/B → reader_stats(A) con public_activity=true y visibility=none | NULL; A sí ve sus estadísticas |
| Invitado/B → reader_stats(A) con visibility=auth | Invitado NULL, B con cuenta puede ver si public_activity=true |
| Usuario bloqueado B → reader_stats(A) | NULL |
| Estudio A/B mismo equipo → nombres | Solo nombres de equipo común; IDs ajenos no se resuelven |
| Avisos, búsqueda, favoritos y cuenta | Las RPC autenticadas siguen funcionando; las públicas legítimas no se rompen |
| Cambios de usuario, recarga, conexión intermitente | Preferencias persistentes, sin contaminación entre cuentas |

## Validación sin coste de Supabase — completada

GitHub Actions ejecutó el esquema sintético con PostgreSQL 17 y un control negativo que reproduce la política insegura anterior. Aplicó **sin modificaciones** la migración completa, ejecutó las aserciones de catálogo y los escenarios de acceso para usuarios ficticios, incluyendo `reader_public` completo, `reader_stats`, `search_readers`, `studio_profile_names`, `team_public_members` y `comment_public_authors`. Resultado **SUCCESS**: [ejecución 39731586006](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39731586006).

**Alcance y limitaciones:** es PostgreSQL, no la pila completa de Supabase. Simula `auth.uid()` y `auth.jwt()` mediante parámetros de sesión y reconstruye solamente las tablas involucradas; los RPC preexistentes no pertinentes se sustituyen por contratos mínimos. No verifica el servicio Auth real, PostgREST, Storage, Patreon, correo, datos reales, triggers desconocidos, migraciones históricas completas ni las variables de Vercel. La prueba nunca puede aprobar por sí sola el cambio sobre la instancia productiva.

## Puerta de seguridad para publicar

1. **Completado**: ejecutar la migración real en PostgreSQL aislado con roles e identidades sintéticas. No genera cargos adicionales de Supabase.
2. **Pendiente**: validar de forma controlada en una instancia **completa** Supabase sin datos reales (por ejemplo, instalación local con el esquema completo o entorno QA existente confirmado), incluyendo endpoints PostgREST, Auth, RLS y regresiones.
3. **Pendiente**: probar un Preview Vercel contra ese backend de QA, más privacidad y operaciones con A/B, registro, comentarios, equipo, correo y Patreon sintéticos.
4. Aplicar la migración validada a producción, verificar inmediatamente permisos y RPC, y fusionar el PR a `main` solo cuando el backend sea compatible. Vercel desplegará automáticamente el frontend.
5. Nunca revertir reabriendo la política insegura `profiles read USING(true)`.

### Límites de esta intervención

No se han cambiado políticas, registros ni credenciales de producción. Los tests en PostgreSQL sintético demuestran que el SQL se ejecuta y que los controles ejercitados pasan; **no representan una auditoría ni certificación integral de Supabase productivo**. La revisión de las restantes funciones `SECURITY DEFINER` queda como trabajo de seguridad independiente.

## Compatibilidad adicional verificada estáticamente

La primera revisión detectó cuatro dependencias directas de `profiles` en el frontend que debían migrarse juntas, ya que revocar SELECT sin ellas hubiera roto pantallas existentes: (1) nombres de Estudio, (2) peticiones de traductores en Administración, (3) integrantes de páginas de equipos, (4) autores de comentarios del lector. Se sustituyeron por funciones con respuesta mínima y validaciones de acceso.

Las consultas SQL de las tres funciones nuevas fueron comprobadas contra el planificador de la base de producción mediante `EXPLAIN` sin ejecutarlas ni modificar registros. Eso demuestra que las tablas y columnas referenciadas existen y que las expresiones se pueden planificar; **no demuestra permisos efectivos ni comportamiento de RLS tras la migración**. También se inspeccionó el caso de `private.team_heir`, llamado desde funciones SECURITY DEFINER.

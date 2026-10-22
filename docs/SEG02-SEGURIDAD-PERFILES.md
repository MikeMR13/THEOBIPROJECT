# SEG-02 — Corrección de privacidad de perfiles

**Estado:** implementado en el candidato de GitHub, **NO aplicado a Supabase de producción**.

## Alcance de la corrección

Migración: `supabase/migrations/20261022055000_secure_reader_profiles.sql`.

1. Retira de `anon` y `authenticated` los privilegios amplios de tabla sobre `profiles` (incluidos SELECT, INSERT, DELETE y MAINTAIN). Solo restituye `SELECT(id)` para cuentas autenticadas y `UPDATE` sobre las 21 columnas que anteriormente estaban explícitamente permitidas. No concede escritura de roles, membresías de donación ni identificadores internos.
2. Elimina la política `profiles read USING (true)` y la reemplaza por `profiles self read` limitada a `id = auth.uid()`. Conserva las políticas de actualización propia y administración.
3. Los datos propios se siguen obteniendo mediante `my_profile()`, ya protegido por identificación del usuario. El carnet público se sigue sirviendo por `reader_public()`.
4. El Estudio deja de leer nombres directamente desde `profiles`. El nuevo RPC `studio_profile_names(uuid[])` solo admite usuarios autenticados y permite nombres del propietario, personal administrador o integrantes de un equipo en común. No concede SELECT directo.
5. `reader_stats(uuid)` deja de publicar actividad de perfiles `none`, de perfiles `auth` a visitantes (incluidas sesiones anónimas de Supabase), de perfiles en eliminación y de usuarios bloqueados. El propio lector puede consultar sus estadísticas.
6. `search_readers` y `private.reader_public_core` ya no equiparan una sesión anónima de Supabase con una cuenta registrada.
7. Los RPC relacionados con exportación, eliminación de cuenta, favoritos, vinculación de Patreon y administración dejan de poder ejecutarse desde `anon`; se conserva `EXECUTE` para `authenticated`. Las funciones de lectura pública del catálogo continúan accesibles.

## Pruebas automatizadas

- `npm run seguridad-perfiles-check`: contratos estáticos del esquema, políticas, RPC y compatibilidad de llamadas del frontend; integrado en GitHub Actions.
- `supabase/tests/seg02_profile_privacy.sql`: aserciones **ejecutables sobre QA después de aplicar la migración**, no ejecutadas aún. Comprueban ACL, RLS, RPC públicas y restricciones.
- El conjunto completo de CI (navegación, lector, Estudio, preferencias, PWA, build y otras pruebas) debe ser verde para el último SHA.

### Matriz imprescindible con un backend aislado y usuarios reales de prueba

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

## Puerta de seguridad para publicar

1. Crear una rama de Supabase aislada y **aceptar explícitamente sus cargos** si corresponde. La creación se intentó sin confirmación y Supabase la bloqueó al exigir un ID de aceptación de coste. No existe una rama QA disponible en este proyecto.
2. Aplicar la migración **primero en QA**. Verificar `supabase/tests/seg02_profile_privacy.sql`, el analizador de seguridad y la matriz autenticada.
3. Probar un Preview Vercel que utilice **solo** ese backend de QA, sin lectores ni correos reales.
4. Revisar los resultados, preparar una ventana corta de cambio, aplicar la migración validada a la base de producción y comprobar permisos y endpoints antes de desplegar el frontend vinculado.
5. Solo si las verificaciones pasan, fusionar el PR de integración a `main`; Vercel desplegará automáticamente. Si se detecta una incidencia, detener el deploy. **Nunca revertir restableciendo la política insegura `USING(true)`.**

### Límites de esta intervención

La migración de seguridad aún no se ejecutó en ningún backend (el actual es productivo). Las pruebas estáticas verifican los contratos, no sustituyen las pruebas de permiso en PostgreSQL con sesión real. El análisis completo de todas las funciones privilegiadas y otros componentes fuera de perfiles sigue siendo una tarea de seguridad independiente; estos cambios atienden los hallazgos críticos concretos de Privacidad de Lectores y sus RPC relacionadas.

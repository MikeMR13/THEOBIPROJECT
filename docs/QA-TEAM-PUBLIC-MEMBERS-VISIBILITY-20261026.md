# Seguridad: miembros en perfiles públicos de equipos

## Evidencia revisada

`public.team_public_members(p_team uuid)` ejecuta como `SECURITY DEFINER`. Comprueba `teams.settings.show_members`, pero devuelve nombres de usuario sin comprobar `profiles.profile_visibility` o `profiles.delete_requested_at`. La misma plataforma diferencia `profile_visibility='all'` y `'auth'` en búsquedas de lectores. Existe la modalidad `is_anonymous=true` para usuarios anónimos de Supabase Auth.

En el inventario consultado los perfiles están en modo `auth`, y hay equipos con `show_members` falso y otro sin ajuste explícito. El riesgo de mostrar nombres a visitantes anónimos depende de qué equipo muestre su listado: **no se afirma una exposición confirmada de usuarios concretos**.

## Cambio candidato

Una sola RPC cambia su filtrado para mostrar:
- A visitantes anónimos: exclusivamente perfiles con visibilidad `all`.
- A usuarios realmente autenticados: `all` y `auth`.
- A un miembro: su propio perfil aunque sea privado, pero **nunca** si solicitó eliminación.
- A nadie: identidades con `delete_requested_at` no nulo.
- Para todos: respeta el interruptor del equipo `show_members=false`.

No se usa `discoverable` para filtrar porque regula búsqueda de perfiles, no necesariamente su pertenencia editorial al grupo. Se mantiene el tipo de retorno `(role,username,role_name,role_color)`.

## QA / costos

Se copia la definición actual a un PostgreSQL 16 temporal del runner estándar de GitHub Actions. Se reproducen los resultados anteriores con perfiles ficticios, se prueba el filtro para anon, authenticated, Auth-anonymous y propietario, se verifica `show_members` y el script de rollback.

No se crea un proyecto/branch de Supabase, servicio externo, extensión ni recurso facturable. SQL en `sql/` es un **candidato, no una migración aplicada**. Validar la página pública de equipos y sus permisos de sesión antes del despliegue real.

Documentación de permisos: https://supabase.com/docs/guides/api/securing-your-api

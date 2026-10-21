# SEG-01 — Privacidad de perfiles sin romper identidades vinculadas

**Fecha:** 20/10/2026 · **Proyecto:** MikeMR13/THEOBIPROJECT · **Vercel:** theobiproject  
**Rama:** `fix/privacidad-profiles-identidades-20261020` · **Base:** candidata PR #21  
**Estado:** implementación en rama de validación. **NO APLICADO A SUPABASE PRODUCTIVO; NO DESPLEGADO A PRODUCCIÓN.**

## Riesgo que se corrige

Actualmente `public.profiles` permite `SELECT` en sus 32 columnas a `anon` y `authenticated`, con RLS `profiles read USING(true)`. Entre las columnas hay `patreon_user_id`, `discord_id`, `telegram_id`, `notify`, `ui_prefs`, `hidden_series`, `delete_requested_at` y `adult_ok`. Una persona anónima podría intentar leer esas columnas mediante la Data API, independientemente de lo que oculta la interfaz.

**Diseño:** dejar `SELECT` público solo para `id`, `username` y `avatar_url`; mantener `reader_public(p_username)` para ficha completa con visibilidad y bloqueos. Las demás columnas se devuelven solo al dueño a través de `my_profile()` tras verificar `auth.uid()`. Para las pantallas públicas que dependen del permiso +18, `my_adult_ok()` devuelve únicamente un booleano del usuario autenticado.

No se toca ningún identificador: `auth.users.id`, `auth.identities.user_id`, `profiles.id`, `profiles.patreon_user_id` o claves foráneas de equipos, comentarios, biblioteca, progreso y avisos. Las cuentas existentes **no se fusionan ni se migran**.

## Secuencia segura de publicación: dos pasos SQL y una actualización de frontend

### Paso A. Preparación aditiva — `supabase/migrations/20261114_profiles_private_owner.sql`

Instala `public.my_profile()` y `public.my_adult_ok()` como RPC `SECURITY DEFINER`, búsqueda de objetos completamente calificada (`search_path=''`), `EXECUTE` únicamente a `authenticated`, no a `PUBLIC` ni `anon`. `my_profile()` necesita el JWT del propietario y devuelve solo la fila identificada por `auth.uid()`. **No revoca ningún acceso a la tabla.** Puede introducirse sin dejar incompatible el frontend anterior, después de probarla sobre una copia aislada.

### Paso B. Frontend compatible

- `src/app.js`: sesión del lector consulta `sb.rpc('my_profile')` en lugar de `.select('*')`; `whoami` y caché de sesión siguen como antes.
- `src/profile.js`: Preferencias consulta `my_profile` y conserva todas las actualizaciones selectivas en `profiles` del propio usuario.
- `src/patreon.js`: `accountBox` consulta `my_profile`, conservando `patreon_user_id`, el muro de agradecimientos, `patreon_pledges` y acciones `patreon_begin/link/login/unlink`.
- `src/ui.js`: Inicio y buscador consultan `my_adult_ok` en vez de solicitar `adult_ok` directamente.
- Studio, comentarios y páginas de equipos mantienen sus joins sobre los tres campos públicos permitidos `id`, `username` y `avatar_url`.
- El perfil público continúa usando `reader_public`, que aplica `profile_visibility`, `discoverable`, actividad y bloqueos según la implementación existente.

El frontend nuevo se debe verificar en Preview con Supabase real de **pruebas**, luego desplegar cuando las RPC estén disponibles. Nunca publicar frontend con estas llamadas antes del Paso A en el backend correspondiente.

### Paso C. Cierre de lectura pública — `supabase/release-gates/SEG01_LOCK_PROFILES.sql`

**Archivo explícitamente FUERA de `supabase/migrations`** para impedir que se aplique en el mismo lote que Paso A. Solo con el frontend nuevo ya probado, ejecuta:

`REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;`  
`GRANT SELECT (id, username, avatar_url) ON public.profiles TO anon, authenticated;`

La operación es transaccional y comprueba privilegios antes de confirmar. No revoca `UPDATE` del propietario ni el acceso `service_role` de las funciones Edge de Patreon y correo.

Si ocurre un problema tras el cierre, existe un **rollback de permisos documentado en ese mismo archivo**. Es una medida temporal porque vuelve a habilitar lecturas sensibles; investigar y reparar antes de reintentar.

## Flujos que NO pueden cambiar

| Flujo | Contrato de identidad inalterable | Comprobación |
|---|---|---|
| Correo y contraseña | `auth.users.id` igual antes y después | Entrar; recuperar contraseña; cambiar correo con doble confirmación |
| Google | `auth.identities.user_id` apunta al mismo `auth.users.id` | Entrar por Google; `linkIdentity`; `unlinkIdentity`; reingresar por correo |
| Patreon del lector | `profiles.patreon_user_id` no cambia, permanece UNIQUE | Vincular, login por Patreon a mismo ID, relink y apoyos |
| Patreon de equipos | Campañas, tokens y `patreon_pledges` no se alteran | Campaña/contenido bloqueado/sello |
| Resend / avisos | Correo desde `auth.users.email`, frecuencia desde `profiles.notify` accesible a función autorizada | Correo de prueba sin exponer preferencias |
| Studio | `team_members.user_id`, roles, propietario intactos | Cambiar equipo, editar/guardar/publicar según permiso |
| Lector | `reader_prefs`, `reading_progress`, `read_chapters` intactos | Volumen, modo continuo, posición y lectura tras recarga |
| Perfil público | `reader_public` y visibilidad intactos | Público, autenticado, privado/bloqueado |

## Pruebas añadidas

`scripts/privacy-identity-compat-check.mjs` ejecutado por GitHub Actions comprueba que:
- Las RPC verifican dueño y `EXECUTE` no se concede anónimamente.
- El cambio de permisos está **separado del paso aditivo**.
- No hay DDL ni modificaciones a `auth.users`, `auth.identities`, membresías, campañas, equipos o políticas RLS.
- Los clientes no requieren las columnas privadas mediante `select` directo.
- Google, Patreon y la recuperación/cambio de correo siguen conectados al mismo flujo de autenticación.
- El código original de funciones Edge y los contratos de correo se conservan.
- Pasa el CI completo de fases 1–7. Los tests estáticos no sustituyen comprobaciones de roles reales.

## Pruebas reales obligatorias antes de producir

1. Crear un **backend de QA aislado y compatible**, sin conexiones a la base productiva y sin costos adicionales.
2. Ejecutar paso A, probar sesión como anónimo, propietario y otra cuenta. `anon` no ejecuta `my_profile`; el propietario recibe solo su fila y `my_adult_ok` refleja su elección.
3. Ejecutar tests reales de tres accesos con una misma cuenta de prueba: correo → Google → Patreon → correo; verificar igualdad exacta de UUID, biblioteca, equipo, permisos y progreso. Vincular otra cuenta ajena no debe fusionarla.
4. Aplicar paso C al backend QA y repetir: consultas directas `profiles.notify` y `profiles.patreon_user_id` fallan para `anon` y `authenticated`; comentarios y miembros siguen mostrando nombres/avatar.
5. Revisar RPC existentes, administración, control de acceso +18 y restricciones de contenido Patreon; comprobar flujo de correos reales únicamente a direcciones de prueba autorizadas.
6. Inspeccionar en navegador móvil y escritorio los menús de cuenta, preferencias y lectura. Verificar ausencia de errores JS/REST en consola y red.
7. CI del SHA exacto y autorización explícita antes de aplicar pasos A/B/C en producción. Realizar backup y tener reversión supervisada.

**Bloqueo de despliegue:** No es suficiente que los tests de Chromium con datos ficticios pasen; es obligatorio validar **RLS real** y **vinculaciones de los tres proveedores** con un backend aislado. El proyecto activo `qfllthjpjuaztppvpsrk` NO debe utilizarse para esos experimentos.

No se alteran Cloudflare, dominios, Vercel productivo, SMTP, Resend, credenciales ni políticas existentes en la rama de pruebas.


## Actualización operativa — 20/10/2026: fase A preparada en producción, SIN cierre de permisos

Tras la fusión de la candidata #21, este PR #22 apunta ahora a **main** en vez de a la rama candidata. En la base productiva de **THEOBIPROJECT** se aplicó exclusivamente la migración aditiva mediante la conexión autenticada de Supabase, registrada en el historial remoto como `20261021000412_seg01_profiles_private_owner_rpc`. La fecha/versionado remoto lo asigna Supabase y **no corresponde al nombre local anterior `20261114_profiles_private_owner.sql`**: reconciliar ambos antes de activar automatizaciones de migración.

### Hechos comprobados (solo consultas de catálogo/permisos; sin leer datos personales)

- `public.my_profile()` y `public.my_adult_ok()` existen, tienen propietario `postgres`, `SECURITY DEFINER` y `search_path` vacío.
- `authenticated` puede ejecutar ambas RPC; `anon` no puede ejecutar ninguna. No se cambiaron `auth.users`, `auth.identities`, roles, claves ni las 32 columnas de `profiles`.
- Permanece el permiso `UPDATE` por columna para `authenticated` en `ui_prefs` y `notify`, así como la lectura de `service_role` sobre `patreon_user_id`.
- **SEG-01 sigue abierto:** `anon` aún puede consultar columnas privadas (`patreon_user_id`, `notify`), porque el paso restrictivo C **NO** se ejecutó.
- GitHub Actions del commit `49fe5cdf`: éxito (#39512884981); solo contrato estático, no prueba real de identidades.
- Las Preview existentes usan backend ficticio `.invalid`, y no hay ramas Supabase de pruebas disponibles según el inventario conectado. **No tomar NLOBI ni otras bases existentes como QA**.

### Puertas obligatorias para la segunda etapa

1. Disponer de un backend de QA **independiente y funcional**, sin cobros adicionales ni usuarios/obras de producción; ninguna conexión de Preview debe usar el hostname productivo.
2. Verificar la matriz anónimo/propietario/tercero, y los tres proveedores correo/Google/Patreon vinculados al mismo UUID real en QA, más lector y Studio. No basta con Chromium sintético.
3. Probar una versión productiva staged del frontend nuevo contra las RPC, verificar actualización de preferencias y lectura antes de asignar el dominio; atender también pestañas antiguas y service worker antes de revocar SELECT.
4. Solo después de esas pruebas, ejecutar el paso de cierre `SEG01_LOCK_PROFILES.sql` en ventana supervisada con validaciones inmediatas de permisos y plan de rollback. No fusionar/desplegar el frontend nuevo por su cuenta antes de asegurar la fase A (ya aplicada aquí) y pasar las pruebas.
5. Confirmar que cualquier flujo legado que use SELECT a columnas privadas fue reemplazado; `reader_public`, `whoami`, roles de equipo, invitaciones, reseñas, avisos, EPUB y progreso deben permanecer operativos.

**No considerar cerrado SEG-01 hasta negar efectivamente la lectura de columnas privadas a `anon` y `authenticated` tras pruebas reales.**

### Verificación posterior de la fase A

- Consulta transaccional **READ ONLY** bajo rol simulado `authenticated` con UUID inexistente (sin leer filas personales): `my_profile()` devolvió NULL y `my_adult_ok()` devolvió FALSE. Transacción revertida.
- Consulta transaccional **READ ONLY** bajo rol `anon`: ambos permisos `EXECUTE` son FALSE. Transacción revertida.
- Las funciones conservan `SECURITY DEFINER`, propietario `postgres`, y configuración de `search_path` vacía; los permisos de edición y de `service_role` siguen disponibles.
- GitHub Actions para SHA `9694f285`: [CI #39519315069](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39519315069) **SUCCESS**. Las pruebas no sustituyen flujo OAuth ni RLS con usuarios reales.

# SEG-02 — Publicación por etapas sin romper lectores existentes

**Estado de publicación al 22/10/2026:** **FASE A APLICADA EN SUPABASE PRODUCCIÓN** y validada. Histórico de Supabase: `20261022152232_seg02_phase_a_additive_profiles_20261022` (versión `20261022152232`). Fuente exacta aplicada: `supabase/migrations/20261022055000_secure_reader_profiles.sql` (SHA blob `c1c4be0fd7b29dbe57e856c8788259d5c5313221`; el nombre físico del archivo en GitHub difiere del nombre registrado por la herramienta de migraciones). La Fase B (frontend) y la C (revocación final) **NO están aplicadas**, Vercel y `main` sin cambios.

**Post-verificación productiva:** las tres RPC nuevas existen, `anon` puede usar las públicas de equipos y comentarios pero no `studio_profile_names`; las diez RPC privadas ya no son ejecutables por `anon` y sí por `authenticated`/`service_role`. Siguen presentes `profiles read USING(true)`, la lectura heredada de `profiles`, el `UPDATE` de `notify` y los privilegios de Patreon de `service_role`; se añadió `UPDATE(patron_wall)` limitado por RLS propietario. Las comprobaciones en transacciones de solo lectura ejecutadas como `anon` y `authenticated` aprobaron. Se solicitó la recarga de esquema de PostgREST (`NOTIFY pgrst`). **No se accedió a datos de lectores reales en la validación**.

**Advertencia:** los campos privados de `profiles` continúan expuestos a lectura por el permiso legado hasta Fase C. No equivale a cerrar el hallazgo de privacidad. La etapa B debe validarse primero y la etapa C necesita plan para clientes/PWA antiguos.


## Principio de compatibilidad

El frontend anterior utiliza joins `profiles(username,avatar_url)` desde comentarios y equipos. El nuevo frontend necesita `studio_profile_names`, `team_public_members` y `comment_public_authors`. No se puede revocar `SELECT` de `profiles` en la misma transacción en que se crean las funciones si el frontend anterior aún está en servicio.

## Fases y archivos

**A — preparación aditiva, sin corte de ACL**  
Archivo: `supabase/migrations/20261022055000_secure_reader_profiles.sql`. Instala RPC y corrige funciones de privacidad. *No* retira la política pública de perfiles. Da permiso limitado a `patron_wall` bajo RLS propietario, necesario para la preferencia del muro de Patreon.

**B — frontend nuevo**  
Después de verificar que las tres RPC responden por HTTP en producción, liberar el frontend que utiliza esos contratos. Validar inicio de sesión, Preferencias, Estudio, solicitudes de traductores, perfiles de equipos, comentarios, búsqueda, Patreon (sin tocar tokens), avisos y lectura móvil. Comprobar que las rutas, módulos y assets nuevos se sirven realmente desde Vercel, no solo que el build marque READY.

**C — cierre definitivo de privacidad**  
Archivo **manual**, fuera de migraciones automáticas: `supabase/release-gates/SEG02_FINAL_LOCK_PROFILES.sql`. Contiene preflight transaccional, límites de tiempo de bloqueo, revocación global de privilegios antiguos de tabla y sustitución de `profiles read` por `profiles self read`. Ejecutar únicamente una vez retirada la dependencia del frontend anterior. Inmediatamente correr `supabase/tests/seg02_profile_privacy.sql` y probar requests reales A/B y anon. No ejecutarlo mientras clientes cacheados sigan usando joins antiguos o si faltan nuevas RPC.

La compatibilidad entre **A** y **C** se verifica automáticamente en las pruebas de GitHub Actions:
- `supabase/tests/seg02_additive_compat.sql` comprueba que las columnas públicas antiguas siguen legibles y las RPC nuevas están disponibles.
- `scripts/seg02-stage-http-check.mjs` comprueba el mismo contrato por PostgREST.
- Se ejecuta **C exclusivamente en un contenedor de QA**, seguido de ACL/RLS y de `scripts/seg02-supabase-http-check.mjs` con Auth real local.

## Controles previos de liberación

1. Todos los workflows requeridos en verde sobre el mismo SHA de la rama; no ocultar fallos de navegador ni ignorar assertions.
2. Copia de seguridad y ventana de cambio coordinada, con responsable para ejecutar **C** posteriormente, si aplica.
3. Verificar configuración real del proveedor Google, dominio autorizado de callback y retorno a `https://elobidellector.com/`. El archivo `supabase/config.toml` contiene el dominio canónico, pero no confirma que el dashboard de Supabase o Google lo tenga ya aplicado.
4. Comprobar entorno de Patreon (secreto de campaña y callbacks) y Resend/SMTP con cuentas de prueba y proveedores autorizados. La cobertura automática verifica ACL de `service_role` y permisos sobre `patron_wall`, pero no sustituye esas pruebas con terceros.
5. Mantener ocultas las credenciales de Vercel, Supabase, Resend y Patreon. Nunca almacenarlas en CI de una PR no protegida ni registrarlas en logs.
6. Verificar que no existe una PWA/cache activa servida con frontend anterior antes de aplicar **C**; de otro modo, prolongar la fase B o diseñar una compatibilidad transitoria que no abra columnas privadas.

## Rollback y recuperación

- Si falla **A**: no continuar a B. Conservar frontend existente; reparar RPC sin abrir permisos adicionales.
- Si falla **B**: volver al frontend anterior sin ejecutar **C**. La fase A es aditiva y no quita SELECT legado.
- Si falla **C**: la transacción aborta y conserva la configuración previa. Si ya confirma, revertir cambios del frontend y recuperar contratos de identidad públicos mínimos de forma supervisada, **sin restaurar SELECT a columnas privadas**.
- No revertir de forma general el antiguo `profiles read USING (true)` con acceso completo a la tabla.

## Observaciones importantes

Las pruebas integrales actuales usan **un esquema sintético**, no un volcado de producción. Se ha inspeccionado el catálogo real sin leer datos de usuarios. Supabase local permite Auth/REST reales y servicios efímeros, pero no valida automáticamente Google, Patreon, Resend, Storage ni datos y funciones fuera del fixture. **Un CI verde no autoriza por sí solo el despliegue a `main`.**

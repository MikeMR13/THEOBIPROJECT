# Discord · Difusión Fase 2a · Backend activado con control

**Estado verificado el 25 de octubre de 2026:** backend Supabase instalado y Edge Function `diffusion-discord` activa (`verify_jwt=true`) en `qfllthjpjuaztppvpsrk`. La interfaz web de la PR #116 sigue sin fusionar a `main` ni desplegarse al sitio público.

## Historial reproducible

Las migraciones de GitHub ya coinciden con las versiones de producción:
- `20261025232409_diffusion_phase1_controlled_20261025.sql`: estructura, RLS, RPC y roles.
- `20261025232432_diffusion_discord_manual_controlled_20261025.sql`: conexión Discord, secreto cifrado mediante Vault, prueba limitada y revocación.

Las dos migraciones se aplicaron mediante Supabase y se verificaron los `GRANT`, RLS y funciones efectivas. La función `diffusion-discord` se desplegó como versión 1 con verificación JWT. **Ningún webhook real se registró**, no se envió contenido a Discord y no hay reglas ni trabajos activos.

## Seguridad y alcance

- URL secreta cifrada en Supabase Vault, con referencia privada y sin lectura por `authenticated`/ `anon`.
- RPC de vinculación, prueba manual limitada a un intento por minuto y revocación, aplicando permisos de pertenencia al equipo.
- El Bibliotecario administra las conexiones oficiales, sin control sobre las conexiones de equipos.
- La Edge Function verifica usuario y permisos, limita la URL a Discord, prohíbe redirecciones y manda un texto fijo sin menciones.
- Sin envíos automáticos, cron ni activación de eventos editoriales.

## Validación

- `diffusion-isolated-db.yml`: PostgreSQL 17 efímero y RLS con Vault simulado.
- `diffusion-vault-real.yml`: Supabase CLI **local**, migraciones reales, cifrado y revocación con **Vault auténtico**.
- CI general, pruebas de SEO y regresión en verde en el commit de sincronización de versiones.
- Los avisos del asesor de seguridad sobre las RPC `SECURITY DEFINER` autenticadas son esperados: las funciones incorporan comprobaciones de equipo y los `GRANT` se verificaron. La tabla privada de secretos carece intencionalmente de políticas de usuario final.
- **Pendiente:** validación de extremo a extremo de Auth HTTP/Edge y el primer mensaje a Discord desde la interfaz desplegada.

## Próximo paso de lanzamiento

La UI de la PR #116 no está en `main`. Validar primero en vista previa de Vercel y decidir el despliegue web. Entonces, desde **Difusión → Conexiones**, el administrador del equipo pegará la URL secreta de Discord en el formulario seguro y pulsará manualmente **Enviar prueba**. Nunca compartir el webhook por chat, capturas o GitHub.

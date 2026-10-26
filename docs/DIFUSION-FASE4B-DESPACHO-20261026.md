# Difusión Fase 4B — envío automático y seguro (Discord + Telegram)

## Alcance
Solo anuncios explícitamente programados en 4A, con modo **manual por defecto**. Cada nuevo anuncio puede seleccionar `automatic`. No se activan las reglas generales de `diffusion_rules` y no se suman plataformas sociales.

## Seguridad, idempotencia y costo
- Reutilizar **pg_cron, pg_net y Supabase Edge Functions ya instalados**. El cron consulta la base una vez/minuto, pero solamente llama la función de entrega cuando existe un plan automático vencido.
- Antes del despacho se revalida: conexión activa, serie pública y sin archivar, acceso público o vencido, volumen/capítulo publicado con fecha cumplida, portada exacta e identidad del equipo. Si cambian a privado, se bloquea sin enviar.
- Se usa `FOR UPDATE SKIP LOCKED`, evento único compartido con anuncios manuales, job `leased` y ticket aleatorio de un solo uso (hash SHA-256 en tabla privada). **Ningún token estático se graba en el SQL de pg_cron**.
- Si Discord o Telegram no confirma recepción, marcar `unknown` y **NO reintentar automáticamente**, porque pudo haberse entregado. El lease vencido también termina `unknown`. Los administradores deben revisar manualmente.
- Mensajes Discord con `allowed_mentions.parse=[]`. Telegram sin formato HTML y menciones desactivadas; no enviar a destinos URL arbitrarios. Se usan Vault para los tokens que YA están almacenados.
- No crear Supabase Branching, nuevos servicios, Make/n8n u otros proveedores de pago. El cron en reposo no invoca Edge.

## Etapas de liberación y puertas
1. PR con SQL, Edge Function y UI: pasar PostgreSQL 17 efímero, tests Node y CI/SEO.
2. Desplegar `diffusion-dispatch` con `verify_jwt=false` **solo porque exige un ticket efímero válido y de un solo uso**; probar 401 sin ticket.
3. Aplicar migración versionada SQL y constatar `delivery_mode='manual'` para los planes 4A existentes.
4. Activar `obi-diffusion-4b` vía `sql/diffusion-4b-activate-cron.sql` y verificar que sin planes automáticos vencidos no se llama Edge.
5. Realizar QA E2E con un destino de Discord/Telegram de pruebas autorizado, revisar confirmación y duplicados. **No crear anuncios falsos en canales reales**.
6. Solo después de QA E2E y aceptación editorial se considera la entrega totalmente validada. No activar reglas generales `diffusion_rules.enabled`.

## Reversión
Desactivar el cron y pasar planes pendientes a manual con `sql/diffusion-4b-stop-cron.sql`. No reabrir los jobs `unknown` ni reenviar sin inspeccionar el canal externo.

## Diferencia con 4A
La llamada original `public.diffusion_schedule_create(...,p_at)` (cinco argumentos) sigue agendando manualmente. La nueva versión con sexto parámetro `p_delivery` activa un plan individual si es `automatic`.

Documentación del proveedor: https://supabase.com/docs/guides/functions/schedule-functions

# Entrega 1 — Acceso y Patreon / Difusión segura

## Alcance

Implementación aislada desde `main` de dos correcciones P0 detectadas en la auditoría:
- `src/studio.js`: `readPages()` retorna `{data,error}`. La pestaña `Acceso y Patreon` valida la respuesta y utiliza `chapters.data`, conservando todas las filas paginadas (no el objeto contenedor).
- `supabase/functions/diffusion-dispatch/handler.mjs`: las tres RPC asíncronas manejan errores mediante `try/catch` y `await`; funcionan con thenables PostgREST que no implementan `.catch()`.

## Seguridad de los dos anuncios atrasados

Al momento de preparar la entrega, Supabase contiene **dos publicaciones automáticas** en estado `planned` (una Discord y una Telegram), con `scheduled_at=2026-10-29 03:57:16.965941+00`. El cron `obi-diffusion-4b` estaba activo. **No se ha enviado, modificado ni cancelado ninguna de ellas durante esta entrega.**

Antes de hacer el primer `diffusion_4b_claim`, el handler consulta si existe algún anuncio automático `planned` vencido por más de 15 minutos. Ante uno o más casos, devuelve `409 overdue_plans_require_review` sin reclamar un envío, sin enviar mensajes y sin modificar las programaciones. Si la comprobación falla o la respuesta es incompleta, responde `503 overdue_check_failed`, también sin enviar mensajes. El ticket efímero ya se habrá consumido; esto es intencional para evitar reutilización.

**Consecuencia deliberada:** hasta revisar los anuncios anteriores, también se detienen otros anuncios automáticos. Esta entrega evita que reparar el despachador dispare inadvertidamente envíos atrasados. El envío manual existente no se modifica.

El proyecto necesitará que un responsable decida cancelar, revisar o reprogramar los dos anuncios. No se deben reprogramar automáticamente los antiguos ni eliminar el historial.

## Validación

`node scripts/entrega1-accesos-difusion-check.mjs` usa datos locales y clientes simulados. Comprueba:
1. Lectura completa con 301 y 44 capítulos, y obra sin capítulos; rechazo de respuestas incompletas y errores del paginador.
2. Uso de `chapters.data` en Studio, sin truncar resultados.
3. Rechazo de solicitudes sin ticket.
4. Cliente RPC tipo PostgREST con `then()` y sin `.catch()`.
5. Rechazo de anuncios automáticos vencidos (409) y fallo cerrado ante error de lectura (503).
6. Envío simulado legítimo una sola vez, sin acceder a ninguna red social.
7. Manejo de fallos en consumo de ticket, claim y confirmación de entrega.

La comprobación está agregada al workflow `.github/workflows/ci.yml` con datos ficticios; no usa credenciales de Supabase productivo ni genera envíos externos. Ejecutar CI de rama y revisar las regresiones existentes antes de fusionar.

## Condiciones previas a cualquier activación

- Revisar los dos anuncios históricos; evitar envíos inesperados.
- Aprobar CI y conservar funcionamiento manual de Difusión.
- Confirmar en un entorno de prueba que la Edge Function desplegada coincide con el archivo revisado.
- Probar Acceso y Patreon en una sesión autorizada con dos obras de múltiples volúmenes.
- Fusionar a `main` y desplegar la Edge Function **solo tras una autorización independiente**. Un commit de GitHub no actualiza automáticamente el código de una Edge Function ya desplegada.
- No crear nuevos crons, proveedores, suscripciones ni funciones pagadas. No cambiar políticas de acceso, contenido ni permisos de capítulos.

## Estado de entrega

Rama de cambios aislada; **no hay migraciones ni cambios directos de datos de Supabase, no hay despliegue en Vercel ni activación de publicaciones**.

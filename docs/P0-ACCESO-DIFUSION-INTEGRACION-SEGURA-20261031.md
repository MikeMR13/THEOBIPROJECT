# Recuperación P0 — Acceso/Patreon y Difusión (31/oct/2026)

## Base y compatibilidad
Rama creada desde `main` **033c2ce0b8814819cff5ec3bbd2271ea81d9c3ac**. Sustituye la preparación desactualizada del PR #226 y conserva las Entregas 2, 3 y 4. No copia una versión anterior de `src/studio.js`: solo modifica el contrato de `readPages` en la pestaña de acceso.

## Fallo 1: Acceso y Patreon
`readPages()` devuelve `{data,error}` o lanza un error, pero la UI asignaba `CH = chapters || []`. Se valida `Array.isArray(chapters.data)`, la ausencia de errores y el contenido de la obra antes de asignar `CH=chapters.data`. Un fallo muestra aviso y **no** permite dibujar controles con datos malformados. No cambia precios, RPC de guardado, fechas, niveles de Patreon ni políticas RLS.

## Fallo 2: Edge Function de Difusión
`admin.rpc()` puede devolver un `thenable` sin `.catch()`. Se sustituye el uso incompatible por `callRpc` con `try/await/catch` para consumir tickets, reclamar trabajos y registrar confirmaciones. Las llamadas `.catch()` de `response.json()` son promesas web auténticas y no se modifican. **No se cambia** la resolución de secretos, el contenido del mensaje ni las URLs permitidas.

### Barrera contra publicaciones retrospectivas
La función nueva, **antes del primer claim**, busca anuncios `planned`, `automatic`, cuya `scheduled_at` sea anterior a 15 minutos. Si detecta cualquiera, responde `409 overdue_plans_require_review`. Si la consulta falla o devuelve datos incompletos, responde `503 overdue_check_failed`; ambos casos impiden publicar. La barrera bloquea **todos** los envíos automáticos, incluso los nuevos, hasta revisar/cancelar o reprogramar los antiguos. Es una elección de seguridad explícita, no un arreglo definitivo de la agenda.

Supabase confirma **dos anuncios vencidos**, uno Discord y uno Telegram, ambos planificados para el 28/oct a las 21:57 de Monterrey. No se han modificado. El cron `obi-diffusion-4b` sigue programado cada minuto; desplegar la nueva función con los anuncios pendientes debería devolver 409 y no enviar mensajes. Aun así, el despliegue y la decisión sobre esos anuncios son pasos operativos separados, que requieren revisar los logs y su estado.

## QA
`node scripts/entrega1-accesos-difusion-check.mjs`: contrato real de paginación (0, 44 y 301 capítulos), errores de Supabase, cliente RPC `thenable` sin `.catch`, anuncios vencidos, error de consulta, flujo limpio y confirmaciones simuladas. No llama a Discord, Telegram ni al Supabase real. `scripts/diffusion-dispatch-check.mjs` se adapta al nuevo guard. Ambos se integran en el CI existente de GitHub Actions.

## Operación y límites
- No se ejecutaron SQL, envíos, modificaciones del cron, cancelaciones ni reprogramaciones.
- No desplegar la Edge Function por el mero hecho de fusionar el PR. Debe revisarse primero el estado de los dos mensajes antiguos y decidir explícitamente su destino.
- Tras aprobar CI, se puede integrar la corrección de interfaz. Para que la corrección del despachador tenga efecto, se requiere despliegue separado de Supabase Edge Function. **Ningún token o webhook se transfiere a pruebas.**
- Posteriormente rerun de la Entrega 5 (#230): los dos bloqueos P0 de código deben desaparecer, pero la validación autenticada y la agenda vencida siguen pendientes.
- Solo GitHub Actions estándar; sin nuevos servicios, runners de pago ni activaciones facturables en Vercel, Supabase o Cloudflare.

# Fase 4A — Agenda editorial de Difusión sin envíos automáticos

## Estado de la entrega
Esta primera parte de la Fase 4 permite crear, listar, reprogramar y cancelar fechas para anuncios en Discord o Telegram. El plan se guarda en Supabase, visible solo en el ámbito editorial autorizado.

**No es un despachador.** Un anuncio llegado a su fecha requiere pulsar «Preparar envío», revisar la vista previa actualizada y confirmar el botón de envío manual. Las reglas automáticas siguen desactivadas. No se agrega cron, función de disparo ni servicio de pago.

## Uso
1. En «Anunciar» selecciona conexión activa, obra/volumen/capítulo publicado y «Crear vista previa».
2. Edita el texto, elige una fecha local entre dos minutos y 90 días y pulsa «Agregar al calendario».
3. En «Calendario» puedes consultar pendientes y cancelados, reprogramar o cancelar sin enviar nada.
4. Al llegar la fecha pulsa «Preparar envío». El servidor revalida acceso público, portada y conexión, y vuelves a confirmar la publicación.
5. Al confirmar la entrega, una RPC marca la agenda como enviada **solo si existe un job de proveedor en estado `sent`**. Si la entrega no se confirma, el plan queda pendiente y debe revisarse el historial antes de reintentar.

## Protección editorial
- Se requieren tanto `diffusion_schedule` como `diffusion_publish` para crear fechas; `diffusion_schedule` para modificar y cancelar.
- Las funciones son `SECURITY DEFINER` con `search_path=''`, validación de ámbito, contenido público y portada mediante helpers de producción.
- RLS `diffusion_view` delimita la lectura por equipo y la cuenta oficial; cliente autenticado no tiene INSERT, UPDATE ni DELETE directos.
- Solo se permite un pendiente por conexión+tipo+contenido. Los envíos ya registrados no se pueden volver a programar.
- Cancela al borrar el equipo, la obra o la conexión para no bloquear operaciones editoriales.
- No se guardan tokens ni URLs secretas y no se modifica el funcionamiento de Discord y Telegram.

## Siguiente tramo
Fase 4B: diseñar despachador seguro (revalidación antes de envío, límites de frecuencia, permisos de activación y controles de fallos). Requiere aprobación explícita de activar el primer envío programado real, de modo que esta etapa no lo inicia.

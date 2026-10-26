# Difusión · «Anunciar» multicanal e inmediato — 26 de octubre de 2026

## Dónde
En **Estudio → Difusión → Anunciar** o **El Bibliotecario → Difusión → Anunciar**.

## Uso
1. Elegir hasta ocho **conexiones activas** de Discord y/o Telegram mediante casillas.
2. Seleccionar obra, volumen o capítulo publicado.
3. Pulsar **Crear vista previa**: el navegador consulta la RPC de previsualización de **cada conexión** antes de permitir el envío. La URL, título y portada deben coincidir.
4. Editar texto (máximo 700 caracteres).
5. Pulsar **Confirmar y enviar ahora a N canal(es)**, verificar la lista de destinos y aceptar.
6. Consultar el resultado **por conexión**: Enviado, Ya existía, No realizado o Sin confirmación. Una llamada fallida o una respuesta incierta **no** reintenta; comprobar canal/historial antes de nueva acción.

**Calendario**: el mismo selector también crea un plan **por conexión** para la fecha elegida, conservando manual/automático, validaciones y límites originales. Puede haber éxito parcial, reflejado por canal. Un plan del Calendario que vuelva a «Anunciar» preselecciona únicamente su conexión original.

## Seguridad / costos
- No se crean claves nuevas ni se modifica Supabase, Edge Functions, pg_cron ni permisos.
- Cada publicación invoca las **Edge Functions actuales** `diffusion-announcement` (Discord) y `diffusion-telegram` (Telegram), con validación de JWT, scope de equipo, contenido público, deduplicación y límite de frecuencia **independientes por conexión**.
- **No** hay ejecución automática al entrar en la pestaña ni por marcar canales. Las solicitudes POST a proveedores ocurren solamente tras pulsar «Confirmar y enviar», confirmar en el cuadro y recibir autorización de Edge.
- Se ejecutan los envíos uno a uno; si uno falla, se registra su estado y se continúa con los demás. No repetir una petición incierta.
- El máximo es 8 destinos seleccionados y ninguna cuenta de otro equipo aparece en el formulario, según la consulta con ámbito actual.
- Pruebas en GitHub Actions gratuitas bajo las cuotas existentes: validan validación de destinos, orden y recuperación independiente de errores, sin enviar mensajes reales. La recepción real exige canales de QA autorizados.

## Limitación importante
Como los envíos se realizan desde el navegador con el endpoint actual por conexión, no son una transacción única en Discord y Telegram: un canal puede publicarse mientras otro no. Por eso la interfaz muestra resultados individuales y exige consultar los destinos inciertos antes de reintentar.

## Reversión
Revertir commit de interfaz desde GitHub si se detecta fallo. Sin migración SQL ni cambios de infraestructura. Los mensajes enviados a proveedores externos no pueden retirarse automáticamente.

# Entrega 3 — Difusión: historial, retrasos y pestañas (31/oct/2026)

**Ámbito:** Estudio y Bibliotecario comparten `src/diffusion-panel.js`, con consultas existentes delimitadas por `team_id`, permisos `diffusion_logs` y `diffusion_schedule` (según el panel). Rama de validación independiente creada desde `main` después de Entrega 2.

## Qué cambia

1. **Historial comprensible.** Muestra estado traducido, canal y conexión, tipo y título del contenido, mensaje del evento si se conservó, fecha, intentos y error/confirmación. Si el registro incluye una URL pública de la obra en `elobidellector.com`, ofrece «Abrir contenido público»; **no** construye enlaces falsos a mensajes de Discord/Telegram. Las cancelaciones y resultados de agenda también aparecen. Un botón actualiza el historial. Se consultan como máximo 50 trabajos y sus eventos vinculados, manteniendo el filtro de equipo y el permiso existente. Si faltan detalles por restricciones de acceso, solo se muestra el estado disponible.
2. **Retrasos inequívocos.** Los planes `planned` cuya fecha ya pasó se resaltan como «Retrasado». Los automáticos sin confirmación se diferencian de los manuales: **la etiqueta no cancela ni ejecuta ningún envío**. Cambiar la fecha de un automático atrasado exige una confirmación adicional que advierte del posible envío futuro. Se conservan las funciones existentes de cancelar y comprobar si ya hay entrega confirmada.
3. **Pestañas enlazables.** Se reconoce `?tab=resumen|conexiones|anuncios|reglas|campanas|calendario|historial`. Cada cambio actualiza el historial del navegador conservando parámetros de equipo y enlaces profundos; Atrás/Adelante restauran la sección. Los enlaces profundos existentes a Anunciar se siguen respetando cuando no se especifica `tab`.
4. **Textos y respuesta móvil.** «Borradores y plantillas» unifica nombre y título. Los avisos de retraso y el contenido del historial evitan desbordes y mantienen foco visible.

## Riesgos y límites

- **No se han ejecutado anuncios, cancelaciones, reprogramaciones, modificaciones de conexiones ni SQL.**
- **No se modifica** el despachador automático, su cron ni los permisos. Los anuncios atrasados no se resuelven mediante una mejora de interfaz.
- Se detectaron por consulta solo lectura **dos anuncios automáticos `planned` y vencidos**: requieren decisión separada antes de alterar su estado o desplegar la Entrega 1 de backend.
- `safe_payload` se utiliza únicamente para texto escapado y enlaces públicos con origen/forma permitidos; nunca se divulgan tokens o webhooks.
- No se agregan paquetes, tareas programadas, servicios, proveedores ni funciones que generen facturación.
- El historial consulta los 50 registros más recientes del ámbito; los indicadores de reglas son orientativos, no conteos históricos absolutos.
- La validación autenticada real de ambos roles y la revisión de los dos atrasados siguen pendientes. El PR debe quedarse en borrador hasta que CI y revisión operativa lo justifiquen.

## Comprobaciones

`node scripts/entrega3-difusion-ui-check.mjs` usa datos ficticios y no requiere backend. En GitHub Actions se mantienen las regresiones de Difusión existentes y las pruebas Chromium aisladas. No fusionar ni desplegar esta entrega sin autorización.

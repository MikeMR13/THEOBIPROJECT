# Entrega 5 — QA integral y dictamen previo al estreno
**Fecha de corte:** 31/10/2026. **Base:** `main` después de fusionar la Entrega 4 (commit `033c2ce0b8814819cff5ec3bbd2271ea81d9c3ac`).

## Qué se comprobó
1. En el CI único de GitHub Actions: navegación de Estudio y Bibliotecario, editor, importador, accesibilidad, lector, PWA sin conexión, Biblioteca, Difusión, SEO, diseños adaptables, permisos, preferencias y regresiones de Entregas 2, 3 y 4. La nueva matriz comprueba que los recorridos cruciales no desaparezcan de CI.
2. Un script sin backend `scripts/entrega5-preestreno-qa-check.mjs` comprueba contrato de paginación con 503 capítulos repartidos entre dos obras y varios volúmenes; etiquetas editoriales; estado de Difusión; enlaces de pestañas; mantenimiento de rutas, continuidad y precauciones de permisos; estadísticas y textos de Apoyar. Simula el comportamiento `thenable` real del cliente RPC sin exponer credenciales ni realizar envíos.
3. Consulta **solo lectura** de Supabase: 14 obras activas y 14 miniaturas, Apoyar corregido en `platform_settings.support` y **dos anuncios automáticos antiguos aún en `planned` y ya vencidos**. No se modificó ninguna fila.
4. Vercel indica el despliegue de producción de Entrega 4 en estado **READY**. Esto acredita que la compilación terminó, no que exista validación completa de sesión.

## Bloqueos técnicos abiertos — no firmar estreno total
**P0 — Acceso y Patreon.** `src/studio.js` aún contiene `CH = chapters || []` después de `readPages()`. Esta función devuelve `{data,error}`, no un arreglo. La prueba aislada demuestra que las 503 secciones se obtienen en el contrato real; la pantalla aún debe extraer `chapters.data` y verificar `error`.

**P0 — Difusión automática.** `supabase/functions/diffusion-dispatch/handler.mjs` llama `.catch()` directamente sobre `admin.rpc()`, cuyo cliente puede ser `thenable` sin método `.catch`. La simulación segura documenta el fallo; no modifica ni activa el despachador. Las dos publicaciones viejas no deben enviarse sin evaluación y autorización explícita de su destino.

Ambos parches están preparados en el **PR #226**, que permanece separado; **esta Entrega 5 NO lo fusiona**. Incluso después de aprobar el código, habilitar envíos automáticos y resolver los anuncios vencidos son decisiones operativas distintas.

## QA manual todavía necesario
- Iniciar sesión con lector real, verificar Biblioteca (Leyendo/Pendientes/Terminadas), Continuar, restricciones, progreso y navegación del lector.
- Validar Acceso y Patreon en dos obras con varios volúmenes después de integrar el parche crítico; conservar permisos de lectura y precios.
- Iniciar sesión como editor y Bibliotecario, probar Difusión por equipo, historial y calendario, sin publicar mensajes.
- Contrastar 320, 390, 768 y 1440 px con sesiones reales, incluidas campana, sidebar, panel de comentarios, SEO y ajustes. Los resultados Chromium de CI son datos ficticios.
- Revisar separadamente el estado de los dos anuncios vencidos antes de modificar el despliegue de Edge Functions.

## Matriz y prueba repetible
`node scripts/entrega5-preestreno-qa-check.mjs` genera `qa-evidencia/entrega5-resultado.json` con comprobaciones automatizadas, cobertura de CI y bloqueos. En CI se conserva como artefacto **24 horas**. La orden `node scripts/entrega5-preestreno-qa-check.mjs --strict` rechaza una autorización final si hay bloqueos o verificaciones manuales pendientes. El CI ordinario aprueba la **ejecución del diagnóstico**, no la autorización de producción.

**Política de costos:** se reutiliza el mismo GitHub Actions CI, sin runners de pago, sin nuevas funciones ni servicios contratados, sin modificar Vercel, Cloudflare o Supabase. **No fusionar este PR automáticamente:** es una entrega de trazabilidad, no el cierre de los bloqueos detectados.

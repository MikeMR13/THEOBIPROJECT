# Reglas de Difusión — activación real para nuevas publicaciones

## Dónde encontrarlas
Estudio de equipo / El Bibliotecario → Centro de Difusión → **Automatizaciones** → Crear regla → Guardar regla → elegir destino → **Activar regla**. También aparece **Pausar regla** si está activa.

## Funcionamiento
- Solo los eventos **Capítulo publicado** y **Volumen publicado** tienen ejecución automática comprobable: PostgreSQL registra nuevas transiciones del estado a `published`.
- Se escoge Discord o Telegram por regla, un retraso de 0–10080 minutos, y modalidad **Automática** o **Revisión interna**. Esta última crea anuncio **manual** en Calendario para aprobación editorial.
- `enabled=false` por defecto. No se anuncian contenidos publicados anteriormente; la activación no escanea el histórico.
- La publicación requiere obra pública y sin archivar, volumen publicado y portada válida; para capítulos también capítulo visible. El despacho 4B vuelve a comprobar las mismas condiciones antes de enviar.
- Al pausar, se cancelan planes aún no iniciados que generó la regla. Los ya reclamados pueden estar en curso, sin garantía de revocación externa.
- Registro único por regla y contenido, incluso si alguien cambia accidentalmente el estado de una publicación de nuevo. La cola de 4B sigue usando un evento único por conexión/contenido, sin reintentos en resultados inciertos.

## Eventos que todavía no admiten activación
`prelaunch.announced`, `content.unlocked` y `announcement.published` quedan **inactivos**, aunque puedan existir borradores preparados en fases anteriores. No hay disparadores suficientemente definidos para ellos; no se presentarán como funcionales ni se habilitarán hasta contar con contratos de publicación verificables.

## Pruebas gratuitas
PostgreSQL 17 efímero de GitHub Actions sobre migraciones reales Fases 1–4B; se simula publicación programada por cron, roles de dos equipos, RLS, deduplicación, revisión y pausa; **no se contacta ninguna red social**. CI general, SEO y QA sin costos nuevos.

## Producción
Aplicar solo tras CI aprobado. Si las conexiones reales están activas y alguien activa una regla, **los próximos capítulos/volúmenes publicados podrían enviarse realmente**. Todas las reglas existentes permanecen desactivadas de inicio; los borradores históricos no reciben retroactivamente la nueva función.

## Reversión
1. Pausar reglas desde la interfaz y verificar que no quedan planes automáticos de reglas pendientes.
2. En caso urgente, detener el cron global `obi-diffusion-4b` para cortar envíos automáticos por fecha y por evento, sabiendo que los envíos ya iniciados no son reversibles.
3. Revertir UI mediante GitHub y programar SQL correctivo versionado después de revisar los datos de reglas; no eliminar tablas con históricos ni hacer un rollback de esquema a ciegas.

# Difusión híbrida — entrega inicial (Fase 1)

Estado: código en rama de trabajo. **NO desplegado ni aplicado a Supabase de producción.**

## Decisión editorial

Los equipos traductores son autónomos para publicar en **sus propias** redes. No hay paso de aprobación del Bibliotecario. La eventual revisión corresponde al equipo y depende de su configuración interna. El Bibliotecario administra exclusivamente las redes oficiales de El Obi y puede supervisar datos autorizados.

## Alcance de esta entrega

- Ruta `/estudio/difusion` en Estudio, respetando equipo seleccionado y permisos.
- Pestaña Difusión en Bibliotecario, de ámbito institucional.
- Permisos por rol: ver, redactar, programar, publicar, gestionar y consultar registros.
- Migración aditiva: conexiones (metadatos sin tokens), reglas inactivas, campañas en borrador, eventos, cola, intentos, RLS y RPC de guardado.
- Formularios operativos para **borradores de campañas** y **reglas desactivadas** una vez aplicada la migración en QA.
- No hay todavía envío automático, OAuth, secretos, cron ni publicación externa: las reglas permanecen desactivadas a propósito.
- Ningún cambio sobre el flujo editorial de capítulos, volúmenes o mecenas.

## Iteraciones siguientes

1. QA de migración (roles históricos, rol personalizado, propietario, editor, no miembro y Bibliotecario).
2. Guardar secretos de conexiones en almacén privado; OAuth y prueba segura de Discord / Telegram / HTTPS firmado.
3. Despachador idempotente y de trabajos con fecha, reintentos y resultados.
4. Generador de eventos post-commit que verifique visibilidad y acceso público.
5. Conectores de Meta, Bluesky y otras API según requisitos del proveedor.
6. Integración institucional, auditoría, CI y despliegue por banderas.

## Riesgos y validación

- Esta migración redefine `private.perm_keys`, `private.clean_perms` y `public.my_team_permissions`: revisar conflictos con migraciones aplicadas después de esta rama.
- Verificar que `private.log` acepta los argumentos previstos en la base QA.
- Si falta la migración, la interfaz muestra aviso de configuración en lugar de fallar.
- No aplicar a producción ni habilitar conectores hasta tener pruebas de RLS y regresión.

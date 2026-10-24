# Publicación reversible de novelas

## Uso en Studio
Abrir **Estudio → Obras → novela → Datos de la obra → Estado de publicación de la novela**.

- **Regresar a borrador:** la novela deja de ser pública, los volúmenes publicados o programados vuelven a borrador y se retiran anuncios de preestreno pendientes. Se conservan capítulos, lecturas, reseñas, portadas e historial.
- **Reprogramar con preestreno:** la novela queda privada, con ficha limitada, cuenta regresiva y lectura bloqueada. Se elige un volumen y una fecha futura; los otros volúmenes publicados/programados se devuelven a borrador. El cron existente publica el volumen elegido a la hora indicada y el trigger de preestreno reactiva la novela.
- **Publicar la novela:** publica inmediatamente el volumen elegido mediante `publish_volume`, respetando revisiones y notificaciones; los demás volúmenes en borrador continúan privados.

Estas opciones son **independientes del estado de traducción**.

## Seguridad y persistencia
La migración `supabase/migrations/20261024_series_publication_modes.sql` aporta una única RPC transaccional `series_publication_transition`. Exige autenticación, permiso `publish` y además `schedule` para preestrenos; verifica que el volumen pertenezca a la obra y rechaza volúmenes ocultos. El frontend únicamente consume esta RPC; **no** realiza actualizaciones parciales desde el navegador.

Los capítulos previamente publicados conservan su estado interno. La lectura pública sigue restringida por RLS mientras `series.published=false` o el volumen no esté publicado. Las fechas históricas de los volúmenes publicados se conservan; las programaciones de capítulos sin `volume_id` se cancelan para evitar que el cron heredado vuelva a publicar la novela por accidente. Los capítulos programados con volumen asignado mantienen su calendario.

## Validaciones exigidas antes de desplegar
1. Ejecutar `npm run series-publication-check` y `npm run prelaunch-check` en la rama de trabajo; ejecutar `npm run build` con variables de entorno **de pruebas**.
2. Aplicar la migración **solo en Supabase aislado**, nunca directamente en producción. Verificar los permisos `publish` y `schedule`, RLS y errores con rollback.
3. Probar regresión en novelas publicadas y privadas, con múltiples volúmenes, capítulos huérfanos, revisiones pendientes, recordatorios, calendario y avisos.
4. Comprobar como lector anónimo que el borrador no expone capítulos y el preestreno solo expone la ficha y cuenta regresiva.
5. Probar que al publicar en la fecha elegida se libera únicamente el volumen seleccionado y se mantienen intactas estadísticas, lecturas e historial.
6. Revisar los logs del runner, notificaciones y disparadores existentes; comprobar que no se generan avisos duplicados no deseados.

**Estado:** cambios propuestos en rama de desarrollo. La migración está versionada pero no se ha ejecutado; no fusionar/desplegar sin validación real de BD.

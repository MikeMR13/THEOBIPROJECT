# Protección de metadatos de descargas de obras y volúmenes

## Análisis de código real

Las funciones `public.series_downloads` y `public.series_downloads_v2` devuelven la ficha de enlaces externos (`fmt`, `provider`, `label`, `vol`, candados) y solamente comprueban que la serie no esté archivada. No exigen `series.published` ni el estado/fecha de publicación de su volumen. Ambas son RPC públicas `SECURITY DEFINER`.

La función que entrega URL `public.download_open` **sí** comprueba, para no editores, que la serie esté publicada, que el volumen esté publicado, no eliminado y con fecha cumplida, además de comprobar permisos de Patreon. Por tanto el hallazgo es **exposición de metadatos**, no omisión confirmada de candados de descarga.

La consulta de conteo de producción encontró 10 enlaces y **ninguno** en obras inéditas, volúmenes sin publicar, borrados o con fecha futura. **No se confirmó fuga actual**; sí discrepancia lógica ante futuros borradores.

## Cambio propuesto

Las dos RPC conservan la condición `s.archived_at is null`; además, ofrecen resultados al lector solo si:
- `s.published` es verdadero,
- el volumen enlazado existe, está `published`, no fue eliminado y su fecha `published_at` no es futura.

Para administradores/editoriales autorizados `private.in_team(s.team_id)`, se conservan los metadatos de borradores y futuros; obras archivadas siguen ocultas tal como antes. Se mantiene soporte `d.volume_id` o coincidencia de `d.vol` cuando falta el identificador y no se altera ningún candado/URL de `download_open`.

## Prueba sin costos

La definición real de ambas funciones se copia a un PostgreSQL 16 efímero de GitHub Actions. Con identidades y volúmenes ficticios se valida que visitantes y lectores solo ven enlaces publicables, los editores continúan viendo borradores, obras archivadas permanecen ocultas y el rollback restaura exactamente la conducta original.

Este PR **no modifica Supabase ni activa servicios nuevos o de pago**. Es SQL candidato con rollback: requiere migración versionada y QA de la ficha pública antes de aplicar sobre producción.

[Supabase: asegurar Data API](https://supabase.com/docs/guides/api/securing-your-api).

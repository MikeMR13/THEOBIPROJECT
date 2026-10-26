# QA — invalidación por fila para la caché de Inicio

## Hallazgo reproducido en Supabase (solo lectura)

- `private.home_snapshot.built_at` estaba en `-infinity` incluso después de ejecuciones exitosas de `obi-home-snapshot` (cada cinco minutos).
- El JSON almacenado reflejaba la construcción de las 05:15 UTC, pero a las 05:16 UTC el campo `built_at` estaba invalidado.
- `private.run_publications()`, programada cada minuto, emite un `UPDATE public.volumes` y un `UPDATE public.chapters` aunque no existan estrenos vencidos.
- Los triggers `chapters_home_stale`, `series_home_stale` y `volumes_home_stale` eran `FOR EACH STATEMENT`. En PostgreSQL se ejecutan incluso cuando la sentencia afecta cero filas.
- `public.home_feed()` reutiliza el snapshot solo si `built_at > now() - interval '15 minutes'`, y de lo contrario construye los datos de nuevo mediante `private.build_home()`.

**Causa:** el proceso editorial puede invalidar continuamente una caché que el cron acaba de regenerar, aunque no cambie ningún capítulo o volumen.

## Solución propuesta

`sql/home-snapshot-row-level-invalidation.sql` sustituye exclusivamente los tres triggers por `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW`.

El SQL incluye una precondición que rechaza aplicar el cambio si los triggers existentes ya no coinciden con el esquema esperado. No modifica `home_feed`, `refresh_home`, `home_stale`, `build_home`, RLS ni los trabajos programados. Si hay una actualización real, una inserción o una eliminación, el snapshot debe seguir invalidándose inmediatamente.

El archivo **no es todavía una migración desplegada**. En ausencia de Supabase CLI en el entorno de preparación, hay que generar la migración oficial con `supabase migration new` y copiar el contenido revisado antes de su aplicación.

## Puerta de QA — obligatoria en base aislada

1. Generar migración desde la CLI, revisar el diff, aplicar a Supabase de pruebas con copia del esquema; nunca experimentar directamente sobre producción.
2. Comprobar los tres triggers mediante:
   ```sql
   select ns.nspname, rel.relname, tr.tgname, pg_get_triggerdef(tr.oid)
   from pg_trigger tr
   join pg_class rel on rel.oid = tr.tgrelid
   join pg_namespace ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public'
     and tr.tgname in ('chapters_home_stale','series_home_stale','volumes_home_stale')
   order by rel.relname;
   ```
3. Verificar dentro de **una transacción aislada de QA**, revertida al final, que una sentencia sin filas ya no invalida el snapshot:
   ```sql
   begin;
   select private.refresh_home();
   do $qa$
   declare before_at timestamptz; after_at timestamptz;
   begin
     select built_at into before_at from private.home_snapshot where id = 1;
     update public.volumes set status = status where false;
     update public.chapters set status = status where false;
     update public.series set published = published where false;
     select built_at into after_at from private.home_snapshot where id = 1;
     if before_at is distinct from after_at then
       raise exception 'FAIL: se invalidó Inicio después de UPDATE sin filas';
     end if;
   end $qa$;
   rollback;
   ```
4. Con un **registro de prueba controlado**, comprobar que INSERT/UPDATE/DELETE reales invalidan el snapshot. Ejecutar cada escenario en transacción y revertir. Comprobar que las publicaciones programadas continúan funcionando y que los lectores no ven borradores o contenido restringido.
5. En ambiente de pruebas, ejecutar varios ciclos del runner y el cron: tras un `UPDATE` sin filas, `built_at` debe conservar su marca reciente. Confirmar la lectura de Inicio y medir `home_feed()` antes/después mediante consultas equivalentes, sin confundir tiempo SQL con LCP.
6. Ejecutar `npm run home-snapshot-invalidation-check` y CI completo. Revisar locks y picos con cargas editoriales de varios capítulos.

## Criterios de salida

- Cero regresiones en publicación inmediata y programada, cambios editoriales y RLS.
- Cero invalidaciones por sentencias que afectan cero filas.
- La invalidación de cambios reales sigue funcionando.
- La instantánea sobrevive entre ejecuciones del cron en ausencia de cambios.
- Autorización explícita para desplegar tras QA con usuarios y datos de prueba.

## Reversión

`sql/home-snapshot-row-level-rollback.sql` restaura los tres triggers originales por sentencia. Como medida provisional de seguridad, se puede revertir el cambio sin tocar ninguna función ni borrar datos. Registrar el motivo, validar el estado del cron y revisar `built_at`.

**Estado:** preparado para revisión; no ejecutado contra la base productiva.

# The Obi Project — Optimización de carga, Fase 2

**Estado:** cambios implementados en rama de GitHub; sin fusionar, sin despliegue a producción.
**Rama:** `optimization/native-js-db-phase2-20261020`.
**Base:** `optimization/native-js-loading-phase1-20261019` (PR #2, CI aprobado).
**Código conservado:** PostgreSQL SQL + HTML/CSS + JavaScript nativo, sin frameworks ni dependencias nuevas.

## 1. Comprobación que habilita la fase

- El PR #2 permanecía abierto en borrador, sin fusionar.
- GitHub Actions de fase 1 `#39377162405` concluyó `SUCCESS` en el commit `57d6b7864abd28e7deda3d44b1c2a308de9aee4f`.
- La Fase 2 no sustituye ni modifica las correcciones del PR #1 de estabilización.

## 2. Registro de cambios

| Archivo | Cambio | Motivo / cautela |
|---|---|---|
| `docs/SQL-FASE2-HOME-SNAPSHOT.sql` | SQL para redefinir `series_home_stale` con `UPDATE OF` para todas las columnas actuales excepto `views`, manteniendo INSERT y DELETE | Evitar que cada visita registrada por `public.track_view()` invalide `private.home_snapshot`. **Todavía no ejecutado** en Supabase |
| `docs/DIAGNOSTICO-SQL-FASE2.sql` | Diagnósticos SQL de solo lectura para instantánea, cron, triggers, planes e índices | Facilitar comparación y validación siguiente |
| `src/ui.js` | Reutilización durante 20 s de la consulta a `public.series_last`, separada por ID de usuario/visitante; mantiene la alternativa `chapters` si falla la vista | Evita una petición repetida en navegaciones rápidas del catálogo sin almacenar capítulos ni omitir RLS |
| `scripts/db-phase2-check.mjs` | Contratos estáticos para columnas, cacheo, RLS y respaldo | Detectar regresiones sin cambiar el stack |
| `package.json` y `.github/workflows/ci.yml` | Nuevo comando `npm run db-phase2-check` que CI ejecuta después de las pruebas de Fase 1 | Validación automática adicional sin paquetes |

## 3. Causa de invalidaciones excesivas

La auditoría de la base de datos activa confirmó que:

1. `public.track_view()` registra lecturas y ejecuta `update public.series set views = views+1`.
2. El trigger `series_home_stale` estaba definido como `AFTER INSERT OR DELETE OR UPDATE` para **toda** actualización de `series`.
3. Su función `private.home_stale()` establece `built_at = '-infinity'`.
4. `home_feed()` considera caducado ese snapshot y recalcula `private.build_home()`.
5. `obi-home-snapshot` se ejecuta cada cinco minutos y sí consigue reconstruir la instantánea; entre ejecuciones se invalida por actualizaciones.

La corrección SQL evita invalidaciones por una modificación de `views` solamente. El contador de vistas puede estar desfasado hasta el próximo cron (5 minutos), una compensación intencionada frente a consultas más rápidas y menos recalculadas. **Cualquier modificación editorial de una columna actual sigue invalidando el snapshot**, incluidos acceso, publicación, metadatos y portada. Cuando se agreguen campos nuevos a `series`, mantener la lista del trigger.

### Limitación de migraciones

El historial de migraciones en Supabase difiere del repositorio (documentado en PR #1). Por ello el SQL queda fuera de `supabase/migrations` y **no es una migración aplicada**. Se intentó comprobar Supabase CLI en este entorno, pero no estuvo disponible; antes de aplicarlo debe crearse la migración mediante `supabase migration new` y reconciliar el orden remoto. No se creó una rama de Supabase porque puede generar costos adicionales.

## 4. Análisis de `series_last`

La vista ya existe con `security_invoker=true` y devuelve `series_id,num,publish_at` para capítulos publicados; los índices `chapters_series_publish_idx` y `chapters_series_id_status_publish_at_idx` ya existen y registran uso.

Plan de referencia de la conexión administrativa (PostgreSQL):
- 4 filas en `series_last`, sobre 150 capítulos totales.
- `EXPLAIN (ANALYZE, BUFFERS)` reportó **~7.8 ms de ejecución SQL** y ~9.4 ms de planificación.
- Una muestra histórica de PostgREST tenía ~489 llamadas y ~135 ms por ejecución promedio: **no es una comparación controlada** entre mismo rol/sesión, ni equivale al LCP.
- La vista debe continuar respetando las políticas de lectura de `chapters` (capítulos ocultos/restringidos); no se sustituyó con una función `SECURITY DEFINER` de acceso amplio.

**Decisión de esta fase:** no crear más índices ni eliminar políticas RLS sin evidencias. Se reduce el número de llamadas repetidas en el frontend, reutilizando la respuesta un máximo de 20 s por usuario y conservando el respaldo. Validar especialmente cambios de cuenta y publicaciones recientes.

## 5. Verificaciones automatizadas y manuales

```sh
npm install --no-audit --no-fund
npm run check
npm run build
npm run optimize-check
npm run db-phase2-check
```

Las pruebas estáticas no reemplazan las de integración. En staging (sin utilizar cuentas productivas) comprobar:
1. Aislamiento por sesión: cambiar usuario antes de volver al catálogo y confirmar que el resultado no se comparte.
2. Una lectura que actualice `series.views` debe **conservar** `built_at` si solo se modificó `views`; tras el siguiente cron, el contador debe actualizarse.
3. Editar título, estado, género, portada o condición de acceso debe invalidar el snapshot; `home_feed()` debe actualizar su contenido.
4. Publicar y retirar obras/capítulos debe continuar invalidándolo por sus triggers; verificar cambios de lectura restringida.
5. Comparar tiempos y número de llamadas a `series_last` al abrir Catálogo repetidamente, tanto con visitante anónimo como autenticado.
6. Probar tema visual, inicio y catálogo, portada de volumen, EPUB/fuentes, modos de lector y acceso Patreon.

## 6. Resultado de GitHub Actions

- [CI #39427889605](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39427889605): **SUCCESS**, commit inicial de la fase 2 `9e6f31d53eb500ccb9b12c668c47e413b270e5a9`.
- Ejecuta sintaxis JS (`npm run check`), compilación (`npm run build`), contratos de Fase 1 (`npm run optimize-check`) y contratos SQL/catálogo de Fase 2 (`npm run db-phase2-check`).
- Confirmado que `PR #3` está abierto en borrador y dirigido a la rama de Fase 1. **No** se ha fusionado.
- Estas verificaciones **no** prueban un trigger aplicado en PostgreSQL ni disponibilidad de una base aislada; las pruebas SQL funcionales quedan pendientes.

## 7. Integración y despliegue

- Mantener este PR en borrador y **separado del PR #1 y del PR #2**; apuntarlo a la rama Fase 1 para revisar solo los cambios propios de esta fase.
- CI debe aprobar el commit final. No se ha medido un nuevo Lighthouse; no atribuir una mejora medida de LCP hasta ejecutarlo.
- No aplicar el SQL al proyecto real hasta validar una migración y poder revertirla. Hacer respaldo del esquema.
- No fusionar a main ni publicar a producción por este trabajo.
- La integración de PR #1 (stabilization) y PR #2/3 debe resolver primero sus posibles conflictos en `scripts/build.mjs`, `package.json` y CI.

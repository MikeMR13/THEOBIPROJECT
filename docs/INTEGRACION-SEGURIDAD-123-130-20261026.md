# Integración de seguridad y privacidad — paquete de validación sin costos

## Objetivo
Esta rama propone consolidar *para pruebas* el código preparado en siete PR independientes (#123, #125–#130). Las pruebas utilizan exclusivamente CI estándar de un repositorio público y PostgreSQL efímero. **No modifica Supabase, ni Vercel de producción, ni despliega SQL, ni añade servicios facturables.**

## Inventario y dependencias

| PR original | Alcance | Verificación |
|---|---|---|
| #123 | Invalidación del snapshot de Inicio solo cuando cambia alguna fila | Trigger real y rollback en PostgreSQL |
| #125 | Contrato fail-closed en código fuente de `notify-email` | Test JS, sin correos |
| #126 | Quitar EXECUTE público a 10 rutinas administrativas de `pg_cron` | Privilegios y rollback, cron simulado |
| #127 | Restringir RPC internas `report_review`, `series_feedback`, `patreon_campaign_info` | 3 ACL sin romper `home_feed` |
| #128 | Ocultar nombre de autor de reseñas anónimas en `private.build_home` | JSON de Inicio y rollback |
| #129 | Respetar visibilidad individual de miembros de equipos | `all/auth/none`, borrado, Auth anónimo |
| #130 | Ocultar metadatos de volúmenes/obras no publicados | Lectores vs. editores, fecha, borrados |

**Conflicto único detectado:** los PR #123 y #125 modificaron `package.json`; la rama integrada conserva ambos scripts en `npm run verify` y suma un test de consistencia. Las demás rutas de archivos son distintas.

Las modificaciones SQL efectivas actúan sobre objetos distintos: triggers sobre `series/chapters/volumes`, permisos de funciones administrativas privadas, permisos de tres RPC públicas, función `build_home()`, `team_public_members()` y dos `series_downloads*`. No hay sustitución de la definición de una misma función en dos parches.

## Secuencia propuesta para una posible liberación futura

1. **Privacidad primero:** incorporar y validar el cambio de `private.build_home()` (#128).
2. **Caché después:** ajustar los triggers (#123). Cuando ambas piezas estén aplicadas, invalidar y **regenerar de forma controlada** el snapshot para asegurar que no se sirve JSON con nombres almacenados antes del parche. Confirmar `built_at` finito y respuesta real de `home_feed()`.
3. **Privilegios:** aplicar #126 y #127 comprobando integraciones legítimas, autenticación real, RLS y que todos los trabajos existentes del cron conservan permisos y continuidad.
4. **Exposición editorial:** evaluar #129 y #130 con cuentas reales y roles de editores, comprobando que no se rompen perfiles públicos, Studio ni descargas autorizadas.
5. **Correo:** #125 **solo prepara prueba de regresión del repositorio**. Falta coordinación para actualizar la Edge Function existente y rotar el secreto de `obi-email` (issue #124). No simular envíos sobre lectores reales.
6. Convertir los archivos SQL candidatos en migraciones versionadas oficiales mediante Supabase CLI en entorno controlado, sin crear una rama Supabase facturable.
7. **No fusionar ni desplegar** este paquete hasta cumplir los pasos anteriores y revisión explícita del cambio productivo.

## Cobertura y límites del CI

Cada workflow de PostgreSQL crea su propia base temporal dentro de un runner separado. La aprobación de todos ellos y de `npm run verify` comprueba que los candidatos y sus revertidores siguen presentes y que el frontend compila. **No equivale a una prueba de integración de todas las funciones reales contra una base con datos, políticas RLS y cron de producción**. La evaluación de cualquier despliegue requiere esa verificación adicional.

### Seguridad del costo
- Sin servicios nuevos ni bases de datos Supabase paralelas.
- Sin cambios a Vercel producción, secretos, correo, Auth, servicios de pago, cron o tablas reales.
- Runners estándar y contenedores PostgreSQL efímeros; no activar runners de mayor tarifa ni extensiones de terceros.
- El PR agregado es un candidato separado: los siete PR originales no se fusionan automáticamente.

**Fecha de revisión:** 26 de octubre de 2026.

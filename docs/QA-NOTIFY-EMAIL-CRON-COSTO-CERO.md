# Seguridad del correo programado — sin servicios ni gasto adicional

## Hallazgo contrastado (lectura, 26-oct-2026)

El archivo versionado `supabase/functions/notify-email/index.ts` exige `CRON_SECRET` incluso cuando falta la variable de entorno (guardia **fail-closed**).

La Edge Function `notify-email` que está desplegada actualmente es una versión diferente: su guardia solo exige el token **si la variable existe**. Esto no demuestra que falte `CRON_SECRET` en producción, pero dejaría la función abierta si estuviera ausente.

El cron de correo `obi-email` contiene una credencial literalmente en su definición SQL. **No copiar esa credencial a GitHub, pruebas, logs ni documentación.**

## Mitigación gratuita preparada

- `npm run notify-email-cron-guard-check` valida el archivo de la Edge Function en el repositorio.
- La comprobación se incorpora a `npm run verify` y no ejecuta ningún envío, llamada HTTP, migración ni operación sobre Supabase.
- La solución de producción consiste en actualizar **la función ya existente**, sin crear otra, tras verificar sus variables y el comportamiento con credenciales de prueba.
- Para retirar el secreto de `pg_cron`, aprovechar el **Supabase Vault ya habilitado**. No crear servicios ni ramas de Supabase.

## Comprobaciones necesarias antes de desplegar

1. Revisar si `CRON_SECRET` existe en la configuración productiva de `notify-email`; no mostrar ni registrar el valor.
2. Comparar todo el código desplegado con GitHub. La versión publicada también difiere en valores predeterminados de remitente/dominio; conservar el comportamiento esperado al aplicar la guardia.
3. Validar que la petición sin encabezado o con encabezado erróneo devuelve 401. Hacer una prueba autorizada en un contexto controlado para no enviar correos accidentales.
4. Preparar rotación coordinada del secreto entre la función y el cron; usar Vault para el valor almacenado en Postgres.
5. Medir si `obi-email` sigue ejecutándose y si la función responde sin duplicar entregas; revisar registro de errores sin imprimir secretos.

## Restricciones

**Prohibido** crear proyectos/ramas de pago, activar módulos comerciales, contratar planes, habilitar nuevas automatizaciones de correo o añadir envíos de prueba hacia lectores reales.

**Estado:** test de regresión en GitHub. No se ha desplegado ningún cambio ni se han rotado secretos.

Relacionado: [Issue #124](https://github.com/MikeMR13/THEOBIPROJECT/issues/124).

# Conciliación de migraciones (20 de octubre de 2026)

Comparación exclusivamente por nombre y versión: **32 registros remotos**, **26 archivos SQL locales**, **11 coincidencias de nombre**, **15 archivos locales sin nombre remoto equivalente** y **21 registros remotos sin archivo homónimo**.

Coincidir nominalmente NO demuestra equivalencia del SQL ni que una migración local haya sido aplicada. No ejecutar db push, no renombrar y no marcar migraciones como aplicadas antes de cotejar el contenido original de las migraciones, el esquema activo, los datos y un plan de reversión.

El cron obi-email tiene una cabecera x-cron-secret con valor no vacío de **19 caracteres**, validada sin revelar el contenido. Esto NO prueba que Deno tenga configurado CRON_SECRET o que ambos valores coincidan. Hasta verificar esa dependencia, no reemplazar la versión activa de notify-email.

Cloudflare solo muestra en la cuenta conectada los scripts cronica y ddcronicaproject, no obi-notify. El archivo workers/notify/wrangler.toml aún contiene un identificador de KV de marcador de posición, por lo que desplegarlo sin identificar cuenta y namespace reales es inseguro.

Estas comprobaciones son de solo lectura. No se modificaron Supabase, Cloudflare ni Vercel.

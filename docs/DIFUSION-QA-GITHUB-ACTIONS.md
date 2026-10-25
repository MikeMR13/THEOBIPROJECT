# Difusión — QA aislado en GitHub Actions

Esta prueba utiliza PostgreSQL 17 temporal en GitHub Actions. No crea ramas alojadas en Supabase, no accede al proyecto productivo y no requiere credenciales reales.

## Alcance

- Se crean roles Auth, dos equipos y usuarios ficticios con el contrato mínimo de permisos existente.
- Se aplica **la migración original** `supabase/migrations/20261025232409_diffusion_phase1_controlled_20261025.sql`.
- Se ejecutan aserciones de RLS, privilegios, RPC de borradores y reglas, overrides, aislamiento entre equipos y ámbito institucional.
- Se comprueba que todos los envíos siguen desactivados; no hay cron, conexiones externas ni tokens.
- Se ejecuta automáticamente en la PR y admite ejecución manual desde GitHub Actions.

## Límite importante

Este entorno reproduce **el esquema mínimo necesario**, no todo el historial de migraciones de Supabase ni Auth HTTP/PostgREST. Una futura etapa debe validar la pila completa con Supabase CLI local y pruebas de los conectores. Este CI no demuestra publicación social real.

## Regla editorial

Cada equipo traductor gestiona sus redes sin autorización del Bibliotecario. Las aprobaciones opcionales serán internas; las cuentas institucionales de El Obi sí pertenecen al Bibliotecario.

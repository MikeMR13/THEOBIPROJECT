# Difusión híbrida — Fase 1 y activación de backend

**Estado (25 de octubre de 2026):** SQL de Fase 1 y Discord manual instalado en Supabase de producción, con pruebas locales de Vault real satisfactorias. La interfaz de Estudio/Bibliotecario sigue en la rama de la **PR #116 en borrador**, no fusionada en `main` ni desplegada a Vercel de producción.

## Decisión editorial

Los equipos traductores gestionan sus **propias** redes de manera autónoma y sin aprobación del Bibliotecario. Las revisiones opcionales son internas. El Bibliotecario administra solo redes oficiales de El Obi.

## Alcance operativo actual

- Backend con permisos por rol (ver, redactar, programar, publicar, gestionar, logs), RLS y RPC.
- Reglas inicialmente desactivadas, borradores, eventos y estructura de cola **sin despachador activo**.
- Integración Discord manual: secretos en Supabase Vault, formulario de conexión en el código de la rama, prueba explícita y desconexión.
- Ninguna conexión social, regla activa ni trabajo de envío registrada en el momento de instalar las migraciones.
- El sistema **no** publica automáticamente capítulos ni volúmenes, ni envía a Telegram/Meta.
- No modifica el flujo de publicación editorial, Patreon ni lectores existentes.

## Migraciones instaladas

- `supabase/migrations/20261025232409_diffusion_phase1_controlled_20261025.sql`
- `supabase/migrations/20261025232432_diffusion_discord_manual_controlled_20261025.sql`

Los nombres de archivo reflejan las versiones registradas en el historial de producción, para evitar duplicación cuando se fusione el código.

## Próximas iteraciones

1. Vista previa y validación de la UI sin fusionar inmediatamente a `main`.
2. Primera conexión y mensaje de prueba de Discord iniciados por el responsable del canal.
3. Integración HTTP autenticada completa y cobertura de QA adicional.
4. Telegram y webhooks firmados con permisos equivalentes.
5. Cola idempotente, programación, eventos post-commit y controles de acceso público de capítulos.
6. Integraciones sociales posteriores y despliegue por fases.

## Seguridad

Las funciones `SECURITY DEFINER` comprueban permisos internos y restringen `EXECUTE`; la tabla privada de referencias Vault tiene RLS sin políticas de acceso por usuario. No existe aprobación del Bibliotecario para redes de equipos. Antes de habilitar un despachador futuro, revisar nuevamente las políticas, idempotencia y visibilidad editorial.

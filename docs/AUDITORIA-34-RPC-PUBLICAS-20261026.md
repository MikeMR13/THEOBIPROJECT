# Auditoría de 34 RPC públicas SECURITY DEFINER — 26-oct-2026

## Alcance y evidencia

Se revisaron **34 funciones de `public`** en la base actual cuya definición es `SECURITY DEFINER` y cuyo permiso `EXECUTE` está concedido a `anon`. El aviso del asesor Supabase identifica una **superficie de revisión**, no 34 vulnerabilidades demostradas.

**No se modificó Supabase**, ni se activó ningún servicio de pago. La clasificación se basa en las definiciones reales inspeccionadas en lectura y sus reglas de permiso. El comportamiento completo con identidades reales, RLS y URLs de frontend aún requiere QA.

### Acceso solo con sesión/permisos (ajuste de GRANT preparado) — 3

- `public.patreon_campaign_info`
- `public.report_review`
- `public.series_feedback`

### Inicio, calendario, promoción y rankings (legítima lectura pública; revisar datos que devuelven) — 13

- `public.agenda_events`
- `public.home_feed`
- `public.home_reviews`
- `public.lock_info`
- `public.platform_patron`
- `public.platform_patrons_wall`
- `public.prelaunch_calendar`
- `public.prelaunch_series`
- `public.public_prelaunch_social`
- `public.ranking_list`
- `public.release_locks`
- `public.release_unlocks`
- `public.team_anniversaries`

### Perfiles, identidad y equipos (revisar visibilidad, borrado y tokens) — 9

- `public.comment_public_authors`
- `public.reader_public`
- `public.reader_stats`
- `public.search_readers`
- `public.team_design_preview`
- `public.team_followers`
- `public.team_public_members`
- `public.team_public_collaboration_series`
- `public.username_resolve`

### Biblioteca, opiniones, descargas y métricas (revisar filtros y privacidad) — 9

- `public.download_open`
- `public.purchase_open`
- `public.series_downloads`
- `public.series_downloads_v2`
- `public.series_public_credits`
- `public.series_rating`
- `public.series_reviews_list`
- `public.series_toc`
- `public.track_view`


## Hallazgos priorizados

### A. Tres funciones con autorización interna, pero grants anónimos innecesarios

- `report_review`: comienza exigiendo `auth.uid()`; anónimos no pueden completar la acción.
- `series_feedback`: `private.team_can(..., 'view')` exige que el usuario pertenezca al equipo o sea bibliotecario.
- `patreon_campaign_info`: `private.is_admin()` o `private.team_can(..., 'profile')` validan pertenencia/administración; anonimato no permite consultar los datos privados.

Los tres tenían explícitamente `PUBLIC:EXECUTE`, `anon:EXECUTE`, `authenticated:EXECUTE` y `service_role:EXECUTE` y pertenecen a `postgres`. Se propone revocar solo las dos primeras concesiones; mantener exactamente las capacidades de `authenticated`, `service_role` y el propietario. La lógica y las firmas no se alteran.

**Candidato:** `sql/public-rpc-auth-grants-20261026.sql`. Rollback: `sql/public-rpc-auth-grants-rollback.sql`. Prueba en PostgreSQL aislado sin costo: `.github/workflows/public-rpc-grants-qa.yml`.

### B. Privacidad de reseñas de Inicio — requiere PR independiente

- `public.series_reviews_list` **sí respeta** el campo `r.anonymous` al ocultar usuario y avatar ajenos.
- `public.home_reviews` devuelve `p.username` sin aplicar `r.anonymous`.
- `private.build_home` arma la colección `reviews` que consume `public.home_feed`, también sin condicionar `p.username` por `r.anonymous`.

Esto permite en principio que la portada revele el nombre del autor de una reseña marcada anónima. Durante la inspección había **cero reseñas**, por lo que es un riesgo lógico **no una exposición observada**. Se debe corregir en un cambio separado y comprobar que futuras reseñas anónimas siguen sin identificadores públicos.

### C. Revisiones específicas aún no cerradas

- `team_public_members`: obedece `t.settings.show_members` pero devuelve usernames sin consultar opciones de visibilidad o solicitud de borrado de perfil. Es necesario confirmar semántica de la afiliación pública antes de cambiarla.
- `series_downloads`/`series_downloads_v2`: devuelven metadatos de enlaces de obras no archivadas sin comprobar `s.published`. `download_open` aplica controles al abrir el enlace; revisar si los metadatos de borradores deben ocultarse. No se encontraron enlaces asociados a series inéditas al inspeccionar el inventario.
- `team_design_preview`: tiene un token UUID de acceso a borradores; **no** revocar acceso anónimo sin validar los enlaces de previsualización compartidos.
- `track_view` y `purchase_open`: escriben métricas para visitantes; acceso anónimo intencional pero conviene revisar el límite de volumen y los controles antiabuso.
- `public.home_feed`, `reader_public` y otras rutas de lectura permanecen accesibles intencionalmente para no romper la web pública.
- `platform_patron` consulta el estado de membresía a partir de un username y debe validarse contra las preferencias de visibilidad antes de proponer restricciones.

## Puerta de liberación

1. Validación SQL aislada de cambios de `EXECUTE`, incluidos `anon`, `authenticated`, `service_role`, `home_feed` y rollback.
2. CI general del repositorio y revisión de integraciones legítimas.
3. Generar migración oficial con Supabase CLI (sin ramas Supabase facturables) y aplicar solo cuando exista validación y autorización; no aplicar el SQL candidato directamente a producción.
4. No transformar las 34 RPC en `SECURITY INVOKER` de manera indiscriminada: algunas dependen de controles internos, RLS y datos saneados.

Guía actual de Supabase: https://supabase.com/docs/guides/api/securing-your-api

**Estado:** revisión de 34 definiciones y candidato para 3 GRANT; pendiente revisión de privacidad de Inicio y más QA para las demás.

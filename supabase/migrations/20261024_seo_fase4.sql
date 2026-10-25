-- Fase 4 · metadatos públicos configurables por Bibliotecario
-- SOLO para ejecutar en Supabase QA aislado antes de aplicar al entorno de producción.
-- Se reutilizan las políticas RLS existentes de platform_settings: lectura pública
-- y UPDATE exclusivo de private.is_admin() (Bibliotecario).
alter table public.platform_settings
  add column if not exists seo jsonb not null default '{}'::jsonb;

alter table public.platform_settings
  drop constraint if exists platform_settings_seo_safe;
alter table public.platform_settings
  add constraint platform_settings_seo_safe check (
    jsonb_typeof(seo) = 'object'
    and pg_column_size(seo) < 2048
    and (seo->'title' is null or
      (jsonb_typeof(seo->'title') = 'string' and length(seo->>'title') <= 70))
    and (seo->'description' is null or
      (jsonb_typeof(seo->'description') = 'string' and length(seo->>'description') <= 170))
    and (seo->'socialTitle' is null or
      (jsonb_typeof(seo->'socialTitle') = 'string' and length(seo->>'socialTitle') <= 90))
    and (seo->'socialDescription' is null or
      (jsonb_typeof(seo->'socialDescription') = 'string' and length(seo->>'socialDescription') <= 200))
  );
comment on column public.platform_settings.seo is
  'Metadatos públicos de Inicio, editables por Bibliotecario. No se permiten URLs ni HTML arbitrario.';

-- Lector · ideas de Wattpad / BOOK☆WALKER / Kindle (rama feat/lector-ideas-wattpad-bookwalker)
-- Solo agrega columnas opcionales y una función de lectura: no borra ni cambia datos existentes.
-- Ejecutar en Supabase › SQL Editor ANTES de publicar el lector nuevo (el lector funciona igual sin ella:
-- el glosario muestra todo y la galería usa solo las ilustraciones de los capítulos abiertos).

-- 1. Glosario sin spoilers (estilo X-Ray de Kindle)
--    updated_at faltaba en producción: el Estudio ya la usa al editar un término (hoy esa edición falla).
--    since_num: capítulo (num) desde el que el término se marca en el texto; null = desde el inicio.
--    updates:   datos que se revelan después, [{ "from": 5, "text": "Hizo una promesa a Aiko." }, …]
alter table public.glossary_terms add column if not exists since_num numeric;
alter table public.glossary_terms add column if not exists updates jsonb not null default '[]'::jsonb;
alter table public.glossary_terms add column if not exists updated_at timestamptz not null default now();
alter table public.glossary_terms drop constraint if exists glossary_terms_updates_check;
alter table public.glossary_terms add constraint glossary_terms_updates_check
  check (jsonb_typeof(updates) = 'array' and jsonb_array_length(updates) <= 30 and octet_length(updates::text) <= 8000);

-- 2. Galería de ilustraciones del volumen (estilo BOOK☆WALKER)
--    security invoker: respeta el RLS de chapters (solo capítulos que el lector puede leer).
--    Devuelve solo las rutas de imagen, no el texto: así el visor no descarga capítulos completos.
create or replace function public.volume_images(p_volume uuid)
returns table(chapter_num int, block int, url text, alt text, caption text)
language sql stable security invoker set search_path = public as $$
  select c.num, (e.idx - 1)::int,
         coalesce(e.b->>'url', e.b->>'src'),
         coalesce(e.b->>'alt', ''),
         coalesce(e.b->>'caption', '')
  from public.chapters c
  cross join lateral jsonb_array_elements(case when jsonb_typeof(c.body) = 'array' then c.body else '[]'::jsonb end) with ordinality as e(b, idx)
  where c.volume_id = p_volume
    and c.deleted_at is null
    and coalesce(e.b->>'type', e.b->>'t') in ('image', 'img')
    and coalesce(e.b->>'url', e.b->>'src') is not null
  order by c.num, e.idx
  limit 300
$$;
revoke all on function public.volume_images(uuid) from public;
grant execute on function public.volume_images(uuid) to anon, authenticated;

-- Nota: comentarios por párrafo (comments.para) y reacciones de fin de capítulo (reactions) ya existen; no requieren cambios.

-- Cada equipo elige por volumen si normaliza solo la presentación del índice público.
-- Los títulos originales y los enlaces /leer/:slug/:num no se alteran.
alter table public.volumes
  add column if not exists format_chapter_titles boolean not null default false;
comment on column public.volumes.format_chapter_titles is
  'Opt-in del traductor al importar: separar prefijos de capítulo en la ficha pública sin modificar chapters.title';

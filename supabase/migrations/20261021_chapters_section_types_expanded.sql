-- Ampliación aditiva de tipos de secciones literarias.
-- No modifica registros existentes, numeración, estados, roles ni notificaciones.
-- Migración necesaria ANTES de desplegar la interfaz que ofrece las nuevas opciones.
begin;

alter table public.chapters
  drop constraint if exists chapters_section_type_check;

alter table public.chapters
  add constraint chapters_section_type_check
  check (section_type = any (array[
    'Capítulo'::text,
    'Prólogo'::text,
    'Interludio'::text,
    'Epílogo'::text,
    'Afterword'::text,
    'Extra'::text,
    'Créditos'::text,
    'Ilustraciones'::text,
    'Episodio corto'::text,
    'Avance'::text
  ]));

commit;

-- ENTREGA 2 — SCRIPT OPTATIVO. NO ejecutarlo automáticamente.
-- Revisión manual de editor del contenido en public.platform_settings.support.
-- Modifica EXCLUSIVAMENTE dos erratas reconocidas en id=1.
-- No modifica links, show, mode, Patreon, SEO, temporadas ni permisos.
begin;

update public.platform_settings
set support = case
  when support ->> 'title' = 'Apoya a la El Obi del Lector'
    then jsonb_set(support, '{title}', to_jsonb('Apoya a El Obi del Lector'::text), true)
  else support
end
where id = 1 and support ->> 'title' = 'Apoya a la El Obi del Lector';

update public.platform_settings
set support = jsonb_set(
  support, '{intro}',
  to_jsonb(replace(support ->> 'intro', 'ptoyecto', 'proyecto')), true
)
where id = 1 and position('ptoyecto' in coalesce(support ->> 'intro', '')) > 0;

commit;

-- Confirmación de solo lectura DESPUÉS de aprobación y aplicación:
-- select support ->> 'title' title, support ->> 'intro' intro,
--        support ->> 'mode' mode, support -> 'links' links
-- from public.platform_settings where id=1;

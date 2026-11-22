-- Calendario: los estrenos recientes desaparecían (verificado el 2026-11-22).
-- agenda_events devuelve UNA FILA POR CAPÍTULO ordenada de la más antigua a la
-- más nueva, y la API de Supabase (PostgREST) corta toda respuesta en 1000 filas.
-- Con 1518 eventos en la ventana del calendario (-30/+60 días) se perdía todo lo
-- posterior al 31-oct 18:32; un volumen en preestreno (que llega por
-- prelaunch_calendar) «se borraba» al publicarse porque pasaba a agenda_events.
-- Solución sin costo: el mismo resultado, empaquetado en un único valor jsonb
-- (una sola fila, por lo que el tope de filas no aplica). Mismos permisos y
-- misma lógica: delega en agenda_events, que sigue siendo la fuente única.
create or replace function public.agenda_events_json(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql stable security definer
set search_path to ''
as $fn$
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(e)
           order by e.at, e.kind, e.chapter_id, e.volume_id), '[]'::jsonb)
  from public.agenda_events(p_from, p_to) e;
$fn$;
revoke execute on function public.agenda_events_json(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.agenda_events_json(timestamptz, timestamptz) to anon, authenticated;

comment on function public.agenda_events_json(timestamptz, timestamptz) is
  'Eventos del calendario en un solo jsonb: evita el tope de 1000 filas de PostgREST.';

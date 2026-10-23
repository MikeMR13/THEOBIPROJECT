-- Estadística agregada de Inicio sin IP, usuario, identificador de sesión ni serie.
-- Datos exclusivamente diarios: categoría, acción y número de eventos.
create table if not exists private.carousel_metrics_daily (
  day date not null,
  category text not null check (category in ('launch','release','popular','historic','editorial','discover','trending','team','prelaunch','other','mobile','desktop')),
  action text not null check (action in ('show','click','read','fast','moderate','slow')),
  total bigint not null default 0 check (total >= 0),
  primary key (day, category, action),
  constraint carousel_metrics_action_scope check (
    (category in ('mobile','desktop') and action in ('fast','moderate','slow'))
    or
    (category not in ('mobile','desktop') and action in ('show','click','read'))
  )
);
alter table private.carousel_metrics_daily enable row level security;
revoke all on table private.carousel_metrics_daily from public, anon, authenticated;

create or replace function public.carousel_metric_record(p_category text, p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  -- Solo contadores estrictamente agregados; ni JSON libre ni IDs de lector/obra.
  if p_category not in ('launch','release','popular','historic','editorial','discover','trending','team','prelaunch','other','mobile','desktop')
     or p_action not in ('show','click','read','fast','moderate','slow')
     or not (
       (p_category in ('mobile','desktop') and p_action in ('fast','moderate','slow')) or
       (p_category not in ('mobile','desktop') and p_action in ('show','click','read'))
     )
  then return false; end if;
  insert into private.carousel_metrics_daily (day, category, action, total)
    values ((now() at time zone 'America/Monterrey')::date, p_category, p_action, 1)
    on conflict (day, category, action) do update
      set total = private.carousel_metrics_daily.total + 1;
  return true;
end
$function$;
revoke all on function public.carousel_metric_record(text,text) from public, anon, authenticated;
grant execute on function public.carousel_metric_record(text,text) to anon, authenticated;

create or replace function public.admin_carousel_metrics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result jsonb;
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'day', m.day, 'category', m.category, 'action', m.action, 'total', m.total
  ) order by m.day desc, m.category, m.action), '[]'::jsonb)
    into result
    from private.carousel_metrics_daily m
    where m.day >= (now() at time zone 'America/Monterrey')::date
                    - greatest(0, least(89, coalesce(p_days,30)-1));
  return result;
end
$function$;
revoke all on function public.admin_carousel_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_carousel_metrics(integer) to authenticated;

comment on table private.carousel_metrics_daily is 'Contadores diarios globales de carrusel y rendimiento; sin IP, ID de usuario, ID de serie, eventos individuales ni cookies.';

-- Protección de métricas anónimas: límites globales sin identidad y conservación de 90 días.
-- No se almacenan usuarios, IP, sesiones, cookies, series, eventos individuales ni huellas.
-- Los límites globales atenúan la contaminación, pero NO autentican humanos ni detienen
-- el abuso del endpoint público a nivel de red; una tasa aceptada sigue siendo falsificable.

create table if not exists private.carousel_metric_limits (
  period text not null check (period in ('minute','day')),
  bucket timestamptz not null,
  accepted integer not null check (accepted between 0 and 15000),
  primary key(period,bucket)
);
alter table private.carousel_metric_limits enable row level security;
revoke all on table private.carousel_metric_limits from public, anon, authenticated;

-- La implementación privilegiada queda en el esquema no expuesto 'private'.
create or replace function private.carousel_metric_record_impl(p_category text,p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_minute timestamptz;
  v_day timestamptz;
  v_admitted integer;
  v_saved bigint;
begin
  if p_category is null or p_action is null
     or length(p_category) > 24 or length(p_action) > 16
     or p_category not in ('launch','release','popular','historic','editorial','discover','trending','team','prelaunch','other','mobile','desktop')
     or p_action not in ('show','click','read','fast','moderate','slow')
     or not (
       (p_category in ('mobile','desktop') and p_action in ('fast','moderate','slow')) or
       (p_category not in ('mobile','desktop') and p_action in ('show','click','read'))
     )
  then return false; end if;

  v_minute := date_trunc('minute', v_now);
  v_day := date_trunc('day', v_now at time zone 'America/Monterrey') at time zone 'America/Monterrey';

  -- Atomicidad bajo concurrencia: PostgreSQL serializa el UPSERT del mismo minuto.
  -- 180 eventos/minuto entre todas las categorías y todos los usuarios.
  insert into private.carousel_metric_limits as lim(period,bucket,accepted)
    values ('minute',v_minute,1)
    on conflict(period,bucket) do update set accepted=lim.accepted+1
      where lim.accepted < 180
    returning accepted into v_admitted;
  if v_admitted is null then return false; end if;

  -- Techo global de 15000 eventos por día de Monterrey.
  v_admitted := null;
  insert into private.carousel_metric_limits as lim(period,bucket,accepted)
    values ('day',v_day,1)
    on conflict(period,bucket) do update set accepted=lim.accepted+1
      where lim.accepted < 15000
    returning accepted into v_admitted;
  if v_admitted is null then return false; end if;

  -- Máximo adicional de 5000 por categoría/acción en un día.
  insert into private.carousel_metrics_daily as m(day,category,action,total)
    values ((v_now at time zone 'America/Monterrey')::date,p_category,p_action,1)
    on conflict(day,category,action) do update set total=m.total+1
      where m.total < 5000
    returning total into v_saved;
  return v_saved is not null;
end
$function$;
revoke all on function private.carousel_metric_record_impl(text,text) from public,anon,authenticated;
grant execute on function private.carousel_metric_record_impl(text,text) to anon,authenticated;

-- Compatibilidad con el cliente: entrada pública sin privilegios de dueño.
-- El cliente no puede acceder al esquema 'private' desde PostgREST.
create or replace function public.carousel_metric_record(p_category text,p_action text)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.carousel_metric_record_impl(p_category,p_action);
$function$;
revoke all on function public.carousel_metric_record(text,text) from public,anon,authenticated;
grant execute on function public.carousel_metric_record(text,text) to anon,authenticated;

-- Retención comprobable: 90 fechas locales inclusivas y 48 h de cuotas.
create or replace function private.prune_carousel_metrics()
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  delete from private.carousel_metrics_daily
   where day < (now() at time zone 'America/Monterrey')::date - 89;
  delete from private.carousel_metric_limits
   where (period='minute' and bucket < clock_timestamp()-interval '48 hours')
      or (period='day' and bucket < clock_timestamp()-interval '48 hours');
end
$function$;
revoke all on function private.prune_carousel_metrics() from public,anon,authenticated;

-- 10:30 UTC: eliminación diaria. La tarea es idempotente por nombre.
select cron.schedule(
  'obi-carousel-metrics-retention',
  '30 10 * * *',
  'select private.prune_carousel_metrics()'
);

comment on table private.carousel_metric_limits is
  'Contadores globales por minuto/día para limitar llamadas públicas. Sin datos personales; borrado en 48 horas.';
comment on table private.carousel_metrics_daily is
  'Totales por día/categoría/acción; sin identificación individual. Retención automática 90 días.';

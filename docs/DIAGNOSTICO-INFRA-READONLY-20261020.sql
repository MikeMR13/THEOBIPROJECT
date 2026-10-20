-- Auditoría de infraestructura SIN ESCRITURAS (2026-10-20).
-- No ejecutar cambios de producción sin validar staging, RLS y reversión.
-- No imprime el comando cron ni el contenido de secretos o respuestas HTTP.

select
  j.jobname,j.schedule,j.active,
  (j.command ilike '%notify-email%') as destino_email,
  (j.command ilike '%x-cron-secret%') as agrega_cabecera_secreta,
  (j.command ilike '%http_post%') as usa_http_post
from cron.job j
where j.jobname in ('obi-email','obi-home-snapshot');

select
  j.jobname,d.status,count(*) as ejecuciones,
  max(d.start_time) as ultima_ejecucion
from cron.job j
join cron.job_run_details d on d.jobid=j.jobid
where d.start_time > now()-interval '24 hours'
  and j.jobname in ('obi-email','obi-home-snapshot','obi_publication_runner')
group by j.jobname,d.status order by j.jobname,d.status;

-- Un cron "succeeded" acredita envío a la cola pg_net, no entrega SMTP.
-- Respuestas de red generales, NO necesariamente de notify-email.
select status_code,count(*) as respuestas,
       count(*) filter(where timed_out) as expiraciones
from net._http_response where created > now()-interval '24 hours'
group by status_code order by count(*) desc;

select built_at::text as generado_en,now()::text as observado_en
from private.home_snapshot where id=1;
select tgname,pg_get_triggerdef(oid) as definicion
from pg_trigger where tgrelid='public.series'::regclass
  and tgname='series_home_stale' and not tgisinternal;

-- Solo nombres de funciones y permisos; NO ejecutarlas.
select p.proname,pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_puede_ejecutar
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
  and has_function_privilege('anon',p.oid,'EXECUTE')
order by p.proname;

-- Comparar versiones de migraciones Supabase CLI y archivos GitHub antes de DDL.

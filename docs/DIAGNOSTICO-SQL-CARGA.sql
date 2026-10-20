-- The Obi Project: diagnósticos de lectura para la fase de optimización.
-- NO modifica tablas, funciones, políticas, índices ni datos.
-- Ejecutar por separado para observar resultados, nunca como migración.
select now() as ahora, built_at, now() - built_at as edad,
       pg_column_size(data) as bytes, jsonb_array_length(data->'series') as obras
from private.home_snapshot where id = 1;

select j.jobname, j.schedule, j.active, j.command
from cron.job j where j.jobname = 'obi-home-snapshot';

select j.status, j.start_time, j.end_time, j.return_message
from cron.job_run_details j
where j.jobid in (select jobid from cron.job where jobname = 'obi-home-snapshot')
order by j.start_time desc limit 10;

select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('private','public') and p.proname in ('home_feed','refresh_home','build_home')
order by p.proname;

-- Hacer EXPLAIN (ANALYZE, BUFFERS) con control de impacto para series_last
-- en un entorno de prueba o intervalo de menor tráfico.

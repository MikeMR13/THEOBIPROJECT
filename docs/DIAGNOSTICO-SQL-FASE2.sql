-- Fase 2 · diagnóstico de solo lectura, compatible con el esquema actual.
-- No contiene CREATE/UPDATE/DELETE ni usa credenciales del navegador.
select now() as checked_at, built_at,
  case when built_at = '-infinity'::timestamptz then null else extract(epoch from now()-built_at) end as age_seconds,
  pg_column_size(data) as snapshot_bytes
from private.home_snapshot where id=1;

select tgname, pg_get_triggerdef(oid) as trigger_sql
from pg_trigger where tgrelid='public.series'::regclass and not tgisinternal
  and tgname='series_home_stale';

select jobname, schedule, active, command from cron.job
where jobname='obi-home-snapshot';

select status, start_time, end_time, return_message from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='obi-home-snapshot')
order by start_time desc limit 10;

-- Ejecutar solo de manera controlada: EXPLAIN ANALYZE ejecuta la SELECT.
explain (analyze, buffers, format json)
select series_id, num, publish_at from public.series_last;

select idx.relname as index_name, st.idx_scan, st.idx_tup_read, st.idx_tup_fetch
from pg_stat_user_indexes st join pg_class idx on idx.oid=st.indexrelid
where st.schemaname='public' and st.relname='chapters'
order by st.idx_scan desc;

select name, setting from pg_settings where name in ('shared_buffers','work_mem');

-- Activar SOLO tras migración Fase 4B, Edge Function publicada, QA verde.
-- Cron cada minuto consulta planes: SIN planes automáticos vencidos, CERO llamadas Edge.
-- Se reutiliza el pg_cron YA EXISTENTE. No guardar secretos estáticos.
do $preflight$
begin
 if to_regprocedure('private.diffusion_4b_tick()') is null
 or to_regprocedure('public.diffusion_4b_claim()') is null
 then raise exception 'Falta migración Difusión 4B'; end if;
 if exists(select 1 from cron.job where jobname='obi-diffusion-4b') then
  raise exception 'obi-diffusion-4b ya existe: no reemplazar a ciegas';
 end if;
end $preflight$;
select cron.schedule('obi-diffusion-4b','* * * * *','select private.diffusion_4b_tick();');

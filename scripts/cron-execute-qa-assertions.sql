\set ON_ERROR_STOP on
do $test$
declare fn text; id oid;
begin
  foreach fn in array array['run_publications', 'refresh_home', 'compute_rankings', 'purge_deleted_accounts', 'purge_old', 'send_reminders', 'notify_due_chapters', 'notify_general_releases', 'notify_anniversaries', 'notify_seasons'] loop
    select p.oid into id from pg_proc p join pg_namespace n on p.pronamespace=n.oid
     where n.nspname='private' and p.proname=fn;
    if id is null then raise exception 'No existe private.%()',fn; end if;
    if has_function_privilege('anon',id,'EXECUTE') or has_function_privilege('authenticated',id,'EXECUTE') then
      raise exception 'La función private.%() sigue abierta a clientes',fn;
    end if;
    if not has_function_privilege('postgres',id,'EXECUTE') then
      raise exception 'Cron perdió acceso a private.%()',fn;
    end if;
  end loop;
  if not has_function_privilege('anon','public.home_feed()'::regprocedure,'EXECUTE') then
    raise exception 'Se perdió el acceso público a home_feed';
  end if;
  if (select count(*) from cron.job where username='postgres')<>10 then
    raise exception 'Se cambió el cron ficticio';
  end if;
end
$test$;
-- Guardia sin ejecutar tareas peligrosas reales (en QA son rutinas vacías).
select public.home_feed();

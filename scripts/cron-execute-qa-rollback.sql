\set ON_ERROR_STOP on
do $test$
declare fn text; id oid;
begin
  foreach fn in array array['run_publications', 'refresh_home', 'compute_rankings', 'purge_deleted_accounts', 'purge_old', 'send_reminders', 'notify_due_chapters', 'notify_general_releases', 'notify_anniversaries', 'notify_seasons'] loop
    select p.oid into id from pg_proc p join pg_namespace n on p.pronamespace=n.oid
     where n.nspname='private' and p.proname=fn;
    if not has_function_privilege('anon',id,'EXECUTE')
        or not has_function_privilege('authenticated',id,'EXECUTE') then
      raise exception 'Rollback no restauró permiso original para private.%()',fn;
    end if;
  end loop;
end
$test$;

\set ON_ERROR_STOP on
do $qa$
declare n int;
begin
  select count(*) into n from pg_trigger tr
    join pg_class c on c.oid=tr.tgrelid
    join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname='public'
    and tr.tgname in ('chapters_home_stale','series_home_stale','volumes_home_stale')
    and pg_get_triggerdef(tr.oid) like '%FOR EACH STATEMENT%';
  if n <> 3 then raise exception 'FAIL: rollback no restauró los 3 triggers por sentencia (% encontrados)', n; end if;
end $qa$;
update private.home_snapshot set built_at=clock_timestamp() where id=1;
update public.volumes set status = status where false;
select private.qa_assert_invalidated('rollback con UPDATE de cero filas');

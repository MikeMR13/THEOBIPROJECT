\set ON_ERROR_STOP on
do $test$
declare v jsonb;
begin
  v:=private.build_home();
  if not exists(select 1 from jsonb_array_elements(v->'reviews') x
    where x->>'body' like '%anónima%' and x->>'username'='qa-hidden') then
    raise exception 'Rollback no restauró exactamente el comportamiento original';
  end if;
end $test$;

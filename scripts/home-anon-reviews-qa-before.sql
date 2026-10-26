\set ON_ERROR_STOP on
do $test$
declare v jsonb;
begin
  v:=private.build_home();
  if not exists(select 1 from jsonb_array_elements(v->'reviews') x
    where x->>'body' like '%anónima%' and x->>'username'='qa-hidden') then
    raise exception 'No se reprodujo el fallo de privacidad inicial';
  end if;
end $test$;

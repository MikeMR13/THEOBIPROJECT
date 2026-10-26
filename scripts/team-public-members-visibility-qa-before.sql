\set ON_ERROR_STOP on
set role anon;
do $test$
declare result_count int;
begin
 select count(*) into result_count from public.team_public_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 if result_count <> 4 then raise exception 'Version antigua no muestra los cuatro perfiles (result=%)',result_count; end if;
end $test$;
reset role;

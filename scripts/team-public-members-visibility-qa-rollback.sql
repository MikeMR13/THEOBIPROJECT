\set ON_ERROR_STOP on
set role anon;
do $test$
begin
 if (select count(*) from public.team_public_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'))<>4 then
   raise exception 'Rollback no restauró el contrato previo';
 end if;
end $test$;
reset role;

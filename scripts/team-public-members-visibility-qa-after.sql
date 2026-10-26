\set ON_ERROR_STOP on
set role anon;
do $test$
declare result_count int; names text;
begin
 select count(*),string_agg(username,',') into result_count,names
 from public.team_public_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 if result_count <> 1 or names <> 'Publico QA' then
   raise exception 'Anon filtrado incorrecto (%): %',result_count,names;
 end if;
 if (select count(*) from public.team_public_members('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'))<>0 then
   raise exception 'show_members=false debe prevalecer';
 end if;
end $test$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-9999-9999-999999999999',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
do $test$
declare result_count int;
begin
 select count(*) into result_count from public.team_public_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 if result_count <> 2 then raise exception 'Usuario autenticado no ve all+auth, se encontraron %',result_count; end if;
end $test$;
reset role;
-- La función permite que un miembro vea su propia identidad privada.
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
set role authenticated;
do $test$
declare result_count int;
begin
 select count(*) into result_count from public.team_public_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 if result_count <> 3 then raise exception 'Miembro privado debe verse a si mismo, count=%',result_count; end if;
end $test$;
reset role;
-- Sesión anónima de Auth se considera visitante, aunque posea JWT con sub.
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
select set_config('request.jwt.claim.sub','99999999-9999-9999-9999-999999999999',false);
set role authenticated;
do $test$
declare result_count int;
begin
 select count(*) into result_count from public.team_public_members('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 if result_count <> 1 then raise exception 'Auth anónimo no debe ver auth-only, count=%',result_count; end if;
end $test$;
reset role;

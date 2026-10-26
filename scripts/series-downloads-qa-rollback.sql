\set ON_ERROR_STOP on
set role anon;
do $test$
begin
 if (select count(*) from public.series_downloads_v2('11111111-1111-1111-1111-111111111111'))<>6
   or (select count(*) from public.series_downloads('22222222-2222-2222-2222-222222222222'))<>1
 then raise exception 'Reversión no devuelve la semántica heredada'; end if;
end $test$;
reset role;

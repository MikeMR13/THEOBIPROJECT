\set ON_ERROR_STOP on
set role anon;
do $test$
declare n int;
begin
  select count(*) into n from public.series_downloads('11111111-1111-1111-1111-111111111111');
  if n <> 6 then raise exception 'La función heredada no expone todos los metadatos QA, %',n; end if;
  select count(*) into n from public.series_downloads_v2('22222222-2222-2222-2222-222222222222');
  if n <> 1 then raise exception 'Falta reproducir borrador expuesto, %',n; end if;
end $test$;
reset role;

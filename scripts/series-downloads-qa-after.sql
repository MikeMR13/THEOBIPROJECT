\set ON_ERROR_STOP on
set role anon;
do $test$
declare n int; ids text;
begin
 select count(*),string_agg(id::text,',' order by id) into n,ids
 from public.series_downloads('11111111-1111-1111-1111-111111111111');
 if n<>3 or ids<>'1,7,8' then raise exception 'Anon debe ver 1,7,8. Obtuvo %/%',n,ids; end if;
 select count(*),string_agg(id::text,',' order by id) into n,ids
 from public.series_downloads_v2('11111111-1111-1111-1111-111111111111');
 if n<>3 or ids<>'1,7,8' then raise exception 'RPC v2 muestra %/%',n,ids; end if;
 if (select count(*) from public.series_downloads('22222222-2222-2222-2222-222222222222'))<>0 then
   raise exception 'Se filtraron metadatos de obra inédita';
 end if;
 if (select count(*) from public.series_downloads_v2('33333333-3333-3333-3333-333333333333'))<>0 then
   raise exception 'Se filtraron metadatos de obra archivada';
 end if;
end $test$;
reset role;

select set_config('request.jwt.claim.sub','99999999-9999-9999-9999-999999999999',false);
set role authenticated;
do $test$
declare n int;
begin
 select count(*) into n from public.series_downloads('11111111-1111-1111-1111-111111111111');
 if n<>6 then raise exception 'Editor perdió acceso a obras/volúmenes de trabajo, count=%',n; end if;
 select count(*) into n from public.series_downloads_v2('22222222-2222-2222-2222-222222222222');
 if n<>1 then raise exception 'Editor perdió metadatos de borrador, count=%',n; end if;
 if (select count(*) from public.series_downloads('33333333-3333-3333-3333-333333333333'))<>0 then
   raise exception 'La obra archivada debe continuar oculta, también para el editor';
 end if;
end $test$;
reset role;

-- El rol authenticated sin pertenencia no se trata como editor.
select set_config('request.jwt.claim.sub','88888888-8888-8888-8888-888888888888',false);
set role authenticated;
do $test$
begin
 if (select count(*) from public.series_downloads_v2('11111111-1111-1111-1111-111111111111'))<>3 then
   raise exception 'Lector no editor accede a metadatos sin publicar';
 end if;
end $test$;
reset role;

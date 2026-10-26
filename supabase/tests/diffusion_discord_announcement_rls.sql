-- Solo datos inventados, jamás envía contenido a Discord.
\set ON_ERROR_STOP on
do $qa$
begin
 if has_function_privilege('anon','public.diffusion_discord_announcement_claim(uuid,text,uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.diffusion_discord_announcement_complete(uuid,boolean,text)','EXECUTE')
 or has_function_privilege('anon','public.diffusion_discord_announcement_preview(uuid,text,uuid)','EXECUTE')
 or not has_function_privilege('service_role','public.diffusion_discord_announcement_complete(uuid,boolean,text)','EXECUTE')
 then raise exception 'ACL insegura'; end if;
end $qa$;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.is_admin','false',false);
set role authenticated;
do $qa$
declare cid uuid; data jsonb; job uuid; denied boolean;
begin
 cid:=public.diffusion_discord_connect('11111111-1111-4111-8111-111111111111','Anuncios A',
  'https://discord.com/api/webhooks/123456789012345678/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
 perform set_config('diffusion.announce_cid',cid::text,false);
 -- La conexión requiere prueba antes de publicar anuncios.
 denied:=false;
 begin perform public.diffusion_discord_announcement_preview(cid,'series','10000000-0000-4000-8000-000000000001');
 exception when raise_exception then if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Conexión sin prueba pudo anunciar'; end if;
end $qa$;
reset role;
set role service_role;
select public.diffusion_discord_mark_test(current_setting('diffusion.announce_cid')::uuid,true);
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare cid uuid:=current_setting('diffusion.announce_cid')::uuid;
 data jsonb; job uuid; denied boolean; target uuid;
begin
 data:=public.diffusion_discord_announcement_preview(cid,'chapter','30000000-0000-4000-8000-000000000001');
 if data->>'url' <> 'https://elobidellector.com/leer/obra-a/1' then raise exception 'URL de capítulo errónea'; end if;
 foreach target in array array[
 '10000000-0000-4000-8000-000000000002'::uuid,
 '10000000-0000-4000-8000-000000000003'::uuid] loop
 denied:=false;
 begin perform public.diffusion_discord_announcement_preview(cid,'series',target);
 exception when raise_exception then if sqlerrm='not_public' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Equipo ajeno o mecenas anunciado'; end if;
 end loop;
 foreach target in array array[
 '30000000-0000-4000-8000-000000000002'::uuid,
 '30000000-0000-4000-8000-000000000003'::uuid] loop
 denied:=false;
 begin perform public.diffusion_discord_announcement_preview(cid,'chapter',target);
 exception when raise_exception then if sqlerrm='not_public' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Capítulo restringido o programado anunciado'; end if;
 end loop;
 denied:=false;
 begin perform public.diffusion_discord_announcement_preview(cid,'volume','20000000-0000-4000-8000-000000000002');
 exception when raise_exception then if sqlerrm='not_public' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Volumen programado anunciado'; end if;
 data:=public.diffusion_discord_announcement_claim(cid,'chapter','30000000-0000-4000-8000-000000000001');
 job:=(data->>'job_id')::uuid;
 perform set_config('diffusion.announce_job',job::text,false);
 denied:=false;
 begin perform public.diffusion_discord_announcement_claim(cid,'chapter','30000000-0000-4000-8000-000000000001');
 exception when raise_exception then if sqlerrm='already_announced' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Anuncio duplicado permitido'; end if;
 if (select count(*) from public.diffusion_jobs where id=job and status='leased')<>1
 then raise exception 'No se reservó trabajo'; end if;
end $qa$;
reset role;
set role service_role;
select public.diffusion_discord_announcement_complete(current_setting('diffusion.announce_job')::uuid,true,'discord-test-id');
reset role;
do $qa$
begin
 if not exists(select 1 from public.diffusion_jobs
   where id=current_setting('diffusion.announce_job')::uuid and status='sent')
 then raise exception 'Resultado no persistido'; end if;
end $qa$;

select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
declare denied boolean:=false;
begin
 begin perform public.diffusion_discord_announcement_preview(
  current_setting('diffusion.announce_cid')::uuid,'series',
  '10000000-0000-4000-8000-000000000001');
 exception when raise_exception then if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Equipo B accedió a la cuenta del equipo A'; end if;
end $qa$;
reset role;
\echo 'Anuncios manuales Discord: PASS (ámbito, accesibilidad, duplicados, estado)'

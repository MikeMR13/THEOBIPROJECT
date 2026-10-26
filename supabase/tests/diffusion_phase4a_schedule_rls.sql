-- Difusión 4A: pruebas con conexiones y usuarios ficticios. Sin salir a redes.
\set ON_ERROR_STOP on
do $qa$ begin
 if not exists(select 1 from pg_class c where c.oid='public.diffusion_scheduled_announcements'::regclass and c.relrowsecurity)
 or has_table_privilege('authenticated','public.diffusion_scheduled_announcements','INSERT')
 or has_table_privilege('authenticated','public.diffusion_scheduled_announcements','UPDATE')
 or has_table_privilege('anon','public.diffusion_scheduled_announcements','SELECT')
 or has_function_privilege('anon','public.diffusion_schedule_create(uuid,text,uuid,text,timestamptz)','EXECUTE')
 or has_function_privilege('anon','public.diffusion_schedule_cancel(uuid)','EXECUTE')
 or has_function_privilege('anon','public.diffusion_schedule_finalize(uuid)','EXECUTE')
 then raise exception 'Agenda sin RLS o ACL'; end if;
end $qa$;

-- El test previo envió un claim sintético en la misma conexión;
-- respetar el rate limit de producción y desplazar únicamente el reloj del fixture.
update public.diffusion_connections set last_announcement_at=now()-interval '20 seconds'
 where team_id='11111111-1111-4111-8111-111111111111'
   and provider='discord' and label='Anuncios A';
-- Propietario de equipo A: creación futura, no despacho.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare conn uuid:=(select id from public.diffusion_connections where team_id='11111111-1111-4111-8111-111111111111' and label='Anuncios A' and provider='discord' and status='active' limit 1);
 plan_id uuid; cancel_id uuid; deny bool; job jsonb; j uuid;
begin
 plan_id:=public.diffusion_schedule_create(conn,'series','10000000-0000-4000-8000-000000000001',
   'Novedad editorial prevista',now()+interval '1 day');
 perform set_config('diffusion.schedule_cid',plan_id::text,false);
 if (select count(*) from public.diffusion_scheduled_announcements where status='planned')<>1
 then raise exception 'El plan no existe o cruzó equipos'; end if;
 if exists(select 1 from public.diffusion_jobs where status='pending')
 then raise exception 'Crear agenda activó cola de publicaciones'; end if;
 deny:=false;
 begin
   perform public.diffusion_schedule_create(conn,'series','10000000-0000-4000-8000-000000000001',
     'Copia',now()+interval '2 days');
 exception when raise_exception then if sqlerrm='already_scheduled' then deny:=true; else raise; end if; end;
 if not deny then raise exception 'Plan duplicado'; end if;
 deny:=false;
 begin
   perform public.diffusion_schedule_create(conn,'series','10000000-0000-4000-8000-000000000001',
     'Casi ahora',now()+interval '30 seconds');
 exception when raise_exception then if sqlerrm='invalid_schedule' then deny:=true; else raise; end if; end;
 if not deny then raise exception 'Fecha inválida admitida'; end if;
 deny:=false;
 begin
   perform public.diffusion_schedule_create(conn,'chapter','30000000-0000-4000-8000-000000000002',
     'Restringido',now()+interval '1 day');
 exception when raise_exception then if sqlerrm='not_public' then deny:=true; else raise; end if; end;
 if not deny then raise exception 'Se agendó contenido no público'; end if;
 deny:=false;
 begin perform public.diffusion_schedule_finalize(plan_id);
 exception when raise_exception then if sqlerrm='not_confirmed' then deny:=true; else raise; end if; end;
 if not deny then raise exception 'Marcó entrega sin envío confirmado'; end if;
 if not public.diffusion_schedule_reschedule(plan_id,now()+interval '3 days')
 then raise exception 'No se pudo cambiar fecha'; end if;
 if not exists(select 1 from public.diffusion_scheduled_announcements where public.diffusion_scheduled_announcements.id=plan_id and scheduled_at>now()+interval '2 days')
 then raise exception 'No se cambió la fecha'; end if;
 cancel_id:=public.diffusion_schedule_create(conn,'volume','20000000-0000-4000-8000-000000000001',
   'Plan cancelable',now()+interval '1 day');
 if not public.diffusion_schedule_cancel(cancel_id) then raise exception 'No se canceló'; end if;
 if not exists(select 1 from public.diffusion_scheduled_announcements where id=cancel_id and status='cancelled')
 then raise exception 'Cancelación no persistida'; end if;
 job:=public.diffusion_discord_announcement_claim(conn,'series','10000000-0000-4000-8000-000000000001');
 j:=(job->>'job_id')::uuid;
 perform set_config('diffusion.schedule_job',j::text,false);
end $qa$;
reset role;

-- Otro equipo no puede ni ver la agenda ni cancelar o manipular la del equipo A.
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
declare id uuid:=current_setting('diffusion.schedule_cid')::uuid; deny bool:=false;
begin
 if (select count(*) from public.diffusion_scheduled_announcements)<>0 then
   raise exception 'Fuga de planes entre equipos'; end if;
 begin perform public.diffusion_schedule_cancel(id);
 exception when raise_exception then if sqlerrm='forbidden' then deny:=true; else raise; end if; end;
 if not deny then raise exception 'Equipo B pudo cancelar al A'; end if;
end $qa$;
reset role;

-- Solo tras completar externamente un job ficticio con service_role puede finalizarse.
set role service_role;
select public.diffusion_discord_announcement_complete(current_setting('diffusion.schedule_job')::uuid,true,'fake-post');
reset role;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare plan_id uuid:=current_setting('diffusion.schedule_cid')::uuid;
begin
 if not public.diffusion_schedule_finalize(plan_id) then raise exception 'No finalizó'; end if;
 if not exists(select 1 from public.diffusion_scheduled_announcements where diffusion_scheduled_announcements.id=plan_id and status='sent')
 then raise exception 'No registró entrega confirmada'; end if;
end $qa$;
reset role;
\echo 'Difusión 4A PASS: ámbitos RLS, fechas, duplicados, cancelación y confirmación sin envíos'

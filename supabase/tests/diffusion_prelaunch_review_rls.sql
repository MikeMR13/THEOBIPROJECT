\set ON_ERROR_STOP on
-- QA de revisión interna SIN enviar a proveedores reales.
do $q$ begin
 if has_function_privilege('anon','public.diffusion_prelaunch_approve(uuid)'::regprocedure,'EXECUTE')
 or not has_function_privilege('authenticated','public.diffusion_prelaunch_approve(uuid)'::regprocedure,'EXECUTE')
 then raise exception 'Approval RPC privileges incorrect'; end if;
end $q$;
insert into public.series(id,team_id,slug,title,synopsis,published,translation_status,access,cover_path,adult)
 values('74000000-0000-4000-8000-000000000003',
  '11111111-1111-4111-8111-111111111111','obra-revision-qa',
  'Obra con revisión','No revelar',false,'ongoing','public','qa/review.jpg',false);
insert into public.volumes(id,series_id,num,title,status,access,cover_path,published_at)
 values('75000000-0000-4000-8000-000000000003',
  '74000000-0000-4000-8000-000000000003',1,'Vol futuro','scheduled','public',
  'qa/review-v.jpg',now()+interval '12 days');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $q$
declare r uuid; c uuid; p uuid;
begin
 select id into c from public.diffusion_connections where provider='telegram'
 and team_id='11111111-1111-4111-8111-111111111111' and status='active' limit 1;
 if c is null then raise exception 'No Telegram fixture'; end if;
 r:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',
   null,'Anuncio con revisión','prelaunch.announced','team_review',0);
 perform public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',r,true,c);
 perform set_config('diffusion.qa4d.review',r::text,false);
end $q$;
reset role;
update public.volumes set announce_prelaunch=true where id='75000000-0000-4000-8000-000000000003';
do $q$
begin
 if not exists(select 1 from public.diffusion_scheduled_announcements
 where rule_id=current_setting('diffusion.qa4d.review')::uuid
 and delivery_mode='manual' and status='planned' and prelaunch_volume_id is not null)
 then raise exception 'Review did not queue manual preview'; end if;
end $q$;
-- La aprobación es explícita, no marca enviado ni contacta proveedor.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $q$
declare p uuid;
begin
 select id into p from public.diffusion_scheduled_announcements
 where rule_id=current_setting('diffusion.qa4d.review')::uuid;
 if not public.diffusion_prelaunch_approve(p) then raise exception 'Approval did not succeed'; end if;
 if exists(select 1 from public.diffusion_scheduled_announcements where id=p
 and (delivery_mode<>'automatic' or status<>'planned'))
 then raise exception 'Approval should only mark plan eligible'; end if;
end $q$;
reset role;
do $q$
begin
 if (select count(*) from public.diffusion_events where source_id='74000000-0000-4000-8000-000000000003')<>0
 then raise exception 'Review erroneously called provider'; end if;
end $q$;
\echo 'Fase 4D revisión editorial: solo autenticados, aprobación opt-in sin envío directo — PASS'

\set ON_ERROR_STOP on
do $t$ begin
 if has_function_privilege('anon','public.diffusion_rule_toggle(uuid,uuid,boolean,uuid)'::regprocedure,'EXECUTE')
 or not exists(select 1 from pg_trigger where tgname='diffusion_prelaunch_announced')
 or not exists(select 1 from pg_constraint where conname='diffusion_rule_occurrences_source_type_check'
   and pg_get_constraintdef(oid) like '%series%')
 then raise exception 'Missing secure prelaunch trigger or ACL'; end if;
end $t$;

-- Synthetic unpublished work: reader can only see the publicly announced preview.
insert into public.series(id,team_id,slug,title,synopsis,published,translation_status,access,cover_path,adult)
values ('74000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'obra-proxima-qa','Obra por anunciar','Sinopsis reservada',false,'ongoing','public','qa/pre.jpg',false),
 ('74000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',
 'obra-privada-qa','Obra privada','NO',false,'ongoing','public','qa/pre.jpg',true);
insert into public.volumes(id,series_id,num,title,status,access,cover_path,published_at)
values('75000000-0000-4000-8000-000000000001',
 '74000000-0000-4000-8000-000000000001',1,'Volumen estreno',
 'scheduled','public','qa/pre-v.jpg',now()+interval '14 days'),
 ('75000000-0000-4000-8000-000000000002',
 '74000000-0000-4000-8000-000000000002',1,'Volumen adulto',
 'scheduled','public','qa/pre-v.jpg',now()+interval '14 days');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $t$
declare dest uuid; rid uuid; oldid uuid;
begin
 select id into dest from public.diffusion_connections
  where team_id='11111111-1111-4111-8111-111111111111' and provider='discord' and status='active' limit 1;
 rid:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',
  null,'Nueva obra anunciada','prelaunch.announced','automatic',0);
 perform set_config('diffusion.qa4d.rule',rid::text,false);
 if (select enabled from public.diffusion_rules where id=rid) then raise exception 'Unexpected auto-enabled rule'; end if;
 perform public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',rid,true,dest);
 if exists(select 1 from public.diffusion_scheduled_announcements where rule_id=rid)
 then raise exception 'Historical backfill'; end if;
end $t$;
reset role;

-- The expected first consent change from the Studio scheduling RPC.
update public.volumes set announce_prelaunch=true
 where id='75000000-0000-4000-8000-000000000001';
update public.volumes set announce_prelaunch=true
 where id='75000000-0000-4000-8000-000000000002';
do $t$
begin
 if (select count(*) from public.diffusion_scheduled_announcements
  where rule_id=current_setting('diffusion.qa4d.rule')::uuid
    and status='planned' and delivery_mode='automatic' and
    prelaunch_volume_id='75000000-0000-4000-8000-000000000001')<>1
 then raise exception 'Public opt-in announcement missing'; end if;
 if exists(select 1 from public.diffusion_scheduled_announcements
  where prelaunch_volume_id='75000000-0000-4000-8000-000000000002')
 then raise exception 'Adult unpublished work was announced'; end if;
 if (select count(*) from private.diffusion_rule_occurrences o
  where o.rule_id=current_setting('diffusion.qa4d.rule')::uuid and o.source_type='series')<>1
 then raise exception 'Prelaunch dedupe not stored'; end if;
end $t$;

-- Re-setting prelaunch should not create another plan.
update public.volumes set announce_prelaunch=true
 where id='75000000-0000-4000-8000-000000000001';
do $t$ begin
 if (select count(*) from public.diffusion_scheduled_announcements
 where rule_id=current_setting('diffusion.qa4d.rule')::uuid)<>1
 then raise exception 'Repeated announcement'; end if;
end $t$;

-- Claim uses 4B pipeline and MUST NOT expose synopsis/chapters.
update public.diffusion_scheduled_announcements set scheduled_at=now()-interval '1 minute'
 where rule_id=current_setting('diffusion.qa4d.rule')::uuid;
update public.diffusion_connections set last_announcement_at=now()-interval '60 seconds'
 where id=(select connection_id from public.diffusion_scheduled_announcements
  where rule_id=current_setting('diffusion.qa4d.rule')::uuid limit 1);
set role service_role;
do $t$
declare x jsonb; ok boolean;
begin
 x:=public.diffusion_4b_claim();
 if x is null or x->>'provider'<>'discord'
 or x->'payload'->>'url'<>'https://elobidellector.com/serie/obra-proxima-qa'
 or x->'payload'->>'cover_path'<>'qa/pre.jpg'
 or x->'payload'->>'title' not like '%Próximo estreno%'
 then raise exception 'Prelaunch payload invalid: %',x; end if;
 if (x->'payload'->>'description') like '%reservada%'
 then raise exception 'Private synopsis disclosed'; end if;
 ok:=public.diffusion_4b_complete(
  (x->>'plan_id')::uuid,(x->>'job_id')::uuid,false,null);
 if not ok then raise exception 'Uncertain delivery not persisted'; end if;
end $t$;
reset role;
do $t$
begin
 if (select count(*) from public.diffusion_scheduled_announcements where
 rule_id=current_setting('diffusion.qa4d.rule')::uuid and status='unknown')<>1
 then raise exception 'Uncertain state missing'; end if;
end $t$;
\echo 'Fase 4D PG17 QA: preestreno opt-in, privacidad, sin historicos, dedupe, payload seguro, claim incierto — PASS'

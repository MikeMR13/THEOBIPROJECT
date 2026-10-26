\set ON_ERROR_STOP on
-- QA in a disposable PostgreSQL; the provider is NEVER contacted.
do $test$ begin
 if has_function_privilege('anon','public.diffusion_4b_claim()'::regprocedure,'EXECUTE')
 or has_function_privilege('authenticated','public.diffusion_4b_complete(uuid,uuid,boolean,text)'::regprocedure,'EXECUTE')
 or has_function_privilege('anon','public.diffusion_4b_consume_ticket(text)'::regprocedure,'EXECUTE')
 or has_function_privilege('service_role','private.diffusion_4b_tick()'::regprocedure,'EXECUTE')
 or not has_function_privilege('service_role','public.diffusion_4b_claim()'::regprocedure,'EXECUTE')
 then raise exception 'Escalation of dispatch permissions'; end if;
end $test$;

-- Two intentionally fictional series (one will become private before dispatch).
insert into public.series(id,team_id,slug,title,synopsis,published,translation_status,access,cover_path)
values('70000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
  'auto-qa-ok','QA automática','Solo datos sintéticos',true,'ongoing','public','qa/test-cover.jpg'),
 ('70000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',
  'auto-qa-block','QA reservada','Solo datos sintéticos',true,'ongoing','public','qa/test-cover.jpg');

-- Simulate editor with valid team permissions: 4A legacy remains manual.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $test$
declare c uuid; old_id uuid; auto_id uuid; denied boolean:=false;
begin
 select id into c from public.diffusion_connections
  where team_id='11111111-1111-4111-8111-111111111111'
    and provider='discord' and status='active' order by id limit 1;
 old_id:=public.diffusion_schedule_create(c,'series',
  '70000000-0000-4000-8000-000000000001','Manual QA',now()+interval '1 day');
 if (select delivery_mode from public.diffusion_scheduled_announcements where id=old_id)<>'manual'
 then raise exception '4A was unexpectedly changed to automatic'; end if;
 perform public.diffusion_schedule_cancel(old_id);
 auto_id:=public.diffusion_schedule_create(c,'series',
  '70000000-0000-4000-8000-000000000001','Programada QA',now()+interval '1 day','automatic');
 perform set_config('diffusion.qa.plan',auto_id::text,false);
 if (select delivery_mode from public.diffusion_scheduled_announcements where id=auto_id)<>'automatic'
 then raise exception 'Opt-in to 4B failed'; end if;
 begin
  perform public.diffusion_schedule_create(c,'series',
   '70000000-0000-4000-8000-000000000002','Invalid',now()+interval '1 day','no');
 exception when raise_exception then
  if sqlerrm='invalid_delivery_mode' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Invalid delivery mode accepted'; end if;
 perform set_config('diffusion.qa.block',
   public.diffusion_schedule_create(c,'series',
    '70000000-0000-4000-8000-000000000002','Se volvió privada',now()+interval '1 day','automatic')::text,
 false);
end $test$;
reset role;

-- Simulate that both dates have passed; one series withdrawn before sending.
update public.diffusion_scheduled_announcements set scheduled_at=now()-interval '3 minutes'
 where id=current_setting('diffusion.qa.plan')::uuid;
update public.series set published=false where id='70000000-0000-4000-8000-000000000002';

do $test$
declare token text:='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
begin
 if not private.diffusion_4b_tick() then raise exception 'Due cron did not trigger'; end if;
 if (select count(*) from net.qa_requests)<>1 then raise exception 'Unexpected HTTP count'; end if;
 insert into private.diffusion_dispatch_tickets(token_digest,expires_at)
 values(extensions.digest(token,'sha256'),now()+interval '90 seconds');
end $test$;
set role service_role;
do $test$
declare item jsonb; job uuid; r boolean;
begin
 if not public.diffusion_4b_consume_ticket('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
 then raise exception 'Valid one-use ticket not accepted'; end if;
 if public.diffusion_4b_consume_ticket('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
   or public.diffusion_4b_consume_ticket('deadbeef') then raise exception 'Replayed/invalid ticket accepted'; end if;
 -- First auto plan is due. Its provider payload is private, not a live HTTP post.
 item:=public.diffusion_4b_claim();
 if item is null or item->>'plan_id'<>current_setting('diffusion.qa.plan')
   or item->'payload'->>'cover_path'<>'qa/test-cover.jpg'
 then raise exception 'Automatic claim failed'; end if;
 job:=(item->>'job_id')::uuid;
 if public.diffusion_4b_complete((item->>'plan_id')::uuid,job,false,null) is distinct from true
 then raise exception 'Uncertain outcome was not persisted: status=%, linked_job=%, claim_job=%',
 (select status from public.diffusion_scheduled_announcements where id=(item->>'plan_id')::uuid),
 (select dispatch_job_id from public.diffusion_scheduled_announcements where id=(item->>'plan_id')::uuid),job;
 end if;
 if public.diffusion_4b_complete((item->>'plan_id')::uuid,job,true,'fake-id') then
  raise exception 'Completion could be replayed'; end if;
 if public.diffusion_4b_claim() is not null then raise exception 'Already claimed an item again'; end if;
end $test$;
reset role;
update public.diffusion_scheduled_announcements set scheduled_at=now()-interval '3 minutes'
 where id=current_setting('diffusion.qa.block')::uuid;
set role service_role;
do $test$
declare item jsonb;
begin
 item:=public.diffusion_4b_claim();
 if item->>'skipped'<>'true' then raise exception 'Withdrawn content not blocked'; end if;
 if public.diffusion_4b_claim() is not null then raise exception 'Blocked item was claimed again'; end if;
end $test$;
reset role;
do $test$
begin
 if (select status from public.diffusion_scheduled_announcements
  where id=current_setting('diffusion.qa.plan')::uuid)<>'unknown'
 or (select status from public.diffusion_scheduled_announcements
  where id=current_setting('diffusion.qa.block')::uuid)<>'blocked'
 then raise exception 'Unknown and blocked states incorrect'; end if;
 if (select count(*) from public.diffusion_jobs j
   join public.diffusion_events e on e.id=j.event_id
   where e.source_id='70000000-0000-4000-8000-000000000001')<>1
 then raise exception 'Automatic deduplication failed'; end if;
 if private.diffusion_4b_tick() then raise exception 'Cron must not call Edge without pending plans'; end if;
 if (select count(*) from net.qa_requests)<>1 then raise exception 'Idle cron generated extra request'; end if;
end $test$;
\echo 'Difusión 4B SQL QA: 4A manual, opt-in, one-shot tickets, no repeats, unpublished blocked, unknown isolated — PASS'

\set ON_ERROR_STOP on
-- PG17 descartable, dos canales de un mismo equipo, sin red ni mensajes reales.
-- Pruebas 4D previas dejan una regla de revisión activa; aislarlas impide
-- que compitan por el mismo destino cuando las UUID aleatorias cambian de orden.
update public.diffusion_rules set enabled=false,enabled_at=null where enabled;

do $qa$
begin
 if has_function_privilege('anon','public.diffusion_rule_toggle_multi(uuid,uuid,boolean,uuid[])'::regprocedure,'EXECUTE')
 or not has_function_privilege('authenticated','public.diffusion_rule_toggle_multi(uuid,uuid,boolean,uuid[])'::regprocedure,'EXECUTE')
 or not exists(select 1 from information_schema.columns where table_schema='public'
   and table_name='diffusion_rules' and column_name='connection_ids')
 then raise exception 'ACL or multichannel schema missing'; end if;
end $qa$;
insert into public.series(id,team_id,slug,title,synopsis,published,translation_status,access,cover_path,adult)
values('76000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'obra-multicanal','QA canales','Sintética',true,'ongoing','public','qa/test-cover.jpg',false),
 ('76000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',
 'obra-preview-multicanal','QA adelanto','Sinopsis no pública',false,'ongoing','public','qa/test-cover.jpg',false);
insert into public.volumes(id,series_id,num,title,status,access,cover_path,published_at)
values('77000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000001',
 1,'QA vol','scheduled','public','qa/test-volume.jpg',now()-interval '1 minute'),
 ('77000000-0000-4000-8000-000000000002','76000000-0000-4000-8000-000000000002',
 1,'QA preview','scheduled','public','qa/test-volume.jpg',now()+interval '14 days');

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare discord_id uuid;telegram_id uuid; rid uuid; pr uuid; bad bool:=false;
begin
 select id into discord_id from public.diffusion_connections
 where team_id='11111111-1111-4111-8111-111111111111' and provider='discord' and status='active' limit 1;
 select id into telegram_id from public.diffusion_connections
 where team_id='11111111-1111-4111-8111-111111111111' and provider='telegram' and status='active' limit 1;
 if discord_id is null or telegram_id is null then raise exception 'Fixture requires 2 active channels'; end if;
 rid:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',null,
 'Nuevo volumen dos redes','volume.public','automatic',0);
 perform set_config('diffusion.multi.rule',rid::text,false);
 begin
  perform public.diffusion_rule_toggle_multi('11111111-1111-4111-8111-111111111111',
    rid,true,array[discord_id,discord_id]);
 exception when raise_exception then if sqlerrm='invalid_destinations' then bad:=true; else raise; end if; end;
 if not bad then raise exception 'Duplicate channel accepted'; end if;
 perform public.diffusion_rule_toggle_multi('11111111-1111-4111-8111-111111111111',
  rid,true,array[discord_id,telegram_id]);
 if (select cardinality(connection_ids) from public.diffusion_rules where id=rid)<>2
 then raise exception 'Multiple targets not stored'; end if;
 pr:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',null,
 'Preestreno dos redes','prelaunch.announced','team_review',0);
 perform set_config('diffusion.multi.preview',pr::text,false);
 perform public.diffusion_rule_toggle_multi('11111111-1111-4111-8111-111111111111',
  pr,true,array[discord_id,telegram_id]);
end $qa$;
reset role;
-- Activate event: one individual queued item per provider, not two rules.
update public.volumes set status='published' where id='77000000-0000-4000-8000-000000000001';
update public.volumes set announce_prelaunch=true where id='77000000-0000-4000-8000-000000000002';
do $qa$ begin
 if (select count(*) from public.diffusion_scheduled_announcements
  where rule_id=current_setting('diffusion.multi.rule')::uuid and delivery_mode='automatic')<>2
 then raise exception 'Missing publication on a destination'; end if;
 if (select count(distinct connection_id) from public.diffusion_scheduled_announcements
  where rule_id=current_setting('diffusion.multi.rule')::uuid)<>2
 then raise exception 'Destination reuse instead of distinct channels'; end if;
 if (select count(*) from public.diffusion_scheduled_announcements
  where rule_id=current_setting('diffusion.multi.preview')::uuid and delivery_mode='manual')<>2
 then raise exception 'Preview review lost a target'; end if;
 if (select count(*) from private.diffusion_rule_occurrences
  where rule_id in (current_setting('diffusion.multi.rule')::uuid,current_setting('diffusion.multi.preview')::uuid))<>4
 then raise exception 'One occurrence per rule/source/destination expected'; end if;
end $qa$;
-- No duplicate when updating published object; no new preview on retoggling true.
update public.volumes set status='published' where id='77000000-0000-4000-8000-000000000001';
update public.volumes set announce_prelaunch=true where id='77000000-0000-4000-8000-000000000002';
do $qa$ begin
 if (select count(*) from public.diffusion_scheduled_announcements where
  rule_id in (current_setting('diffusion.multi.rule')::uuid,current_setting('diffusion.multi.preview')::uuid))<>4
 then raise exception 'Duplicate outbound plans'; end if;
end $qa$;

-- Both editorial-review destinations must be independently approvable.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare x record;
begin
 for x in select id from public.diffusion_scheduled_announcements
  where rule_id=current_setting('diffusion.multi.preview')::uuid
    and delivery_mode='manual' and status='planned'
 loop
  if not public.diffusion_prelaunch_approve(x.id) then raise exception 'Review approval failed'; end if;
 end loop;
 if (select count(*) from public.diffusion_scheduled_announcements
   where rule_id=current_setting('diffusion.multi.preview')::uuid
    and delivery_mode='automatic' and status='planned')<>2
 then raise exception 'Each selected channel requires independent review approval'; end if;
end $qa$;
reset role;

-- Try activation from a different identity / team.
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
declare rejected bool:=false;
begin
 begin perform public.diffusion_rule_toggle_multi('11111111-1111-4111-8111-111111111111',
  current_setting('diffusion.multi.rule')::uuid,false,null);
 exception when raise_exception then if sqlerrm='forbidden' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Cross-team pause allowed'; end if;
end $qa$;
reset role;
-- The existing workflow must continue to refuse retries after the rule is paused.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
select public.diffusion_rule_toggle_multi('11111111-1111-4111-8111-111111111111',
 current_setting('diffusion.multi.rule')::uuid,false,null);
select public.diffusion_rule_toggle_multi('11111111-1111-4111-8111-111111111111',
 current_setting('diffusion.multi.preview')::uuid,false,null);
reset role;
do $qa$
begin
 if (select count(*) from public.diffusion_scheduled_announcements
  where rule_id in (current_setting('diffusion.multi.rule')::uuid,current_setting('diffusion.multi.preview')::uuid)
    and status='cancelled')<>4 then raise exception 'Pause did not cancel all channels'; end if;
 if private.diffusion_4b_tick() then raise exception 'Idle cron should never send'; end if;
end $qa$;
\echo 'Difusion multicanal PG17: dos destinos por regla, doble provider, sin duplicados, permisos y pausa — PASS'

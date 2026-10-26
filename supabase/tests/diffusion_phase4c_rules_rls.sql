\set ON_ERROR_STOP on
-- PostgreSQL 17 efímero, SIN webhooks ni tokens reales.
do $qa$
begin
 if has_function_privilege('anon','public.diffusion_rule_toggle(uuid,uuid,boolean,uuid)'::regprocedure,'EXECUTE')
 or not has_function_privilege('authenticated','public.diffusion_rule_toggle(uuid,uuid,boolean,uuid)'::regprocedure,'EXECUTE')
 or has_table_privilege('authenticated','private.diffusion_rule_occurrences','SELECT')
 or not exists(select 1 from pg_trigger where tgname='diffusion_4c_volume_published')
 or not exists(select 1 from pg_trigger where tgname='diffusion_4c_chapter_published')
 then raise exception '4C ACL, triggers or RLS misconfigured'; end if;
end $qa$;

-- No activar nada para usuarios anónimos ni el equipo contrario.
insert into public.series(id,team_id,slug,title,synopsis,published,translation_status,access,cover_path)
 values('71000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'obra-reglas-qa','Obra reglas','Publicación sintética',true,'ongoing','public','qa/obra.jpg');

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare conn uuid; rid uuid; review_id uuid; bad_id uuid; refused bool:=false;
begin
 select id into conn from public.diffusion_connections
  where team_id='11111111-1111-4111-8111-111111111111'
  and provider='discord' and status='active' limit 1;
 if conn is null then raise exception 'Missing synthetic destination'; end if;
 rid:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',
  null,'Nuevo volumen','volume.public','automatic',0);
 if (select enabled from public.diffusion_rules where id=rid) then raise exception 'Must start disabled'; end if;
 perform set_config('diffusion.qa4c.rule',rid::text,false);
 -- No historical backfill: the next event triggers it, never the activation itself.
 if not public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',rid,true,conn)
 then raise exception 'Activation failed'; end if;
 if not exists(select 1 from public.diffusion_rules where id=rid and enabled and connection_id=conn and enabled_at is not null)
 then raise exception 'Activation state incorrect'; end if;
 if exists(select 1 from public.diffusion_scheduled_announcements where rule_id=rid)
 then raise exception 'Old posts were scheduled'; end if;
 review_id:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',
  null,'Nuevo capítulo a revisar','chapter.public','team_review',0);
 perform set_config('diffusion.qa4c.review',review_id::text,false);
 perform public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',review_id,true,conn);
 bad_id:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',
  null,'Preestreno pendiente','prelaunch.announced','automatic',0);
 begin
  perform public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',bad_id,true,conn);
 exception when raise_exception then
  if sqlerrm='event_not_automatable_yet' then refused:=true; else raise; end if;
 end;
 if not refused then raise exception 'Unsupported event was enabled'; end if;
end $qa$;
reset role;

-- Otra identidad no puede pausar ni activar las reglas del equipo A.
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
declare denied bool:=false;
begin
 begin perform public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',
   current_setting('diffusion.qa4c.rule')::uuid,false,null);
 exception when raise_exception then
  if sqlerrm='forbidden' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'BOLA: Team B paused Team A'; end if;
end $qa$;
reset role;

-- El runner publica volumen y capítulo: dos reglas distintas y enlaces sintéticos.
insert into public.volumes(id,series_id,num,title,status,access,cover_path,published_at)
values('72000000-0000-4000-8000-000000000001',
 '71000000-0000-4000-8000-000000000001',1,'Vol QA','scheduled','public','qa/vol.jpg',now()-interval '1 minute');
insert into public.chapters(id,series_id,volume_id,vol,num,title,status,access,publish_at)
values('73000000-0000-4000-8000-000000000001',
 '71000000-0000-4000-8000-000000000001',
 '72000000-0000-4000-8000-000000000001',1,1,'Cap QA','scheduled','public',now()-interval '1 minute');
update public.volumes set status='published'
 where id='72000000-0000-4000-8000-000000000001';
update public.chapters set status='published'
 where id='73000000-0000-4000-8000-000000000001';

do $qa$
begin
 if (select count(*) from public.diffusion_scheduled_announcements where rule_id=current_setting('diffusion.qa4c.rule')::uuid
  and status='planned' and delivery_mode='automatic')<>1 then raise exception 'Volume automatic plan not created'; end if;
 if (select count(*) from public.diffusion_scheduled_announcements where rule_id=current_setting('diffusion.qa4c.review')::uuid
  and status='planned' and delivery_mode='manual')<>1 then raise exception 'Chapter review plan not created'; end if;
 if (select count(*) from private.diffusion_rule_occurrences)<>2 then raise exception 'Occurrences count mismatch'; end if;
end $qa$;
-- An unrelated update to a published volume or chapter must NOT create another plan.
update public.volumes set status='published' where id='72000000-0000-4000-8000-000000000001';
update public.chapters set status='published' where id='73000000-0000-4000-8000-000000000001';
do $qa$
begin
 if (select count(*) from public.diffusion_scheduled_announcements where rule_id is not null)<>2
 then raise exception 'Duplicate pending announcements'; end if;
end $qa$;

-- Pausar cancela todo lo pendiente (sin disparar proveedores).
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
select public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',current_setting('diffusion.qa4c.rule')::uuid,false,null);
select public.diffusion_rule_toggle('11111111-1111-4111-8111-111111111111',current_setting('diffusion.qa4c.review')::uuid,false,null);
reset role;
do $qa$
begin
 if (select count(*) from public.diffusion_scheduled_announcements where rule_id is not null and status='planned')<>0
 or (select count(*) from public.diffusion_scheduled_announcements where rule_id is not null and status='cancelled')<>2
 then raise exception 'Pause failed to cancel queued work'; end if;
 if (select count(*) from public.diffusion_rules where enabled)<>0 then raise exception 'Rules still enabled'; end if;
 if private.diffusion_4b_tick() then raise exception 'Idle tick tried external request'; end if;
end $qa$;
\echo 'Difusión 4C OK: control por equipo, opt-in, volumen/capítulo, dedupe, revisión, desactivación; SIN HTTP'

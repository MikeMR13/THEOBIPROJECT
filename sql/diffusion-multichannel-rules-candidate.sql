-- Fase 4E, un ID de regla con hasta ocho destinos activos distintos.
alter table public.diffusion_rules add column connection_ids uuid[] not null default '{}'::uuid[];
update public.diffusion_rules set connection_ids=array[connection_id] where connection_id is not null;
alter table private.diffusion_rule_occurrences add column connection_id uuid;
update private.diffusion_rule_occurrences o set connection_id=coalesce(
  (select p.connection_id from public.diffusion_scheduled_announcements p where p.id=o.plan_id),
  (select r.connection_id from public.diffusion_rules r where r.id=o.rule_id));
do $old$ begin
 if exists(select 1 from private.diffusion_rule_occurrences where connection_id is null)
 then raise exception 'Unlinked occurrence: needs manual reconciliation'; end if;
end $old$;
alter table private.diffusion_rule_occurrences
 alter column connection_id set not null,
 drop constraint diffusion_rule_occurrences_pkey,
 add constraint diffusion_rule_occurrences_pkey primary key(rule_id,source_type,source_id,connection_id);

create function public.diffusion_rule_toggle_multi(p_team uuid,p_id uuid,p_enabled boolean,p_connections uuid[])
returns boolean language plpgsql security definer set search_path='' as $multi$
declare r public.diffusion_rules%rowtype; ids uuid[]; n int;
begin
 if auth.uid() is null or p_id is null or p_enabled is null
  or not private.diffusion_scope_ok(p_team,'diffusion_manage')
  or not private.diffusion_scope_ok(p_team,'diffusion_publish')
  or not private.diffusion_scope_ok(p_team,'diffusion_schedule') then raise exception 'forbidden'; end if;
 select * into r from public.diffusion_rules where id=p_id and team_id is not distinct from p_team for update;
 if not found then raise exception 'rule_not_found'; end if;
 if p_enabled then
   if r.event_kind not in ('chapter.public','volume.public','prelaunch.announced')
   then raise exception 'event_not_automatable_yet'; end if;
   if r.enabled then raise exception 'rule_already_active_pause_first'; end if;
   ids:=coalesce(p_connections,r.connection_ids);
   if ids is null or cardinality(ids)<1 or cardinality(ids)>8
      or array_position(ids,null) is not null
      or cardinality(array(select distinct unnest(ids)))<>cardinality(ids)
   then raise exception 'invalid_destinations'; end if;
   select count(*) into n from public.diffusion_connections c
    where c.id=any(ids) and c.team_id is not distinct from p_team
      and c.status='active' and c.provider in ('discord','telegram');
   if n<>cardinality(ids) then raise exception 'destination_unavailable'; end if;
   update public.diffusion_rules set enabled=true,enabled_at=now(),
     connection_ids=ids,connection_id=ids[1],updated_at=now() where id=r.id;
 else
   update public.diffusion_rules set enabled=false,enabled_at=null,updated_at=now() where id=r.id;
   update public.diffusion_scheduled_announcements set status='cancelled',
      last_error='rule_paused',updated_at=now()
     where rule_id=r.id and status='planned';
 end if;
 if p_team is not null then
   perform private.log(p_team,'edicion',
    case when p_enabled then 'Activó difusión multicanal' else 'Pausó difusión multicanal' end,
    jsonb_build_object('rule_id',r.id,'enabled',p_enabled,
      'target_count',case when p_enabled then cardinality(ids) else cardinality(r.connection_ids) end),null,null);
 end if;
 return true;
end $multi$;
revoke all on function public.diffusion_rule_toggle_multi(uuid,uuid,boolean,uuid[])
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_rule_toggle_multi(uuid,uuid,boolean,uuid[]) to authenticated;

create or replace function public.diffusion_rule_toggle(p_team uuid,p_id uuid,p_enabled boolean,p_connection uuid default null)
returns boolean language plpgsql security definer set search_path='' as $compat$
begin
 return public.diffusion_rule_toggle_multi(p_team,p_id,p_enabled,
  case when p_connection is null then null::uuid[] else array[p_connection] end);
end $compat$;
revoke all on function public.diffusion_rule_toggle(uuid,uuid,boolean,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_rule_toggle(uuid,uuid,boolean,uuid) to authenticated;

create or replace function private.diffusion_rule_publish_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare r record; se public.series%rowtype; vo public.volumes%rowtype;
  kind text; source uuid; cover text; title text; message text; plan uuid;
  dedupe text;
begin
 if new.status::text <> 'published' then return new; end if;
 if tg_op='UPDATE' and old.status::text = 'published' then return new; end if;
 if new.deleted_at is not null then return new; end if;
 if tg_table_name='volumes' then
   kind:='volume';
   if new.published_at is not null and new.published_at>now() then return new; end if;
   vo:=new;
 else
   kind:='chapter';
   if new.publish_at is not null and new.publish_at>now() then return new; end if;
   if not (coalesce(new.access,'public')='public' or (new.access_until is not null and new.access_until<=now()))
   then return new; end if;
   select * into vo from public.volumes v
    where v.id=new.volume_id or (new.volume_id is null and v.series_id=new.series_id and v.num=new.vol)
    order by (v.id=new.volume_id) desc limit 1;
 end if;
 source:=new.id;
 if vo.id is null or vo.status<>'published' or vo.deleted_at is not null
   or (vo.published_at is not null and vo.published_at>now())
   or not (coalesce(vo.access,'public')='public' or (vo.access_until is not null and vo.access_until<=now()))
 then return new; end if;
 select * into se from public.series where id=new.series_id;
 if not found or se.published is distinct from true or se.archived_at is not null
   or se.translation_status in ('abandoned','withdrawn')
   or not (coalesce(se.access,'public')='public' or (se.access_until is not null and se.access_until<=now()))
 then return new; end if;
 cover:=vo.cover_path;
 if cover is null or length(cover)>450 or cover !~ '^[A-Za-z0-9_./-]+$'
   or cover like '/%' or position('..' in cover)>0
 then return new; end if;
 title:=left(se.title||case when kind='volume' then ' · Volumen '||vo.num
  else ' · Capítulo '||new.num end,256);
 for r in select rule.id,rule.team_id,dest.id as connection_id,rule.created_by,
     rule.delay_minutes,rule.mode,c.provider
   from public.diffusion_rules rule
   cross join lateral unnest(rule.connection_ids) as dest(id)
   join public.diffusion_connections c on c.id=dest.id and c.status='active'
   where rule.enabled and rule.enabled_at<=now()
     and rule.event_kind=kind||'.public'
     and (rule.team_id is null or rule.team_id=se.team_id)
     and c.team_id is not distinct from rule.team_id
     and (rule.team_id is null or exists(
       select 1 from public.team_members m where m.team_id=rule.team_id and m.user_id=rule.created_by))
   order by rule.id
 loop
   -- Un envío manual confirmado prevalece sobre una automatización futura.
   dedupe:=r.provider||':manual:'||r.connection_id||':'||kind||':'||source;
   if exists(select 1 from public.diffusion_events where dedupe_key=dedupe)
    or exists(select 1 from public.diffusion_scheduled_announcements s
       where s.connection_id=r.connection_id and s.source_type=kind and s.source_id=source
         and s.status in ('planned','processing','sent','unknown'))
   then continue; end if;
   if exists(select 1 from private.diffusion_rule_occurrences o
      where o.rule_id=r.id and o.source_type=kind and o.source_id=source and o.connection_id=r.connection_id)
   then continue; end if;
   message:=case when kind='volume' then '📖 Nuevo volumen publicado en El Obi del Lector.'
                else '✨ Nuevo capítulo publicado en El Obi del Lector.' end;
   begin
     insert into private.diffusion_rule_occurrences(rule_id,source_type,source_id,connection_id)
       values(r.id,kind,source,r.connection_id);
     insert into public.diffusion_scheduled_announcements
       (team_id,connection_id,provider,source_type,source_id,series_id,
        title_snapshot,message,scheduled_at,status,delivery_mode,created_by,rule_id)
       values(r.team_id,r.connection_id,r.provider,kind,source,se.id,
         title,message,now()+make_interval(mins=>r.delay_minutes),'planned',
         case when r.mode='automatic' then 'automatic' else 'manual' end,
         r.created_by,r.id)
       returning id into plan;
     update private.diffusion_rule_occurrences set plan_id=plan
       where rule_id=r.id and source_type=kind and source_id=source and connection_id=r.connection_id;
   exception when unique_violation then
     -- Conflicto con otra regla / publicación concurrente: sin duplicar.
     null;
   end;
 end loop;
 return new;
exception when others then
 -- Una caída del módulo social NO debe impedir publicar una obra.
 raise warning 'Diffusion rule event skipped: trigger processing error';
 return new;
end $$;

create or replace function private.diffusion_prelaunch_announced() returns trigger
language plpgsql security definer set search_path='' as $preview$
declare se public.series%rowtype; r record; plan uuid; msg text; dedupe text;
begin
 if new.announce_prelaunch is distinct from true or new.status<>'scheduled'
  or new.deleted_at is not null or new.published_at is null or new.published_at<=now()
  or new.access<>'public' then return new; end if;
 if tg_op='UPDATE' and old.announce_prelaunch is true then return new; end if;
 select * into se from public.series where id=new.series_id;
 if not found or se.published is distinct from false or se.adult is true
  or se.archived_at is not null or se.access<>'public'
  or se.translation_status in ('abandoned','withdrawn')
  or not exists(select 1 from public.teams t where t.id=se.team_id and t.status<>'Proyecto privado')
  or se.cover_path is null or se.cover_path!~'^[A-Za-z0-9_./-]+$'
  or se.cover_path like '/%' or position('..' in se.cover_path)>0
  or se.slug!~'^[A-Za-z0-9_-]+$'
 then return new; end if;
 for r in select rule.id,rule.team_id,dest.id as connection_id,rule.created_by,rule.delay_minutes,rule.mode,c.provider
  from public.diffusion_rules rule
  cross join lateral unnest(rule.connection_ids) as dest(id)
  join public.diffusion_connections c on c.id=dest.id and c.status='active'
  where rule.enabled and rule.enabled_at<=now() and rule.event_kind='prelaunch.announced'
   and (rule.team_id is null or rule.team_id=se.team_id)
   and c.team_id is not distinct from rule.team_id
   and (rule.team_id is null or exists(select 1 from public.team_members m
     where m.team_id=rule.team_id and m.user_id=rule.created_by))
  order by rule.id
 loop
  dedupe:=r.provider||':manual:'||r.connection_id||':series:'||se.id;
  if exists(select 1 from public.diffusion_events e where e.dedupe_key=dedupe)
    or exists(select 1 from public.diffusion_scheduled_announcements s
      where s.connection_id=r.connection_id and s.source_type='series' and s.source_id=se.id
      and s.status in ('planned','processing','sent','unknown'))
    or exists(select 1 from private.diffusion_rule_occurrences o
      where o.rule_id=r.id and o.source_type='series' and o.source_id=se.id and o.connection_id=r.connection_id)
   then continue; end if;
  msg:='📚 Nueva obra anunciada: '||left(se.title,180)||
    '. 🔒 Primer vistazo disponible. El estreno será el '||
    to_char(new.published_at at time zone 'America/Monterrey','DD/MM/YYYY a las HH24:MI')||
    ' (Monterrey).';
  begin
   insert into private.diffusion_rule_occurrences(rule_id,source_type,source_id,connection_id)
     values(r.id,'series',se.id,r.connection_id);
   insert into public.diffusion_scheduled_announcements(
      team_id,connection_id,provider,source_type,source_id,series_id,
      title_snapshot,message,scheduled_at,status,delivery_mode,created_by,rule_id,prelaunch_volume_id)
    values(r.team_id,r.connection_id,r.provider,'series',se.id,se.id,
      left(se.title,256),left(msg,700),now()+make_interval(mins=>r.delay_minutes),'planned',
      case when r.mode='automatic' then 'automatic' else 'manual' end,
      r.created_by,r.id,new.id)
    returning id into plan;
   update private.diffusion_rule_occurrences set plan_id=plan
    where rule_id=r.id and source_type='series' and source_id=se.id and connection_id=r.connection_id;
  exception when unique_violation then null;
  end;
 end loop;
 return new;
exception when others then
 raise warning 'Diffusion prelaunch event skipped: trigger processing error';
 return new;
end $preview$;

create or replace function public.diffusion_4b_claim()
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare s public.diffusion_scheduled_announcements%rowtype;
 c public.diffusion_connections%rowtype;
 se public.series%rowtype; vo public.volumes%rowtype; ch public.chapters%rowtype;
 cover text; title text; descr text; target text; payload jsonb;
 dedupe text; existing uuid; current_status text; new_ev uuid; new_job uuid;
 reason text; is_preview boolean:=false; approved_preview boolean:=false;
begin
 select * into s from public.diffusion_scheduled_announcements
  where status='planned' and delivery_mode='automatic' and scheduled_at<=now()
  order by scheduled_at,id for update skip locked limit 1;
 if not found then return null; end if;
 is_preview:=s.prelaunch_volume_id is not null;
 if is_preview and (s.source_type <> 'series' or s.source_id<>s.series_id or s.rule_id is null) then
  reason:='preview_source_mismatch'; end if;

 select * into c from public.diffusion_connections where id=s.connection_id;
 if not found or c.status<>'active' or c.provider<>s.provider
   or c.provider not in ('discord','telegram')
   or c.team_id is distinct from s.team_id
 then reason:='destination_unavailable'; end if;
 select * into se from public.series where id=s.series_id;
 if not found or (not is_preview and se.published is distinct from true)
   or (is_preview and se.published is distinct from false) or se.archived_at is not null
   or coalesce(se.translation_status,'') in ('abandoned','withdrawn')
   or (s.team_id is not null and se.team_id<>s.team_id)
   or not (coalesce(se.access,'public')='public' or coalesce(se.access_until<=now(),false))
   or se.slug !~ '^[A-Za-z0-9_-]+$'
 then reason:='work_not_public'; end if;
 if is_preview and reason is null then
  select * into vo from public.volumes v where v.id=s.prelaunch_volume_id
    and v.series_id=s.series_id;
  select exists(
   select 1 from public.diffusion_rules rule
   join public.diffusion_connections active_conn on active_conn.id=s.connection_id
   join public.teams t on t.id=se.team_id
   where rule.id=s.rule_id and rule.enabled and rule.event_kind='prelaunch.announced'
    and rule.team_id is not distinct from s.team_id
    and s.connection_id=any(rule.connection_ids)
    and active_conn.team_id is not distinct from s.team_id
    and active_conn.status='active'
    and t.status <> 'Proyecto privado'
  ) into approved_preview;
  if not approved_preview or se.adult is true or se.access<>'public'
   or vo.id is null or vo.announce_prelaunch is distinct from true
   or vo.status<>'scheduled' or vo.deleted_at is not null
   or vo.access<>'public' or vo.published_at is null or vo.published_at<=now()
   or not (coalesce(se.translation_status,'') not in ('abandoned','withdrawn'))
  then reason:='prelaunch_unavailable'; end if;
 end if;
 if reason is null and s.rule_id is not null and not exists (
   select 1 from public.diffusion_rules rule
   where rule.id=s.rule_id and rule.enabled
    and rule.team_id is not distinct from s.team_id
    and s.connection_id=any(rule.connection_ids)
 ) then reason:='rule_or_destination_inactive'; end if;
 if reason is null and s.source_type='series' and s.source_id<>se.id
 then reason:='source_mismatch'; end if;
 if reason is null and s.team_id is not null and not exists (
  select 1 from public.team_members m where m.team_id=s.team_id and m.user_id=s.created_by
 ) then reason:='author_no_longer_member'; end if;

 if reason is null and s.source_type in ('volume','chapter') then
  if s.source_type='volume' then
    select * into vo from public.volumes where id=s.source_id and series_id=s.series_id;
  else
    select * into ch from public.chapters where id=s.source_id and series_id=s.series_id;
    if found then
      select * into vo from public.volumes v
      where v.id=ch.volume_id
        or (ch.volume_id is null and v.series_id=s.series_id and v.num=ch.vol)
      order by (v.id=ch.volume_id) desc limit 1;
    end if;
  end if;
  if vo.id is null or vo.series_id<>s.series_id or vo.deleted_at is not null
    or vo.status<>'published'
    or (vo.published_at is not null and vo.published_at>now())
    or not (coalesce(vo.access,'public')='public' or coalesce(vo.access_until<=now(),false))
  then reason:='volume_not_public'; end if;
  if reason is null and s.source_type='chapter' and (
    ch.id is null or ch.deleted_at is not null or ch.status::text<>'published'
    or (ch.publish_at is not null and ch.publish_at>now())
    or not (coalesce(ch.access,'public')='public' or coalesce(ch.access_until<=now(),false))
  ) then reason:='chapter_not_public'; end if;
 end if;

 if reason is null then
  cover:=case when is_preview then coalesce(se.cover_path,vo.cover_path) when s.source_type='series' then se.cover_path else vo.cover_path end;
  if cover is null or length(cover)>450 or cover !~ '^[A-Za-z0-9_./-]+$'
     or cover like '/%' or position('..' in cover)>0 then reason:='cover_unavailable'; end if;
 end if;
 if reason is not null then
  update public.diffusion_scheduled_announcements
    set status='blocked',last_error=reason,updated_at=now()
    where id=s.id;
  return jsonb_build_object('skipped',true);
 end if;
 -- El mismo origen/destino jamás se publica dos veces, manual o automático.
 dedupe:=s.provider||':manual:'||s.connection_id||':'||s.source_type||':'||s.source_id;
 select e.id into existing from public.diffusion_events e where e.dedupe_key=dedupe;
 if existing is not null then
  select j.status into current_status from public.diffusion_jobs j
   where j.event_id=existing and j.connection_id=s.connection_id
   order by j.created_at desc limit 1;
  update public.diffusion_scheduled_announcements
   set status=case when current_status='sent' then 'sent' else 'unknown' end,
      last_error=case when current_status='sent' then null else 'already_claimed' end,
      updated_at=now() where id=s.id;
  return jsonb_build_object('skipped',true);
 end if;
 if c.last_announcement_at is not null
    and c.last_announcement_at>now()-interval '15 seconds'
 then return null; end if;
 title:=case when is_preview then se.title||' · Próximo estreno' else case s.source_type when 'series' then se.title
    when 'volume' then se.title||' · Volumen '||vo.num
    else se.title||' · Capítulo '||ch.num end end;
 descr:=case when is_preview then 'Próximo estreno anunciado para '||to_char(vo.published_at at time zone 'America/Monterrey','DD/MM/YYYY HH24:MI')||' (hora de Monterrey). Primer vistazo disponible; lectura bloqueada.' else case s.source_type when 'series' then
     left(regexp_replace(coalesce(se.synopsis,''),'[[:space:]]+',' ','g'),300)
   when 'volume' then case when vo.synopsis_spoiler
     then 'Nuevo volumen disponible en El Obi'
     else left(regexp_replace(coalesce(vo.synopsis,''),'[[:space:]]+',' ','g'),300) end
   else se.title||' · Volumen '||vo.num end end;
 target:='https://elobidellector.com/'||
   case when s.source_type='chapter' then 'leer/'||se.slug||'/'||ch.num
     else 'serie/'||se.slug end;
 payload:=jsonb_build_object('title',left(title,256),'description',coalesce(descr,''),
   'url',target,'cover_path',cover,'message',s.message,'provider',s.provider);
 insert into public.diffusion_events(team_id,kind,source_type,source_id,dedupe_key,safe_payload)
 values(s.team_id,s.provider||'.scheduled',s.source_type,s.source_id,dedupe,payload)
 returning id into new_ev;
 insert into public.diffusion_jobs(team_id,event_id,connection_id,scheduled_at,status,attempts,lease_until)
 values(s.team_id,new_ev,s.connection_id,now(),'leased',1,now()+interval '3 minutes')
 returning id into new_job;
 update public.diffusion_scheduled_announcements
 set status='processing',dispatch_job_id=new_job,lease_until=now()+interval '3 minutes',
  last_error=null,updated_at=now() where id=s.id;
 update public.diffusion_connections set last_announcement_at=now(),updated_at=now()
 where id=c.id;
 return jsonb_build_object('plan_id',s.id,'job_id',new_job,'connection_id',s.connection_id,
   'provider',s.provider,'payload',payload);
exception when unique_violation then
 -- No segundo claim si otro cliente creó el evento al mismo tiempo.
 update public.diffusion_scheduled_announcements set status='unknown',
  last_error='concurrent_claim',updated_at=now() where id=s.id;
 return jsonb_build_object('skipped',true);
end $fn$;


-- Revisar cada anuncio de preestreno de cada canal, no solo el canal principal.
-- Aprobación editorial de preestrenos (ejecución posterior a la migración 4D).
create or replace function public.diffusion_prelaunch_approve(p_plan uuid)
returns boolean language plpgsql security definer set search_path='' as $approve$
declare p public.diffusion_scheduled_announcements%rowtype;
begin
 if auth.uid() is null or p_plan is null then raise exception 'forbidden'; end if;
 select * into p from public.diffusion_scheduled_announcements s
 where s.id=p_plan and s.status='planned' and s.delivery_mode='manual'
   and s.prelaunch_volume_id is not null and s.rule_id is not null for update;
 if not found then raise exception 'not_found_or_not_pending'; end if;
 if not private.diffusion_scope_ok(p.team_id,'diffusion_publish')
 or not private.diffusion_scope_ok(p.team_id,'diffusion_schedule')
 or not exists (select 1 from public.diffusion_rules r
   where r.id=p.rule_id and r.enabled and r.mode='team_review'
   and r.event_kind='prelaunch.announced' and p.connection_id=any(r.connection_ids))
 then raise exception 'forbidden'; end if;
 update public.diffusion_scheduled_announcements
 set delivery_mode='automatic',updated_at=now() where id=p.id;
 return true;
end $approve$;
revoke all on function public.diffusion_prelaunch_approve(uuid)
from public,anon,authenticated,service_role;
grant execute on function public.diffusion_prelaunch_approve(uuid) to authenticated;

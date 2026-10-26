-- Fase 4C: activar reglas de publicaciones reales (volumen y capítulo).
-- Sin retropublicaciones: solo transiciones a 'published' ocurridas tras activar cada regla.
-- Los eventos sin un disparador verificable NO pueden activarse.

alter table public.diffusion_rules
  add column connection_id uuid references public.diffusion_connections(id) on delete set null,
  add column enabled_at timestamptz;
alter table public.diffusion_scheduled_announcements
  add column rule_id uuid references public.diffusion_rules(id) on delete set null;

create table private.diffusion_rule_occurrences(
  rule_id uuid not null references public.diffusion_rules(id) on delete cascade,
  source_type text not null check(source_type in ('volume','chapter')),
  source_id uuid not null,
  plan_id uuid unique references public.diffusion_scheduled_announcements(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(rule_id,source_type,source_id)
);
revoke all on private.diffusion_rule_occurrences from public,anon,authenticated,service_role;
alter table private.diffusion_rule_occurrences enable row level security;

create function public.diffusion_rule_toggle(
 p_team uuid,p_id uuid,p_enabled boolean,p_connection uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.diffusion_rules%rowtype; c public.diffusion_connections%rowtype;
begin
 if auth.uid() is null or p_id is null or p_enabled is null
   or not private.diffusion_scope_ok(p_team,'diffusion_manage')
   or not private.diffusion_scope_ok(p_team,'diffusion_publish')
   or not private.diffusion_scope_ok(p_team,'diffusion_schedule')
 then raise exception 'forbidden'; end if;
 select * into r from public.diffusion_rules
  where id=p_id and team_id is not distinct from p_team for update;
 if not found then raise exception 'rule_not_found'; end if;
 if p_enabled then
   if r.event_kind not in ('chapter.public','volume.public')
   then raise exception 'event_not_automatable_yet'; end if;
   select * into c from public.diffusion_connections
    where id=coalesce(p_connection,r.connection_id)
      and team_id is not distinct from r.team_id
      and provider in ('discord','telegram') and status='active';
   if not found then raise exception 'destination_unavailable'; end if;
   -- La activación nunca publica históricos: solo las próximas transiciones.
   update public.diffusion_rules
   set enabled=true,connection_id=c.id,enabled_at=case when enabled then enabled_at else now() end,
       updated_at=now() where id=r.id;
 else
   update public.diffusion_rules set enabled=false,enabled_at=null,updated_at=now()
    where id=r.id;
   -- Los planes NO iniciados que originó la regla se cancelan al desactivar.
   update public.diffusion_scheduled_announcements
    set status='cancelled',last_error='rule_paused',updated_at=now()
    where rule_id=r.id and status='planned';
 end if;
 if p_team is not null then
   perform private.log(p_team,'edicion',
    case when p_enabled then 'Activó una automatización de Difusión'
         else 'Pausó una automatización de Difusión' end,
    jsonb_build_object('rule_id',r.id,'enabled',p_enabled),null,null);
 end if;
 return true;
end $$;
revoke all on function public.diffusion_rule_toggle(uuid,uuid,boolean,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_rule_toggle(uuid,uuid,boolean,uuid) to authenticated;

-- Las reglas se materializan al publicarse (INSERT o UPDATE status).
-- Nunca se hace HTTP dentro de una transacción de publicación.
create function private.diffusion_rule_publish_event()
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
 for r in select rule.id,rule.team_id,rule.connection_id,rule.created_by,
     rule.delay_minutes,rule.mode,c.provider
   from public.diffusion_rules rule join public.diffusion_connections c
     on c.id=rule.connection_id and c.status='active'
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
      where o.rule_id=r.id and o.source_type=kind and o.source_id=source)
   then continue; end if;
   message:=case when kind='volume' then '📖 Nuevo volumen publicado en El Obi del Lector.'
                else '✨ Nuevo capítulo publicado en El Obi del Lector.' end;
   begin
     insert into private.diffusion_rule_occurrences(rule_id,source_type,source_id)
       values(r.id,kind,source);
     insert into public.diffusion_scheduled_announcements
       (team_id,connection_id,provider,source_type,source_id,series_id,
        title_snapshot,message,scheduled_at,status,delivery_mode,created_by,rule_id)
       values(r.team_id,r.connection_id,r.provider,kind,source,se.id,
         title,message,now()+make_interval(mins=>r.delay_minutes),'planned',
         case when r.mode='automatic' then 'automatic' else 'manual' end,
         r.created_by,r.id)
       returning id into plan;
     update private.diffusion_rule_occurrences set plan_id=plan
       where rule_id=r.id and source_type=kind and source_id=source;
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
revoke all on function private.diffusion_rule_publish_event() from public,anon,authenticated,service_role;
create trigger diffusion_4c_volume_published after insert or update of status
 on public.volumes for each row execute function private.diffusion_rule_publish_event();
create trigger diffusion_4c_chapter_published after insert or update of status
 on public.chapters for each row execute function private.diffusion_rule_publish_event();
comment on column public.diffusion_rules.enabled is
 'Fase 4C: activación opt-in por un destino concreto, solo chapter.public y volume.public.';

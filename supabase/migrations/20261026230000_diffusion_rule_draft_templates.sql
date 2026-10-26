-- Asociación explícita, por equipo, entre borradores y reglas futuras.
-- Solo eventos FUTUROS y reglas inactivas cambian de plantilla; conservar deduplicación y políticas existentes.
alter table public.diffusion_rules add column if not exists template_campaign_id uuid
  references public.diffusion_campaigns(id) on delete set null;
alter table public.diffusion_rules add column if not exists template_text text
  check (template_text is null or char_length(template_text)<=2000);
comment on column public.diffusion_rules.template_text is
  'Copia del mensaje del borrador al asignarlo a una regla inactiva. Cambios posteriores al borrador no afectan reglas activas.';

create or replace function public.diffusion_rule_template_set(
 p_team uuid,p_rule uuid,p_campaign uuid
) returns boolean language plpgsql security definer set search_path='' as $save$
declare body_to_use text;
begin
 if auth.uid() is null or p_rule is null
   or not private.diffusion_scope_ok(p_team,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 if p_campaign is not null then
   select c.body into body_to_use from public.diffusion_campaigns c
     where c.id=p_campaign and c.team_id is not distinct from p_team and c.status='draft';
   if not found or btrim(coalesce(body_to_use,''))=''
     or length(body_to_use)>2000
   then raise exception 'invalid_template_or_scope'; end if;
 end if;
 update public.diffusion_rules set template_campaign_id=p_campaign,template_text=body_to_use,
   updated_at=now()
   where id=p_rule and team_id is not distinct from p_team and enabled=false;
 if not found then raise exception 'rule_not_found_or_active'; end if;
 if p_team is not null then
    perform private.log(p_team,'edicion','Asoció borrador a regla de Difusión',
      jsonb_build_object('rule_id',p_rule,'uses_draft',p_campaign is not null),null,null);
 end if;
 return true;
end $save$;
revoke all on function public.diffusion_rule_template_set(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.diffusion_rule_template_set(uuid,uuid,uuid) to authenticated;

-- No se ejecuta HTML/código. Variables no reconocidas o datos faltantes
-- devuelven NULL: el disparador utiliza el mensaje predeterminado, sin publicar llaves crudas.
create or replace function private.diffusion_render_rule_template(
 p_template text,p_novela text,p_equipo text,p_sinopsis text,p_autor text
) returns text language plpgsql immutable set search_path='' as $tpl$
declare result text; token text; value text;
begin
 result:=coalesce(p_template,'');
 if btrim(result)='' or length(result)>2000 then return null; end if;
 for token in select m[1] from regexp_matches(result,'\{\{([^{}]{1,48})\}\}','g') as m loop
   value:=case lower(btrim(token))
     when 'novela' then p_novela
     when 'equipo_traductor' then p_equipo
     when 'equipo traductor' then p_equipo
     when 'equpo traductor' then p_equipo
     when 'equipo_productor' then p_equipo
     when 'sinopsis' then p_sinopsis
     when 'autor' then p_autor
     else null end;
   if btrim(coalesce(value,''))='' then return null; end if;
   result:=replace(result,'{{'||token||'}}',value);
 end loop;
 if position('{{' in result)>0 or position('}}' in result)>0
    or btrim(result)='' or char_length(result)>700 then return null; end if;
 return result;
end $tpl$;

-- Reutilizar fielmente los disparadores existentes: filtros de publicación,
-- accesos, portadas, deduplicación, cola e integridad del evento intactos.
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
     rule.delay_minutes,rule.mode,c.provider,rule.template_campaign_id,rule.template_text
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
   if r.template_campaign_id is not null then
     message:=coalesce(private.diffusion_render_rule_template(r.template_text,se.title,
        coalesce((select t.name from public.teams t where t.id=se.team_id),'El Obi del Lector'),
        se.synopsis,se.author),message);
   end if;
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
 for r in select rule.id,rule.team_id,dest.id as connection_id,rule.created_by,rule.delay_minutes,rule.mode,c.provider,rule.template_campaign_id,rule.template_text
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
  if r.template_campaign_id is not null then
    msg:=coalesce(private.diffusion_render_rule_template(r.template_text,se.title,
        coalesce((select t.name from public.teams t where t.id=se.team_id),'El Obi del Lector'),
        se.synopsis,se.author),msg);
  end if;
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


revoke all on function private.diffusion_render_rule_template(text,text,text,text,text)
  from public,anon,authenticated,service_role;

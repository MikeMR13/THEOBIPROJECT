-- Fase 2b: anuncios editoriales MANUALES. No habilita cron ni despachador.
alter table public.diffusion_connections add column if not exists last_announcement_at timestamptz;

create or replace function private.diffusion_manual_discord_data(
  p_connection uuid, p_kind text, p_source uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare conn record; se record; vo record; ch record;
  ttl text; msg text; descr text; cover text; link text;
begin
 if auth.uid() is null or p_kind not in ('series','volume','chapter') or p_source is null
 then raise exception 'forbidden'; end if;
 select team_id,status into conn from public.diffusion_connections
   where id=p_connection and provider='discord';
 if not found or conn.status<>'active'
   or not private.diffusion_scope_ok(conn.team_id,'diffusion_publish')
 then raise exception 'forbidden'; end if;
 if p_kind='series' then
   select * into se from public.series where id=p_source;
   if not found then raise exception 'not_public'; end if;
 elsif p_kind='volume' then
   select * into vo from public.volumes where id=p_source;
   if not found then raise exception 'not_public'; end if;
   select * into se from public.series where id=vo.series_id;
 else
   select * into ch from public.chapters where id=p_source;
   if not found then raise exception 'not_public'; end if;
   select * into se from public.series where id=ch.series_id;
   select * into vo from public.volumes
     where id=ch.volume_id or (ch.volume_id is null and series_id=ch.series_id and num=ch.vol)
     order by (id=ch.volume_id) desc limit 1;
 end if;
 if se.id is null or (conn.team_id is not null and conn.team_id<>se.team_id)
    or se.published is distinct from true or se.archived_at is not null
    or coalesce(se.translation_status,'') in ('abandoned','withdrawn')
    or not (coalesce(se.access,'public')='public' or se.access_until<=now())
    or se.slug !~ '^[A-Za-z0-9_-]+$'
 then raise exception 'not_public'; end if;
 if p_kind in ('volume','chapter') then
   if vo.id is null or vo.deleted_at is not null or vo.status<>'published'
     or (vo.published_at is not null and vo.published_at>now())
     or not (coalesce(vo.access,'public')='public' or vo.access_until<=now())
   then raise exception 'not_public'; end if;
 end if;
 if p_kind='chapter' then
   if ch.deleted_at is not null or ch.status::text<>'published'
     or (ch.publish_at is not null and ch.publish_at>now())
     or not (coalesce(ch.access,'public')='public' or ch.access_until<=now())
     or ch.num is null
   then raise exception 'not_public'; end if;
   ttl:=left(se.title||' · Capítulo '||ch.num||' — '||coalesce(ch.title,''),256);
   msg:='📖 Nuevo capítulo: '||left(coalesce(nullif(ch.title,''),'Capítulo '||ch.num),160);
   descr:=left(se.title||' · Volumen '||vo.num,300);
   cover:=coalesce(nullif(vo.cover_path,''),se.cover_path);
   link:='https://elobidellector.com/leer/'||se.slug||'/'||ch.num;
 elsif p_kind='volume' then
   ttl:=left(se.title||' · Volumen '||vo.num,256);
   msg:='📚 Nuevo volumen '||vo.num||' de '||left(se.title,160)||' disponible';
   descr:=case when vo.synopsis_spoiler then 'Nuevo volumen disponible en El Obi'
     else left(regexp_replace(coalesce(vo.synopsis,''),'[[:space:]]+',' ','g'),300) end;
   cover:=coalesce(nullif(vo.cover_path,''),se.cover_path);
   link:='https://elobidellector.com/serie/'||se.slug;
 else
   ttl:=left(se.title,256);
   msg:='✨ Nueva obra en El Obi: '||left(se.title,170);
   descr:=left(regexp_replace(coalesce(se.synopsis,''),'[[:space:]]+',' ','g'),300);
   cover:=se.cover_path;
   link:='https://elobidellector.com/serie/'||se.slug;
 end if;
 return jsonb_build_object('kind',p_kind,'source_id',p_source,
   'title',ttl,'message',left(msg,700),'description',coalesce(descr,''),
   'cover_path',cover,'url',link);
end $fn$;
revoke all on function private.diffusion_manual_discord_data(uuid,text,uuid)
  from public,anon,authenticated,service_role;

create or replace function public.diffusion_discord_announcement_preview(
 p_connection uuid,p_kind text,p_source uuid
) returns jsonb language sql stable security definer set search_path='' as $fn$
 select private.diffusion_manual_discord_data(p_connection,p_kind,p_source)
$fn$;

-- Transacción única. La llave del evento bloquea doble clic y repeticiones.
create or replace function public.diffusion_discord_announcement_claim(
 p_connection uuid,p_kind text,p_source uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare payload jsonb; cid uuid; team uuid; ev uuid; job uuid; dedupe text;
begin
 payload:=private.diffusion_manual_discord_data(p_connection,p_kind,p_source);
 select id,team_id into cid,team from public.diffusion_connections
   where id=p_connection and provider='discord' and status='active' for update;
 if not found then raise exception 'forbidden'; end if;
 dedupe:='discord:manual:'||cid||':'||p_kind||':'||p_source;
 if exists(select 1 from public.diffusion_events where dedupe_key=dedupe)
 then raise exception 'already_announced'; end if;
 update public.diffusion_connections set last_announcement_at=now(),updated_at=now()
   where id=cid and (last_announcement_at is null
   or last_announcement_at<=now()-interval '15 seconds');
 if not found then raise exception 'rate_limited'; end if;
 insert into public.diffusion_events(team_id,kind,source_type,source_id,dedupe_key,safe_payload)
   values(team,'discord.manual',p_kind,p_source,dedupe,payload)
   returning id into ev;
 insert into public.diffusion_jobs(team_id,event_id,connection_id,scheduled_at,status,attempts,lease_until)
   values(team,ev,cid,now(),'leased',1,now()+interval '2 minutes')
   returning id into job;
 return payload||jsonb_build_object('job_id',job);
exception when unique_violation then raise exception 'already_announced';
end $fn$;

-- Service role únicamente; un envío incierto no se reintenta sin inspección.
create or replace function public.diffusion_discord_announcement_complete(
 p_job uuid,p_success boolean,p_post_id text default null
) returns void language plpgsql volatile security definer set search_path='' as $fn$
declare changed uuid;
begin
 update public.diffusion_jobs set
  status=case when p_success then 'sent' else 'unknown' end,
  provider_post_id=case when p_success then left(p_post_id,120) else null end,
  lease_until=null,
  last_error=case when p_success then null else 'delivery_unconfirmed' end
 where id=p_job and status='leased' and connection_id in
   (select id from public.diffusion_connections where provider='discord')
 returning id into changed;
 if changed is null then raise exception 'invalid_job'; end if;
 insert into public.diffusion_attempts(job_id,finished_at,result)
   values(p_job,now(),case when p_success then 'sent' else 'unknown' end);
end $fn$;

revoke all on function public.diffusion_discord_announcement_preview(uuid,text,uuid),
 public.diffusion_discord_announcement_claim(uuid,text,uuid),
 public.diffusion_discord_announcement_complete(uuid,boolean,text)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_discord_announcement_preview(uuid,text,uuid),
 public.diffusion_discord_announcement_claim(uuid,text,uuid) to authenticated;
grant execute on function public.diffusion_discord_announcement_complete(uuid,boolean,text)
 to service_role;

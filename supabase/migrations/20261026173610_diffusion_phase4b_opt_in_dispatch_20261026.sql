-- El Obi · Difusión 4B: despacho condicionado, sin retries automáticos.
-- CANDIDATO: aplicar con MCP migration SOLO tras QA aislada y Edge deploy.
-- 4A permanece 'manual'; las conexiones existentes NO se envían por sí solas.

alter table public.diffusion_scheduled_announcements
  add column delivery_mode text not null default 'manual'
    check (delivery_mode in ('manual','automatic')),
  add column dispatch_job_id uuid references public.diffusion_jobs(id),
  add column lease_until timestamptz,
  add column last_error text;
alter table public.diffusion_scheduled_announcements
  drop constraint diffusion_scheduled_announcements_status_check;
alter table public.diffusion_scheduled_announcements
  add constraint diffusion_scheduled_announcements_status_check
  check (status in ('planned','processing','sent','cancelled','unknown','blocked'));
create index diffusion_4b_due_idx
 on public.diffusion_scheduled_announcements(scheduled_at,id)
 where status='planned' and delivery_mode='automatic';
comment on table public.diffusion_scheduled_announcements is
 'Agenda 4A manual por defecto; 4B automática únicamente con consentimiento por anuncio. Despacho sin reintentos ciegos.';

-- Mantener la firma 4A intacta: los clientes existentes siguen siendo MANUALES.
create function public.diffusion_schedule_create(
 p_connection uuid,p_kind text,p_source uuid,p_message text,p_at timestamptz,
 p_delivery text
) returns uuid language plpgsql volatile security definer set search_path='' as $fn$
declare created uuid;
begin
 if p_delivery not in ('manual','automatic') then raise exception 'invalid_delivery_mode'; end if;
 -- Reutiliza todos los controles vigentes 4A: ámbito, permisos y publicación.
 created:=public.diffusion_schedule_create(p_connection,p_kind,p_source,p_message,p_at);
 update public.diffusion_scheduled_announcements
  set delivery_mode=p_delivery,updated_at=now() where id=created;
 return created;
end $fn$;
revoke all on function public.diffusion_schedule_create(uuid,text,uuid,text,timestamptz,text)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_schedule_create(uuid,text,uuid,text,timestamptz,text)
 to authenticated;

-- Tokens efímeros de una sola utilización. Nunca guardar bearer permanente.
create table private.diffusion_dispatch_tickets (
 id uuid primary key default gen_random_uuid(),
 token_digest bytea not null unique,
 expires_at timestamptz not null,
 used_at timestamptz,
 created_at timestamptz not null default now()
);
revoke all on private.diffusion_dispatch_tickets from public,anon,authenticated,service_role;
alter table private.diffusion_dispatch_tickets enable row level security;

create function public.diffusion_4b_consume_ticket(p_ticket text)
returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare changed uuid;
begin
 if p_ticket is null or p_ticket !~ '^[a-f0-9]{64}$' then return false; end if;
 update private.diffusion_dispatch_tickets
   set used_at=now()
 where token_digest=extensions.digest(p_ticket,'sha256')
   and used_at is null and expires_at>now()
 returning id into changed;
 return changed is not null;
end $fn$;
revoke all on function public.diffusion_4b_consume_ticket(text)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_4b_consume_ticket(text) to service_role;

-- El cron NO llama Edge Function salvo que exista un plan automático vencido.
-- Token aleatorio de un solo uso: no hay secretos duraderos en cron.job.command.
create function private.diffusion_4b_tick() returns boolean
language plpgsql volatile security definer set search_path='' as $fn$
declare ticket text; req bigint;
begin
 if not pg_try_advisory_xact_lock(4826,4242) then return false; end if;
 update public.diffusion_scheduled_announcements
   set status='unknown',last_error='lease_expired',lease_until=null,updated_at=now()
 where status='processing' and delivery_mode='automatic' and lease_until < now();
 -- Marcar también el job sin reintentarlo: el servidor pudo haber enviado.
 update public.diffusion_jobs j set status='unknown',lease_until=null,last_error='lease_expired'
 where j.status='leased'
   and exists(select 1 from public.diffusion_scheduled_announcements s
     where s.dispatch_job_id=j.id and s.status='unknown' and s.last_error='lease_expired');
 if not exists(select 1 from public.diffusion_scheduled_announcements s
   where s.status='planned' and s.delivery_mode='automatic' and s.scheduled_at<=now())
 then return false; end if;
 if exists(select 1 from private.diffusion_dispatch_tickets
   where used_at is null and expires_at>now())
 then return false; end if;
 ticket:=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.diffusion_dispatch_tickets(token_digest,expires_at)
   values(extensions.digest(ticket,'sha256'),now()+interval '90 seconds');
 select net.http_post(
  url:='https://qfllthjpjuaztppvpsrk.supabase.co/functions/v1/diffusion-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','x-diffusion-ticket',ticket),
  body:='{}'::jsonb,
  timeout_milliseconds:=10000
 ) into req;
 return req is not null;
end $fn$;
revoke all on function private.diffusion_4b_tick()
 from public,anon,authenticated,service_role;

-- Un claim adquiere un único plan; nunca reintenta jobs antiguos.
-- SECURITY DEFINER controlado solo desde Edge Function con service_role.
create function public.diffusion_4b_claim()
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare s public.diffusion_scheduled_announcements%rowtype;
 c public.diffusion_connections%rowtype;
 se public.series%rowtype; vo public.volumes%rowtype; ch public.chapters%rowtype;
 cover text; title text; descr text; target text; payload jsonb;
 dedupe text; existing uuid; current_status text; new_ev uuid; new_job uuid;
 reason text;
begin
 select * into s from public.diffusion_scheduled_announcements
  where status='planned' and delivery_mode='automatic' and scheduled_at<=now()
  order by scheduled_at,id for update skip locked limit 1;
 if not found then return null; end if;

 select * into c from public.diffusion_connections where id=s.connection_id;
 if not found or c.status<>'active' or c.provider<>s.provider
   or c.provider not in ('discord','telegram')
   or c.team_id is distinct from s.team_id
 then reason:='destination_unavailable'; end if;
 select * into se from public.series where id=s.series_id;
 if not found or se.published is distinct from true or se.archived_at is not null
   or coalesce(se.translation_status,'') in ('abandoned','withdrawn')
   or (s.team_id is not null and se.team_id<>s.team_id)
   or not (coalesce(se.access,'public')='public' or coalesce(se.access_until<=now(),false))
   or se.slug !~ '^[A-Za-z0-9_-]+$'
 then reason:='work_not_public'; end if;
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
  cover:=case when s.source_type='series' then se.cover_path else vo.cover_path end;
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
 title:=case s.source_type when 'series' then se.title
    when 'volume' then se.title||' · Volumen '||vo.num
    else se.title||' · Capítulo '||ch.num end;
 descr:=case s.source_type when 'series' then
     left(regexp_replace(coalesce(se.synopsis,''),'[[:space:]]+',' ','g'),300)
   when 'volume' then case when vo.synopsis_spoiler
     then 'Nuevo volumen disponible en El Obi'
     else left(regexp_replace(coalesce(vo.synopsis,''),'[[:space:]]+',' ','g'),300) end
   else se.title||' · Volumen '||vo.num end;
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
revoke all on function public.diffusion_4b_claim()
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_4b_claim() to service_role;

create function public.diffusion_4b_complete(
 p_plan uuid,p_job uuid,p_success boolean,p_post_id text default null
) returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare changed uuid; result_status text;
begin
 if p_plan is null or p_job is null or p_success is null then return false; end if;
 result_status:=case when p_success then 'sent' else 'unknown' end;
 update public.diffusion_scheduled_announcements
 set status=result_status,lease_until=null,updated_at=now(),
   last_error=case when p_success then null else 'delivery_unconfirmed' end
 where id=p_plan and dispatch_job_id=p_job and status='processing'
 returning id into changed;
 if changed is null then return false; end if;
 update public.diffusion_jobs set status=result_status,lease_until=null,
  provider_post_id=case when p_success then left(p_post_id,120) else null end,
  last_error=case when p_success then null else 'delivery_unconfirmed' end
 where id=p_job and status='leased';
 insert into public.diffusion_attempts(job_id,finished_at,result)
 values(p_job,now(),result_status);
 return true;
end $fn$;
revoke all on function public.diffusion_4b_complete(uuid,uuid,boolean,text)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_4b_complete(uuid,uuid,boolean,text)
 to service_role;

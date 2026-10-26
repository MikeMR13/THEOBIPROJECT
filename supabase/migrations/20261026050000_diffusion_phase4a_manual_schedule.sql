-- Difusión Fase 4A: agenda editorial sin despachador ni envíos automáticos.
-- No reconfigura pg_cron, no modifica las conexiones, ni activa reglas.
create table public.diffusion_scheduled_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  connection_id uuid not null references public.diffusion_connections(id) on delete restrict,
  provider text not null check (provider in ('discord','telegram')),
  source_type text not null check (source_type in ('series','volume','chapter')),
  source_id uuid not null,
  series_id uuid not null references public.series(id) on delete restrict,
  title_snapshot text not null check (length(title_snapshot) between 1 and 256),
  message text not null check (length(btrim(message)) between 1 and 700),
  scheduled_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','sent','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index diffusion_schedule_one_pending_per_target
  on public.diffusion_scheduled_announcements(connection_id,source_type,source_id)
  where status='planned';
create index diffusion_schedule_team_time
  on public.diffusion_scheduled_announcements(team_id,scheduled_at)
  where status='planned';
comment on table public.diffusion_scheduled_announcements is
 'Agenda manual Fase 4A. NO es una cola despachada: toda publicación exige confirmación humana.';
alter table public.diffusion_scheduled_announcements enable row level security;
revoke all on public.diffusion_scheduled_announcements from public,anon,authenticated;
grant select on public.diffusion_scheduled_announcements to authenticated;
create policy diffusion_schedule_read on public.diffusion_scheduled_announcements
  for select to authenticated using (private.diffusion_scope_ok(team_id,'diffusion_view'));

create or replace function public.diffusion_schedule_create(
 p_connection uuid,p_kind text,p_source uuid,p_message text,p_at timestamptz
) returns uuid language plpgsql volatile security definer set search_path='' as $fn$
declare conn record; payload jsonb; work uuid; created uuid; dedupe text;
begin
 select id,team_id,provider into conn from public.diffusion_connections
 where id=p_connection and provider in ('discord','telegram') and status='active'
 for update;
 if not found or not private.diffusion_scope_ok(conn.team_id,'diffusion_schedule')
     or not private.diffusion_scope_ok(conn.team_id,'diffusion_publish')
 then raise exception 'forbidden'; end if;
 if p_kind not in ('series','volume','chapter') or p_source is null
   or length(btrim(coalesce(p_message,''))) not between 1 and 700
   or p_at is null or p_at<now()+interval '2 minutes' or p_at>now()+interval '90 days'
 then raise exception 'invalid_schedule'; end if;
 -- Validación existente: ámbito del equipo, publicación pública y portada adecuada.
 if conn.provider='discord' then
   payload:=private.diffusion_manual_discord_data(conn.id,p_kind,p_source);
 else
   payload:=private.diffusion_manual_telegram_data(conn.id,p_kind,p_source);
 end if;
 if p_kind='series' then work:=p_source;
 elsif p_kind='volume' then
   select v.series_id into work from public.volumes v where v.id=p_source;
 else
   select ch.series_id into work from public.chapters ch where ch.id=p_source;
 end if;
 if work is null or not exists(select 1 from public.series se where se.id=work)
 then raise exception 'not_public'; end if;
 dedupe:=conn.provider||':manual:'||conn.id||':'||p_kind||':'||p_source;
 if exists(select 1 from public.diffusion_events e where e.dedupe_key=dedupe)
 then raise exception 'already_announced'; end if;
 insert into public.diffusion_scheduled_announcements
   (team_id,connection_id,provider,source_type,source_id,series_id,
    title_snapshot,message,scheduled_at,created_by)
 values(conn.team_id,conn.id,conn.provider,p_kind,p_source,work,
   left(payload->>'title',256),btrim(p_message),p_at,auth.uid())
 returning id into created;
 return created;
exception when unique_violation then raise exception 'already_scheduled';
end $fn$;

create or replace function public.diffusion_schedule_cancel(p_id uuid)
 returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare planned record;
begin
 select id,team_id into planned from public.diffusion_scheduled_announcements
  where id=p_id and status='planned' for update;
 if not found then raise exception 'not_pending'; end if;
 if not private.diffusion_scope_ok(planned.team_id,'diffusion_schedule')
 then raise exception 'forbidden'; end if;
 update public.diffusion_scheduled_announcements
  set status='cancelled',updated_at=now()
  where id=planned.id and status='planned';
 return found;
end $fn$;

create or replace function public.diffusion_schedule_reschedule(p_id uuid,p_at timestamptz)
 returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare planned record;
begin
 select id,team_id into planned from public.diffusion_scheduled_announcements
  where id=p_id and status='planned' for update;
 if not found then raise exception 'not_pending'; end if;
 if not private.diffusion_scope_ok(planned.team_id,'diffusion_schedule')
 then raise exception 'forbidden'; end if;
 if p_at is null or p_at<now()+interval '2 minutes' or p_at>now()+interval '90 days'
 then raise exception 'invalid_schedule'; end if;
 update public.diffusion_scheduled_announcements
  set scheduled_at=p_at,updated_at=now() where id=planned.id and status='planned';
 return found;
end $fn$;

-- Solo un job realmente 'sent' permite marcar un plan como entregado.
-- No entrega nada: la API manual del proveedor sigue siendo la única vía.
create or replace function public.diffusion_schedule_finalize(p_id uuid)
 returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare planned record; dedupe text;
begin
 select * into planned from public.diffusion_scheduled_announcements
 where id=p_id and status='planned' for update;
 if not found then raise exception 'not_pending'; end if;
 if not private.diffusion_scope_ok(planned.team_id,'diffusion_publish')
 then raise exception 'forbidden'; end if;
 dedupe:=planned.provider||':manual:'||planned.connection_id||':'||
   planned.source_type||':'||planned.source_id;
 if not exists(
   select 1 from public.diffusion_events e
   join public.diffusion_jobs j on j.event_id=e.id
   where e.dedupe_key=dedupe and j.connection_id=planned.connection_id
     and j.status='sent'
 ) then raise exception 'not_confirmed'; end if;
 update public.diffusion_scheduled_announcements
 set status='sent',updated_at=now() where id=planned.id;
 return found;
end $fn$;
revoke all on function public.diffusion_schedule_create(uuid,text,uuid,text,timestamptz),
 public.diffusion_schedule_cancel(uuid),public.diffusion_schedule_reschedule(uuid,timestamptz),
 public.diffusion_schedule_finalize(uuid) from public,anon,authenticated,service_role;
grant execute on function public.diffusion_schedule_create(uuid,text,uuid,text,timestamptz),
 public.diffusion_schedule_cancel(uuid),public.diffusion_schedule_reschedule(uuid,timestamptz),
 public.diffusion_schedule_finalize(uuid) to authenticated;

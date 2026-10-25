-- Difusion Fase 1: estructura y permisos. NO activa envios ni cron.
-- Aplicar primero en una base QA aislada. Publicaciones de equipos SIN aprobacion del Bibliotecario.
create or replace function private.perm_keys() returns text[] language sql immutable set search_path = '' as $$
  select array['view','edit','create','import','publish','schedule','delete','review','board',
   'members','profile','log','diffusion_view','diffusion_compose','diffusion_schedule',
   'diffusion_publish','diffusion_manage','diffusion_logs'] $$;

create or replace function private.clean_perms(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, coalesce((p->>k)::boolean, false)), '{}'::jsonb)
    || '{"view":true}'::jsonb from unnest(private.perm_keys()) k $$;

-- Los roles ya existentes conservan su autonomia editorial y reciben valores iniciales coherentes.
-- No se alteran permisos de publicacion editorial previos.
update public.team_roles
set perms = perms || jsonb_build_object(
  'diffusion_view', true,
  'diffusion_compose', coalesce((perms->>'publish')::boolean, false),
  'diffusion_schedule', coalesce((perms->>'schedule')::boolean, false),
  'diffusion_publish', coalesce((perms->>'publish')::boolean, false),
  'diffusion_manage', base = 'admin',
  'diffusion_logs', coalesce((perms->>'log')::boolean, false))
where base is not null
  and not (perms ? 'diffusion_view');

-- No heredar el bypass de Bibliotecario incluido en team_can:
-- las cuentas de equipos SOLO pueden ser operadas por integrantes de ese equipo.
create or replace function private.diffusion_can(t uuid, action text)
returns boolean language sql stable security definer set search_path = '' as $$
  select t is not null and action = any(array[
    'diffusion_view','diffusion_compose','diffusion_schedule',
    'diffusion_publish','diffusion_manage','diffusion_logs'])
  and exists (
    select 1 from public.team_members m
    left join public.team_roles r on r.id = m.role_id and r.team_id = m.team_id
    where m.team_id = t and m.user_id = (select auth.uid())
      and (m.role = 'owner' or coalesce(
        (m.overrides->>action)::boolean,
        (r.perms->>action)::boolean,
        case action
          when 'diffusion_view' then true
          when 'diffusion_compose' then m.role in ('admin','translator','editor')
          when 'diffusion_publish' then m.role in ('admin','translator','editor')
          when 'diffusion_schedule' then m.role in ('admin','translator','editor')
          when 'diffusion_manage' then m.role = 'admin'
          when 'diffusion_logs' then m.role = 'admin'
          else false end))
  ) $$;

create or replace function private.diffusion_scope_ok(t uuid, action text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when t is null then private.is_admin()
              else private.diffusion_can(t, action) end $$;

-- Incluir las nuevas capacidades en el selector de roles de Estudio.
create or replace function public.my_team_permissions(t uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(a,
    case when a like 'diffusion_%' then private.diffusion_can(t,a)
         else private.team_can(t,a) end), '{}'::jsonb)
    || jsonb_build_object('owner', private.team_role_of(t) = 'owner')
  from unnest(private.perm_keys()) a $$;

create table if not exists public.diffusion_connections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  provider text not null check (provider in ('discord','telegram','facebook','instagram',
    'threads','bluesky','mastodon','x','tiktok','webhook')),
  label text not null check (char_length(btrim(label)) between 2 and 100),
  status text not null default 'pending' check (status in ('pending','active','disabled','revoked')),
  -- SOLO datos publicos; tokens y URLs secretas iran en un almacen privado en fase 2.
  public_meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.diffusion_connections is 'Fase 1: metadatos sin tokens; pendiente implementar enlace seguro de proveedores';

create table if not exists public.diffusion_rules (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  event_kind text not null check (event_kind in (
    'chapter.public','volume.public','prelaunch.announced',
    'content.unlocked','announcement.published')),
  mode text not null default 'automatic' check (mode in ('automatic','team_review')),
  delay_minutes int not null default 0 check (delay_minutes between 0 and 10080),
  enabled boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.diffusion_rules.enabled is 'Debe permanecer false hasta implementar destinos y despachador';

create table if not exists public.diffusion_campaigns (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 140),
  body text not null default '' check (char_length(body) <= 2000),
  status text not null default 'draft' check (status in
    ('draft','pending_team_review','scheduled','sending','sent','cancelled')),
  scheduled_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diffusion_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  kind text not null,
  source_type text not null,
  source_id uuid,
  dedupe_key text not null unique,
  safe_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.diffusion_jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  event_id uuid references public.diffusion_events(id) on delete set null,
  campaign_id uuid references public.diffusion_campaigns(id) on delete set null,
  connection_id uuid references public.diffusion_connections(id) on delete set null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in
    ('pending','pending_team_review','leased','sent','failed','unknown','cancelled')),
  attempts int not null default 0 check (attempts >= 0),
  lease_until timestamptz,
  provider_post_id text,
  last_error text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(event_id,campaign_id) = 1)
);
create index if not exists diffusion_jobs_due_idx on public.diffusion_jobs(scheduled_at)
  where status = 'pending';
create index if not exists diffusion_jobs_team_idx on public.diffusion_jobs(team_id,created_at desc);

create table if not exists public.diffusion_attempts (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.diffusion_jobs(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result text check (result in ('sent','retry','failed','unknown')),
  status_code int,
  error_code text
);

-- Tablas privadas por defecto. Solo lectura autorizada; mutaciones mediante RPC.
do $$
declare t text;
begin
  foreach t in array array['diffusion_connections','diffusion_rules','diffusion_campaigns',
    'diffusion_events','diffusion_jobs','diffusion_attempts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end $$;

create policy diffusion_connections_read on public.diffusion_connections
  for select to authenticated using (private.diffusion_scope_ok(team_id,'diffusion_view'));
create policy diffusion_rules_read on public.diffusion_rules
  for select to authenticated using (private.diffusion_scope_ok(team_id,'diffusion_view'));
create policy diffusion_campaigns_read on public.diffusion_campaigns
  for select to authenticated using (private.diffusion_scope_ok(team_id,'diffusion_view'));
create policy diffusion_events_read on public.diffusion_events
  for select to authenticated using (private.diffusion_scope_ok(team_id,'diffusion_logs'));
create policy diffusion_jobs_read on public.diffusion_jobs
  for select to authenticated using (private.diffusion_scope_ok(team_id,'diffusion_logs'));
create policy diffusion_attempts_read on public.diffusion_attempts
  for select to authenticated using (
    exists (select 1 from public.diffusion_jobs j where j.id = job_id
      and private.diffusion_scope_ok(j.team_id,'diffusion_logs')));

-- Una persona de un equipo administra SUS reglas sin autorizacion del Bibliotecario.
create or replace function public.diffusion_rule_save(
  p_team uuid, p_id uuid, p_name text, p_event text, p_mode text default 'automatic',
  p_delay int default 0)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not private.diffusion_scope_ok(p_team,'diffusion_manage') then raise exception 'forbidden'; end if;
  if length(btrim(coalesce(p_name,''))) not between 2 and 100
    or p_event not in ('chapter.public','volume.public','prelaunch.announced',
        'content.unlocked','announcement.published')
    or p_mode not in ('automatic','team_review')
    or p_delay is null or p_delay not between 0 and 10080
  then raise exception 'invalid_diffusion_rule'; end if;
  if p_id is null then
    insert into public.diffusion_rules(team_id,name,event_kind,mode,delay_minutes,enabled,created_by)
      values(p_team,btrim(p_name),p_event,p_mode,p_delay,false,auth.uid()) returning id into result_id;
  else
    update public.diffusion_rules set name=btrim(p_name), event_kind=p_event,
      mode=p_mode,delay_minutes=p_delay,updated_at=now()
      where id=p_id and team_id is not distinct from p_team
        and enabled=false returning id into result_id;
    if result_id is null then raise exception 'not_found_or_active'; end if;
  end if;
  if p_team is not null then
    perform private.log(p_team,'edicion','Actualizó una regla de Difusión',
      jsonb_build_object('rule_id',result_id),null,null);
  end if;
  return result_id;
end $$;

create or replace function public.diffusion_campaign_draft_save(
  p_team uuid, p_id uuid, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not private.diffusion_scope_ok(p_team,'diffusion_compose') then raise exception 'forbidden'; end if;
  if length(btrim(coalesce(p_title,''))) not between 2 and 140
     or length(coalesce(p_body,'')) > 2000 then raise exception 'invalid_campaign'; end if;
  if p_id is null then
    insert into public.diffusion_campaigns(team_id,title,body,created_by)
      values(p_team,btrim(p_title),coalesce(p_body,''),auth.uid()) returning id into result_id;
  else
    update public.diffusion_campaigns set title=btrim(p_title),body=coalesce(p_body,''),
      updated_at=now() where id=p_id and team_id is not distinct from p_team
      and status='draft' returning id into result_id;
    if result_id is null then raise exception 'not_found_or_not_draft'; end if;
  end if;
  if p_team is not null then
    perform private.log(p_team,'edicion','Guardó un borrador de Difusión',
      jsonb_build_object('campaign_id',result_id),null,null);
  end if;
  return result_id;
end $$;

-- Elimina solo borradores inactivos; nunca publicaciones enviadas o en cola.
create or replace function public.diffusion_draft_delete(
  p_team uuid, p_type text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare affected int;
begin
  if p_type = 'rule' then
    if not private.diffusion_scope_ok(p_team,'diffusion_manage') then raise exception 'forbidden'; end if;
    delete from public.diffusion_rules where id=p_id
      and team_id is not distinct from p_team and enabled=false;
  elsif p_type = 'campaign' then
    if not private.diffusion_scope_ok(p_team,'diffusion_compose') then raise exception 'forbidden'; end if;
    delete from public.diffusion_campaigns where id=p_id
      and team_id is not distinct from p_team and status='draft';
  else raise exception 'invalid_type'; end if;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'not_found'; end if;
end $$;

revoke all on function public.diffusion_rule_save(uuid,uuid,text,text,text,int),
  public.diffusion_campaign_draft_save(uuid,uuid,text,text),
  public.diffusion_draft_delete(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.diffusion_rule_save(uuid,uuid,text,text,text,int),
  public.diffusion_campaign_draft_save(uuid,uuid,text,text),
  public.diffusion_draft_delete(uuid,text,uuid) to authenticated;

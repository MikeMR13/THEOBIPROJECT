-- Difusión Fase 2a: Discord manual. Sin despachador, cron ni envíos automáticos.
-- Requiere Supabase Vault, que cifra secretos en reposo.
do $guard$
begin
 if to_regprocedure('vault.create_secret(text,text,text,uuid)') is null
    or to_regclass('vault.decrypted_secrets') is null
 then raise exception 'Supabase Vault requerido para conectar Discord'; end if;
end $guard$;

create table private.diffusion_discord_secrets (
  connection_id uuid primary key references public.diffusion_connections(id) on delete cascade,
  secret_id uuid not null unique
);
revoke all on table private.diffusion_discord_secrets from public, anon, authenticated;
alter table private.diffusion_discord_secrets enable row level security;

alter table public.diffusion_connections
  add column last_test_at timestamptz;

-- El webhook solo se acepta para el Discord oficial, nunca para otra URL.
create or replace function public.diffusion_discord_connect(
  p_team uuid, p_label text, p_url text
) returns uuid
language plpgsql volatile security definer set search_path='' as $fn$
declare cid uuid; sid uuid;
begin
 if not private.diffusion_scope_ok(p_team,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 if char_length(btrim(coalesce(p_label,''))) not between 2 and 100
   or p_url is null
   or p_url !~ '^https://discord[.]com/api/webhooks/[0-9]{15,25}/[A-Za-z0-9_-]{30,}$'
 then raise exception 'invalid_discord_connection'; end if;
 insert into public.diffusion_connections(team_id,provider,label,status,created_by)
 values(p_team,'discord',btrim(p_label),'pending',auth.uid())
 returning id into cid;
 sid:=vault.create_secret(p_url,null,'Difusion Discord connection '||cid::text);
 insert into private.diffusion_discord_secrets(connection_id,secret_id)
 values(cid,sid);
 if p_team is not null then
   perform private.log(p_team,'edicion','Conectó Discord a Difusión',
     jsonb_build_object('connection_id',cid),null,null);
 end if;
 return cid;
end $fn$;

-- Revocación accesible solo por quien gestione el ámbito correspondiente.
create or replace function public.diffusion_discord_disconnect(
  p_team uuid, p_id uuid
) returns void
language plpgsql volatile security definer set search_path='' as $fn$
declare sid uuid;
begin
 if not private.diffusion_scope_ok(p_team,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 select s.secret_id into sid from private.diffusion_discord_secrets s
 join public.diffusion_connections c on c.id=s.connection_id
 where c.id=p_id and c.team_id is not distinct from p_team
 and c.provider='discord' and c.status<>'revoked'
 for update of s;
 if sid is null then raise exception 'not_found'; end if;
 delete from private.diffusion_discord_secrets where connection_id=p_id;
 delete from vault.secrets where id=sid;
 update public.diffusion_connections set status='revoked',
   updated_at=now() where id=p_id;
 if p_team is not null then
   perform private.log(p_team,'edicion','Revocó Discord de Difusión',
     jsonb_build_object('connection_id',p_id),null,null);
 end if;
end $fn$;

-- Claim atómico: una prueba por conexión cada 60 segundos.
-- El usuario autenticado no recibe el secreto.
create or replace function public.diffusion_discord_test_claim(p_id uuid)
returns boolean
language plpgsql volatile security definer set search_path='' as $fn$
declare t uuid;
begin
 select team_id into t from public.diffusion_connections
 where id=p_id and provider='discord' and status in ('pending','active');
 if not found or not private.diffusion_scope_ok(t,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 update public.diffusion_connections set last_test_at=now(),updated_at=now()
 where id=p_id and provider='discord' and status in ('pending','active')
   and (last_test_at is null or last_test_at<now()-interval '60 seconds');
 if not found then raise exception 'rate_limited'; end if;
 return true;
end $fn$;

-- Estas funciones SOLO se invocan desde el servidor mediante service_role.
-- Nunca habilitar ejecución de ellas para anon/authenticated.
create or replace function public.diffusion_discord_secret_resolve(p_id uuid)
returns text language sql stable security definer set search_path='' as $fn$
 select v.decrypted_secret from private.diffusion_discord_secrets s
 join public.diffusion_connections c on c.id=s.connection_id
 join vault.decrypted_secrets v on v.id=s.secret_id
 where c.id=p_id and c.provider='discord'
   and c.status in ('pending','active')
 limit 1
$fn$;

create or replace function public.diffusion_discord_mark_test(p_id uuid,p_success boolean)
returns void language sql volatile security definer set search_path='' as $fn$
 update public.diffusion_connections
 set status=case when p_success then 'active' else 'pending' end,
   updated_at=now()
 where id=p_id and provider='discord' and status in ('pending','active')
$fn$;

revoke all on function public.diffusion_discord_connect(uuid,text,text),
  public.diffusion_discord_disconnect(uuid,uuid),
  public.diffusion_discord_test_claim(uuid),
  public.diffusion_discord_secret_resolve(uuid),
  public.diffusion_discord_mark_test(uuid,boolean)
 from public,anon,authenticated,service_role;
grant execute on function public.diffusion_discord_connect(uuid,text,text),
  public.diffusion_discord_disconnect(uuid,uuid),
  public.diffusion_discord_test_claim(uuid)
 to authenticated;
grant execute on function public.diffusion_discord_secret_resolve(uuid),
  public.diffusion_discord_mark_test(uuid,boolean)
 to service_role;

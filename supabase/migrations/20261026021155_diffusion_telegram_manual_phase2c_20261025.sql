-- Telegram 2c: conexión cifrada, pruebas y anuncios exclusivamente manuales.
do $guard$ begin
 if to_regprocedure('vault.create_secret(text,text,text,uuid)') is null
 or to_regclass('vault.decrypted_secrets') is null then raise exception 'Vault required'; end if;
end $guard$;
create table private.diffusion_telegram_secrets (
 connection_id uuid primary key references public.diffusion_connections(id) on delete cascade,
 secret_id uuid not null unique,
 chat_id text not null check (chat_id ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{6,16})$')
);
revoke all on table private.diffusion_telegram_secrets from public,anon,authenticated,service_role;
alter table private.diffusion_telegram_secrets enable row level security;
create or replace function public.diffusion_telegram_connect(
  p_team uuid, p_label text, p_token text, p_chat text
) returns uuid
language plpgsql volatile security definer set search_path='' as $fn$
declare cid uuid; sid uuid;
begin
 if not private.diffusion_scope_ok(p_team,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 if char_length(btrim(coalesce(p_label,''))) not between 2 and 100
   or p_token is null
   or p_token !~ '^[0-9]{5,15}:[A-Za-z0-9_-]{30,80}$'
   or p_chat is null
   or p_chat !~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{6,16})$'
 then raise exception 'invalid_telegram_connection'; end if;
 insert into public.diffusion_connections(team_id,provider,label,status,created_by)
 values(p_team,'telegram',btrim(p_label),'pending',auth.uid())
 returning id into cid;
 sid:=vault.create_secret(p_token,null,'Difusion Telegram connection '||cid::text);
 insert into private.diffusion_telegram_secrets(connection_id,secret_id,chat_id)
 values(cid,sid,p_chat);
 if p_team is not null then
   perform private.log(p_team,'edicion','Conectó Telegram a Difusión',
     jsonb_build_object('connection_id',cid),null,null);
 end if;
 return cid;
end $fn$;

create or replace function public.diffusion_telegram_disconnect(
  p_team uuid, p_id uuid
) returns void
language plpgsql volatile security definer set search_path='' as $fn$
declare sid uuid;
begin
 if not private.diffusion_scope_ok(p_team,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 select s.secret_id into sid from private.diffusion_telegram_secrets s
 join public.diffusion_connections c on c.id=s.connection_id
 where c.id=p_id and c.team_id is not distinct from p_team
 and c.provider='telegram' and c.status<>'revoked'
 for update of s;
 if sid is null then raise exception 'not_found'; end if;
 delete from private.diffusion_telegram_secrets where connection_id=p_id;
 delete from vault.secrets where id=sid;
 update public.diffusion_connections set status='revoked',
   updated_at=now() where id=p_id;
 if p_team is not null then
   perform private.log(p_team,'edicion','Revocó Telegram de Difusión',
     jsonb_build_object('connection_id',p_id),null,null);
 end if;
end $fn$;

create or replace function public.diffusion_telegram_test_claim(p_id uuid)
returns boolean
language plpgsql volatile security definer set search_path='' as $fn$
declare t uuid;
begin
 select team_id into t from public.diffusion_connections
 where id=p_id and provider='telegram' and status in ('pending','active');
 if not found or not private.diffusion_scope_ok(t,'diffusion_manage')
 then raise exception 'forbidden'; end if;
 update public.diffusion_connections set last_test_at=now(),updated_at=now()
 where id=p_id and provider='telegram' and status in ('pending','active')
   and (last_test_at is null or last_test_at<now()-interval '60 seconds');
 if not found then raise exception 'rate_limited'; end if;
 return true;
end $fn$;

create or replace function public.diffusion_telegram_secret_resolve(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object('token',v.decrypted_secret,'chat_id',s.chat_id) from private.diffusion_telegram_secrets s
 join public.diffusion_connections c on c.id=s.connection_id
 join vault.decrypted_secrets v on v.id=s.secret_id
 where c.id=p_id and c.provider='telegram'
   and c.status in ('pending','active')
 limit 1
$fn$;

create or replace function public.diffusion_telegram_mark_test(p_id uuid,p_success boolean)
returns void language sql volatile security definer set search_path='' as $fn$
 update public.diffusion_connections
 set status=case when p_success then 'active' else 'pending' end,
   updated_at=now()
 where id=p_id and provider='telegram' and status in ('pending','active')
$fn$;

create or replace function private.diffusion_manual_telegram_data(
  p_connection uuid, p_kind text, p_source uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare conn record; se record; vo record; ch record;
  ttl text; msg text; descr text; cover text; link text;
begin
 if auth.uid() is null or p_kind not in ('series','volume','chapter') or p_source is null
 then raise exception 'forbidden'; end if;
 select team_id,status into conn from public.diffusion_connections
   where id=p_connection and provider='telegram';
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
    or not (coalesce(se.access,'public')='public' or coalesce(se.access_until<=now(),false))
    or se.slug !~ '^[A-Za-z0-9_-]+$'
 then raise exception 'not_public'; end if;
 if p_kind in ('volume','chapter') then
   if vo.id is null or vo.deleted_at is not null or vo.status<>'published'
     or (vo.published_at is not null and vo.published_at>now())
     or not (coalesce(vo.access,'public')='public' or coalesce(vo.access_until<=now(),false))
   then raise exception 'not_public'; end if;
 end if;
 if p_kind='chapter' then
   if ch.deleted_at is not null or ch.status::text<>'published'
     or (ch.publish_at is not null and ch.publish_at>now())
     or not (coalesce(ch.access,'public')='public' or coalesce(ch.access_until<=now(),false))
     or ch.num is null
   then raise exception 'not_public'; end if;
   ttl:=left(se.title||' · Capítulo '||ch.num||' — '||coalesce(ch.title,''),256);
   msg:='📖 Nuevo capítulo: '||left(coalesce(nullif(ch.title,''),'Capítulo '||ch.num),160);
   descr:=left(se.title||' · Volumen '||vo.num,300);
   cover:=nullif(btrim(vo.cover_path),'');
   link:='https://elobidellector.com/leer/'||se.slug||'/'||ch.num;
 elsif p_kind='volume' then
   ttl:=left(se.title||' · Volumen '||vo.num,256);
   msg:='📚 Nuevo volumen '||vo.num||' de '||left(se.title,160)||' disponible';
   descr:=case when vo.synopsis_spoiler then 'Nuevo volumen disponible en El Obi'
     else left(regexp_replace(coalesce(vo.synopsis,''),'[[:space:]]+',' ','g'),300) end;
   cover:=nullif(btrim(vo.cover_path),'');
   link:='https://elobidellector.com/serie/'||se.slug;
 else
   ttl:=left(se.title,256);
   msg:='✨ Nueva obra en El Obi: '||left(se.title,170);
   descr:=left(regexp_replace(coalesce(se.synopsis,''),'[[:space:]]+',' ','g'),300);
   cover:=nullif(btrim(se.cover_path),'');
   link:='https://elobidellector.com/serie/'||se.slug;
 end if;
 -- Portada obligatoria: obra usa obra; volumen y capítulo usan su volumen.
 if cover is null then
   if p_kind='series' then raise exception 'missing_work_cover';
   else raise exception 'missing_volume_cover'; end if;
 end if;
 if char_length(cover)>450 or cover !~ '^[A-Za-z0-9_./-]+$'
   or left(cover,1)='/' or position('..' in cover)>0
 then raise exception 'invalid_cover_path'; end if;
 return jsonb_build_object('kind',p_kind,'source_id',p_source,
   'title',ttl,'message',left(msg,700),'description',coalesce(descr,''),
   'cover_path',cover,'url',link);
end $fn$;

create or replace function public.diffusion_telegram_announcement_preview(
 p_connection uuid,p_kind text,p_source uuid
) returns jsonb language sql stable security definer set search_path='' as $fn$
 select private.diffusion_manual_telegram_data(p_connection,p_kind,p_source)
$fn$;

create or replace function public.diffusion_telegram_announcement_claim(
 p_connection uuid,p_kind text,p_source uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare payload jsonb; cid uuid; team uuid; ev uuid; job uuid; dedupe text;
begin
 payload:=private.diffusion_manual_telegram_data(p_connection,p_kind,p_source);
 select id,team_id into cid,team from public.diffusion_connections
   where id=p_connection and provider='telegram' and status='active' for update;
 if not found then raise exception 'forbidden'; end if;
 dedupe:='telegram:manual:'||cid||':'||p_kind||':'||p_source;
 if exists(select 1 from public.diffusion_events where dedupe_key=dedupe)
 then raise exception 'already_announced'; end if;
 update public.diffusion_connections set last_announcement_at=now(),updated_at=now()
   where id=cid and (last_announcement_at is null
   or last_announcement_at<=now()-interval '15 seconds');
 if not found then raise exception 'rate_limited'; end if;
 insert into public.diffusion_events(team_id,kind,source_type,source_id,dedupe_key,safe_payload)
   values(team,'telegram.manual',p_kind,p_source,dedupe,payload)
   returning id into ev;
 insert into public.diffusion_jobs(team_id,event_id,connection_id,scheduled_at,status,attempts,lease_until)
   values(team,ev,cid,now(),'leased',1,now()+interval '2 minutes')
   returning id into job;
 return payload||jsonb_build_object('job_id',job);
exception when unique_violation then raise exception 'already_announced';
end $fn$;

create or replace function public.diffusion_telegram_announcement_complete(
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
   (select id from public.diffusion_connections where provider='telegram')
 returning id into changed;
 if changed is null then raise exception 'invalid_job'; end if;
 insert into public.diffusion_attempts(job_id,finished_at,result)
   values(p_job,now(),case when p_success then 'sent' else 'unknown' end);
end $fn$;
revoke all on function private.diffusion_manual_telegram_data(uuid,text,uuid),
public.diffusion_telegram_connect(uuid,text,text,text),
public.diffusion_telegram_disconnect(uuid,uuid),
public.diffusion_telegram_test_claim(uuid),
public.diffusion_telegram_secret_resolve(uuid),
public.diffusion_telegram_mark_test(uuid,boolean),
public.diffusion_telegram_announcement_preview(uuid,text,uuid),
public.diffusion_telegram_announcement_claim(uuid,text,uuid),
public.diffusion_telegram_announcement_complete(uuid,boolean,text)
from public,anon,authenticated,service_role;
grant execute on function public.diffusion_telegram_connect(uuid,text,text,text),
public.diffusion_telegram_disconnect(uuid,uuid),
public.diffusion_telegram_test_claim(uuid),
public.diffusion_telegram_announcement_preview(uuid,text,uuid),
public.diffusion_telegram_announcement_claim(uuid,text,uuid) to authenticated;
grant execute on function public.diffusion_telegram_secret_resolve(uuid),
public.diffusion_telegram_mark_test(uuid,boolean),
public.diffusion_telegram_announcement_complete(uuid,boolean,text) to service_role;

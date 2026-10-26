-- Telegram 2c: ampliar identificadores a grupos privados y supergrupos.
-- No cambia los tokens, las conexiones anteriores ni permisos de Discord.
alter table private.diffusion_telegram_secrets
 drop constraint diffusion_telegram_secrets_chat_id_check;
alter table private.diffusion_telegram_secrets
 add constraint diffusion_telegram_secrets_chat_id_check
 check (chat_id ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$');
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
   or p_chat !~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$'
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

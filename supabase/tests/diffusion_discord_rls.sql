-- Discord fase 2a: probar RLS/RPC contra webhook FICTICIO con la API Vault simulada.
\set ON_ERROR_STOP on
do $qa$
begin
 if has_function_privilege('authenticated','public.diffusion_discord_secret_resolve(uuid)','EXECUTE')
 or has_function_privilege('anon','public.diffusion_discord_secret_resolve(uuid)','EXECUTE')
 or has_function_privilege('anon','public.diffusion_discord_connect(uuid,text,text)','EXECUTE')
 or not has_function_privilege('service_role','public.diffusion_discord_secret_resolve(uuid)','EXECUTE')
 then raise exception 'Privilegios inseguros de secretos'; end if;
 if has_table_privilege('authenticated','private.diffusion_discord_secrets','SELECT')
 then raise exception 'Se expuso tabla privada'; end if;
end $qa$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.is_admin','false',false);
set role authenticated;
do $qa$
declare cid uuid; rejected boolean:=false;
begin
 begin perform public.diffusion_discord_connect('11111111-1111-4111-8111-111111111111','SSRF','http://127.0.0.1/webhook');
 exception when raise_exception then
  if sqlerrm='invalid_discord_connection' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'Admitió URL externa'; end if;
 cid:=public.diffusion_discord_connect('11111111-1111-4111-8111-111111111111',
  'Discord A', 'https://discord.com/api/webhooks/123456789012345678/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
 if not exists(select 1 from public.diffusion_connections where id=cid and status='pending')
 then raise exception 'Conexión ausente'; end if;
 if not public.diffusion_discord_test_claim(cid) then raise exception 'No pudo probar'; end if;
 rejected:=false;
 begin perform public.diffusion_discord_test_claim(cid);
 exception when raise_exception then
  if sqlerrm='rate_limited' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'Sin rate limit'; end if;
 perform set_config('diffusion.test_cid',cid::text,false);
end $qa$;
reset role;

select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
declare rejected boolean:=false; cid uuid;
begin
 cid:=current_setting('diffusion.test_cid')::uuid;
 begin perform public.diffusion_discord_test_claim(cid);
 exception when raise_exception then
  if sqlerrm='forbidden' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'B pudo probar conexión A'; end if;
 rejected:=false;
 begin perform public.diffusion_discord_disconnect('22222222-2222-4222-8222-222222222222',cid);
 exception when raise_exception then
  if sqlerrm='not_found' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'B pudo revocar A'; end if;
end $qa$;
reset role;

select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',false);
select set_config('request.jwt.claim.is_admin','true',false);
set role authenticated;
do $qa$
declare rejected boolean:=false;
begin
 begin perform public.diffusion_discord_test_claim(current_setting('diffusion.test_cid')::uuid);
 exception when raise_exception then
  if sqlerrm='forbidden' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'Bibliotecario invadió red de A'; end if;
end $qa$;
reset role;

set role service_role;
do $qa$
declare endpoint text;
begin
 endpoint:=public.diffusion_discord_secret_resolve(current_setting('diffusion.test_cid')::uuid);
 if endpoint not like 'https://discord.com/api/webhooks/%'
 then raise exception 'Servidor no resolvió secreto'; end if;
 perform public.diffusion_discord_mark_test(current_setting('diffusion.test_cid')::uuid,true);
end $qa$;
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.is_admin','false',false);
set role authenticated;
do $qa$
begin
 perform public.diffusion_discord_disconnect('11111111-1111-4111-8111-111111111111',current_setting('diffusion.test_cid')::uuid);
 if not exists(select 1 from public.diffusion_connections where id=current_setting('diffusion.test_cid')::uuid and status='revoked')
 then raise exception 'Conexión sin revocar'; end if;
end $qa$;
reset role;
set role service_role;
do $qa$
begin
 if public.diffusion_discord_secret_resolve(current_setting('diffusion.test_cid')::uuid) is not null
 then raise exception 'Secreto se puede leer después de revocar'; end if;
end $qa$;
reset role;
\echo 'DIFUSION Discord: PASS (Vault simulado, permisos, rate limit y revocación)'

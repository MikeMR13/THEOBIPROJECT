-- Supabase CLI REAL: NO adaptador simulado. Verificar que un secreto de prueba
-- no se almacena en claro, sin mostrar su contenido en logs.
\set ON_ERROR_STOP on
do $qa$
declare cid uuid;
tid uuid := '11111111-1111-4111-8111-111111111111';
webhook text := 'https://discord.com/api/webhooks/123456789012345678/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
sealed text;
begin
  if not exists(select 1 from pg_extension where extname='supabase_vault')
  then raise exception 'No está activa la extensión real Supabase Vault'; end if;
  perform set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
  perform set_config('request.jwt.claim.is_admin','false',true);
  cid := public.diffusion_discord_connect(tid,'Vault real',webhook);
  select v.secret into sealed
    from private.diffusion_discord_secrets ds
    join vault.secrets v on v.id=ds.secret_id
    where ds.connection_id=cid;
  if sealed is null or sealed = webhook
  then raise exception 'El webhook no quedó cifrado'; end if;
  if public.diffusion_discord_secret_resolve(cid) is distinct from webhook
  then raise exception 'No se pudo desencriptar mediante Vault real'; end if;
  perform public.diffusion_discord_disconnect(tid,cid);
  if public.diffusion_discord_secret_resolve(cid) is not null
  then raise exception 'La revocación no borró la credencial'; end if;
end $qa$;
\echo 'DIFUSION VAULT REAL: PASS, secreto cifrado y revocación verificada.'

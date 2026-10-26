-- Solo PostgreSQL efímero de QA, sin bot/token real ni envíos.
\set ON_ERROR_STOP on
do $qa$
begin
 if not ('-123456789' ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$')
 or not ('-1001234567890' ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$')
 or not ('@ObiSupergrupo' ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$')
 or ('https://t.me/+invitation' ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$')
 then raise exception 'Telegram group identifier validation failed'; end if;
 if has_function_privilege('anon','public.diffusion_telegram_connect(uuid,text,text,text)','EXECUTE')
 or has_function_privilege('authenticated','public.diffusion_telegram_secret_resolve(uuid)','EXECUTE')
 then raise exception 'Telegram privilege regression'; end if;
end $qa$;
\echo 'Telegram group IDs and privilege isolation PASS'

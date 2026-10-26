-- Telegram QA: usuarios/canales FICTICIOS, sin llamadas externas.
\set ON_ERROR_STOP on
update public.series set cover_path='fictitious/work.jpg' where slug='obra-a';
update public.volumes set cover_path='fictitious/volume1.jpg' where id='20000000-0000-4000-8000-000000000001';

do $qa$ begin
 if has_function_privilege('anon','public.diffusion_telegram_connect(uuid,text,text,text)','EXECUTE')
 or has_function_privilege('anon','public.diffusion_telegram_announcement_preview(uuid,text,uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.diffusion_telegram_secret_resolve(uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.diffusion_telegram_mark_test(uuid,boolean)','EXECUTE')
 or has_function_privilege('authenticated','public.diffusion_telegram_announcement_complete(uuid,boolean,text)','EXECUTE')
 or not has_function_privilege('service_role','public.diffusion_telegram_announcement_complete(uuid,boolean,text)','EXECUTE')
 or has_table_privilege('authenticated','private.diffusion_telegram_secrets','SELECT')
 then raise exception 'Telegram secret ACL or RPC unsafe'; end if;
end $qa$;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.is_admin','false',false);
set role authenticated;
do $qa$
declare id uuid; blocked bool; p jsonb;
begin
 blocked:=false;
 begin perform public.diffusion_telegram_connect('11111111-1111-4111-8111-111111111111',
  'invalid', 'https://evil.test/bot/1', '@wrong');
 exception when raise_exception then
  if sqlerrm='invalid_telegram_connection' then blocked:=true; else raise; end if;
 end;
 if not blocked then raise exception 'Bad Telegram token accepted'; end if;
 id:=public.diffusion_telegram_connect('11111111-1111-4111-8111-111111111111',
 'QA canal','123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','@ObiQATestChannel');
 perform set_config('diffusion.telegram_qa_cid',id::text,false);
 blocked:=false;
 begin perform public.diffusion_telegram_announcement_preview(id,'series','10000000-0000-4000-8000-000000000001');
 exception when raise_exception then
  if sqlerrm='forbidden' then blocked:=true; else raise; end if;
 end;
 if not blocked then raise exception 'Unverified Telegram was allowed to post'; end if;
 if not public.diffusion_telegram_test_claim(id) then raise exception 'Telegram cannot claim test'; end if;
 blocked:=false;
 begin perform public.diffusion_telegram_test_claim(id);
 exception when raise_exception then
  if sqlerrm='rate_limited' then blocked:=true; else raise; end if;
 end;
 if not blocked then raise exception 'Telegram test had no rate limit'; end if;
end $qa$;
reset role;

set role service_role;
do $qa$
declare v jsonb;
begin
 v:=public.diffusion_telegram_secret_resolve(current_setting('diffusion.telegram_qa_cid')::uuid);
 if v->>'chat_id' <> '@ObiQATestChannel' or v->>'token' not like '123456789:%'
 then raise exception 'Vault token/chat did not resolve for service role'; end if;
 perform public.diffusion_telegram_mark_test(current_setting('diffusion.telegram_qa_cid')::uuid,true);
end $qa$;
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
do $qa$
declare cid uuid:=current_setting('diffusion.telegram_qa_cid')::uuid;
 data jsonb; denied bool; jid uuid;
begin
 data:=public.diffusion_telegram_announcement_preview(cid,'series','10000000-0000-4000-8000-000000000001');
 if data->>'cover_path'<>'fictitious/work.jpg' then raise exception 'Series cover mismatch'; end if;
 data:=public.diffusion_telegram_announcement_preview(cid,'volume','20000000-0000-4000-8000-000000000001');
 if data->>'cover_path'<>'fictitious/volume1.jpg' then raise exception 'Volume cover mismatch'; end if;
 data:=public.diffusion_telegram_announcement_preview(cid,'chapter','30000000-0000-4000-8000-000000000001');
 if data->>'cover_path'<>'fictitious/volume1.jpg' then raise exception 'Chapter did not inherit volume cover'; end if;
 denied:=false;
 begin perform public.diffusion_telegram_announcement_preview(cid,'chapter','30000000-0000-4000-8000-000000000002');
 exception when raise_exception then
  if sqlerrm='not_public' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Paid chapter exposed'; end if;
 denied:=false;
 begin perform public.diffusion_telegram_announcement_preview(cid,'series','10000000-0000-4000-8000-000000000002');
 exception when raise_exception then
  if sqlerrm='not_public' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Other team exposed'; end if;
 data:=public.diffusion_telegram_announcement_claim(cid,'chapter','30000000-0000-4000-8000-000000000001');
 jid:=(data->>'job_id')::uuid;
 perform set_config('diffusion.telegram_qa_job',jid::text,false);
 denied:=false;
 begin perform public.diffusion_telegram_announcement_claim(cid,'chapter','30000000-0000-4000-8000-000000000001');
 exception when raise_exception then if sqlerrm='already_announced' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Duplicate Telegram announcement was accepted'; end if;
end $qa$;
reset role;
set role service_role;
select public.diffusion_telegram_announcement_complete(current_setting('diffusion.telegram_qa_job')::uuid,true,'telegram-fake-id');
reset role;
do $qa$ begin
 if not exists(select 1 from public.diffusion_jobs where id=current_setting('diffusion.telegram_qa_job')::uuid and status='sent')
 then raise exception 'Telegram result was not persisted'; end if;
end $qa$;

select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
declare denied bool:=false;
begin
 begin perform public.diffusion_telegram_test_claim(current_setting('diffusion.telegram_qa_cid')::uuid);
 exception when raise_exception then if sqlerrm='forbidden' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Other team tested Telegram channel'; end if;
end $qa$;
reset role;
\echo 'TELEGRAM FASE 2C: PASS (Vault, equipos, portada por nivel, dedupe, rate limit)'

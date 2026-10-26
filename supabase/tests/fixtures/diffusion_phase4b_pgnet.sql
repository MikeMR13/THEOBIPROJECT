\set ON_ERROR_STOP on
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema net;
create table net.qa_requests(id bigint generated always as identity,request_at timestamptz default now());
create function net.http_post(url text, body jsonb default '{}'::jsonb,
 params jsonb default '{}'::jsonb,headers jsonb default '{}'::jsonb,
 timeout_milliseconds integer default 2000)
returns bigint language plpgsql as $$
declare n bigint;
begin
 if url<>'https://qfllthjpjuaztppvpsrk.supabase.co/functions/v1/diffusion-dispatch'
    or headers ? 'Authorization' or jsonb_typeof(headers->'x-diffusion-ticket')<>'string'
 then raise exception 'Invalid cron HTTP request'; end if;
 insert into net.qa_requests default values returning id into n;
 return n;
end $$;

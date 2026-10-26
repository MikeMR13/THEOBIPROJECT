\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create schema private;
create function public.patreon_campaign_info(p_owner text) returns jsonb
language sql stable security definer set search_path=''
as $$ select '{}'::jsonb $$;
create function public.report_review(p_series uuid,p_ref text,p_reason text,p_note text default null)
returns void language plpgsql security definer set search_path=''
as $$ begin return; end $$;
create function public.series_feedback(p_series uuid) returns jsonb
language sql stable security definer set search_path=''
as $$ select '{}'::jsonb $$;
create function public.home_feed() returns jsonb
language sql stable security definer set search_path=''
as $$ select '{"healthy":true}'::jsonb $$;
grant execute on function public.patreon_campaign_info(text), public.report_review(uuid,text,text,text),public.series_feedback(uuid) to anon,authenticated,service_role;

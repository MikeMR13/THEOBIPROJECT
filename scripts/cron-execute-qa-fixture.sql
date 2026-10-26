-- Exclusivamente PostgreSQL efímero en GitHub Actions. Sin datos ni secretos reales.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema private;
create schema cron;
grant usage on schema private to anon, authenticated;

create table cron.job (
  jobname text primary key,
  username text not null,
  command text not null
);
create function private.run_publications() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi_publication_runner','postgres','select private.run_publications()');

create function private.refresh_home() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-home-snapshot','postgres','select private.refresh_home()');

create function private.compute_rankings() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-rankings','postgres','select private.compute_rankings()');

create function private.purge_deleted_accounts() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-purge-accounts','postgres','select private.purge_deleted_accounts()');

create function private.purge_old() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi_purge_old','postgres','select private.purge_old()');

create function private.send_reminders() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-reminders','postgres','select private.send_reminders()');

create function private.notify_due_chapters() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-chapter-notify','postgres','select private.notify_due_chapters()');

create function private.notify_general_releases() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-general-notify','postgres','select private.notify_general_releases()');

create function private.notify_anniversaries() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-anniversaries','postgres','select private.notify_anniversaries()');

create function private.notify_seasons() returns void language plpgsql security definer set search_path='' as $fn$begin null; end$fn$;
insert into cron.job(jobname,username,command) values('obi-season-notices','postgres','select private.notify_seasons()');

-- Una RPC pública real del sistema no debe ser restringida por este cambio.
create function public.home_feed() returns text language sql security definer set search_path='' as $fn$
  select 'public home ok'::text;
$fn$;

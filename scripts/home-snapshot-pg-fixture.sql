-- PostgreSQL efímero de GitHub Actions. SIN acceso a Supabase ni datos reales.
\set ON_ERROR_STOP on
create schema private;
create table private.home_snapshot (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  built_at timestamptz not null default now()
);
insert into private.home_snapshot (id, data) values (1, '{"series":[]}'::jsonb);

create table public.series (id int primary key, published boolean not null default false);
create table public.chapters (id int primary key, status text not null default 'draft');
create table public.volumes (id int primary key, status text not null default 'scheduled');

create function private.home_stale() returns trigger
language plpgsql security definer set search_path = ''
as $body$
begin
  update private.home_snapshot set built_at = '-infinity'
  where id = 1 and built_at > '-infinity';
  return null;
end $body$;

create trigger chapters_home_stale after insert or update or delete on public.chapters
  for each statement execute function private.home_stale();
create trigger series_home_stale after insert or update or delete on public.series
  for each statement execute function private.home_stale();
create trigger volumes_home_stale after insert or update or delete on public.volumes
  for each statement execute function private.home_stale();

-- Reproduce el problema antes del parche: UPDATE sin filas invalida igualmente.
update public.volumes set status = status where false;
do $qa$
begin
  if (select built_at <> '-infinity'::timestamptz from private.home_snapshot where id = 1) then
    raise exception 'No se reprodujo el fallo: statement trigger no invalidó UPDATE de cero filas';
  end if;
end $qa$;

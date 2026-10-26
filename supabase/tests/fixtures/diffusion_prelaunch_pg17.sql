\set ON_ERROR_STOP on
-- Fixture complementario PG17: campos de preestreno del esquema real.
alter table public.series add column adult boolean not null default false;
alter table public.teams add column status text not null default 'Activo';

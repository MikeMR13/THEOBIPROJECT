-- Esquema mínimo de pruebas. Solo se ejecuta en PostgreSQL temporal de GitHub Actions.
create schema auth;
create schema private;
create role anon nologin;
create role authenticated nologin;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;

create table public.series (
  id uuid primary key,
  team_id uuid not null,
  published boolean not null default false,
  archived_at timestamptz,
  translation_status text not null default 'active',
  adult boolean not null default false,
  genres text[] not null default '{}',
  views bigint not null default 17
);
create table public.profiles (
  id uuid primary key,
  adult_ok boolean not null default false
);
create function private.in_team(p_team uuid) returns boolean
language sql stable as $$ select current_setting('test.team',true) = p_team::text $$;

insert into public.series (id, team_id, published, translation_status, adult, genres) values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,'active',false,array['Fantasía','Aventura']),
('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,'completed',true,array['Romance']),
('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false,'active',false,array['Fantasía']);
insert into public.profiles (id,adult_ok) values
('44444444-4444-4444-8444-444444444444',true);

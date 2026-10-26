\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema private;
create schema auth;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.in_team(t uuid) returns boolean language sql stable security definer set search_path=''
as $$ select t='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
         and auth.uid()='99999999-9999-9999-9999-999999999999'::uuid $$;
create function private.is_team_patron(t uuid) returns boolean language sql stable security definer set search_path=''
as $$ select false $$;
grant usage on schema auth to anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function auth.uid(), private.in_team(uuid), private.is_team_patron(uuid) to anon,authenticated;

create table public.series (
 id uuid primary key, team_id uuid, published boolean, archived_at timestamptz
);
create table public.volumes (
 id uuid primary key, series_id uuid, num integer, deleted_at timestamptz, status text, published_at timestamptz
);
create table public.download_links (
 id bigint primary key, volume_id uuid, series_id uuid, vol integer, fmt text, provider text,
 label text, patreon_only boolean, sort integer
);

insert into public.series(id,team_id,published,archived_at) values
('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true,null),
('22222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false,null),
('33333333-3333-3333-3333-333333333333','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true,now());
insert into public.volumes(id,series_id,num,status,deleted_at,published_at) values
('a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',1,'published',null,now()-interval '1 day'),
('a1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',2,'published',null,now()+interval '1 day'),
('a1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',3,'scheduled',null,now()+interval '1 day'),
('a1000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',4,'published',now(),now()-interval '1 day'),
('a1000000-0000-0000-0000-000000000005','22222222-2222-2222-2222-222222222222',1,'published',null,now()-interval '1 day'),
('a1000000-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',1,'published',null,now()-interval '1 day');

insert into public.download_links(id,volume_id,series_id,vol,fmt,provider,label,patreon_only,sort) values
(1,'a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',1,'epub','external','Publicado',false,1),
(2,'a1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',2,'epub','external','Fecha futura',false,2),
(3,'a1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',3,'epub','external','Programado',false,3),
(4,'a1000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',4,'epub','external','Papelera',false,4),
(5,'a1000000-0000-0000-0000-000000000005','22222222-2222-2222-2222-222222222222',1,'epub','external','Obra borrador',false,1),
(6,'a1000000-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',1,'epub','external','Archivado',false,1),
(7,null,'11111111-1111-1111-1111-111111111111',1,'pdf','external','Fallback numero',true,7),
(8,'a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',5,'epub','external','Enlace volumen equivocado',false,8);
-- El enlace 8 apunta explícitamente a un volumen distinto del número mostrado;
-- igual que download_open, el ID del volumen tiene prioridad.
CREATE OR REPLACE FUNCTION public.series_downloads(p_series uuid)
 RETURNS TABLE(id bigint, volume_id uuid, vol integer, fmt text, provider text, label text, donor_only boolean, locked boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
         false,
         d.patreon_only and not (
           private.in_team(s.team_id) or private.is_team_patron(s.team_id)
         )
  from public.download_links d
  join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
  order by d.vol, d.sort, d.id
$function$
;

CREATE OR REPLACE FUNCTION public.series_downloads_v2(p_series uuid)
 RETURNS TABLE(id bigint, volume_id uuid, vol integer, fmt text, provider text, label text, donor_only boolean, patreon_only boolean, locked boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
         false, d.patreon_only,
         d.patreon_only and not (
           private.in_team(s.team_id) or private.is_team_patron(s.team_id)
         )
  from public.download_links d
  join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
  order by d.vol, d.sort, d.id
$function$
;

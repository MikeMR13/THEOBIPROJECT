-- Separación editorial: Patreon de El Obi solo es apoyo y reconocimiento.
-- Los únicos enlaces exclusivos se gestionan con el Patreon de CADA equipo.
-- Migración posterior al esquema original con donor_only y a la integración de Patreon.

alter table public.download_links
  add column if not exists patreon_only boolean not null default false;

-- No conservar bloqueos antiguos por donación general.
update public.download_links set donor_only = false where donor_only = true;

alter table public.download_links
  drop constraint if exists download_links_one_access_mode;
alter table public.download_links
  add constraint download_links_one_access_mode
  check (donor_only = false);

-- Mantener el contrato antiguo para lectores con JavaScript en caché.
-- Siempre se informa donor_only=false; los bloqueos son exclusivamente del equipo.
create or replace function public.series_downloads(p_series uuid)
returns table(id bigint, volume_id uuid, vol int, fmt text, provider text, label text, donor_only boolean, locked boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
         false,
         d.patreon_only and not (
           private.in_team(s.team_id) or private.is_team_patron(s.team_id)
         )
  from public.download_links d
  join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
  order by d.vol, d.sort, d.id
$$;

-- Contrato nuevo para mostrar el tipo de bloqueo en la ficha.
-- Nunca devuelve la URL original en respuestas de listado.
create or replace function public.series_downloads_v2(p_series uuid)
returns table(
  id bigint, volume_id uuid, vol integer, fmt text, provider text,
  label text, donor_only boolean, patreon_only boolean, locked boolean
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
         false, d.patreon_only,
         d.patreon_only and not (
           private.in_team(s.team_id) or private.is_team_patron(s.team_id)
         )
  from public.download_links d
  join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
  order by d.vol, d.sort, d.id
$$;

revoke all on function public.series_downloads(uuid), public.series_downloads_v2(uuid) from public;
grant execute on function public.series_downloads(uuid), public.series_downloads_v2(uuid) to anon, authenticated;

-- Proteger el enlace en cada clic: el patrocinio de la plataforma NO es un permiso.
create or replace function public.download_open(p_id bigint)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.download_links;
  owner_team uuid;
begin
  select * into d from public.download_links where id = p_id;
  if d.id is null then raise exception 'not_found'; end if;

  owner_team := private.series_team(d.series_id);
  if d.patreon_only
    and not (private.is_team_patron(owner_team) or private.in_team(owner_team)) then
    raise exception 'patreon_only'
      using hint = 'Vincula una membresía activa del Patreon de este equipo para descargar';
  end if;

  update public.download_links set clicks = clicks + 1 where id = p_id;
  return d.url;
end $$;

revoke all on function public.download_open(bigint) from public;
grant execute on function public.download_open(bigint) to anon, authenticated;

-- Quitar el privilegio antiguo: donadores de la plataforma podían saltarse
-- la fecha pública de capítulos. Los permisos propios del equipo siguen aparte.
create or replace function private.chapter_readable(c uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chapters ch
    where ch.id = c
      and (
        private.in_team(private.chapter_team(c))
        or (ch.status = 'published'
            and (ch.public_at is null or ch.public_at <= now()))
      )
  )
$$;

-- Los EPUB privados no deben abrirse por el Patreon general.
-- Los integrantes del equipo conservan su administración del almacenamiento.
drop policy if exists "epub read donors" on storage.objects;
drop policy if exists "epub read team" on storage.objects;
create policy "epub read team" on storage.objects
for select to authenticated
using (
  bucket_id = 'obi-epub'
  and private.in_team(((storage.foldername(name))[1])::uuid)
);

-- No se elimina el Patreon general: sus apoyos, sellos y mural permanecen.
-- Comprobar con cuentas visitante, donador general, mecenas de equipo,
-- mecenas de otro equipo y editor del equipo antes de activar producción.

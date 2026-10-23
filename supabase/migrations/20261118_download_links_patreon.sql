-- Descargas por enlace con acceso exclusivo para mecenas de Patreon del equipo.
-- Requiere la integración Patreon (private.is_team_patron y public.patreon_pledges).
-- No modifica los permisos de lectura de capítulos/volúmenes.

alter table public.download_links
  add column if not exists patreon_only boolean not null default false;

-- Una descarga solo puede tener una restricción: donadores de El Obi O Patreon del equipo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.download_links'::regclass
      and conname = 'download_links_one_access_mode'
  ) then
    alter table public.download_links
      add constraint download_links_one_access_mode
      check (not (donor_only and patreon_only));
  end if;
end $$;

-- RPC nueva para mantener compatible series_downloads de clientes antiguos.
-- No devuelve las URL de descargas a visitantes.
create or replace function public.series_downloads_v2(p_series uuid)
returns table(
  id bigint, volume_id uuid, vol integer, fmt text, provider text,
  label text, donor_only boolean, patreon_only boolean, locked boolean
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label,
    d.donor_only, d.patreon_only,
    case
      when d.patreon_only then not (
        private.in_team(s.team_id) or private.is_team_patron(s.team_id)
      )
      when d.donor_only then not (
        private.in_team(s.team_id) or private.is_donor()
      )
      else false
    end
  from public.download_links d
    join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
  order by d.vol, d.sort, d.id
$$;

revoke all on function public.series_downloads_v2(uuid) from public;
grant execute on function public.series_downloads_v2(uuid) to anon, authenticated;

-- Comprobar en el servidor justo al abrir: no basta con ocultar el botón.
-- El enlace externo solo se devuelve tras autorizar al usuario.
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
  if d.donor_only
    and not (private.is_donor() or private.in_team(owner_team)) then
    raise exception 'donor_only'
      using hint = 'Esta descarga es solo para donadores';
  end if;
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

-- Casos de validación antes de desplegar:
-- Público: todos. Donadores: únicamente donador de plataforma o equipo.
-- Patreon: mecenas activo del equipo dueño o miembro del equipo.
-- Visitante, mecenas inactivo y mecenas de otro equipo: acceso denegado.
-- La URL restringida nunca aparece en series_downloads_v2.

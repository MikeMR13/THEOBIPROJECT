-- Selección pública: una sola obra activa por equipo, sin permitir escrituras directas.
-- La clave primaria de team_id impide duplicaciones incluso con clics simultáneos.
create table if not exists public.team_featured_series (
  team_id uuid primary key references public.teams(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists team_featured_series_series_idx
  on public.team_featured_series(series_id);
alter table public.team_featured_series enable row level security;
revoke all on public.team_featured_series from public, anon, authenticated;
grant select on public.team_featured_series to anon, authenticated;

drop policy if exists team_feature_public_read on public.team_featured_series;
create policy team_feature_public_read on public.team_featured_series
  for select to anon, authenticated
  using (exists (
    select 1 from public.series s where s.id=series_id
      and s.team_id=team_id and s.published=true and s.archived_at is null
      and s.translation_status not in ('abandoned','withdrawn')
  ));

create or replace function public.team_feature_set(p_team_id uuid,p_series_id uuid default null)
returns uuid language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_team_id is null
    or not (private.team_can(p_team_id,'edit') or private.team_can(p_team_id,'publish')) then
    raise exception 'Sin permisos para destacar obras de este equipo'
      using errcode='42501';
  end if;
  if p_series_id is null then
    delete from public.team_featured_series where team_id=p_team_id;
    return null;
  end if;
  if not exists (
    select 1 from public.series s where s.id=p_series_id and s.team_id=p_team_id
    and s.published=true and s.archived_at is null
    and s.translation_status not in ('abandoned','withdrawn')
  ) then
    raise exception 'Solo puedes destacar una obra publicada y asignada a tu equipo'
      using errcode='23514';
  end if;
  insert into public.team_featured_series(team_id,series_id,updated_at,updated_by)
  values(p_team_id,p_series_id,now(),auth.uid())
  on conflict(team_id) do update set series_id=excluded.series_id,
    updated_at=excluded.updated_at, updated_by=excluded.updated_by;
  return p_series_id;
end;
$$;
revoke all on function public.team_feature_set(uuid,uuid) from public,anon;
grant execute on function public.team_feature_set(uuid,uuid) to authenticated;
comment on table public.team_featured_series is 'Una recomendación pública por equipo para la rotación diaria del carrusel de Inicio';

-- Glosario por obra: lectura pública, escritura solo con permiso "edit" en el equipo dueño de la serie
create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  term text not null check (char_length(term) between 1 and 60),
  category text not null default 'Otro',
  definition text not null check (char_length(definition) between 1 and 600),
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists glossary_terms_series_term on public.glossary_terms (series_id, lower(term));
alter table public.glossary_terms enable row level security;

create or replace function public.can_edit_series(p_series uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (public.my_team_permissions(s.team_id) ->> 'edit')::boolean from public.series s where s.id = p_series), false)
$$;

drop policy if exists "glosario lectura" on public.glossary_terms;
create policy "glosario lectura" on public.glossary_terms for select using (true);
drop policy if exists "glosario alta" on public.glossary_terms;
create policy "glosario alta" on public.glossary_terms for insert with check (public.can_edit_series(series_id));
drop policy if exists "glosario cambio" on public.glossary_terms;
create policy "glosario cambio" on public.glossary_terms for update using (public.can_edit_series(series_id)) with check (public.can_edit_series(series_id));
drop policy if exists "glosario baja" on public.glossary_terms;
create policy "glosario baja" on public.glossary_terms for delete using (public.can_edit_series(series_id));

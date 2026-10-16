-- Temas propios del equipo (máx. 12).
create table if not exists public.team_custom_themes (id bigint generated always as identity primary key, team_id uuid not null references public.teams(id) on delete cascade, name text not null check (char_length(btrim(name)) between 1 and 40), design jsonb not null check (jsonb_typeof(design) = 'object' and pg_column_size(design) < 20000), created_by uuid references public.profiles(id) on delete set null default auth.uid(), updated_at timestamptz not null default now(), unique (team_id, name));
alter table public.team_custom_themes enable row level security;
drop policy if exists "ctheme read" on public.team_custom_themes;
create policy "ctheme read" on public.team_custom_themes for select using (private.team_can(team_id, 'profile'));
drop policy if exists "ctheme write" on public.team_custom_themes;
create policy "ctheme write" on public.team_custom_themes for insert with check (private.team_can(team_id, 'profile') and (select count(*) from public.team_custom_themes x where x.team_id = team_custom_themes.team_id) < 12);
drop policy if exists "ctheme update" on public.team_custom_themes;
create policy "ctheme update" on public.team_custom_themes for update using (private.team_can(team_id, 'profile')) with check (private.team_can(team_id, 'profile'));
drop policy if exists "ctheme delete" on public.team_custom_themes;
create policy "ctheme delete" on public.team_custom_themes for delete using (private.team_can(team_id, 'profile'));

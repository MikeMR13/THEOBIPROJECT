-- Seguir equipos.
create table if not exists public.team_follows (team_id uuid not null references public.teams(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(), created_at timestamptz not null default now(), primary key (team_id, user_id));
alter table public.team_follows enable row level security;
drop policy if exists "tf read own" on public.team_follows;
create policy "tf read own" on public.team_follows for select using (user_id = auth.uid() or private.in_team(team_id));
drop policy if exists "tf insert own" on public.team_follows;
create policy "tf insert own" on public.team_follows for insert with check (user_id = auth.uid());
drop policy if exists "tf delete own" on public.team_follows;
create policy "tf delete own" on public.team_follows for delete using (user_id = auth.uid());
create or replace function public.team_followers(p_team uuid) returns int language sql stable security definer set search_path = '' as $$ select count(*)::int from public.team_follows where team_id = p_team $$;
grant execute on function public.team_followers(uuid) to anon, authenticated;

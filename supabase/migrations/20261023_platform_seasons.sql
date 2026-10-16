-- Temporadas de toda la plataforma (Bibliotecario). Ya aplicada en producción.
create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  seasons jsonb not null default '{}'::jsonb check (jsonb_typeof(seasons) = 'object' and pg_column_size(seasons) < 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.platform_settings (id) values (1) on conflict do nothing;
alter table public.platform_settings enable row level security;
create policy "ps read" on public.platform_settings for select using (true);
create policy "ps update" on public.platform_settings for update using (private.is_admin()) with check (private.is_admin());
-- private.notify_seasons(): además avisa a los Bibliotecarios 7 días antes de cada temporada automática de la plataforma.

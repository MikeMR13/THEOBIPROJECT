-- Preferencias › Contenido (géneros ocultos), Accesibilidad (movimiento, contraste, enlaces, foco, hora) y Bloqueos.

-- ui_prefs = { motion: system|reduce, contrast, underline, focus: bool, hour: auto|12|24, hide: [géneros/etiquetas] }
alter table public.profiles add column if not exists ui_prefs jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_ui_prefs_check;
alter table public.profiles add constraint profiles_ui_prefs_check check (
  jsonb_typeof(ui_prefs) = 'object' and octet_length(ui_prefs::text) < 4000
  and coalesce(ui_prefs->>'motion', 'system') in ('system', 'reduce')
  and coalesce(ui_prefs->>'hour', 'auto') in ('auto', '12', '24')
  and (ui_prefs->'hide' is null or (jsonb_typeof(ui_prefs->'hide') = 'array' and jsonb_array_length(ui_prefs->'hide') <= 40))) not valid;

-- ---------- silenciar / bloquear ----------
create table if not exists public.user_blocks (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'mute' check (kind in ('mute', 'block')),
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id), check (user_id <> blocked_id));
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id) where kind = 'block';
alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_own on public.user_blocks;
create policy user_blocks_own on public.user_blocks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.my_blocks() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.blocked_id, 'username', p.username, 'avatar_url', p.avatar_url, 'kind', b.kind, 'at', b.created_at) order by b.created_at desc), '[]'::jsonb)
  from public.user_blocks b join public.profiles p on p.id = b.blocked_id where b.user_id = auth.uid() $$;

create or replace function public.block_user(p_username text, p_kind text default 'mute') returns void language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_kind not in ('mute', 'block') then raise exception 'Tipo no válido'; end if;
  select id into t from public.profiles where lower(username) = lower(btrim(p_username)) limit 1;
  if t is null then raise exception 'No encontramos a ningún lector con ese nombre'; end if;
  if t = auth.uid() then raise exception 'No puedes silenciarte a ti mismo'; end if;
  if (select count(*) from public.user_blocks where user_id = auth.uid()) >= 500 and not exists (select 1 from public.user_blocks where user_id = auth.uid() and blocked_id = t) then
    raise exception 'Llegaste al límite de 500 lectores'; end if;
  insert into public.user_blocks (user_id, blocked_id, kind) values (auth.uid(), t, p_kind)
    on conflict (user_id, blocked_id) do update set kind = excluded.kind;
end $$;

create or replace function public.unblock_user(p_id uuid) returns void language sql security definer set search_path = '' as $$
  delete from public.user_blocks where user_id = auth.uid() and blocked_id = p_id $$;

revoke all on function public.my_blocks() from public, anon;
revoke all on function public.block_user(text, text) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.my_blocks() to authenticated;
grant execute on function public.block_user(text, text) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- Quien te bloqueó no puede responder a tus comentarios.
create or replace function private.comments_block_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_id is not null and exists (
    select 1 from public.comments c join public.user_blocks b on b.user_id = c.user_id and b.blocked_id = new.user_id and b.kind = 'block'
    where c.id = new.parent_id) then
    raise exception 'No puedes responder a este comentario';
  end if;
  return new;
end $$;
drop trigger if exists comments_block_guard on public.comments;
create trigger comments_block_guard before insert on public.comments for each row execute function private.comments_block_guard();

grant update (ui_prefs) on public.profiles to authenticated;

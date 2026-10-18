-- Cierra los pendientes de Preferencias fase 4:
-- 1) Quien bloqueaste ve tu carnet como privado.  2) Zona horaria elegida (ui_prefs.tz).

alter table public.profiles drop constraint if exists profiles_ui_prefs_tz_check;
alter table public.profiles add constraint profiles_ui_prefs_tz_check check (
  coalesce(ui_prefs->>'tz', '') = '' or (ui_prefs->>'tz') ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$') not valid;

-- La versión actual de reader_public pasa a private.reader_public_core; la pública añade el filtro de bloqueo.
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'reader_public_core') then
    alter function public.reader_public(text) rename to reader_public_core;
    alter function public.reader_public_core(text) set schema private;
  end if;
end $$;
revoke all on function private.reader_public_core(text) from public, anon, authenticated;

create or replace function public.reader_public(p_username text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pr record;
begin
  select id, username, avatar_url, accent into pr from public.profiles where lower(username) = lower(p_username) limit 1;
  if pr.id is not null and auth.uid() is not null and pr.id <> auth.uid()
     and exists (select 1 from public.user_blocks b where b.user_id = pr.id and b.blocked_id = auth.uid() and b.kind = 'block') then
    return jsonb_build_object('private', 'none', 'username', pr.username, 'avatar_url', pr.avatar_url, 'accent', pr.accent);
  end if;
  return private.reader_public_core(p_username);
end $$;
grant execute on function public.reader_public(text) to anon, authenticated;
-- Nota: si en el futuro una migración vuelve a definir reader_public, debe editar private.reader_public_core en su lugar.

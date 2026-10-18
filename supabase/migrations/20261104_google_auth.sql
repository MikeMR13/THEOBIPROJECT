-- Inicio de sesión con Google: los lectores nuevos sin nombre elegido pasan por /elige-nombre.

alter table public.profiles add column if not exists needs_username boolean not null default false;

-- Igual que antes, pero marca needs_username cuando la cuenta llega sin nombre (Google u otros proveedores).
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare u text := nullif(btrim(coalesce(new.raw_user_meta_data->>'username', '')), '');
begin
  insert into public.profiles (id, username, needs_username)
  values (new.id, coalesce(u, split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)), u is null);
  return new;
end $$;

create or replace function public.set_initial_username(p_new text) returns text language plpgsql security definer set search_path = '' as $$
declare v text := btrim(coalesce(p_new, ''));
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and needs_username) then
    raise exception 'Tu nombre ya está elegido. Puedes cambiarlo en Preferencias › Cuenta'; end if;
  if char_length(v) < 2 or char_length(v) > 32 then raise exception 'El nombre debe tener entre 2 y 32 caracteres'; end if;
  if v !~ '^[[:alnum:]_.-]+$' then raise exception 'Usa solo letras, números, punto, guion y guion bajo (sin espacios)'; end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v) and id <> auth.uid())
     or exists (select 1 from public.username_aliases where old_lower = lower(v) and user_id <> auth.uid() and changed_at > now() - interval '90 days') then
    raise exception 'Ese nombre ya está en uso'; end if;
  update public.profiles set username = v, needs_username = false where id = auth.uid();
  return v;
exception when unique_violation then raise exception 'Ese nombre ya está en uso';
end $$;

create or replace function public.keep_username() returns void language sql security definer set search_path = '' as $$
  update public.profiles set needs_username = false where id = auth.uid() $$;

revoke all on function public.set_initial_username(text) from public, anon;
revoke all on function public.keep_username() from public, anon;
grant execute on function public.set_initial_username(text) to authenticated;
grant execute on function public.keep_username() to authenticated;

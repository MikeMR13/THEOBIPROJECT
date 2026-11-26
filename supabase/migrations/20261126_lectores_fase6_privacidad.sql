-- Fase 6 · Correcciones de privacidad (aplicada en producción el 26 nov 2026).
-- La política «shelves public» consultaba profiles.public_library, columna que «authenticated» ya no puede leer
-- (seg02): cualquier lectura de shelves con sesión fallaba con «permission denied for table profiles».
-- Se reemplaza por una función security definer que solo responde sí/no, sin exponer profiles.
create or replace function private.library_is_public(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.public_library from public.profiles p where p.id = p_user), false);
$$;
revoke all on function private.library_is_public(uuid) from public;
grant execute on function private.library_is_public(uuid) to anon, authenticated;

drop policy if exists "shelves public" on public.shelves;
create policy "shelves public" on public.shelves for select using (private.library_is_public(user_id));

-- Nombre público del dueño de una estantería o lista, solo si es pública o es tuya (la página /lista/:id ya no lee profiles).
create or replace function public.collection_owner(p_collection uuid) returns text
language sql stable security definer set search_path = '' as $$
  select pr.username from public.collections c join public.profiles pr on pr.id = c.user_id
  where c.id = p_collection and (c.is_public or c.user_id = auth.uid());
$$;
revoke all on function public.collection_owner(uuid) from public;
grant execute on function public.collection_owner(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

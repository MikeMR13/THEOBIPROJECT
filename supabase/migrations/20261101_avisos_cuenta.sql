-- Preferencias › Avisos (campana/correo por tipo + frecuencia) y Preferencias › Cuenta (cambio de nombre con alias)
-- Requiere: Resend (ya configurado como SMTP) y la Edge Function notify-email.

alter table public.profiles
  add column if not exists notify jsonb not null default '{}'::jsonb,
  add column if not exists username_changed_at timestamptz;
-- notify = { web: {capitulo:bool,…}, email: {capitulo:bool,…}, freq: off|inmediato|diario|semanal, tz: 'America/Mexico_City' }
alter table public.profiles drop constraint if exists profiles_notify_check;
alter table public.profiles add constraint profiles_notify_check check (
  jsonb_typeof(notify) = 'object' and octet_length(notify::text) < 2000
  and coalesce(notify->>'freq', 'off') in ('off', 'inmediato', 'diario', 'semanal')
  and (notify->>'tz' is null or (notify->>'tz') ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$')) not valid;

-- ---------- cola de correo ----------
create table if not exists private.email_queue (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, body text not null, href text,
  created_at timestamptz not null default now(), sent_at timestamptz);
create index if not exists email_queue_pending on private.email_queue(user_id, created_at) where sent_at is null;
create table if not exists private.email_sent (user_id uuid primary key references public.profiles(id) on delete cascade, last_at timestamptz not null);

-- Antes de guardar cada aviso: lo encola para correo si toca y lo descarta de la campana si el lector la apagó para ese tipo.
create or replace function private.notify_route() returns trigger language plpgsql security definer set search_path = '' as $$
declare n jsonb; h text;
begin
  select coalesce(notify, '{}'::jsonb) into n from public.profiles where id = new.user_id;
  n := coalesce(n, '{}'::jsonb);
  h := case jsonb_typeof(new.link) when 'string' then new.link #>> '{}' when 'object' then new.link->>'href' end;
  if coalesce(n->>'freq', 'off') <> 'off'
     and coalesce((n->'email'->>new.kind)::boolean, new.kind in ('capitulo', 'respuesta', 'errata', 'moderacion')) then
    insert into private.email_queue (user_id, kind, body, href) values (new.user_id, new.kind, new.body, h);
  end if;
  if new.kind <> 'moderacion' and n->'web'->>new.kind = 'false' then return null; end if;
  return new;
end $$;
drop trigger if exists notifications_route on public.notifications;
create trigger notifications_route before insert on public.notifications for each row execute function private.notify_route();

-- Lote de correos pendientes (solo service_role, lo llama la Edge Function cada 10 min).
create or replace function public.email_batch(p_limit int default 50) returns jsonb language sql stable security definer set search_path = '' as $$
  with u as (
    select p.id, p.username, coalesce(p.notify->>'freq', 'off') freq, coalesce((select z.name from pg_catalog.pg_timezone_names z where z.name = p.notify->>'tz' limit 1), 'America/Mexico_City') tz, s.last_at
    from public.profiles p left join private.email_sent s on s.user_id = p.id
    where coalesce(p.notify->>'freq', 'off') <> 'off' and p.delete_requested_at is null
      and exists (select 1 from private.email_queue q where q.user_id = p.id and q.sent_at is null)),
  due as (
    select u.* from u, lateral (select now() at time zone u.tz lt) z
    where u.freq = 'inmediato'
       or (u.freq = 'diario' and extract(hour from z.lt) >= 9 and (u.last_at is null or (u.last_at at time zone u.tz)::date < z.lt::date))
       or (u.freq = 'semanal' and extract(isodow from z.lt) = 1 and extract(hour from z.lt) >= 9 and (u.last_at is null or u.last_at < now() - interval '6 days'))
    limit greatest(1, least(p_limit, 200)))
  select coalesce(jsonb_agg(jsonb_build_object('user_id', d.id, 'username', d.username, 'email', a.email, 'freq', d.freq,
    'items', (select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'body', q.body, 'href', q.href, 'at', q.created_at) order by q.created_at desc)
              from (select * from private.email_queue q where q.user_id = d.id and q.sent_at is null order by q.created_at desc limit 40) q))), '[]'::jsonb)
  from due d join auth.users a on a.id = d.id
  where a.email is not null and a.email_confirmed_at is not null $$;

create or replace function public.email_mark_sent(p_users uuid[]) returns void language sql security definer set search_path = '' as $$
  update private.email_queue set sent_at = now() where user_id = any(p_users) and sent_at is null;
  insert into private.email_sent (user_id, last_at) select unnest(p_users), now() on conflict (user_id) do update set last_at = excluded.last_at;
  delete from private.email_queue where sent_at < now() - interval '30 days';
$$;
revoke all on function public.email_batch(int) from public, anon, authenticated;
revoke all on function public.email_mark_sent(uuid[]) from public, anon, authenticated;
grant execute on function public.email_batch(int) to service_role;
grant execute on function public.email_mark_sent(uuid[]) to service_role;

-- ---------- cambio de nombre de usuario ----------
create table if not exists public.username_aliases (
  old_lower text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  changed_at timestamptz not null default now());
alter table public.username_aliases enable row level security; -- sin políticas: solo vía funciones

create or replace function public.change_username(p_new text) returns text language plpgsql security definer set search_path = '' as $$
declare v text := btrim(coalesce(p_new, '')); cur text; last timestamptz;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para cambiar tu nombre'; end if;
  if char_length(v) < 2 or char_length(v) > 32 then raise exception 'El nombre debe tener entre 2 y 32 caracteres'; end if;
  if v !~ '^[[:alnum:]_.-]+$' then raise exception 'Usa solo letras, números, punto, guion y guion bajo (sin espacios)'; end if;
  select username, username_changed_at into cur, last from public.profiles where id = auth.uid() for update;
  if cur = v then return v; end if;
  if lower(cur) = lower(v) then update public.profiles set username = v where id = auth.uid(); return v; end if;
  if last is not null and last > now() - interval '30 days' then
    raise exception 'Solo puedes cambiar tu nombre una vez cada 30 días. Podrás de nuevo el %', to_char(last + interval '30 days', 'DD/MM/YYYY'); end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v) and id <> auth.uid())
     or exists (select 1 from public.username_aliases where old_lower = lower(v) and user_id <> auth.uid() and changed_at > now() - interval '90 days') then
    raise exception 'Ese nombre ya está en uso'; end if;
  delete from public.username_aliases where old_lower = lower(v);
  insert into public.username_aliases (old_lower, user_id, changed_at) values (lower(cur), auth.uid(), now())
    on conflict (old_lower) do update set user_id = excluded.user_id, changed_at = excluded.changed_at;
  update public.profiles set username = v, username_changed_at = now() where id = auth.uid();
  return v;
exception when unique_violation then raise exception 'Ese nombre ya está en uso';
end $$;
revoke all on function public.change_username(text) from public, anon;
grant execute on function public.change_username(text) to authenticated;

-- /lector/<nombre-anterior> → nombre actual (90 días)
create or replace function public.username_resolve(p_name text) returns text language sql stable security definer set search_path = '' as $$
  select p.username from public.username_aliases a join public.profiles p on p.id = a.user_id
  where a.old_lower = lower(btrim(p_name)) and a.changed_at > now() - interval '90 days' and p.delete_requested_at is null $$;
grant execute on function public.username_resolve(text) to anon, authenticated;

select cron.unschedule('obi-alias-purge') where exists (select 1 from cron.job where jobname = 'obi-alias-purge');
select cron.schedule('obi-alias-purge', '41 4 * * *', $$delete from public.username_aliases where changed_at < now() - interval '90 days'$$);

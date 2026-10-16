-- Fase 5 · Extras: enlaces de compra oficiales (verificados por el Bibliotecario) y zona horaria del equipo.
alter table public.purchase_links
  add column if not exists volume_id uuid references public.volumes(id) on delete cascade,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists clicks int not null default 0;
alter table public.purchase_links drop constraint if exists purchase_links_checks;
alter table public.purchase_links add constraint purchase_links_checks check (url ~ '^https://' and char_length(url) <= 600 and char_length(store) between 2 and 40 and (region is null or char_length(region) <= 20) and (fmt is null or fmt in ('Digital','Físico','Audiolibro'))) not valid;
drop policy if exists "buy add" on public.purchase_links;
create policy "buy add" on public.purchase_links for insert with check (private.team_can(private.series_team(series_id), 'edit') and verified = false and created_by = auth.uid());
drop policy if exists "buy remove" on public.purchase_links;
create policy "buy remove" on public.purchase_links for delete using (private.team_can(private.series_team(series_id), 'edit') or private.is_admin());

-- solo el Bibliotecario modifica (verifica); los clics pasan por purchase_open
create or replace function private.purchase_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() and current_setting('obi.click', true) is distinct from '1' then raise exception 'forbidden'; end if;
  if new.verified and not old.verified then new.verified_at := now(); end if;
  return new;
end $$;
drop trigger if exists purchase_guard on public.purchase_links;
create trigger purchase_guard before update on public.purchase_links for each row execute function private.purchase_guard();

create or replace function private.log_purchase() returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.purchase_links := coalesce(new, old); w text; t uuid;
begin
  select coalesce(short, title), team_id into w, t from public.series where id = p.series_id;
  if tg_op = 'INSERT' then perform private.log(t, 'edicion', 'Propuso el enlace de compra ' || p.store || ' de ' || coalesce(w, '') || coalesce(' · Vol. ' || p.vol, ''), '{}', p.series_id);
  elsif tg_op = 'DELETE' then perform private.log(t, 'borrado', 'Quitó el enlace de compra ' || p.store || ' de ' || coalesce(w, ''), '{}', p.series_id);
  elsif new.verified and not old.verified then
    perform private.log(t, 'edicion', 'El Bibliotecario verificó el enlace de compra ' || p.store || ' de ' || coalesce(w, ''), '{}', p.series_id);
    perform private.audit('verificar_compra', 'purchase_link', p.id::text, jsonb_build_object('url', p.url));
  end if;
  return null;
end $$;
drop trigger if exists purchase_log on public.purchase_links;
create trigger purchase_log after insert or update or delete on public.purchase_links for each row execute function private.log_purchase();

create or replace function public.purchase_open(p_id bigint) returns text language plpgsql security definer set search_path = '' as $$
declare u text;
begin
  perform set_config('obi.click', '1', true);
  update public.purchase_links set clicks = clicks + 1 where id = p_id and verified returning url into u;
  perform set_config('obi.click', '', true);
  return u;
end $$;
revoke all on function public.purchase_open(bigint) from public;
grant execute on function public.purchase_open(bigint) to anon, authenticated;

create or replace function public.admin_purchase_queue() returns table(id bigint, series_title text, series_slug text, team_name text, vol int, store text, region text, fmt text, url text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  return query select p.id, s.title, s.slug, t.name, p.vol, p.store, p.region, p.fmt, p.url, p.created_at
    from public.purchase_links p join public.series s on s.id = p.series_id join public.teams t on t.id = s.team_id where not p.verified order by p.created_at;
end $$;
revoke all on function public.admin_purchase_queue() from public, anon;
grant execute on function public.admin_purchase_queue() to authenticated;

-- zona horaria del equipo: teams.settings.timezone (IANA)
alter table public.teams drop constraint if exists teams_tz_check;
alter table public.teams add constraint teams_tz_check check (settings->>'timezone' is null or (settings->>'timezone') ~ '^[A-Za-z_]+(/[A-Za-z_+-]+){0,2}$') not valid;

-- Fase 4 · Lectores: vistas por capítulo, estadísticas, comunidad, descargas por volumen y avisos.

-- ---------- vistas ----------
create table if not exists public.chapter_views (
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  day date not null default current_date,
  n int not null default 0,
  primary key (chapter_id, day)
);
alter table public.chapter_views enable row level security; -- sin políticas: solo vía funciones

create or replace function public.track_view(p_chapter uuid) returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  select series_id into sid from public.chapters where id = p_chapter and status = 'published' and deleted_at is null;
  if sid is null then return; end if;
  insert into public.chapter_views (chapter_id, day, n) values (p_chapter, current_date, 1)
    on conflict (chapter_id, day) do update set n = public.chapter_views.n + 1;
  update public.series set views = coalesce(views, 0) + 1 where id = sid;
end $$;
revoke all on function public.track_view(uuid) from public;
grant execute on function public.track_view(uuid) to anon, authenticated;

-- ---------- estadísticas por capítulo ----------
create or replace function public.series_stats(p_series uuid, p_days int default 30) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare d int := least(greatest(coalesce(p_days, 30), 1), 365); since date := current_date - (least(greatest(coalesce(p_days, 30), 1), 365) - 1);
begin
  if not private.in_team((select team_id from public.series where id = p_series)) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'days', d,
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', g::date, 'n', coalesce(x.n, 0)) order by g)
      from generate_series(since, current_date, interval '1 day') g
      left join (select v.day, sum(v.n) n from public.chapter_views v join public.chapters c on c.id = v.chapter_id where c.series_id = p_series and v.day >= since group by v.day) x on x.day = g::date), '[]'),
    'followers', (select count(*) from public.follows where series_id = p_series),
    'chapters', coalesce((select jsonb_agg(r order by r.vol, r.num) from (
      select c.id, c.num, c.vol, c.title, c.section_type, c.publish_at, c.lint_count,
        coalesce((select sum(n) from public.chapter_views v where v.chapter_id = c.id and v.day >= since), 0) views,
        coalesce((select sum(n) from public.chapter_views v where v.chapter_id = c.id), 0) views_total,
        (select count(*) from public.read_chapters rc where rc.chapter_id = c.id) finished,
        (select count(*) from public.reading_progress rp where rp.chapter_id = c.id and coalesce(rp.pct, 0) < 0.97) here,
        (select count(*) from public.comments m where m.chapter_id = c.id) comments,
        (select count(*) from public.reactions x where x.chapter_id = c.id) reactions,
        (select count(*) from public.reports p where p.chapter_id = c.id and p.status = 'open') reports
      from public.chapters c where c.series_id = p_series and c.status = 'published' and c.deleted_at is null) r), '[]'));
end $$;
revoke all on function public.series_stats(uuid, int) from public, anon;
grant execute on function public.series_stats(uuid, int) to authenticated;

-- ---------- comunidad ----------
alter table public.comments add column if not exists pinned boolean not null default false;

create or replace function public.team_comments(p_team uuid, p_unanswered boolean default false, p_series uuid default null, p_limit int default 50, p_before timestamptz default null)
returns table(id bigint, chapter_id uuid, parent_id bigint, user_id uuid, username text, avatar_url text, body text, spoiler boolean, pinned boolean, para int, created_at timestamptz,
  series_slug text, series_title text, ch_num int, ch_title text, from_team boolean, team_replied boolean, replies bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.in_team(p_team) then raise exception 'forbidden'; end if;
  return query
  select m.id, m.chapter_id, m.parent_id, m.user_id, p.username, p.avatar_url, m.body, m.spoiler, m.pinned, m.para, m.created_at,
    s.slug, coalesce(s.short, s.title), c.num, c.title,
    exists (select 1 from public.team_members tm where tm.team_id = p_team and tm.user_id = m.user_id),
    exists (select 1 from public.comments r join public.team_members tm on tm.user_id = r.user_id and tm.team_id = p_team where r.parent_id = m.id),
    (select count(*) from public.comments r where r.parent_id = m.id)
  from public.comments m join public.chapters c on c.id = m.chapter_id join public.series s on s.id = c.series_id
  left join public.profiles p on p.id = m.user_id
  where s.team_id = p_team and m.parent_id is null and (p_series is null or s.id = p_series) and (p_before is null or m.created_at < p_before)
    and (not p_unanswered or (not exists (select 1 from public.team_members tm where tm.team_id = p_team and tm.user_id = m.user_id)
      and not exists (select 1 from public.comments r join public.team_members tm on tm.user_id = r.user_id and tm.team_id = p_team where r.parent_id = m.id)))
  order by m.created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200);
end $$;
revoke all on function public.team_comments(uuid, boolean, uuid, int, timestamptz) from public, anon;
grant execute on function public.team_comments(uuid, boolean, uuid, int, timestamptz) to authenticated;

create or replace function public.comment_pin(p_id bigint, p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select chapter_id into c from public.comments where id = p_id;
  if c is null then raise exception 'not_found'; end if;
  if not private.team_can(private.chapter_team(c), 'review') then raise exception 'forbidden' using hint = 'Tu rol no permite moderar comentarios'; end if;
  if p_on then update public.comments set pinned = false where chapter_id = c and pinned; end if;
  update public.comments set pinned = p_on where id = p_id;
end $$;
revoke all on function public.comment_pin(bigint, boolean) from public, anon;
grant execute on function public.comment_pin(bigint, boolean) to authenticated;

-- moderar y cerrar erratas: permiso «review»
drop policy if exists "comments delete" on public.comments;
create policy "comments delete" on public.comments for delete using (user_id = auth.uid() or private.is_mod() or private.team_can(private.chapter_team(chapter_id), 'review'));
drop policy if exists "reports resolve" on public.reports;
create policy "reports resolve" on public.reports for update using (private.team_can(private.chapter_team(chapter_id), 'review') or private.is_mod()) with check (private.team_can(private.chapter_team(chapter_id), 'review') or private.is_mod());

-- avisos: respuesta a tu comentario, errata nueva, errata corregida
create or replace function private.notify_comment() returns trigger language plpgsql security definer set search_path = '' as $$
declare pa uuid; c public.chapters; s public.series;
begin
  if new.parent_id is null then return null; end if;
  select user_id into pa from public.comments where id = new.parent_id;
  if pa is null or pa = new.user_id then return null; end if;
  select * into c from public.chapters where id = new.chapter_id; select * into s from public.series where id = c.series_id;
  insert into public.notifications (user_id, kind, body, link) values (pa, 'respuesta',
    coalesce((select username from public.profiles where id = new.user_id), 'Alguien') || ' respondió tu comentario en ' || coalesce(s.short, s.title) || ' · ' || private.ch_label(c),
    jsonb_build_object('href', '/leer/' || s.slug || '/' || c.num));
  return null;
end $$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function private.notify_comment();

create or replace function private.notify_report() returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.chapters; s public.series; who uuid[];
begin
  select * into c from public.chapters where id = new.chapter_id; select * into s from public.series where id = c.series_id;
  if tg_op = 'INSERT' then
    who := case when c.assigned_to is not null then array[c.assigned_to]
      else array(select m.user_id from public.team_members m where m.team_id = s.team_id and m.user_id is distinct from new.user_id
        and (m.role = 'owner' or coalesce((m.overrides->>'review')::boolean, (select (r.perms->>'review')::boolean from public.team_roles r where r.id = m.role_id), false)) limit 20) end;
    insert into public.notifications (user_id, kind, body, link)
      select u, 'errata', 'Nueva errata en ' || coalesce(s.short, s.title) || ' · ' || private.ch_label(c) || coalesce(': «' || left(new.quote, 80) || '»', ''), jsonb_build_object('href', '/estudio/comunidad')
      from unnest(who) u;
  elsif new.status = 'fixed' and old.status <> 'fixed' and new.user_id is not null then
    insert into public.notifications (user_id, kind, body, link) values (new.user_id, 'errata',
      '¡Gracias! Corregimos la errata que reportaste en ' || coalesce(s.short, s.title) || ' · ' || private.ch_label(c), jsonb_build_object('href', '/leer/' || s.slug || '/' || c.num));
  end if;
  return null;
end $$;
drop trigger if exists reports_notify on public.reports;
create trigger reports_notify after insert or update of status on public.reports for each row execute function private.notify_report();

create or replace function public.notifications_read_all() returns void language sql security definer set search_path = '' as $$
  update public.notifications set read = true where user_id = auth.uid() and not read $$;
grant execute on function public.notifications_read_all() to authenticated;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------- descargas por volumen ----------
alter table public.download_links
  add column if not exists volume_id uuid references public.volumes(id) on delete cascade,
  add column if not exists label text,
  add column if not exists donor_only boolean not null default false,
  add column if not exists clicks int not null default 0,
  add column if not exists sort int not null default 0;
alter table public.download_links drop constraint if exists download_links_checks;
alter table public.download_links add constraint download_links_checks check (url ~ '^https://' and char_length(url) <= 600 and fmt in ('EPUB','PDF','MOBI','AZW3','CBZ','DOCX','ZIP') and (label is null or char_length(label) <= 60)) not valid;
drop policy if exists "dl read" on public.download_links;
create policy "dl read" on public.download_links for select using (private.in_team(private.series_team(series_id)));

create or replace function public.series_downloads(p_series uuid) returns table(id bigint, volume_id uuid, vol int, fmt text, provider text, label text, donor_only boolean, locked boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.volume_id, d.vol, d.fmt, d.provider, d.label, d.donor_only, d.donor_only and not (private.is_donor() or private.in_team(private.series_team(d.series_id)))
  from public.download_links d join public.series s on s.id = d.series_id
  where d.series_id = p_series and s.archived_at is null
  order by d.vol, d.sort, d.id $$;
create or replace function public.download_open(p_id bigint) returns text language plpgsql security definer set search_path = '' as $$
declare d public.download_links;
begin
  select * into d from public.download_links where id = p_id;
  if d.id is null then raise exception 'not_found'; end if;
  if d.donor_only and not (private.is_donor() or private.in_team(private.series_team(d.series_id))) then raise exception 'donor_only' using hint = 'Esta descarga es solo para donadores'; end if;
  update public.download_links set clicks = clicks + 1 where id = p_id;
  return d.url;
end $$;
revoke all on function public.series_downloads(uuid), public.download_open(bigint) from public;
grant execute on function public.series_downloads(uuid), public.download_open(bigint) to anon, authenticated;

create or replace function private.log_downloads() returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.download_links := coalesce(new, old); w text;
begin
  if tg_op = 'UPDATE' and new.clicks is distinct from old.clicks and (new.url, new.fmt, new.donor_only, new.label) is not distinct from (old.url, old.fmt, old.donor_only, old.label) then return null; end if;
  select coalesce(short, title) into w from public.series where id = d.series_id;
  perform private.log(private.series_team(d.series_id), case when tg_op = 'DELETE' then 'borrado' else 'edicion' end,
    case tg_op when 'INSERT' then 'Agregó la descarga ' when 'DELETE' then 'Quitó la descarga ' else 'Editó la descarga ' end || d.fmt || ' de ' || coalesce(w, '') || ' · Vol. ' || d.vol, '{}', d.series_id);
  return null;
end $$;
drop trigger if exists downloads_log on public.download_links;
create trigger downloads_log after insert or update or delete on public.download_links for each row execute function private.log_downloads();

-- Fase 2 · Escritura: editor de página, historial, revisión automática, avance y marcadores de contenido.
drop function if exists public.save_chapter(uuid, timestamptz, text, jsonb, text);
drop function if exists public.save_chapter(uuid, integer, text, jsonb, text);

alter table public.chapters
  add column if not exists teaser text,
  add column if not exists teaser_on boolean not null default false,
  add column if not exists content_warnings text[] not null default '{}',
  add column if not exists lint jsonb,
  add column if not exists lint_count int not null default 0;

alter table public.chapters drop constraint if exists chapters_teaser_len;
alter table public.chapters add constraint chapters_teaser_len check (teaser is null or char_length(teaser) <= 1000);
alter table public.chapters drop constraint if exists chapters_cw_check;
alter table public.chapters add constraint chapters_cw_check check (content_warnings <@ array['Violencia','Sangre','Muerte','Autolesión','Abuso','Acoso','Contenido sexual','Lenguaje fuerte','Drogas / alcohol','Horror','Discriminación','Spoiler de otra obra']::text[]);

alter table public.chapter_revisions
  add column if not exists kind text not null default 'manual' check (kind in ('manual','auto','restore','publish')),
  add column if not exists version int,
  add column if not exists lint_count int;
create index if not exists chapter_revisions_ch_idx on public.chapter_revisions (chapter_id, created_at desc);

-- Guarda con control de versión. p_snapshot=false (autoguardado) solo crea versión si la última tiene más de 10 minutos.
create or replace function public.save_chapter(p_id uuid, p_expected int, p_title text, p_body jsonb, p_note text default null, p_snapshot boolean default true, p_meta jsonb default '{}'::jsonb, p_kind text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare c public.chapters; v_last timestamptz; v_new int; m jsonb := coalesce(p_meta, '{}'::jsonb);
begin
  select * into c from public.chapters where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if not private.team_can(private.series_team(c.series_id), 'edit') then raise exception 'forbidden'; end if;
  if c.version <> p_expected then raise exception 'version_conflict' using detail = c.version::text, hint = 'Otro integrante guardó antes. Recarga para ver sus cambios.'; end if;
  if jsonb_typeof(p_body) <> 'array' or jsonb_array_length(p_body) > 6000 or pg_column_size(p_body) > 3000000 then raise exception 'body_invalid' using hint = 'El capítulo es demasiado grande'; end if;
  v_new := c.version + 1;
  update public.chapters set
    title = left(coalesce(nullif(btrim(p_title), ''), 'Sin título'), 300), body = p_body, version = v_new, updated_at = now(),
    section_type = coalesce(m->>'section_type', section_type),
    teaser = case when m ? 'teaser' then nullif(btrim(m->>'teaser'), '') else teaser end,
    teaser_on = coalesce((m->>'teaser_on')::boolean, teaser_on),
    content_warnings = case when m ? 'content_warnings' then array(select distinct jsonb_array_elements_text(m->'content_warnings')) else content_warnings end,
    lint = case when m ? 'lint' then m->'lint' else lint end,
    lint_count = coalesce((m->>'lint_count')::int, lint_count)
  where id = p_id;
  select max(created_at) into v_last from public.chapter_revisions where chapter_id = p_id;
  if p_snapshot or v_last is null or v_last < now() - interval '10 minutes' then
    insert into public.chapter_revisions (chapter_id, created_by, title, body, note, kind, version, lint_count)
    values (p_id, auth.uid(), p_title, p_body, left(p_note, 300),
      coalesce(case when p_kind in ('restore','publish') then p_kind end, case when p_snapshot then 'manual' else 'auto' end), v_new, (m->>'lint_count')::int);
  end if;
  return v_new;
end $$;
revoke all on function public.save_chapter(uuid, int, text, jsonb, text, boolean, jsonb, text) from public, anon;
grant execute on function public.save_chapter(uuid, int, text, jsonb, text, boolean, jsonb, text) to authenticated;

-- Las versiones solo se crean desde save_chapter.
drop policy if exists "rev insert" on public.chapter_revisions;

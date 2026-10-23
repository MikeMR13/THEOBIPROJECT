-- Separación estricta entre publicación y acceso de mecenas.
-- Compatible con 20261118_download_links_patreon.sql; no se ejecuta contra producción aquí.
-- Reglas: fecha de apertura NULL = acceso exclusivo indefinido,
-- candado de obra y volumen se heredan por TODOS los capítulos,
-- y el calendario individual de capítulos nunca se adelanta por publicar el volumen.

-- La RLS de capítulos es permisiva (las políticas SELECT se combinan con OR).
-- Eliminar el permiso heredado que permitía leer el cuerpo sin verificar el volumen.
drop policy if exists "chapters volume access" on public.chapters;
drop policy if exists "chapters read" on public.chapters;

create or replace function private.chapter_readable(c uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.chapters ch
    join public.series s on s.id = ch.series_id
    left join public.volumes v on v.id = ch.volume_id
    where ch.id = c
      and (
        private.in_team(s.team_id)
        or (
          ch.deleted_at is null
          and s.published and s.archived_at is null
          and ch.status::text = 'published'
          and (ch.publish_at is null or ch.publish_at <= now())
          and (
            ch.volume_id is null
            or (v.id is not null and v.deleted_at is null
                and v.status = 'published'
                and (v.published_at is null or v.published_at <= now()))
          )
          and private.chapter_row_open(
            ch.series_id, ch.volume_id, ch.access, ch.access_min_price, ch.access_until
          )
        )
      )
  )
$$;

create policy "chapters read" on public.chapters
for select to anon, authenticated
using (private.chapter_readable(id));

-- La política existente "chapters read team" queda vigente para el equipo.
-- Ninguna otra política SELECT debe conceder el cuerpo a lectores por fuera del candado.

-- El índice público muestra títulos de capítulos publicados, incluso con candado;
-- los programados aún no deben aparecer antes de su fecha, ni por capítulos ni por volumen.
create or replace function public.series_toc(p_series uuid)
returns table(
  id uuid, num numeric, vol numeric, volume_id uuid,
  title text, section_type text, publish_at timestamptz, locked boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.num::numeric, c.vol::numeric, c.volume_id,
         c.title::text, c.section_type::text, c.publish_at,
         not private.chapter_row_open(
           c.series_id, c.volume_id, c.access, c.access_min_price, c.access_until
         )
  from public.chapters c
  join public.series s on s.id = c.series_id
  left join public.volumes v on v.id = c.volume_id
  where c.series_id = p_series and c.deleted_at is null
    and (
      private.in_team(s.team_id)
      or (
        s.published and s.archived_at is null
        and c.status::text = 'published'
        and (c.publish_at is null or c.publish_at <= now())
        and (
          c.volume_id is null
          or (v.id is not null and v.deleted_at is null
              and v.status = 'published'
              and (v.published_at is null or v.published_at <= now()))
        )
      )
    )
  order by c.num
$$;

-- Publicar un volumen ahora publica solo sus borradores.
-- Los capítulos con programación propia permanecen programados.
create or replace function public.publish_volume(
  p_volume uuid, p_at timestamptz default null
)
returns text
language plpgsql security definer set search_path = '' as $$
declare v record; t uuid;
begin
  select * into v from public.volumes where id = p_volume for update;
  if v.id is null then raise exception 'not_found'; end if;
  t := private.series_team(v.series_id);
  if p_at is not null and p_at > now() then
    if not private.team_can(t, 'schedule') then raise exception 'forbidden_schedule'; end if;
    update public.volumes set status = 'scheduled', published_at = p_at where id = p_volume;
    -- NO reprogramar capítulos ni modificar publish_at: tienen su propio calendario.
    insert into public.publication_events(team_id, series_id, actor, event, summary)
      values(t, v.series_id, auth.uid(), 'schedule', 'Volumen ' || v.num || ' programado');
    return 'scheduled';
  end if;
  if not private.team_can(t, 'publish') then raise exception 'forbidden_publish'; end if;
  if exists (
    select 1 from public.review_requests r
    join public.chapters c on c.id = r.chapter_id
    where c.volume_id = p_volume and c.deleted_at is null
      and r.status not in ('approved','cancelled')
  ) then
    raise exception 'review_pending' using hint = 'Hay revisiones sin aprobar en este volumen';
  end if;
  update public.volumes
    set status = 'published',
        published_at = now(),
        announced_at = case when status = 'published' then announced_at else null end
    where id = p_volume;
  update public.chapters
    set status = 'published', publish_at = coalesce(publish_at, now())
    where volume_id = p_volume and status = 'draft' and deleted_at is null;
  update public.series set translation_status = 'completed'
    where id = v.series_id and v.is_final;
  insert into public.publication_events(team_id, series_id, actor, event, summary)
    values(t, v.series_id, auth.uid(), 'publish', 'Volumen ' || v.num || ' publicado');
  perform private.run_publications();
  return 'published';
end
$$;

-- Primero publicar volúmenes vencidos; después, sus borradores y los capítulos
-- programados que YA alcanzaron su fecha (sin tocar los programados futuros).
create or replace function private.run_publications()
returns void
language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  for v in
    update public.volumes
      set status = 'published'
      where status = 'scheduled'
        and published_at <= now() and deleted_at is null
      returning id, series_id, num
  loop
    update public.chapters
      set status = 'published', publish_at = coalesce(publish_at, now())
      where volume_id = v.id and status = 'draft' and deleted_at is null;
  end loop;

  update public.chapters c
    set status = 'published'
    where c.status = 'scheduled'
      and c.publish_at <= now() and c.deleted_at is null
      and (
        c.volume_id is null
        or exists (
          select 1 from public.volumes v
          where v.id = c.volume_id
            and v.status = 'published'
            and v.deleted_at is null
        )
      );

  for v in
    select vo.id, vo.series_id, vo.num, s.title, s.slug
    from public.volumes vo
    join public.series s on s.id = vo.series_id
    where vo.status = 'published' and vo.announced_at is null
    for update of vo skip locked
  loop
    insert into public.notifications(user_id, kind, body, link)
      select f.user_id, 'Volumen',
        v.title || ' · Volumen ' || v.num || ' ya está disponible',
        jsonb_build_object('slug', v.slug, 'vol', v.num)
      from public.follows f
      where f.series_id = v.series_id
        and coalesce((f.channels->>'volumes')::boolean, true);
    update public.volumes set announced_at = now() where id = v.id;
  end loop;
end
$$;

-- No dejar abrir una URL directa de descarga si la obra/volumen o el enlace
-- está restringido (ni si aún no llegó la fecha de publicación).
create or replace function public.download_open(p_id bigint)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.download_links;
  s public.series;
  v public.volumes;
  editor boolean;
begin
  select * into d from public.download_links where id = p_id;
  if d.id is null then raise exception 'not_found'; end if;
  select * into s from public.series where id = d.series_id;
  if s.id is null then raise exception 'not_found'; end if;
  editor := private.in_team(s.team_id);
  select * into v from public.volumes
    where series_id = d.series_id
      and (id = d.volume_id or (d.volume_id is null and num = d.vol))
    limit 1;

  if not editor then
    if not s.published or s.archived_at is not null
      or v.id is null or v.deleted_at is not null or v.status <> 'published'
      or (v.published_at is not null and v.published_at > now())
    then raise exception 'not_available'; end if;
    if not private.access_ok(s.team_id, s.access, s.access_min_price, s.access_until)
      or not private.volume_open(v.id)
    then raise exception 'volume_locked' using hint = 'Este volumen requiere la membresía del Patreon del equipo'; end if;
    if d.patreon_only and not private.is_team_patron(s.team_id) then
      raise exception 'patreon_only'
        using hint = 'Vincula una membresía activa del Patreon de este equipo para descargar';
    end if;
  end if;

  update public.download_links set clicks = clicks + 1 where id = p_id;
  return d.url;
end
$$;

revoke all on function public.download_open(bigint) from public;
grant execute on function public.download_open(bigint) to anon, authenticated;

-- Se conserva access_until nullable en series, volumes y chapters. NULL significa
-- que no hay liberación automática; solo el equipo puede hacerla pública al editar.

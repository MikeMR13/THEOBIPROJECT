-- Candidato controlado: seguimiento de novedades por volumen y capítulo.
-- Aplicar solo tras QA en un entorno seguro. No crea tareas programadas ni envía históricos.
-- Requiere chapter_notified, notify_route, follows, notifications y perfiles existentes.

create table if not exists private.follow_volume_delivered (
  volume_id uuid not null references public.volumes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (volume_id, user_id)
);
-- La tabla está en private (fuera del Data API), solo los triggers definer escriben.

create or replace function private.notify_route()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n jsonb; h text; v record;
begin
  -- El antiguo Worker enviaba directamente «Capítulo», sin controles de acceso;
  -- su equivalente seguro se produce exclusivamente desde private.notify_chapter.
  if new.kind = 'Capítulo' then return null; end if;
  if new.kind in ('Volumen','volumen') then
    -- Aceptar las llamadas antiguas, pero nunca confiar en su slug/volumen.
    select vo.id, vo.series_id, vo.num, se.title, se.slug
      into v
    from public.volumes vo
    join public.series se on se.id = vo.series_id
    where se.slug = new.link->>'slug'
      and vo.num::text = new.link->>'vol'
      and vo.deleted_at is null and vo.status = 'published'
      and (vo.published_at is null or vo.published_at <= now())
      and coalesce(se.published,false) and se.archived_at is null
      -- Avisos generalizados solo para novedades libremente visibles; no revelar acceso mecenas.
      and (coalesce(se.access,'public') = 'public' or (se.access_until is not null and se.access_until <= now()))
      and (coalesce(vo.access,'public') = 'public' or (vo.access_until is not null and vo.access_until <= now()))
      and exists (
        select 1 from public.profiles p
        where p.id = new.user_id and p.delete_requested_at is null
          and (not coalesce(se.adult,false) or coalesce(p.adult_ok,false))
      )
      and not exists (
        select 1 from public.chapters ch
        where (ch.volume_id = vo.id or (ch.volume_id is null and ch.series_id = vo.series_id and ch.vol = vo.num))
          and ch.deleted_at is null and ch.status = 'published'
          and not (coalesce(ch.access,'public') = 'public' or (ch.access_until is not null and ch.access_until <= now()))
      )
    limit 1;
    if v.id is null then return null; end if;
    if not exists (
      select 1 from public.follows f
      where f.user_id = new.user_id and f.series_id = v.series_id
        and coalesce(f.channels->>'volumes','true') <> 'false'
    ) then return null; end if;
    -- Idempotencia incluso si el lector apagó la campana pero activó correo.
    insert into private.follow_volume_delivered(volume_id,user_id)
      values(v.id,new.user_id) on conflict do nothing;
    if not found then return null; end if;
    new.kind := 'volumen';
    new.body := 'Nuevo volumen de «' || v.title || '» · Volumen ' || v.num;
    new.link := jsonb_build_object('href','/serie/' || v.slug || '#serie-vols',
      'volume_id',v.id, 'series',v.series_id, 'num',v.num);
  end if;

  select coalesce(p.notify,'{}'::jsonb) into n
    from public.profiles p where p.id = new.user_id;
  n := coalesce(n,'{}'::jsonb);
  h := case jsonb_typeof(new.link)
    when 'string' then new.link #>> '{}'
    when 'object' then new.link->>'href'
    else null end;
  if coalesce(n->>'freq','off') <> 'off'
     and coalesce(n->'email'->>new.kind,
        case when new.kind in ('capitulo','respuesta','errata','moderacion') then 'true' else 'false' end) = 'true' then
    insert into private.email_queue(user_id,kind,body,href)
    values(new.user_id,new.kind,new.body,h);
  end if;
  if new.kind <> 'moderacion' and n->'web'->>new.kind = 'false' then return null; end if;
  return new;
end $$;
revoke all on function private.notify_route() from public, anon, authenticated;

-- Un capítulo anunciado junto a su volumen no genera un segundo aviso.
-- Nunca se anuncian capítulos no públicos, programados, archivados o exclusivos.
create or replace function private.notify_chapter(p_chapter uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c record; s record; v record;
begin
  select * into c from public.chapters where id = p_chapter;
  if c.id is null or c.status <> 'published' or c.deleted_at is not null
     or coalesce(c.publish_at,now()) > now() then return; end if;
  select * into s from public.series where id = c.series_id;
  if s.id is null or not coalesce(s.published,false) or s.archived_at is not null then return; end if;
  select * into v from public.volumes vo
    where (vo.id = c.volume_id or (c.volume_id is null and vo.series_id = c.series_id and vo.num = c.vol))
      and vo.status = 'published' and vo.deleted_at is null
      and (vo.published_at is null or vo.published_at <= now())
    order by vo.num desc limit 1;
  if v.id is null then return; end if;
  if not (coalesce(s.access,'public') = 'public' or (s.access_until is not null and s.access_until <= now()))
     or not (coalesce(v.access,'public') = 'public' or (v.access_until is not null and v.access_until <= now()))
     or not (coalesce(c.access,'public') = 'public' or (c.access_until is not null and c.access_until <= now()))
  then return; end if;

  -- Durante una publicación de volumen, sus capítulos están en la misma transacción.
  -- Marcar como procesados evita que el cron los anuncie después por separado.
  if v.announced_at is null and v.published_at >= now() - interval '30 minutes'
     and coalesce(c.publish_at,now()) >= v.published_at - interval '30 minutes'
     and coalesce(c.publish_at,now()) <= v.published_at + interval '30 minutes' then
    insert into private.chapter_notified(chapter_id) values(c.id) on conflict do nothing;
    return;
  end if;

  insert into private.chapter_notified(chapter_id) values(c.id) on conflict do nothing;
  if not found then return; end if;

  with fol as (
    select f.user_id from public.follows f
    where f.series_id = s.id
      and coalesce(f.channels->>'web','true') <> 'false'
      and coalesce(f.channels->>'chapters','true') <> 'false'
      and exists (
        select 1 from public.profiles p
        where p.id = f.user_id and p.delete_requested_at is null
          and (not coalesce(s.adult,false) or coalesce(p.adult_ok,false))
      )
      and not exists (
        select 1 from public.team_members m
        where m.team_id = s.team_id and m.user_id = f.user_id
      )
  ), upd as (
    update public.notifications n set
      link = jsonb_build_object('href', '/leer/' || s.slug || '/' ||
        least((n.link->>'from')::numeric,c.num),
        'series', s.id,'n',coalesce((n.link->>'n')::int,1)+1,
        'from',least((n.link->>'from')::numeric,c.num)),
      body = (coalesce((n.link->>'n')::int,1)+1) ||
        ' capítulos nuevos de «' || s.title || '» · desde el cap. ' ||
        least((n.link->>'from')::numeric,c.num),
      created_at = now()
    where n.kind = 'capitulo' and not n.read and n.user_id in (select user_id from fol)
      and n.link->>'series' = s.id::text and n.link ? 'from'
    returning n.user_id
  )
  insert into public.notifications(user_id,kind,body,link)
    select f.user_id,'capitulo',
      'Nuevo capítulo de «' || s.title || '» · Cap. ' || c.num ||
      coalesce(' — ' || nullif(c.title,''),''),
      jsonb_build_object('href','/leer/' || s.slug || '/' || c.num,
        'series',s.id,'n',1,'from',c.num)
    from fol f where f.user_id not in (select user_id from upd);
exception when others then
  raise warning 'notify_chapter: aviso omitido por error de publicación'; 
end $$;
revoke all on function private.notify_chapter(uuid) from public, anon, authenticated;

-- Cuando se publicó primero el volumen y DESPUÉS la obra pasó de privada a pública,
-- compensar solo su volumen más reciente y únicamente dentro de las últimas 48 h.
create or replace function private.tg_series_newly_public_volume()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if coalesce(old.published,false) or not coalesce(new.published,false)
     or new.archived_at is not null then return null; end if;
  select vo.id, vo.num into v from public.volumes vo
  where vo.series_id = new.id and vo.deleted_at is null
    and vo.status = 'published'
    and vo.announced_at between now() - interval '48 hours' and now()
    and (vo.published_at is null or vo.published_at <= now())
  order by vo.announced_at desc, vo.num desc limit 1;
  if v.id is null then return null; end if;
  insert into public.notifications(user_id,kind,body,link)
    select f.user_id,'Volumen',
      new.title || ' · Volumen ' || v.num || ' ya está disponible',
      jsonb_build_object('slug',new.slug,'vol',v.num)
    from public.follows f where f.series_id = new.id
      and coalesce(f.channels->>'volumes','true') <> 'false';
  return null;
end $$;
revoke all on function private.tg_series_newly_public_volume() from public,anon,authenticated;
drop trigger if exists obi_series_newly_public_volume on public.series;
create trigger obi_series_newly_public_volume
  after update of published on public.series
  for each row when (old.published is distinct from new.published)
  execute function private.tg_series_newly_public_volume();

-- Ninguna reproducción histórica: no se reejecutan notificaciones antiguas.

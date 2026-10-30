-- Auditoría integral de preestrenos: notificación opt-in y limpieza de estado.
-- No introduce tablas, servicios, tareas programadas ni notificaciones masivas.
-- Los mensajes solo se generan si existe un recordatorio pendiente de ese volumen/fecha.

create or replace function private.sync_prelaunch_reminders()
returns trigger
language plpgsql security definer
set search_path = ''
as $body$
declare next_at timestamptz;
begin
  if old.status <> 'scheduled' or old.announce_prelaunch is not true
    or old.published_at is null then return new; end if;

  -- Cancelación, despublicación o retirada del anuncio: avisar a quienes
  -- habían solicitado específicamente este recordatorio. No incluir el
  -- título ni enlaces a fichas que pueden haber vuelto a ser privadas.
  if new.deleted_at is not null or new.status not in ('scheduled','published')
    or (new.status = 'scheduled' and new.announce_prelaunch is not true) then
    with removed as (
      delete from public.reminders r
       where r.series_id = old.series_id and r.kind = 'volp'
         and r.at = old.published_at and r.sent_at is null
      returning r.user_id
    )
    insert into public.notifications(user_id,kind,body,link)
    select rem.user_id, 'preestreno',
      'Se canceló un recordatorio de estreno que habías activado.',
      pg_catalog.jsonb_build_object('href','/calendario')
    from removed rem
    join public.profiles p on p.id = rem.user_id;
    return new;
  end if;

  -- Al publicarse, trasladar el recordatorio a ahora para que el
  -- cron existente confirme el estreno; NO avisar de reprogramación.
  next_at := case when new.status = 'published' then now() else new.published_at end;
  if next_at is distinct from old.published_at then
    if new.status = 'scheduled' and new.announce_prelaunch is true
       and new.published_at > now()
       and private.prelaunch_public_series(old.series_id) then
      insert into public.notifications(user_id,kind,body,link)
      select r.user_id, 'preestreno',
        'Se modificó la fecha de un estreno para el que activaste un recordatorio.',
        pg_catalog.jsonb_build_object('href','/calendario')
      from public.reminders r
      join public.profiles p on p.id = r.user_id
      where r.series_id = old.series_id and r.kind = 'volp'
        and r.at = old.published_at and r.sent_at is null;
    end if;

    -- Preservar la deduplicación existente (UNIQUE usuario/obra/tipo/fecha).
    delete from public.reminders r
     where r.series_id = old.series_id and r.kind = 'volp'
       and r.at = old.published_at and r.sent_at is null
       and exists (
         select 1 from public.reminders d
         where d.user_id = r.user_id and d.series_id = r.series_id
           and d.kind = r.kind and d.at = next_at
       );
    update public.reminders r set at = next_at
      where r.series_id = old.series_id and r.kind = 'volp'
        and r.at = old.published_at and r.sent_at is null;
  end if;
  return new;
end;
$body$;
revoke all on function private.sync_prelaunch_reminders() from public, anon, authenticated;

-- La marca de anuncio solo tiene sentido mientras el volumen está programado.
-- BEFORE UPDATE mantiene OLD.announce_prelaunch visible al disparador de
-- promoción y al de recordatorios, por lo que el estreno continúa funcionando.
create or replace function private.clear_published_prelaunch()
returns trigger
language plpgsql
set search_path = ''
as $body$
begin
  if new.status = 'published' and new.announce_prelaunch is true then
    new.announce_prelaunch := false;
  end if;
  return new;
end;
$body$;
revoke all on function private.clear_published_prelaunch() from public, anon, authenticated;
drop trigger if exists volumes_clear_published_prelaunch on public.volumes;
create trigger volumes_clear_published_prelaunch
before update of status on public.volumes
for each row execute function private.clear_published_prelaunch();

-- Limpieza histórica acotada: no tocar estados programados ni fechas,
-- capítulos, notificaciones, recordatorios o acciones de difusión.
update public.volumes
set announce_prelaunch = false
where status = 'published' and announce_prelaunch is true;

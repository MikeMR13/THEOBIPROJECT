-- Corrección: publish_volume tenía dos versiones y la llamada sin fecha era ambigua. Queda una sola, con permisos y revisión pendiente.
drop function if exists public.publish_volume(uuid);
create or replace function public.publish_volume(p_volume uuid, p_at timestamptz default null) returns text language plpgsql security definer set search_path = '' as $$
declare v record; t uuid;
begin
  select * into v from public.volumes where id = p_volume for update;
  if v.id is null then raise exception 'not_found'; end if;
  t := private.series_team(v.series_id);
  if p_at is not null and p_at > now() then
    if not private.team_can(t, 'schedule') then raise exception 'forbidden_schedule'; end if;
    update public.volumes set status = 'scheduled', published_at = p_at where id = p_volume;
    update public.chapters set status = 'scheduled', publish_at = p_at where volume_id = p_volume and status = 'draft' and deleted_at is null;
    insert into public.publication_events (team_id, series_id, actor, event, summary) values (t, v.series_id, auth.uid(), 'schedule', 'Volumen ' || v.num || ' programado');
    return 'scheduled';
  end if;
  if not private.team_can(t, 'publish') then raise exception 'forbidden_publish'; end if;
  if exists (select 1 from public.review_requests r join public.chapters c on c.id = r.chapter_id where c.volume_id = p_volume and c.deleted_at is null and r.status not in ('approved','cancelled')) then raise exception 'review_pending' using hint = 'Hay revisiones sin aprobar en este volumen'; end if;
  update public.volumes set status = 'published', published_at = coalesce(published_at, now()), announced_at = case when status = 'published' then announced_at else null end where id = p_volume;
  update public.chapters set status = 'published', publish_at = coalesce(publish_at, now()) where volume_id = p_volume and status <> 'published' and deleted_at is null;
  update public.series set translation_status = 'completed' where id = v.series_id and v.is_final;
  insert into public.publication_events (team_id, series_id, actor, event, summary) values (t, v.series_id, auth.uid(), 'publish', 'Volumen ' || v.num || ' publicado');
  perform private.run_publications();
  return 'published';
end $$;
revoke all on function public.publish_volume(uuid, timestamptz) from public, anon;
grant execute on function public.publish_volume(uuid, timestamptz) to authenticated;
alter function private.perm_keys() set search_path = '';

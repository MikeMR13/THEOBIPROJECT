-- Anuncios: se publican directo (sin pasar por el borrador de Preferencias).
create or replace function public.team_announce_set(p_team uuid, p_announce jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.team_can(p_team, 'profile') then raise exception 'forbidden' using hint = 'Tu rol no permite publicar anuncios'; end if;
  if jsonb_typeof(p_announce) <> 'object' or pg_column_size(p_announce) > 4000 then raise exception 'announce_invalid'; end if;
  update public.teams set design = jsonb_set(coalesce(design, '{}'::jsonb), '{announce}', p_announce) where id = p_team;
  update public.team_design_drafts set design = jsonb_set(coalesce(design, '{}'::jsonb), '{announce}', p_announce), updated_at = now() where team_id = p_team;
  perform private.log(p_team, 'edicion', case when coalesce(p_announce->>'title', '') = '' and coalesce(p_announce->>'text', '') = '' then 'Quitó el anuncio de la página del equipo' else 'Publicó el anuncio «' || left(coalesce(nullif(p_announce->>'title', ''), p_announce->>'text'), 60) || '»' end, '{}', null);
end $$;
revoke all on function public.team_announce_set(uuid, jsonb) from public, anon;
grant execute on function public.team_announce_set(uuid, jsonb) to authenticated;

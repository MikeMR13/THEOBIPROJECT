-- Editor de borradores: privilegios y compatibilidad bajo PostgreSQL 17 aislado.
do $qa$
declare f oid; entry jsonb; defaults text;
begin
  f := to_regprocedure('public.diffusion_campaign_draft_save(uuid,uuid,text,text,jsonb)');
  if f is null then raise exception 'missing_draft_presentation_rpc'; end if;
  if has_function_privilege('anon',f,'EXECUTE')
     or has_function_privilege('public',f,'EXECUTE') then
    raise exception 'draft_rpc_publicly_executable';
  end if;
  if not has_function_privilege('authenticated',f,'EXECUTE') then
    raise exception 'draft_rpc_not_granted_to_editors';
  end if;
  select column_default into defaults
    from information_schema.columns
    where table_schema='public' and table_name='diffusion_campaigns' and column_name='presentation';
  if defaults is null then raise exception 'missing_presentation_default'; end if;
  entry := '{"showTitle":true,"showTeam":true,"showSynopsis":false,"showCover":true}'::jsonb;
  if jsonb_typeof(entry)<>'object' then raise exception 'invalid_expected_contract'; end if;
  if to_regprocedure('public.diffusion_campaign_draft_save(uuid,uuid,text,text)') is null then
    raise exception 'legacy_draft_rpc_missing';
  end if;
end $qa$;
-- No hay escrituras sobre tablas de entrega ni llamadas a proveedores.

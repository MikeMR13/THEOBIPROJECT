\set ON_ERROR_STOP on
do $assert$
declare
  signature text;
  fn_oid oid;
begin
  foreach signature in array array['public.patreon_campaign_info(text)', 'public.report_review(uuid,text,text,text)', 'public.series_feedback(uuid)'] loop
    fn_oid := to_regprocedure(signature);
    if has_function_privilege('anon',fn_oid,'EXECUTE') then
      raise exception 'anon aún puede llamar %',signature;
    end if;
    if not has_function_privilege('authenticated',fn_oid,'EXECUTE') then
      raise exception 'authenticated perdió acceso a %',signature;
    end if;
    if not has_function_privilege('service_role',fn_oid,'EXECUTE') then
      raise exception 'service_role perdió acceso a %',signature;
    end if;
  end loop;
  if not has_function_privilege('anon','public.home_feed()'::regprocedure,'EXECUTE') then
    raise exception 'Se interrumpió Inicio público';
  end if;
end
$assert$;

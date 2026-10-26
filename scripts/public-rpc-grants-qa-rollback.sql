\set ON_ERROR_STOP on
do $assert$
declare signature text; fn_oid oid;
begin
  foreach signature in array array['public.patreon_campaign_info(text)', 'public.report_review(uuid,text,text,text)', 'public.series_feedback(uuid)'] loop
    fn_oid := to_regprocedure(signature);
    if not has_function_privilege('anon',fn_oid,'EXECUTE') then
      raise exception 'rollback de % no restauró anon',signature;
    end if;
  end loop;
end $assert$;

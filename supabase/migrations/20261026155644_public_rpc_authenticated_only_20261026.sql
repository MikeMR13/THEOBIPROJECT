-- Auditoría 2026-10-26: los tres RPC requieren sesión o autorización de equipo.
-- CAMBIO PROPUESTO; no ejecutado en Supabase de producción.
-- Mantiene EXECUTE explícito de authenticated y service_role.

do $preflight$
declare
  signature text;
  fn_oid oid;
begin
  foreach signature in array array['public.patreon_campaign_info(text)', 'public.report_review(uuid,text,text,text)', 'public.series_feedback(uuid)'] loop
    fn_oid := to_regprocedure(signature);
    if fn_oid is null or not exists(
      select 1 from pg_proc p
      where p.oid=fn_oid and p.prosecdef and pg_get_userbyid(p.proowner)='postgres'
    ) then
      raise exception 'RPC % no coincide con el objeto SECURITY DEFINER esperado', signature;
    end if;
    if not has_function_privilege('anon',fn_oid,'EXECUTE')
       or not has_function_privilege('authenticated',fn_oid,'EXECUTE')
       or not has_function_privilege('service_role',fn_oid,'EXECUTE')
    then
      raise exception 'RPC % no coincide con la concesión previa esperada',signature;
    end if;
  end loop;
end
$preflight$;

revoke execute on function
  public.patreon_campaign_info(text),
  public.report_review(uuid,text,text,text),
  public.series_feedback(uuid)
from public, anon;

-- No cambia el permiso de authenticated/service_role ni ninguna función.
do $postflight$
declare
  signature text;
  fn_oid oid;
begin
  foreach signature in array array['public.patreon_campaign_info(text)', 'public.report_review(uuid,text,text,text)', 'public.series_feedback(uuid)'] loop
    fn_oid := to_regprocedure(signature);
    if has_function_privilege('anon',fn_oid,'EXECUTE')
       or not has_function_privilege('authenticated',fn_oid,'EXECUTE')
       or not has_function_privilege('service_role',fn_oid,'EXECUTE')
       or not has_function_privilege('postgres',fn_oid,'EXECUTE')
    then
      raise exception 'Permisos inesperados tras restringir %', signature;
    end if;
  end loop;
end
$postflight$;

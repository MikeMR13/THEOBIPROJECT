-- El Obi del Lector | Fase de seguridad: privilegios mínimos en rutinas del cron.
-- SQL CANDIDATO para QA; NO se ha aplicado a producción.
-- No modifica funciones, cron, filas, RLS, servicios ni secretos.
-- Auditado por lectura de Supabase el 26 de octubre de 2026.

do $preflight$
declare
  v_fn text;
  v_oid oid;
begin
  foreach v_fn in array array['run_publications', 'refresh_home', 'compute_rankings', 'purge_deleted_accounts', 'purge_old', 'send_reminders', 'notify_due_chapters', 'notify_general_releases', 'notify_anniversaries', 'notify_seasons'] loop
    select p.oid into v_oid
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='private'
       and p.proname=v_fn
       and pg_get_function_identity_arguments(p.oid)=''
       and p.prosecdef
       and pg_get_userbyid(p.proowner)='postgres';
    if v_oid is null then
      raise exception 'Seguridad cron: firma/owner/SECURITY DEFINER de private.%() no coincide; cancelar',v_fn;
    end if;
    if not exists (
      select 1 from cron.job j
       where j.username='postgres'
         and j.command like '%private.' || v_fn || '()%'
    ) then
      raise exception 'Seguridad cron: no hay job postgres esperado para private.%(); cancelar',v_fn;
    end if;
  end loop;
end
$preflight$;

revoke execute on function
  private.run_publications(),
  private.refresh_home(),
  private.compute_rankings(),
  private.purge_deleted_accounts(),
  private.purge_old(),
  private.send_reminders(),
  private.notify_due_chapters(),
  private.notify_general_releases(),
  private.notify_anniversaries(),
  private.notify_seasons()
from public, anon, authenticated;

-- Solo verificaciones; nunca ejecutamos las funciones de correo, borrado o publicaciones.
do $postflight$
declare v_fn text; v_oid oid;
begin
  foreach v_fn in array array['run_publications', 'refresh_home', 'compute_rankings', 'purge_deleted_accounts', 'purge_old', 'send_reminders', 'notify_due_chapters', 'notify_general_releases', 'notify_anniversaries', 'notify_seasons'] loop
    select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname=v_fn
      and pg_get_function_identity_arguments(p.oid)='';
    if has_function_privilege('anon',v_oid,'EXECUTE')
       or has_function_privilege('authenticated',v_oid,'EXECUTE')
       or not has_function_privilege('postgres',v_oid,'EXECUTE') then
      raise exception 'Seguridad cron: verificación de acceso falló para private.%()',v_fn;
    end if;
  end loop;
end
$postflight$;


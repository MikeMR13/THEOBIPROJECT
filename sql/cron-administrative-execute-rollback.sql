-- Reversión explícita de la fase de seguridad.
-- Devuelve EXACTAMENTE la concesión PUBLIC:EXECUTE observada antes del parche.
-- ADVERTENCIA: restaura el permiso amplio preexistente; usar solo ante regresión.
begin;
grant execute on function
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
to public;
commit;

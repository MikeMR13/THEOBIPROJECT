-- Reversión a los GRANT anteriores observados en Supabase 2026-10-26.
-- Solo aplica a los tres RPC de este cambio. Requiere revisión.
begin;
grant execute on function
  public.patreon_campaign_info(text),
  public.report_review(uuid,text,text,text),
  public.series_feedback(uuid)
to public, anon;
commit;

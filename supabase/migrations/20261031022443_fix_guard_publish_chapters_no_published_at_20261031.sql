-- Error 42703 al importar/publicar: guard_publish() se ejecuta en chapters y volumes.
-- public.chapters tiene publish_at, no published_at ni announce_prelaunch.
-- Los permisos de publicación/programación se mantienen; solo la comprobación
-- de reprogramación propia de volumes evalúa esos dos campos.
-- Ya aplicado a THEOBIPROJECT Supabase como migración 20261031022443.
CREATE OR REPLACE FUNCTION private.guard_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE t uuid := private.series_team(new.series_id);
BEGIN
  IF auth.uid() IS NULL THEN RETURN new; END IF; -- procesos de servicio

  IF new.status IS DISTINCT FROM old.status THEN
    IF new.status = 'published' AND NOT private.team_can(t,'publish') THEN
      RAISE EXCEPTION 'forbidden_publish' USING errcode='42501';
    END IF;
    IF new.status = 'scheduled' AND NOT private.team_can(t,'schedule') THEN
      RAISE EXCEPTION 'forbidden_schedule' USING errcode='42501';
    END IF;
    IF old.status = 'published' AND NOT private.team_can(t,'publish') THEN
      RAISE EXCEPTION 'forbidden_unpublish' USING errcode='42501';
    END IF;
    IF old.status = 'scheduled' AND NOT (
      private.team_can(t,'publish') OR private.team_can(t,'schedule')
    ) THEN
      RAISE EXCEPTION 'forbidden_unschedule' USING errcode='42501';
    END IF;
  END IF;

  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'volumes' THEN
    IF old.status = 'scheduled' AND new.status = 'scheduled'
      AND (new.published_at IS DISTINCT FROM old.published_at
        OR new.announce_prelaunch IS DISTINCT FROM old.announce_prelaunch)
      AND NOT private.team_can(t,'schedule') THEN
      RAISE EXCEPTION 'forbidden_reschedule' USING errcode='42501';
    END IF;
  END IF;

  RETURN new;
END;
$function$;

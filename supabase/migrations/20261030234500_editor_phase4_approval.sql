-- Fase 4: aprobación editorial vinculada al contenido y control de programación.
-- Conserva todos los capítulos, versiones, horarios y solicitudes previas.
BEGIN;
ALTER TABLE public.review_requests
  ADD COLUMN IF NOT EXISTS base_version integer,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- Solo puede haber una solicitud activa por capítulo, sin tocar registros cerrados.
CREATE UNIQUE INDEX IF NOT EXISTS editor4_single_pending_request
  ON public.review_requests(chapter_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS editor4_review_chapter_idx
  ON public.review_requests(chapter_id,created_at DESC);

-- La política anterior ALL permitía a cualquier miembro aprobarse por UPDATE directo.
DROP POLICY IF EXISTS "rr team" ON public.review_requests;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.review_requests_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.review_requests TO authenticated;
CREATE POLICY "editor4 team may read review requests" ON public.review_requests
  FOR SELECT TO authenticated
  USING (private.in_team(private.chapter_team(chapter_id)));

CREATE OR REPLACE FUNCTION private.editor4_fingerprint(
 p_version integer,p_title text,p_body jsonb
) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_object('v',p_version,'title',p_title,'body',p_body)::text)
$$;

-- Al solicitar: se fija la versión exacta; nunca se edita el texto.
CREATE FUNCTION public.editor_submit_review(p_chapter uuid,p_note text DEFAULT '')
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.chapters%ROWTYPE; t uuid; rid bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.chapters WHERE id=p_chapter AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'chapter_not_found' USING ERRCODE='P0002'; END IF;
 t:=private.series_team(c.series_id);
 IF NOT private.team_can(t,'edit') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF c.status <> 'draft' THEN RAISE EXCEPTION 'review_only_drafts' USING ERRCODE='22023'; END IF;
 IF char_length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'note_too_long' USING ERRCODE='22023'; END IF;
 UPDATE public.review_requests SET status='changes',review_note='Sustituida por nueva solicitud',
   reviewed_at=now(),reviewed_by=auth.uid(),approved_hash=NULL
 WHERE chapter_id=p_chapter AND status='pending';
 INSERT INTO public.review_requests(chapter_id,requested_by,note,status,base_version)
 VALUES(c.id,auth.uid(),left(coalesce(p_note,''),1000),'pending',c.version)
 RETURNING id INTO rid;
 RETURN rid;
END;
$$;

CREATE FUNCTION public.editor_decide_review(
 p_id bigint,p_decision text,p_note text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.review_requests%ROWTYPE; c public.chapters%ROWTYPE; t uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approved','changes') OR char_length(coalesce(p_note,''))>1000 THEN
   RAISE EXCEPTION 'invalid_decision' USING ERRCODE='22023'; END IF;
 -- Orden de bloqueos: capítulo antes que solicitud para evitar cruces con guardados.
 SELECT * INTO r FROM public.review_requests WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO c FROM public.chapters WHERE id=r.chapter_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'chapter_not_found' USING ERRCODE='P0002'; END IF;
 t:=private.series_team(c.series_id);
 IF NOT private.team_can(t,'review') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.review_requests WHERE id=p_id FOR UPDATE;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'already_reviewed' USING ERRCODE='22023'; END IF;
 IF r.requested_by IS NULL OR r.requested_by=auth.uid() THEN
   RAISE EXCEPTION 'self_review_forbidden' USING ERRCODE='42501'; END IF;
 IF r.base_version IS DISTINCT FROM c.version THEN
   RAISE EXCEPTION 'review_stale_version' USING ERRCODE='40001'; END IF;
 UPDATE public.review_requests SET status=p_decision,
   approved_hash=CASE WHEN p_decision='approved' THEN private.editor4_fingerprint(c.version,c.title,c.body) ELSE NULL END,
   reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_note,''),1000)
 WHERE id=p_id;
END;
$$;

-- Comprobar el contenido, no la existencia de cualquier aprobación antigua.
CREATE OR REPLACE FUNCTION private.require_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE required boolean;
BEGIN
 SELECT t.require_approval INTO required FROM public.series s
 JOIN public.teams t ON t.id=s.team_id WHERE s.id=NEW.series_id;
 IF coalesce(required,false) AND (
   ((NEW.status='scheduled' OR NEW.status='published')
    AND NEW.status IS DISTINCT FROM OLD.status)
   OR (OLD.status='scheduled' AND NEW.status='scheduled' AND
      (NEW.body IS DISTINCT FROM OLD.body OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.version IS DISTINCT FROM OLD.version))
 ) THEN
   IF NOT EXISTS (
      SELECT 1 FROM public.review_requests r
      WHERE r.chapter_id=NEW.id AND r.status='approved'
      AND r.base_version=NEW.version
      AND r.reviewed_by IS NOT NULL
      AND r.reviewed_by IS DISTINCT FROM r.requested_by
      AND r.approved_hash=private.editor4_fingerprint(NEW.version,NEW.title,NEW.body)
   ) THEN RAISE EXCEPTION 'approval_required_current_version'
      USING ERRCODE='42501',HINT='Solicita una aprobación nueva para esta versión antes de programar o publicar'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
-- Se activa tanto para status como para modificaciones que dejarían inválida una programación.
DROP TRIGGER IF EXISTS chapters_require_approval ON public.chapters;
CREATE TRIGGER chapters_require_approval
 BEFORE UPDATE OF status,body,title,version ON public.chapters
 FOR EACH ROW EXECUTE FUNCTION private.require_approval();

-- Cambio de política opt-in del equipo: solo owner/admin; no dejar programados sin aprobación.
CREATE FUNCTION private.editor4_team_approval_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.require_approval IS NOT DISTINCT FROM OLD.require_approval THEN RETURN NEW; END IF;
 IF auth.uid() IS NOT NULL
    AND private.team_role_of(NEW.id) NOT IN ('owner','admin') THEN
   RAISE EXCEPTION 'forbidden_approval_policy' USING ERRCODE='42501'; END IF;
 IF NEW.require_approval AND EXISTS (
   SELECT 1 FROM public.chapters c JOIN public.series s ON s.id=c.series_id
   WHERE s.team_id=NEW.id AND c.deleted_at IS NULL AND c.status='scheduled'
   AND NOT EXISTS(
     SELECT 1 FROM public.review_requests r WHERE r.chapter_id=c.id
       AND r.status='approved' AND r.base_version=c.version
       AND r.reviewed_by IS NOT NULL AND r.reviewed_by IS DISTINCT FROM r.requested_by
       AND r.approved_hash=private.editor4_fingerprint(c.version,c.title,c.body)
   )
 ) THEN RAISE EXCEPTION 'scheduled_chapters_need_approval'
   USING ERRCODE='22023',HINT='Revisa o desprograma los capítulos existentes antes de activar la aprobación obligatoria'; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS teams_editor4_approval_guard ON public.teams;
CREATE TRIGGER teams_editor4_approval_guard BEFORE UPDATE OF require_approval ON public.teams
 FOR EACH ROW EXECUTE FUNCTION private.editor4_team_approval_guard();

CREATE FUNCTION public.editor_set_team_approval(p_team uuid,p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR p_enabled IS NULL OR
    private.team_role_of(p_team) NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'forbidden_approval_policy' USING ERRCODE='42501'; END IF;
 UPDATE public.teams SET require_approval=p_enabled WHERE id=p_team;
 IF NOT FOUND THEN RAISE EXCEPTION 'team_not_found' USING ERRCODE='P0002'; END IF;
 RETURN p_enabled;
END;
$$;

REVOKE ALL ON FUNCTION private.editor4_fingerprint(integer,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.editor4_team_approval_guard() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.editor_submit_review(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.editor_decide_review(bigint,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.editor_set_team_approval(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.editor_submit_review(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editor_decide_review(bigint,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editor_set_team_approval(uuid,boolean) TO authenticated;
COMMIT;

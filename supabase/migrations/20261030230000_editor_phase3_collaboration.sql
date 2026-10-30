-- Fase 3: propuestas editoriales aisladas; no modifican chapters ni chapter_revisions.
-- La revisión acredita evaluación por otro integrante, NO aplicación al texto.
BEGIN;
CREATE TABLE public.editor_suggestions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
 created_by uuid NOT NULL,
 base_version integer NOT NULL CHECK (base_version > 0),
 excerpt text NOT NULL CHECK (char_length(btrim(excerpt)) BETWEEN 1 AND 4000),
 replacement text NOT NULL CHECK (char_length(replacement) <= 8000),
 note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','rejected')),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT editor_suggestion_review_integrity CHECK (
   (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
   OR (status IN ('reviewed','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by <> created_by)
 )
);
CREATE INDEX editor_suggestions_chapter_created_idx ON public.editor_suggestions(chapter_id,created_at DESC);
ALTER TABLE public.editor_suggestions ENABLE ROW LEVEL SECURITY;
-- Supabase may grant all on new public tables by default: remove write paths.
REVOKE ALL ON TABLE public.editor_suggestions FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.editor_suggestions_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.editor_suggestions TO authenticated;
CREATE POLICY "editor suggestions team read" ON public.editor_suggestions
  FOR SELECT TO authenticated USING (private.in_team(private.chapter_team(chapter_id)));

-- All writes go through narrow, authenticated, permission-checking functions.
CREATE FUNCTION public.editor_create_suggestion(
 p_chapter uuid,p_version integer,p_excerpt text,p_replacement text,p_note text DEFAULT ''
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_team uuid; v_version integer; v_id bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
 SELECT s.team_id,c.version INTO v_team,v_version
 FROM public.chapters c JOIN public.series s ON s.id=c.series_id
 WHERE c.id=p_chapter AND c.deleted_at IS NULL FOR SHARE OF c;
 IF NOT FOUND OR NOT private.in_team(v_team) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_version IS DISTINCT FROM v_version THEN RAISE EXCEPTION 'version_conflict' USING ERRCODE='40001'; END IF;
 IF char_length(btrim(coalesce(p_excerpt,''))) NOT BETWEEN 1 AND 4000
    OR p_replacement IS NULL OR char_length(p_replacement)>8000
    OR char_length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'suggestion_invalid' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.editor_suggestions
     WHERE chapter_id=p_chapter AND created_by=auth.uid() AND status='pending') >= 100
 THEN RAISE EXCEPTION 'suggestion_limit' USING ERRCODE='22023'; END IF;
 INSERT INTO public.editor_suggestions(chapter_id,created_by,base_version,excerpt,replacement,note)
 VALUES (p_chapter,auth.uid(),v_version,p_excerpt,p_replacement,coalesce(p_note,''))
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$$;
CREATE FUNCTION public.editor_review_suggestion(p_id bigint,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_record public.editor_suggestions; v_team uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('reviewed','rejected') THEN
    RAISE EXCEPTION 'invalid_decision' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_record FROM public.editor_suggestions WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'suggestion_not_found' USING ERRCODE='P0002'; END IF;
 SELECT s.team_id INTO v_team FROM public.chapters c JOIN public.series s ON s.id=c.series_id WHERE c.id=v_record.chapter_id;
 IF NOT FOUND OR NOT private.team_can(v_team,'review') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF v_record.created_by=auth.uid() THEN RAISE EXCEPTION 'self_review_forbidden' USING ERRCODE='42501'; END IF;
 IF v_record.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed' USING ERRCODE='22023'; END IF;
 UPDATE public.editor_suggestions SET status=p_decision,reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.editor_create_suggestion(uuid,integer,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.editor_review_suggestion(bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.editor_create_suggestion(uuid,integer,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editor_review_suggestion(bigint,text) TO authenticated;
COMMIT;

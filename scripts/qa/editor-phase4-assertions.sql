-- Identidades: autor 11 / corrector 12 / owner 13 / externo 14.
DO $$ BEGIN
 IF has_table_privilege('authenticated','public.review_requests','INSERT')
 OR has_table_privilege('authenticated','public.review_requests','UPDATE')
 OR has_table_privilege('authenticated','public.review_requests','DELETE')
 THEN RAISE EXCEPTION 'review_requests direct write exposed'; END IF;
 IF has_table_privilege('anon','public.review_requests','SELECT')
 THEN RAISE EXCEPTION 'anonymous read exposed';END IF;
END$$;
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
-- Miembro con edit pero sin review no puede aprobar.
SELECT public.editor_submit_review('00000000-0000-4000-8000-000000000003','Revisa redacción');
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN PERFORM public.editor_decide_review(1,'approved','yo');
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'author approved own request';END IF;
END$$;
-- No se puede editar fila directamente aunque RLS anterior fuese ALL.
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN UPDATE public.review_requests SET status='approved' WHERE id=1;
 EXCEPTION WHEN insufficient_privilege THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'direct approval possible';END IF;
END$$;
-- Un editor sin permiso owner no puede activar requisito de aprobación.
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN UPDATE public.teams SET require_approval=true;
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'editor enabled policy by UPDATE';END IF;
END$$;
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN PERFORM public.editor_set_team_approval('00000000-0000-4000-8000-000000000001',true);
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'editor enabled policy by RPC';END IF;
END$$;
-- Revisor real distinto del autor aprueba.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000012';
SELECT public.editor_decide_review(1,'approved','Correcto');
-- Una nueva revisión sobre el mismo registro se rechaza.
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN PERFORM public.editor_decide_review(1,'changes','Reabrir');
 EXCEPTION WHEN SQLSTATE '22023' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'review decision changed after close';END IF;
END$$;
-- Usuario externo no puede solicitar revisión ni ver filas.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000014';
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN PERFORM public.editor_submit_review('00000000-0000-4000-8000-000000000003','intrusión');
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'outsider submitted review';END IF;
 IF (SELECT count(*) FROM public.review_requests)<>0 THEN RAISE EXCEPTION 'outsider read requests';END IF;
END$$;
-- Owner activa requisito; aprobación sin contenidos de cambios permite programar.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000013';
SELECT public.editor_set_team_approval('00000000-0000-4000-8000-000000000001',true);
UPDATE public.chapters SET status='scheduled' WHERE id='00000000-0000-4000-8000-000000000003';
-- La guardia debe impedir ediciones silenciosas de un capítulo programado.
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN UPDATE public.chapters SET body='[{"type":"paragraph","text":"Cambió"}]'::jsonb,version=4
 WHERE id='00000000-0000-4000-8000-000000000003';
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'scheduled content mutated without reapproval';END IF;
END$$;
-- Un capítulo nuevo sin aprobación no puede programarse ni publicarse.
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN UPDATE public.chapters SET status='scheduled' WHERE id='00000000-0000-4000-8000-000000000004';
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'unapproved scheduled';END IF;
 stopped:=false;
 BEGIN UPDATE public.chapters SET status='published' WHERE id='00000000-0000-4000-8000-000000000004';
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'unapproved published';END IF;
END$$;
-- Una edición de la versión previamente aprobada invalida aprobación.
UPDATE public.chapters SET status='draft' WHERE id='00000000-0000-4000-8000-000000000003';
UPDATE public.chapters SET body='[{"type":"paragraph","text":"Cambio de texto"}]'::jsonb,version=4
 WHERE id='00000000-0000-4000-8000-000000000003';
DO $$DECLARE stopped boolean:=false;BEGIN
 BEGIN UPDATE public.chapters SET status='published' WHERE id='00000000-0000-4000-8000-000000000003';
 EXCEPTION WHEN SQLSTATE '42501' THEN stopped:=true;END;
 IF NOT stopped THEN RAISE EXCEPTION 'stale approval accepted';END IF;
END$$;
-- Con el control opt-in apagado, el flujo original publica sin requerir solicitudes.
SELECT public.editor_set_team_approval('00000000-0000-4000-8000-000000000001',false);
UPDATE public.chapters SET status='published' WHERE id='00000000-0000-4000-8000-000000000004';
RESET ROLE;
DO $$BEGIN
 IF (SELECT count(*) FROM public.review_requests)<>1 OR
    (SELECT status FROM public.review_requests WHERE id=1)<>'approved'
 THEN RAISE EXCEPTION 'bad review state';END IF;
 IF (SELECT status FROM public.chapters WHERE id='00000000-0000-4000-8000-000000000003')<>'draft'
 THEN RAISE EXCEPTION 'unexpected chapter state'; END IF;
 IF (SELECT body FROM public.chapters WHERE id='00000000-0000-4000-8000-000000000003')<>
    '[{"type":"paragraph","text":"Cambio de texto"}]'::jsonb
 THEN RAISE EXCEPTION 'content mutated'; END IF;
END$$;

-- Comprobar que las sugerencias solo se pueden crear/revisar con permisos.
DO $$BEGIN
 IF has_table_privilege('anon','public.editor_suggestions','SELECT') THEN RAISE EXCEPTION 'anon lee sugerencias'; END IF;
 IF has_table_privilege('authenticated','public.editor_suggestions','INSERT') OR
    has_table_privilege('authenticated','public.editor_suggestions','UPDATE') OR
    has_table_privilege('authenticated','public.editor_suggestions','DELETE')
 THEN RAISE EXCEPTION 'escritura directa expuesta';END IF;
 IF NOT has_table_privilege('authenticated','public.editor_suggestions','SELECT') THEN RAISE EXCEPTION 'sin lectura de equipo';END IF;
END$$;
SET ROLE authenticated;
-- Miembro C propone a la versión guardada y no necesita permiso editorial de publicación.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000013';
SELECT public.editor_create_suggestion('00000000-0000-4000-8000-000000000030',3,
 'texto original','texto propuesto','Revisar tono') AS created_id;
DO $$DECLARE deny boolean:=false;BEGIN
 BEGIN PERFORM public.editor_review_suggestion(1,'reviewed');
 EXCEPTION WHEN OTHERS THEN deny:=true;END;
 IF NOT deny THEN RAISE EXCEPTION 'miembro sin review pudo aprobar';END IF;
END$$;
DO $$DECLARE deny boolean:=false;BEGIN
 BEGIN PERFORM public.editor_create_suggestion('00000000-0000-4000-8000-000000000030',1,'texto','otro','');
 EXCEPTION WHEN OTHERS THEN deny:=true;END;
 IF NOT deny THEN RAISE EXCEPTION 'se aceptó base_version obsoleto';END IF;
END$$;
DO $$DECLARE deny boolean:=false;BEGIN
 BEGIN UPDATE public.editor_suggestions SET status='reviewed' WHERE id=1;
 EXCEPTION WHEN OTHERS THEN deny:=true;END;
 IF NOT deny THEN RAISE EXCEPTION 'actualización directa posible';END IF;
END$$;
-- A revisa propuesta de C sin editar chapters ni simular aplicación.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
SELECT public.editor_review_suggestion(1,'reviewed');
DO $$DECLARE deny boolean:=false;BEGIN
 BEGIN PERFORM public.editor_review_suggestion(1,'rejected');
 EXCEPTION WHEN OTHERS THEN deny:=true;END;
 IF NOT deny THEN RAISE EXCEPTION 'se cambió una decisión final';END IF;
END$$;
-- Autor A intenta aprobar su propia propuesta: no debe.
SELECT public.editor_create_suggestion('00000000-0000-4000-8000-000000000030',3,'texto original','sustituto','');
DO $$DECLARE deny boolean:=false;BEGIN
 BEGIN PERFORM public.editor_review_suggestion(2,'reviewed');
 EXCEPTION WHEN OTHERS THEN deny:=true;END;
 IF NOT deny THEN RAISE EXCEPTION 'autorrevisión permitida';END IF;
END$$;
-- B puede descartar una propuesta ajena.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000012';
SELECT public.editor_review_suggestion(2,'rejected');
-- Externo D no puede ver ni sugerir aunque el capítulo exista.
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000014';
DO $$DECLARE deny boolean:=false;BEGIN
 BEGIN PERFORM public.editor_create_suggestion('00000000-0000-4000-8000-000000000030',3,'texto','sustituto','');
 EXCEPTION WHEN OTHERS THEN deny:=true;END;
 IF NOT deny THEN RAISE EXCEPTION 'externo pudo sugerir';END IF;
 IF (SELECT count(*) FROM public.editor_suggestions)<>0 THEN RAISE EXCEPTION 'externo vio propuestas';END IF;
END$$;
RESET ROLE;
DO $$BEGIN
 IF (SELECT count(*) FROM public.editor_suggestions)<>2 THEN RAISE EXCEPTION 'propuestas incorrectas'; END IF;
 IF (SELECT count(*) FROM public.editor_suggestions WHERE status IN ('reviewed','rejected') AND reviewed_by<>created_by)<>2
 THEN RAISE EXCEPTION 'revisiones incorrectas';END IF;
 IF (SELECT body FROM public.chapters WHERE id='00000000-0000-4000-8000-000000000030')<>
    '[{"type":"paragraph","text":"texto original"}]'::jsonb
 OR (SELECT version FROM public.chapters WHERE id='00000000-0000-4000-8000-000000000030')<>3
 THEN RAISE EXCEPTION 'la revisión alteró el texto del capítulo'; END IF;
END$$;

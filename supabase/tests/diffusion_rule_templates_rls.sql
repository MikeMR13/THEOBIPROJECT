-- QA PostgreSQL efímera: resolución segura, compatibilidad y control de ámbito.
do $qa$
declare f oid;
begin
 f:=to_regprocedure('public.diffusion_rule_template_set(uuid,uuid,uuid)');
 if f is null or has_function_privilege('anon',f,'EXECUTE')
    or not has_function_privilege('authenticated',f,'EXECUTE')
 then raise exception 'draft_template_rpc_permissions'; end if;
 if to_regprocedure('public.diffusion_rule_save(uuid,uuid,text,text,text,integer)') is null
 then raise exception 'legacy_rule_save_missing'; end if;
 if private.diffusion_render_rule_template(
   '📚 {{novela}} por {{equipo_productor}}','Obra QA','Equipo QA','Sinopsis','Autora')
     <> '📚 Obra QA por Equipo QA'
 then raise exception 'template_render_failed'; end if;
 if private.diffusion_render_rule_template('{{equpo traductor}}','Obra','Equipo','Sinopsis','Autor') <> 'Equipo'
 then raise exception 'template_alias_failed'; end if;
 if private.diffusion_render_rule_template('{{variable_privada}}','Obra','Equipo','Sinopsis','Autor') is not null
 then raise exception 'unknown_variable_must_fail_closed'; end if;
 if private.diffusion_render_rule_template('{{sinopsis}}','Obra','Equipo',null,'Autor') is not null
 then raise exception 'missing_field_must_fail_closed'; end if;
 if private.diffusion_render_rule_template(repeat('a',701),'Obra','Equipo','Texto','Autor') is not null
 then raise exception 'overlong_template_must_fail_closed'; end if;
 if private.diffusion_render_rule_template('{{novela','Obra','Equipo','Texto','Autor') is not null
 then raise exception 'malformed_variable_must_fail_closed'; end if;
end $qa$;

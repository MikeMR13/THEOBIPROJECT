-- Comprobación funcional transaccional: cuentas y equipos ficticios.
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $test$
declare tid uuid:='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  owner_id uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  editor_id uuid:='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  count_rows integer;
begin
  if private.team_can(tid,'edit') then raise exception 'Bibliotecario todavía puede editar equipo'; end if;
  if private.can_edit_team(tid) then raise exception 'Acceso editorial heredado sigue activo'; end if;
  if not private.is_admin() then raise exception 'Permiso administrativo perdido'; end if;
  if exists(select 1 from pg_policies where tablename='series' and policyname='series admin') then
    raise exception 'Política ALL de obras sigue habilitada'; end if;
  begin
    perform public.admin_remove_member(tid,owner_id);
    raise exception 'Borrado de propietario permitido';
  exception when others then
    if sqlerrm not like '%propietario%' then raise; end if;
  end;
  begin
    perform public.admin_add_publisher('owner@qa.invalid',tid,'editor');
    raise exception 'Degradación de propietario permitida';
  exception when others then
    if sqlerrm not like '%propietario%' then raise; end if;
  end;
  begin
    perform public.admin_add_publisher('nuevo@qa.invalid',tid,'owner');
    raise exception 'Segundo propietario permitido';
  exception when others then
    if sqlerrm not like '%propietario%' then raise; end if;
  end;
  -- Probar protección por trigger aun fuera de las funciones del Mostrador.
  begin
    delete from public.team_members where team_id=tid and user_id=owner_id;
    raise exception 'Trigger aceptó equipo huérfano';
  exception when others then
    if sqlerrm not like '%sin propietario%' then raise; end if;
  end;
  begin
    update public.team_members set role='editor' where team_id=tid and user_id=owner_id;
    raise exception 'Trigger aceptó degradar último propietario';
  exception when others then
    if sqlerrm not like '%sin propietario%' then raise; end if;
  end;
  perform public.admin_review_resolve('ffffffff-ffff-4fff-8fff-ffffffffffff',editor_id,'dismissed');
  select count(*) into count_rows from public.moderation_audit where action='resolver_reporte_resena';
  if count_rows<>1 then raise exception 'Moderación ausente de bitácora'; end if;
  select count(*) into count_rows from public.admin_users_page('',null,0,2);
  if count_rows<>2 then raise exception 'RPC de usuarios paginados no devuelve la página'; end if;
  begin
    perform public.admin_users_page('',null,0,101);
    raise exception 'Paginación sin tope';
  exception when others then
    if sqlerrm not like '%Paginación inválida%' then raise; end if;
  end;
end
$test$;

set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $test$
begin
  if not private.team_can('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','edit') then
    raise exception 'Propietario perdió su permiso editorial'; end if;
  begin
    perform public.admin_remove_member('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    raise exception 'RPC administrativa accesible para publicador';
  exception when others then
    if sqlerrm<>'forbidden' then raise; end if;
  end;
end
$test$;

set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $test$
declare tid uuid:='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  c integer;
begin
  perform public.admin_remove_member(tid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  select count(*) into c from public.team_members where team_id=tid;
  if c<>1 then raise exception 'No se eliminó el miembro ordinario'; end if;
  perform public.admin_add_publisher('nuevo@qa.invalid',tid,'editor');
  select count(*) into c from public.team_members where team_id=tid and role='owner';
  if c<>1 then raise exception 'Se alteró el propietario durante alta ordinaria'; end if;
end
$test$;
do $test$
begin
  if has_function_privilege('anon','public.admin_users_page(text,text,integer,integer)','EXECUTE') then
    raise exception 'Función de usuarios expuesta a anon'; end if;
end
$test$;
select 'QA Bibliotecario PostgreSQL: permisos editoriales, propietario, paginación y auditoría OK' as resultado;

-- Mostrador del Bibliotecario: privilegios editoriales, propiedad, trazabilidad y paginación.
-- Aplicar primero en PostgreSQL aislado; migración pendiente de autorización para producción.
-- No cambia roles de plataforma, permisos de lectura ni los datos existentes.

-- El Bibliotecario conserva supervisión global de lectura, pero no hereda permisos
-- de escritura editorial de cada equipo. Las operaciones administrativas autorizadas
-- continúan a través de sus RPC específicas con private.is_admin().
create or replace function private.team_can(t uuid, action text)
returns boolean language sql stable security definer set search_path to ''
as $function$
  select (action = 'view' and private.is_admin()) or exists (
    select 1 from public.team_members m left join public.team_roles r on r.id = m.role_id
    where m.team_id = t and m.user_id = auth.uid() and (
      m.role = 'owner' or action = 'view'
      or coalesce((m.overrides->>action)::boolean, (r.perms->>action)::boolean,
           case when m.role = 'admin' then true
             when action in ('members','profile','log') then false
             when action = 'review' then m.role in ('translator','editor','proofreader')
             when action = 'board' then m.role in ('translator','editor','proofreader')
             when action = 'delete' then m.role = 'translator'
             else m.role in ('translator','editor') end)))
$function$;

-- Esta política ALL dejaba modificar/insertar/eliminar series por ser Bibliotecario.
-- La política "series read" ya permite ver obras publicadas y borradores al Bibliotecario.
drop policy if exists "series admin" on public.series;

-- Protege al último propietario incluso fuera del Mostrador (Studio/REST/RPC).
-- Serializa cambios dentro del equipo para evitar carrera entre dos retiradas.
create or replace function private.protect_team_owner()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role is distinct from 'owner'
          or new.team_id is distinct from old.team_id
          or new.user_id is distinct from old.user_id) then
    perform 1 from public.teams where id=old.team_id for update;
    if not exists (
      select 1 from public.team_members m
      where m.team_id=old.team_id and m.role='owner'
        and m.user_id<>old.user_id
    ) then
      raise exception 'No se puede dejar un equipo sin propietario';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$function$;
revoke all on function private.protect_team_owner() from public,anon,authenticated;
drop trigger if exists team_owner_protection on public.team_members;
create trigger team_owner_protection
before update of role,team_id,user_id or delete on public.team_members
for each row execute function private.protect_team_owner();

-- El Mostrador no permite convertir un propietario existente en otro rol
-- ni crear un segundo propietario; los traspasos deben ser un flujo explícito.
create or replace function public.admin_add_publisher(p_user text, p_team uuid, p_role text default 'editor')
returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid; previous_role public.team_role;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_role not in ('owner','admin','translator','editor','proofreader','collaborator') then raise exception 'rol inválido'; end if;
  perform 1 from public.teams where id=p_team for update;
  if not found then raise exception 'Equipo inexistente'; end if;
  select p.id into uid from public.profiles p join auth.users u on u.id=p.id
   where lower(u.email)=lower(btrim(p_user)) or lower(p.username)=lower(btrim(p_user)) limit 1;
  if uid is null then raise exception 'No existe una cuenta con ese correo o usuario'; end if;
  select m.role into previous_role from public.team_members m where m.team_id=p_team and m.user_id=uid;
  if previous_role='owner' and p_role<>'owner' then
    raise exception 'El propietario requiere transferencia explícita';
  end if;
  if p_role='owner' and exists (
    select 1 from public.team_members where team_id=p_team and role='owner' and user_id<>uid
  ) then
    raise exception 'El equipo ya tiene propietario; utiliza una transferencia explícita';
  end if;
  insert into public.team_members (team_id,user_id,role) values (p_team,uid,p_role::public.team_role)
  on conflict (team_id,user_id) do update set role=excluded.role;
  perform private.audit('agregar_publicador','team',p_team::text,jsonb_build_object('user',uid,'role',p_role));
end
$function$;

create or replace function public.admin_remove_member(p_team uuid,p_user uuid)
returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  perform 1 from public.teams where id=p_team for update;
  if exists (select 1 from public.team_members where team_id=p_team and user_id=p_user and role='owner') then
    raise exception 'No se puede retirar a un propietario desde este formulario';
  end if;
  delete from public.team_members where team_id=p_team and user_id=p_user;
  if found then
    perform private.audit('quitar_publicador','team',p_team::text,jsonb_build_object('user',p_user));
  end if;
end
$function$;

-- Moderar reseñas debe aparecer en la misma Bitácora administrativa.
create or replace function public.admin_review_resolve(p_series uuid,p_author uuid,p_action text)
returns void language plpgsql security definer set search_path to ''
as $function$
declare t text; sl text; changed integer;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_action not in ('removed','dismissed') then raise exception 'bad_action'; end if;
  update public.review_reports set status=p_action,resolved_at=now(),resolved_by=auth.uid()
    where series_id=p_series and author_id=p_author and status='open';
  get diagnostics changed = row_count;
  if changed=0 then raise exception 'No existen reportes abiertos para resolver'; end if;
  if p_action='removed' then
    select title,slug into t,sl from public.series where id=p_series;
    delete from public.series_reviews where series_id=p_series and user_id=p_author;
    insert into public.notifications (user_id,kind,body,link)
      values (p_author,'moderacion',
        'Se retiró tu reseña de «'||coalesce(t,'una obra')||'» por no cumplir las normas de la comunidad.',
        jsonb_build_object('href','/serie/'||coalesce(sl,'')));
  end if;
  perform private.audit('resolver_reporte_resena','series',p_series::text,
    jsonb_build_object('action',p_action,'author_id',p_author,'reports_resolved',changed));
end
$function$;

-- RPC independiente para no romper consumidores existentes de admin_users.
create or replace function public.admin_users_page(
  p_q text default '',p_role text default null,p_offset integer default 0,p_limit integer default 50)
returns table(id uuid,username text,email text,platform_role text,avatar_url text,
  created_at timestamptz,last_sign_in timestamptz,teams jsonb)
language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_offset<0 or p_limit<1 or p_limit>100 then raise exception 'Paginación inválida'; end if;
  return query select p.id,p.username,u.email::text,p.platform_role,p.avatar_url,p.created_at,u.last_sign_in_at,
      coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'role',m.role))
        from public.team_members m join public.teams t on t.id=m.team_id where m.user_id=p.id),'[]')
    from public.profiles p join auth.users u on u.id=p.id
    where (p_role is null or p.platform_role=p_role)
      and (coalesce(p_q,'')='' or p.username ilike '%'||p_q||'%' or u.email ilike '%'||p_q||'%')
    order by (p.platform_role='bibliotecario') desc,p.created_at desc,p.id
    limit p_limit offset p_offset;
end
$function$;

revoke all on function public.admin_users_page(text,text,integer,integer) from public,anon;
grant execute on function public.admin_users_page(text,text,integer,integer) to authenticated;

-- Páginas de la Bitácora (mantener API admin_audit original para consumidores previos).
create or replace function public.admin_audit_page(p_offset integer default 0,p_limit integer default 50)
returns table(at timestamptz,actor text,action text,target_type text,target_id text,detail jsonb)
language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_offset<0 or p_limit<1 or p_limit>100 then raise exception 'Paginación inválida'; end if;
  return query select a.created_at,p.username,a.action,a.target_type,a.target_id,a.detail
  from public.moderation_audit a left join public.profiles p on p.id=a.actor
  order by a.created_at desc,a.target_id desc limit p_limit offset p_offset;
end
$function$;
revoke all on function public.admin_audit_page(integer,integer) from public,anon;
grant execute on function public.admin_audit_page(integer,integer) to authenticated;

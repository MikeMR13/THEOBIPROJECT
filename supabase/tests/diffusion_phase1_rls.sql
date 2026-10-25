-- Ejecutar tras fixture y migración REAL de Difusión. Sin redes ni datos reales.
\set ON_ERROR_STOP on
do $qa$
declare t text;
begin
 foreach t in array array['diffusion_connections','diffusion_rules','diffusion_campaigns','diffusion_events','diffusion_jobs','diffusion_attempts'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity)
  then raise exception 'Falta RLS en %',t; end if;
  if has_table_privilege('authenticated',format('public.%I',t),'INSERT')
   or has_table_privilege('authenticated',format('public.%I',t),'UPDATE')
   or has_table_privilege('authenticated',format('public.%I',t),'DELETE')
   or has_table_privilege('anon',format('public.%I',t),'SELECT')
  then raise exception 'Privilegio inseguro en %',t; end if;
 end loop;
 if not has_table_privilege('authenticated','public.diffusion_rules','SELECT')
 then raise exception 'No puede leer reglas propias'; end if;
 if has_function_privilege('anon','public.diffusion_rule_save(uuid,uuid,text,text,text,integer)','EXECUTE')
 then raise exception 'Anon tiene RPC privilegiada'; end if;
end $qa$;

insert into public.diffusion_connections(team_id,provider,label) values
('11111111-1111-4111-8111-111111111111','discord','Discord A'),
('22222222-2222-4222-8222-222222222222','telegram','Telegram B'),
(null,'webhook','Redes oficiales');
insert into public.diffusion_rules(team_id,name,event_kind) values
('11111111-1111-4111-8111-111111111111','Regla previa A','volume.public'),
('22222222-2222-4222-8222-222222222222','Regla previa B','chapter.public');
insert into public.diffusion_campaigns(team_id,title,body) values
('11111111-1111-4111-8111-111111111111','Borrador A','Contenido ficticio'),
('22222222-2222-4222-8222-222222222222','Borrador B','Contenido ficticio'),
(null,'Borrador oficial','Cuenta institucional');

-- A: propietario actúa sin aprobación del Bibliotecario y no ve al resto.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.is_admin','false',false);
set role authenticated;
do $qa$
declare id uuid; perms jsonb; denied boolean:=false;
begin
 if (select count(*) from public.diffusion_connections)<>1
 or (select count(*) from public.diffusion_rules)<>1
 or (select count(*) from public.diffusion_campaigns)<>1 then
  raise exception 'Equipo A ve recursos ajenos'; end if;
 perms:=public.my_team_permissions('11111111-1111-4111-8111-111111111111');
 if perms->>'diffusion_manage'<>'true' or perms->>'diffusion_publish'<>'true'
 then raise exception 'Dueño A sin permisos de Difusión'; end if;
 id:=public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',null,
   'Mi estreno A','volume.public','automatic',15);
 if not exists(select 1 from public.diffusion_rules where diffusion_rules.id=id and enabled=false)
 then raise exception 'Regla propia no creada o activada sin autorización'; end if;
 id:=public.diffusion_campaign_draft_save('11111111-1111-4111-8111-111111111111',
   null,'Campaña libre A','Publicación interna libre');
 if not exists(select 1 from public.diffusion_campaigns where diffusion_campaigns.id=id and status='draft')
 then raise exception 'Campaña no quedó en borrador'; end if;
 perform public.diffusion_draft_delete('11111111-1111-4111-8111-111111111111','campaign',id);
 if exists(select 1 from public.diffusion_campaigns where diffusion_campaigns.id=id)
 then raise exception 'No se puede borrar borrador propio'; end if;
 begin
  perform public.diffusion_rule_save('22222222-2222-4222-8222-222222222222',
    null,'Ataque a equipo B','chapter.public','automatic',0);
 exception when raise_exception then
  if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'A modificó reglas B'; end if;
 denied:=false;
 begin
  perform public.diffusion_campaign_draft_save(null,null,'Suplantación oficial','No permitido');
 exception when raise_exception then
  if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Equipo A publicó en ámbito institucional'; end if;
 denied:=false;
 begin
  insert into public.diffusion_rules(team_id,name,event_kind)
    values('11111111-1111-4111-8111-111111111111','Escritura directa','volume.public');
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Frontend puede escribir directamente tablas'; end if;
end $qa$;
reset role;

-- Editor A: puede redactar y programar; no gestiona webhooks/reglas.
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
set role authenticated;
do $qa$
declare p jsonb; denied boolean:=false;
begin
 p:=public.my_team_permissions('11111111-1111-4111-8111-111111111111');
 if p->>'diffusion_compose'<>'true' or p->>'diffusion_schedule'<>'true' or p->>'diffusion_manage'<>'false'
 then raise exception 'Permisos del editor alterados'; end if;
 perform public.diffusion_campaign_draft_save('11111111-1111-4111-8111-111111111111',null,'Campaña editor','Texto');
 begin
  perform public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',null,'Regla editor','chapter.public','automatic',0);
 exception when raise_exception then
  if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Editor puede gestionar reglas sin permiso'; end if;
end $qa$;
reset role;

-- Excepciones individuales prevalecen sobre rol personalizado.
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-ffffffffffff',false);
set role authenticated;
do $qa$
declare p jsonb;
begin
 p:=public.my_team_permissions('11111111-1111-4111-8111-111111111111');
 if p->>'diffusion_view'<>'true' or p->>'diffusion_compose'<>'false'
 then raise exception 'Overrides personales ignorados'; end if;
end $qa$;
reset role;

-- Colaborador: solo lectura propia, no composición.
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
set role authenticated;
do $qa$
declare denied boolean:=false;
begin
 if (select count(*) from public.diffusion_connections)<>1
 then raise exception 'Colaborador lee equipo B'; end if;
 begin
  perform public.diffusion_campaign_draft_save('11111111-1111-4111-8111-111111111111',null,'Campaña ilegal','No');
 exception when raise_exception then
  if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Colaborador pudo crear campaña'; end if;
end $qa$;
reset role;

-- B autónomo, sin acceso a A.
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
set role authenticated;
do $qa$
begin
 if (select count(*) from public.diffusion_connections)<>1
 or exists(select 1 from public.diffusion_campaigns where title='Borrador A')
 then raise exception 'Equipo B accedió a A'; end if;
 perform public.diffusion_rule_save('22222222-2222-4222-8222-222222222222',null,'Mi regla B','chapter.public','automatic',0);
end $qa$;
reset role;

-- Bibliotecario solo opera cuentas oficiales, no requiere aprobar las de equipos.
select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',false);
select set_config('request.jwt.claim.is_admin','true',false);
set role authenticated;
do $qa$
declare denied boolean:=false;
begin
 if (select count(*) from public.diffusion_connections)<>1 then
  raise exception 'Bibliotecario lee conexiones ajenas'; end if;
 perform public.diffusion_rule_save(null,null,'Campaña oficial','announcement.published','automatic',0);
 begin
  perform public.diffusion_rule_save('11111111-1111-4111-8111-111111111111',null,'Intervención oficial','volume.public','automatic',0);
 exception when raise_exception then
  if sqlerrm='forbidden' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'Bibliotecario modificó equipo A'; end if;
end $qa$;
reset role;

-- Anon no puede seleccionar ni invocar RPC.
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.is_admin','false',false);
set role anon;
do $qa$
declare denied boolean:=false;
begin
 begin perform count(*) from public.diffusion_connections;
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anon lee conexiones'; end if;
 denied:=false;
 begin
  perform public.diffusion_rule_save(null,null,'Ataque anónimo','volume.public','automatic',0);
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anon ejecuta RPC'; end if;
end $qa$;
reset role;

do $qa$ begin
 if exists(select 1 from public.diffusion_rules where enabled) then
   raise exception 'Regla activada sin conectores'; end if;
 if exists(select 1 from public.diffusion_jobs) then
   raise exception 'Trabajo creado sin despachador'; end if;
end $qa$;
\echo 'DIFUSION QA: PASS — migración, RLS, RPC, autonomía de equipos y cuentas institucionales.'

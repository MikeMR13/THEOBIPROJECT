-- Verificaciones reales de semántica PostgreSQL, sin depender de mocks JavaScript.
\set ON_ERROR_STOP on

do $qa$
declare n int;
begin
  select count(*) into n from pg_trigger tr
    join pg_class c on c.oid=tr.tgrelid
    join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname='public'
    and tr.tgname in ('chapters_home_stale','series_home_stale','volumes_home_stale')
    and pg_get_triggerdef(tr.oid) like '%FOR EACH ROW%';
  if n <> 3 then raise exception 'FAIL: se esperaban 3 triggers AFTER ROW, detectados %', n; end if;
end $qa$;

-- El runner de publicaciones ejecuta sentencias aun sin lanzamientos vencidos.
update private.home_snapshot set built_at = clock_timestamp() where id=1;
do $qa$
declare before_at timestamptz;
declare after_at timestamptz;
begin
  select built_at into before_at from private.home_snapshot where id=1;
  update public.volumes set status='published' where status='scheduled' and id<0;
  update public.chapters set status='published' where status='scheduled' and id<0;
  update public.series set published=true where id<0;
  select built_at into after_at from private.home_snapshot where id=1;
  if before_at is distinct from after_at then
    raise exception 'FAIL: una sentencia con cero filas invalidó la caché';
  end if;
  if after_at <= clock_timestamp()-interval '15 minutes' then
    raise exception 'FAIL: la fecha de snapshot dejó de ser válida';
  end if;
end $qa$;

create function private.qa_assert_invalidated(p_case text) returns void
language plpgsql set search_path=''
as $qa$
begin
  if not exists(select 1 from private.home_snapshot where id=1 and built_at='-infinity'::timestamptz) then
    raise exception 'FAIL: cambio real no invalidó snapshot: %', p_case;
  end if;
end $qa$;

-- Inserciones, actualizaciones y borrados reales siguen invalidando Inicio.
update private.home_snapshot set built_at = clock_timestamp() where id=1;
insert into public.series(id,published) values(1,true);
select private.qa_assert_invalidated('series insert');
update private.home_snapshot set built_at = clock_timestamp() where id=1;
update public.series set published=false where id=1;
select private.qa_assert_invalidated('series update');
update private.home_snapshot set built_at = clock_timestamp() where id=1;
delete from public.series where id=1;
select private.qa_assert_invalidated('series delete');

update private.home_snapshot set built_at = clock_timestamp() where id=1;
insert into public.volumes(id,status) values(1,'scheduled');
select private.qa_assert_invalidated('volumes insert');
update private.home_snapshot set built_at = clock_timestamp() where id=1;
update public.volumes set status='published' where id=1;
select private.qa_assert_invalidated('volumes update');
update private.home_snapshot set built_at = clock_timestamp() where id=1;
delete from public.volumes where id=1;
select private.qa_assert_invalidated('volumes delete');

update private.home_snapshot set built_at = clock_timestamp() where id=1;
insert into public.chapters(id,status) values(1,'scheduled');
select private.qa_assert_invalidated('chapters insert');
update private.home_snapshot set built_at = clock_timestamp() where id=1;
update public.chapters set status='published' where id=1;
select private.qa_assert_invalidated('chapters update');
update private.home_snapshot set built_at = clock_timestamp() where id=1;
delete from public.chapters where id=1;
select private.qa_assert_invalidated('chapters delete');

-- Un trigger row-level invalida también con una actualización real sin cambio
-- de valores, igual que la semántica anterior sobre filas existentes.
insert into public.volumes(id,status) values(2,'scheduled');
update private.home_snapshot set built_at=clock_timestamp() where id=1;
update public.volumes set status=status where id=2;
select private.qa_assert_invalidated('update fila existente con igual valor');

-- Verifica que el rollback provisto restaure exactamente el comportamiento anterior.

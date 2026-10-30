-- Registro verificable de vínculos entre obras en la Bitácora del equipo.
-- No modifica ninguna relación existente ni concede permisos de escritura al navegador.
-- Se ejecuta únicamente por cambios autorizados en public.series (RLS vigente).
create or replace function private.audit_series_relations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_count integer := 0;
  after_count integer := 0;
begin
  after_count := jsonb_array_length(coalesce(new.relations, '[]'::jsonb));
  if tg_op = 'UPDATE' then
    if old.relations is not distinct from new.relations then return null; end if;
    before_count := jsonb_array_length(coalesce(old.relations, '[]'::jsonb));
  elsif after_count = 0 then
    return null;
  end if;
  perform private.log(
    new.team_id, 'edicion',
    case when tg_op = 'INSERT' then 'Vinculó obras relacionadas al crear «'
         else 'Actualizó obras relacionadas de «' end ||
       coalesce(new.short, new.title) || '»',
    jsonb_build_object('before', before_count, 'after', after_count, 'action', 'related_works'),
    new.id
  );
  return null;
end;
$$;

revoke all on function private.audit_series_relations() from public, anon, authenticated;
drop trigger if exists series_relations_audit on public.series;
create trigger series_relations_audit
after insert or update of relations on public.series
for each row execute function private.audit_series_relations();

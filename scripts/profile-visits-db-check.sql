-- Validaciones funcionales en una base efímera: jamás toca Supabase real.
do $$
declare
  s1 constant uuid := '11111111-1111-4111-8111-111111111111';
  s2 constant uuid := '22222222-2222-4222-8222-222222222222';
  s3 constant uuid := '33333333-3333-4333-8333-333333333333';
  token1 constant uuid := '55555555-5555-4555-8555-555555555555';
  token2 constant uuid := '66666666-6666-4666-8666-666666666666';
  score1 numeric;
  score2 numeric;
  report jsonb;
begin
  if not (select c.relrowsecurity from pg_class c where c.oid='public.series_profile_daily'::regclass) then
    raise exception 'RLS de visitas deshabilitado';
  end if;
  if has_table_privilege('anon','public.series_profile_daily','select')
     or has_table_privilege('authenticated','public.series_profile_daily','select') then
    raise exception 'Contadores diarios expuestos directamente al navegador';
  end if;
  if has_table_privilege('anon','private.series_profile_seen','select') then
    raise exception 'Identificadores de visitas expuestos';
  end if;
  if not has_function_privilege('anon','public.track_series_profile_visit(uuid,uuid)','execute')
     or not has_function_privilege('authenticated','public.series_profile_ranking(text,text,text,integer)','execute') then
    raise exception 'Permisos de RPC públicas incompletos';
  end if;
  if has_function_privilege('anon','public.series_profile_visit_stats(uuid,integer)','execute') then
    raise exception 'Estadísticas privadas expuestas a usuarios anónimos';
  end if;

  if not public.track_series_profile_visit(s1,token1) then raise exception 'Visita pública no contada'; end if;
  if public.track_series_profile_visit(s1,token1) then raise exception 'Visita duplicada contada'; end if;
  if not public.track_series_profile_visit(s1,token2) then raise exception 'Segundo visitante no contado'; end if;
  if public.track_series_profile_visit(s1,null) then raise exception 'Visita anónima sin token contada'; end if;
  if public.track_series_profile_visit(s2,token1) then raise exception 'Se contabilizó una visita a +18 sin autorización'; end if;
  if public.track_series_profile_visit(s3,token1) then raise exception 'Se contabilizó una obra inédita'; end if;
  if exists(select 1 from public.series_profile_ranking('semana') r where r.series_id=s2) then
    raise exception 'Ranking anónimo expuso una obra +18';
  end if;

  select r.score into score1 from public.series_profile_ranking('semana') r where r.series_id=s1;
  if score1 is distinct from 2 then raise exception 'Ranking semanal: se esperaban dos visitas, resultó %',score1; end if;
  select r.score into score1 from public.series_profile_ranking('historico') r where r.series_id=s1;
  if score1 is distinct from 2 then raise exception 'Histórico incorrecto'; end if;
  select r.score into score1 from public.series_profile_ranking('semana','Fantasía') r where r.series_id=s1;
  if score1 is distinct from 2 then raise exception 'Filtro por género incorrecto'; end if;
  if exists(select 1 from public.series_profile_ranking('semana',null,'terminada') r where r.series_id=s1) then
    raise exception 'Filtro por estado no excluyó obra activa';
  end if;

  perform set_config('test.uid','44444444-4444-4444-8444-444444444444',false);
  if not public.track_series_profile_visit(s2,null) then
    raise exception 'Visita autenticada y adulta no contada';
  end if;
  if public.track_series_profile_visit(s2,null) then
    raise exception 'Visita autenticada repetida no se deduplicó';
  end if;
  select r.score into score2 from public.series_profile_ranking('semana') r where r.series_id=s2;
  if score2 is distinct from 1 then raise exception 'No se ven visitas +18 autorizadas'; end if;

  perform set_config('test.team','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
  report := public.series_profile_visit_stats(s1,7);
  if (report->>'recent')::int <> 2 or (report->>'total')::int <> 2 then
    raise exception 'Estadísticas privadas incorrectas: %',report;
  end if;
  begin
    perform public.series_profile_visit_stats(s2,7);
    raise exception 'El equipo pudo consultar una obra ajena';
  exception when sqlstate '42501' then null;
  end;

  if (select views from public.series where id=s1) <> 17 then
    raise exception 'Se alteró series.views, métrica anterior de lectura';
  end if;
  if (select count(*) from private.series_profile_seen where series_id=s1) <> 2 then
    raise exception 'Deduplicación de visitas incorrecta';
  end if;
  raise notice 'PASS: permisos, RLS, +18, publicación, deduplicación, períodos, filtros, privacidad, equipo y lecturas independientes';
end $$;

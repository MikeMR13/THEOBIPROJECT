\set ON_ERROR_STOP on
do $test$
declare v jsonb; r jsonb; cached jsonb;
begin
  v:=private.build_home();
  if jsonb_array_length(v->'reviews')<>2 then
    raise exception 'Se alteró inesperadamente la cantidad de reseñas';
  end if;
  if not exists(select 1 from jsonb_array_elements(v->'reviews') x
    where x->>'body' like '%anónima%' and x->>'username' is null) then
    raise exception 'FUGA: reseña anónima conserva identidad';
  end if;
  if not exists(select 1 from jsonb_array_elements(v->'reviews') x
    where x->>'body' like '%pública%' and x->>'username'='qa-visible') then
    raise exception 'Regresión: reseña pública perdió su username';
  end if;
  if not (v ? 'series' and v ? 'latest' and v ? 'featured' and v ? 'reviews') then
    raise exception 'Se alteraron secciones de Inicio';
  end if;
  -- home_feed debe devolver la versión saneada por la ruta de la caché.
  insert into private.home_snapshot(id,data,built_at) values (1,v,now())
  on conflict (id) do update set data=excluded.data,built_at=excluded.built_at;
  cached:=public.home_feed();
  if exists(select 1 from jsonb_array_elements(cached->'reviews') x
    where x->>'body' like '%anónima%' and x->>'username' is not null) then
    raise exception 'FUGA: home_feed cacheado revela username anónimo';
  end if;
  -- El RPC alternativo home_reviews ya debe tener la misma protección.
  r:=public.home_reviews(6);
  if exists(select 1 from jsonb_array_elements(r) x
    where x->>'body' like '%anónima%' and x->>'username' is not null) then
    raise exception 'FUGA: home_reviews revela username anónimo';
  end if;
end $test$;

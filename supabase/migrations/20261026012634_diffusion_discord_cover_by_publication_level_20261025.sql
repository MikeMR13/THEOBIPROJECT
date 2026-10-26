-- Difusión Discord: portadas obligatorias según nivel editorial.
-- No sustituir portada de volumen por portada general de la obra.
-- Sin cambios de permisos, conexiones, envíos anteriores ni cron.
create or replace function private.diffusion_manual_discord_data(
  p_connection uuid, p_kind text, p_source uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare conn record; se record; vo record; ch record;
  ttl text; msg text; descr text; cover text; link text;
begin
 if auth.uid() is null or p_kind not in ('series','volume','chapter') or p_source is null
 then raise exception 'forbidden'; end if;
 select team_id,status into conn from public.diffusion_connections
   where id=p_connection and provider='discord';
 if not found or conn.status<>'active'
   or not private.diffusion_scope_ok(conn.team_id,'diffusion_publish')
 then raise exception 'forbidden'; end if;
 if p_kind='series' then
   select * into se from public.series where id=p_source;
   if not found then raise exception 'not_public'; end if;
 elsif p_kind='volume' then
   select * into vo from public.volumes where id=p_source;
   if not found then raise exception 'not_public'; end if;
   select * into se from public.series where id=vo.series_id;
 else
   select * into ch from public.chapters where id=p_source;
   if not found then raise exception 'not_public'; end if;
   select * into se from public.series where id=ch.series_id;
   select * into vo from public.volumes
     where id=ch.volume_id or (ch.volume_id is null and series_id=ch.series_id and num=ch.vol)
     order by (id=ch.volume_id) desc limit 1;
 end if;
 if se.id is null or (conn.team_id is not null and conn.team_id<>se.team_id)
    or se.published is distinct from true or se.archived_at is not null
    or coalesce(se.translation_status,'') in ('abandoned','withdrawn')
    or not (coalesce(se.access,'public')='public' or coalesce(se.access_until<=now(),false))
    or se.slug !~ '^[A-Za-z0-9_-]+$'
 then raise exception 'not_public'; end if;
 if p_kind in ('volume','chapter') then
   if vo.id is null or vo.deleted_at is not null or vo.status<>'published'
     or (vo.published_at is not null and vo.published_at>now())
     or not (coalesce(vo.access,'public')='public' or coalesce(vo.access_until<=now(),false))
   then raise exception 'not_public'; end if;
 end if;
 if p_kind='chapter' then
   if ch.deleted_at is not null or ch.status::text<>'published'
     or (ch.publish_at is not null and ch.publish_at>now())
     or not (coalesce(ch.access,'public')='public' or coalesce(ch.access_until<=now(),false))
     or ch.num is null
   then raise exception 'not_public'; end if;
   ttl:=left(se.title||' · Capítulo '||ch.num||' — '||coalesce(ch.title,''),256);
   msg:='📖 Nuevo capítulo: '||left(coalesce(nullif(ch.title,''),'Capítulo '||ch.num),160);
   descr:=left(se.title||' · Volumen '||vo.num,300);
   cover:=nullif(btrim(vo.cover_path),'');
   link:='https://elobidellector.com/leer/'||se.slug||'/'||ch.num;
 elsif p_kind='volume' then
   ttl:=left(se.title||' · Volumen '||vo.num,256);
   msg:='📚 Nuevo volumen '||vo.num||' de '||left(se.title,160)||' disponible';
   descr:=case when vo.synopsis_spoiler then 'Nuevo volumen disponible en El Obi'
     else left(regexp_replace(coalesce(vo.synopsis,''),'[[:space:]]+',' ','g'),300) end;
   cover:=nullif(btrim(vo.cover_path),'');
   link:='https://elobidellector.com/serie/'||se.slug;
 else
   ttl:=left(se.title,256);
   msg:='✨ Nueva obra en El Obi: '||left(se.title,170);
   descr:=left(regexp_replace(coalesce(se.synopsis,''),'[[:space:]]+',' ','g'),300);
   cover:=nullif(btrim(se.cover_path),'');
   link:='https://elobidellector.com/serie/'||se.slug;
 end if;
 -- Portada obligatoria: obra usa obra; volumen y capítulo usan su volumen.
 if cover is null then
   if p_kind='series' then raise exception 'missing_work_cover';
   else raise exception 'missing_volume_cover'; end if;
 end if;
 if char_length(cover)>450 or cover !~ '^[A-Za-z0-9_./-]+$'
   or left(cover,1)='/' or position('..' in cover)>0
 then raise exception 'invalid_cover_path'; end if;
 return jsonb_build_object('kind',p_kind,'source_id',p_source,
   'title',ttl,'message',left(msg,700),'description',coalesce(descr,''),
   'cover_path',cover,'url',link);
end $fn$;

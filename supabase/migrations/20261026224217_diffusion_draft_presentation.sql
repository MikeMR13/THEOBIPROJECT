-- Borradores de Difusión: preferencias de presentación solo editorial; sin envíos ni cambios a SEO público.
alter table public.diffusion_campaigns add column if not exists presentation jsonb not null
  default '{"showTitle":true,"showTeam":true,"showSynopsis":false,"showCover":true}'::jsonb;
comment on column public.diffusion_campaigns.presentation is 'Configuración de vista previa; no altera las meta etiquetas públicas.';
-- Mantener RPC original de 4 argumentos para clientes existentes. Añadir versión explícita de 5 argumentos.
create function public.diffusion_campaign_draft_save(
  p_team uuid,p_id uuid,p_title text,p_body text,p_presentation jsonb
) returns uuid language plpgsql security definer set search_path='' as $fn$
declare result_id uuid; safe_p jsonb;
begin
 if auth.uid() is null or not private.diffusion_scope_ok(p_team,'diffusion_compose')
 then raise exception 'forbidden'; end if;
 if length(btrim(coalesce(p_title,''))) not between 2 and 140
    or length(coalesce(p_body,'')) > 2000 then raise exception 'invalid_campaign'; end if;
 if p_presentation is null or jsonb_typeof(p_presentation)<>'object'
    or exists (select 1 from jsonb_each(p_presentation) as fields
      where fields.key not in ('showTitle','showTeam','showSynopsis','showCover')
         or jsonb_typeof(fields.value)<>'boolean')
 then raise exception 'invalid_presentation'; end if;
 safe_p=jsonb_build_object(
   'showTitle',coalesce((p_presentation->>'showTitle')::boolean,true),
   'showTeam',coalesce((p_presentation->>'showTeam')::boolean,true),
   'showSynopsis',coalesce((p_presentation->>'showSynopsis')::boolean,false),
   'showCover',coalesce((p_presentation->>'showCover')::boolean,true));
 if p_id is null then
   insert into public.diffusion_campaigns(team_id,title,body,presentation,created_by)
   values(p_team,btrim(p_title),coalesce(p_body,''),safe_p,auth.uid())
   returning id into result_id;
 else
   update public.diffusion_campaigns set title=btrim(p_title),body=coalesce(p_body,''),
       presentation=safe_p,updated_at=now()
   where id=p_id and team_id is not distinct from p_team and status='draft'
   returning id into result_id;
   if result_id is null then raise exception 'not_found_or_not_draft'; end if;
 end if;
 if p_team is not null then
   perform private.log(p_team,'edicion','Guardó un borrador de Difusión',
     jsonb_build_object('campaign_id',result_id),null,null);
 end if;
 return result_id;
end $fn$;
revoke all on function public.diffusion_campaign_draft_save(uuid,uuid,text,text,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.diffusion_campaign_draft_save(uuid,uuid,text,text,jsonb)
  to authenticated;

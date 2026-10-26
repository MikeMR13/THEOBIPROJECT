-- Aprobación editorial de preestrenos (ejecución posterior a la migración 4D).
create function public.diffusion_prelaunch_approve(p_plan uuid)
returns boolean language plpgsql security definer set search_path='' as $approve$
declare p public.diffusion_scheduled_announcements%rowtype;
begin
 if auth.uid() is null or p_plan is null then raise exception 'forbidden'; end if;
 select * into p from public.diffusion_scheduled_announcements s
 where s.id=p_plan and s.status='planned' and s.delivery_mode='manual'
   and s.prelaunch_volume_id is not null and s.rule_id is not null for update;
 if not found then raise exception 'not_found_or_not_pending'; end if;
 if not private.diffusion_scope_ok(p.team_id,'diffusion_publish')
 or not private.diffusion_scope_ok(p.team_id,'diffusion_schedule')
 or not exists (select 1 from public.diffusion_rules r
   where r.id=p.rule_id and r.enabled and r.mode='team_review'
   and r.event_kind='prelaunch.announced' and r.connection_id=p.connection_id)
 then raise exception 'forbidden'; end if;
 update public.diffusion_scheduled_announcements
 set delivery_mode='automatic',updated_at=now() where id=p.id;
 return true;
end $approve$;
revoke all on function public.diffusion_prelaunch_approve(uuid)
from public,anon,authenticated,service_role;
grant execute on function public.diffusion_prelaunch_approve(uuid) to authenticated;

-- Detener despacho de 4B sin alterar 4A ni borrar históricos o conexiones.
-- ADVERTENCIA: los envíos ya realizados no se pueden deshacer en el proveedor.
select cron.unschedule(jobid) from cron.job where jobname='obi-diffusion-4b';
-- Restaurar a manual los planes AÚN no reclamados (opt-in ya revocado).
update public.diffusion_scheduled_announcements
 set delivery_mode='manual',updated_at=now()
 where status='planned' and delivery_mode='automatic';

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHomeMetrics} from '../src/home-metrics.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261023_carousel_metrics_limits_retention.sql');
const source=read('src/home-metrics.js');
const legal=read('src/legal.js');
const old=read('supabase/migrations/20261023_carousel_metrics_daily.sql');

// Seguridad y control de abuso: límites realmente verificados en PostgreSQL.
for(const phrase of [
  'private.carousel_metric_limits','enable row level security',
  'revoke all on table private.carousel_metric_limits from public, anon, authenticated',
  'private.carousel_metric_record_impl','security definer','security invoker',
  "where lim.accepted < 180","where lim.accepted < 15000",
  'where m.total < 5000','on conflict(period,bucket) do update',
  'revoke all on function private.prune_carousel_metrics() from public,anon,authenticated',
  "cron.schedule(","'obi-carousel-metrics-retention'","'30 10 * * *'",
  'private.prune_carousel_metrics()',
  "::date - 89","interval '48 hours'"
])assert(sql.includes(phrase),'Seguridad/retención no conservada: '+phrase);
assert(/create or replace function public\.carousel_metric_record\(p_category text,p_action text\)[\s\S]*?security invoker/.test(sql),
  'RPC pública debe usar privilegios del invocador, no SECURITY DEFINER');
assert(/create or replace function private\.carousel_metric_record_impl\(p_category text,p_action text\)[\s\S]*?security definer/.test(sql),
  'La implementación privilegiada debe estar fuera de la API pública');
assert(old.includes('private.carousel_metrics_daily'), 'Mantener los mismos totales ya recolectados');
for(const forbidden of ['user_id','session_id','ip_address','device_id','fingerprint','series_id'])
  assert(!sql.includes(forbidden),'No guardar identidad o obra en los límites: '+forbidden);

// Transparencia: alcance, retención y fecha correctos sin modificar Condiciones.
assert(legal.includes("updated: '23 de octubre de 2026'"),'Actualizar fecha de Privacidad');
assert(legal.includes("updated = UPDATED"),'No falsear fecha de Condiciones');
for(const phrase of [
  'Estadísticas anónimas del carrusel de Inicio',
  'sessionStorage','10 minutos','90 días','48 horas',
  'límites globales por minuto, día y categoría',
  'pueden verse afectadas por actividad automatizada'
])assert(legal.includes(phrase),'Falta transparencia legal: '+phrase);
assert(!source.includes('document.cookie'),'Las métricas no deben utilizar cookies');
assert(source.includes('LOCAL_MAX_PER_MINUTE=24'),'Debe haber límite local de emisión');

const events=[];
globalThis.document={hidden:false};
globalThis.sessionStorage={setItem(){},getItem(){return null},removeItem(){}};
const sb={rpc:(name,args)=>{events.push({name,args});return Promise.resolve({data:true});}};
const m=createHomeMetrics(sb);
m.startVisit();
for(let i=0;i<100;i++)m.shown('pub:obra-'+i,'release');
assert.equal(events.length,24,'El cliente no debe enviar ráfagas ilimitadas en la misma pestaña');
assert(events.every(x=>x.name==='carousel_metric_record' &&
  Object.keys(x.args).sort().join(',')==='p_action,p_category'),
  'Nunca enviar información individual al contador');
console.log('✓ Seguridad del carrusel: límites SQL, depuración diaria, transparencia y defensa local.');

// Regresión gratuita: jamás conecta a Supabase ni envía visitas reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeFeaturedSelection } from '../src/home-featured.js';
import { dailyProfileToken, recordSeriesProfileVisit, profileVisitRanking } from '../src/series-profile-visits.js';

const repo = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sql = repo('supabase/migrations/20261120_series_profile_visits.sql');
const ui = repo('src/ui.js');
const studio = repo('src/studio.js');
const home = repo('src/home-visit-ranking.js');
const featured = repo('src/home-featured.js');

for (const snippet of [
  'create table if not exists public.series_profile_daily',
  'create table if not exists private.series_profile_seen',
  'create or replace function public.track_series_profile_visit',
  'create or replace function public.series_profile_ranking',
  'create or replace function public.series_profile_visit_stats',
  'alter table public.series_profile_daily enable row level security',
  'private.in_team(',
  'md5(p_series::text',
  'on conflict do nothing'
]) assert(sql.includes(snippet), 'Contrato SQL requerido: ' + snippet);
for (const table of ['series_daily','chapter_views','read_chapters','rankings']) {
  assert(!new RegExp('(?:insert\\s+into|update|delete\\s+from)\\s+public\\.' + table + '\\b', 'i').test(sql),
    'Las visitas no deben escribir en ' + table);
}
assert(!/create\\s+extension|cron\\.schedule|create\\s+trigger/i.test(sql), 'Sin servicios, extensiones ni cron nuevos');
assert(ui.includes("recordSeriesProfileVisit(sb, s.id, getUser())"), 'La ficha registra visitas sin bloquear');
assert(ui.includes("R.list === 'visitas'"), 'El ranking separa visitas y lecturas');
assert(ui.includes("const previewLists = ['visitas'"), 'Vista previa de ranking por visitas');
assert(ui.includes("profileVisitRanking(sb, { period: 'semana', limit: 10 })"), 'La vitrina consulta visitas aparte');
assert(ui.includes('data-home-rank="leidas"') && ui.includes('data-home-rank="visitas"'),
  'El carrusel alterna métricas sin duplicar secciones');
assert(ui.includes("visitas: ['Más visitadas'"), 'El catálogo ordena por las visitas a fichas');
assert(studio.includes('paintProfileVisitStats(sb, F.work, F.days,'), 'Estudio añade estadísticas privadas');
assert(home.includes('const original = rankCar.innerHTML'), 'El carrusel conserva sus tarjetas originales');
assert(home.includes("rankCar.dispatchEvent(new Event('scroll'))"), 'El carrusel conserva navegación y contador');
assert(featured.includes("pool.visits=firstUnique"), 'Las visitas solo aportan una categoría');

const storage = new Map();
const local = {
  getItem: k => storage.get(k) ?? null,
  setItem: (k,v) => storage.set(k,v)
};
let tokens = 0;
const uuid = () => 'dfe92f20-56e4-4b7a-9e21-' + String(++tokens).padStart(12,'0');
const cryptoMock = { randomUUID: uuid };
const first = dailyProfileToken(local,cryptoMock,new Date('2026-11-12T12:00:00Z'));
assert.equal(first,dailyProfileToken(local,cryptoMock,new Date('2026-11-12T20:00:00Z')),'No cambia el token del mismo día');
assert.notEqual(first,dailyProfileToken(local,cryptoMock,new Date('2026-11-13T12:00:00Z')),'El token anónimo rota al cambiar de día');
assert.equal(dailyProfileToken(null,cryptoMock),null,'No rastrear sin almacenamiento autorizado');
let calls = [];
const sb = {rpc:(name,args)=>{calls.push({name,args});return Promise.resolve({data:true,error:null});}};
assert(await recordSeriesProfileVisit(sb,'novela-1',{id:'usuario'}),'La RPC permite usuarios autenticados');
assert.deepEqual(calls[0],{name:'track_series_profile_visit',args:{p_series:'novela-1',p_device:null}});
await profileVisitRanking(sb,{period:'mes',genre:'Fantasía',status:'en_curso',limit:12});
assert.deepEqual(calls[1],{name:'series_profile_ranking',args:{p_period:'mes',p_genre:'Fantasía',p_status:'en_curso',p_limit:12}});
assert.equal(await recordSeriesProfileVisit({rpc:()=>Promise.resolve({data:null,error:{code:'42883'}})},'novela-1',{id:'usuario'}),false,
  'La ausencia de la migración no bloquea la ficha');

const now = new Date('2026-11-12T16:00:00Z');
const series = Array.from({length:12},(_,i)=>({id:'s'+i,title:'Novela '+i,team_id:'t'+i,teams:{name:'Equipo '+i}}));
const release = {id:'s0',kind:'volume',at:'2026-11-12T15:00:00Z',volume:{num:1}};
const params = {now,series,news:{entries:[release],bySeries:{}},
  weekly:[{series_id:'s1',score:300,pos:1}],historic:[{series_id:'s2',score:500,pos:1}],
  visits:[{series_id:'s3',score:900,pos:1}],trends:[],editorial:[],teams:[]};
const selected=homeFeaturedSelection(params);
assert.equal(selected.entries[0].id,'s0','El lanzamiento reciente permanece primero');
assert.equal(selected.pool.visits[0].id,'s3','La visita y lectura son listas diferentes');
assert(selected.entries.some(x=>x.id==='s3'&&x.kind==='visits'),'Una novela muy visitada puede entrar al carrusel');
assert.equal(new Set(selected.entries.map(x=>x.id)).size,selected.entries.length,'Sin duplicar novelas');
const previous=homeFeaturedSelection({...params,visits:[]});
assert(previous.entries.some(x=>x.id==='s0'),'La selección anterior sigue funcionando sin métricas de visitas');
console.log('Visitas a fichas: contadores aislados, privacidad, ranking, catálogo, Inicio, Studio y regresión de lanzamientos OK');

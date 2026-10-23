import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHomeMetrics,reportHomeRead,homeMetricCategory} from '../src/home-metrics.js';

const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../src/admin.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const selector=readFileSync(new URL('../src/home-featured.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261023_carousel_metrics_daily.sql',import.meta.url),'utf8');
assert(sql.includes('create table if not exists private.carousel_metrics_daily'),'La tabla debe ser privada');
assert(sql.includes('enable row level security'),'Defensa en profundidad requerida');
assert(sql.includes('revoke all on table private.carousel_metrics_daily from public, anon, authenticated'),'No exponer datos crudos');
assert(sql.includes('if not private.is_admin()'),'El reporte debe exigir privilegio Bibliotecario');
assert(sql.includes('set search_path ='),'Funciones privilegiadas con search_path acotado');
for(const forbidden of ['user_id','session_id','ip_address','series_id','device_id','fingerprint'])
  assert(!sql.includes(forbidden),'No guardar identificador personal o de obra: '+forbidden);
assert(ui.includes('homeMetrics.shown(heroKey(s),metricCategory)'),'Registrar impresiones por categoría');
assert(ui.includes('homeMetrics.clicked(s.slug,metricCategory)'),'Registrar clics del carrusel');
assert(ui.includes("extra.teamRecommendations.length > 1"),'Mostrar banda con recomendaciones sin límite');
assert(ui.includes('allTeams.map(') && ui.includes('loading="lazy"'),'Banda con miniaturas diferidas');
assert(selector.includes('const limit=Math.max(0,Math.trunc(Number.isFinite(max)?max:8));'),'Limitar tamaño principal');
assert(selector.includes('teamRecommendations:pool.team'),'No ocultar equipos al limitar el hero');
assert(app.includes('reportHomeRead(sb,p);'),'Atribuir inicios de lectura desde el router');
assert(admin.includes("rpc('admin_carousel_metrics'") && admin.includes("['metricas','Métricas Inicio']"),
  'Mostrar panel únicamente dentro del Bibliotecario');
assert(ui.includes('homeMetrics.paint(performance.now() - startedAt)'),
  'Medir tiempo hasta pintar Inicio en el dispositivo');
assert.equal(homeMetricCategory({label:'Nuevo lanzamiento',kind:'release'}),'launch');
assert.equal(homeMetricCategory({kind:'team',label:'Recomendado por A'}),'team');
assert.equal(homeMetricCategory({},true),'prelaunch');
const logged=[];
const sb={rpc:(name,data)=>{logged.push({name,data});return Promise.resolve({data:true});}};
const map=new Map();
globalThis.sessionStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
globalThis.document={hidden:false};
globalThis.matchMedia=()=>({matches:true});
const metrics=createHomeMetrics(sb);
metrics.startVisit();metrics.shown('pub:s1','launch');metrics.shown('pub:s1','launch');
assert.equal(logged.length,1,'La exposición no puede duplicarse por un redibujado del carrusel');
metrics.clicked('obra-a','launch');
reportHomeRead(sb,'/leer/obra-b/1'); // nunca atribuir la lectura de otra obra
assert.equal(logged.length,2,'No atribuir lectura sin obra correspondiente');
reportHomeRead(sb,'/leer/obra-a/1');
reportHomeRead(sb,'/leer/obra-a/1');
assert.equal(logged.filter(x=>x.data.p_action==='read').length,1,'Una lectura atribuida una sola vez');
metrics.paint(2800);metrics.paint(8000);
assert.equal(logged.filter(x=>x.data.p_category==='mobile').length,1,'Velocidad por visita, no por diapositiva');
assert.equal(logged.at(-1).data.p_action,'moderate');
assert(logged.every(x=>Object.keys(x.data).sort().join(',')==='p_action,p_category'),
  'El backend no debe recibir slugs, usuarios, IP, urls ni datos individuales');
console.log('✓ Métricas sin PII, embudo, tiempos agregados, tablero restringido y banda de equipos.');

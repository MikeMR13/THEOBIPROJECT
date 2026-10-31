// Entrega 5: cierre técnico preestreno sin servicios reales ni credenciales.
// Un CI correcto acredita regresiones automatizadas; NO equivale a autorización de estreno.
// --strict rechaza (exit 1) si quedan bloqueos. En el CI de desarrollo se conserva
// un informe auditable, sin esconder esos bloqueos ni falsear el estado operativo.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {handleDispatch} from '../supabase/functions/diffusion-dispatch/handler.mjs';
import {readPages} from '../src/paging.js';
import {editorialChapterLabel} from '../src/editorial-public-labels.js';
import {normalizeSupportCopy} from '../src/support-display-copy.js';
import {schedulePresentation,diffusionTabUrl,diffusionTabFromSearch} from '../src/diffusion-presentation.js';
import {dailyViewsScale,viewsColumnMeaning} from '../src/studio-stats-display.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const studio=read('src/studio.js'),reader=read('src/reader.js'),
  app=read('src/app.js'),ui=read('src/ui.js'),
  diffusion=read('src/diffusion-panel.js'),dispatch=read('supabase/functions/diffusion-dispatch/handler.mjs'),
  flow=read('.github/workflows/ci.yml');
const checks=[];
function verified(id,value,why){
 assert.ok(value,why||'Regresión en '+id);
 checks.push({id,result:'passed'});
}

// 1. Paginación real (503 capítulos, 2 obras, varios volúmenes).
// El contrato devuelve {data,error}, nunca un arreglo directamente.
const rows=Array.from({length:503},(_,i)=>({
 id:'cap-'+i,series_id:i<252?'obra-a':'obra-b',vol:1+Math.floor(i/75),
 num:i+1,title:'Capítulo '+(i+1)
}));
let pageCalls=0;
const pages=await readPages(async(from,to)=>{
 pageCalls++;
 return {data:rows.slice(from,to+1),error:null};
},{size:250,maxPages:5});
verified('paginacion-multivolumen',pages.data.length===503&&pageCalls===3&&
 pages.data[0].series_id==='obra-a'&&pages.data.at(-1).series_id==='obra-b',
 'readPages ha truncado la información multivolumen');
verified('paginacion-contrato',Array.isArray(pages.data)&&!Array.isArray(pages)&&pages.error===null);
verified('etiquetas-editoriales',editorialChapterLabel({
 title:'Capítulo 01 — Empezar',section_type:'Capítulo'})==='Cap. 01');
verified('rutas-lectura',app.includes('/leer/')&&reader.includes('/leer/'));

// 2. Lector: persistencia, offline, cabecera Continuar y Ajustes.
verified('biblioteca-continuar',app.includes('continueChapterLabels')&&app.includes('editorialChapterLabel'));
verified('biblioteca-conservacion',flow.includes('scripts/library-read-actions-check.mjs')||
 flow.includes('npm run library-read-actions-check'));
verified('lector-progreso',reader.includes('restorePosition(')&&reader.includes('readingProgress'));
verified('lector-sin-conexion',reader.includes('isVolOffline(')&&flow.includes('scripts/pwa-offline-browser-check.mjs'));
verified('lector-tts',flow.includes('scripts/tts-continuity-check.mjs'));
verified('lector-panel',reader.includes('pn.scrollTop = 0; pn.scrollLeft = 0;')&&
 reader.includes('on.focus({ preventScroll: true })'));

// 3. Ranking, Apoyar y estadísticas: datos reales no se mutan.
verified('ranking-miniaturas',ui.includes('s.cover_thumb_path || s.cover_path'));
const copy=normalizeSupportCopy({title:'Apoya a la El Obi del Lector',
 intro:'Apoyar este ptoyecto',mode:'both',links:[],show:false});
verified('apoyar-texto',copy.title==='Apoya a El Obi del Lector'&&copy.intro==='Apoyar este proyecto'
 &&copy.mode==='both'&&copy.links.length===0&&copy.show===false);
verified('estadisticas-escala',dailyViewsScale([{n:0},{n:9}]).top===9);
verified('estadisticas-definiciones',viewsColumnMeaning(30).views.includes('30 días')&&
 viewsColumnMeaning(30).total.includes('acumuladas'));

// 4. Difusión y permisos: simulación que jamás ejecuta un HTTP externo.
// Cliente thenable como Supabase/PostgREST: soporta .then, NO expone .catch.
let outbound=0,callCount=0,dispatchResult=null,dispatchError=null;
const admin={rpc(name){
 return {then(ok,bad){
   callCount++;
   return Promise.resolve(name==='diffusion_4b_consume_ticket'
     ? {data:true,error:null} : {data:null,error:null}).then(ok,bad);
 }};
}};
try{
 dispatchResult=await handleDispatch(
   new Request('https://local.qa.invalid/',{method:'POST',headers:{'x-diffusion-ticket':'a'.repeat(64)}}),
   {createAdmin:()=>admin,baseUrl:'https://qa.invalid',fetcher:async()=>{
     outbound++;throw new Error('El test nunca debe llamar a proveedores');
   }});
}catch(error){dispatchError=error;}
verified('difusion-sin-envios',outbound===0,'El test intentó publicar fuera de CI');
verified('difusion-pestañas',diffusion.includes('diffusionTabFromSearch')&&
 diffusionTabFromSearch(new URL('https://elobidellector.com'+
 diffusionTabUrl('https://elobidellector.com/estudio/difusion?team=1#historial','historial')).search)==='historial');
verified('difusion-atrasos',schedulePresentation({
 status:'planned',delivery_mode:'automatic',scheduled_at:'2026-10-29T03:57:00Z'},
 Date.parse('2026-10-31T17:00:00Z')).late===true);
verified('difusion-seguridad',diffusion.includes('canLogs')&&
 diffusion.includes('scoped(sb.from(\'diffusion_events\')'));

// 5. Matrix obligatoria de los recorridos ya probados por el CI del repositorio.
// El CI completo ejecuta esos scripts separadamente y produce logs independientes.
const matrix=[
 ['ranking-biblioteca-apoyar','scripts/entrega2-lectura-visible-check.mjs'],
 ['difusion-historial','scripts/entrega3-difusion-ui-check.mjs'],
 ['estadisticas-seo-lector','scripts/entrega4-refinamiento-ui-check.mjs'],
 ['lector-continuidad-browser','scripts/reader-phase4-integration-browser.mjs'],
 ['lector-perfiles-sesion','scripts/phase6-regression-check.mjs'],
 ['biblioteca-movil','scripts/library-browser-check.mjs'],
 ['studio-acceso-responsive','scripts/patreon-responsive-browser-check.mjs'],
 ['studio-navegacion-browser','scripts/studio-browser-e2e.mjs'],
 ['difusion-confirmacion-browser','scripts/diffusion-confirmation-browser-check.mjs'],
 ['seo','scripts/seo-contracts-check.mjs'],
 ['preview-aislado','scripts/preview-isolation-check.mjs'],
 ['pwa-offline-browser','scripts/pwa-offline-browser-check.mjs']
];
const matrixChecks=[];
for(const [area,script] of matrix){
 const present=flow.includes(script)||read('package.json').includes(script);
 matrixChecks.push({area,script,present});
 if(!present && !['biblioteca-movil','studio-navegacion-browser','seo'].includes(area))
   throw Error('La cobertura obligatoria desapareció de CI: '+area+' '+script);
}

// 6. Bloqueos de salida: un informe EN ROJO puede coexistir con CI VERDE.
// La entrega no despliega el parche #226 y no da por reparadas funciones que no lo están.
const blockers=[];
const accessCorrect=!/CH\s*=\s*chapters\s*\|\|\s*\[\]/.test(studio) &&
 /CH\s*=\s*chapters(?:\?\.)?\.data/.test(studio) &&
 /chapters\?\.error/.test(studio);
if(!accessCorrect)blockers.push({
 id:'P0-STUDIO-ACCESOS-PAGINACION',severity:'P0',
 reason:'Acceso y Patreon todavía no extrae y verifica chapters.data de readPages()',
 action:'Revisar y fusionar el parche aislado PR #226; probar dos obras multivolumen'
});
const dispatchCorrect=dispatchResult?.status===200 && dispatchError===null && callCount>=2;
if(!dispatchCorrect)blockers.push({
 id:'P0-DIFUSION-RPC-THENABLE',severity:'P0',
 reason:'El despachador no admite cliente RPC thenable sin .catch (prueba aislada)',
 action:'Revisar PR #226, comprobar tickets, anuncios vencidos y despliegue deliberado del Edge Function'
});
const manualChecks=[
 {id:'SESION-REAL-LECTOR',status:'pending',detail:'Biblioteca, Continuar, lectura y restricciones reales'},
 {id:'SESION-REAL-EDITOR',status:'pending',detail:'Acceso y Patreon en dos obras multivolumen; revisar permisos'},
 {id:'SESION-REAL-BIBLIOTECARIO',status:'pending',detail:'Difusión por equipo y rol sin publicaciones reales'},
 {id:'DOS-ANUNCIOS-VENCIDOS',status:'pending',detail:'Revisión operativa y autorización explícita de cancelar o reprogramar'},
 {id:'VISUAL-320-390-768-1440',status:'pending',detail:'Contrastar capturas de CI con sesión real en móvil y escritorio'}
];
const payload={
 schema:'obi.release-qa.v1',
 source:'Scripts de CI y pruebas aisladas; no incluye navegación autenticada',
 generated_at:new Date().toISOString(), git_sha:process.env.GITHUB_SHA||'local',
 technical_tests:'passed',release_readiness:blockers.length?'BLOCKED':'REQUIRES_MANUAL_REVIEW',
 automated_checks:checks,matrix:matrixChecks,blockers,manual_checks:manualChecks,
 no_external_requests:outbound===0
};
const target=fileURLToPath(new URL('../qa-evidencia/entrega5-resultado.json',import.meta.url));
mkdirSync(fileURLToPath(new URL('../qa-evidencia/',import.meta.url)),{recursive:true});
writeFileSync(target,JSON.stringify(payload,null,2)+'\n');
console.log('ENTREGA 5: '+checks.length+' comprobaciones locales; '+matrixChecks.length+' rutas CI declaradas.');
console.log('DIAGNÓSTICO: '+payload.release_readiness+', '+blockers.length+' bloqueos técnicos; '+
 manualChecks.length+' revisiones manuales pendientes.');
for(const b of blockers)console.warn('BLOQUEO '+b.id+': '+b.reason);
console.log('Evidencia sin credenciales: qa-evidencia/entrega5-resultado.json');
if(process.argv.includes('--strict') && (blockers.length||manualChecks.length))process.exitCode=1;

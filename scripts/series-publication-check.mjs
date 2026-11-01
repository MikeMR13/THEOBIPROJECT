import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seriesPublicationHTML, bindSeriesPublication } from '../src/studio-series-publication.js';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sql = read('supabase/migrations/20261024_series_publication_modes.sql');
const studio = read('src/studio.js');

for (const name of ['draft','prelaunch','published']) {
  assert.match(sql, new RegExp("'"+name+"'"), 'el estado '+name+' debe estar soportado');
}
assert.match(sql,/auth\.uid\(\) is null/,'no permitir sesiones anónimas');
assert.match(sql,/private\.team_can\(s\.team_id, 'publish'\)/,'permiso de publicación');
assert.match(sql,/private\.team_can\(s\.team_id, 'schedule'\)/,'permiso de programación');
assert.match(sql,/update public\.series set published = false/,'bloqueo previo de lectura');
assert.match(sql,/update public\.series set published = true/,'reactivar la novela');
assert.match(sql,/volume_id is null and status::text = 'scheduled'/,'cancelar capítulos huérfanos que pueden autopublicar');
assert.match(sql,/announce_prelaunch = true/,'mostrar el preestreno');
assert.match(sql,/perform public\.publish_volume\(v\.id\)/,'publicación con revisión y notificaciones vigentes');
assert.match(sql,/revoke execute on function public\.series_publication_transition/,'privilegios explícitos');
assert.match(sql,/grant execute on function public\.series_publication_transition[\s\S]*to authenticated/,'solo autenticados');
assert.doesNotMatch(sql,/\bdelete\s+from\s+public\.(?:chapters|volumes|series)\b/i,'no borrar contenido');
assert.match(studio,/seriesPublicationHTML\(s, V, can, esc, toLocal, tzHint\)/);
assert.match(studio,/bindSeriesPublication\(\{ app, sb, series: s, can, fromLocal, fmtTz, busy, toast, refresh: again \}\)/);

const enc=x=>String(x);
const series={id:'s',title:'Novela de prueba',published:true};
const volume=[{id:'v1',num:1,title:'Volumen 1',status:'published'},{id:'v2',num:2,title:'Segundo volumen',status:'draft'}];
const html=seriesPublicationHTML(series,volume,()=>true,enc,x=>x,()=> 'Hora del equipo');
assert.match(html,/Estado actual: <b>Publicada<\/b>/);
assert.match(html,/Reprogramar con preestreno/);
assert.match(html,/Regresar a borrador/);
assert.match(html,/Volumen 2 · Segundo volumen/);
const fractional = seriesPublicationHTML(series,[
  {id:'v45',num:4.5,title:'4.5',status:'published'},
  {id:'v45b',num:5.5,title:'Volumen 5.5',status:'draft'},
  {id:'v6',num:6,title:'Volumen 6',status:'draft'}
],()=>true,enc,x=>x,()=>'');
assert.match(fractional,/Volumen 4\.5<\/option>/,'Volumen 4.5 aparece en el selector de publicación');
assert.match(fractional,/Volumen 5\.5<\/option>/,'Los títulos genéricos decimales no se duplican');
assert.match(fractional,/Volumen 6<\/option>/,'Los títulos genéricos enteros no se duplican');
assert.doesNotMatch(fractional,/Volumen 4\.5 · 4\.5|Volumen 5\.5 · Volumen 5\.5/);

const privateHtml=seriesPublicationHTML({...series,published:false},volume,()=>false,enc,x=>x,()=> '');
assert.doesNotMatch(privateHtml,/id="wk-sp-save"/,'sin permiso no ofrecer guardado');
assert.match(privateHtml,/permiso «Publicar»/);
const future = new Date(Date.now()+86400000).toISOString();
const scheduled=[{...volume[0],status:'scheduled',announce_prelaunch:true,published_at:future}];
assert.match(seriesPublicationHTML({...series,published:false},scheduled,()=>true,enc,x=>x.slice(0,16),()=>''),/Reprogramada · Preestreno/);

const fields=Object.fromEntries(['#wk-sp-mode','#wk-sp-volume','#wk-sp-at','#wk-sp-save','#wk-sp-note','#wk-sp-volwrap','#wk-sp-prewrap'].map(k=>[k,{value:'',hidden:false,disabled:false,textContent:''}]));
fields['#wk-sp-mode'].value='published';
fields['#wk-sp-volume'].value='v1';
const root={querySelector:k=>fields[k]};
const calls=[];
let confirmed=true;
// El diálogo de El Obi se verifica con una respuesta simulada en esta prueba sin DOM.
const bind=can=>bindSeriesPublication({
  app:{querySelector:k=>k==='#wk-series-publication'?root:null},
  sb:{rpc:async(name,args)=>{calls.push({name,args});return {error:null};}},
  series,can,fromLocal:x=>new Date(x).toISOString(),
  fmtTz:x=>x,busy:async(_,fn)=>fn(),toast:()=>{},refresh:()=>{},confirmDialog:async()=>confirmed
});
bind(()=>false);
assert.equal(fields['#wk-sp-save'].onclick,undefined);
bind(()=>true);
assert.equal(fields['#wk-sp-save'].disabled,true,'No permitir guardar el mismo estado de publicación');
await fields['#wk-sp-save'].onclick({currentTarget:{}});
assert.equal(calls.length,0,'Un clic sin cambios nunca debe escribir en Supabase');
fields['#wk-sp-mode'].value='draft';
fields['#wk-sp-mode'].onchange();
assert.equal(fields['#wk-sp-save'].disabled,false);
await fields['#wk-sp-save'].onclick({currentTarget:{}});
assert.deepEqual(calls[0],{name:'series_publication_transition',args:{p_series:'s',p_mode:'draft',p_volume:null,p_at:null}});
fields['#wk-sp-mode'].value='prelaunch';
fields['#wk-sp-mode'].onchange();
assert.equal(fields['#wk-sp-prewrap'].hidden,false);
fields['#wk-sp-at'].value=future.slice(0,16);
fields['#wk-sp-at'].oninput();
await fields['#wk-sp-save'].onclick({currentTarget:{}});
assert.equal(calls[1].args.p_mode,'prelaunch');
assert.equal(calls[1].args.p_volume,'v1');
assert(Date.parse(calls[1].args.p_at)>Date.now());
confirmed=false;
fields['#wk-sp-mode'].value='published';
fields['#wk-sp-mode'].onchange();
await fields['#wk-sp-save'].onclick({currentTarget:{}});
assert.equal(calls.length,2,'confirmación cancelada: no escribir');
console.log('✓ Estados de novela: controles, permisos y SQL (pruebas aisladas)');

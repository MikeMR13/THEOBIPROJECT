// Comprobación real y de SOLO LECTURA de la integración publicada.
 // No requiere cookies, accesos privados, llaves secretas, SQL mutante ni servicios nuevos.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const ORIGIN = process.env.OBI_SMOKE_ORIGIN || 'https://theobiproject.vercel.app';
const u = new URL(ORIGIN);
assert.equal(u.protocol, 'https:', 'Solo HTTPS');
assert.equal(u.hostname, 'theobiproject.vercel.app',
  'Usar exclusivamente alias Vercel del proyecto; el dominio público tiene bloqueo regional/bot');

const measurements=[];
async function request(url,{method='GET',expected=[200],label='HTTP'}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12_000);
  const started=performance.now();
  try{
    const r=await fetch(url,{method,redirect:'error',cache:'no-store',signal:controller.signal});
    const duration=Math.round(performance.now()-started);
    measurements.push({label,status:r.status,ms:duration});
    assert.ok(expected.includes(r.status),label+' inesperado: HTTP '+r.status);
    return r;
  }finally{clearTimeout(timer);}
}
const html=await (await request(ORIGIN+'/',{label:'Vercel HTML de Inicio'})).text();
assert.match(html,/\bapp\.js\b/, 'Inicio debe iniciar módulo de la aplicación');
const configSource=await (await request(ORIGIN+'/config.js',{label:'Configuración pública Vercel'})).text();

// El build de Vercel publica únicamente una clave anon/publishable en config.js.
// Nunca imprimir ni persistir el valor; la regex contempla JSON y JS minificado.
const supabaseUrl=configSource.match(/url:"([^"]+)"/)?.[1];
const publishable=configSource.match(/key:"([^"]+)"/)?.[1];
assert.equal(new URL(supabaseUrl||'https://invalid.example').hostname,'qfllthjpjuaztppvpsrk.supabase.co',
 'La configuración pública de producción debe apuntar al proyecto Supabase esperado');
assert.ok(publishable && publishable.length>20 && !/^sb_secret_|service_role/i.test(publishable),
 'No se encontró clave pública válida o se ha publicado una llave prohibida');

const rpc=(name,params={})=>{
  const url=new URL(supabaseUrl+'/rest/v1/rpc/'+name);
  url.searchParams.set('apikey',publishable);
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
  return url.toString();
};
const feed=await (await request(rpc('home_feed'),{label:'RPC pública home_feed'})).json();
assert.ok(Array.isArray(feed?.series) && feed.series.length>0,'home_feed sin catálogo');
for(const item of feed.series){
  assert.ok(/^[0-9a-f-]{36}$/i.test(item.id),'ID inválido en catálogo público');
}
assert.ok(Array.isArray(feed?.latest),'El feed carece de publicaciones recientes');
const first=feed.series[0], zero='00000000-0000-0000-0000-000000000000';
const ds=await (await request(rpc('series_downloads',{p_series:first.id}),{label:'RPC descargas público'})).json();
const ds2=await (await request(rpc('series_downloads_v2',{p_series:first.id}),{label:'RPC descargas v2 público'})).json();
assert.ok(Array.isArray(ds) && Array.isArray(ds2),'Metadatos de descargas requieren estructura de lista');
assert.equal(ds.length,ds2.length,'Las dos versiones de listado deben coincidir en cantidad para la obra');
const absent=await (await request(rpc('series_downloads',{p_series:zero}),{label:'Descargas inexistentes'})).json();
assert.deepEqual(absent,[],'Una obra inexistente no debe devolver enlaces');
if(first.team_id){
  const members=await (await request(rpc('team_public_members',{p_team:first.team_id}),{label:'Miembros públicos con controles de visibilidad'})).json();
  assert.ok(Array.isArray(members),'Miembros públicos deben devolverse como lista');
}
for(const [func,params] of [
  ['patreon_campaign_info',{p_owner:'__prueba_anon_sin_identidad__'}],
  ['series_feedback',{p_series:zero}]
]){
  const r=await request(rpc(func,params),{expected:[401,403],label:'Denegación anon '+func});
  const body=await r.json().catch(()=>({}));
  assert.equal(body.code,'42501','Revocación de EXECUTE debe aplicarse antes de ejecutar RPC');
}
let checkedCovers=0;
for(const s of feed.series){
  if(!s.cover_thumb_path)continue;
  const file=s.cover_thumb_path;
  assert.ok(!file.startsWith('/') && !/^https?:/.test(file),'Se esperaba ruta relativa de miniatura');
  const r=await request(supabaseUrl+'/storage/v1/object/public/obi-media/'+encodeURI(file),{
    method:'HEAD',label:'Miniatura pública '+(++checkedCovers)
  });
  assert.ok((r.headers.get('content-type')||'').startsWith('image/'),
    'La miniatura debe servirse como imagen');
  if(checkedCovers>=3)break;
}
console.log('OK: Vercel, Supabase anónimo, Inicio ('+feed.series.length+
  ' obras), descargas v1/v2, roles RPC, '+checkedCovers+' miniaturas.');
for(const x of measurements) console.log(x.label+': '+x.status+' en '+x.ms+' ms');
console.log('Sin tokens impresos, escrituras de datos, correos ni recursos de pago.');

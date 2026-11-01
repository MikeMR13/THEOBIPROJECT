// Fase 5 · análisis reproducible del build con backend ficticio.
// Mide bytes de archivos REALES compilados, nunca latencias de la red ni datos de usuarios.
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import vm from 'node:vm';

assert(existsSync('dist/index.html') && existsSync('dist/sw.js'),
  'Ejecuta npm run build antes del presupuesto de Fase 5');
const html=readFileSync('dist/index.html','utf8');
const direct=[...new Set([...html.matchAll(/\b(?:src|href)="\/([\w.-]+\.(?:js|css))\?v=[^"]+"/g)].map(m=>m[1]))];
assert(direct.includes('app.js')&&direct.includes('ui.js')&&direct.includes('styles.css'),
  'No se reconocen los recursos iniciales de Inicio/Catálogo');
const included=new Set(), queue=[...direct];
const staticImports=source=>{
  const out=[];
  const pattern=/\b(?:import|export)\s*(?:[^;\n]*?\bfrom\s*)?['"]([/.][\w./-]+\.js)(?:\?v=[^'"]*)?['"]/g;
  for(const m of source.matchAll(pattern))out.push(m[1].split('/').at(-1));
  return out;
};
while(queue.length){
  const name=queue.shift();
  if(included.has(name))continue;
  assert(/^[\w.-]+\.(?:js|css)$/.test(name),'Archivo inesperado: '+name);
  const path='dist/'+name;
  assert(existsSync(path),'Falta dependencia inicial: '+name);
  included.add(name);
  if(name.endsWith('.js')){
    for(const dependency of staticImports(readFileSync(path,'utf8')))
      if(!included.has(dependency))queue.push(dependency);
  }
}
// Ni la importación dinámica ni los módulos de lectura offline deben
// contarse como tráfico inicial de una visita a Inicio o Catálogo.
for(const optional of ['reader.js','blocks.js']){
  assert(!included.has(optional), optional+' volvió a la ruta crítica');
  assert(!direct.includes(optional), optional+' volvió a modulepreload');
}
const events=new Map(),context={self:{addEventListener:(name,fn)=>events.set(name,fn)},URL,Response,console};
vm.runInNewContext(readFileSync('dist/sw.js','utf8')+
  '\n;globalThis.__shell=SHELL;',context);
const precache=context.__shell;
for(const offline of ['reader.js','blocks.js'])
  assert(precache.some(url=>url.startsWith('/'+offline+'?v=')),
    'El presupuesto no debe eliminar el lector PWA: '+offline);
const size=name=>{
 const buf=readFileSync('dist/'+name);
 return {name,bytes:buf.length,gzip:gzipSync(buf,{level:9}).length,
   brotli:brotliCompressSync(buf,{params:{[constants.BROTLI_PARAM_QUALITY]:7}}).length};
};
const assets=[...included].sort().map(size);
const totals=assets.reduce((a,x)=>{
 for(const key of ['bytes','gzip','brotli'])a[key]+=x[key];
 return a;
},{bytes:0,gzip:0,brotli:0});
const maxGzip=260*1024; // Límite de regresión, NO promesa de velocidad real.
assert(totals.gzip<=maxGzip,
  'Presupuesto inicial excedido: '+totals.gzip+' > '+maxGzip+' bytes gzip');
const report={
 version:1, scope:'grafo estático y recursos HTML de build aislado (Inicio/Catálogo)',
 environment:'GitHub Actions Node 24 + credenciales ficticias, sin backend',
 direct:direct.sort(),modules:[...included].sort(),
 resources:assets.sort((a,b)=>b.gzip-a.gzip),totals,
 thresholds:{initialGzipBytes:maxGzip},
 offline:{reader:true,blocks:true,pwaShellEntries:precache.length},
 coreWebVitals:{lcpMs:null,inpMs:null,cls:null,reason:'No medibles a partir de bytes compilados'},
 notes:['Compresión gzip/Brotli recalculada localmente; no son bytes transferidos por HTTP.',
 'El grafo representa carga de importaciones estáticas; no incluye fuentes, portadas o RPC.',
 'No comparar porcentajes con una medición de metodología diferente.']
};
mkdirSync('qa-performance',{recursive:true});
writeFileSync('qa-performance/fase5-recursos.json',JSON.stringify(report,null,2)+'\n');
const kib=n=>(n/1024).toFixed(1)+' KiB';
const summary='### Fase 5 · presupuesto del arranque (laboratorio)\n\n'+
 '| Métrica de archivos compilados | Resultado |\n|---|---:|\n'+
 '| Entradas HTML | '+direct.length+' |\n'+
 '| Dependencias estáticas únicas | '+assets.length+' |\n'+
 '| Tamaño crudo | '+kib(totals.bytes)+' |\n'+
 '| gzip local | '+kib(totals.gzip)+' |\n'+
 '| Brotli local | '+kib(totals.brotli)+' |\n'+
 '| Presupuesto gzip | '+kib(maxGzip)+' |\n'+
 '| Lector / blocks en grafo inicial | No |\n'+
 '| Lector / blocks en precaché PWA | Sí |\n\n'+
 '**No son LCP, INP, CLS, ni transferencia de red.**\n';
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');

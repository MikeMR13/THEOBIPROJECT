// Métricas deliberadamente limitadas: únicamente contadores diarios en el servidor.
// Sin cookies, IP, cuenta, serie ni identificador de dispositivo en las llamadas RPC.
const KEY='obi-home-source';
const TYPES=new Set(['launch','release','popular','historic','editorial','discover','trending','team','prelaunch','other']);
const LOCAL_MAX_PER_MINUTE=24; // Guarda adicional por pestaña; el límite real vive en SQL.
let localWindow=0, localEmitted=0;
const emit=(sb,category,action)=>{
  if(!TYPES.has(category) && !['mobile','desktop'].includes(category))return;
  const now=Date.now();
  if(now-localWindow>=60000 || now<localWindow){ localWindow=now; localEmitted=0; }
  if(localEmitted>=LOCAL_MAX_PER_MINUTE)return;
  localEmitted++;
  // No se transmite identificador de lector, obra, pestaña ni dispositivo.
  try {
    Promise.resolve(sb.rpc('carousel_metric_record',{p_category:category,p_action:action})).catch(()=>{});
  } catch {} // Las métricas nunca deben bloquear la lectura por errores de red.
};
export const homeMetricCategory=(reason,preview=false)=>
  preview?'prelaunch':reason?.label==='Nuevo lanzamiento'?'launch':TYPES.has(reason?.kind)?reason.kind:'other';

export function createHomeMetrics(sb){
  let shown=new Set(),loadReported=false;
  return {
    startVisit(){ shown=new Set(); loadReported=false; },
    shown(bookKey,category){
      if(!bookKey || shown.has(bookKey) || document.hidden)return;
      shown.add(bookKey);emit(sb,category,'show');
    },
    clicked(slug,category){
      emit(sb,category,'click');
      if(!slug || category==='prelaunch')return;
      try{sessionStorage.setItem(KEY,JSON.stringify({slug,category,at:Date.now()}));}catch{}
    },
    paint(elapsed){
      if(loadReported || document.hidden || !Number.isFinite(elapsed) || elapsed<0)return;
      loadReported=true;
      emit(sb,matchMedia('(max-width: 600px)').matches?'mobile':'desktop',
        elapsed<=1500?'fast':elapsed<=3000?'moderate':'slow');
    }
  };
}
// Atribución estrictamente temporal y local a esta pestaña (máximo 10 minutos).
// El slug no sale del navegador: solo se transmite la categoría global.
export function reportHomeRead(sb,path){
  const slug=/^\/leer\/([\w-]+)\/\d+$/.exec(path)?.[1];
  if(!slug)return;
  let origin;
  try{
    origin=JSON.parse(sessionStorage.getItem(KEY)||'null');
    if(origin && (origin.slug===slug || Date.now()-origin.at>10*60_000))
      sessionStorage.removeItem(KEY);
  }catch{return;}
  if(!origin || origin.slug!==slug || Date.now()-origin.at>10*60_000 || !TYPES.has(origin.category))return;
  emit(sb,origin.category,'read');
}

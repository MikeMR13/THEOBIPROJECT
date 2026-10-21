// Curaduría diaria del carrusel: variedad, cupos por origen y excepciones editoriales.
export const HERO_CATEGORIES = Object.freeze(['release','popular','historic','editorial','discover','trending','team']);
const MAX_CANDIDATES = 3;
const MS_DAY = 86400000;
const isValidDate = v => Number.isFinite(Date.parse(v || ''));
export const homeDayKey = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Monterrey', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date(now));
const hash = s => { let x = 2166136261; for (const c of String(s)) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0; };
const rotate = (rows, day, category) => rows.length ? [...rows.slice(hash(day + ':' + category) % rows.length), ...rows.slice(0, hash(day + ':' + category) % rows.length)] : [];
const sortScore = rows => [...rows].sort((a,b) => (+b.score || 0) - (+a.score || 0) || (+a.pos || 999) - (+b.pos || 999));
const firstUnique = (items, max = MAX_CANDIDATES) => {
  const seen = new Set(); return (items || []).filter(x => {
    if (!x?.id || seen.has(x.id)) return false;
    seen.add(x.id); return true;
  }).slice(0,max);
};

// El cambio de día es determinista para todos los visitantes, sin cron ni almacenamiento local.
// Cuando llega un volumen completo nuevo se prioriza INMEDIATAMENTE, sin esperar al siguiente día.
export function homeFeaturedSelection({series=[], news={entries:[],bySeries:{}}, weekly=[], historic=[], trends=[], editorial=[], teams=[], now=new Date(), max=8}={}) {
  const today = homeDayKey(now), byId = new Map(series.map(s => [s.id,s]));
  const existing = id => byId.get(id);
  const completeRelease = g => {
    const s=existing(g?.id), vol=g?.volume;
    return g?.kind==='volume' && (vol?.is_final===true || s?.translation_status==='completed') && isValidDate(g.at)
      && Date.parse(g.at) <= +new Date(now) && +new Date(now)-Date.parse(g.at)<7*MS_DAY;
  };
  const pool = {};
  const updates=(news.entries || []).filter(g=>existing(g.id)).sort((a,b)=>(+b.time || Date.parse(b.at)||0)-(+a.time || Date.parse(a.at)||0));
  pool.release=firstUnique(updates.map(g=>({id:g.id,kind:'release',label:g.kind==='volume'?'Nuevo volumen':'Nuevo capítulo',at:g.at,volume:g.volume||null})));
  const urgent=updates.filter(completeRelease).map(g=>({id:g.id,kind:'release',label:'¡Novela completa!',at:g.at,volume:g.volume,urgent:true}));
  // La novela completa recién publicada rompe la rotación diaria; no se pospone hasta medianoche.
  if(urgent.length) pool.release=firstUnique([...urgent,...pool.release]);
  pool.popular=firstUnique(sortScore(weekly).filter(r=>existing(r.series_id)).map(r=>({id:r.series_id,kind:'popular',label:'Top de la semana'})));
  pool.historic=firstUnique(sortScore(historic).filter(r=>existing(r.series_id)).map(r=>({id:r.series_id,kind:'historic',label:'Lo más visto'})));
  pool.editorial=firstUnique(editorial.filter(id=>existing(id)).map(id=>({id,kind:'editorial',label:'Selección de El Obi'})));
  pool.discover=firstUnique([...series].sort((a,b)=>(+a.views||0)-(+b.views||0)||String(a.id).localeCompare(String(b.id))).map(s=>({id:s.id,kind:'discover',label:'Joya por descubrir'})));
  const hot=sortScore(trends.filter(r=>r.list==='tendencia' && (r.period==='hoy'||r.period==='semana')));
  pool.trending=firstUnique(hot.filter(r=>existing(r.series_id)).map(r=>({id:r.series_id,kind:'trending',label:'En tendencia'})));
  const teamCandidates=teams.filter(t=>t.team_id && existing(t.series_id) && existing(t.series_id).team_id===t.team_id)
    .sort((a,b)=>String(a.team_id).localeCompare(String(b.team_id)));
  pool.team=teamCandidates.map(t=>({id:t.series_id,kind:'team',label:'Recomendado por '+(existing(t.series_id)?.teams?.name||'su equipo'),teamId:t.team_id}));
  const chosen=[],used=new Set(),limit=Math.max(0,Math.min(8,max));
  const add=x=>{if(!x||used.has(x.id)||chosen.length>=limit)return false;chosen.push(x);used.add(x.id);return true;};
  // Se reservan dos plazas a lanzamientos y una a cada sección restante.
  const releases=pool.release || [];
  if(urgent[0])add(urgent[0]);
  const rotatedNews=rotate(releases.filter(x=>!used.has(x.id)),today,'release');
  for(const x of rotatedNews){if(chosen.filter(y=>y.kind==='release').length>=2)break;add(x);}
  const categories=['popular','historic','editorial','discover','trending','team'];
  for(const category of categories) {
    const list=rotate(pool[category],today,category);
    for(const x of list) if(add(x))break;
  }
  // Si una categoría no tiene candidato distinto, no duplicamos novelas ni mostramos huecos.
  // Primera opción de relleno: últimas publicaciones todavía no seleccionadas.
  for(const x of [...releases,...categories.flatMap(k=>rotate(pool[k],today,k))])add(x);
  return {day:today,entries:chosen,bySeries:Object.fromEntries(chosen.map(x=>[x.id,x])),pool};
}

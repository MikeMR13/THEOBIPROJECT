// Curaduría diaria del carrusel: variedad, cupos por origen y excepciones editoriales.
export const HERO_CATEGORIES = Object.freeze(['release','popular','historic','editorial','discover','trending','team']);
const MAX_CANDIDATES = 3; // Solo categorías editoriales; equipos sin límite
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
  const recentLaunch=g=>g?.kind==='volume' && g.isNewSeries===true && isValidDate(g.at)
    && Date.parse(g.at)<=+new Date(now) && +new Date(now)-Date.parse(g.at)<7*MS_DAY;
  const asRelease=g=>({id:g.id,kind:'release',label:recentLaunch(g)?'Nuevo lanzamiento':g.kind==='volume'?'Nuevo volumen':'Nuevo capítulo',at:g.at,volume:g.volume||null});
  const launches=updates.filter(recentLaunch).map(asRelease);
  const urgent=updates.filter(completeRelease).map(g=>({id:g.id,kind:'release',label:'¡Novela completa!',at:g.at,volume:g.volume,urgent:true}));
  // Cualquier volumen público de las últimas 48 h (no solo el volumen 1)
  // encabeza Inicio por fecha de estreno. Entre varios, gana el más reciente.
  // Una novela completa conserva preferencia si no hay dos estrenos recientes.
  // La etiqueta «Nuevo lanzamiento» de un debut permanece siete días.
  const freshDebuts=launches.filter(g=>+new Date(now)-Date.parse(g.at)<2*MS_DAY);
  const freshVolumes=updates.filter(g=>g?.kind==='volume' && isValidDate(g.at)
    && Date.parse(g.at)<=+new Date(now) && +new Date(now)-Date.parse(g.at)<2*MS_DAY)
    .map(g=>urgent.find(x=>x.id===g.id)||asRelease(g));
  const priorityReleases=firstUnique([...freshVolumes,...freshDebuts,...urgent.slice(0,1)],2);
  pool.release=firstUnique([...priorityReleases,...launches,...updates.map(asRelease)]);
  pool.popular=firstUnique(sortScore(weekly).filter(r=>existing(r.series_id)).map(r=>({id:r.series_id,kind:'popular',label:'Top de la semana'})));
  pool.historic=firstUnique(sortScore(historic).filter(r=>existing(r.series_id)).map(r=>({id:r.series_id,kind:'historic',label:'Lo más visto'})));
  pool.editorial=firstUnique(editorial.filter(id=>existing(id)).map(id=>({id,kind:'editorial',label:'Selección de El Obi'})));
  // Una joya no es una obra de estreno con cero visitas: debe tener recorrido,
  // contenido suficiente y actividad real reciente. Evitar candidatos sin fecha
  // verificable (el home_feed todavía no expone created_at de todas las obras).
  const discoverable=series.filter(s=>{
    const count=Number(s.chapters?.[0]?.count || 0);
    const recentAt=news.bySeries?.[s.id]?.at;
    const firstAt=s.firstPublishedAt || s.created_at || recentAt;
    const age=Date.parse(firstAt || ''), activity=Date.parse(recentAt || '');
    const current=+new Date(now);
    return count>=3 && Number.isFinite(age) && age<=current-7*MS_DAY
      && Number.isFinite(activity) && activity<=current && activity>=current-30*MS_DAY;
  });
  pool.discover=firstUnique(discoverable.sort((a,b)=>(+a.views||0)-(+b.views||0)||String(a.id).localeCompare(String(b.id))).map(s=>({id:s.id,kind:'discover',label:'Joya por descubrir'})));
  const hot=sortScore(trends.filter(r=>r.list==='tendencia' && (r.period==='hoy'||r.period==='semana')));
  pool.trending=firstUnique(hot.filter(r=>existing(r.series_id)).map(r=>({id:r.series_id,kind:'trending',label:'En tendencia'})));
  // Cada equipo conserva una sola recomendación durante 7 días exactos.
  // El grupo de equipos NO tiene límite de 3 candidatos ni de 1 diapositiva diaria.
  // Se valida la expiración aquí y también en RLS/cron para las sesiones abiertas.
  const nowMs=+new Date(now);
  const seenTeams=new Set(), seenTeamBooks=new Set();
  const teamCandidates=teams.filter(t=>{
    const time=Date.parse(t?.updated_at||'');
    const book=existing(t?.series_id);
    if(!t?.team_id||!book||book.team_id!==t.team_id||!Number.isFinite(time)||time>nowMs||nowMs-time>=7*MS_DAY
      ||seenTeams.has(t.team_id)||seenTeamBooks.has(t.series_id))return false;
    seenTeams.add(t.team_id); seenTeamBooks.add(t.series_id); return true;
  }).sort((a,b)=>String(a.team_id).localeCompare(String(b.team_id)));
  pool.team=rotate(teamCandidates.map(t=>({id:t.series_id,kind:'team',
    label:'Recomendado por '+(existing(t.series_id)?.teams?.name||'su equipo'),
    teamId:t.team_id,expiresAt:new Date(Date.parse(t.updated_at)+7*MS_DAY).toISOString()})),today,'team');
  // El carrusel principal permanece compacto; TODAS las recomendaciones se
  // ofrecen en una banda de equipos debajo, sin esconder al equipo más pequeño.
  const chosen=[],used=new Set();
  const limit=Math.max(0,Math.trunc(Number.isFinite(max)?max:8));
  const add=x=>{if(!x||used.has(x.id)||chosen.length>=limit)return false;chosen.push(x);used.add(x.id);return true;};
  const releases=pool.release || [];
  // Reservar las primeras posiciones para los estrenos reales más recientes.
  // No ceder su etiqueta a la categoría «Joya por descubrir» por tener pocas vistas.
  for(const release of priorityReleases)add(release);
  const reservedTeams=new Set(pool.team.map(x=>x.id));
  const rotatedNews=rotate(releases.filter(x=>!used.has(x.id)),today,'release');
  for(const x of rotatedNews){
    if(chosen.filter(y=>y.kind==='release').length>=2)break;
    if(!reservedTeams.has(x.id))add(x);
  }
  // Un equipo distinto protagoniza un lugar temprano cada día, pero TODOS
  // conservan su espacio durante sus siete días de recomendación activa.
  const firstTeam=pool.team.find(x=>!used.has(x.id));
  if(firstTeam)add(firstTeam);
  // Si todas las novedades restantes coinciden con equipos recomendados, la
  // recomendación del equipo prevalece, excepto el lanzamiento completo urgente.
  for(const category of ['popular','historic','editorial','discover','trending']){
    for(const x of rotate(pool[category],today,category)){
      if(!reservedTeams.has(x.id)&&add(x))break;
    }
  }
  // Solo un equipo en el hero, rotando cada día. El resto permanece visible
  // en la banda independiente; no extender indefinidamente el hero.
  for(const x of [...releases,...['popular','historic','editorial','discover','trending']
    .flatMap(k=>rotate(pool[k],today,k))]){
    if(x.kind==='release'&&chosen.filter(y=>y.kind==='release').length>=2)continue;
    if(reservedTeams.has(x.id))continue;
    add(x);
  }
  return {day:today,entries:chosen,teamRecommendations:pool.team,
    bySeries:Object.fromEntries(chosen.map(x=>[x.id,x])),pool};
}

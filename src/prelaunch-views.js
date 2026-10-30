// Conteo agregado de aperturas del primer vistazo: no envía usuarios, IP,
// sesiones, cookies, referencias ni URL de procedencia. Solo slug autorizado.
// Se contabiliza una vez por pestaña/día, sin identidad persistente.
const attempted = new Set();
const validSlug = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(s);

export async function recordPrelaunchView(sb, pre, options = {}) {
  const slug = pre?.series?.slug;
  if (!validSlug(slug) || !pre?.volumes?.length || !sb?.rpc) return false;
  const doc = options.document ?? globalThis.document;
  if (doc?.hidden || doc?.visibilityState === 'hidden') return false;
  const today = new Date(options.now ?? Date.now()).toISOString().slice(0, 10);
  const key = 'obi-prelaunch-open:' + today + ':' + slug;
  if (attempted.has(key)) return false;
  let storage = options.storage;
  if (storage === undefined) try { storage = globalThis.sessionStorage; } catch {}
  try {
    if (storage?.getItem(key) === '1') return false;
  } catch {} // Los navegadores pueden bloquear el almacenamiento.
  attempted.add(key);
  try {
    const {data,error} = await sb.rpc('prelaunch_view_record', {p_slug:slug});
    if (error || data !== true) return false;
    try { storage?.setItem(key,'1'); } catch {}
    return true;
  } catch {
    return false; // La telemetría nunca bloquea la ficha ni muestra alertas.
  }
}

export async function loadTeamPrelaunchViews(sb, teamId, announcedIds) {
  const allowed = announcedIds instanceof Set ? announcedIds : new Set(announcedIds || []);
  if (!allowed.size) return {available:true,counts:new Map()};
  if (!sb?.rpc || !teamId) return {available:false,counts:new Map()};
  try {
    const {data,error}=await sb.rpc('prelaunch_team_view_metrics',{p_team:teamId});
    if (error || !Array.isArray(data)) throw new Error('Prelaunch view metrics unavailable');
    const counts=new Map();
    for (const row of data) {
      if (!row || !allowed.has(row.series_id)) continue;
      const views=Number(row.view_opens_30d);
      if (!Number.isSafeInteger(views) || views<0 || views>45000)
        throw new Error('Invalid prelaunch view count');
      counts.set(row.series_id,views);
    }
    if (counts.size !== allowed.size) throw new Error('Prelaunch view scope changed');
    return {available:true,counts};
  } catch(e) {
    console.warn('Studio prelaunch views unavailable',e?.message||e);
    return {available:false,counts:new Map()};
  }
}

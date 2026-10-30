// Métricas de preestrenos en Estudio.
// Solo totales agregados, autorizados por RPC para un miembro de equipo.
// No se usan tablas privadas ni hay telemetría adicional en el cliente.
export async function loadTeamPrelaunchMetrics(sb, teamId, announcedIds) {
  const allowed = announcedIds instanceof Set ? announcedIds : new Set(announcedIds || []);
  if (!allowed.size) return {available: true, counts: new Map()};
  if (!sb?.rpc || !teamId) return {available: false, counts: new Map()};
  try {
    const {data,error} = await Promise.resolve().then(() =>
      sb.rpc('prelaunch_team_metrics', {p_team: teamId}));
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Unexpected prelaunch metrics response');
    const counts = new Map();
    for (const row of data) {
      if (!row || !allowed.has(row.series_id)) continue;
      const followers=Number(row.followers),reminders=Number(row.pending_reminders);
      if (!Number.isSafeInteger(followers)||followers<0||
          !Number.isSafeInteger(reminders)||reminders<0)
        throw new Error('Invalid prelaunch metrics counts');
      counts.set(row.series_id,{followers,reminders});
    }
    // Si se anuncia una obra y no aparece en la respuesta, fallar cerrado:
    // no inventar ceros cuando cambió la autorización o el estado público.
    if (counts.size !== allowed.size) throw new Error('Prelaunch metrics scope changed');
    return {available:true,counts};
  } catch(e) {
    console.warn('Studio prelaunch metrics unavailable', e?.message || e);
    return {available:false,counts:new Map()};
  }
}

export function summarizePrelaunchMetrics(ids, result) {
  if (!result?.available) return null;
  const list=Array.from(ids || []);
  if (!list.length) return {series:0,followers:0,reminders:0};
  let followers=0, reminders=0;
  for (const id of list) {
    const row=result.counts?.get(id);
    if (!row) return null;
    followers+=row.followers; reminders+=row.reminders;
  }
  return {series:list.length,followers,reminders};
}

// Selección y ejecución explícita por canal para Difusión (sin requests automáticos).
// Todas las acciones de publicación real se mantienen en las Edge Functions ya existentes.
export function manualTargets(connections, chosen, max=8) {
  if (!Array.isArray(chosen) || chosen.length<1 || chosen.length>max
      || new Set(chosen).size!==chosen.length)
    throw new Error('Selecciona entre 1 y 8 canales distintos.');
  const available = new Map((connections||[]).filter(c=>
    c && c.status==='active' && ['discord','telegram'].includes(c.provider)
  ).map(c=>[c.id,c]));
  return chosen.map(id=>{
    const c=available.get(id);
    if(!c)throw new Error('Uno de los canales seleccionados no está activo o no pertenece a este equipo.');
    return {id:c.id,label:c.label,provider:c.provider};
  });
}

// No volver a intentar automáticamente un destino: un timeout puede significar entrega.
export async function manualChannelBatch(targets, attempt) {
  const results=[];
  for (const channel of targets) {
    try {
      const outcome=await attempt(channel);
      if(!outcome || !['sent','scheduled','already','blocked','uncertain'].includes(outcome.status))
        throw new Error('unexpected_delivery_status');
      results.push({channel,...outcome});
    } catch {
      results.push({channel,status:'uncertain'});
    }
  }
  return results;
}

export function batchFeedback(results,action='sent') {
  const statuses={sent:'Enviado',scheduled:'Agendado',already:'Ya existía',
    blocked:'No realizado',uncertain:'Sin confirmación: revisar antes de repetir'};
  const prefix=action==='scheduled'?'Agenda multicanal':'Envío multicanal';
  return prefix+': '+results.map(r=>
    (r.channel.provider==='discord'?'Discord':'Telegram')+' · '+r.channel.label+
    ' — '+statuses[r.status]
  ).join(' | ')+'. Los destinos sin confirmación NO se reintentan automáticamente.';
}

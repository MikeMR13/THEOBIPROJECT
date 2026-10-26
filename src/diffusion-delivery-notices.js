// Mensajes de entrega: un intento programado no equivale a un envío confirmado.
export function immediateDeliveryNotice(results) {
 if(!Array.isArray(results)||!results.length)return '';
 const sent=results.filter(r=>r.status==='sent').length;
 if(!sent)return 'Ningún aviso tiene entrega confirmada. Revisa los canales antes de repetir.';
 if(sent===results.length)return 'Aviso enviado correctamente a '+sent+' canal'+(sent===1?'':'es')+'.';
 return 'Aviso enviado a '+sent+' de '+results.length+' canales. Comprueba los destinos no confirmados antes de repetir.';
}
export function automaticDeliveryNotice(previous,current,connections=[]) {
 if(!Array.isArray(previous)||!Array.isArray(current))return '';
 const before=new Map(previous.map(x=>[x.id,x]));
 const newSent=current.filter(x=>x.delivery_mode==='automatic'&&x.status==='sent'&&
  before.has(x.id)&&before.get(x.id).status!=='sent');
 if(!newSent.length)return '';
 const names=newSent.map(x=>{
  const c=connections.find(c=>c.id===x.connection_id);
  return (x.provider==='discord'?'Discord':'Telegram')+(c?' · '+c.label:'');
 });
 return 'Aviso enviado automáticamente a '+newSent.length+' canal'+(newSent.length===1?'':'es')+': '+names.join(', ')+'.';
}

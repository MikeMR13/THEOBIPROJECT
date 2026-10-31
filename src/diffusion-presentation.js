// Presentación sin efectos secundarios: nunca consulta redes ni cambia estados en Supabase.
// Solo admite enlaces públicos verificables del sitio; no construye enlaces de mensajes privados.
export const DIFFUSION_TABS = Object.freeze([
  'resumen','conexiones','anuncios','reglas','campanas','calendario','historial'
]);

export function diffusionTabFromSearch(search = '') {
  const value = new URLSearchParams(String(search).replace(/^\?/, '')).get('tab') || '';
  return DIFFUSION_TABS.includes(value) ? value : '';
}

export function diffusionTabUrl(href, tab) {
  if (!DIFFUSION_TABS.includes(tab)) return '';
  const url = new URL(href, 'https://elobidellector.com');
  url.searchParams.set('tab', tab);
  return url.pathname + url.search + url.hash;
}

export function schedulePresentation(item, now = Date.now()) {
  const status = String(item?.status || '');
  const time = Date.parse(item?.scheduled_at || '');
  const late = status === 'planned' && Number.isFinite(time) && time <= now;
  const automatic = item?.delivery_mode === 'automatic';
  if (status === 'planned') {
    if (late && automatic) return { late:true, label:'Retrasado · automático sin confirmación',
      detail:'La fecha ya pasó y no hay entrega confirmada. Revisa o cancela el anuncio; no se enviará desde esta pantalla.' };
    if (late) return { late:true, label:'Retrasado · fecha cumplida',
      detail:'Fecha cumplida: pendiente de envío manual. Revisa el anuncio antes de enviarlo.' };
    return { late:false, label:automatic?'Automático: en espera':'Previsto, sin envío automático',detail:'' };
  }
  const labels = {
    sent:'Enviado y confirmado',processing:'Envío en curso',
    unknown:'Entrega incierta: revisar antes de reenviar',
    blocked:'Bloqueado: contenido o conexión no disponibles',
    cancelled:'Cancelado',canceled:'Cancelado',failed:'Fallido: revisar el error'
  };
  return { late:false, label:labels[status] || 'Estado pendiente de comprobar',detail:'' };
}

export function jobPresentation(status) {
  return ({
    sent:'Enviado y confirmado',queued:'En cola',planned:'Programado',
    processing:'En proceso',failed:'Fallido',blocked:'Bloqueado',
    unknown:'Entrega sin confirmar',cancelled:'Cancelado',canceled:'Cancelado'
  })[String(status||'')] || 'Estado sin clasificar';
}

export function diffusionContentUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    if (url.origin !== 'https://elobidellector.com' || url.username || url.password) return '';
    if (!['/','/catalogo'].includes(url.pathname) && !/^\/(serie|obra|leer|volumen)\//.test(url.pathname)) return '';
    return url.href;
  } catch { return ''; }
}

const sourceName = value => ({
  series:'Obra',volume:'Volumen',chapter:'Capítulo',
  announcement:'Anuncio editorial'
})[value] || 'Contenido editorial';

export function historyPresentation(job, event, connection) {
  const payload = event?.safe_payload && typeof event.safe_payload === 'object' && !Array.isArray(event.safe_payload)
    ? event.safe_payload : {};
  const provider = String(connection?.provider || '').toUpperCase() || 'Canal no disponible';
  const channel = [provider,connection?.label].filter(Boolean).join(' · ');
  return {
    channel,
    contentType:sourceName(event?.source_type || payload.kind),
    title:String(payload.title || '').trim() || 'Contenido sin título registrado',
    message:typeof payload.message==='string' ? payload.message.slice(0,700) : '',
    url:diffusionContentUrl(payload.url),
    status:jobPresentation(job?.status),
    result:job?.last_error ? 'Error: '+String(job.last_error).slice(0,300)
      : job?.status==='sent'?'Entrega confirmada por el proveedor':'Sin confirmación de entrega',
    attempts:Number.isFinite(Number(job?.attempts)) ? Math.max(0,Number(job.attempts)) : 0,
    reference:job?.status==='sent'&&job?.provider_post_id ? String(job.provider_post_id).slice(0,90) : ''
  };
}

// Enlace de vista previa: comparte solamente un borrador ya persistido.
// No se guarda ni se publica un diseño al pulsar «Compartir».
export async function previewShareLink({ origin, slug, token, savedDesign, currentDesign, queued = false, saving = false, generateToken }) {
  if (!savedDesign) throw new Error('No existe un borrador guardado para compartir. Guarda los cambios desde el editor de escritorio.');
  if (queued || saving || currentDesign !== savedDesign) throw new Error('Hay cambios pendientes de guardar. Espera a que termine el guardado y vuelve a copiar el enlace.');
  if (!/^[\w-]+$/.test(slug || '') || !/^https?:\/\//.test(origin || '')) throw new Error('No se pudo construir el enlace de vista previa.');
  const next = token || await generateToken();
  if (typeof next !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(next))
    throw new Error('No se pudo crear un enlace de vista previa válido.');
  return { token: next, link: origin.replace(/\/$/, '') + '/equipo/' + slug + '?vista=' + next };
}

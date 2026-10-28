// Reglas comprobables del importador: nunca perder ilustraciones ni reordenar capítulos existentes.
// El índice único de producción abarca (series_id,num), incluso capítulos en la papelera.
// Por ello reemplazamos los registros del propio volumen conservando ID y número.
export function planVolumeReplacement(existing, volumeId, volNum, count) {
  const original = (existing || []).filter(c => !c.deleted_at &&
    (c.volume_id === volumeId || (!c.volume_id && +c.vol === +volNum)))
    .sort((a,b) => +a.num - +b.num);
  if (count > original.length) throw new Error(
    'El volumen tiene ' + original.length + ' capítulos y el archivo trae ' + count +
    '. Para conservar los números y enlaces, importa las secciones adicionales con «Agregar», o ajusta el archivo antes de reemplazar.'
  );
  if (!original.length) throw new Error('El volumen no tiene capítulos activos que reemplazar. Elige «Agregar».');
  return { update: original.slice(0,count), remove: original.slice(count) };
}
export function validateImportMedia({ chapters, images, cover, allImages, maxBytes }) {
  const used = new Set((chapters || []).flatMap(c => (c.blocks || [])
    .filter(b => b.type === 'image' && typeof b.url === 'string' && b.url.startsWith('img:'))
    .map(b => b.url.slice(4))));
  if (cover?.startsWith('img:')) used.add(cover.slice(4));
  const selected = allImages ? new Set([...images.keys()]) : used;
  for (const key of selected) {
    const item = images.get(key);
    if (!item?.blob || !/^image\//.test(item.type || '')) {
      throw new Error('Falta la ilustración «' + key + '» del archivo. Revisa las secciones antes de importar.');
    }
    if (item.blob.size > maxBytes) {
      throw new Error('La imagen «' + (item.name || key) +
        '» supera el máximo de ' + Math.round(maxBytes/1048576) +
        ' MB. Redúcela antes de importar o selecciona «Solo las del texto y la portada» si no se utiliza.');
    }
  }
  return [...selected];
}

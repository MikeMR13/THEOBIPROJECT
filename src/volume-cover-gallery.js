// Selector de portada: únicamente multimedia ya subida y asociada al equipo y la obra.
const IMAGE = /\.(jpe?g|png|webp)$/i;
export function galleryCoverPaths({ teamId, slug, gallery = [], files = [] }) {
  const root = teamId + '/obras/' + slug + '/';
  const valid = p => typeof p === 'string' && p.startsWith(root) &&
    !p.includes('..') && !p.includes('\\') && IMAGE.test(p);
  return [...new Set([
    ...(Array.isArray(gallery) ? gallery.map(g=>g?.path) : []),
    ...files
  ].filter(valid))];
}
export async function loadVolumeCoverChoices({ sb, teamId, slug, volumeNum, gallery }) {
  const folder = teamId + '/obras/' + slug + '/';
  const files=[];
  for (const dir of ['galeria','vol-'+volumeNum]) {
    const {data,error}=await sb.storage.from('obi-media')
      .list(folder+dir,{limit:500,sortBy:{column:'name',order:'asc'}});
    if(error)throw new Error('No se pudo consultar Multimedia: '+error.message);
    for(const entry of data||[])if(entry.id)files.push(folder+dir+'/'+entry.name);
  }
  return galleryCoverPaths({teamId,slug,gallery,files});
}

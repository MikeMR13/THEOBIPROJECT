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

export function bindVolumeCoverGallery({sb,teamId,series,volume,box,busy,toast,confirmObi,media,esc,errMsg}){
  // La hoja de este selector solo se carga al editar un volumen.
  if(!document.querySelector('link[data-volume-cover-css]')){
    const sheet=document.createElement('link');
    sheet.rel='stylesheet';sheet.href='/volume-cover-gallery.css?v=1';
    sheet.dataset.volumeCoverCss='1';document.head.appendChild(sheet);
  }
  const s=series,v=volume;
  const setCover=async path=>{
    const {data:written,error}=await sb.from('volumes').update({cover_path:path}).eq('id',v.id).select('id');
    if(error||!written?.length)throw new Error(error?errMsg(error):'No se pudo actualizar la portada por permisos');
    v.cover_path=path;
    // Multimedia puede estar compartida con capítulos, galerías y otros volúmenes.
  };
  const showCover=path=>{
    const preview=box.querySelector('#vcp-'+v.id);
    preview.style.backgroundImage=path?'url("'+media(path)+'")':'';
    preview.textContent=path?'':'Sin portada';
    const status=box.querySelector('#vcs-'+v.id);
    if(status)status.textContent=path?'✓ Portada guardada':'Sin portada';
  };
  const btn=box.querySelector('[data-vgallery]'), panel=box.querySelector('#vgallery-'+v.id);
  btn.onclick=()=>busy(btn,async()=>{
    if(!panel.hidden){panel.hidden=true;btn.setAttribute('aria-expanded','false');return;}
    panel.hidden=false;btn.setAttribute('aria-expanded','true');
    panel.textContent='Buscando imágenes de esta obra…';
    try{
      const paths=await loadVolumeCoverChoices({sb,teamId,slug:s.slug,volumeNum:v.num,
        gallery:s.media?.gallery||[]});
      const cards=paths.map(path=>
        '<button type="button" data-vcoverpick="'+esc(path)+'" aria-label="Usar '+esc(path.split('/').pop())+
        ' como portada del volumen '+v.num+'" aria-pressed="'+(v.cover_path===path)+'">'+
        '<img src="'+esc(media(path))+'" alt="" loading="lazy" decoding="async"><span>'+
        esc(path.split('/').pop())+'</span></button>').join('');
      panel.innerHTML=paths.length
        ? '<p class="mono" style="margin:0 0 8px">Elige una imagen existente de Multimedia para usarla como portada del volumen.</p>'+
          '<div class="wk-vgallery-grid">'+cards+'</div>'
        : '<p class="mono">Aún no hay imágenes asociadas a esta obra. Súbelas desde Multimedia.</p>';
      panel.querySelectorAll('[data-vcoverpick]').forEach(b=>b.onclick=()=>busy(b,async()=>{
        const path=b.dataset.vcoverpick;
        if(!galleryCoverPaths({teamId,slug:s.slug,gallery:s.media?.gallery||[],files:paths}).includes(path))
          throw new Error('La imagen no pertenece a Multimedia de esta obra');
        await setCover(path);showCover(path);
        panel.querySelectorAll('[data-vcoverpick]').forEach(el=>
          el.setAttribute('aria-pressed',String(el.dataset.vcoverpick===path)));
        if(!s.cover_path&&await confirmObi('La obra aún no tiene portada. ¿Usar también esta imagen?')){
          const {error}=await sb.from('series').update({cover_path:path}).eq('id',s.id);
          if(error)throw new Error(errMsg(error));s.cover_path=path;
        }
        toast('Portada del Volumen '+v.num+' elegida de Multimedia');
      }));
    }catch(error){
      panel.textContent='No se pudo cargar la galería: '+(error.message||error);
      throw error;
    }
  });
  return {setCover,showCover};
}

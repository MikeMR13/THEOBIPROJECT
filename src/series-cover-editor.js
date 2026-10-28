// Portada principal de una obra: se edita sin modificar las portadas de sus volúmenes.
import { galleryCoverPaths } from './volume-cover-gallery.js?v=1';

export const SERIES_COVER_TYPES = Object.freeze({
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp'
});
const MAX_IMAGE = 8 * 1024 * 1024;
const ownPaths = (teamId,slug,gallery,files=[]) => galleryCoverPaths({teamId,slug,gallery,files});

export function validateSeriesCoverFile(file) {
  if (!file || !Object.hasOwn(SERIES_COVER_TYPES,file.type))
    throw new Error('La portada debe ser JPG, PNG o WebP');
  if (!file.size || file.size > MAX_IMAGE)
    throw new Error('La portada debe pesar como máximo 8 MB');
  return SERIES_COVER_TYPES[file.type];
}

// Solo se muestran objetos de Storage pertenecientes a esta obra y a este equipo.
// Incluye galería, portadas previas de la obra y carpetas de todos sus volúmenes.
export async function loadSeriesCoverChoices({sb,teamId,slug,gallery=[]}) {
  const root=teamId+'/obras/'+slug;
  const mediaStore=sb.storage.from('obi-media');
  const listAll=async folder=>{
    const out=[];
    for(let offset=0;offset<3000;offset+=200){
      const {data,error}=await mediaStore.list(folder,{
        limit:200,offset,sortBy:{column:'name',order:'asc'}
      });
      if(error)throw new Error('No se pudo consultar Multimedia: '+error.message);
      out.push(...(data||[]));
      if((data||[]).length<200)break;
    }
    return out;
  };
  const top=await listAll(root);
  const folders=top.filter(x=>!x.id&&/^(galeria|vol-\d+)$/.test(x.name)).map(x=>x.name);
  const files=top.filter(x=>x.id).map(x=>root+'/'+x.name);
  for(const dir of folders){
    const contents=await listAll(root+'/'+dir);
    files.push(...contents.filter(x=>x.id).map(x=>root+'/'+dir+'/'+x.name));
  }
  return ownPaths(teamId,slug,gallery,files);
}

export async function saveSeriesCover({sb,seriesId,teamId,path}){
  const {data,error}=await sb.from('series').update({cover_path:path})
    .eq('id',seriesId).eq('team_id',teamId).select('id,cover_path').maybeSingle();
  if(error)throw error;
  if(!data?.id || data.cover_path!==path)
    throw new Error('La portada no se guardó (comprueba los permisos del equipo)');
  return data.cover_path;
}

export async function uploadSeriesCover({sb,teamId,slug,seriesId,file}){
  const ext=validateSeriesCoverFile(file);
  const nonce=globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
  const path=teamId+'/obras/'+slug+'/portada-'+nonce+'.'+ext;
  const store=sb.storage.from('obi-media');
  const {error}=await store.upload(path,file,{contentType:file.type,cacheControl:'31536000'});
  if(error)throw error;
  try {await saveSeriesCover({sb,teamId,seriesId,path});}
  catch(err){
    // Si el guardado falló, recuperar únicamente la imagen recién subida.
    try{await store.remove([path]);}catch{}
    throw err;
  }
  return path;
}

export function mountSeriesCoverEditor({sb,series,teamId,root,canEdit,media,esc,busy,toast,confirmObi}){
  if(!root)return;
  if(!document.querySelector('link[data-series-cover-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='/series-cover-editor.css?v=1';
    link.dataset.seriesCoverCss='1';document.head.appendChild(link);
  }
  const gallery=Array.isArray(series.media?.gallery)?series.media.gallery:[];
  let path=series.cover_path||null, working=false, available=null;
  const safePath=p=>p?esc(media(p)):'';
  root.innerHTML='<h2>Portada de la novela</h2>'+
    '<p class="mono">Portada principal que aparece en Obras, la ficha pública, el catálogo y la biblioteca. No cambia la portada de los volúmenes.</p>'+
    '<div class="wk-series-cover-content"><div id="wk-series-cover-preview" class="wk-series-cover-preview" aria-label="Vista previa de portada"></div>'+
    '<div class="wk-series-cover-controls"><span class="mono">JPG, PNG o WebP · máximo 8 MB · recomendado 2:3.</span>'+
    (canEdit?'<div class="wk-series-cover-actions"><label class="btn ghost sm wk-series-cover-upload">Subir portada<input type="file" id="wk-sc-file" accept="image/jpeg,image/png,image/webp" hidden></label>'+
      '<button type="button" class="btn ghost sm" id="wk-sc-gallery" aria-expanded="false" aria-controls="wk-sc-choices">▦ Elegir de Multimedia</button>'+
      '<button type="button" class="lnk danger" id="wk-sc-remove">Quitar portada</button></div>':
      '<span class="mono">Necesitas permiso de edición para cambiarla.</span>')+
    '<span class="mono" id="wk-sc-status" role="status" aria-live="polite"></span></div></div>'+
    '<div class="wk-series-cover-gallery" id="wk-sc-choices" aria-label="Portadas disponibles en Multimedia" hidden></div>';
  const status=root.querySelector('#wk-sc-status'),preview=root.querySelector('#wk-series-cover-preview');
  const selectButton=root.querySelector('#wk-sc-gallery'),panel=root.querySelector('#wk-sc-choices');
  const sync=()=>{
    preview.innerHTML=path?'<img alt="Portada actual de '+esc(series.title||'la novela')+'" src="'+safePath(path)+'" decoding="async">':
      '<span class="mono">Sin portada</span>';
    const remove=root.querySelector('#wk-sc-remove');
    if(remove)remove.disabled=working||!path;
    if(selectButton)selectButton.disabled=working;
    const picker=root.querySelector('#wk-sc-file');if(picker)picker.disabled=working;
    root.querySelectorAll('[data-series-cover-pick]').forEach(button=>{
      const selected=button.dataset.seriesCoverPick===path;
      button.setAttribute('aria-pressed',String(selected));
      button.disabled=working;
    });
  };
  const change=async newPath=>{
    if(working||!canEdit)return;
    working=true;sync();status.textContent='Guardando portada…';
    try{
      await saveSeriesCover({sb,seriesId:series.id,teamId,path:newPath});
      path=newPath;series.cover_path=newPath;
      toast(newPath?'Portada de la novela actualizada':'Portada principal quitada');
      status.textContent=newPath?'✓ Portada guardada':'Portada quitada';
    }finally{working=false;sync();}
  };
  const showChoices=paths=>{
    panel.innerHTML=paths.length?
      '<p class="mono">Imágenes de la galería y de los volúmenes de esta obra. Selecciona una para sustituir la portada principal.</p>'+
      '<div class="wk-series-cover-grid">'+paths.map(p=>
        '<button type="button" data-series-cover-pick="'+esc(p)+'" aria-label="Usar '+esc(p.split('/').pop())+
        ' como portada principal" aria-pressed="'+(p===path)+'"><img src="'+safePath(p)+
        '" alt="" loading="lazy" decoding="async"><span>'+esc(p.split('/').pop())+'</span></button>'
      ).join('')+'</div>':
      '<p class="mono">No hay imágenes asociadas a esta obra. Puedes subir una portada nueva.</p>';
    panel.querySelectorAll('[data-series-cover-pick]').forEach(b=>b.onclick=()=>busy(b,async()=>{
      if(!available?.includes(b.dataset.seriesCoverPick))throw new Error('Esta imagen no pertenece a Multimedia de la obra');
      await change(b.dataset.seriesCoverPick);
    }));
    sync();
  };
  if(canEdit){
    selectButton.onclick=()=>busy(selectButton,async()=>{
      if(!panel.hidden){
        panel.hidden=true;selectButton.setAttribute('aria-expanded','false');return;
      }
      panel.hidden=false;selectButton.setAttribute('aria-expanded','true');
      panel.innerHTML='<p class="mono">Cargando imágenes de Multimedia…</p>';
      try{
        available=await loadSeriesCoverChoices({sb,teamId,slug:series.slug,gallery});
        showChoices(available);
      }catch(error){panel.textContent='No se pudo abrir Multimedia: '+(error?.message||error);throw error;}
    });
    root.querySelector('#wk-sc-file').onchange=event=>{
      const file=event.target.files?.[0];event.target.value='';
      if(!file)return;
      busy(null,async()=>{
        validateSeriesCoverFile(file);
        if(working)return;
        working=true;sync();status.textContent='Subiendo y guardando portada…';
        try{
          const next=await uploadSeriesCover({sb,seriesId:series.id,teamId,slug:series.slug,file});
          path=next;series.cover_path=next;
          toast('Portada principal de la novela actualizada');
          status.textContent='✓ Portada guardada';
        }finally{working=false;sync();}
      });
    };
    root.querySelector('#wk-sc-remove').onclick=e=>busy(e.currentTarget,async()=>{
      if(!path||!await confirmObi('¿Quitar la portada principal de la novela? No se borrará el archivo de Multimedia.'))return;
      await change(null);
    });
  }
  sync();
}

import {cleanSeo, editImages, SEO_LIMITS} from './seo-settings.js?v=1';
// SEO editorial por obra, sin modificar RLS, publicación, precios ni canonical.
const css = '.wk-seo{display:grid;gap:14px;max-width:850px}.wk-seo label{display:grid;gap:6px}.wk-seo textarea{min-height:88px;resize:vertical}.wk-seo small{color:#b9ae94;font-size:12px}.wk-seo-preview{border:1px solid #57492d;background:#16140f;padding:16px;display:grid;gap:8px;overflow-wrap:anywhere}.wk-seo-preview strong{color:#f2c230;font-size:18px}.wk-seo-preview img{width:100%;max-height:230px;object-fit:contain;background:#0d0c0a}.wk-seo-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.wk-seo input:focus-visible,.wk-seo textarea:focus-visible,.wk-seo select:focus-visible{outline:2px solid #f2c230}';
const field = (tag, props={}, text='') => {
  const el=document.createElement(tag);
  for(const [key,value] of Object.entries(props)) {
    if(key==='className')el.className=value;
    else if(key==='disabled')el.disabled=value;
    else if(key==='checked')el.checked=value;
    else if(key==='value')el.value=value;
    else el.setAttribute(key,String(value));
  }
  if(text)el.textContent=text;
  return el;
};
export function bindSeriesSeo({app,sb,series,volumes=[],canEdit=false,media,toast,busy,refresh}) {
  const root=app.querySelector('#wk-seo-form'); if(!root)return;
  if(!document.getElementById('wk-seo-css'))document.head.append(field('style',{id:'wk-seo-css'},css));
  const images=editImages(series), old=cleanSeo(series.theme?.seo,{allowedImages:images});
  const wrap=field('section',{className:'wk-box wk-seo'});root.append(wrap);
  wrap.append(field('span',{className:'mono'},'DIFUSIÓN · SEO'),field('h2',{},'Tarjeta de tu obra al compartir'),field('p',{className:'mono'},'Estos ajustes solo cambian metadatos de las fichas públicas. No publican borradores ni desbloquean contenido.'));
  const controls={};
  const specs=[
    ['title','Título SEO','Título del buscador; vacío = título de la obra.'],
    ['description','Descripción SEO','Vacío = sinopsis actual de la obra.'],
    ['socialTitle','Título para compartir','Vacío = título SEO.'],
    ['socialDescription','Descripción para compartir','Vacío = descripción SEO.']
  ];
  for(const [key,label,help] of specs){
    const lab=field('label',{},label);
    const input=field(key.toLowerCase().includes('description')?'textarea':'input',{
      maxlength:SEO_LIMITS[key],...(key.toLowerCase().includes('description')?{rows:3}:{type:'text'})
    });
    input.value=old[key];input.disabled=!canEdit;controls[key]=input;
    const note=field('small',{},help+' ('+old[key].length+'/'+SEO_LIMITS[key]+')');
    lab.append(input,note);wrap.append(lab);controls[key+'Note']=note;
  }
  const imageLabel=field('label',{},'Imagen para compartir');
  const select=field('select');select.append(field('option',{value:''},'Portada automática de la obra'));
  images.forEach((p,i)=>select.append(field('option',{value:p},'Imagen '+(i+1)+' · '+p.split('/').slice(-2).join('/'))));
  select.value=old.imagePath;select.disabled=!canEdit;controls.imagePath=select;
  imageLabel.append(select,field('small',{},'Se permiten únicamente imágenes existentes de la biblioteca de este equipo.'));wrap.append(imageLabel);
  const idx=field('label',{},'');idx.style.display='flex';idx.style.alignItems='center';idx.style.gap='10px';
  const noindex=field('input',{type:'checkbox'});noindex.checked=old.noindex;noindex.disabled=!canEdit;controls.noindex=noindex;
  idx.append(noindex,field('span',{},'Ocultar en buscadores (noindex; la página sigue siendo accesible)'));wrap.append(idx);
  const preview=field('div',{className:'wk-seo-preview','aria-live':'polite'});wrap.append(field('h3',{},'Vista previa aproximada'),preview);
  wrap.append(field('small',{},'Enlace canónico fijo: https://elobidellector.com/serie/'+series.slug));
  if(series.published && series.access==='public' && !series.adult && !old.noindex){
    const link=field('a',{href:'/api/og-image?kind=serie&slug='+encodeURIComponent(series.slug),
      target:'_blank',rel:'noopener noreferrer',className:'btn ghost'},
      'Ver tarjeta final PNG (último guardado) ↗');
    link.style.justifySelf='start';
    wrap.append(link,field('small',{},'La tarjeta final se genera desde los datos públicos guardados. La vista anterior muestra tus cambios actuales aún sin guardar.'));
  }
  let dirty=false;
  const values=()=>Object.fromEntries(Object.entries(controls).filter(([key])=>!key.endsWith('Note')).map(([key,el])=>[key,el.type==='checkbox'?el.checked:el.value]));
  const update=()=>{
    const v=cleanSeo(values(),{allowedImages:images});
    preview.replaceChildren();
    const image=v.imagePath||series.cover_path;
    if(image)preview.append(field('img',{src:media(image),alt:''}));
    preview.append(field('strong',{},v.socialTitle||v.title||series.title),
      field('span',{},v.socialDescription||v.description||String(series.synopsis||'Lee esta obra en El Obi del Lector.').slice(0,170)),
      field('small',{},'elobidellector.com/serie/'+series.slug));
    if(v.noindex)preview.append(field('small',{},'No se indexará en buscadores'));
    for(const [key,,help] of specs)controls[key+'Note'].textContent=help+' ('+v[key].length+'/'+SEO_LIMITS[key]+')';
    if(dirty && controls.status)controls.status.textContent='Cambios sin guardar';
  };
  Object.entries(controls).filter(([key])=>!key.endsWith('Note')).forEach(([,el])=>el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input',()=>{dirty=true;update();}));
  if(canEdit) {
    const actions=field('div',{className:'wk-seo-actions'});
    const save=field('button',{type:'button',className:'btn'},'Guardar SEO');
    const reset=field('button',{type:'button',className:'btn ghost'},'Restaurar automático');
    const status=field('span',{className:'mono',role:'status'});
    controls.status=status;actions.append(save,reset,status);wrap.append(actions);
    reset.onclick=()=>{
      if(!confirm('¿Restaurar los metadatos automáticos? Guarda para aplicar.'))return;
      Object.entries(controls).forEach(([key,el])=>{if(key.endsWith('Note')||key==='status')return;if(el.type==='checkbox')el.checked=false;else el.value='';});
      dirty=true;update();
    };
    save.onclick=e=>busy(e.currentTarget,async()=>{
      const nextSeo=cleanSeo(values(),{allowedImages:images});
      // Volver a leer: el campo JSONB theme también contiene avisos y otros ajustes.
      const {data:cur,error:readError}=await sb.from('series').select('theme,team_id').eq('id',series.id).single();
      if(readError)throw readError;
      if(cur.team_id!==series.team_id)throw new Error('Cambió el propietario de la obra');
      const theme={...(cur.theme||{}),seo:nextSeo};
      const {data,error}=await sb.from('series').update({theme}).eq('id',series.id).eq('team_id',series.team_id).select('id');
      if(error)throw error;
      if(!data?.length)throw new Error('Permisos de edición insuficientes');
      dirty=false;toast('SEO guardado para la obra');refresh();
    });
  }else wrap.append(field('p',{className:'mono'},'Necesitas permiso de edición para cambiar los metadatos.'));
  update();
}

// Fragmento de identidad y SEO extraído para mantener Studio bajo el límite de modularidad.
export function teamSeoProfileHTML(D, dis, esc, TZS, works, SECTS) {
  return `
        <label>Zona horaria del equipo<select name="tz" ${dis}>${[...TZS, ...(TZS.some(x => x[0] === D.tz) ? [] : [[D.tz, D.tz.replace(/_/g, ' ')]])].map(([k, l]) => `<option value="${k}" ${k === D.tz ? 'selected' : ''}>${l} · ${new Date().toLocaleTimeString('es-MX', { timeZone: k, hour: '2-digit', minute: '2-digit' })}</option>`).join('')}</select><small class="mono">Es la hora de referencia del equipo. Cada integrante programa con la hora de su dispositivo y, junto al campo de fecha, puede cambiar a esta. Los lectores ven cada lanzamiento en su propia hora.</small></label>
        <label>Obra destacada<select name="feat" ${dis}><option value="">Ninguna</option>${(works || []).map(w => `<option value="${w.slug}" ${D.feat === w.slug ? 'selected' : ''}>${esc(w.short || w.title)}</option>`).join('')}</select></label>
        <div class="pf-g"><span class="pf-l">Secciones visibles</span>${SECTS.map(([k, l]) => `<label class="tb-inl"><input type="checkbox" data-sect="${k}" ${D.sect[k] ? 'checked' : ''} ${dis}> ${l}</label>`).join('')}</div>
        <fieldset style="display:grid;gap:12px;border:1px solid #54452b;padding:16px"><legend>SEO y tarjetas del equipo</legend>
          <p class="mono" style="margin:0">Campos opcionales. No modifican tu URL ni hacen públicos los borradores del equipo.</p>
          <label>Título SEO<input data-tseo="title" maxlength="70" value="${esc(D.seo.title)}" ${dis}></label>
          <label>Descripción SEO<textarea data-tseo="description" rows="3" maxlength="170" ${dis}>${esc(D.seo.description)}</textarea></label>
          <label>Título para compartir<input data-tseo="socialTitle" maxlength="90" value="${esc(D.seo.socialTitle)}" ${dis}></label>
          <label>Descripción para compartir<textarea data-tseo="socialDescription" rows="3" maxlength="200" ${dis}>${esc(D.seo.socialDescription)}</textarea></label>
          <label>Imagen de la tarjeta<select data-tseo="imagePath" ${dis}><option value="">Banner o logo automático</option>
            ${[D.banner,D.avatar].filter(Boolean).map((p,i)=>'<option value="'+esc(p)+'" '+(D.seo.imagePath===p?'selected':'')+'>'+ (i?'Logo':'Banner') +'</option>').join('')}</select></label>
          <label class="tb-inl"><input data-tseo="noindex" type="checkbox" ${D.seo.noindex?'checked':''} ${dis}> Ocultar en buscadores (sin cambiar visibilidad)</label>
          <a class="btn ghost" style="justify-self:start" target="_blank" rel="noopener noreferrer" href="/api/og-image?kind=equipo&slug=${encodeURIComponent(D.slug)}">Ver tarjeta PNG del equipo (último guardado) ↗</a>
        </fieldset>
`;
}

// Anuncios públicos editoriales: nunca envía notificaciones ni llama publish_volume.
export const EDITORIAL_CHOICES = [
  ['volumen','¡Nuevo volumen!'],['completo','¡Volumen completo!'],
  ['capitulo','¡Nuevo capítulo!'],['especial','¡Contenido especial!'],
  ['personalizado','Personalizado'],['ninguno','Sin anuncio destacado']
];
const labelOf = Object.fromEntries(EDITORIAL_CHOICES);
const safeColor = v => /^#[\da-f]{6}$/i.test(v || '') ? v : '#f2c230';
export function validateEditorialSelection(v) {
  const mode = String(v?.mode || '');
  if (!Object.hasOwn(labelOf, mode)) throw new Error('Selecciona qué deseas anunciar');
  if (mode === 'ninguno') return {mode, text:'', days:0, color:'#f2c230', style:'solid'};
  const days = Number(v?.days);
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('La duración es obligatoria y debe estar entre 1 y 90 días');
  const text = (mode === 'personalizado' ? String(v?.text || '') : labelOf[mode]).trim();
  if (!text || Array.from(text).length > 40) throw new Error('El anuncio debe tener entre 1 y 40 caracteres');
  return {mode,text,days,color:safeColor(v?.color),style:v?.style === 'outline' ? 'outline' : 'solid'};
}
export function createEditorialRecord(v, {kind,id,startsAt}) {
  const c = validateEditorialSelection(v);
  const start = new Date(startsAt);
  if (!['volume','chapter'].includes(kind) || !id || !Number.isFinite(+start)) throw new Error('No se identificó correctamente la publicación');
  return {version:1,kind,id:String(id),...c,starts_at:start.toISOString(),
    expires_at:c.mode === 'ninguno' ? null : new Date(+start + c.days * 864e5).toISOString()};
}
export function chooseActiveEditorial(theme, now=Date.now()) {
  const all = Array.isArray(theme?.editorial_releases) ? theme.editorial_releases : [];
  const eligible = all.filter(x => x?.starts_at && +new Date(x.starts_at) <= +new Date(now))
    .sort((a,b) => +new Date(b.starts_at) - +new Date(a.starts_at));
  if (eligible.length) {
    const x=eligible[0];
    if (x.mode === 'ninguno' || !x.expires_at || +new Date(x.expires_at) <= +new Date(now)) return null;
    return {on:true,text:x.text,color:safeColor(x.color),style:x.style,kind:x.kind,sourceId:x.id};
  }
  const legacy=theme?.update_tag;
  return legacy?.on && (legacy.text||'').trim() && (!legacy.until || +new Date(legacy.until+'T23:59:59') >= +new Date(now))
    ? {...legacy,kind:'legacy'} : null;
}
export async function saveEditorialRecord(sb,seriesId,selection,target) {
  const item=createEditorialRecord(selection,target);
  const {data:existing,error:re}=await sb.from('series').select('theme').eq('id',seriesId).single();
  if(re)throw re;
  const theme=existing?.theme || {};
  const prior=(Array.isArray(theme.editorial_releases)?theme.editorial_releases:[])
    .filter(x=>!(x.kind===item.kind && String(x.id)===item.id));
  const next={...theme,editorial_releases:[...prior,item].sort((a,b)=>+new Date(b.starts_at)-+new Date(a.starts_at)).slice(0,60)};
  const {data:updated,error}=await sb.from('series').update({theme:next}).eq('id',seriesId).select('id,theme');
  if(error)throw error;
  if(!updated?.length || !updated[0].theme?.editorial_releases?.some(x=>x.kind===item.kind&&String(x.id)===item.id&&x.starts_at===item.starts_at))
    throw new Error('No se pudo confirmar el anuncio editorial');
  return item;
}
export function editorialForm(esc,kind='volume',value={}) {
  const mode=value.mode || (kind==='volume'?'volumen':'capitulo'),days=Number(value.days||14);
  const custom=![7,14,30].includes(days);
  const opts=EDITORIAL_CHOICES.map(([k,t])=>'<option value="'+k+'" '+(k===mode?'selected':'')+'>'+esc(t)+'</option>').join('');
  const durations=[7,14,30].map(n=>'<option value="'+n+'" '+(!custom&&days===n?'selected':'')+'>'+n+' días</option>').join('');
  return '<fieldset class="ea-form" data-editorial-fields><legend>Anuncio editorial</legend>'+
    '<p class="ea-help">Aparece en Inicio y Lanzamientos. No altera las notificaciones personalizadas.</p>'+
    '<label>Qué anunciar<select data-ea="mode">'+opts+'</select></label>'+
    '<label data-ea-custom '+(mode==='personalizado'?'':'hidden')+'>Texto personalizado<input data-ea="text" maxlength="40" value="'+esc(value.text||'')+'" placeholder="¡Volumen disponible!"><small>Máximo 40 caracteres</small></label>'+
    '<div data-ea-settings '+(mode==='ninguno'?'hidden':'')+'>'+
      '<label>Duración obligatoria<select data-ea="duration">'+durations+'<option value="custom" '+(custom?'selected':'')+'>Personalizar días</option></select></label>'+
      '<label data-ea-days '+(custom?'':'hidden')+'>Días (1–90)<input data-ea="days" type="number" min="1" max="90" step="1" value="'+esc(String(days))+'"></label>'+
      '<label>Color<input data-ea="color" type="color" value="'+safeColor(value.color)+'"></label>'+
      '<label>Estilo<select data-ea="style"><option value="solid" '+(value.style!=='outline'?'selected':'')+'>Sólido</option><option value="outline" '+(value.style==='outline'?'selected':'')+'>Contorno</option></select></label></div>'+
    '<p class="ea-help" data-ea-preview role="status"></p></fieldset>';
}
export function bindEditorialForm(root) {
  const f=root.querySelector('[data-editorial-fields]');if(!f)return null;
  const get=k=>f.querySelector('[data-ea="'+k+'"]');
  const redraw=()=>{
    const mode=get('mode').value,dur=get('duration').value;
    f.querySelector('[data-ea-custom]').hidden=mode!=='personalizado';
    f.querySelector('[data-ea-settings]').hidden=mode==='ninguno';
    f.querySelector('[data-ea-days]').hidden=dur!=='custom';
    f.querySelector('[data-ea-preview]').textContent=mode==='ninguno'?'Publicación sin anuncio destacado':
      (mode==='personalizado'?get('text').value:labelOf[mode])+' · '+(dur==='custom'?get('days').value:dur)+' días · se retirará automáticamente';
  };
  f.addEventListener('input',redraw);f.addEventListener('change',redraw);redraw();
  return ()=>validateEditorialSelection({mode:get('mode').value,text:get('text').value,
    days:get('duration').value==='custom'?get('days').value:get('duration').value,
    color:get('color').value,style:get('style').value});
}
export function askEditorialAnnouncement({esc,kind,title,initial}={}) {
  return new Promise(resolve=>{
    const host=document.createElement('div');host.className='ea-overlay';
    host.innerHTML='<section role="dialog" aria-modal="true" aria-label="Anuncio editorial" class="ea-modal">'+
      '<h2>Último paso · anuncio editorial</h2><p>Publicación: <b>'+esc(title||'Publicación')+'</b></p>'+
      editorialForm(esc,kind,initial)+'<p class="ea-warning" role="alert" hidden></p>'+
      '<div class="ea-actions"><button type="button" data-ea-cancel>Cancelar</button><button type="button" data-ea-accept>Continuar y publicar</button></div></section>';
    document.body.appendChild(host);
    const read=bindEditorialForm(host);
    const end=result=>{document.removeEventListener('keydown',key);host.remove();resolve(result)};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();end(null)}};
    document.addEventListener('keydown',key);
    host.querySelector('[data-ea-cancel]').onclick=()=>end(null);
    host.querySelector('[data-ea-accept]').onclick=()=>{
      try{end(read())}catch(e){const p=host.querySelector('.ea-warning');p.hidden=false;p.textContent=e.message}
    };
    host.querySelector('[data-ea="mode"]').focus();
  });
}

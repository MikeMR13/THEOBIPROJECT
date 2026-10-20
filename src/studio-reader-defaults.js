import { READER_TEAM_OPTIONS, READER_TEAM_LABELS, cleanReaderTeamDefaults } from './reader-team-defaults.js?v=1';

// Editor explícito; utiliza la política RLS existente de teams para el permiso «profile».
// Nunca escribe reader_prefs del lector ni cambia el diseño publicado.
export async function mountTeamReaderDefaults({ app, sb, teamId, allowed, notify, esc }) {
  const host=app.querySelector('.s2-main');
  if(!host || !allowed())return;
  const uid=teamId;
  host.insertAdjacentHTML('beforeend', `<section class="s2-reader-def" id="s2-reader-def" aria-labelledby="s2-rd-title">
    <div class="s2-rd-head"><div><h2 id="s2-rd-title">Lectura predeterminada del equipo</h2>
      <p>Formato inicial para las novelas del equipo. Las preferencias globales del lector y sus ajustes por volumen siempre tienen prioridad.</p></div></div>
    <p class="mono" id="s2-rd-status" role="status" aria-live="polite">Cargando formato predeterminado…</p>
    <div class="s2-rd-options" id="s2-rd-options"></div>
    <div class="s2-rd-actions"><button type="button" class="btn" id="s2-rd-save" disabled>Guardar predeterminados</button>
      <button type="button" class="btn ghost" id="s2-rd-reset" disabled>Usar el formato original</button></div>
  </section>`);
  const root=host.querySelector('#s2-reader-def');
  const live=()=>allowed() && root?.isConnected && root.closest('.s2-main')===app.querySelector('.s2-main');
  const status=root.querySelector('#s2-rd-status'),save=root.querySelector('#s2-rd-save'),reset=root.querySelector('#s2-rd-reset');
  const {data,error}=await sb.from('teams').select('reader_defaults').eq('id',uid).maybeSingle();
  if(!live())return;
  if(error || !data){status.textContent='No se pudieron cargar los ajustes del equipo. No se realizará ningún cambio.';notify?.(error?.message || 'No se encontraron los ajustes del equipo');return;}
  let stored=cleanReaderTeamDefaults(data.reader_defaults), current={...stored}, busy=false;
  const opts=[...Object.entries(READER_TEAM_OPTIONS),['size',[]],['autosecs',[]]];
  const html=(key, choices)=>{
    if(key==='size'||key==='autosecs'){
      const min=key==='size'?14:3,max=30;
      return `<label class="s2-rd-field"><span>${key==='size'?'Tamaño de letra':'Espera para el siguiente capítulo'}</span>
       <input type="number" data-rd-key="${key}" min="${min}" max="${max}" step="1" placeholder="Predeterminado" inputmode="numeric"></label>`;
    }
    const choicesHTML=choices.map(([v,l])=>`<option value="${String(v)}">${esc(l)}</option>`).join('');
    return `<label class="s2-rd-field"><span>${esc(READER_TEAM_LABELS[key])}</span>
      <select data-rd-key="${key}"><option value="">Heredar configuración original</option>${choicesHTML}</select></label>`;
  };
  root.querySelector('#s2-rd-options').innerHTML=opts.map(([key,choices])=>html(key,choices)).join('');
  const val=k=>current[k]===undefined?'':String(current[k]);
  const redraw=()=>{
    root.querySelectorAll('[data-rd-key]').forEach(el=>{el.value=val(el.dataset.rdKey)});
    const modified=JSON.stringify(cleanReaderTeamDefaults(current))!==JSON.stringify(stored);
    save.disabled=busy||!modified;reset.disabled=busy||!Object.keys(current).length;
    status.textContent=busy?'Guardando formato…':modified?'Cambios sin guardar. No afectan la lectura hasta guardarlos.':'Predeterminados guardados. Las preferencias del lector prevalecen.';
  };
  root.querySelectorAll('[data-rd-key]').forEach(el=>el.addEventListener('change',()=>{
    const k=el.dataset.rdKey,v=el.value;
    if(!v)delete current[k];
    else if(k==='size'||k==='autosecs')current[k]=Number(v);
    else if(k==='illus'||k==='awake'||k==='autonext')current[k]=v==='true';
    else current[k]=v;
    current=cleanReaderTeamDefaults(current);
    redraw();
  }));
  reset.onclick=()=>{current={};redraw();};
  save.onclick=async()=>{
    if(!live()||busy)return;
    const next=cleanReaderTeamDefaults(current);
    if(JSON.stringify(next)===JSON.stringify(stored))return;
    busy=true;redraw();
    try{
      const {data:row,error:err}=await sb.from('teams').update({reader_defaults:next}).eq('id',uid).select('reader_defaults').single();
      if(!live())return;
      if(err || !row)throw err || Error('No se pudo confirmar el guardado con los permisos actuales');
      stored=cleanReaderTeamDefaults(row.reader_defaults);current={...stored};
      notify?.('Formato de lectura predeterminado actualizado');
    }catch(e){if(live())notify?.(e.message || 'No se pudo guardar el formato');}
    finally{busy=false;if(live())redraw();}
  };
  redraw();
}

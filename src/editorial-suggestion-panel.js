import {compareChapterVersions,suggestionIsStale} from './editorial-collaboration.js?v=1';

// Colaboración sin sobrescritura: las propuestas nunca escriben chapters.body.
export function setupEditorialCollaboration({sb,id,root,box,button,historyBox,can,names,esc,toast,fmtTz,confirmObi,getVersion,getDirty,getConflict,getBody,getTitle,getSelected,getRevision,findText,userId}){
  const state={items:[]};
  const date=x=>fmtTz(x,{dateStyle:'medium',timeStyle:'short'});
  async function refresh(){
    if(!root.isConnected)return;
    box.innerHTML=`<div class="ed-bh"><b>Sugerencias del equipo</b><span class="mono">Revisar no modifica el capítulo</span></div>
      <form class="ed-sug-form" id="ed-sug-form">
        <label>Fragmento de la versión guardada<textarea id="ed-sug-excerpt" maxlength="4000" rows="2" required placeholder="Selecciona un fragmento del texto antes de abrir Sugerencias">${esc(String(getSelected()||'').slice(0,4000))}</textarea></label>
        <label>Propuesta<textarea id="ed-sug-replacement" maxlength="8000" rows="3" placeholder="Redacción propuesta. Vacío = sugerir eliminar el fragmento"></textarea></label>
        <label>Motivo (opcional)<textarea id="ed-sug-note" maxlength="1000" rows="2"></textarea></label>
        <p class="ed-note">Propuesta vinculada a la versión v${getVersion()}. Si hay cambios locales, guárdalos antes de enviar. Otra persona con permiso de revisión decide si queda revisada o descartada; nada se aplica automáticamente.</p>
        <button type="submit" class="btn">Enviar para revisión</button>
      </form><div class="ed-sug-list" id="ed-sug-list" role="status">Cargando propuestas…</div>`;
    box.querySelector('#ed-sug-form').onsubmit=async ev=>{
      ev.preventDefault();
      if(getDirty()||getConflict()){toast('Guarda tus cambios locales antes de proponer una modificación');return;}
      const excerpt=box.querySelector('#ed-sug-excerpt').value.trim(),replacement=box.querySelector('#ed-sug-replacement').value,note=box.querySelector('#ed-sug-note').value;
      if(!excerpt){toast('Indica el fragmento que se quiere revisar');return;}
      const submit=box.querySelector('[type=submit]');submit.disabled=true;
      try{
        const {error}=await sb.rpc('editor_create_suggestion',{p_chapter:id,p_version:getVersion(),p_excerpt:excerpt,p_replacement:replacement,p_note:note});
        if(error)throw error;
        toast('Sugerencia enviada; el texto no se ha modificado');await refresh();
      }catch(err){toast(err.message||'No se pudo guardar la sugerencia');}finally{if(submit.isConnected)submit.disabled=false;}
    };
    const {data,error}=await sb.from('editor_suggestions').select('id,created_by,created_at,base_version,excerpt,replacement,note,status,reviewed_by')
      .eq('chapter_id',id).order('created_at',{ascending:false}).limit(100);
    if(!box.isConnected)return;
    const list=box.querySelector('#ed-sug-list');if(!list)return;
    if(error){list.textContent='No se pudieron cargar sugerencias: '+error.message;return;}
    state.items=data||[];
    const actors=await names(state.items.flatMap(x=>[x.created_by,x.reviewed_by]).filter(Boolean));
    if(!list.isConnected)return;
    list.innerHTML=state.items.map(x=>`<article class="ed-sug-row">
      <div class="ed-sug-head"><strong>${esc(actors[x.created_by]||'Integrante')}</strong>
        <span class="mono">${x.status==='pending'?'Pendiente':x.status==='reviewed'?'Revisada (no aplicada)':'Descartada'}
        · v${x.base_version}${suggestionIsStale(x.base_version,getVersion())?' · versión anterior':''}</span></div>
      <div class="ed-sug-change"><div><small>Texto señalado</small><p>${esc(x.excerpt)}</p></div>
        <div><small>Cambio sugerido</small><p>${esc(x.replacement||'(Eliminar el fragmento)')}</p></div></div>
      ${x.note?`<p class="ed-note">${esc(x.note)}</p>`:''}
      <div class="ed-sug-actions"><small>${esc(date(x.created_at))}${x.reviewed_by?' · revisó '+esc(actors[x.reviewed_by]||'Integrante'):''}</small>
        <button type="button" class="btn ghost" data-sugfind="${x.id}">Buscar fragmento</button>
        ${x.status==='pending'&&can('review')&&x.created_by!==userId?
          `<button type="button" class="btn ghost" data-sugreview="${x.id}">Marcar revisada</button><button type="button" class="btn ghost" data-sugreject="${x.id}">Descartar</button>`:''}
      </div></article>`).join('')||'<p class="ed-note">Aún no hay sugerencias para este capítulo.</p>';
  }
  button.onclick=()=>{
    const open=box.hidden;
    box.hidden=!open;button.setAttribute('aria-expanded',String(open));
    button.classList.toggle('on',open);if(open)refresh();
  };
  root.addEventListener('click',async ev=>{
    const el=ev.target.closest('[data-sugfind],[data-sugreview],[data-sugreject],[data-hd]');
    if(!el||!root.contains(el))return;
    const d=el.dataset;
    if(d.sugfind){
      const item=state.items.find(x=>String(x.id)===d.sugfind);
      if(item&&!findText(item.excerpt))toast('Ese fragmento ya no coincide con el borrador');
      return;
    }
    if(d.sugreview||d.sugreject){
      const decision=d.sugreview?'reviewed':'rejected';
      if(!await confirmObi(decision==='reviewed'?'¿Registrar como revisada? No se aplicará al texto.':'¿Descartar esta sugerencia?'))return;
      el.disabled=true;
      try{
        const {error}=await sb.rpc('editor_review_suggestion',{p_id:Number(d.sugreview||d.sugreject),p_decision:decision});
        if(error)throw error;toast('Revisión registrada, sin modificar el capítulo');await refresh();
      }catch(err){toast(err.message||'No se pudo registrar la revisión');}finally{if(el.isConnected)el.disabled=false;}
      return;
    }
    if(d.hd){
      el.disabled=true;
      try{
        const historical=await getRevision(d.hd);
        const diff=compareChapterVersions(historical,{title:getTitle(),body:getBody()});
        const target=historyBox.querySelector('#ed-history-compare');
        if(!target)return;
        target.innerHTML=`<div class="ed-bh"><b>Comparación: v${historical.version} y borrador actual</b><button class="btn ghost" type="button" data-hdclose> Cerrar </button></div>
          ${diff.titleChanged?`<p class="ed-note">Título: ${esc(diff.beforeTitle)} → ${esc(diff.afterTitle)}</p>`:''}
          <p class="ed-note">${diff.changed?`${diff.removed} bloque(s) antes y ${diff.added} después en el tramo cambiado.`:'Sin cambios en bloques.'}${getDirty()?' El borrador contiene cambios sin guardar.':''}</p>
          <div class="ed-diff"><div><b>Versión histórica</b>${diff.before.map(t=>`<p>${esc(t)}</p>`).join('')||'<p class="ed-note">Sin bloques</p>'}</div>
          <div><b>Borrador actual</b>${diff.after.map(t=>`<p>${esc(t)}</p>`).join('')||'<p class="ed-note">Sin bloques</p>'}</div></div>
          ${diff.truncated?'<p class="ed-note">Resumen limitado a 12 bloques por lado. Usa «Ver» para revisar la versión completa.</p>':''}`;
        target.querySelector('[data-hdclose]').onclick=()=>{target.innerHTML='';};
      }catch(err){toast(err.message||'No se pudo comparar');}finally{if(el.isConnected)el.disabled=false;}
    }
  });
  return {refresh};
}

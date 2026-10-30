// Fase 4: revisión de versiones completas, opt-in por equipo y aprobación por otro integrante.
// Todo cambio de estado se confirma mediante RPCs con validación server-side; jamás altera body.
export const reviewIsStale=(base,current)=>base==null||Number(base)!==Number(current);
export async function teamApprovalRequired(sb,teamId){
 const {data,error}=await sb.from('teams').select('require_approval').eq('id',teamId).maybeSingle();
 if(error)throw error;
 if(!data)throw new Error('No se pudo comprobar la política de aprobación del equipo');
 return data.require_approval===true;
}
export function setupEditorialApproval({sb,id,teamId,root,box,button,can,role,names,esc,toast,fmtTz,confirmObi,
 getVersion,getDirty,getConflict,getUserId}){
 const me=getUserId();
 const date=x=>fmtTz(x,{dateStyle:'medium',timeStyle:'short'});
 const state={required:false,items:[]};
 const showError=e=>toast(e?.message||'No se pudo completar la operación');
 async function refresh(){
   if(!box.isConnected)return;
   box.innerHTML='<p class="ed-note">Comprobando permisos y versiones de revisión…</p>';
   const [{data:team,error:teamError},{data:items,error:itemsError}]=await Promise.all([
     sb.from('teams').select('require_approval').eq('id',teamId).maybeSingle(),
     sb.from('review_requests').select('id,requested_by,created_at,base_version,note,status,reviewed_by,reviewed_at,review_note')
       .eq('chapter_id',id).order('created_at',{ascending:false}).limit(80)
   ]);
   if(!box.isConnected)return;
   if(teamError||itemsError){box.textContent='No se pudo cargar la revisión: '+(teamError||itemsError).message;return;}
   state.required=team?.require_approval===true;
   state.items=items||[];
   const people=await names(state.items.flatMap(x=>[x.requested_by,x.reviewed_by]).filter(Boolean));
   if(!box.isConnected)return;
   const last=state.items[0],status=last?
     (last.status==='approved'?(reviewIsStale(last.base_version,getVersion())?'Aprobación de versión anterior':'Aprobado para esta versión (sujeto a verificación del servidor)'):
      last.status==='pending'?(reviewIsStale(last.base_version,getVersion())?'Solicitud de versión anterior':'Pendiente de revisión'):'Requiere cambios')
     :'Sin solicitudes';
   box.innerHTML=`<div class="ed-bh"><b>Flujo de aprobación</b><span class="mono">${esc(status)}</span></div>
     <div class="ed-approval-settings">
       <p class="ed-note">Revisión obligatoria para publicar o programar: <b>${state.required?'Activada':'Desactivada'}</b>. Solo se aplica a cambios futuros; no despublica capítulos existentes.</p>
       ${['owner','admin'].includes(role)?`<button type="button" class="btn ghost" id="ed-approval-policy">${state.required?'Desactivar requisito del equipo':'Activar requisito del equipo'}</button>`:''}
       <p class="ed-note">Al activar, cada capítulo necesitará la aprobación de un integrante distinto del solicitante. Un guardado posterior invalida la aprobación previa. Para modificar un capítulo programado hay que cancelar primero su programación.</p>
     </div>
     <form id="ed-review-form" class="ed-approval-form">
       <label>Nota para la revisión (opcional)<textarea id="ed-review-note" maxlength="1000" rows="2" placeholder="Qué debe comprobar quien revisa"></textarea></label>
       <button type="submit" class="btn">Solicitar revisión de la versión v${getVersion()}</button>
       <p class="ed-note">Guarda primero el texto. La solicitud no cambia el estado de publicación ni el calendario.</p>
     </form>
     <div class="ed-approval-list">${state.items.map(x=>`<article class="ed-sug-row">
       <div class="ed-sug-head"><b>${esc(people[x.requested_by]||'Integrante')}</b><span class="mono">
         ${x.status==='approved'?'Aprobada':x.status==='pending'?'Pendiente':'Cambios solicitados'} · v${x.base_version??'antigua'}
         ${reviewIsStale(x.base_version,getVersion())?' · Desactualizada':''}</span></div>
       ${x.note?`<p class="ed-note">${esc(x.note)}</p>`:''}
       ${x.review_note?`<p class="ed-note">Respuesta: ${esc(x.review_note)}</p>`:''}
       <div class="ed-sug-actions"><small>${esc(date(x.created_at))}${x.reviewed_by?' · '+esc(people[x.reviewed_by]||'Revisor'):''}</small>
       ${x.status==='pending'&&can('review')&&x.requested_by!==me&&!reviewIsStale(x.base_version,getVersion())?
          `<button class="btn ghost" type="button" data-ed-approve="${x.id}">Aprobar</button><button class="btn ghost" type="button" data-ed-changes="${x.id}">Pedir cambios</button>`:''}
       </div></article>`).join('')||'<p class="ed-note">No hay solicitudes todavía.</p>'}</div>`;
   box.querySelector('#ed-review-form').onsubmit=async e=>{
     e.preventDefault();
     if(getDirty()||getConflict()){toast('Guarda el capítulo y resuelve conflictos antes de solicitar una revisión');return;}
     const btn=e.currentTarget.querySelector('button');btn.disabled=true;
     try{
       const {error}=await sb.rpc('editor_submit_review',{p_chapter:id,p_note:box.querySelector('#ed-review-note').value});
       if(error)throw error;
       toast('Versión enviada a revisión sin modificar el capítulo');await refresh();
     }catch(e){showError(e);}finally{if(btn.isConnected)btn.disabled=false;}
   };
   box.querySelector('#ed-approval-policy')?.addEventListener('click',async e=>{
     const enable=!state.required;
     if(!await confirmObi(enable?'¿Activar aprobación obligatoria para publicaciones y programación futuras de este equipo? Los capítulos programados sin aprobación impedirán activar esta opción.':'¿Desactivar la aprobación obligatoria para las próximas publicaciones del equipo?'))return;
     const btn=e.currentTarget;btn.disabled=true;
     try{
       const {error}=await sb.rpc('editor_set_team_approval',{p_team:teamId,p_enabled:enable});
       if(error)throw error;toast(enable?'Aprobación obligatoria activada':'Requisito de aprobación desactivado');await refresh();
     }catch(e){showError(e);}finally{if(btn.isConnected)btn.disabled=false;}
   });
 }
 button.onclick=()=>{
   const open=box.hidden;box.hidden=!open;
   button.setAttribute('aria-expanded',String(open));button.classList.toggle('on',open);
   if(open)refresh();
 };
 root.addEventListener('click',async ev=>{
   const btn=ev.target.closest('[data-ed-approve],[data-ed-changes]');
   if(!btn||!box.contains(btn))return;
   const decision=btn.dataset.edApprove?'approved':'changes';
   const idValue=Number(btn.dataset.edApprove||btn.dataset.edChanges);
   if(!await confirmObi(decision==='approved'?'¿Aprobar esta versión exacta? Otro guardado requerirá una aprobación nueva.':'¿Solicitar correcciones? La aprobación no se concederá.'))return;
   const note=decision==='changes'?promptReviewNote():'';if(note===null)return;
   btn.disabled=true;
   try{
     const {error}=await sb.rpc('editor_decide_review',{p_id:idValue,p_decision:decision,p_note:note});
     if(error)throw error;toast(decision==='approved'?'Versión aprobada':'Cambios solicitados');await refresh();
   }catch(e){showError(e);}finally{if(btn.isConnected)btn.disabled=false;}
 });
 // La nota de cambios es opcional; el revisor puede explicar después por otro canal.
 function promptReviewNote(){return '';}
 return {refresh};
}

// Obras: presentación y controles sin dependencias de sesiones ni de Supabase real.
import { importWorkUrl } from './studio-works-utils.js?v=1';

export function createStudioWorksToolbar({state,TLS,esc,can}) {
    const statusOptions = Object.entries(TLS).map(([k,v]) => `<option value="${k}">${esc(v[0])}</option>`).join('');
    const toolbar = `<div class="s2-worktools" aria-label="Buscar y organizar obras">
       <label>Buscar obra<input id="s2-work-q" type="search" value="${esc(state.q)}" placeholder="Título de la obra" autocomplete="off"></label>
       <label>Traducción<select id="s2-work-status"><option value="all">Todos los estados</option>${statusOptions}</select></label>
       <label>Visibilidad<select id="s2-work-vis"><option value="all">Todas</option><option value="public">Públicas</option><option value="private">Privadas</option></select></label>
       <label>Ordenar<select id="s2-work-sort"><option value="title">Título</option><option value="activity">Última actividad</option><option value="upcoming">Próximo lanzamiento</option><option value="views">Lecturas</option></select></label>
       <label class="s2-work-check"><input type="checkbox" id="s2-work-att" ${state.attention?'checked':''}> Necesitan atención</label>
       <label>Vista<select id="s2-work-view"><option value="cards">Tarjetas</option><option value="table">Tabla compacta</option></select></label>
       <span class="mono" id="s2-work-count" role="status"></span>
       ${can('create')||can('import')?'<a class="btn ghost s2-work-create" href="/estudio/nueva">＋ Nueva obra</a>':''}
     </div>`;
  return toolbar;
}

export function createStudioWorkCard({chs,sched,featuredSeriesId,TLS,wcolor,esc,media,until,ago,can}) {
    const card = (w,stats) => { const c = chs.filter(x => x.series_id === w.id), pub = c.filter(x => x.status === 'published'), dr = c.filter(x => x.status === 'draft').length;
      const nx = [...c.filter(x => x.status === 'scheduled' && new Date(x.publish_at) > Date.now()).map(x => ({ at: x.publish_at, l: 'Cap. ' + x.num })), ...sched.filter(e => e.series_id === w.id).map(e => ({ at: e.at, l: e.label }))].sort((a, b) => new Date(a.at) - new Date(b.at))[0];
      const last = pub.sort((a, b) => new Date(b.publish_at) - new Date(a.publish_at))[0], st = TLS[w.translation_status] || TLS.active;
      return `<article class="s2-work" style="--c:${wcolor(w)}"><a class="cv" href="/estudio/obra/${w.slug}" style="${w.cover_path ? `background-image:url('${esc(media(w.cover_thumb_path || w.cover_path))}')` : ''}">${w.cover_path ? '' : `<span>${esc(w.short || w.title)}</span>`}</a>
        <div class="bd"><span class="tg"><span class="pl" style="--p:${st[1]}">${st[0]}</span><small>${(w.volumes||[]).filter(v=>!v.deleted_at).length} vol. · ${c.length} cap.${w.published ? '' : ' · privada'}</small></span>
          ${stats?.attention ? `<span class="s2-work-alert">⚑ Necesita atención${stats.correction ? ' · Corrección' : stats.drafts ? ' · Borradores' : !w.cover_path ? ' · Sin portada' : !w.published ? ' · Privada' : ''}</span>` : ''}
          <h2 title="${esc(w.title)}"><a href="/estudio/obra/${w.slug}">${esc(w.title)}</a></h2>${w.synopsis ? `<p>${esc(w.synopsis)}</p>` : ''}
          ${(w.genres || []).length ? `<span class="gn">${w.genres.slice(0, 5).map(g => `<span>${esc(g)}</span>`).join('')}</span>` : ''}
          <dl>${nx ? `<div><dt>PRÓXIMO</dt><dd class="s2-next-set">${esc(nx.l) + ' · ' + until(nx.at)}</dd></div>` : ''}<div><dt>BORRADORES</dt><dd>${dr}</dd></div><div><dt>LECTURAS</dt><dd>${(w.views || 0).toLocaleString('es-MX')}</dd></div><div><dt>ÚLTIMO PUBLICADO</dt><dd>${last ? 'Cap. ' + last.num + ' · ' + ago(last.publish_at) : '—'}</dd></div></dl>
          <div class="s2-work-actions">
            <div class="s2-work-primary">
              ${can('create') ? `<button class="btn" data-new="${w.id}">＋ Nuevo capítulo</button>` : ''}
              <a class="btn ghost" href="/estudio/obra/${w.slug}">Abrir ficha</a>
            </div>
            <div class="s2-work-secondary">
              <details class="s2-more"><summary aria-label="Más acciones para ${esc(w.title)}">··· <span>Más acciones</span></summary>
               <div class="s2-more-content">
                 ${can('import') ? `<a class="btn ghost" href="${importWorkUrl(w.id)}">Importar volumen</a>` : ''}
                 <a class="btn ghost" href="/serie/${esc(w.slug)}">Ver en el sitio ↗</a>
                 ${(can('edit')||can('publish')) && w.published ? `<button class="btn s2-feature-toggle" type="button" data-feature="${w.id}" aria-pressed="${featuredSeriesId===w.id}" aria-label="${featuredSeriesId===w.id ? 'Quitar recomendación de la obra del carrusel de Inicio' : 'Destacar esta obra en el carrusel de Inicio'}" title="${featuredSeriesId===w.id ? 'Quitar esta obra de la recomendación del equipo' : 'Destacar esta obra durante 7 días en el carrusel de Inicio'}"><span aria-hidden="true">${featuredSeriesId===w.id ? '★' : '☆'}</span><span>${featuredSeriesId===w.id ? 'Destacada · Quitar' : 'Destacar'}</span></button>` : ''}
               </div></details>
            </div>
          </div></div></article>`; };
  return card;
}

export function bindStudioWorksControls({app,$,state,chosen,card,list,busy,sb,T,toast,works,newChapter,featuredSeriesId}) {
    const results = $('#s2-work-list');
    if (results) {
      const qs = key => $('#s2-work-' + key);
      qs('status').value=state.status; qs('vis').value=state.visibility;
      qs('sort').value=state.sort; qs('view').value=state.view;
      const renderResults = () => {
        const rows=chosen();
        results.dataset.view=state.view;
        results.innerHTML=rows.length ? rows.map(({work,stats})=>card(work,stats)).join('') :
          '<p class="s2-work-none" role="status">No hay obras que coincidan. Cambia los filtros para verlas.</p>';
        qs('count').textContent=rows.length+' de '+list.length+' obras';
      };
      renderResults();
      qs('q').oninput=e=>{ state.q=e.target.value; renderResults(); };
      for(const [id,key] of [['status','status'],['vis','visibility'],['sort','sort'],['view','view']]) {
        qs(id).onchange=e=>{
          state[key]=e.target.value;
          if(key==='view')try{localStorage.setItem('obi-studio-works-view',state.view);}catch{}
          renderResults();
        };
      }
      qs('att').onchange=e=>{state.attention=e.target.checked;renderResults();};
      results.addEventListener('click',e=>{
        const btn=e.target.closest('[data-feature],[data-new]');
        if(!btn)return;
        if(btn.dataset.feature){
          busy(btn,async()=>{
            const teamId=T.team.id,seriesId=btn.dataset.feature,next=featuredSeriesId===seriesId?null:seriesId;
            const {error}=await sb.rpc('team_feature_set',{p_team_id:teamId,p_series_id:next});
            if(error)throw error;
            if(T.team?.id!==teamId)return;
            toast(next?'Obra destacada durante 7 días':'Recomendación retirada');
            works();
          });
        } else if(btn.dataset.new) busy(btn,()=>newChapter(list.find(w=>w.id===btn.dataset.new)));
      });
    }
}

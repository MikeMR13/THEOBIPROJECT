// Entrega 3: navegador de incidencias y colaboración ligada a la selección.
// El texto solo cambia al pulsar "Aplicar este caso". Las notas usan RPC existente.
import {reviewTextCases,applyReviewCase} from './editorial-review-cases.js?v=1';

export function attachAdvancedEditor({doc,root,reviewPanel,inlinePanel,getRange,getBlocks,getTerms,can,
  getDirty,getConflict,collaboration,changed,showBlock,toast,openReview,escapeHTML}){
  let cases=[],cursor=0;
  const labels={dbl:'Dobles espacios',dots:'Puntos suspensivos',space:'Espacio antes de signo',
    dash:'Guion de diálogo',quotes:'Comillas',gloss:'Glosario',alt:'Ilustración sin descripción',
    open:'Signos de apertura'};
  const selected=()=>{
    const range=getRange();
    if(!range||!doc.contains(range.startContainer)||!doc.contains(range.endContainer))return null;
    const start=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
    const end=range.endContainer.nodeType===1?range.endContainer:range.endContainer.parentElement;
    const b=start?.closest('p,blockquote,aside,h3,h2,h1,h4,h5,h6');
    if(!b||!doc.contains(b)||!b.contains(end))return null;
    const index=getBlocks().indexOf(b);
    return index<0?null:{range,index,block:b};
  };
  const note=()=>{
    const s=selected();
    if(!s)return toast('Sitúa el cursor en un párrafo para agregar una nota');
    if(!can('edit')&&!can('review'))return toast('Tu rol no tiene permisos editoriales');
    if(getDirty()||getConflict())return toast('Guarda el capítulo antes de enviar una nota');
    const excerpt=(s.block.textContent||'').trim().slice(0,4000);
    if(!excerpt)return toast('El párrafo está vacío');
    inlinePanel.hidden=true;collaboration.openParagraphNote(s.index,excerpt);
  };
  const suggest=()=>{
    const s=selected(),text=s?.range.toString().trim()||'';
    if(!text||text.length>4000)return toast('Selecciona texto dentro de un solo párrafo (máximo 4000 caracteres)');
    if(!can('edit')&&!can('review'))return toast('Tu rol no tiene permisos editoriales');
    if(getDirty()||getConflict())return toast('Guarda el capítulo antes de enviar una sugerencia');
    inlinePanel.hidden=true;collaboration.openWithSelection(text);
  };
  const textNodes=()=>{
    const nodes=[],walker=document.createTreeWalker(doc,NodeFilter.SHOW_TEXT,{
      acceptNode(n){return n.parentElement?.closest('rt,figure,.sep')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}
    });let node;
    while((node=walker.nextNode()))nodes.push(node);
    return nodes;
  };
  const scan=()=>{
    const blocks=getBlocks(),found=[];
    for(const node of textNodes()){
      const block=node.parentElement?.closest('p,blockquote,aside,h3,h2,h1,h4,h5,h6');
      const para=blocks.indexOf(block);if(para<0)continue;
      for(const x of reviewTextCases(node.data,getTerms())){
        found.push({...x,node,para});if(found.length>=200)break;
      }
      if(found.length>=200)break;
    }
    for(let i=0;i<blocks.length&&found.length<200;i++){
      const el=blocks[i];
      if(el.tagName==='FIGURE'&&!el.dataset.alt?.trim()&&el.dataset.decorative!=='1')
        found.push({kind:'alt',para:i,excerpt:'Ilustración sin descripción',fix:null});
      if(/^(P|BLOCKQUOTE|ASIDE)$/.test(el.tagName)){
        const t=el.textContent||'';
        if((t.match(/\?/g)||[]).length>(t.match(/¿/g)||[]).length||
           (t.match(/!/g)||[]).length>(t.match(/¡/g)||[]).length)
          found.push({kind:'open',para:i,excerpt:t.slice(0,120),fix:null});
      }
    }
    return found.sort((a,b)=>a.para-b.para||(a.start??0)-(b.start??0)).slice(0,200);
  };
  const locate=x=>{
    if(!x)return;
    const block=getBlocks()[x.para];
    if(!block)return toast('El bloque ya no existe');
    showBlock(block);
    if(x.node?.isConnected&&x.node.data.slice(x.start,x.end)===x.excerpt){
      const r=document.createRange();r.setStart(x.node,x.start);r.setEnd(x.node,x.end);
      const sel=getSelection();sel.removeAllRanges();sel.addRange(r);
    }
  };
  const renderReview=()=>{
    const box=reviewPanel.querySelector('#ed-review-case');if(!box)return;
    cases=scan();cursor=Math.max(0,Math.min(cursor,cases.length-1));
    const x=cases[cursor];
    if(!x){box.innerHTML='<p class="ed-note">No se encontraron incidencias localizables en el texto.</p>';return;}
    const fix=x.fix==null?' · requiere corrección manual':' · propuesta: '+escapeHTML(x.fix);
    box.innerHTML='<div class="ed-review-nav"><b>Caso '+(cursor+1)+' de '+cases.length+
      ' · '+escapeHTML(labels[x.kind]||x.kind)+'</b><span>'+
      '<button type="button" class="btn ghost" data-review-prev '+(cursor===0?'disabled':'')+'>← Anterior</button>'+
      '<button type="button" class="btn ghost" data-review-next '+(cursor===cases.length-1?'disabled':'')+'>Siguiente →</button></span></div>'+
      '<p class="ed-review-excerpt">'+escapeHTML(x.excerpt)+'</p>'+
      '<p class="ed-note">Bloque '+(x.para+1)+fix+'</p>'+
      '<div class="ed-review-actions"><button type="button" class="btn ghost" data-review-find>Ir al caso</button>'+
      (x.fix!=null&&can('edit')?'<button type="button" class="btn" data-review-apply>Aplicar solo este caso</button>':'')+
      '</div><p class="ed-note">Máximo 200 casos; los cambios permanecen como borrador hasta guardarlos.</p>';
  };
  const onClick=ev=>{
    if(ev.target.closest('#ed-inline-suggest')){suggest();return;}
    if(ev.target.closest('#ed-inline-note')){note();return;}
    const b=ev.target.closest('[data-review-prev],[data-review-next],[data-review-find],[data-review-apply]');
    if(!b||!reviewPanel.contains(b))return;
    if(b.hasAttribute('data-review-prev'))cursor=Math.max(0,cursor-1);
    if(b.hasAttribute('data-review-next'))cursor=Math.min(cases.length-1,cursor+1);
    const x=cases[cursor];
    if(b.hasAttribute('data-review-find'))locate(x);
    if(b.hasAttribute('data-review-apply')){
      if(!can('edit')||!x?.node)return;
      const next=applyReviewCase(x.node.data,x);
      if(next===null){toast('El texto cambió; revisa nuevamente');renderReview();return;}
      x.node.data=next;changed();toast('Incidencia corregida en el borrador, no publicada');
    }
    renderReview();
  };
  const onSelection=()=>{
    const s=selected(),current=getSelection();
    if(!s||current?.isCollapsed||(!can('edit')&&!can('review'))){inlinePanel.hidden=true;return;}
    const r=s.range.getBoundingClientRect();
    if(!r.width||!r.height){inlinePanel.hidden=true;return;}
    inlinePanel.hidden=false;
    inlinePanel.style.top=Math.max(8,Math.min(innerHeight-72,r.bottom+8))+'px';
    inlinePanel.style.left=Math.max(8,Math.min(innerWidth-inlinePanel.offsetWidth-8,r.left))+'px';
  };
  const onKey=ev=>{
    if(!root.isConnected||(!root.contains(ev.target)&&ev.target!==document.body))return;
    if(!ev.altKey||!ev.shiftKey||ev.ctrlKey||ev.metaKey)return;
    const k=(ev.key||'').toLowerCase();
    if(!['s','n','j','k'].includes(k))return;
    ev.preventDefault();
    if(k==='s')return suggest();
    if(k==='n')return note();
    if(reviewPanel.hidden)openReview();
    cases=scan();cursor=Math.max(0,Math.min(cases.length-1,cursor+(k==='j'?1:-1)));
    renderReview();locate(cases[cursor]);
  };
  root.addEventListener('click',onClick);
  document.addEventListener('selectionchange',onSelection);
  document.addEventListener('keydown',onKey);
  doc.addEventListener('input',()=>{inlinePanel.hidden=true});
  return {renderReview,dispose:()=>{
    root.removeEventListener('click',onClick);
    document.removeEventListener('selectionchange',onSelection);
    document.removeEventListener('keydown',onKey);
  }};
}

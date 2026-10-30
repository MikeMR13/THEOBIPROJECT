// Editor Fase 5 — ayudas opt-in de escritura, sin alterar contenido al cargar.
export const TYPING_PREF_KEY='obi-editor-autocorrect-v1';
export function typingCorrection(before,typed,atStart=false){
  if(typed==='.' && before.endsWith('..'))return {remove:2,insert:'…'};
  if(typed==='-' && atStart && before==='-')return {remove:1,insert:'—'};
  return null;
}
export function textPrefix(before){
  const m=String(before||'').match(/([\p{L}\p{M}\p{N}_-]{3,})$/u);
  return m?m[1]:'';
}
export function glossarySuggestions(entries,prefix,max=5){
  const needle=String(prefix||'').toLocaleLowerCase('es').trim();
  if(needle.length<3)return [];
  const limit=Math.min(8,Math.max(1,Number(max)||5));
  const seen=new Set();
  return (Array.isArray(entries)?entries:[]).filter(row=>{
    const term=String(row?.term||'').trim();
    if(!term.toLocaleLowerCase('es').startsWith(needle))return false;
    const key=term.toLocaleLowerCase('es');if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>a.term.length-b.term.length||a.term.localeCompare(b.term,'es')).slice(0,limit);
}
export function attachWritingTools({doc,box,checkbox,glossary,change,onSaved,toast}){
  let composing=false,rangeForInsertion=null,prefixForInsertion='',suggested=[],lastBlock=null;
  const restore=()=>{rangeForInsertion=null;prefixForInsertion='';suggested=[];box.hidden=true;box.replaceChildren();};
  const selection=()=>{
    const sel=window.getSelection();
    if(!sel||sel.rangeCount===0||!sel.isCollapsed)return null;
    const r=sel.getRangeAt(0);
    if(!doc.contains(r.startContainer)||r.startContainer.nodeType!==Node.TEXT_NODE)return null;
    const node=r.startContainer,parent=node.parentElement;
    if(!parent||parent.closest('rt,ruby,figure,.sep,[contenteditable="false"]'))return null;
    const block=parent.closest('p,blockquote,aside,h3');
    if(!block||!doc.contains(block))return null;
    return {r,node,block,before:node.data.slice(0,r.startOffset)};
  };
  // Ayuda visual de glosario: se limita al bloque activo y nunca cambia el HTML.
  const highlightName='obi-ed-glossary-current';
  const clearHighlight=()=>{try{CSS.highlights?.delete(highlightName);}catch{}};
  const paintBlock=block=>{
    if(block===lastBlock)return;
    lastBlock=block;clearHighlight();
    if(!block||!glossary.length||!globalThis.Highlight||!CSS?.highlights)return;
    const ranges=[];
    const words=glossary.map(x=>String(x.term||'').trim()).filter(x=>x.length>=3).slice(0,250);
    if(!words.length)return;
    const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())&&ranges.length<80){
      if(n.parentElement?.closest('rt,ruby,figure,.sep'))continue;
      for(const word of words){
        const text=n.data.toLocaleLowerCase('es'),needle=word.toLocaleLowerCase('es');
        let pos=-1;while((pos=text.indexOf(needle,pos+1))>=0&&ranges.length<80){
          const left=pos===0?'':text[pos-1],right=text[pos+needle.length]||'';
          if(/[\p{L}\p{N}]/u.test(left)||/[\p{L}\p{N}]/u.test(right))continue;
          const r=document.createRange();r.setStart(n,pos);r.setEnd(n,pos+word.length);ranges.push(r);
        }
      }
    }
    if(ranges.length)try{CSS.highlights.set(highlightName,new Highlight(...ranges));}catch{}
  };
  const update=()=>{
    if(composing)return;
    const info=selection();
    if(!info){restore();paintBlock(null);return;}
    paintBlock(info.block);
    const prefix=textPrefix(info.before);
    const matches=glossarySuggestions(glossary,prefix);
    if(!matches.length){restore();return;}
    rangeForInsertion=info.r.cloneRange();prefixForInsertion=prefix;suggested=matches;
    box.replaceChildren();
    const heading=document.createElement('span');heading.className='ed-gloss-intro';heading.textContent='Glosario · coincidencias para «'+prefix+'»';box.append(heading);
    for(const term of matches){
      const button=document.createElement('button');button.type='button';button.className='ed-gloss-option';
      button.dataset.term=term.term;
      const name=document.createElement('b');name.textContent=term.term;button.append(name);
      const detail=document.createElement('small');
      detail.textContent=[term.category,term.definition].filter(Boolean).join(' · ').slice(0,240);
      button.append(detail);box.append(button);
    }
    box.hidden=false;
  };
  const beforeInput=e=>{
    if(!checkbox.checked||composing||e.isComposing||e.inputType!=='insertText')return;
    if(e.data!=='.'&&e.data!=='-')return;
    const info=selection();if(!info)return;
    const start=document.createRange();start.selectNodeContents(info.block);start.setEnd(info.node,info.r.startOffset);
    const isAtBlockStart=start.toString()===info.before;
    const correction=typingCorrection(info.before,e.data,isAtBlockStart);
    if(!correction)return;
    e.preventDefault();
    const selected=info.r.cloneRange();
    selected.setStart(info.node,info.r.startOffset-correction.remove);
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(selected);
    const ok=document.execCommand('insertText',false,correction.insert);
    if(!ok){
      selected.deleteContents();const n=document.createTextNode(correction.insert);
      selected.insertNode(n);const caret=document.createRange();caret.setStart(n,n.length);
      caret.collapse(true);sel.removeAllRanges();sel.addRange(caret);change();
    }
  };
  const onInput=()=>{lastBlock=null;update();};
  const onClick=ev=>{
    const btn=ev.target.closest('button[data-term]');
    if(!btn||!box.contains(btn))return;
    const term=suggested.find(x=>x.term===btn.dataset.term);
    if(!term||!rangeForInsertion||!rangeForInsertion.collapsed)return restore();
    const original=rangeForInsertion.cloneRange();
    const node=original.startContainer,offset=original.startOffset;
    if(node.nodeType!==Node.TEXT_NODE||!doc.contains(node))return restore();
    if(offset<prefixForInsertion.length||node.data.slice(offset-prefixForInsertion.length,offset)!==prefixForInsertion)
      return restore();
    original.setStart(node,offset-prefixForInsertion.length);
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(original);
    const ok=document.execCommand('insertText',false,term.term);
    if(!ok){
      original.deleteContents();const n=document.createTextNode(term.term);original.insertNode(n);
      const caret=document.createRange();caret.setStart(n,n.length);caret.collapse(true);
      sel.removeAllRanges();sel.addRange(caret);change();
    }
    doc.focus();restore();
    toast('Término del glosario insertado');
  };
  const onKey=ev=>{if(ev.key==='Escape'&&!box.hidden){restore();}};
  doc.addEventListener('compositionstart',()=>{composing=true;restore();});
  const compositionEnd=()=>{composing=false;update();};
  doc.addEventListener('compositionend',compositionEnd);
  doc.addEventListener('beforeinput',beforeInput);
  doc.addEventListener('input',onInput);
  doc.addEventListener('keyup',update);
  doc.addEventListener('click',update);
  doc.addEventListener('keydown',onKey);
  box.addEventListener('click',onClick);
  checkbox.addEventListener('change',()=>{
    try{localStorage.setItem(TYPING_PREF_KEY,checkbox.checked?'1':'0');}catch{}
    toast(checkbox.checked?'Autocorrección tipográfica activada':'Autocorrección tipográfica desactivada');
  });
  return {update,clear:restore,dispose:()=>{restore();clearHighlight();doc.removeEventListener('beforeinput',beforeInput);doc.removeEventListener('input',onInput);doc.removeEventListener('keyup',update);doc.removeEventListener('click',update);doc.removeEventListener('keydown',onKey);doc.removeEventListener('compositionend',compositionEnd);box.removeEventListener('click',onClick);}};
}

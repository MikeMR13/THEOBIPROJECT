// Diálogos propios de El Obi: confirmación, aviso y solicitud de texto.
// Nunca utilizamos las ventanas nativas confirm(), alert() ni prompt().
// Un único diálogo, con cola para evitar superposiciones y foco restaurado.
let queue=Promise.resolve();
let overlay=null;
const css=`
.obi-native-dialog{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:clamp(14px,4vw,32px);background:rgba(0,0,0,.77);backdrop-filter:blur(4px);font-family:'IBM Plex Sans',system-ui,sans-serif}
.obi-native-dialog[hidden]{display:none}
.obi-native-panel{width:min(100%,510px);max-height:min(90dvh,800px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;padding:clamp(20px,4vw,30px);border:1px solid #9e7a36;border-top:3px solid #f2c230;border-radius:6px;background:#1a1711;color:#efe9da;box-shadow:0 24px 90px #000b;display:grid;gap:17px}
.obi-native-panel h2{font-family:'Shippori Mincho B1',Georgia,serif;font-size:clamp(20px,4vw,27px);line-height:1.3;margin:0;color:#f4efdf}
.obi-native-panel p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;margin:0;color:#d6c7ad;font-size:14px}
.obi-native-panel label{display:grid;gap:8px;color:#ded1b9;font-size:13px}
.obi-native-panel :is(input,textarea){box-sizing:border-box;display:block;width:100%;min-height:45px;padding:10px 12px;border:1px solid #79613e;border-radius:3px;background:#0e0c09;color:#f4ebd6;font:14px/1.5 inherit}
.obi-native-panel textarea{min-height:95px;resize:vertical}
.obi-native-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.obi-native-actions button{min-height:44px;padding:10px 18px;border:1px solid #a18a5b;border-radius:3px;background:#292218;color:#eee0c8;font:700 13px/1.4 'IBM Plex Sans',system-ui,sans-serif;cursor:pointer}
.obi-native-actions button[data-accept]{color:#171108;background:#f2c230;border-color:#f2c230}
.obi-native-panel :is(button,input,textarea):focus-visible{outline:2px solid #ffd76b;outline-offset:3px}
@media(max-width:480px){.obi-native-actions button{flex:1}}
@media(prefers-reduced-motion:reduce){.obi-native-dialog{backdrop-filter:none}}
`;
function mount(){
 if(typeof document==='undefined')return null;
 if(overlay?.isConnected)return overlay;
 if(!document.getElementById('obi-native-dialog-style')){
  const style=document.createElement('style');style.id='obi-native-dialog-style';style.textContent=css;document.head.append(style);
 }
 overlay=document.createElement('div');overlay.className='obi-native-dialog';overlay.hidden=true;
 overlay.setAttribute('role','presentation');
 document.body.append(overlay);
 return overlay;
}
async function display(type,message,opts={}){
 const host=mount();
 if(!host)return type==='confirm'?false:null;
 const prev=document.activeElement;
 const title=opts.title||(type==='confirm'?'Confirmar acción':type==='prompt'?'Escribe tu respuesta':'Aviso');
 host.hidden=false;
 const panel=document.createElement('section');panel.className='obi-native-panel';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const heading=document.createElement('h2');heading.textContent=title;heading.id='obi-dialog-heading';
 const info=document.createElement('p');info.id='obi-dialog-message';info.textContent=String(message||'');
 panel.setAttribute('aria-labelledby',heading.id);
 panel.setAttribute('aria-describedby',info.id);
 panel.append(heading,info);
 let entry;
 if(type==='prompt'){
  const label=document.createElement('label');label.textContent=opts.label||'Respuesta';
  entry=document.createElement(opts.multiline?'textarea':'input');entry.value=String(opts.defaultValue??'');
  if(!opts.multiline)entry.type='text';
  if(opts.maxLength)entry.maxLength=opts.maxLength;
  label.append(entry);panel.append(label);
 }
 const actions=document.createElement('div');actions.className='obi-native-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';
 const accept=document.createElement('button');accept.type='button';accept.dataset.accept='1';
 accept.textContent=opts.acceptLabel||(type==='prompt'?'Aceptar':type==='confirm'?'Confirmar':'Entendido');
 if(type!=='alert')actions.append(cancel);
 actions.append(accept);panel.append(actions);host.replaceChildren(panel);
 return new Promise(resolve=>{
  let done=false;
  const close=value=>{
   if(done)return;done=true;
   document.removeEventListener('keydown',key,true);
   host.hidden=true;host.replaceChildren();
   if(prev?.isConnected&&typeof prev.focus==='function')prev.focus();
   resolve(value);
  };
  const key=e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(type==='confirm'?false:null);}
   if(e.key==='Tab'){
    const controls=[...panel.querySelectorAll('button,input,textarea')].filter(x=>!x.disabled);
    if(!controls.length)return;
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key,true);
  cancel.onclick=()=>close(type==='confirm'?false:null);
  accept.onclick=()=>close(type==='confirm'?true:type==='prompt'?entry.value:true);
  host.onclick=e=>{if(e.target===host&&type!=='alert')close(type==='confirm'?false:null)};
  if(type==='prompt'&&!opts.multiline)entry.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();accept.click()}});
  (entry|| (type==='confirm'?cancel:accept)).focus();
 });
}
function enqueue(type,message,opts){
 const task=queue.catch(()=>{}).then(()=>display(type,message,opts));
 queue=task.then(()=>{},()=>{});
 return task;
}
export const confirmObi=(message,opts)=>enqueue('confirm',message,opts);
export const alertObi=(message,opts)=>enqueue('alert',message,opts);
export const promptObi=(message,defaultValue='',opts={})=>enqueue('prompt',message,{...opts,defaultValue});

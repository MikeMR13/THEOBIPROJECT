// Datos sintéticos y pantalla de preferencias real. Solo ejecutar desde el servidor de QA.
import {preferences} from '/profile.js';
import {readerPrefsPendingKey,readerPrefsKey} from '/reader-pref-cache.js';
const report=document.getElementById('result'), problems=[];
const check=(v,msg)=>{if(!v)problems.push(msg)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const app=document.getElementById('app');
const suffix=innerWidth+'-qa';
let user={id:'qa-A-'+suffix,email:'qa-A@example.invalid'};
let failSave=false;const profiles=new Map(),readers=new Map();
const initial=id=>({username:'lector_'+id,avatar_url:null,bio:'Perfil sintético',banner_url:null,
 seal_kanji:null,accent:'#f2c230',links:[],favorites:[],profile_visibility:'auth',
 profile_sections:{favs:true,seals:true,shelves:false,reviews:false},discoverable:true,
 show_since:true,hide_reading:false,public_activity:false,hidden_series:[],
 notify:{web:{},email:{},freq:'off'},ui_prefs:{}});
const P=id=>{if(!profiles.has(id))profiles.set(id,initial(id));return profiles.get(id)};
const clone=x=>JSON.parse(JSON.stringify(x));
const rows=(name,filters)=>{
 const id=filters.user_id||filters.id||user.id;
 if(name==='reader_prefs')return readers.has(id)?[clone(readers.get(id))]:[];
 if(name==='profiles')return [clone(P(id))];
 return [];
};
const sb={
 rpc:name=>{
  if(name==='my_profile')return Promise.resolve({data:clone(P(user.id)),error:null});
  if(name==='deletion_preview')return Promise.resolve({data:{requested_at:null,teams:[]},error:null});
  if(name==='favorite_candidates')return Promise.resolve({data:[],error:null});
  throw Error('RPC inesperada: '+name);
 },
 from(name){
  return {
   filters:{},patch:null,
   select(){return this},eq(k,v){this.filters[k]=v;return this},in(){return this},
   async single(){return {data:rows(name,this.filters)[0]||null,error:null}},
   async maybeSingle(){return {data:rows(name,this.filters)[0]||null,error:null}},
   update(v){this.patch=v;return this},
   async upsert(v){
    if(name!=='reader_prefs')throw Error('Upsert no previsto: '+name);
    if(failSave){failSave=false;return {error:{message:'Red simulada caída'}}}
    readers.set(v.user_id,clone(v));return {error:null};
   },
   then(yes,no){
    const result=(async()=>{
      if(this.patch){
       if(name!=='profiles')throw Error('Actualización no prevista');
       const id=this.filters.id;if(id!==user.id)return {error:{message:'Cuenta incorrecta'}};
       Object.assign(P(id),clone(this.patch));return {error:null};
      }
      return {data:rows(name,this.filters),error:null};
    })();
    return result.then(yes,no);
   }
  }
 }
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastRoute=Promise.resolve();
const C={sb,app,esc,url:'https://fake.invalid',toast:()=>{},getUser:()=>user,
 setProfile:patch=>Object.assign(P(user.id),clone(patch)),getProfile:()=>P(user.id),
 reload:()=>{},uploadAvatar:async()=>{},
 go:path=>{history.pushState({},'',path);lastRoute=preferences(C);return lastRoute}};
const open=async path=>{history.replaceState({},'',path);await preferences(C)};
const click=s=>{const x=app.querySelector(s);if(!x)throw Error('Control ausente: '+s);x.click();return x};
const preview=()=>app.querySelector('#pv-preview')?.textContent||'';
try{
 window.confirm=()=>true;
 await open('/preferencias?s=privacidad');
 check(app.querySelector('#pf-mobile-tab')?.options.length===8,'Navegación no conserva 8 secciones');
 check(preview().includes('iniciar sesión'),'Vista invitada no respeta privacidad');
 click('[data-pv-audience="auth"]');
 check(preview().includes('Favoritas')&&preview().includes('Sellos'),'Vista autenticada sin secciones');
 click('[data-pv-audience="guest"]');
 check(preview().includes('iniciar sesión'),'Alternancia de audiencia no se repite');
 click('#s-shelves');await sleep(35);
 click('[data-pv-audience="auth"]');
 check(preview().includes('Estanterías'),'Vista de privacidad no se actualiza tras guardar');
 check(P(user.id).profile_sections.shelves===true,'Visibilidad no se guardó');
 const radio=app.querySelector('input[name=vis][value=all]');
 radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
 await sleep(45);click('[data-pv-audience="guest"]');
 check(preview().includes('Favoritas'),'Cambio a público no habilitó secciones');

 await open('/preferencias?s=avisos');
 const mail=()=>app.querySelector('#e-capitulo');
 check(mail()?.disabled===true,'Correo en pausa permanece editable');
 check(mail()?.getAttribute('aria-pressed')==='true','Pausa eliminó selección del correo');
 let freq=app.querySelector('input[name=fq][value=inmediato]');
 freq.checked=true;freq.dispatchEvent(new Event('change',{bubbles:true}));await sleep(40);
 check(mail()?.disabled===false,'Activar frecuencia no habilitó correo');
 click('#e-capitulo');await sleep(40);
 check(P(user.id).notify.email.capitulo===false,'Canal de correo no se guardó');
 freq=app.querySelector('input[name=fq][value=off]');
 freq.checked=true;freq.dispatchEvent(new Event('change',{bubbles:true}));await sleep(40);
 check(mail()?.disabled===true&&mail()?.getAttribute('aria-pressed')==='false','Correo pausado no conservó selección');
 check(app.textContent.includes('El correo está pausado'),'Resumen de avisos ausente');

 await open('/preferencias?s=lectura');
 const status=()=>app.querySelector('#lc-sync')?.textContent||'';
 click('[data-k=theme][data-v=sepia]');await sleep(240);
 check(readers.get(user.id)?.global.theme==='sepia','No se sincroniza lectura');
 check(status().includes('Guardado en tu cuenta'),'Falta confirmación de servidor');
 failSave=true;click('[data-k=theme][data-v=claro]');await sleep(240);
 check(!!localStorage.getItem(readerPrefsPendingKey(user.id)),'Pérdida de borrador sin conexión');
 check(status().includes('pendiente de sincronizar'),'Fallo de sincronización no informado');
 await open('/preferencias?s=lectura');await sleep(70);
 check(readers.get(user.id)?.global.theme==='claro','Reentrada no recuperó borrador');
 check(!localStorage.getItem(readerPrefsPendingKey(user.id)),'No limpia borrador tras confirmación');

 const oldUser=user.id;
 user={id:'qa-B-'+suffix,email:'qa-B@example.invalid'};
 // El estado visual residual de A no puede pasar a Preferencias de B.
 window.__obiUI={contrast:true,underline:true,motion:'reduce'};
 await open('/preferencias?s=pantalla');
 check(app.querySelector('#a-contrast')?.getAttribute('aria-pressed')==='false','B heredó contraste de A');
 check(app.querySelector('#a-underline')?.getAttribute('aria-pressed')==='false','B heredó subrayado de A');
 check(app.querySelector('input[name=mo][value=system]')?.checked===true,'B heredó movimiento reducido de A');
 await open('/preferencias?s=lectura');
 check(!readers.has(user.id),'Cuenta B heredó lectura de A');
 check(!localStorage.getItem(readerPrefsKey(user.id)),'Cuenta B tiene caché de A');
 check(!!localStorage.getItem(readerPrefsKey(oldUser)),'Cuenta A perdió su caché');

 await open('/preferencias');
 const bio=app.querySelector('#bio');
 if(!bio)throw Error('Campo bio ausente');
 bio.value='Borrador de cuenta B';bio.dispatchEvent(new Event('input',{bubbles:true}));
 check((app.querySelector('#pf-st')?.textContent||'').includes('Borrador'),'No aparece aviso de cambios');
 window.confirm=()=>false;
 const mobile=app.querySelector('#pf-mobile-tab');
 mobile.value='privacidad';mobile.dispatchEvent(new Event('change',{bubbles:true}));
 await sleep(35);
 check(location.search===''&&mobile.value==='perfil','Cancelar navegación ignorado');
 window.confirm=()=>true;
 mobile.value='privacidad';mobile.dispatchEvent(new Event('change',{bubbles:true}));
 await lastRoute;
 check(location.search.includes('privacidad'),'Selector móvil no cambia pestaña');
 await open('/preferencias');
 check(app.querySelector('#bio')?.value==='Borrador de cuenta B','No recuperó borrador de perfil');
 check(!localStorage.getItem('obi-profile-draft:user:'+oldUser),'Borrador cruzado de A');

 const width=document.documentElement.clientWidth,mobileScreen=width<=760;
 check((getComputedStyle(app.querySelector('.pf-mobile-nav')).display!=='none')===mobileScreen,'Selector móvil mal ubicado');
 check((getComputedStyle(app.querySelector('.pf-nav')).display==='none')===mobileScreen,'Navegación lateral mal ubicada');
 for(const s of ['.pf-tg','.pf-sw button','.pf-favs .pf-x']){
  const e=app.querySelector(s);if(!e)continue;
  const rect=e.getBoundingClientRect();
  check(rect.width>=43&&rect.height>=43,'Objetivo táctil insuficiente: '+s);
 }
 check(document.documentElement.scrollWidth<=width+3,'Desbordamiento horizontal '+width);
}catch(e){problems.push('Excepción: '+(e.stack||e.message))}
report.dataset.qaStatus=problems.length?'fail':'pass';
report.textContent=problems.length?problems.join(' | '):'Chromium '+innerWidth+'px: navegación, privacidad, avisos, sincronización y cuentas OK';
window.parent.postMessage({type:'qa-result',width:innerWidth,errors:problems},'*');

// Datos sintéticos y pantalla de preferencias real. Solo ejecutar desde el servidor de QA.
import {preferences, publicProfile} from '/profile.js';
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
let publicScenario='rich';
const sb={
 rpc:name=>{
  if(name==='my_profile')return Promise.resolve({data:clone(P(user.id)),error:null});
  if(name==='deletion_preview')return Promise.resolve({data:{requested_at:null,teams:[]},error:null});
  if(name==='favorite_candidates')return Promise.resolve({data:[],error:null});
  if(name==='platform_patron')return Promise.resolve({data:false,error:null});
  if(name==='reader_public')return Promise.resolve({data:{
    username:'OX-MRTRADUCCIONES',private:publicScenario==='private'?'auth':false,accent:'#f2c230',banner_url:'https://fake.invalid/portada.jpg',
    avatar_url:null,kanji:'書',bio:publicScenario==='empty-bio'?'':'Mi biblioteca de novelas ligeras',since:'2026-10-01T00:00:00Z',
    links:[{k:'facebook',url:'https://facebook.com/ejemplo'}],
    favorites:[{slug:'a',title:'Una novela con un título bastante largo',color:'#58402b',cover_path:null},
      {slug:'b',title:'Segunda novela',color:'#352e49',cover_path:null},
      {slug:'c',title:'Tercera novela',color:'#294958',cover_path:null}],
    stats:{chapters:0,month:0,series:0,finished:0,following:2},public_activity:true,
    seals:{donor:false,chapters:12,reviews:3},sections:{favorite_genres:['Fantasía','Misterio','Romance','Código malicioso']},hide_reading:publicScenario==='hidden-reading',
    shelves:{
      reading:{n:4,items:[
        {slug:'read-1',title:'Lectura primera',color:'#563922',cover_path:null},
        {slug:'read-2',title:'Lectura segunda',color:'#202b50',cover_path:null},
        {slug:'read-3',title:'Lectura tercera',color:'#48412a',cover_path:null},
        {slug:'read-4',title:'Lectura cuarta',color:'#422a43',cover_path:null}
      ]},
      done:{n:2,items:[{slug:'done-1',title:'Terminada',color:'#305234',cover_path:null}]},
      plan:{n:5,items:[{slug:'plan-1',title:'Pendiente',color:'#595036',cover_path:null}]}
    },
    reviews:[
      {series:{slug:'a',title:'Una reseña spoiler',color:'#58402b',cover_path:null},body:'Gran revelación secreta',stars:4,spoiler:true,at:'2026-10-20T10:00:00Z'},
      {series:{slug:'b',title:'Opinión sin spoilers',color:'#252b55',cover_path:null},body:'Me gustó el mundo y sus personajes',stars:5,spoiler:false,at:'2026-10-21T11:00:00Z'}
    ]
  },error:null});
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

 // QA del catálogo real: 32 opciones, búsqueda, categorías, selección y personalización.
 check(app.querySelectorAll('[data-seal-pick]').length===32,'Catálogo no muestra 32 sellos');
 const querySeal=app.querySelector('#seal-query');
 querySeal.value='mago';querySeal.dispatchEvent(new Event('input',{bubbles:true}));
 check(app.querySelectorAll('[data-seal-pick]').length===1 && !!app.querySelector('[data-seal-pick="魔"]'),'Búsqueda de sellos incorrecta');
 querySeal.value='';querySeal.dispatchEvent(new Event('input',{bubbles:true}));
 const categorySeal=app.querySelector('#seal-category');
 categorySeal.value='Aventura';categorySeal.dispatchEvent(new Event('change',{bubbles:true}));
 check(app.querySelectorAll('[data-seal-pick]').length===8,'Filtro de Aventura incorrecto');
 categorySeal.value='Todas';categorySeal.dispatchEvent(new Event('change',{bubbles:true}));
 click('[data-seal-pick="魔"]');
 check((app.querySelector('#pf-live-card .lc-seal-name')?.textContent||'').includes('El Mago'),'Vista previa de apodo ausente');
 check((app.querySelector('#seal-selected')?.textContent||'').includes('Significado del kanji'),'Descripción del sello ausente');
 click('#seal-custom-toggle');
 const manualSeal=app.querySelector('#kj');
 check(manualSeal&&!manualSeal.disabled,'No se habilita el kanji personalizado');
 manualSeal.value='猫';manualSeal.dispatchEvent(new Event('input',{bubbles:true}));
 check((app.querySelector('#pf-live-card .lc-kj')?.textContent||'')==='猫','Kanji personalizado no aparece');
 click('#seal-clear');
 check(!app.querySelector('#pf-live-card .lc-kj'),'Sin sello no oculta el kanji');

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

 const width=document.documentElement.clientWidth,mobileScreen=matchMedia('(max-width: 760px)').matches;
 check((getComputedStyle(app.querySelector('.pf-mobile-nav')).display!=='none')===mobileScreen,'Selector móvil mal ubicado');
 check((getComputedStyle(app.querySelector('.pf-nav')).display==='none')===mobileScreen,'Navegación lateral mal ubicada');
 for(const s of ['.pf-tg','.pf-sw button','.pf-fav-remove']){
  const e=app.querySelector(s);if(!e)continue;
  const rect=e.getBoundingClientRect();
  check(rect.width>=43&&rect.height>=43,'Objetivo táctil insuficiente: '+s);
 }
 check(document.documentElement.scrollWidth<=width+3,'Desbordamiento horizontal '+width);

 // Carnet público real, con backend simulado y contenido no privado.
 const statsHTML=st=>'<div class="st-grid">'+[
  [st.chapters,'capítulos leídos'],[st.month,'en los últimos 30 días'],
  [st.series,'obras empezadas'],[st.finished,'obras terminadas'],
  [st.following,'obras seguidas']
 ].map(([n,label])=>'<div class="st-k"><b>'+n+'</b><span>'+label+'</span></div>').join('')+'</div>';
 await publicProfile({...C,statsHTML},'OX-MRTRADUCCIONES');
 const publicCard=app.querySelector('.lc-public .lc-public-card');
 const coverStage=publicCard?.querySelector('.lc-cover-stage');
 const coverBg=coverStage?.querySelector('.lc-bg');
 check(!!publicCard&&!!coverStage,'No se encontró la cabecera editorial pública');
 check(!!coverBg&&getComputedStyle(coverBg).backgroundSize==='cover','La portada no ocupa toda la superficie');
 check(!!coverBg&&getComputedStyle(coverBg).backgroundImage!=='none','No se está mostrando la portada original');
 check(!!coverBg&&['none','normal'].includes(getComputedStyle(coverBg,'::before').content),'Quedó una capa añadida a la portada');
 check(!!coverBg&&['none','normal'].includes(getComputedStyle(coverBg,'::after').content),'Quedó un fondo superpuesto');
 check(!!coverStage&&!coverStage.querySelector('.lc-sh:not([style])')?.getBoundingClientRect().height,'La portada conserva una capa de sombra');
 const nameRow=publicCard.querySelector('.lc-name-row');
 check(!!nameRow&&nameRow.querySelector('h1')?.nextElementSibling?.classList.contains('lc-seal-pop'),'El sello no está inmediatamente después del nombre');
 if(nameRow&&innerWidth>=1200){
  const nameRect=nameRow.querySelector('h1').getBoundingClientRect();
  const sealRect=nameRow.querySelector('.lc-seal-pop').getBoundingClientRect();
  check(Math.abs(nameRect.top-sealRect.top)<25,'Nombre y sello no comparten fila en escritorio');
 }
 check(publicCard.querySelector('.lc-seal-name')?.textContent==='El Escriba','Apodo de lector incorrecto');
 check(!publicCard.querySelector('.lc-cover-stage .lc-seal-pop'),'El sello regresó encima de la portada');
 const sealSummary=publicCard.querySelector('.lc-seal-pop summary');
 sealSummary?.click();
 check(!!publicCard.querySelector('.lc-seal-pop details[open]'),'La explicación del sello no se puede desplegar');
 check(app.querySelectorAll('.lc-public .lc-fav a').length===3,'Favoritas no muestran las tres obras');
 check(getComputedStyle(app.querySelector('.lc-fav')).justifyContent==='center','Favoritas no quedan equilibradas');
 check(app.querySelectorAll('.lc-public .lc-stats .st-k').length===5,'Estadísticas no tienen tarjetas');
 const firstStat=app.querySelector('.lc-public .lc-stats .st-k');
 check(getComputedStyle(firstStat).borderTopWidth!=='0px','Estadísticas sin énfasis de tarjeta');
 check(firstStat?.querySelector('b')?.textContent==='0','El cero de las estadísticas desapareció');
 check(app.querySelector('.lc-about p')?.textContent==='Mi biblioteca de novelas ligeras','La biografía no aparece en Sobre mí');
 check(!app.querySelector('.lc-public-card .lc-tx p'),'La biografía sigue duplicada en el encabezado');
 check(app.querySelectorAll('.lc-genre-chip').length===3,'No se mostraron los tres géneros favoritos');
 check(!app.querySelector('.lc-genres')?.textContent.includes('Código malicioso'),'El filtro permitió un género no admitido');
 check(app.querySelector('.lc-public .lc-badges-grid')?.textContent.includes('El Escriba'),'La galería de sellos no explica el sello seleccionado');
 check(app.querySelector('.lc-public .lc-badges-grid')?.textContent.includes('Más de 10 capítulos'),'Se perdieron los sellos de actividad');
 check(!!app.querySelector('#lc-share'),'Falta el botón Compartir carnet');
 check(app.querySelectorAll('.lc-reading-item').length===3,'Leyendo actualmente no respeta el máximo de tres');
 check(app.querySelectorAll('.lc-shelf-tile').length===3,'El resumen de estanterías no incluye tres categorías');
 check(app.querySelector('.lc-shelf-summary')?.textContent.includes('4'),'El conteo de lecturas no corresponde a la estantería visible');
 check(app.querySelectorAll('.lc-rv article').length===2,'Faltan reseñas');
 check(!!app.querySelector('.lc-review-spoiler:not([open])'),'Las reseñas spoiler no están inicialmente ocultas');
 check(![...app.querySelectorAll('.lc-review-main > p')].some(p=>p.textContent.includes('Gran revelación secreta')),'La reseña spoiler está visible fuera de su desplegable');
 const shelfDone=app.querySelector('[data-sh="done"]');
 shelfDone?.click();
 check(app.querySelector('#lc-shb')?.textContent.includes('Terminada'),'Cambiar estantería no actualiza la biblioteca');
 const publicSections=['.lc-public-card','.lc-about','.lc-genres','.lc-reading','.lc-fav','.lc-shelf-nav','.lc-rv','.lc-badges','.lc-stats'];
 const positions=publicSections.map(sel=>app.querySelector(sel)?.getBoundingClientRect().top);
 check(positions.every(Number.isFinite)&&positions.every((n,i)=>i===0||n>=positions[i-1]),'Orden incorrecto de las secciones del perfil');
 const pageWidth=document.documentElement.clientWidth;
 check(document.documentElement.scrollWidth<=pageWidth+3,'Desbordamiento del carnet público a '+pageWidth+'px');
 // Probar permisos: la sección de lectura y la pestaña deben desaparecer cuando está oculta.
 publicScenario='hidden-reading';
 await publicProfile({...C,statsHTML},'OX-MRTRADUCCIONES');
 check(!app.querySelector('.lc-reading'),'Se filtró la estantería Leyendo oculta');
 check(!app.querySelector('[data-sh="reading"]'),'La estantería Leyendo oculta se ofrece para explorar');
 check(!app.querySelector('.lc-shelf-summary')?.textContent.includes('Leyendo'),'El resumen revela el contador de lecturas ocultas');
 publicScenario='empty-bio';
 await publicProfile({...C,statsHTML},'OX-MRTRADUCCIONES');
 check(!app.querySelector('.lc-about'),'La biografía vacía ocupa espacio para visitantes');
 publicScenario='private';
 await publicProfile({...C,statsHTML},'OX-MRTRADUCCIONES');
 check(!app.querySelector('.lc-reading')&&!app.querySelector('.lc-rv')&&!app.querySelector('.lc-genres')&&!app.querySelector('#lc-share'),'Un perfil privado expone información del carnet');
 check(app.textContent.includes('Inicia sesión'),'Falta protección de perfil privado');
 publicScenario='rich';
 // Verificar también que la vista previa en Preferencias use la fila de nombre y kanji.
 await open('/preferencias');
 const liveNameRow=app.querySelector('#pf-live-card .lc-name-row');
 check(!!liveNameRow&&!!liveNameRow.querySelector('h1'),'La vista previa perdió la nueva fila de identidad');
 check(!!app.querySelector('#pf-live-card .lc-about'),'La vista previa no muestra Sobre mí');
 // Selección: límite de 3, borrador, guardado y conservación al cambiar privacidad.
 check(app.querySelectorAll('[data-genre]').length===12,'No hay 12 géneros en el editor');
 click('[data-genre="Fantasía"]');
 click('[data-genre="Misterio"]');
 click('[data-genre="Romance"]');
 check(app.querySelectorAll('[data-genre][aria-pressed="true"]').length===3,'No marca tres géneros elegidos');
 click('[data-genre="Terror"]');
 check(app.querySelectorAll('[data-genre][aria-pressed="true"]').length===3,'Se superó el límite de géneros');
 check(app.querySelectorAll('#pf-live-card .lc-genre-chip').length===3,'La vista previa no refleja los géneros');
 click('#save');await sleep(70);
 check(P(user.id).profile_sections?.favorite_genres?.join('|')==='Fantasía|Misterio|Romance','El guardado no persiste los géneros elegidos');
 await open('/preferencias?s=privacidad');
 click('#s-reviews');await sleep(40);
 check(P(user.id).profile_sections?.favorite_genres?.length===3,'Cambiar privacidad eliminó los géneros guardados');
}catch(e){problems.push('Excepción: '+(e.stack||e.message))}
report.dataset.qaStatus=problems.length?'fail':'pass';
report.textContent=problems.length?problems.join(' | '):'Chromium '+innerWidth+'px: navegación, privacidad, avisos, sincronización y cuentas OK';
window.parent.postMessage({type:'qa-result',width:innerWidth,errors:problems},'*');

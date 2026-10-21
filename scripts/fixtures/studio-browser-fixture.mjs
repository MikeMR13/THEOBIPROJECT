// Navegador real con DOM y Supabase simulados; ninguna conexión a datos reales.
import { createStudio } from '/studio.js?v=qa';
const result = document.getElementById('qa-result');
const app = document.getElementById('app');
const failures = [];
addEventListener('unhandledrejection', e => { failures.push(String(e.reason)); });
addEventListener('error', e => { failures.push(String(e.error || e.message)); });
const ok = (v, message) => { if (!v) throw new Error(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (fn, label) => {
  for (let t=0;t<5000;t+=25) {
    if (fn()) return;
    await pause(25);
  }
  throw new Error('No se completó: '+label);
};

function factory({create=true,importRole=true,edit=true,publish=true,deleteRole=false}={}) {
  const calls = [], inserted=[], redirects=[], messages=[];
  const team={id:'00000000-0000-4000-8000-000000000001',slug:'equipo-qa',name:'Equipo QA',role:'owner'};
  const permissions={view:true,create,import:importRole,edit,publish,schedule:true,delete:deleteRole,review:true};
  const sb={
    rpc(name){
      calls.push('rpc:'+name);
      return Promise.resolve({data:name==='my_team_permissions'?permissions:[]});
    },
    storage:{
      from(bucket){
        return {
          list(path,opts){calls.push('storage:list:'+bucket);return Promise.resolve({data:[],error:null});},
          upload(){throw new Error('Se intentó escribir Storage en un entorno simulado');},
          remove(){throw new Error('Se intentó borrar Storage en un entorno simulado');}
        };
      }
    },
    from(table){
      calls.push('from:'+table);
      const q={
        _select:'',_insert:null,_type:'',_count:false,
        select(columns,opts){this._select=columns;this._count=!!opts?.head;return this;},
        eq(){return this;},is(){return this;},order(){return this;},not(){return this;},
        gte(){return this;},or(){return this;},ilike(){return this;},limit(){return this;},in(){return this;},
        insert(row){this._insert=row;calls.push('insert:'+table);inserted.push({table,row});return this;},
        one(){
          if(this._insert){
            return {data:table==='series'
              ? {id:'00000000-0000-4000-8000-000000000002',slug:this._insert.slug,title:this._insert.title}
              : table==='volumes'
              ? {id:'00000000-0000-4000-8000-000000000003',num:1}
              : {id:'00000000-0000-4000-8000-000000000004'},error:null};
          }
          if(table==='team_members') return this._select.includes('team_roles')
            ?{data:{team_roles:{name:'Propietario'}},error:null}
            :{data:[{role:'owner',teams:team}],error:null};
          if(table==='teams')return {data:{settings:{timezone:'America/Monterrey'}},error:null};
          if(table==='chapters' && this._select.includes('*, series('))return {data:null,error:null};
          return {data:[],count:0,error:null};
        },
        single(){return Promise.resolve(this.one())},
        maybeSingle(){return Promise.resolve(this.one())},
        then(resolve,reject){return Promise.resolve(this.one()).then(resolve,reject)}
      };
      return q;
    }
  };
  const ctx={
    sb,app,$:sel=>app.querySelector(sel),esc:v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    toast:s=>messages.push(String(s)),go:path=>redirects.push(path),
    getUser:()=>({id:'00000000-0000-4000-8000-000000000005'}),getMe:()=>({platform_role:'member'}),
    url:'https://no-backend.invalid'
  };
  return {studio:createStudio(ctx),calls,inserted,redirects,messages};
}
let checks=0;
try {
  ok(location.hostname==='127.0.0.1','Solo ejecutar en loopback');
  const owner=factory();
  await owner.studio.newWork();
  checks++;
  ok(!!app.querySelector('#nw-title'),'Nueva obra no se renderiza');
  // El menú compacto conserva el estado accesible, puede cerrarse con Escape
  // y permite volver al sitio sin abandonar las pantallas de Estudio.
  const navBtn=app.querySelector('#s2-mobile-toggle'), sidebar=app.querySelector('.s2-side');
  ok(!!navBtn && !!sidebar && !!app.querySelector('.s2-nav a'),'Faltan controles de navegación de Estudio');
  if(window.innerWidth<=860){
    ok(navBtn.getAttribute('aria-expanded')==='false','El menú móvil debe empezar cerrado');
    navBtn.click();
    ok(sidebar.classList.contains('nav-open') && navBtn.getAttribute('aria-expanded')==='true','El menú móvil no abre');
    ok(getComputedStyle(app.querySelector('.s2-back')).display!=='none','Volver al sitio no es accesible en móvil');
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    ok(!sidebar.classList.contains('nav-open') && navBtn.getAttribute('aria-expanded')==='false','Escape no cierra el menú');
  }
  checks++;

  // Fase 4: una sola navegación activa; controles emergentes accesibles
  // y cierre sin búsquedas tardías que vuelvan a desplegar resultados.
  const navItems=[...app.querySelectorAll('.s2-nav a')];
  ok(navItems.length===13 && !navItems.some(a=>a.getAttribute('href')==='/estudio/bitacora'),'Los permisos del mock deben ocultar la Bitácora sin permiso log');
  ok(navItems.filter(a=>a.getAttribute('aria-current')==='page').length===1,'Debe haber exactamente una sección activa');
  ok(navItems.every(a=>a.getAttribute('href')?.startsWith('/estudio')),'Ruta inesperada en el menú');
  checks++;
  const bell=app.querySelector('#st-bell'),bellPanel=app.querySelector('#st-bell-list');
  ok(bell?.getAttribute('aria-controls')===bellPanel?.id,'Avisos sin relación accesible');
  bell.click();
  await until(()=>bellPanel.hidden===false && bell.getAttribute('aria-expanded')==='true','abrir avisos');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  ok(bellPanel.hidden===true && bell.getAttribute('aria-expanded')==='false','Escape no cierra avisos');
  const search=app.querySelector('#st-q'),results=app.querySelector('#st-q-res');
  ok(search?.getAttribute('aria-controls')===results?.id,'Buscador sin referencia de resultados');
  search.value='Crónicas'; search.dispatchEvent(new Event('input',{bubbles:true}));
  await until(()=>results.hidden===false && search.getAttribute('aria-expanded')==='true','abrir resultados de búsqueda');
  document.body.click();
  ok(results.hidden===true && search.getAttribute('aria-expanded')==='false','Buscador no cierra al tocar fuera');
  await pause(150);
  ok(results.hidden===true,'Resultados antiguos reaparecieron tras cerrarse');
  search.value='Otra obra'; search.dispatchEvent(new Event('input',{bubbles:true}));
  document.body.click();
  await pause(350);
  ok(results.hidden===true && search.getAttribute('aria-expanded')==='false','Una búsqueda diferida reabrió un panel cerrado');
  checks++;

  ok(!!document.getElementById('st2-css')?.sheet,'Studio no cargó su CSS');
  const resources=performance.getEntriesByType('resource').map(e=>e.name);
  ok(!resources.some(u=>/studio-(?:editor|importer|media)\.js/.test(u)),
    'El arranque precargó módulos pesados');
  checks++;
  const title=app.querySelector('#nw-title');
  title.value='Crónicas del Dragón';
  title.dispatchEvent(new Event('input',{bubbles:true}));
  app.querySelector('#nw-go').click();
  await until(()=>app.querySelector('#nw-v'),'crear obra');
  ok(owner.inserted.length===1,'No se insertó una obra en el mock');
  ok(owner.inserted[0].row.slug==='cronicas-del-dragon','Slug incorrecto');
  ok(owner.inserted[0].row.work_type==='Novela ligera','Tipo editorial incompleto');
  ok(owner.inserted[0].row.published===false,'La obra no nace privada');
  checks++;
  app.querySelector('#nw-v').click();
  await until(()=>owner.redirects.includes('/estudio/editar/00000000-0000-4000-8000-000000000004'),
    'crear volumen y capítulo');
  ok(owner.inserted.map(x=>x.table).join(',')==='series,volumes,chapters',
    'Secuencia de creación incorrecta');
  ok(owner.inserted[1].row.status==='draft' && owner.inserted[2].row.status==='draft',
    'Volumen/capítulo publicado por defecto');
  checks++;

  const denied=factory({create:false,importRole:false,edit:false,publish:false});
  await denied.studio.newWork();
  ok(app.textContent.includes('no permite crear obras'),'Nueva obra sin permiso no fue bloqueada');
  ok(denied.inserted.length===0,'Rol no autorizado pudo escribir');
  checks++;
  await denied.studio.importer();
  ok(app.textContent.includes('no permite importar archivos'),'Importador sin permiso no fue bloqueado');
  ok(!denied.calls.includes('insert:series'),'Importador no autorizado escribió datos');
  checks++;
  await denied.studio.library();
  ok(app.textContent.includes('Multimedia'),'No se pudo abrir biblioteca en solo lectura');
  ok(!app.querySelector('#delsel') && !app.querySelector('#upl'),
    'Aparecen controles de subida/eliminación sin permisos');
  checks++;

  await owner.studio.importer();
  ok(!!app.querySelector('#wiz'),'No se muestra el asistente de importación');
  checks++;
  const filePicker=app.querySelector('#file');
  ok(!!filePicker,'No se muestra el selector de EPUB/DOCX/PDF');
  const tooLarge=new File(['x'],'grande.epub',{type:'application/epub+zip'});
  Object.defineProperty(tooLarge,'size',{value:80*1024*1024+1});
  filePicker.onchange({target:{files:[tooLarge]}});
  await until(()=>app.querySelector('#status')?.textContent.includes('supera 80 MB'),
    'rechazo del archivo sobredimensionado');
  ok(!owner.inserted.some(x=>x.table==='import_jobs'),'Un archivo inválido inició importación');
  checks++;
  filePicker.onchange({target:{files:[new File(['prueba'],'incompatible.txt',{type:'text/plain'})]}});
  await until(()=>app.querySelector('#status')?.textContent.includes('Formato no admitido'),
    'rechazo del formato no permitido');
  ok(!owner.inserted.some(x=>x.table==='import_jobs'),'El formato no admitido inició importación');
  checks++;
  await owner.studio.editor('00000000-0000-4000-8000-000000000009');
  ok(owner.redirects.includes('/estudio'),'Editor no respeta capítulo no accesible');
  checks++;
  const lateResources=performance.getEntriesByType('resource').map(e=>e.name);
  for(const name of ['studio-editor.js','studio-importer.js','studio-media.js']){
    ok(lateResources.some(u=>u.includes(name)),name+' no se cargó bajo demanda');
  }
  checks++;
  // Fase 6.4: EPUB enriquecido real y edición de defaults en DOM local.
  const { renderBlock } = await import('/blocks.js');
  const epub = document.createElement('article');
  epub.className = 'rd-body';
  epub.innerHTML = renderBlock({ type:'paragraph', html:'<strong>Negrita</strong> <em>Cursiva</em> <ruby>漢字<rt>かんじ</rt></ruby> <span data-epub-family="0">Fuente original</span>' },0)
    + renderBlock({ type:'image', url:'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E', alt:'Ilustración', w:1600,h:900 },1,{ illus:true });
  app.append(epub);
  ok(!!epub.querySelector('strong') && !!epub.querySelector('em'),'EPUB perdió negritas o cursivas');
  ok(epub.querySelector('ruby rt')?.textContent==='かんじ','Se perdió el furigana EPUB');
  ok(epub.querySelector('span[style*="--f0"]'),'Se perdió la fuente de fragmento EPUB');
  ok(!!epub.querySelector('img[loading="lazy"]'),'Se perdió la ilustración EPUB');
  ok(renderBlock({type:'image',url:'/imagen.svg'},2,{illus:false}).includes('Ilustración oculta'),'No se respeta ocultar ilustraciones');
  checks++;
  const { mountTeamReaderDefaults } = await import('/studio-reader-defaults.js');
  const place = document.createElement('div');place.className='s2-main';app.append(place);
  const writes=[];
  const mockDefaults = {from(table) {
    ok(table==='teams','Editor consultó otra tabla');
    return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{reader_defaults:{theme:'sepia',size:22,font:'original'}}}),
      update(data){writes.push(data);this.patch=data;return this},single:async()=>({data:{reader_defaults:this.patch.reader_defaults}})};
  }};
  await mountTeamReaderDefaults({app,sb:mockDefaults,teamId:'t-qa',allowed:()=>true,notify:()=>{},esc:s=>String(s)});
  ok(!!app.querySelector('#s2-reader-def'),'No aparece el editor de predeterminados del equipo');
  const font=app.querySelector('[data-rd-key="font"]');
  ok(font.value==='original','No se cargó la preferencia previa');
  font.value='serif';font.dispatchEvent(new Event('change',{bubbles:true}));
  app.querySelector('#s2-rd-save').click();
  await until(()=>writes.length===1,'guardar predeterminados');
  ok(writes[0].reader_defaults.font==='serif' && writes[0].reader_defaults.theme==='sepia','Se perdió la configuración anterior');
  ok(Object.keys(writes[0]).join(',')==='reader_defaults','El editor sobrescribió columnas ajenas');
  app.querySelector('#s2-rd-reset').click();
  app.querySelector('#s2-rd-save').click();
  await until(()=>writes.length===2,'restaurar predeterminados');
  ok(Object.keys(writes[1].reader_defaults).length===0,'No se limpió el formato predeterminado');
  checks++;
  ok(!failures.length,'Errores del navegador: '+failures.join(' | '));
  const width=document.documentElement.scrollWidth;
  const viewport=document.documentElement.clientWidth;
  ok(width<=viewport+16,'Desbordamiento horizontal significativo: '+width+' vs '+viewport);
  checks++;
  result.dataset.qaStatus='pass';
  result.textContent='QA_BROWSER_PASS '+checks+' comprobaciones; viewport='+viewport;
  if(window.parent!==window)window.parent.postMessage({qa:'studio-browser',status:'pass',text:result.textContent},location.origin);
} catch (e) {
  result.dataset.qaStatus='fail';
  result.textContent='QA_BROWSER_FAIL '+String(e?.stack||e)+' | errors='+failures.join(',');
  if(window.parent!==window)window.parent.postMessage({qa:'studio-browser',status:'fail',text:result.textContent},location.origin);
  console.error(e);
}

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

function factory({create=true,importRole=true,edit=true,publish=true,deleteRole=false,existingWork=false}={}) {
  const calls = [], inserted=[], redirects=[], messages=[];
  const team={id:'00000000-0000-4000-8000-000000000001',slug:'equipo-qa',name:'Equipo QA',role:'owner'};
  const permissions={view:true,create,import:importRole,edit,publish,schedule:true,delete:deleteRole,review:true};
  const persisted = { id:'00000000-0000-4000-8000-000000000020', team_id:team.id,slug:'obra-test', title:'Obra de prueba',short:'Obra de prueba',published:true, genres:[],tags:[],relations:[],translation_status:'active' };
  const savedPatches = [];
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
        _select:'',_insert:null,_update:null,_type:'',_count:false,
        select(columns,opts){this._select=columns;this._count=!!opts?.head;return this;},
        update(patch){this._update=patch;return this;},
        eq(){return this;},is(){return this;},order(){return this;},not(){return this;},filter(){return this;},
        gte(){return this;},or(){return this;},ilike(){return this;},limit(){return this;},in(){return this;},
        range(from,to){
          const related = [{id:'00000000-0000-4000-8000-000000000090',title:'Magia de la Bruja del Viento',teams:{name:'Grupo Ónix'}},
            {id:'00000000-0000-4000-8000-000000000091',title:'La Fortaleza del Norte',teams:{name:'Otro equipo'}}];
          return Promise.resolve({data:table==='series' && this._select==='id,title,teams(name)' ? related.slice(from,to+1) : [],error:null});
        },
        insert(row){this._insert=row;calls.push('insert:'+table);inserted.push({table,row});return this;},
        one(){
          if(existingWork && table==='series' && this._update) {
            savedPatches.push(this._update);
            Object.assign(persisted,this._update);
            return { data:{ id:persisted.id,title:persisted.title,relations:persisted.relations },error:null };
          }
          if(existingWork && table==='series' && this._select==='*')
            return {data:{...persisted,relations:[...persisted.relations]},error:null};
          if(existingWork && table==='series' && this._select==='id,relations')
            return {data:{id:persisted.id,relations:[...persisted.relations]},error:null};
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
  return {studio:createStudio(ctx),calls,inserted,redirects,messages,persisted,savedPatches};
}
let checks=0;
try {
  ok(location.hostname==='127.0.0.1','Solo ejecutar en loopback');
  const owner=factory();
  await owner.studio.newWork();
  checks++;
  ok(!!app.querySelector('#nw-title'),'Nueva obra no se renderiza');
  const relatedInput = app.querySelector('[data-related-query]');
  ok(!!relatedInput && !app.querySelector('[data-w-rel-pick]'), 'El formulario debe usar el buscador compacto');
  relatedInput.focus(); relatedInput.value = 'brujá'; relatedInput.dispatchEvent(new Event('input', { bubbles:true }));
  const relatedButton = app.querySelector('.srp-result');
  ok(!!relatedButton && relatedButton.textContent.includes('Bruja'), 'La búsqueda debe encontrar títulos sin acentos');
  await until(() => !!document.getElementById('st2-works-css')?.sheet, 'estilos de obras relacionadas');
  const resultPanel = app.querySelector('[data-related-results]');
  ok(resultPanel.getBoundingClientRect().right <= document.documentElement.clientWidth + 2,
    'El buscador se sale horizontalmente del viewport');
  ok(parseInt(getComputedStyle(resultPanel).maxHeight, 10) <= 290,
    'La lista debe tener una altura máxima y scroll interno');

  // Reproducir el orden de eventos de un toque/clic real (pointerdown →
  // blur del buscador → microtarea → click). El test anterior usaba .click()
  // directamente y omitía el focusout que ocultaba la opción antes del clic.
  relatedInput.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}));
  relatedButton.querySelector('.srp-select-action').dispatchEvent(
    new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
  relatedInput.blur();
  await Promise.resolve();
  ok(!resultPanel.hidden && relatedButton.isConnected,
    'El resultado desaparece al perder el foco antes de poder pulsar Seleccionar obra');
  relatedButton.querySelector('.srp-select-action').dispatchEvent(
    new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));
  relatedButton.querySelector('.srp-select-action').click();
  ok(app.querySelector('[data-w-rel-list]')?.textContent.includes('Grupo Ónix'), 'No se añadió la obra relacionada con el equipo visible');
  ok(relatedInput.value==='Magia de la Bruja del Viento' &&
    relatedInput.dataset.relatedSelected==='00000000-0000-4000-8000-000000000090',
    'La selección debe quedar marcada por título e ID en lugar de dejar el campo vacío');
  ok(app.querySelector('[data-related-results]').hidden, 'El panel debe cerrarse después de agregar la obra');

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
  ok(navItems.length===14 && !navItems.some(a=>a.getAttribute('href')==='/estudio/bitacora'),'Los permisos del mock deben ocultar la Bitácora sin permiso log y conservar Difusión');
  ok(navItems.some(a=>a.getAttribute('href')==='/estudio/difusion'),'Falta Difusión en la navegación del equipo');
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
  // Entrega 2: controles reales, vista previa y borrador, sin almacenamiento remoto.
  ok(!!app.querySelector('[aria-current="step"]'),'Nueva obra perdió indicación accesible del paso');
  await until(()=>!!document.getElementById('st2-productivity-css')?.sheet,'CSS de productividad');
  ok(getComputedStyle(app.querySelector('.nw-sticky-actions')).position==='sticky','Guardar nueva obra no es sticky');
  // Auditoría visual de Entrega 2: geometría del formulario real a cada ancho.
  const actions=app.querySelector('.nw-sticky-actions');
  const viewportWidth=document.documentElement.clientWidth;
  const actionButtons=[...actions.querySelectorAll('.btn')];
  ok(actionButtons.length===2,'Nueva obra debe conservar Guardar y Cancelar');
  ok(actionButtons.every(el=>el.getBoundingClientRect().height>=43.5),
    'Guardar/Cancelar tienen un área táctil inferior a 44px');
  ok(actions.getBoundingClientRect().left>=-3 && actions.getBoundingClientRect().right<=viewportWidth+3,
    'Barra de acciones desbordada horizontalmente en '+viewportWidth+'px');
  window.scrollTo(0,0);await pause(70);
  if(document.documentElement.scrollHeight>window.innerHeight+60){
    const stickyRect=actions.getBoundingClientRect();
    ok(stickyRect.top>=-3 && stickyRect.bottom<=window.innerHeight+4,
      'Guardar no permanece visible al principio del formulario en '+viewportWidth+'px: '+JSON.stringify({top:stickyRect.top,bottom:stickyRect.bottom,height:window.innerHeight}));
  }
  checks++;
  const synopsis=app.querySelector('[data-w="synopsis"]');
  synopsis.value='Sinopsis de prueba';
  synopsis.dispatchEvent(new Event('input',{bubbles:true}));
  ok(app.querySelector('#nw-syn-count')?.textContent.startsWith(synopsis.value.length+' / 1500'),'Contador de sinopsis no responde');
  const coverInput=app.querySelector('#nw-cover'), transfer=new DataTransfer();
  transfer.items.add(new File(['imagen de prueba'],'portada.png',{type:'image/png'}));
  coverInput.files=transfer.files;
  coverInput.dispatchEvent(new Event('change',{bubbles:true}));
  ok(!app.querySelector('#nw-cover-preview').hidden,'La portada no muestra vista previa');
  ok(app.querySelector('#nw-cover-img').src.startsWith('blob:'),'La vista previa no usa un recurso local');
  coverInput.value='';
  coverInput.dispatchEvent(new Event('change',{bubbles:true}));
  ok(app.querySelector('#nw-cover-preview').hidden,'La vista previa no se elimina al retirar portada');
  const title=app.querySelector('#nw-title');
  title.value='Crónicas del Dragón';
  title.dispatchEvent(new Event('input',{bubbles:true}));
  const draftKey='obi-new-work-v1:00000000-0000-4000-8000-000000000005:00000000-0000-4000-8000-000000000001';
  ok(JSON.parse(localStorage.getItem(draftKey))?.data.title==='Crónicas del Dragón','Falta borrador del equipo');
  app.querySelector('#nw-go').click();
  await until(()=>app.querySelector('#nw-v'),'crear obra');
  ok(owner.inserted.length===1,'No se insertó una obra en el mock');
  ok(owner.inserted[0].row.slug==='cronicas-del-dragon','Slug incorrecto');
  ok(owner.inserted[0].row.work_type==='Novela ligera','Tipo editorial incompleto');
  ok(owner.inserted[0].row.published===false,'La obra no nace privada');
  ok(localStorage.getItem(draftKey)===null,'Borrador de obra no se limpia después de crearla');
  ok(owner.inserted[0].row.relations?.[0]?.id==='00000000-0000-4000-8000-000000000090',
    'La relación elegida debe viajar en el INSERT de la obra nueva');
  ok(owner.inserted[0].row.relations?.[0]?.kind==='precuela',
    'La relación conserva el tipo seleccionado');
  checks++;
  app.querySelector('#nw-v').click();
  await until(()=>owner.redirects.includes('/estudio/editar/00000000-0000-4000-8000-000000000004'),
    'crear volumen y capítulo');
  ok(owner.inserted.map(x=>x.table).join(',')==='series,volumes,chapters',
    'Secuencia de creación incorrecta');
  ok(owner.inserted[1].row.status==='draft' && owner.inserted[2].row.status==='draft',
    'Volumen/capítulo publicado por defecto');
  checks++;

  // Editar datos: ciclo completo de selección, guardado y recarga con base simulada.
  const editOwner=factory({existingWork:true});
  history.replaceState({},'', '/estudio/obra/obra-test?tab=datos');
  await editOwner.studio.work('obra-test');
  await until(()=>app.querySelector('#wk-rel-b [data-related-query]') &&
    app.querySelector('#wk-rel-b [data-related-status]')?.textContent.includes('2 obras'),
    'ficha de edición y catálogo de obras relacionadas');
  const query=app.querySelector('#wk-related-search');
  ok(!!query,'Falta buscador de obras relacionadas en Editar datos');
  query.value='bruja'; query.dispatchEvent(new Event('input',{bubbles:true}));
  ok(!!app.querySelector('#wk-rel-b .srp-result'),'No se mostraron resultados de obras relacionadas');
  ok(!!app.querySelector('#wk-savebtn')?.onclick, 'Guardar datos no tiene controlador');
  app.querySelector('#rel-save-all').click();
  await pause(80);
  ok(app.querySelector('#wk-rel-save-status')?.textContent.includes('no se ha añadido'),
    'Se permitió guardar una búsqueda no seleccionada: estado=' + app.querySelector('#wk-rel-save-status')?.textContent +
    ', consulta=' + app.querySelector('#wk-related-search')?.value + ', toast=' + editOwner.messages.slice(-3).join(' | '));
  ok(editOwner.savedPatches.length===0,'No debe guardarse una búsqueda escrita pero no seleccionada');
  query.focus(); // Enfocar redibuja los botones: obtener el elemento DESPUÉS del focus.
  const pick=app.querySelector('#wk-rel-b .srp-result');
  ok(!!pick && pick.isConnected, 'No hay resultado visible para seleccionar en Editar datos');
  pick.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
  query.blur();
  await Promise.resolve();
  ok(pick.isConnected && !app.querySelector('#wk-rel-b [data-related-results]').hidden,
    'Editar datos cierra la lista de resultados antes de finalizar el toque');
  pick.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));
  pick.querySelector('.srp-select-action').click();
  ok(app.querySelector('.srp-selected-info')?.textContent.includes('Bruja'),
    'Editar datos no muestra la obra seleccionada');
  ok(query.value==='Magia de la Bruja del Viento' && query.dataset.relatedSelected==='00000000-0000-4000-8000-000000000090',
    'Editar datos dejó vacía la selección confirmada');
  ok(app.querySelector('#wk-rel-save-status')?.textContent.includes('Magia de la Bruja del Viento'),
    'Editar datos no muestra la confirmación visible de la obra elegida');
  ok(query.isConnected && app.querySelector('#wk-related-search') === query,
    'Seleccionar una obra reemplazó el buscador y sus eventos');
  const relatedList = app.querySelector('#wk-rel-b [data-rel-selected]');
  ok(!!relatedList && relatedList.textContent.includes('Bruja'),
    'La selección debe mostrarse inmediatamente en la lista estable');
  // Cambiar el tipo no debe desmontar los resultados ni recrear la entrada.
  const selectedKind = relatedList.querySelector('[data-rk]');
  selectedKind.value = 'secuela';
  selectedKind.dispatchEvent(new Event('change',{bubbles:true}));
  ok(query === app.querySelector('#wk-related-search'),
    'Cambiar tipo de relación reconstruyó el buscador');
  selectedKind.value = 'precuela';
  selectedKind.dispatchEvent(new Event('change',{bubbles:true}));
  // Escape desde un resultado devuelve el foco sin reabrir automáticamente.
  query.value = 'fortaleza';
  query.focus();
  query.dispatchEvent(new Event('input',{bubbles:true}));
  const other = app.querySelector('#wk-rel-b .srp-result');
  ok(!!other && other.textContent.includes('Fortaleza'),
    'No aparece la segunda obra para probar Escape');
  other.focus();
  other.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  ok(app.querySelector('#wk-rel-b [data-related-results]').hidden &&
    document.activeElement === query,
    'Escape debe cerrar la lista y devolver el foco sin reabrirla');
  query.dispatchEvent(new Event('input',{bubbles:true}));
  document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}));
  ok(app.querySelector('#wk-rel-b [data-related-results]').hidden,
    'La búsqueda no se cierra al tocar fuera');
  query.value = '';

  ok(app.querySelector('#wk-dirty')?.textContent.includes('Cambios sin guardar'),
    'Seleccionar obra debe marcar la ficha como modificada');
  app.querySelector('#rel-save-all').click();
  await until(()=>editOwner.savedPatches.length===1 && app.querySelector('#wk-rel-save-status')?.textContent.includes('Guardado confirmado'),
    'guardar y verificar obra relacionada');
  ok(editOwner.persisted.relations.length===1 &&
    editOwner.persisted.relations[0].id==='00000000-0000-4000-8000-000000000090',
    'La relación no llegó a la escritura de la serie');
  ok(editOwner.savedPatches[0].title==='Obra de prueba' &&
    editOwner.savedPatches[0].relations[0].kind==='precuela',
    'Guardar datos debe incluir metadatos y tipo de relación');
  await editOwner.studio.work('obra-test');
  await until(()=>app.querySelector('.srp-selected-info')?.textContent.includes('Bruja'),
    'la relación guardada reaparece al reabrir Editar datos');
  checks++;
  history.replaceState({},'', '/');

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

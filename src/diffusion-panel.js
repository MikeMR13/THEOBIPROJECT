// Centro de Difusión: Discord y Telegram manuales; sin automatizaciones activas.
const EVENTS = [
  ['chapter.public', 'Capítulo público'],
  ['volume.public', 'Volumen completo'],
  ['prelaunch.announced', 'Preestreno anunciado'],
  ['content.unlocked', 'Apertura a todo público'],
  ['announcement.published', 'Anuncio editorial']
];
const EDITORIAL_TEMPLATES = [
  {id:'series',label:'Estreno de obra',body:'📚 ¡Nueva obra disponible en El Obi del Lector! Descubre esta historia y comienza a leerla.'},
  {id:'volume',label:'Nuevo volumen',body:'📖 ¡Un nuevo volumen está disponible! Continúa la aventura desde la página de lectura.'},
  {id:'chapter',label:'Nuevo capítulo',body:'✨ ¡Nuevo capítulo publicado! Sigue la historia en El Obi del Lector.'},
  {id:'brief',label:'Aviso breve',body:'📢 ¡Ya puedes leer la nueva publicación en El Obi del Lector!'}
];
const editorialTemplate = id => EDITORIAL_TEMPLATES.find(x=>x.id===id)?.body||'';
const TELEGRAM_BOT_TOKEN = /^[0-9]{5,15}:[A-Za-z0-9_-]{30,80}$/;
const TELEGRAM_CHANNEL = /^(@[A-Za-z][A-Za-z0-9_]{4,31}|-[1-9][0-9]{4,18})$/;
const telegramChannelValue = input => {
  const raw=String(input||'').trim();
  const publicLink=raw.match(/^(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z][A-Za-z0-9_]{4,31})\/?$/i);
  return publicLink?'@'+publicLink[1]:raw;
};
const when = value => value ? new Date(value).toLocaleString('es-MX', { dateStyle:'medium',timeStyle:'short' }) : '—';
function stylesheet() {
  if (document.getElementById('df-css')) return;
  const l = document.createElement('link');
  l.id = 'df-css'; l.rel = 'stylesheet'; l.href = '/diffusion.css?v=1';
  document.head.appendChild(l);
}
export async function renderDiffusionPanel({ sb, root, team = null, permissions = {}, esc, toast }) {
  if (!root) return;
  stylesheet();
  const official = !team, scope = official ? 'cuentas oficiales de El Obi' : 'redes de ' + team.name;
  const p = k => official || !!permissions[k];
  const canManage = p('diffusion_manage'), canCompose = p('diffusion_compose');
  const canLogs = p('diffusion_logs'), canAnnounce = p('diffusion_publish');
  let tab = 'resumen', rules = [], campaigns = [], connections = [], jobs = [];
  let telegramFeedback = '', editingCampaignId = '', annDraftMessage = '', annDraftTitle = '';
  const deep = new URLSearchParams(location.search);
  const deepKind = ({o:'series',v:'volume',c:'chapter'})[deep.get('k')] || (['series','volume','chapter'].includes(deep.get('kind')) ? deep.get('kind') : '');
  const deepSource = /^[0-9a-f-]{36}$/i.test(deep.get('id')||deep.get('source')||'') ? (deep.get('id')||deep.get('source')) : '';
  const deepSeries = /^[0-9a-f-]{36}$/i.test(deep.get('s')||deep.get('series')||'') ? (deep.get('s')||deep.get('series')) : '';
  let deepPending = !!(deepKind && deepSource);
  let annWorks=[],annItems=[],annLoaded=false,annWork='',annSource='',annConnection='',annKind=deepKind||'series',annPreview=null;
  const scoped = q => team ? q.eq('team_id', team.id) : q.is('team_id', null);
  const q = async (table, cols, sort = 'created_at') => {
    const { data, error } = await scoped(sb.from(table).select(cols).order(sort, { ascending: false }).limit(50));
    if (error) throw error;
    return data || [];
  };
  const teamId = team?.id || null;
  const safe = v => esc(String(v ?? ''));
  const empty = description => '<p class="df-empty">' + safe(description) + '</p>';
  const shortName = e => EVENTS.find(x => x[0] === e)?.[1] || e;
  const tabs = [
    ['resumen','Resumen'], ['conexiones','Conexiones'], ['anuncios','Anunciar'], ['reglas','Automatizaciones'],
    ['campanas','Borradores'], ['calendario','Calendario'], ['historial','Historial']
  ];
  const message = 'Solo Discord y Telegram. Los borradores no se publican solos: selecciona el contenido, revisa portada y enlace y confirma cada envío. Las automatizaciones están inactivas.';
  root.innerHTML = '<div class="df" aria-live="polite"><p class="df-empty">Cargando Difusión…</p></div>';
  try {
    [connections,rules,campaigns,jobs] = await Promise.all([
      q('diffusion_connections','id,provider,label,status,created_at'),
      q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,created_at'),
      q('diffusion_campaigns','id,title,body,status,scheduled_at,created_at'),
      canLogs ? q('diffusion_jobs','id,status,scheduled_at,last_error,created_at') : Promise.resolve([])
    ]);
  } catch (error) {
    const missing = error.code === '42P01' || /PGRST205|Could not find the table/i.test(error.message || '');
    root.innerHTML = '<section class="df"><div class="df-note">'
      + (missing ? 'El módulo está preparado, pero falta aplicar la migración de Difusión en una base de pruebas.'
        : 'No se pudieron cargar los datos de Difusión: ' + safe(error.message || 'Error de conexión'))
      + '</div><p class="df-muted">No se han enviado publicaciones ni modificado conexiones externas.</p></section>';
    return;
  }
  const header = () => '<div class="df-title"><div><small>DIFUSIÓN · ' + (official ? 'BIBLIOTECARIO' : 'ESTUDIO') + '</small>'
    + '<h2>Centro de Difusión</h2><p>' + safe(scope) + '</p></div><span class="df-stage">DISCORD Y TELEGRAM · MANUAL</span></div>'
    + '<nav class="df-tabs" aria-label="Secciones de Difusión">'
    + tabs.map(([id,name])=>'<button type="button" data-dtab="' + id + '" class="' + (tab===id?'on':'')
      + '" aria-current="' + (tab===id?'page':'false') + '">' + name + '</button>').join('') + '</nav>'
    + '<p class="df-note">' + safe(message) + '</p>';
  const cards = () => '<div class="df-cards">'
    + [['Conexiones activas',connections.filter(c=>['discord','telegram'].includes(c.provider)&&c.status==='active').length],['Reglas inactivas',rules.filter(r=>!r.enabled).length],['Borradores',campaigns.filter(c=>c.status==='draft').length],['Envíos recientes',canLogs?jobs.length:'—']]
      .map(([name,n])=>'<div class="df-card"><small>'+safe(name)+'</small><strong>'+n+'</strong></div>').join('')+'</div>';
  const connectionsView = () => '<section class="df-box"><h3>Conexiones de Discord y Telegram</h3>'
    + '<p>Discord guarda el webhook y Telegram el token de bot cifrados en Supabase Vault. No compartas ninguno por chat ni GitHub.</p>'
    + (connections.filter(c=>c.status!=='revoked').length ? '<div class="df-list">' + connections.filter(c=>c.status!=='revoked').map(c=>'<article><div><strong>'+safe(c.label)+'</strong>'
      + '<small>'+safe(c.provider)+' · '+safe(c.status==='active'?'Prueba correcta':'Pendiente de prueba')+'</small></div>'
      + (canManage&&(c.provider==='discord'||c.provider==='telegram')?'<div><button type="button" class="btn" data-test-'+safe(c.provider)+'="'+safe(c.id)+'">Enviar prueba</button> '
      + '<button type="button" class="df-danger" data-revoke-'+safe(c.provider)+'="'+safe(c.id)+'">Desconectar</button></div>':'')
      + '</article>').join('')+'</div>' : empty('Aún no hay cuentas conectadas.'))
    + '<div id="df-telegram-feedback" class="df-note" role="alert" aria-live="assertive">'+safe(telegramFeedback)+'</div>'
    + (canManage ? '<form id="df-discord-form" class="df-form" autocomplete="off"><h4>Conectar Discord</h4>'
      + '<label>Nombre de la conexión<input name="label" minlength="2" maxlength="100" required placeholder="Ej. Canal de novedades"></label>'
      + '<label>URL privada del webhook<input name="webhook" type="password" required autocomplete="off" spellcheck="false" inputmode="url" placeholder="https://discord.com/api/webhooks/…"></label>'
      + '<p class="df-muted">El enlace se envía una sola vez al servidor por HTTPS y se guarda cifrado en Vault. No se muestra otra vez. Una prueba solo se envía al pulsar el botón.</p>'
      + '<button type="submit" class="btn">Guardar conexión segura</button></form>'
      : '<p class="df-muted">Necesitas «Gestionar difusión» para conectar redes.</p>')
      + (canManage ? '<form id="df-telegram-form" class="df-form" autocomplete="off"><h4>Conectar canal o grupo de Telegram</h4>'
        + '<p>Crea un bot con @BotFather y añádelo a tu grupo o canal, con permiso para publicar. Nunca pegues el token en chats.</p>'
        + '<label>Nombre de la conexión<input name="label" minlength="2" maxlength="100" required placeholder="Ej. Novedades en Telegram"></label>'
        + '<label>Token privado del bot<input name="token" type="password" required autocomplete="off" spellcheck="false" placeholder="Token entregado por @BotFather"></label>'
        + '<label>Usuario o enlace público del grupo o canal<input name="chat" required autocomplete="off" spellcheck="false" placeholder="@MiCanal o https://t.me/MiCanal"></label>'
        + '<p class="df-muted">Los canales y supergrupos públicos usan @usuario o t.me/usuario. Para un grupo privado se necesita su ID numérico negativo; un enlace de invitación t.me/+… no funciona.</p>'
        + '<p class="df-muted">El token se cifra en Vault. El botón «Enviar prueba» comprueba que el bot pueda enviar mensajes al grupo o canal. No se publicará nada automáticamente.</p>'
        + '<button type="submit" class="btn">Guardar Telegram de forma segura</button></form>' : '')
    + '<p class="df-muted">Solo se permite una prueba por conexión cada 60 segundos.</p>'
    + '<p class="df-muted">La conexión de tu equipo no necesita autorización del Bibliotecario.</p></section>';
  const rulesView = () => '<section class="df-box"><h3>Automatizaciones del ' + (official?'Bibliotecario':'equipo') + '</h3>'
    + '<p>Las reglas guardadas permanecerán desactivadas hasta disponer de conectores seguros.</p>'
    + (rules.length ? '<div class="df-list">' + rules.map(r=>'<article><div><strong>'+safe(r.name)+'</strong>'
      + '<small>'+safe(shortName(r.event_kind))+' · '+(r.mode==='team_review'?'Revisión interna':'Automática')
      + ' · Retraso: '+r.delay_minutes+' min · '+(r.enabled?'Activa':'Preparada, sin activar')+'</small></div>'
      + (canManage&&!r.enabled?'<button type="button" data-del-rule="'+safe(r.id)+'" class="df-danger">Eliminar</button>':'')
      + '</article>').join('')+'</div>' : empty('Todavía no hay reglas configuradas.'))
    + (canManage ? '<form id="df-rule-form" class="df-form"><h4>Preparar una regla</h4>'
       + '<label>Nombre<input name="name" maxlength="100" minlength="2" required placeholder="Ej. Nuevo volumen en las redes"></label>'
       + '<label>Evento<select name="event">'+EVENTS.map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label>'
       + '<label>Modalidad<select name="mode"><option value="automatic">Automático al activar</option>'
       + '<option value="team_review">Con revisión interna del equipo</option></select></label>'
       + '<label>Retraso en minutos<input type="number" name="delay" min="0" max="10080" value="0" required></label>'
       + '<button type="submit" class="btn">Guardar regla inactiva</button></form>'
       : '<p class="df-muted">Necesitas el permiso «Gestionar difusión» para crear reglas.</p>')+'</section>';
  const editingCampaign = () => campaigns.find(c=>c.id===editingCampaignId&&c.status==='draft');
  const templateOptions = () => '<option value="">Seleccionar plantilla (opcional)</option>'
    + EDITORIAL_TEMPLATES.map(t=>'<option value="'+safe(t.id)+'">'+safe(t.label)+'</option>').join('');
  const campaignsView = () => '<section class="df-box"><h3>Borradores editoriales</h3>'
    + '<p>Guarda textos reutilizables y revísalos antes de enviarlos. Cada anuncio exige seleccionar el contenido publicado y confirmar manualmente.</p>'
    + (campaigns.filter(c=>c.status==='draft').length ? '<div class="df-list">'
      + campaigns.filter(c=>c.status==='draft').map(c=>'<article><div><strong>'+safe(c.title)+'</strong>'
        + '<small>Sin publicar · '+when(c.created_at)+'</small>'
        + '<p>'+safe((c.body||'').slice(0,350))+'</p></div><div>'
        + (canAnnounce?'<button type="button" class="btn" data-use-campaign="'+safe(c.id)+'">Preparar anuncio</button> ':'')
        + (canCompose?'<button type="button" class="btn" data-edit-campaign="'+safe(c.id)+'">Editar</button> '
          + '<button type="button" class="df-danger" data-del-campaign="'+safe(c.id)+'">Eliminar</button>':'')
        + '</div></article>').join('')+'</div>'
      : empty('No hay borradores.'))
    + (canCompose ? '<form id="df-campaign-form" class="df-form"><h4>'
      + (editingCampaign()?'Editar borrador':'Nuevo borrador')+'</h4>'
      + '<label>Título<input name="title" minlength="2" maxlength="140" required placeholder="Ej. Estreno del volumen 3" value="'+safe(editingCampaign()?.title||'')+'"></label>'
      + '<label>Plantilla rápida<select id="df-campaign-template">'+templateOptions()+'</select></label>'
      + '<label>Mensaje<textarea name="body" maxlength="2000" rows="4" placeholder="Presenta la novedad a tus lectores">'+safe(editingCampaign()?.body||'')+'</textarea></label>'
      + '<p class="df-muted">Los anuncios admiten mensajes de hasta 700 caracteres. El Obi añade el título del contenido, su enlace y la portada verificada.</p>'
      + '<button type="submit" class="btn">'+(editingCampaign()?'Guardar cambios':'Guardar borrador')+'</button>'
      + (editingCampaign()?'<button type="button" class="df-link" id="df-campaign-cancel">Cancelar edición</button>':'')
      + '</form>' : '<p class="df-muted">Necesitas «Redactar difusión» para crear o editar borradores.</p>')
    + '</section>';
  const historyView = () => '<section class="df-box"><h3>Historial de envíos</h3>'
    + (canLogs ? (jobs.length ? '<div class="df-list">'+jobs.map(j=>'<article><strong>'+safe(j.status)+'</strong>'
      + '<small>'+when(j.scheduled_at)+'</small><p>'+safe(j.last_error||'')+'</p></article>').join('')+'</div>'
      : empty('Todavía no hay envíos registrados.')) : empty('Tu rol no permite ver los registros técnicos.'))
    + '</section>';

  const chosenAnnouncementId = () => annKind==='series' ? annWork : annSource;
  const annCover = value => {
    if(typeof value!=='string'||value.includes('..')||!value||value.startsWith('/')
       ||!/^[A-Za-z0-9_./-]+$/.test(value))return '';
    return (sb.supabaseUrl||'')+'/storage/v1/object/public/obi-media/'
      +value.split('/').map(encodeURIComponent).join('/');
  };
  const annConnections = () => connections.filter(c=>['discord','telegram'].includes(c.provider)&&c.status==='active');
  const annProvider = () => connections.find(c=>c.id===annConnection)?.provider||'discord';
  const annOptions = () => annKind==='series' ? [] : annItems.filter(x=>x.status==='published');
  const annSelected = (items,id,label) => items.map(x=>'<option value="'+safe(x.id)+'"'+(x.id===id?' selected':'')+'>'+safe(label(x))+'</option>').join('');
  const annView = () => '<section class="df-box"><h3>Anunciar contenido en Discord o Telegram</h3>'
    + '<p>Selecciona una obra, volumen o capítulo publicado. Verás el mensaje antes de enviarlo. No se publica automáticamente.</p>'
    + '<p>Una obra se anuncia con su portada general. Los volúmenes y capítulos usan siempre la portada del volumen correspondiente. Si falta esa imagen, no se enviará el anuncio.</p>'
    + (!canAnnounce ? empty('Necesitas el permiso «Publicar difusión».')
      : !annConnections().length ? empty('Primero conecta Discord o Telegram y envía una prueba desde «Conexiones».')
      : '<div class="df-form">'
        + '<label>Canal de difusión<select id="df-ann-conn">'+annSelected(annConnections(),annConnection,x=>x.provider.toUpperCase()+' · '+x.label)+'</select></label>'
        + '<label>Tipo de anuncio<select id="df-ann-kind">'
          + [['series','Nueva obra'],['volume','Nuevo volumen'],['chapter','Nuevo capítulo']]
            .map(([k,v])=>'<option value="'+k+'"'+(annKind===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label>'
        + '<label>Obra<select id="df-ann-work">'+annSelected(annWorks,annWork,x=>x.title)+'</select></label>'
        + (annKind==='series'?'':'<label>'+(annKind==='volume'?'Volumen':'Capítulo')
          + '<select id="df-ann-source">'+annSelected(annOptions(),annSource,x=>annKind==='volume'?'Volumen '+x.num+(x.title?' — '+x.title:''):'Capítulo '+x.num+(x.title?' — '+x.title:''))+'</select></label>')
        + (!annWorks.length ? empty('No hay obras públicas disponibles en este ámbito.')
           : annKind!=='series'&&!annOptions().length ? empty('No hay contenidos publicados de ese tipo para esta obra.')
           : '<button type="button" class="btn" id="df-ann-preview">Crear vista previa</button>')
        + '</div>'
        + (annPreview ? '<div class="df-box"><h4>Vista previa (todavía no enviada)</h4>'
          + (annCover(annPreview.cover_path)?'<img loading="lazy" alt="Portada del anuncio" src="'+safe(annCover(annPreview.cover_path))+'" style="max-width:112px;height:auto;float:right;margin:0 0 12px 12px;border-radius:6px">':'')
          + '<p><strong>'+safe(annPreview.title)+'</strong></p>'
          + '<p>'+safe(annPreview.description||'')+'</p>'
          + '<p><a href="'+safe(annPreview.url)+'" target="_blank" rel="noopener noreferrer">'+safe(annPreview.url)+'</a></p>'
          + '<label>Texto del anuncio<textarea id="df-ann-text" maxlength="700" rows="3">'+safe(annPreview.message)+'</textarea></label>'
          + '<p class="df-muted">Solo se permite un anuncio por contenido y canal. No se reintentará automáticamente ante fallos inciertos.</p>'
          + '<button type="button" class="btn" id="df-ann-send">Confirmar y enviar a Discord</button></div>' : '')
       )+'</section>';
  const loadAnnItems = async () => {
    annItems=[];annSource='';annPreview=null;
    if(annKind==='series'||!annWork)return;
    const table=annKind==='volume'?'volumes':'chapters';
    const cols=annKind==='volume'?'id,num,title,status,published_at':'id,num,title,status,publish_at';
    const {data,error}=await sb.from(table).select(cols).eq('series_id',annWork)
      .eq('status','published').is('deleted_at',null).order('num',{ascending:false}).limit(150);
    if(error)throw error;
    annItems=data||[];
    annSource=(deepPending&&annItems.some(x=>x.id===deepSource)?deepSource:annItems[0]?.id)||'';
  };
  const loadAnnWorks = async () => {
    let req=sb.from('series').select('id,title,slug').eq('published',true)
      .is('archived_at',null).order('title').limit(150);
    if(team)req=req.eq('team_id',team.id);
    const {data,error}=await req;
    if(error)throw error;
    annWorks=data||[];annLoaded=true;
    annWork=annWorks.find(x=>x.id===(deepSeries||(annKind==='series'?deepSource:'')))?.id||annWorks[0]?.id||'';
    const allowed=annConnections();
    annConnection=allowed[0]?.id||'';
    await loadAnnItems();deepPending=false;
  };

  function page() {
    if (tab==='conexiones') return connectionsView();
    if (tab==='anuncios') return annView();
    if (tab==='reglas') return rulesView();
    if (tab==='campanas') return campaignsView();
    if (tab==='calendario') return '<section class="df-box"><h3>Calendario de difusión</h3>'
      + empty('La programación está pendiente de la fase de automatización. Por ahora los anuncios se envían solo mediante confirmación manual.')+'</section>';
    if (tab==='historial') return historyView();
    return cards() + '<div class="df-grid">'
      + '<section class="df-box"><h3>Autonomía editorial</h3><p>'
      + (official?'Administra aquí únicamente las cuentas oficiales de El Obi. Las publicaciones de los equipos no necesitan tu aprobación.'
        :'Tu equipo decide cuándo y dónde publicar en sus redes. No necesita aprobación del Bibliotecario.')
      + '</p><button type="button" class="df-link" data-goto="reglas">Preparar automatización →</button></section>'
      + '<section class="df-box"><h3>Campañas</h3><p>Redacta mensajes para un futuro envío en las redes vinculadas.</p>'
      + '<button type="button" class="df-link" data-goto="campanas">Crear borrador →</button></section></div>';
  }
  function draw() {
    if (!root.isConnected) return;
    root.innerHTML = '<div class="df">' + header() + page() + '</div>';
    root.querySelectorAll('[data-dtab],[data-goto]').forEach(b => b.onclick = async () => {
      tab = b.dataset.dtab || b.dataset.goto;
      if(tab==='anuncios'&&!annLoaded) {
        try{await loadAnnWorks();}catch(e){toast('No se pudo cargar el catálogo para anuncios.');}
      }
      draw();
    });
    const busy = async (button, work) => {
      button.disabled = true;
      try { await work(); }
      catch (e) { toast(e.message || 'Error de Difusión'); }
      finally { button.disabled = false; }
    };
    root.querySelector('#df-discord-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const f=e.currentTarget, data=new FormData(f);
      const url=String(data.get('webhook')||'');
      // Nunca registrar la URL o incluirla en mensajes de error.
      busy(f.querySelector('button'), async()=>{
        const {error}=await sb.rpc('diffusion_discord_connect',{
          p_team:teamId,p_label:String(data.get('label')||''),p_url:url
        });
        if(error) throw new Error('No se pudo guardar la conexión. Comprueba que sea una URL válida de Discord y que tengas permisos.');
        f.reset();
        connections=await q('diffusion_connections','id,provider,label,status,created_at');
        toast('Discord guardado de forma segura. Usa «Enviar prueba» para verificarlo.');
        draw();
      });
    });

    root.querySelector('#df-ann-conn')?.addEventListener('change',e=>{
      annConnection=e.target.value;annPreview=null;draw();
    });
    root.querySelector('#df-ann-kind')?.addEventListener('change',e=>{
      annKind=e.target.value;annPreview=null;
      loadAnnItems().then(draw).catch(()=>toast('No se pudieron cargar los contenidos.'));
    });
    root.querySelector('#df-ann-work')?.addEventListener('change',e=>{
      annWork=e.target.value;annPreview=null;
      loadAnnItems().then(draw).catch(()=>toast('No se pudieron cargar los contenidos.'));
    });
    root.querySelector('#df-ann-source')?.addEventListener('change',e=>{
      annSource=e.target.value;annPreview=null;draw();
    });
    root.querySelector('#df-ann-preview')?.addEventListener('click',e=>busy(e.currentTarget,async()=>{
      if(!annConnection||!chosenAnnouncementId())return;
      const {data,error}=await sb.rpc('diffusion_'+annProvider()+'_announcement_preview',{
        p_connection:annConnection,p_kind:annKind,p_source:chosenAnnouncementId()
      });
      if(error?.message==='missing_volume_cover')
        throw new Error('Este volumen no tiene portada propia. Añade la portada del volumen antes de anunciarlo o anunciar uno de sus capítulos.');
      if(error?.message==='missing_work_cover')
        throw new Error('Esta obra no tiene portada general. Añádela antes de anunciarla.');
      if(error?.message==='invalid_cover_path')
        throw new Error('La ruta de la portada no es válida para compartir. Corrige la imagen y vuelve a intentarlo.');
      if(error||!data?.url)throw new Error('Este contenido no está disponible públicamente o no tienes permiso para anunciarlo.');
      annPreview=data;draw();
    }));
    root.querySelector('#df-ann-send')?.addEventListener('click',e=>{
      const content=root.querySelector('#df-ann-text')?.value.trim();
      if(!content){toast('Escribe un mensaje antes de enviarlo.');return;}
      if(!confirm('¿Publicar ahora este anuncio en el canal seleccionado? No se podrá repetir para el mismo contenido.'))return;
      busy(e.currentTarget,async()=>{
        const provider=annProvider();
        const {data,error}=await sb.functions.invoke(provider==='telegram'?'diffusion-telegram':'diffusion-announcement',{body:{
          action:'announce',connection_id:annConnection,kind:annKind,source_id:chosenAnnouncementId(),message:content
        }});
        const status=error?.context?.status;
        if(status===409||data?.error==='already_announced')
          throw new Error('Este contenido ya fue anunciado en ese canal.');
        if(status===429||data?.error==='rate_limited')
          throw new Error('Espera 15 segundos antes de anunciar otro contenido.');
        if(status===403)throw new Error('El contenido ya no es público o no tienes permisos.');
        if(error||!data?.ok)throw new Error('El resultado del envío no está confirmado. No lo repitas: revisa el canal o el historial.');
        annPreview=null;toast('Anuncio enviado a '+(annProvider()==='telegram'?'Telegram':'Discord'));draw();
      });
    });


    root.querySelector('#df-telegram-form')?.addEventListener('submit',e=>{
      e.preventDefault();
      const form=e.currentTarget,values=new FormData(form);
      const token=String(values.get('token')||'').trim();
      const chat=telegramChannelValue(values.get('chat'));
      const label=String(values.get('label')||'').trim();
      busy(form.querySelector('button'),async()=>{
        if(label.length<2||label.length>100)
          throw new Error('El nombre de la conexión debe tener entre 2 y 100 caracteres.');
        if(!TELEGRAM_BOT_TOKEN.test(token))
          throw new Error('El token del bot no tiene un formato válido. Cópialo completo desde @BotFather; no pegues una URL.');
        if(!TELEGRAM_CHANNEL.test(chat)){
          if(/(?:t\.me\/\+|t\.me\/joinchat\/|telegram\.me\/joinchat\/)/i.test(chat))
            throw new Error('Ese es un enlace de invitación privado. Necesitas el ID numérico negativo del grupo o canal o un @usuario público.');
          throw new Error('El destino debe ser @NombrePublico, un enlace t.me/NombrePublico o un ID numérico negativo.');
        }
        const {error}=await sb.rpc('diffusion_telegram_connect',{
          p_team:teamId,p_label:label,p_token:token,p_chat:chat
        });
        if(error?.message==='invalid_telegram_connection')
          throw new Error('Telegram rechazó el formato del token o destino. Revisa @BotFather y el identificador del grupo o canal.');
        if(error?.message==='forbidden')
          throw new Error('Tu cuenta no tiene permiso para gestionar conexiones de este equipo.');
        if(error)throw new Error('No se pudo guardar Telegram. Actualiza la página y verifica tus permisos.');
        form.reset();
        connections=await q('diffusion_connections','id,provider,label,status,created_at');
        toast('Telegram guardado de forma segura. Envía una prueba para activarlo.');draw();
      });
    });
    root.querySelectorAll('[data-test-telegram]').forEach(b=>b.onclick=()=>{
      if(!confirm('¿Enviar una única prueba al grupo o canal de Telegram seleccionado?'))return;
      telegramFeedback='Comprobando el grupo o canal de Telegram…';
      const note=root.querySelector('#df-telegram-feedback');
      if(note)note.textContent=telegramFeedback;
      busy(b,async()=>{
        try{
          const {data,error}=await sb.functions.invoke('diffusion-telegram',{
            body:{action:'test',connection_id:b.dataset.testTelegram}
          });
          let reason=data?.error||null;
          if(!reason&&error?.context?.json){
            try{reason=(await error.context.json())?.error||null;}catch{}
          }
          if(error?.context?.status===429||reason==='rate_limited')
            throw new Error('Espera 60 segundos entre pruebas de Telegram.');
          const reasons={
            telegram_not_chat:'El destino no es un grupo ni un canal de Telegram.',
            telegram_chat_unavailable:'El bot no encuentra el grupo o canal. Revisa el @ o ID y que esté añadido.',
            telegram_token_invalid:'Telegram rechazó el token. Revísalo en @BotFather.',
            telegram_bot_not_member:'Telegram no detecta al bot en ese grupo o canal. Agrégalo como miembro o administrador.',
            telegram_bot_no_post_permission:'El bot no puede publicar en ese grupo o canal. Dale permiso para enviar mensajes y fotos.',
            telegram_bot_blocked:'Telegram bloqueó al bot. Revisa su pertenencia y permisos.',
            telegram_cannot_send:'Telegram no permitió el mensaje. Revisa los permisos del grupo o canal.',
            telegram_api_rate_limited:'Telegram limita las solicitudes. Inténtalo más tarde.',
            telegram_api_unreachable:'No se pudo contactar con Telegram. Inténtalo más tarde.',
            telegram_credential_unavailable:'No se pudo validar la conexión guardada.',
            telegram_api_error:'Telegram rechazó la prueba. Comprueba los permisos.'
          };
          if(error||!data?.ok)throw new Error(reasons[reason]||'No se confirmó el envío. Verifica que el bot pueda publicar en el grupo o canal.');
          connections=await q('diffusion_connections','id,provider,label,status,created_at');
          telegramFeedback='Prueba recibida por Telegram. Conexión verificada.';
        }catch(e){
          telegramFeedback=e?.message||'La prueba de Telegram no pudo completarse.';
        }
        draw();
      });
    });
    root.querySelectorAll('[data-revoke-telegram]').forEach(b=>b.onclick=()=>{
      if(!confirm('¿Desconectar el canal de Telegram y borrar su token cifrado?'))return;
      busy(b,async()=>{
        const {error}=await sb.rpc('diffusion_telegram_disconnect',{p_team:teamId,p_id:b.dataset.revokeTelegram});
        if(error)throw new Error('No se pudo desconectar Telegram.');
        connections=await q('diffusion_connections','id,provider,label,status,created_at');
        toast('Telegram desconectado y token revocado');draw();
      });
    });

    root.querySelectorAll('[data-test-discord]').forEach(b=>b.onclick=()=>{
      if(!confirm('¿Enviar un único mensaje de prueba a este canal de Discord?')) return;
      busy(b,async()=>{
        const {data,error}=await sb.functions.invoke('diffusion-discord',{
          body:{connection_id:b.dataset.testDiscord}
        });
        if(error?.context?.status===429 || data?.error==='rate_limited')
          throw new Error('Espera 60 segundos entre pruebas de Discord antes de volver a intentarlo.');
        if(error||!data?.ok) throw new Error('Discord no recibió la prueba. Revisa los permisos y la conexión.');
        connections=await q('diffusion_connections','id,provider,label,status,created_at');
        toast('Mensaje de prueba enviado a Discord');draw();
      });
    });
    root.querySelectorAll('[data-revoke-discord]').forEach(b=>b.onclick=()=>{
      if(!confirm('¿Desconectar este webhook y borrar su secreto almacenado?'))return;
      busy(b,async()=>{
        const {error}=await sb.rpc('diffusion_discord_disconnect',{
          p_team:teamId,p_id:b.dataset.revokeDiscord
        });
        if(error)throw new Error('No se pudo revocar la conexión.');
        connections=await q('diffusion_connections','id,provider,label,status,created_at');
        toast('Conexión de Discord revocada');draw();
      });
    });
    root.querySelector('#df-rule-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.currentTarget, data = new FormData(f);
      busy(f.querySelector('button'), async () => {
        const { error } = await sb.rpc('diffusion_rule_save', {
          p_team:teamId, p_id:null, p_name:String(data.get('name')||''),
          p_event:String(data.get('event')||''),p_mode:String(data.get('mode')||'automatic'),
          p_delay:Number(data.get('delay'))
        });
        if (error) throw error;
        rules = await q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,created_at');
        toast('Regla guardada sin activar'); draw();
      });
    });
    root.querySelector('#df-campaign-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const f=e.currentTarget, data=new FormData(f);
      busy(f.querySelector('button'), async () => {
        const { error } = await sb.rpc('diffusion_campaign_draft_save', {
          p_team:teamId,p_id:null,p_title:String(data.get('title')||''),
          p_body:String(data.get('body')||'')
        });
        if (error) throw error;
        campaigns = await q('diffusion_campaigns','id,title,body,status,scheduled_at,created_at');
        toast('Borrador guardado');draw();
      });
    });
    root.querySelectorAll('[data-del-rule],[data-del-campaign]').forEach(b => b.onclick = () => {
      const isRule = !!b.dataset.delRule, id=b.dataset.delRule||b.dataset.delCampaign;
      if (!confirm('¿Eliminar este borrador?')) return;
      busy(b, async()=>{
        const {error}=await sb.rpc('diffusion_draft_delete',{p_team:teamId,p_type:isRule?'rule':'campaign',p_id:id});
        if(error) throw error;
        if(isRule) rules=rules.filter(r=>r.id!==id); else campaigns=campaigns.filter(c=>c.id!==id);
        toast('Borrador eliminado');draw();
      });
    });
  }
  if(deepPending){tab='anuncios';try{await loadAnnWorks();}catch{toast('No se pudo abrir el anuncio solicitado.');}}
  draw();
}

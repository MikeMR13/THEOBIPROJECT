import { confirmObi } from './dialogs.js';
import { manualTargets, manualChannelBatch, batchFeedback } from './diffusion-manual-batch.js';
import { immediateDeliveryNotice, automaticDeliveryNotice } from './diffusion-delivery-notices.js';
import { renderDraftTemplate } from './diffusion-draft-templates.js?v=1';
// Centro de Difusión: anuncios manuales y agenda 4B opt-in, sin reglas automáticas globales.
const EVENTS = [
  ['chapter.public', 'Capítulo público'],
  ['volume.public', 'Volumen completo'],
  ['prelaunch.announced', 'Nueva obra anunciada'],
  ['content.unlocked', 'Apertura a todo público'],
  ['announcement.published', 'Anuncio editorial']
];
const EDITORIAL_TEMPLATES = [
  {id:'series',label:'Estreno de obra',body:'📚 ¡Nueva obra disponible en El Obi del Lector! Descubre esta historia y comienza a leerla.'},
  {id:'introduccion',label:'Presentación de nueva obra',body:'📚 ¡Les presentamos una nueva obra! {{novela}}, por {{equipo_traductor}}. ¡Descúbrela en El Obi del Lector!'},
  {id:'preestreno',label:'Próximo estreno',body:'✨ Próximamente: {{novela}}, traducida por {{equipo_traductor}}. ¡Conoce el primer vistazo!'},
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
  l.id = 'df-css'; l.rel = 'stylesheet'; l.href = '/diffusion.css?v=4';
  document.head.appendChild(l);
}
export async function renderDiffusionPanel({ sb, root, team = null, permissions = {}, esc, toast }) {
  if (!root) return;
  stylesheet();
  const official = !team, scope = official ? 'cuentas oficiales de El Obi' : 'redes de ' + team.name;
  const p = k => official || !!permissions[k];
  const canManage = p('diffusion_manage'), canCompose = p('diffusion_compose');
  const canLogs = p('diffusion_logs'), canAnnounce = p('diffusion_publish');
  const canSchedule = p('diffusion_schedule') && canAnnounce;
  let tab = 'resumen', rules = [], campaigns = [], connections = [], jobs = [], scheduled = [];
  let telegramFeedback = '', editingCampaignId = '', annDraftMessage = '', annDraftTitle = '', annFeedback = '';
  let annConfirm = null, annSending = false, annResults = [];
  let annDraftId = '';
  const deep = new URLSearchParams(location.search);
  const deepKind = ({o:'series',v:'volume',c:'chapter'})[deep.get('k')] || (['series','volume','chapter'].includes(deep.get('kind')) ? deep.get('kind') : '');
  const deepSource = /^[0-9a-f-]{36}$/i.test(deep.get('id')||deep.get('source')||'') ? (deep.get('id')||deep.get('source')) : '';
  const deepSeries = /^[0-9a-f-]{36}$/i.test(deep.get('s')||deep.get('series')||'') ? (deep.get('s')||deep.get('series')) : '';
  let deepPending = !!(deepKind && deepSource);
  let annWorks=[],annItems=[],annLoaded=false,annWork='',annSource='',annConnection='',annConnectionIds=[],annKind=deepKind||'series',annPreview=null,annScheduledId='';
  let scheduleFeedback = '', scheduleChangingId = '', scheduleConfirm = null, scheduleSaving = false, scheduleNotice = '';
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
  const message = 'Discord y Telegram: programa anuncios por fecha desde Anunciar o activa reglas para futuras publicaciones desde Automatizaciones. Ninguna regla se activa sin confirmación.';
  root.innerHTML = '<div class="df" aria-live="polite"><p class="df-empty">Cargando Difusión…</p></div>';
  try {
    [connections,rules,campaigns,jobs,scheduled] = await Promise.all([
      q('diffusion_connections','id,provider,label,status,created_at'),
      q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,connection_id,connection_ids,template_campaign_id,enabled_at,created_at'),
      q('diffusion_campaigns','id,title,body,status,scheduled_at,created_at'),
      canLogs ? q('diffusion_jobs','id,status,scheduled_at,last_error,created_at') : Promise.resolve([]),
      q('diffusion_scheduled_announcements','id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at')
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
    + '<h2>Centro de Difusión</h2><p>' + safe(scope) + '</p></div><span class="df-stage">DISCORD Y TELEGRAM · MANUAL / PROGRAMADO</span></div>'
    + '<nav class="df-tabs" aria-label="Secciones de Difusión">'
    + tabs.map(([id,name])=>'<button type="button" data-dtab="' + id + '" class="' + (tab===id?'on':'')
      + '" aria-current="' + (tab===id?'page':'false') + '">' + name + '</button>').join('') + '</nav>'
    + '<p class="df-note">' + safe(message) + '</p>';
  const cards = () => '<div class="df-cards">'
    + [['Conexiones activas',connections.filter(c=>['discord','telegram'].includes(c.provider)&&c.status==='active').length],['Agenda pendiente',scheduled.filter(c=>c.status==='planned').length],['Borradores',campaigns.filter(c=>c.status==='draft').length],['Registros recientes',canLogs?jobs.length:'—']]
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
  const availableDrafts = () => campaigns.filter(c=>c.status==='draft'&&String(c.body||'').trim());
  const savedDraftOptions = chosen => '<option value="">Mensaje predeterminado de El Obi</option>'
    +availableDrafts().map(c=>'<option value="'+safe(c.id)+'"'+(chosen===c.id?' selected':'')+'>'+safe(c.title)+'</option>').join('');
  const rulesView = () => '<section class="df-box"><h3>Automatizaciones del ' + (official?'Bibliotecario':'equipo') + '</h3>'
    + '<p>Configura una regla y pulsa <strong>Activar</strong> para que los próximos anuncios de obras, publicaciones de capítulos o volúmenes se comuniquen en los canales seleccionados. Cada canal recibe un anuncio independiente, sin duplicados ni retropublicaciones.</p>'
    + '<p class="df-muted">Elige «Automática» para publicar sin intervención o «Revisión interna» para confirmar en Calendario. Puedes asociar un borrador a cada regla. Solo se aplica a acontecimientos futuros. Para cambiar el mensaje de una regla activa, debes pausarla; esto cancela sus envíos pendientes, así que revisa primero el Calendario.</p>'
    + (!availableDrafts().length?'<p class="df-muted">No hay borradores disponibles todavía. Créalo primero desde la sección Borradores.</p>'
      +(canCompose?'<button type="button" class="df-link" data-goto="campanas">Crear un borrador</button>':''):'')
    + (rules.length ? '<div class="df-list">' + rules.map(r=>{
       const destinations=connections.filter(c=>c.status==='active'&&['discord','telegram'].includes(c.provider));
       const supported=['chapter.public','volume.public','prelaunch.announced'].includes(r.event_kind);
       const selectedIds=Array.isArray(r.connection_ids)&&r.connection_ids.length?r.connection_ids:(r.connection_id?[r.connection_id]:[]);
       const selected=connections.filter(c=>selectedIds.includes(c.id));
       return '<article><div><strong>'+safe(r.name)+'</strong>'
       + '<small>'+safe(shortName(r.event_kind))+' · '+(r.mode==='team_review'?'Revisión interna':'Automática')
       + ' · Retraso: '+r.delay_minutes+' min · '+(r.enabled?'Activa':'Inactiva')
       + (selected.length?' · '+safe(selected.map(c=>c.provider.toUpperCase()+' · '+c.label).join(' / ')):' · Sin canales seleccionados')+'</small>'
       + (!supported?'<small>Este evento aún no admite activación automática; puedes eliminar y crear una regla de capítulo o volumen.</small>':'')
       + '<small>Mensaje: '+safe(campaigns.find(c=>c.id===r.template_campaign_id)?.title||'Predeterminado de El Obi')+'</small>'
       + '</div>'
       + (canManage?'<div>'
          + (!r.enabled
            ? '<label>Usar borrador guardado<select data-rule-draft="'+safe(r.id)+'">'
              +savedDraftOptions(r.template_campaign_id||'')+'</select></label>'
              +'<button type="button" class="df-link" data-rule-draft-save="'+safe(r.id)+'">Guardar mensaje de esta regla</button>'
            : '<small>Pausar cancelará los anuncios pendientes de esta regla. Consulta el Calendario antes de cambiar el borrador.</small>')
          + (r.enabled?'<button type="button" class="df-danger" data-rule-pause="'+safe(r.id)+'">Pausar regla</button>'
           :supported&&destinations.length?'<fieldset class="df-destination-group" aria-label="Canales para esta automatización"><legend>Canales de difusión (puedes elegir varios)</legend>'
                + destinations.map(c=>'<label class="df-destination-option"><input type="checkbox" data-rule-destination="'+safe(r.id)+'" value="'+safe(c.id)+'" '
                    +(selectedIds.includes(c.id)?'checked':'')+'><span>'+safe(c.provider.toUpperCase()+' · '+c.label)+'</span></label>').join('')
                + '<small>Hasta 8 conexiones activas del equipo. Cada una tendrá su propio envío y estado.</small></fieldset>'
                + '<button type="button" class="btn" data-rule-activate="'+safe(r.id)+'">Activar regla</button>'
             :'<small>Conecta y verifica un destino antes de activar.</small>')
          + (!r.enabled?'<button type="button" data-del-rule="'+safe(r.id)+'" class="df-danger">Eliminar</button>':'')
          + '</div>':'')+'</article>';
      }).join('')+'</div>' : empty('Todavía no hay reglas configuradas.'))
    + (canManage ? '<form id="df-rule-form" class="df-form"><h4>Crear una regla</h4>'
       + '<label>Nombre<input name="name" maxlength="100" minlength="2" required placeholder="Ej. Nuevo volumen en las redes"></label>'
       + '<label>Evento<select name="event"><option value="chapter.public">Capítulo publicado</option>'
       + '<option value="volume.public">Volumen publicado</option><option value="prelaunch.announced">Nueva obra anunciada (preestreno)</option></select></label>'
       + '<label>Modalidad<select name="mode"><option value="automatic">Publicación automática</option>'
       + '<option value="team_review">Con revisión interna del equipo</option></select></label>'
       + '<label>Usar borrador guardado<select name="template_id">'+savedDraftOptions('')+'</select></label>'
       + '<p class="df-muted">Se copia el texto del borrador al vincularlo con la regla. Podrás cambiarlo mientras esté pausada. Se aplica solo a futuras publicaciones.</p>'
       + '<label>Retraso en minutos<input type="number" name="delay" min="0" max="10080" value="0" required></label>'
       + '<button type="submit" class="btn">Guardar regla</button>'
       + '<p class="df-muted">Se guarda inactiva para que puedas elegir el destino y pulsar «Activar regla» expresamente.</p></form>'
       : '<p class="df-muted">Necesitas «Gestionar difusión» y «Programar/Publicar difusión» para activar reglas.</p>')+'</section>';
  const editingCampaign = () => campaigns.find(c=>c.id===editingCampaignId&&c.status==='draft');
  const templateOptions = () => '<option value="">Seleccionar plantilla (opcional)</option>'
    + EDITORIAL_TEMPLATES.map(t=>'<option value="'+safe(t.id)+'">'+safe(t.label)+'</option>').join('');

  const draftContext = work => ({
    novela:work?.title||'',equipo_traductor:team?.name||'El Obi del Lector',
    sinopsis:work?.synopsis||'',autor:work?.author||''
  });
  const validatedDraftMessage = raw => {
    const result=renderDraftTemplate(raw,draftContext(annWorks.find(w=>w.id===annWork)));
    if(result.errors.length)throw new Error('Corrige las variables del texto: '+result.errors.join(' '));
    if(!result.text.trim())throw new Error('El mensaje no puede estar vacío.');
    return result.text.trim();
  };
  // Las plantillas solo afectan el mensaje editorial, no el SEO ni la presentación de la tarjeta.
  const campaignsView = () => '<section class="df-box"><h3>Plantillas de anuncios</h3>'
    +'<p>Guarda y reutiliza mensajes para Anunciar y Automatizaciones. El nombre, la portada y los metadatos del enlace se toman siempre de la obra, no de la plantilla.</p>'
    +(campaigns.filter(c=>c.status==='draft').length?'<div class="df-list">'
      +campaigns.filter(c=>c.status==='draft').map(c=>'<article><div><strong>'+safe(c.title)+'</strong>'
        +'<small>Plantilla guardada · '+when(c.created_at)+'</small>'
        +'<p>'+safe((c.body||'').slice(0,350))+'</p></div><div>'
        +(canAnnounce?'<button type="button" class="btn" data-use-campaign="'+safe(c.id)+'">Preparar anuncio</button> ':'')
        +(canCompose?'<button type="button" class="btn" data-edit-campaign="'+safe(c.id)+'">Editar</button> '
          +'<button type="button" class="df-danger" data-del-campaign="'+safe(c.id)+'">Eliminar</button>':'')
        +'</div></article>').join('')+'</div>':empty('Todavía no hay plantillas.'))
    +(canCompose?'<form id="df-campaign-form" class="df-form"><h4>'+(editingCampaign()?'Editar plantilla':'Nueva plantilla')+'</h4>'
      +'<label>Nombre de la plantilla<input name="title" minlength="2" maxlength="140" required placeholder="Ej. Presentación de nueva obra" value="'+safe(editingCampaign()?.title||'')+'"></label>'
      +'<label>Texto sugerido<select id="df-campaign-template">'+templateOptions()+'</select></label>'
      +'<label>Mensaje con variables<textarea name="body" maxlength="2000" rows="5" placeholder="¡Les presentamos {{novela}} por {{equipo_traductor}}!">'+safe(editingCampaign()?.body||'')+'</textarea></label>'
      +'<div class="df-draft-variables" role="group" aria-label="Insertar variables">'
      +[['novela','Novela'],['equipo_traductor','Equipo productor / traductor'],['sinopsis','Sinopsis'],['autor','Autor']].map(([key,label])=>'<button type="button" class="df-link" data-draft-variable="'+key+'">＋ '+label+'</button>').join('')+'</div>'
      +'<p class="df-muted">Las variables se sustituyen al preparar un anuncio o al ocurrir un evento automático. El texto final debe tener como máximo 700 caracteres y se valida antes del envío.</p>'
      +'<button type="submit" class="btn">'+(editingCampaign()?'Guardar cambios':'Guardar plantilla')+'</button>'
      +(editingCampaign()?'<button type="button" class="df-link" id="df-campaign-cancel">Cancelar edición</button>':'')
      +'</form>':'<p class="df-muted">Necesitas «Redactar difusión» para crear o editar plantillas.</p>')
    +'</section>';
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
  const annTargets = () => manualTargets(annConnections(),annConnectionIds);
  const annOptions = () => annKind==='series' ? [] : annItems.filter(x=>x.status==='published');
  const annSelected = (items,id,label) => items.map(x=>'<option value="'+safe(x.id)+'"'+(x.id===id?' selected':'')+'>'+safe(label(x))+'</option>').join('');
  const annView = () => '<section class="df-box"><h3>Anunciar contenido en Discord o Telegram</h3>'
    + '<p>Selecciona una obra, volumen o capítulo publicado y uno o varios canales. Revisa el mensaje y confirma antes de enviarlo; cada canal recibe su propia publicación.</p>'
    + '<p>Una obra se anuncia con su portada general. Los volúmenes y capítulos usan siempre la portada del volumen correspondiente. Si falta esa imagen, no se enviará el anuncio.</p>'
    + (annSending?'<p role="status" aria-live="assertive" class="df-note">Enviando los anuncios confirmados, uno por canal. No repitas la operación.</p>':'')
    + (annResults.length?'<section id="df-ann-result-summary" class="df-send-results" role="status" tabindex="-1" aria-live="polite">'
       + (annResults.some(r=>r.status==='sent')?'<h3 class="df-success-heading">'+safe(immediateDeliveryNotice(annResults))+'</h3>'
         :'<h3 class="df-warning-heading">'+safe(immediateDeliveryNotice(annResults))+'</h3>')
       + '<h4>Resultado por canal</h4><ul>'
       + annResults.map(r=>'<li><strong>'+safe(r.channel.provider.toUpperCase()+' · '+r.channel.label)+'</strong>: '
          +safe(({sent:'Enviado',already:'Ya anunciado',blocked:'No enviado',uncertain:'Entrega sin confirmar'})[r.status]||'Sin confirmación')+'</li>').join('')
       + '</ul><p>Si algún canal quedó sin confirmar, comprueba su historial antes de intentar otra publicación.</p></section>':'')
    + (!canAnnounce ? empty('Necesitas el permiso «Publicar difusión».')
      : !annConnections().length ? empty('Primero conecta Discord o Telegram y envía una prueba desde «Conexiones».')
      : '<div class="df-form">'
        + '<fieldset class="df-destination-group" id="df-ann-targets"><legend>Canales de difusión (puedes elegir varios)</legend>'
        + annConnections().map(c=>'<label class="df-destination-option"><input type="checkbox" data-ann-target value="'+safe(c.id)+'" '
             +(annConnectionIds.includes(c.id)?'checked':'')+'><span>'+safe(c.provider.toUpperCase()+' · '+c.label)+'</span></label>').join('')
        + '<small>Entre 1 y 8 conexiones activas. Cada canal tendrá su propio resultado; no se reintentan envíos inciertos.</small></fieldset>'
        + '<label>Tipo de anuncio<select id="df-ann-kind">'
          + [['series','Nueva obra'],['volume','Nuevo volumen'],['chapter','Nuevo capítulo']]
            .map(([k,v])=>'<option value="'+k+'"'+(annKind===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label>'
        + '<label>Obra<select id="df-ann-work">'+annSelected(annWorks,annWork,x=>x.title)+'</select></label>'
        + (annKind==='series'?'':'<label>'+(annKind==='volume'?'Volumen':'Capítulo')
          + '<select id="df-ann-source">'+annSelected(annOptions(),annSource,x=>annKind==='volume'?'Volumen '+x.num+(x.title?' — '+x.title:''):'Capítulo '+x.num+(x.title?' — '+x.title:''))+'</select></label>')
        + '<label>Usar borrador guardado<select id="df-ann-draft">'
          +savedDraftOptions(annDraftId)+'</select></label>'
        + '<p class="df-muted">Elige un borrador y pulsa «Crear vista previa» con la obra seleccionada. Puedes modificar el texto antes de enviarlo o programarlo.</p>'
        + (!availableDrafts().length?'<p class="df-muted">Todavía no tienes borradores para seleccionar.</p>'
          +(canCompose?'<button type="button" class="df-link" data-goto="campanas">Crear un borrador</button>':''):'')
        + (!annWorks.length ? empty('No hay obras públicas disponibles en este ámbito.')
           : annKind!=='series'&&!annOptions().length ? empty('No hay contenidos publicados de ese tipo para esta obra.')
           : '<button type="button" class="btn" id="df-ann-preview">Crear vista previa</button>')
        + '</div>'
        + (annPreview ? '<div class="df-box"><h4>Vista previa (todavía no enviada)</h4>'
          + (annCover(annPreview.cover_path)?'<img loading="lazy" alt="Portada del anuncio" src="'+safe(annCover(annPreview.cover_path))+'" style="max-width:112px;height:auto;float:right;margin:0 0 12px 12px;border-radius:6px">':'')
          + '<p><strong>'+safe(annPreview.title)+'</strong></p>'
          + '<p>'+safe(annPreview.description||'')+'</p>'
          + '<p><a href="'+safe(annPreview.url)+'" target="_blank" rel="noopener noreferrer">'+safe(annPreview.url)+'</a></p>'
          + (annDraftTitle?'<p class="df-muted">Texto del borrador: '+safe(annDraftTitle)+'</p>':'')
          + '<label>Plantilla para el texto<select id="df-ann-template"><option value="">'
          + (annDraftTitle?'Usar borrador seleccionado':'Texto sugerido por El Obi')+'</option>'
          + EDITORIAL_TEMPLATES.map(t=>'<option value="'+safe(t.id)+'">'+safe(t.label)+'</option>').join('')+'</select></label>'
          + '<label>Texto del anuncio<textarea id="df-ann-text" maxlength="700" rows="3">'+safe(annPreview.message)+'</textarea></label>'
          + '<p class="df-muted">Enviarás el mismo texto únicamente a los canales marcados. Cada conexión tiene un límite de un anuncio por contenido y no se reintentan entregas inciertas.</p>'
          + (canSchedule?'<div class="df-form"><label>Fecha y hora de difusión (hora local de tu dispositivo)'
          + '<input type="datetime-local" id="df-ann-schedule-at" step="60"></label>'
          + '<label>Modo de entrega<select id="df-ann-delivery"><option value="manual">Manual: confirmar el envío al llegar la fecha</option><option value="automatic">Automático: enviar cuando llegue la fecha</option></select></label>'
          + '<p class="df-muted">Entre 2 minutos y 90 días. El automático solo se activa al elegirlo explícitamente; los fallos inciertos nunca se reintentan solos.</p>'
          + '<button type="button" class="btn" id="df-ann-schedule" '+(scheduleSaving?'disabled':'')+'>Agregar al calendario</button></div>':'')
          + (canCompose?'<button type="button" class="df-link" id="df-ann-save-draft">Guardar texto como borrador</button> ':'')
          + '<button type="button" class="btn" id="df-ann-send" '+(annSending?'disabled':'')+'>Revisar y confirmar envío a '+annConnectionIds.length+' canal(es)</button></div>' : '')
       + '<div class="df-note" role="alert" id="df-ann-feedback">'+safe(annFeedback)+'</div>'
       + (scheduleConfirm?'<dialog id="df-schedule-confirm-dialog" class="df-confirm-dialog" aria-labelledby="df-schedule-confirm-title">'
         + '<h3 id="df-schedule-confirm-title">Confirmar programación de '+scheduleConfirm.targets.length+' canales</h3>'
         + '<p>Modo: <strong>'+safe(scheduleConfirm.delivery==='automatic'?'Automático (en la fecha indicada)':'Manual (requiere envío posterior)')+'</strong></p>'
         + '<p>Fecha: '+safe(when(scheduleConfirm.at))+'</p>'
         + '<ul>'+scheduleConfirm.targets.map(c=>'<li>'+safe(c.provider.toUpperCase()+' · '+c.label)+'</li>').join('')+'</ul>'
         + '<p>Al confirmar se guardará un anuncio por canal. <strong>Programado no significa enviado.</strong> Puedes comprobar los envíos automáticos en Calendario.</p>'
         + '<div class="df-confirm-actions"><button type="button" id="df-schedule-confirm-cancel" class="df-link">Cancelar</button>'
         + '<button type="button" id="df-schedule-confirm-accept" class="btn">Sí, programar '+scheduleConfirm.targets.length+' anuncios</button></div></dialog>':'')
       + (annConfirm?'<dialog id="df-ann-confirm-dialog" class="df-confirm-dialog" aria-labelledby="df-ann-confirm-title" aria-describedby="df-ann-confirm-description">'
          + '<h3 id="df-ann-confirm-title">Confirmar envío a '+annConfirm.targets.length+' canales</h3>'
          + '<p id="df-ann-confirm-description">Se publicará el anuncio <strong>'+safe(annConfirm.title)+'</strong> ahora mismo en los siguientes destinos:</p>'
          + '<ul>'+annConfirm.targets.map(t=>'<li>'+safe(t.provider.toUpperCase()+' · '+t.label)+'</li>').join('')+'</ul>'
          + '<p>Esta operación no se puede deshacer. Cada canal recibe un mensaje independiente. Comprueba los resultados antes de repetir un envío.</p>'
          + '<div class="df-confirm-actions"><button type="button" id="df-ann-confirm-cancel" class="df-link">Cancelar</button>'
          + '<button type="button" id="df-ann-confirm-accept" class="btn">Sí, enviar ahora a '+annConfirm.targets.length+' canales</button></div></dialog>':'')
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
    let req=sb.from('series').select('id,title,slug,synopsis,author').eq('published',true)
      .is('archived_at',null).order('title').limit(150);
    if(team)req=req.eq('team_id',team.id);
    const {data,error}=await req;
    if(error)throw error;
    annWorks=data||[];annLoaded=true;
    annWork=annWorks.find(x=>x.id===(deepSeries||(annKind==='series'?deepSource:'')))?.id||annWorks[0]?.id||'';
    const allowed=annConnections();
    annConnectionIds=annConnectionIds.filter(id=>allowed.some(c=>c.id===id));
    if(!annConnectionIds.length&&allowed.length)annConnectionIds=[allowed[0].id];
    annConnection=annConnectionIds[0]||'';
    await loadAnnItems();deepPending=false;
  };

  const scheduleView = () => '<section class="df-box"><h3>Agenda de Discord y Telegram</h3>'
    + '<p>Los anuncios manuales requieren confirmación. Los automáticos se enviarán a Discord o Telegram al llegar la fecha si el contenido sigue público. Una entrega incierta requiere revisión y no se reintenta sola.</p>'
    + '<p class="df-muted">Las horas se muestran según la zona horaria de tu dispositivo. Las publicaciones canceladas no se envían.</p>'
    + (scheduleNotice?'<div id="df-schedule-sent-notice" class="df-confirmation-notice" role="status" aria-live="polite">'
       + '<strong>'+safe(scheduleNotice)+'</strong></div>':'')
    + '<button type="button" class="btn" id="df-schedule-refresh">Actualizar estado de los anuncios</button>'
    + '<div class="df-note" id="df-schedule-feedback" role="status">'+safe(scheduleFeedback)+'</div>'
    + (scheduled.length ? '<div class="df-list">'
      + [...scheduled].sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)).map(item=>{
        const future=Date.parse(item.scheduled_at)>Date.now();
        const conn=connections.find(c=>c.id===item.connection_id);
        const active=conn?.status==='active';
        const planned=item.status==='planned';
        return '<article><div><strong>'+safe(item.title_snapshot)+'</strong>'
          + '<small>'+safe(item.provider.toUpperCase()+' · '+(conn?.label||'Conexión no disponible'))
          + ' · '+safe(item.source_type)+' · '+when(item.scheduled_at)+'</small>'
          + '<p>'+safe(item.message)+'</p>'
          + '<small>'+safe(planned?(item.delivery_mode==='automatic'?(future?'Automático: en espera':'Automático: pendiente del despachador'):(future?'Previsto, sin envío automático':'Fecha cumplida: pendiente de envío manual'))
             :item.status==='sent'?'Enviado y confirmado':item.status==='processing'?'Envío en curso':item.status==='unknown'?'Entrega incierta: revisar antes de reenviar':item.status==='blocked'?'Bloqueado: contenido o conexión no disponibles':'Cancelado')+'</small></div>'
          + (planned?'<div>'
             + (canAnnounce&&active&&item.delivery_mode!=='automatic'&&!item.prelaunch_volume_id?'<button type="button" class="btn" data-schedule-prepare="'+safe(item.id)+'">'
                +(future?'Revisar anuncio':'Preparar envío')+'</button> ':'')
             + (canAnnounce&&canSchedule&&active&&item.delivery_mode==='manual'&&item.prelaunch_volume_id
                 ?'<button type="button" class="btn" data-prelaunch-approve="'+safe(item.id)+'">Aprobar anuncio</button> ':'')
             + (canSchedule?'<button type="button" class="df-link" data-schedule-change="'+safe(item.id)+'">Cambiar fecha</button> '
                + '<button type="button" class="df-danger" data-schedule-cancel="'+safe(item.id)+'">Cancelar</button> ':'')
             + (canSchedule&&scheduleChangingId===item.id
                ? '<label>Nueva fecha y hora local<input type="datetime-local" data-schedule-at="'+safe(item.id)+'" step="60"></label>'
                  + '<button type="button" class="btn" data-schedule-save="'+safe(item.id)+'">Guardar nueva fecha</button>':'')
             + (canAnnounce?'<button type="button" class="df-link" data-schedule-finalize="'+safe(item.id)+'">Comprobar si ya se envió</button>':'')
             + '</div>':'')
          + '</article>';
      }).join('')+'</div>' : empty('Aún no hay publicaciones previstas. Prepara un anuncio y pulsa «Agregar al calendario».'))
    + '</section>';
  function page() {
    if (tab==='conexiones') return connectionsView();
    if (tab==='anuncios') return annView();
    if (tab==='reglas') return rulesView();
    if (tab==='campanas') return campaignsView();
    if (tab==='calendario') return scheduleView();
    if (tab==='historial') return historyView();
    return cards() + '<div class="df-grid">'
      + '<section class="df-box"><h3>Autonomía editorial</h3><p>'
      + (official?'Administra aquí únicamente las cuentas oficiales de El Obi. Las publicaciones de los equipos no necesitan tu aprobación.'
        :'Tu equipo decide cuándo y dónde publicar en sus redes. No necesita aprobación del Bibliotecario.')
      + '</p><button type="button" class="df-link" data-goto="reglas">Preparar automatización →</button></section>'
      + '<section class="df-box"><h3>Borradores editoriales</h3><p>Prepara, edita y reutiliza mensajes en envíos manuales a Discord o Telegram.</p>'
      + '<button type="button" class="df-link" data-goto="campanas">Crear borrador →</button></section></div>';
  }
  async function refreshCalendarStatus(){
    const previous=scheduled;
    const latest=await q('diffusion_scheduled_announcements',
      'id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
    scheduled=latest;
    const notice=automaticDeliveryNotice(previous,latest,connections);
    if(notice){
      scheduleNotice=notice;
      scheduleFeedback='Confirmado por el despachador automático.';
      toast(notice);
    }else if(!scheduleNotice){
      scheduleFeedback='Estados actualizados. Los anuncios programados no cuentan como enviados hasta que aparezcan confirmados.';
    }
  }
  function draw() {
    if (!root.isConnected) return;
    root.innerHTML = '<div class="df">' + header() + page() + '</div>';
    root.querySelectorAll('[data-dtab],[data-goto]').forEach(b => b.onclick = async () => {
      tab = b.dataset.dtab || b.dataset.goto;
      if(tab==='anuncios'&&!annLoaded) {
        try{await loadAnnWorks();}catch(e){toast('No se pudo cargar el catálogo para anuncios.');}
      }
      if(tab==='calendario'){
        try{await refreshCalendarStatus();}catch{scheduleFeedback='No se pudo actualizar el calendario. Inténtalo nuevamente.';}
      }
      draw();
    });
    root.querySelector('#df-schedule-refresh')?.addEventListener('click',e=>busy(e.currentTarget,async()=>{
      await refreshCalendarStatus();draw();
    }));
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

    root.querySelectorAll('[data-ann-target]').forEach(input=>input.addEventListener('change',()=>{
      annConnectionIds=[...root.querySelectorAll('[data-ann-target]:checked')].map(el=>el.value);
      annConnection=annConnectionIds[0]||'';
      annPreview=null;annScheduledId='';annFeedback='';
      draw();
    }));
    root.querySelector('#df-ann-draft')?.addEventListener('change',e=>{
      annDraftId=e.target.value;
      const selected=availableDrafts().find(c=>c.id===annDraftId);
      annDraftMessage=selected?String(selected.body||'').trim():'';
      annDraftTitle=selected?.title||'';
      annPreview=null;annFeedback='';annScheduledId='';draw();
    });
    root.querySelector('#df-ann-kind')?.addEventListener('change',e=>{
      annKind=e.target.value;annPreview=null;annScheduledId='';annFeedback='';
      loadAnnItems().then(draw).catch(()=>toast('No se pudieron cargar los contenidos.'));
    });
    root.querySelector('#df-ann-work')?.addEventListener('change',e=>{
      annWork=e.target.value;annPreview=null;annScheduledId='';annFeedback='';
      loadAnnItems().then(draw).catch(()=>toast('No se pudieron cargar los contenidos.'));
    });
    root.querySelector('#df-ann-source')?.addEventListener('change',e=>{
      annSource=e.target.value;annPreview=null;annScheduledId='';annFeedback='';draw();
    });
    root.querySelector('#df-ann-preview')?.addEventListener('click',e=>busy(e.currentTarget,async()=>{
      const targets=annTargets();
      if(!chosenAnnouncementId())throw new Error('Selecciona un contenido publicado.');
      const previews=await Promise.all(targets.map(async target=>{
        const {data,error}=await sb.rpc('diffusion_'+target.provider+'_announcement_preview',{
          p_connection:target.id,p_kind:annKind,p_source:chosenAnnouncementId()
        });
        if(error)return {data:null,error};
        return {data,error:null};
      }));
      const failed=previews.find(x=>x.error||!x.data?.url);
      const error=failed?.error;
      const data=previews[0]?.data;
      if(error?.message==='missing_volume_cover')
        throw new Error('Este volumen no tiene portada propia. Añade la portada del volumen antes de anunciarlo o anunciar uno de sus capítulos.');
      if(error?.message==='missing_work_cover')
        throw new Error('Esta obra no tiene portada general. Añádela antes de anunciarla.');
      if(error?.message==='invalid_cover_path')
        throw new Error('La ruta de la portada no es válida para compartir. Corrige la imagen y vuelve a intentarlo.');
      if(error||!data?.url||failed)
        throw new Error('No se pudo crear la vista previa para todos los canales: verifica sus conexiones y permisos.');
      if(previews.some(x=>x.data.url!==data.url||x.data.title!==data.title||
          x.data.cover_path!==data.cover_path))
        throw new Error('La obra o su portada no coinciden entre canales. No se enviará el anuncio.');
      let finalMessage=annDraftMessage||data.message;
      if(annDraftTitle){
        const dataForWork=annWorks.find(w=>w.id===annWork);
        const resolved=renderDraftTemplate(finalMessage,draftContext(dataForWork));
        if(resolved.errors.length)throw new Error('Corrige las variables: '+resolved.errors.join(' '));
        finalMessage=resolved.text;
        if(!finalMessage.trim())throw new Error('El anuncio queda vacío.');
      }
      annPreview={...data,message:finalMessage};annFeedback='';draw();
    }));
    root.querySelector('#df-ann-template')?.addEventListener('change',e=>{
      const area=root.querySelector('#df-ann-text');
      if(area&&annPreview){
        const raw=editorialTemplate(e.target.value)||annPreview.message;
        try{area.value=validatedDraftMessage(raw);}catch(e){toast(e.message);}
      }
    });
    root.querySelector('#df-ann-save-draft')?.addEventListener('click',e=>busy(e.currentTarget,async()=>{
      const body=validatedDraftMessage(root.querySelector('#df-ann-text')?.value||'');
      if(!annPreview?.title)throw new Error('Prepara una vista previa antes de guardar.');
      const title=('Anuncio: '+annPreview.title).slice(0,140);
      const {error}=await sb.rpc('diffusion_campaign_draft_save',{
        p_team:teamId,p_id:null,p_title:title,p_body:body
      });
      if(error)throw new Error('No se pudo guardar este borrador.');
      campaigns=await q('diffusion_campaigns','id,title,body,status,scheduled_at,created_at');
      toast('Texto guardado como borrador, sin publicar');
    }));
    root.querySelector('#df-ann-schedule')?.addEventListener('click',()=>{
      if(scheduleSaving||scheduleConfirm||annSending)return;
      try{
        const raw=root.querySelector('#df-ann-schedule-at')?.value||'';
        const message=validatedDraftMessage(root.querySelector('#df-ann-text')?.value||'');
        const whenMs=raw?new Date(raw).getTime():NaN;
        const targets=annTargets();
        if(!annPreview?.url||!chosenAnnouncementId())throw new Error('Prepara la vista previa del contenido antes de agendarlo.');
        if(!message||message.length>700)throw new Error('Escribe un mensaje de 1 a 700 caracteres.');
        if(!Number.isFinite(whenMs)||whenMs-Date.now()<120000||whenMs-Date.now()>90*86400000)
          throw new Error('Selecciona una fecha entre 2 minutos y 90 días, en la hora local de tu dispositivo.');
        const delivery=root.querySelector('#df-ann-delivery')?.value||'manual';
        scheduleConfirm={targets,delivery,message,kind:annKind,sourceId:chosenAnnouncementId(),at:new Date(whenMs).toISOString()};
        annFeedback='';draw(); // Abrir confirmación interna; todavía no se guarda ni envía nada.
      }catch(error){annFeedback=error.message||'No se pudo preparar la programación.';draw();}
    });
    const scheduleDialog=root.querySelector('#df-schedule-confirm-dialog');
    if(scheduleDialog){
      const close=()=>{scheduleDialog.close();scheduleConfirm=null;draw();};
      root.querySelector('#df-schedule-confirm-cancel')?.addEventListener('click',close);
      scheduleDialog.addEventListener('cancel',e=>{e.preventDefault();close();});
      root.querySelector('#df-schedule-confirm-accept')?.addEventListener('click',async()=>{
        if(scheduleSaving||!scheduleConfirm)return;
        const pending=scheduleConfirm;scheduleConfirm=null;scheduleSaving=true;
        scheduleDialog.close();draw();
        try{
          const results=await manualChannelBatch(pending.targets,async target=>{
            const {error}=await sb.rpc('diffusion_schedule_create',{
              p_delivery:pending.delivery,p_connection:target.id,p_kind:pending.kind,
              p_source:pending.sourceId,p_message:pending.message,p_at:pending.at
            });
            if(!error)return {status:'scheduled'};
            if(['already_scheduled','already_announced'].includes(error.message))return {status:'already'};
            if(['forbidden','invalid_schedule','not_public','missing_volume_cover','missing_work_cover'].includes(error.message))
              return {status:'blocked'};
            return {status:'uncertain'};
          });
          const summary=batchFeedback(results,'scheduled');
          annPreview=null;annScheduledId='';
          if(results.some(x=>x.status==='scheduled'||x.status==='already')){
            scheduled=await q('diffusion_scheduled_announcements',
              'id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
            scheduleFeedback='Anuncios programados. '+summary+' Esto no confirma una entrega.';
            scheduleNotice='';tab='calendario';
          }else annFeedback=summary;
        }catch{
          annFeedback='No se pudo confirmar el resultado de la programación. Revisa Calendario antes de repetir.';
        }finally{scheduleSaving=false;draw();}
      });
      scheduleDialog.showModal();
    }
    root.querySelectorAll('[data-schedule-prepare]').forEach(b=>b.onclick=()=>{
      busy(b,async()=>{
        const item=scheduled.find(x=>x.id===b.dataset.schedulePrepare&&x.status==='planned');
        if(!item)throw new Error('El anuncio ya no está pendiente.');
        if(!annConnections().some(x=>x.id===item.connection_id))
          throw new Error('La conexión de este anuncio ya no está activa.');
        if(!annLoaded)await loadAnnWorks();
        if(!annWorks.some(x=>x.id===item.series_id))
          throw new Error('La obra ya no figura entre las obras públicas de este equipo.');
        annKind=item.source_type;annWork=item.series_id;annConnection=item.connection_id;annConnectionIds=[item.connection_id];
        await loadAnnItems();
        if(annKind!=='series'&&!annItems.some(x=>x.id===item.source_id))
          throw new Error('El contenido ya no aparece como publicado. No se enviará.');
        annSource=item.source_id;
        annDraftMessage=item.message;annDraftTitle='Anuncio previsto en calendario';
        annPreview=null;annScheduledId=item.id;annFeedback='';
        tab='anuncios';draw();
      });
    });
    root.querySelectorAll('[data-schedule-cancel]').forEach(b=>b.onclick=async()=>{
      if(!await confirmObi('¿Cancelar esta fecha? No se enviará nada desde la agenda.'))return;
      busy(b,async()=>{
        const {error}=await sb.rpc('diffusion_schedule_cancel',{p_id:b.dataset.scheduleCancel});
        if(error)throw new Error('No se pudo cancelar la fecha. Comprueba tus permisos.');
        scheduled=await q('diffusion_scheduled_announcements','id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
        scheduleFeedback='Fecha cancelada sin enviar mensajes.';draw();
      });
    });
    root.querySelectorAll('[data-schedule-change]').forEach(b=>b.onclick=()=>{
      scheduleChangingId=b.dataset.scheduleChange;draw();
    });
    root.querySelectorAll('[data-schedule-save]').forEach(b=>b.onclick=()=>{
      busy(b,async()=>{
        const raw=root.querySelector('[data-schedule-at="'+b.dataset.scheduleSave+'"]')?.value||'';
        const ms=raw?new Date(raw).getTime():NaN;
        if(!Number.isFinite(ms)||ms-Date.now()<120000||ms-Date.now()>90*86400000)
          throw new Error('Selecciona una nueva fecha entre 2 minutos y 90 días.');
        const {error}=await sb.rpc('diffusion_schedule_reschedule',{
          p_id:b.dataset.scheduleSave,p_at:new Date(ms).toISOString()
        });
        if(error)throw new Error('No se pudo reprogramar. Revisa tus permisos y que siga pendiente.');
        scheduled=await q('diffusion_scheduled_announcements','id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
        scheduleFeedback='Fecha actualizada.';scheduleChangingId='';draw();
      });
    });
    root.querySelectorAll('[data-schedule-finalize]').forEach(b=>b.onclick=()=>{
      busy(b,async()=>{
        const {error}=await sb.rpc('diffusion_schedule_finalize',{p_id:b.dataset.scheduleFinalize});
        if(error)throw new Error('No existe entrega confirmada para este contenido y destino. No se marcó como enviado.');
        scheduled=await q('diffusion_scheduled_announcements','id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
        scheduleFeedback='Se confirmó un envío ya registrado; calendario actualizado.';draw();
      });
    });
    root.querySelector('#df-ann-send')?.addEventListener('click',()=>{
      if(annSending||annConfirm)return;
      let content='';
      try{content=validatedDraftMessage(root.querySelector('#df-ann-text')?.value||'');}
      catch(e){annFeedback=e.message;const note=root.querySelector('#df-ann-feedback');if(note)note.textContent=annFeedback;return;}
      if(!content||content.length>700){
        annFeedback='Escribe un mensaje de 1 a 700 caracteres antes de enviarlo.';
        const note=root.querySelector('#df-ann-feedback');if(note)note.textContent=annFeedback;
        return;
      }
      if(!annPreview?.url||!chosenAnnouncementId()){
        annFeedback='Prepara la vista previa antes de confirmar el envío.';
        const note=root.querySelector('#df-ann-feedback');if(note)note.textContent=annFeedback;
        return;
      }
      let targets;
      try {targets=annTargets();}catch(err){
        annFeedback=err.message;const note=root.querySelector('#df-ann-feedback');if(note)note.textContent=annFeedback;
        return;
      }
      const currentPlan=scheduled.find(x=>x.id===annScheduledId&&x.status==='planned');
      if(currentPlan&&Date.parse(currentPlan.scheduled_at)>Date.now()){
        annFeedback='La fecha programada todavía no llega. Reprograma o cancela la fecha desde el calendario.';
        const note=root.querySelector('#df-ann-feedback');if(note)note.textContent=annFeedback;
        return;
      }
      // No usar window.confirm: algunos navegadores bloquean o silencian diálogos nativos.
      // Al abrir el diálogo NO se contacta ninguna red social.
      annPreview={...annPreview,message:content};
      annConfirm={targets,content,kind:annKind,sourceId:chosenAnnouncementId(),
        scheduledId:annScheduledId,primaryConnection:annConnection,title:annPreview.title};
      annFeedback='';annResults=[];
      draw();
    });
    const dialog=root.querySelector('#df-ann-confirm-dialog');
    if(dialog){
      root.querySelector('#df-ann-confirm-cancel')?.addEventListener('click',()=>{
        dialog.close();annConfirm=null;draw();
      });
      dialog.addEventListener('cancel',e=>{
        e.preventDefault();dialog.close();annConfirm=null;draw();
      });
      root.querySelector('#df-ann-confirm-accept')?.addEventListener('click',async()=>{
        if(annSending||!annConfirm)return;
        const pending=annConfirm;
        annConfirm=null;annSending=true;
        dialog.close();draw();
        try{
          let calendarWarning=false;
          const results=await manualChannelBatch(pending.targets,async target=>{
            const {data,error}=await sb.functions.invoke(
              target.provider==='telegram'?'diffusion-telegram':'diffusion-announcement',{
              body:{action:'announce',connection_id:target.id,kind:pending.kind,
                source_id:pending.sourceId,message:pending.content}
            });
            if(!error&&data?.ok){
              if(pending.scheduledId&&target.id===pending.primaryConnection){
                try{
                  const {error:doneError}=await sb.rpc('diffusion_schedule_finalize',
                    {p_id:pending.scheduledId});
                  if(doneError)calendarWarning=true;
                }catch{calendarWarning=true;}
              }
              return {status:'sent'};
            }
            const code=error?.context?.status;
            if(code===409||data?.error==='already_announced')return {status:'already'};
            if(code===429||code===403||data?.error==='rate_limited')return {status:'blocked'};
            return {status:'uncertain'};
          });
          annResults=results;
          const deliveryNotice=immediateDeliveryNotice(results);
          annFeedback=deliveryNotice+' '+batchFeedback(results)+(calendarWarning
            ?' Un envío fue confirmado, pero la agenda requiere comprobar su estado.':'');
          if(pending.scheduledId&&results.some(r=>r.status==='sent')){
            try{
              scheduled=await q('diffusion_scheduled_announcements',
                'id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
            }catch{
              annFeedback+=' No se pudo actualizar Calendario. Revisa su estado antes de repetir.';
            }
          }
          // Aviso inequívoco solo si el proveedor confirmó al menos un canal.
          if(results.some(r=>r.status==='sent'))toast(deliveryNotice);
          // Los intentos parciales o inciertos no quedan armados para otro clic.
          annPreview=null;annDraftMessage='';annDraftTitle='';annScheduledId='';
        }catch{
          annFeedback='No se pudo confirmar el resultado de la operación. Comprueba los canales y el historial antes de repetir.';
          annPreview=null;annScheduledId='';
          annResults=pending.targets.map(channel=>({channel,status:'uncertain'}));
        }finally{
          annSending=false;draw();
          root.querySelector('#df-ann-result-summary')?.focus();
        }
      });
      dialog.showModal();
    }

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
    root.querySelectorAll('[data-test-telegram]').forEach(b=>b.onclick=async()=>{
      if(!await confirmObi('¿Enviar una única prueba al grupo o canal de Telegram seleccionado?'))return;
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
    root.querySelectorAll('[data-revoke-telegram]').forEach(b=>b.onclick=async()=>{
      if(!await confirmObi('¿Desconectar el canal de Telegram y borrar su token cifrado?'))return;
      busy(b,async()=>{
        const {error}=await sb.rpc('diffusion_telegram_disconnect',{p_team:teamId,p_id:b.dataset.revokeTelegram});
        if(error)throw new Error('No se pudo desconectar Telegram.');
        connections=await q('diffusion_connections','id,provider,label,status,created_at');
        toast('Telegram desconectado y token revocado');draw();
      });
    });

    root.querySelectorAll('[data-test-discord]').forEach(b=>b.onclick=async()=>{
      if(!await confirmObi('¿Enviar un único mensaje de prueba a este canal de Discord?')) return;
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
    root.querySelectorAll('[data-revoke-discord]').forEach(b=>b.onclick=async()=>{
      if(!await confirmObi('¿Desconectar este webhook y borrar su secreto almacenado?'))return;
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
        const {data:ruleId,error} = await sb.rpc('diffusion_rule_save', {
          p_team:teamId, p_id:null, p_name:String(data.get('name')||''),
          p_event:String(data.get('event')||''),p_mode:String(data.get('mode')||'automatic'),
          p_delay:Number(data.get('delay'))
        });
        if (error) throw error;
        const campaign=String(data.get('template_id')||'');
        if(campaign){
          const {error:linkError}=await sb.rpc('diffusion_rule_template_set',{
            p_team:teamId,p_rule:ruleId,p_campaign:campaign
          });
          if(linkError){
            rules=await q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,connection_id,connection_ids,template_campaign_id,enabled_at,created_at');
            toast('La regla quedó inactiva, pero no se pudo vincular el borrador. Selecciónalo antes de activarla.');draw();return;
          }
        }
        rules = await q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,connection_id,connection_ids,template_campaign_id,enabled_at,created_at');
        toast('Regla guardada. Selecciona un destino y pulsa Activar regla.'); draw();
      });
    });
    root.querySelectorAll('[data-rule-draft-save]').forEach(button=>{
      button.addEventListener('click',()=>busy(button,async()=>{
        const id=button.dataset.ruleDraftSave;
        const campaign=root.querySelector('[data-rule-draft="'+id+'"]')?.value||null;
        const {error}=await sb.rpc('diffusion_rule_template_set',{
          p_team:teamId,p_rule:id,p_campaign:campaign
        });
        if(error)throw new Error('No se pudo vincular el borrador. Pausa la regla y utiliza un borrador de este equipo.');
        rules=await q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,connection_id,connection_ids,template_campaign_id,enabled_at,created_at');
        toast('Mensaje guardado para publicaciones futuras. La regla no se ha activado.');draw();
      }));
    });
    root.querySelectorAll('[data-rule-activate],[data-rule-pause]').forEach(button=>{
      button.addEventListener('click',()=>busy(button,async()=>{
        const id=button.dataset.ruleActivate||button.dataset.rulePause;
        const activate=Boolean(button.dataset.ruleActivate);
        const chosen=activate?[...root.querySelectorAll('[data-rule-destination="'+id+'"]:checked')].map(el=>el.value):null;
        if(activate&&(!chosen.length||chosen.length>8))throw new Error('Selecciona entre 1 y 8 canales de difusión activos.');
        if(activate&&!await confirmObi('¿Activar esta regla en '+chosen.length+' canal(es)? Se anunciarán solo publicaciones futuras.'))return;
        const {error}=await sb.rpc('diffusion_rule_toggle_multi',{
          p_team:teamId,p_id:id,p_enabled:activate,p_connections:chosen
        });
        if(error)throw new Error(error.message==='event_not_automatable_yet'
          ?'El evento seleccionado no admite automatización todavía.'
          :error.message==='destination_unavailable'?'Una conexión no está activa o no corresponde a este equipo.'
          :error.message==='invalid_destinations'?'Selecciona entre 1 y 8 conexiones distintas.'
          :'No se pudo cambiar la regla: revisa los permisos de Difusión.');
        rules=await q('diffusion_rules','id,name,event_kind,mode,delay_minutes,enabled,connection_id,connection_ids,template_campaign_id,enabled_at,created_at');
        scheduled=await q('diffusion_scheduled_announcements','id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
        toast(activate?'Regla activada para '+chosen.length+' canales de difusión.':'Regla pausada; anuncios pendientes cancelados.');
        draw();
      }));
    });
    root.querySelector('#df-campaign-template')?.addEventListener('change',e=>{
      const area=root.querySelector('#df-campaign-form textarea[name="body"]');
      const selected=editorialTemplate(e.target.value);
      if(area&&selected)area.value=selected;
    });
    root.querySelectorAll('[data-draft-variable]').forEach(button=>button.addEventListener('click',()=>{
      const area=root.querySelector('#df-campaign-form textarea[name="body"]');
      if(!area)return;
      area.setRangeText('{{'+button.dataset.draftVariable+'}}',area.selectionStart,area.selectionEnd,'end');
      area.focus();
    }));
    root.querySelectorAll('[data-edit-campaign]').forEach(b=>b.onclick=()=>{
      if(!canCompose)return;
      const item=campaigns.find(c=>c.id===b.dataset.editCampaign&&c.status==='draft');
      if(!item)return;
      editingCampaignId=item.id;tab='campanas';draw();
    });
    root.querySelector('#df-campaign-cancel')?.addEventListener('click',()=>{
      editingCampaignId='';draw();
    });
    root.querySelectorAll('[data-use-campaign]').forEach(b=>b.onclick=()=>{
      if(!canAnnounce)return;
      busy(b,async()=>{
        const item=campaigns.find(c=>c.id===b.dataset.useCampaign&&c.status==='draft');
        if(!item)throw new Error('Este borrador ya no está disponible.');
        const body=String(item.body||'').trim();
        if(body.length<1||body.length>2000)throw new Error('Revisa la longitud del borrador (máximo 2000 caracteres).');
        if(!annLoaded)await loadAnnWorks();
        annDraftId=item.id;annDraftMessage=body;annDraftTitle=item.title;annPreview=null;annFeedback='';
        tab='anuncios';draw();
      });
    });
    root.querySelector('#df-campaign-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const f=e.currentTarget, data=new FormData(f);
      busy(f.querySelector('button'), async () => {
        const { error } = await sb.rpc('diffusion_campaign_draft_save', {
          p_team:teamId,p_id:editingCampaignId||null,p_title:String(data.get('title')||''),
          p_body:String(data.get('body')||'')
        });
        if (error) throw new Error('No se pudo guardar el borrador. Comprueba tus permisos y que siga editable.');
        editingCampaignId='';
        campaigns = await q('diffusion_campaigns','id,title,body,status,scheduled_at,created_at');
        toast('Borrador guardado sin publicar');draw();
      });
    });
    root.querySelectorAll('[data-prelaunch-approve]').forEach(button=>{
      button.addEventListener('click',()=>busy(button,async()=>{
        if(!await confirmObi('¿Aprobar este anuncio de preestreno? El despachador lo enviará cuando corresponda.'))return;
        const {error}=await sb.rpc('diffusion_prelaunch_approve',{p_plan:button.dataset.prelaunchApprove});
        if(error)throw new Error('No se pudo aprobar el anuncio. Revisa permisos o estado del preestreno.');
        scheduled=await q('diffusion_scheduled_announcements',
          'id,connection_id,provider,source_type,source_id,series_id,title_snapshot,message,scheduled_at,status,delivery_mode,prelaunch_volume_id,last_error,created_at');
        toast('Anuncio aprobado; se enviará si el preestreno sigue público.');
        draw();
      }));
    });
    root.querySelectorAll('[data-del-rule],[data-del-campaign]').forEach(b => b.onclick = async () => {
      const isRule = !!b.dataset.delRule, id=b.dataset.delRule||b.dataset.delCampaign;
      if (!await confirmObi('¿Eliminar este borrador?')) return;
      busy(b, async()=>{
        const {error}=await sb.rpc('diffusion_draft_delete',{p_team:teamId,p_type:isRule?'rule':'campaign',p_id:id});
        if(error) throw error;
        if(isRule) rules=rules.filter(r=>r.id!==id);
        else { campaigns=campaigns.filter(c=>c.id!==id);if(editingCampaignId===id)editingCampaignId=''; }
        toast('Borrador eliminado');draw();
      });
    });
  }
  if(deepPending){tab='anuncios';try{await loadAnnWorks();}catch{toast('No se pudo abrir el anuncio solicitado.');}}
  // Sólo consulta automáticamente mientras la agenda está visible y existe
  // al menos un envío automático pendiente; no hace HTTP a Discord o Telegram.
  if(root._diffusionCalendarTimer)clearInterval(root._diffusionCalendarTimer);
  root._diffusionCalendarTimer=setInterval(async()=>{
    if(!root.isConnected){clearInterval(root._diffusionCalendarTimer);root._diffusionCalendarTimer=null;return;}
    if(tab!=='calendario'||document.visibilityState==='hidden'
       ||!scheduled.some(x=>x.delivery_mode==='automatic'&&['planned','processing'].includes(x.status)))return;
    try{await refreshCalendarStatus();draw();}catch{scheduleFeedback='No se pudo consultar el estado automático. Vuelve a actualizar.';draw();}
  },60000);
  draw();
}

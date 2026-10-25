// Centro de Difusión compartido. Discord Fase 2a: enlace seguro y prueba MANUAL; sin automatizaciones activas.
const EVENTS = [
  ['chapter.public', 'Capítulo público'],
  ['volume.public', 'Volumen completo'],
  ['prelaunch.announced', 'Preestreno anunciado'],
  ['content.unlocked', 'Apertura a todo público'],
  ['announcement.published', 'Anuncio editorial']
];
const TYPES = ['discord','telegram','facebook','instagram','threads','bluesky','mastodon','x','tiktok','webhook'];
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
  const canLogs = p('diffusion_logs');
  let tab = 'resumen', rules = [], campaigns = [], connections = [], jobs = [];
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
    ['resumen','Resumen'], ['conexiones','Conexiones'], ['reglas','Automatizaciones'],
    ['campanas','Borradores'], ['calendario','Calendario'], ['historial','Historial'],
    ['webhooks','Webhooks']
  ];
  const message = 'Las reglas permanecen inactivas y las campañas como borradores. '
    + 'Discord solo envía el mensaje de prueba cuando pulsas «Enviar prueba»; aún no hay publicaciones automáticas.';
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
    + '<h2>Centro de Difusión</h2><p>' + safe(scope) + '</p></div><span class="df-stage">DISCORD · PRUEBA MANUAL</span></div>'
    + '<nav class="df-tabs" aria-label="Secciones de Difusión">'
    + tabs.map(([id,name])=>'<button type="button" data-dtab="' + id + '" class="' + (tab===id?'on':'')
      + '" aria-current="' + (tab===id?'page':'false') + '">' + name + '</button>').join('') + '</nav>'
    + '<p class="df-note">' + safe(message) + '</p>';
  const cards = () => '<div class="df-cards">'
    + [['Conexiones',connections.length],['Reglas preparadas',rules.length],['Borradores',campaigns.length],['Envíos externos',0]]
      .map(([name,n])=>'<div class="df-card"><small>'+safe(name)+'</small><strong>'+n+'</strong></div>').join('')+'</div>';
  const connectionsView = () => '<section class="df-box"><h3>Conexiones sociales</h3>'
    + '<p>Discord utiliza una URL secreta cifrada en Supabase Vault. No la compartas por chat ni la publiques en GitHub; introdúcela únicamente en esta pantalla cuando esté habilitada.</p>'
    + (connections.filter(c=>c.status!=='revoked').length ? '<div class="df-list">' + connections.filter(c=>c.status!=='revoked').map(c=>'<article><div><strong>'+safe(c.label)+'</strong>'
      + '<small>'+safe(c.provider)+' · '+safe(c.status==='active'?'Prueba correcta':'Pendiente de prueba')+'</small></div>'
      + (canManage&&c.provider==='discord'?'<div><button type="button" class="btn" data-test-discord="'+safe(c.id)+'">Enviar prueba</button> '
      + '<button type="button" class="df-danger" data-revoke-discord="'+safe(c.id)+'">Desconectar</button></div>':'')
      + '</article>').join('')+'</div>' : empty('Aún no hay cuentas conectadas.'))
    + (canManage ? '<form id="df-discord-form" class="df-form" autocomplete="off"><h4>Conectar Discord</h4>'
      + '<label>Nombre de la conexión<input name="label" minlength="2" maxlength="100" required placeholder="Ej. Canal de novedades"></label>'
      + '<label>URL privada del webhook<input name="webhook" type="password" required autocomplete="off" spellcheck="false" inputmode="url" placeholder="https://discord.com/api/webhooks/…"></label>'
      + '<p class="df-muted">El enlace se envía una sola vez al servidor por HTTPS y se guarda cifrado en Vault. No se muestra otra vez. Una prueba solo se envía al pulsar el botón.</p>'
      + '<button type="submit" class="btn">Guardar conexión segura</button></form>'
      : '<p class="df-muted">Necesitas «Gestionar difusión» para conectar tu Discord.</p>')
    + '<h4>Proveedores previstos</h4><div class="df-providers">'+TYPES.map(n=>'<span>'+safe(n)+'</span>').join('')+'</div>'
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
  const campaignsView = () => '<section class="df-box"><h3>Borradores de publicaciones</h3>'
    + (campaigns.length ? '<div class="df-list">' + campaigns.map(c=>'<article><div><strong>'+safe(c.title)+'</strong>'
      + '<small>'+safe(c.status)+' · '+when(c.created_at)+'</small>'
      + '<p>'+safe(c.body).slice(0,350)+'</p></div>'
      + (canCompose&&c.status==='draft'?'<button type="button" data-del-campaign="'+safe(c.id)+'" class="df-danger">Eliminar</button>':'')
      + '</article>').join('')+'</div>' : empty('No hay borradores.'))
    + (canCompose ? '<form id="df-campaign-form" class="df-form"><h4>Nuevo borrador</h4>'
       + '<label>Título<input name="title" minlength="2" maxlength="140" required placeholder="Ej. Estreno del volumen 3"></label>'
       + '<label>Mensaje<textarea name="body" maxlength="2000" rows="4" placeholder="Presenta la novedad a tus lectores"></textarea></label>'
       + '<button type="submit" class="btn">Guardar borrador</button></form>'
       : '<p class="df-muted">Necesitas el permiso «Redactar difusión».</p>')+'</section>';
  const historyView = () => '<section class="df-box"><h3>Historial de envíos</h3>'
    + (canLogs ? (jobs.length ? '<div class="df-list">'+jobs.map(j=>'<article><strong>'+safe(j.status)+'</strong>'
      + '<small>'+when(j.scheduled_at)+'</small><p>'+safe(j.last_error||'')+'</p></article>').join('')+'</div>'
      : empty('Todavía no hay envíos registrados.')) : empty('Tu rol no permite ver los registros técnicos.'))
    + '</section>';
  function page() {
    if (tab==='conexiones') return connectionsView();
    if (tab==='reglas') return rulesView();
    if (tab==='campanas') return campaignsView();
    if (tab==='calendario') return '<section class="df-box"><h3>Calendario social</h3>'
      + empty('Se habilitará cuando el despachador y los conectores estén disponibles. No equivale al calendario de capítulos.')+'</section>';
    if (tab==='historial') return historyView();
    if (tab==='webhooks') return '<section class="df-box"><h3>Webhooks avanzados</h3>'
      + '<p>Se preparan integraciones salientes con Make, n8n y endpoints HTTPS autorizados. Las URL y firmas serán secretas y validadas en servidor.</p>'
      + empty('Creación de destinos y pruebas firmadas: próxima fase.')+'</section>';
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
    root.querySelectorAll('[data-dtab],[data-goto]').forEach(b => b.onclick = () => {
      tab = b.dataset.dtab || b.dataset.goto; draw();
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
    root.querySelectorAll('[data-test-discord]').forEach(b=>b.onclick=()=>{
      if(!confirm('¿Enviar un único mensaje de prueba a este canal de Discord?')) return;
      busy(b,async()=>{
        const {data,error}=await sb.functions.invoke('diffusion-discord',{
          body:{connection_id:b.dataset.testDiscord}
        });
        if(error||!data?.ok) throw new Error('Discord no recibió la prueba. Revisa permisos, conexión y espera un minuto antes de reintentar.');
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
  draw();
}

import { previewShareLink, resetTeamSession } from './studio-preview-share.js?v=1';
import { mountTeamReaderDefaults } from './studio-reader-defaults.js?v=1';
import { WORK_GENRES, WORK_DEMOGRAPHICS, createWorkData, renderWorkFields, bindWorkFields, workPayload } from './studio-work-fields.js?v=1';
// El editor y el importador cargan blocks.js al abrir sus pantallas.
// Estudio del traductor: obras, volúmenes, publicación, editor con guardado atómico, importador EPUB/DOCX/PDF, multimedia, equipo y colaboraciones.
document.addEventListener('click', e => { const i = e.target.closest?.('input[type=date],input[type=datetime-local]'); if (i && !i.disabled && !i.readOnly) try { i.showPicker(); } catch {} });
const LIMITS = { file: 80 * 1024 * 1024, entries: 15000, unzipped: 300 * 1024 * 1024, image: 8 * 1024 * 1024 };
const ACTIONS = [['view','Ver'],['edit','Editar'],['create','Crear'],['import','Importar'],['publish','Publicar'],['schedule','Programar'],['delete','Borrar'],['review','Revisar']];
const ROLES = [['owner','Propietario'],['admin','Administrador'],['translator','Traductor'],['editor','Editor'],['proofreader','Corrector'],['collaborator','Colaborador']];
const STG = { traduciendo: ['Traduciendo', 25, '#f2c230'], correccion: ['En corrección', 60, '#8cc3f2'], listo: ['Listo', 90, '#a9d18e'] };
const SEC = ['Capítulo','Prólogo','Interludio','Epílogo','Afterword','Extra'];
const GT = ['Personaje','Lugar','Organización','Honorífico','Cargo o título','Magia','Hechizo','Habilidad','Objeto','Arma','Criatura','Raza o especie','Comida','Bebida','Festival','Moneda','Unidad de medida','Referencia cultural','Modismo','Onomatopeya','Tabú','Otro'];
const BT = [['paragraph','Párrafo'],['heading','Título'],['quote','Cita'],['note','Nota del traductor'],['image','Ilustración'],['separator','Separador'],['ruby','Furigana']];

// La hoja de estilos de Studio se carga como recurso independiente.
export function createStudio(ctx){
  const { sb, app, $, esc, toast, go, getUser, getMe, url } = ctx;
  const PUB = `${url}/storage/v1/object/public/obi-media/`;
  const media = p => p ? (/^(https?|data|blob):/.test(p) ? p : PUB + encodeURI(p)) : '';
  const pathOf = u => u && u.startsWith(PUB) ? decodeURI(u.slice(PUB.length)) : null;
  const T = { userId: null, teams: [], team: null, perms: {}, works: null };
  const can = a => !!T.perms[a];
  // zona horaria del equipo: las fechas se muestran y se capturan en la hora del equipo
  const TZS = [['America/Mexico_City','Ciudad de México'],['America/Monterrey','Monterrey'],['America/Tijuana','Tijuana'],['America/Bogota','Bogotá'],['America/Lima','Lima'],['America/Caracas','Caracas'],['America/Santiago','Santiago de Chile'],['America/Argentina/Buenos_Aires','Buenos Aires'],['America/Montevideo','Montevideo'],['America/Guatemala','Centroamérica'],['America/Santo_Domingo','Santo Domingo'],['America/New_York','Nueva York · Miami'],['America/Los_Angeles','Los Ángeles'],['Europe/Madrid','Madrid'],['Asia/Tokyo','Tokio'],['UTC','UTC']];
  // por defecto: hora del dispositivo; cada quien puede cambiar a la hora del equipo
  const devTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const tzPick = () => localStorage.getItem('obi-tz-pick') || (localStorage.getItem('obi-tz-mode') === 'team' ? 'team' : 'device');
  const tz = () => { const k = tzPick(); return k === 'team' ? (T.tz || devTz()) : k === 'device' ? devTz() : k; };
  const tzOff = (d, z) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d); const g = k => +p.find(x => x.type === k).value; return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(d.getTime() / 1000) * 1000; };
  const fromLocal = v => { if (!v) return null; const [D, H] = v.split('T'), [y, m, d] = D.split('-').map(Number), [h, mi] = (H || '00:00').split(':').map(Number), g = Date.UTC(y, m - 1, d, h, mi); let ts = g - tzOff(new Date(g), tz()); ts = g - tzOff(new Date(ts), tz()); return new Date(ts).toISOString(); };
  const toLocal = iso => { const d = new Date(iso); return new Date(d.getTime() + tzOff(d, tz())).toISOString().slice(0, 16); };
  const fmtTz = (d, o) => new Date(d).toLocaleString('es-MX', { ...(o || { dateStyle: 'medium', timeStyle: 'short' }), timeZone: tz() });
  const tzLabel = z => (TZS.find(x => x[0] === z) || [, z.split('/').pop().replace(/_/g, ' ')])[1];
  const tzName = () => tzLabel(tz());
  const tzHint = () => {
    const team = T.tz && T.tz !== devTz(), onTeam = tz() !== devTz();
    return `<span class="mono tz-h">${onTeam ? 'hora del equipo' : 'tu hora'} · ${esc(tzName())}${team ? ` <button type="button" class="lnk" data-tzswap title="Cambia la zona con la que se interpretan y muestran las fechas">usar ${onTeam ? 'la de tu dispositivo' : 'la del equipo (' + esc(tzLabel(T.tz)) + ')'}</button>` : ''}</span>`;
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-tzswap]'); if (!b) return; e.preventDefault();
    localStorage.setItem('obi-tz-pick', tz() === devTz() ? 'team' : 'device');
    document.querySelectorAll('.tz-h').forEach(s => { s.outerHTML = tzHint(); }); const sel = document.getElementById('st-tz'); if (sel) sel.value = tzPick();
    toast('Las fechas que programes se tomarán en ' + (tz() === devTz() ? 'la hora de tu dispositivo' : 'la hora del equipo') + ' (' + tzName() + ')'); });
  const busy = async (btn, fn) => { if (btn?.disabled) return; if (btn) { btn.disabled = true; btn.dataset.l = btn.textContent; btn.textContent = 'Un momento…'; } try { return await fn(); } catch (e) { toast(e.hint || e.message || 'Error'); } finally { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.l; } } };
  const ROLE_L = { owner: 'Propietario', admin: 'Administrador', translator: 'Traductor', editor: 'Editor', proofreader: 'Corrector', collaborator: 'Colaborador' };
  const NAV = [['/estudio','総','Resumen'],['/estudio/anuncios','告','Anuncios'],['/estudio/obras','作','Obras'],['/estudio/glosario','語','Glosario'],['/estudio/importar','入','Importar'],['/estudio/multimedia','画','Multimedia'],['/estudio/flujo','流','Flujo de trabajo'],['/estudio/comunidad','評','Comunidad'],['/estudio/estadisticas','統','Estadísticas'],['/estudio/descargas','落','Descargas'],['/estudio/perfil','顔','Página del equipo'],['/estudio/preferencias','彩','Preferencias'],['/estudio/equipo','班','Equipo'],['/estudio/bitacora','録','Bitácora','log']];
  const CRUMB = { '/estudio': 'RESUMEN', '/estudio/obras': 'OBRAS', '/estudio/nueva': 'NUEVA OBRA', '/estudio/glosario': 'GLOSARIO', '/estudio/importar': 'IMPORTAR', '/estudio/multimedia': 'MULTIMEDIA', '/estudio/equipo': 'EQUIPO', '/estudio/flujo': 'FLUJO DE TRABAJO', '/estudio/preferencias': 'PREFERENCIAS', '/estudio/anuncios': 'ANUNCIOS', '/estudio/perfil': 'PÁGINA DEL EQUIPO', '/estudio/bitacora': 'BITÁCORA', '/estudio/comunidad': 'COMUNIDAD', '/estudio/estadisticas': 'ESTADÍSTICAS', '/estudio/descargas': 'DESCARGAS', '/estudio/obra': 'OBRAS · FICHA' };
  // Las agrupaciones son visuales: las rutas y los permisos siguen definidos en NAV.
  const NAV_GROUPS = [
    ['PUBLICACIONES Y CONTENIDO', ['/estudio','/estudio/obras','/estudio/importar','/estudio/multimedia','/estudio/glosario','/estudio/flujo']],
    ['DIFUSIÓN Y SEGUIMIENTO', ['/estudio/anuncios','/estudio/comunidad','/estudio/estadisticas','/estudio/descargas']],
    ['IDENTIDAD Y GESTIÓN', ['/estudio/perfil','/estudio/preferencias','/estudio/equipo','/estudio/bitacora']]
  ];
  const studioNav = t => NAV_GROUPS.map(([name, paths]) => {
    const list = paths.map(h => NAV.find(n => n[0] === h)).filter(n => n && (!n[3] || can(n[3])));
    return list.length ? `<div class="s2-nav-group"><span class="s2-nav-label">${name}</span>${list.map(([h, k, l]) => `<a href="${h}" class="${t === h ? 'on' : ''}" ${t === h ? 'aria-current="page"' : ''}><span class="k">${k}</span><span>${l}</span>${h === '/estudio/obras' && T.works ? `<em>${T.works}</em>` : ''}</a>`).join('')}</div>` : '';
  }).join('');
  let styleTask = null;
  const css = () => {
    if (styleTask) return styleTask;
    const existing = document.getElementById('st2-css');
    if (existing?.sheet) return (styleTask = Promise.resolve());
    const link = existing || document.createElement('link');
    styleTask = new Promise(resolve => {
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
    });
    if (!existing) {
      link.id = 'st2-css'; link.rel = 'stylesheet'; link.href = '/studio.css?v=1';
      document.head.appendChild(link);
    }
    return styleTask;
  };
  const shell = (title, body, tab) => { css(); document.body.classList.add('in-studio'); const t = tab === '/estudio/obra' ? '/estudio/obras' : tab; const me = getMe?.();
    return `<div class="s2"><aside class="s2-side">
      <div class="s2-mobile-head"><a class="s2-brand" href="/estudio"><span class="s2-seal">帯</span><span><b>Estudio Editorial</b><small>EL OBI DEL LECTOR</small></span></a><button type="button" id="s2-mobile-toggle" class="s2-mobile-toggle" aria-expanded="false" aria-controls="s2-nav"><span aria-hidden="true">☰</span> Secciones</button></div>
      <div class="s2-team"><small>EQUIPO</small>${teamPicker()}<span>Tú: ${T.team?.role === 'owner' ? 'Propietario' : esc(T.roleName || ROLE_L[T.team?.role] || 'Miembro')}${T.works != null ? ' · ' + T.works + (T.works === 1 ? ' obra' : ' obras') : ''}</span>${me?.platform_role === 'bibliotecario' ? '<span class="s2-bib">También eres <b>Bibliotecario</b>. Aquí actúas como miembro de tu equipo. <a href="/bibliotecario">Ir al Mostrador →</a></span>' : ''}</div>
      <nav class="s2-nav" id="s2-nav" aria-label="Secciones del Studio">${studioNav(t)}</nav>
      <div class="s2-quick"><small>ACCIONES RÁPIDAS</small>${can('create') ? '<button class="s2-q main" data-quick="new">＋ Nuevo capítulo</button>' : ''}${can('import') ? '<a class="s2-q" href="/estudio/importar">⇪ Importar EPUB / DOCX / PDF</a>' : ''}<a class="s2-q" href="/estudio/obras">◷ Programar lanzamiento</a></div>
      <a class="s2-back" href="/">← Volver al sitio</a></aside>
      <section class="st-main s2-main"><header class="s2-head"><div class="s2-ht"><small>ESTUDIO · ${esc((T.team?.name || '').toUpperCase())} · ${CRUMB[tab] || esc(title.toUpperCase())}</small><h1>${title}</h1></div>${topTools()}</header>${body}</section></div>`; };
  // Navegación compacta: un solo control; no duplica rutas ni selectores de equipo.
  const closeStudioNav = (focus = false) => {
    const side = document.querySelector('.s2-side.nav-open');
    if (!side) return;
    side.classList.remove('nav-open');
    const btn = side.querySelector('#s2-mobile-toggle');
    btn?.setAttribute('aria-expanded', 'false');
    if (btn) btn.innerHTML = '<span aria-hidden="true">☰</span> Secciones';
    if (focus) btn?.focus();
  };
  document.addEventListener('click', e => {
    const btn = e.target.closest('#s2-mobile-toggle');
    if (btn) {
      const side = btn.closest('.s2-side'), open = !side.classList.contains('nav-open');
      side.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.innerHTML = open ? '<span aria-hidden="true">×</span> Cerrar' : '<span aria-hidden="true">☰</span> Secciones';
      return;
    }
    if (e.target.closest('.s2-nav a') || (document.querySelector('.s2-side.nav-open') && !e.target.closest('.s2-side'))) closeStudioNav();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.s2-side.nav-open')) closeStudioNav(true); });
  if (typeof window !== 'undefined') window.addEventListener('popstate', () => closeStudioNav());
  // barra superior: zona horaria, avisos, búsqueda y cuenta
  const topTools = () => { queueMicrotask(bellCount);  const u = getUser(), k = tzPick();
    const opts = [['device', 'Mi dispositivo · ' + tzLabel(devTz())], ...(T.tz ? [['team', 'Equipo · ' + tzLabel(T.tz)]] : []), ...TZS.filter(([z]) => z !== devTz() && z !== T.tz).map(([z, l]) => [z, l])];
    if (!opts.some(o => o[0] === k)) opts.push([k, tzLabel(k)]);
    return `<div class="s2-tools">
      <label class="s2-tz" title="Zona con la que se muestran y programan las fechas"><span aria-hidden="true">◷</span><select id="st-tz" aria-label="Zona horaria">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <div class="s2-bellw"><button type="button" class="s2-bell" id="st-bell" aria-label="Avisos" aria-controls="st-bell-list" aria-expanded="false"><span aria-hidden="true">鈴</span><em id="st-bell-n" hidden></em></button><div class="s2-pop" id="st-bell-list" hidden></div></div>
      <div class="s2-srch"><input id="st-q" type="search" placeholder="Buscar en el Estudio…" autocomplete="off" aria-label="Buscar en el Estudio" aria-controls="st-q-res" aria-expanded="false"><div class="s2-pop" id="st-q-res" hidden></div></div>
    </div>`; };
  // el mismo menú de cuenta que en el sitio (foto, Mi perfil, Preferencias, Salir…), copiado del encabezado público
  const mountMe = () => { const slot = document.getElementById('st-me'), src = document.querySelector('#session .ob-user'); if (!slot || !src || slot.dataset.ok) return; slot.dataset.ok = '1';
    const d = src.cloneNode(true); d.open = false; const out = d.querySelector('#out'); if (out) { out.removeAttribute('id'); out.onclick = () => document.getElementById('out')?.click(); }
    d.querySelector('.ob-menu')?.addEventListener('click', e => { if (e.target.closest('a')) d.open = false; });
    document.addEventListener('click', e => { if (d.open && !d.contains(e.target)) d.open = false; });
    slot.replaceChildren(d); };
  const agoS = d => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? 'hace ' + Math.max(1, m) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
  async function bellCount(){ const u = getUser(); if (!u) return; const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('read', false); const n = document.getElementById('st-bell-n'); if (n) { n.hidden = !count; n.textContent = count > 9 ? '9+' : count; } }
  async function bellOpen(){
    const box = document.getElementById('st-bell-list'); box.hidden = false; document.getElementById('st-bell').setAttribute('aria-expanded', 'true'); box.innerHTML = '<p class="mono" style="padding:12px;margin:0">Cargando…</p>';
    const { data } = await sb.from('notifications').select('id,kind,body,link,read,created_at').eq('user_id', getUser().id).order('created_at', { ascending: false }).limit(25);
    const K = { errata: '#f59e7a', respuesta: '#8cc3f2', tablero: '#f2c230', revision: '#c9a8f2' };
    box.innerHTML = `<div class="s2-poph"><b>Avisos</b>${(data || []).some(x => !x.read) ? '<button type="button" class="lnk" id="st-readall">Marcar todo leído</button>' : ''}</div>` + ((data || []).map(x => `<a class="s2-nt${x.read ? '' : ' new'}" href="${esc(/^\/[\w\/-]*$/.test(x.link?.href || '') ? x.link.href : '/estudio')}"><i style="background:${K[x.kind] || '#a89f8a'}"></i><span>${esc(x.body)}<small>${agoS(x.created_at)}</small></span></a>`).join('') || '<p class="mono" style="padding:12px;margin:0">Sin avisos por ahora.</p>');
    document.getElementById('st-readall')?.addEventListener('click', async e => { e.stopPropagation(); await sb.rpc('notifications_read_all'); box.querySelectorAll('.s2-nt.new').forEach(a => a.classList.remove('new')); e.target.remove(); bellCount(); });
  }
  let qT = 0, qSeq = 0;
  async function search(q){
    const res = document.getElementById('st-q-res'), my = ++qSeq; if (!res) return;
    if (q.length < 2) { res.hidden = true; document.getElementById('st-q')?.setAttribute('aria-expanded','false'); return; }
    res.hidden = false; document.getElementById('st-q')?.setAttribute('aria-expanded','true'); res.innerHTML = '<p class="mono" style="padding:12px;margin:0">Buscando…</p>';
    const like = '%' + q.replace(/[%_\\]/g, m => '\\' + m) + '%';
    const [s, c, g] = await Promise.all([
      sb.from('series').select('slug,title').eq('team_id', T.team.id).is('archived_at', null).ilike('title', like).limit(5),
      sb.from('chapters').select('id,num,title,series!inner(title,team_id)').eq('series.team_id', T.team.id).is('deleted_at', null).ilike('title', like).order('num').limit(8),
      sb.from('glossary_terms').select('term,category,series!inner(slug,title,team_id)').eq('series.team_id', T.team.id).ilike('term', like).limit(5)]);
    if (my !== qSeq) return;
    const grp = (h, items) => items.length ? `<small class="s2-qh">${h}</small>${items.join('')}` : '';
    const html = grp('OBRAS', (s.data || []).map(x => `<a class="s2-qr" href="/estudio/obra/${esc(x.slug)}"><b>${esc(x.title)}</b></a>`))
      + grp('CAPÍTULOS', (c.data || []).map(x => `<a class="s2-qr" href="/estudio/editar/${x.id}"><b>Cap. ${x.num} — ${esc(x.title)}</b><small>${esc(x.series?.title || '')}</small></a>`))
      + grp('GLOSARIO', (g.data || []).map(x => `<a class="s2-qr" href="/estudio/glosario/${esc(x.series?.slug || '')}"><b>${esc(x.term)}</b><small>${esc(x.category)} · ${esc(x.series?.title || '')}</small></a>`));
    res.innerHTML = html || `<p class="mono" style="padding:12px;margin:0">Nada con «${esc(q)}».</p>`;
  }
  const closePops = except => document.querySelectorAll('.s2-pop').forEach(p => {
    if (p === except) return;
    if (p.id === 'st-q-res') { clearTimeout(qT); ++qSeq; document.getElementById('st-q')?.setAttribute('aria-expanded','false'); }
    if (p.id === 'st-bell-list') document.getElementById('st-bell')?.setAttribute('aria-expanded','false');
    p.hidden = true;
  }), bellBtn = () => document.getElementById('st-bell');
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('in-studio')) return;
    if (e.target.closest('#st-bell')) { const box = document.getElementById('st-bell-list'); closePops(box); if (box.hidden) bellOpen(); else { box.hidden = true; bellBtn()?.setAttribute('aria-expanded', 'false'); } return; }
    if (e.target.closest('.s2-pop a')) { closePops(); return; }
    if (!e.target.closest('.s2-pop,#st-q')) { closePops(); bellBtn()?.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'st-q') { clearTimeout(qT); const v = e.target.value.trim(); qT = setTimeout(() => search(v), 250); } });
  document.addEventListener('keydown', e => {
    if (e.target.id === 'st-q') { if (e.key === 'Escape') { e.target.value = ''; closePops(); } if (e.key === 'Enter') { const a = document.querySelector('#st-q-res a'); if (a) { e.preventDefault(); closePops(); go(a.getAttribute('href')); } } }
    if (e.key === 'Escape' && document.body.classList.contains('in-studio')) {
      const bell = document.getElementById('st-bell-list'), results = document.getElementById('st-q-res');
      const open = (bell && !bell.hidden) || (results && !results.hidden);
      if (open) { e.preventDefault(); const hadBell = bell && !bell.hidden; closePops(); if (hadBell) bellBtn()?.focus(); }
    }
    if (e.key === '/' && document.body.classList.contains('in-studio') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { const q = document.getElementById('st-q'); if (q) { e.preventDefault(); q.focus(); } }
  });
  document.addEventListener('change', e => { if (e.target.id === 'st-tz') { localStorage.setItem('obi-tz-pick', e.target.value); toast('Fechas en ' + tzName()); dispatchEvent(new PopStateEvent('popstate')); } });
  const teamPicker = () => T.teams.length > 1 ? `<select id="tpick" aria-label="Equipo activo">${T.teams.map(t => `<option value="${t.id}" ${t.id === T.team?.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>` : `<strong class="st-team">${esc(T.team?.name || '')}</strong>`;
  const bindPicker = again => { $('#tpick')?.addEventListener('change', async e => { if (await pickTeam(e.target.value)) { T.works = null; again(); } }); $('[data-quick="new"]')?.addEventListener('click', e => busy(e.currentTarget, newChapterPicker)); };
  async function newChapter(s){
    const [{ data: vols }, { data: chs }] = await Promise.all([sb.from('volumes').select('id,num').eq('series_id', s.id).is('deleted_at', null).order('num', { ascending: false }).limit(1), sb.from('chapters').select('num').eq('series_id', s.id).order('num', { ascending: false }).limit(1)]);
    const v = vols?.[0]; if (!v) { toast('Crea primero un volumen en la ficha de la obra'); return go('/estudio/obra/' + s.slug); }
    const num = (chs?.[0]?.num || 0) + 1;
    const { data, error } = await sb.from('chapters').insert({ series_id: s.id, volume_id: v.id, vol: v.num, num, title: 'Capítulo ' + num, body: [], status: 'draft', section_type: 'Capítulo' }).select('id').single();
    if (error) throw error; go('/estudio/editar/' + data.id);
  }
  async function newChapterPicker(){
    const { data: w } = await sb.from('series').select('id,slug,title').eq('team_id', T.team.id).is('archived_at', null).order('title');
    if (!w?.length) { toast('Primero crea o importa una obra'); return go('/estudio/importar'); }
    if (w.length === 1) return newChapter(w[0]);
    go('/estudio/obras?nuevo=1');
  }

  async function ensure(){
    const user = getUser();
    resetTeamSession(T, user?.id || null);
    if (!user) { go('/entrar'); return false; }
    const uid = user.id;
    // Inicia la hoja en paralelo con permisos/datos; evita mostrar Studio sin estilos.
    const styles = css();
    if (!T.teams.length) {
      const { data } = await sb.from('team_members').select('role,teams(id,slug,name,color)').eq('user_id', uid);
      if (getUser()?.id !== uid || T.userId !== uid) return false;
      T.teams = (data || []).filter(m => m.teams?.id).map(m => ({ ...m.teams, role: m.role }));
      if (!T.teams.length) { app.innerHTML = '<h1>Estudio</h1><p>Aún no perteneces a ningún equipo de traducción.</p>'; return false; }
      if (!(await pickTeam(localStorage.getItem('obi-team') || T.teams[0].id))) return false;
    }
    if (getUser()?.id !== uid || T.userId !== uid || !T.team) return false;
    if (T.works == null) {
      const teamId = T.team.id;
      const { count } = await sb.from('series').select('id', { count: 'exact', head: true }).eq('team_id', teamId).is('archived_at', null);
      if (getUser()?.id !== uid || T.userId !== uid || T.team?.id !== teamId) return false;
      T.works = count || 0;
    }
    await styles;
    return getUser()?.id === uid && T.userId === uid;
  }
  async function pickTeam(id){
    const uid = getUser()?.id, team = T.teams.find(t => t.id === id) || T.teams[0];
    if (!uid || T.userId !== uid || !team) return false;
    T.team = team; T.perms = {}; T.roleName = null; T.works = null;
    localStorage.setItem('obi-team', team.id);
    const [{ data }, { data: rr }] = await Promise.all([
      sb.rpc('my_team_permissions', { t: team.id }),
      sb.from('team_members').select('team_roles(name)').eq('team_id', team.id).eq('user_id', uid).maybeSingle()
    ]);
    if (T.userId !== uid || getUser()?.id !== uid || T.team?.id !== team.id) return false;
    T.perms = data || {}; T.roleName = rr?.team_roles?.name || null;
    try {
      const { data: tt } = await sb.from('teams').select('settings').eq('id', team.id).maybeSingle();
      if (T.userId !== uid || getUser()?.id !== uid || T.team?.id !== team.id) return false;
      T.tz = tt?.settings?.timezone || null;
    } catch { if (T.userId === uid && getUser()?.id === uid && T.team?.id === team.id) T.tz = null; }
    return T.userId === uid && getUser()?.id === uid && T.team?.id === team.id;
  }

  // ---------- obras ----------
  const DAY = 864e5, ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return 'hace ' + Math.max(1, Math.round(s / 60)) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; const n = Math.round(s / 86400); return n === 1 ? 'ayer' : 'hace ' + n + ' días'; };
  const until = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
  const MON = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const TLS = { active: ['En traducción', '#a9d18e'], paused: ['En pausa', '#f2c230'], completed: ['Completada', '#8cc3f2'], abandoned: ['Abandonada', '#a89f8a'], withdrawn: ['Retirada', '#f59e7a'] };
  const wcolor = s => s?.theme?.color || T.team?.color || '#f2c230';
  const UTAG_INK = c => { const m = /^#?([\da-f]{6})$/i.exec(c || ''); if (!m) return '#0d0c0a'; const n = parseInt(m[1], 16), l = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; return l > 0.55 ? '#0d0c0a' : '#fbf8f1'; };
  const utagOn = t => !!(t && t.on && (t.text || '').trim() && (!t.until || new Date(t.until + 'T23:59:59') >= new Date()));
  const utagHTML = t => { const c0 = /^#[\da-f]{6}$/i.test(t.color || '') ? t.color : '#f2c230', c = t.season ? `var(--sea,${c0})` : c0, ink = t.season ? '#0d0c0a' : UTAG_INK(c0), solid = t.style !== 'outline'; return `<span class="ob-utag" style="display:inline-flex;align-items:center;margin-left:8px;padding:2px 8px;font:600 11px/1.5 'IBM Plex Mono',monospace;letter-spacing:.04em;text-transform:uppercase;vertical-align:2px;white-space:nowrap;${solid ? `background:${c};color:${ink};border:1px solid ${c}` : `background:transparent;color:${c};border:1px solid ${c}`}">${esc(t.text.trim().slice(0, 24))}</span>`; };

  async function teamData(){
    const { data: works } = await sb.from('series').select('id,slug,title,short,synopsis,genres,cover_path,translation_status,published,views,theme,volumes(count)').eq('team_id', T.team.id).is('archived_at', null).order('title');
    const ids = (works || []).map(w => w.id);
    import('./thumbs.js?v=1').then(m => m.heal(sb, T.team.id, PUB)).catch(() => {});
    if (!ids.length) return { works: [], chs: [], sched: [], reps: [] };
    const now = new Date().toISOString();
    const { readPages } = await import('/paging.js?v=1');
    const [{ data: chs }, { data: sched }, { data: reps }] = await Promise.all([
      readPages((from, to) => sb.from('chapters').select('id,num,title,status,publish_at,updated_at,series_id,vol,review_status,stage,assigned_to').in('series_id', ids).is('deleted_at', null).order('id').range(from, to), { size: 250 }),
      sb.from('schedule').select('id,label,at,series_id').in('series_id', ids).gte('at', now).order('at').limit(20),
      sb.from('reports').select('id,kind,quote,fix,created_at,chapter_id,chapters(num,title,series_id)').eq('status', 'open').order('created_at', { ascending: false }).limit(100)]);
    const set = new Set(ids);
    T.works = works.length;
    return { works, chs: chs || [], sched: sched || [], reps: (reps || []).filter(r => set.has(r.chapters?.series_id)) };
  }

  // ---------- resumen ----------
  async function home(){
    if (!(await ensure())) return;
    app.innerHTML = shell('Resumen', '<p class="mono">Cargando el resumen…</p>', '/estudio'); bindPicker(home);
    const [{ works, chs, sched, reps }, tv] = await Promise.all([teamData(), sb.rpc('team_views', { p_team: T.team.id, p_days: 14 })]), byId = Object.fromEntries(works.map(w => [w.id, w]));
    const daily = tv.data || [];
    if (!works.length) { app.innerHTML = shell('Resumen', emptyState(), '/estudio'); bindPicker(home); return; }
    const now = Date.now(), pub = chs.filter(c => c.status === 'published'), drafts = chs.filter(c => c.status === 'draft').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const up = [...chs.filter(c => c.status === 'scheduled' && new Date(c.publish_at) > now).map(c => ({ at: c.publish_at, what: `Cap. ${c.num} — ${c.title}`, s: byId[c.series_id] })), ...sched.map(e => ({ at: e.at, what: e.label, s: byId[e.series_id] }))].sort((a, b) => new Date(a.at) - new Date(b.at));
    const week = pub.filter(c => now - new Date(c.publish_at) < 7 * DAY).length, views = works.reduce((a, w) => a + (w.views || 0), 0);
    const kpi = (l, v, n, c) => `<div class="s2-kpi" style="--c:${c}"><small>${l}</small><b>${v}</b><span>${n}</span></div>`;
    const who = await names(drafts.slice(0, 5).map(c => c.assigned_to)); const STG = { traduciendo: ['Traduciendo', 25, '#f2c230'], correccion: ['En corrección', 60, '#8cc3f2'], listo: ['Listo', 90, '#a9d18e'] };
    const dsum = daily.reduce((a, x) => a + (+x.n || 0), 0), dmax = Math.max(1, ...daily.map(x => +x.n || 0)), dl = x => x ? fmtTz(x.day + 'T12:00:00', { day: 'numeric', month: 'short' }) : '';
    const body = `<div class="s2-kpis">
        ${kpi('Capítulos publicados', pub.length.toLocaleString('es-MX'), week ? `+${week} esta semana` : 'Ninguno esta semana', '#a9d18e')}
        ${kpi('Programados', up.length, up[0] ? 'Próximo ' + until(up[0].at) : 'Nada en agenda', '#f2c230')}
        ${kpi('Borradores', drafts.length, drafts[0] ? 'Último ' + ago(drafts[0].updated_at) : 'Sin borradores', '#8cc3f2')}
        ${kpi('Erratas abiertas', reps.length, reps.length ? 'Revísalas pronto' : 'Todo al día', reps.length ? '#f59e7a' : '#a9d18e')}
        ${kpi('Lecturas totales', views.toLocaleString('es-MX'), works.length + (works.length === 1 ? ' obra' : ' obras'), '#cfc6b0')}
      </div>
      <div class="s2-cols">
        <section class="s2-box"><div class="s2-bh"><h2>Próximos lanzamientos</h2><a href="/estudio/obras">Programar →</a></div>
          ${up.slice(0, 5).map(u => { const d = new Date(u.at); return `<div class="s2-up"><span class="d" style="--c:${wcolor(u.s)}"><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></span><span class="w"><b>${esc(u.what)}</b><small>${esc(u.s?.title || '')}</small></span><span class="t">${fmtTz(d, { hour: '2-digit', minute: '2-digit' })}<small>${until(u.at)}</small></span></div>`; }).join('') || '<p class="mono s2-none">No hay nada programado. Programa un capítulo desde la ficha de la obra.</p>'}</section>
        <section class="s2-box"><div class="s2-bh"><h2>Borradores pendientes</h2><span class="mono">${drafts.length}</span></div>
          ${drafts.slice(0, 5).map(c => { const g = STG[c.stage] || (c.review_status === 'pending' ? ['En revisión', 75, '#8cc3f2'] : c.review_status === 'approved' ? ['Aprobado', 90, '#a9d18e'] : ['Borrador', 10, '#f2c230']); return `<a class="s2-dr" href="/estudio/editar/${c.id}"><b>Cap. ${c.num} — ${esc(c.title)}</b><span class="st" style="color:${g[2]}">${g[0]}</span><small>${esc(byId[c.series_id]?.title || '')} · ${c.assigned_to ? esc(who[c.assigned_to] || 'asignado') : 'sin asignar'}</small><small>${ago(c.updated_at)}</small><span class="pg"><i style="width:${g[1]}%"></i></span></a>`; }).join('') || '<p class="mono s2-none">Sin borradores. ¡Todo publicado!</p>'}</section>
        <section class="s2-box"><div class="s2-bh"><h2>Erratas abiertas</h2><span class="mono" style="color:${reps.length ? '#f59e7a' : ''}">${reps.length}</span></div>
          ${reps.slice(0, 4).map(r => `<div class="s2-er"><small>${esc(byId[r.chapters.series_id]?.title || '')} · Cap. ${r.chapters.num}${r.kind ? ' · ' + esc(r.kind) : ''} · ${ago(r.created_at)}</small>${r.quote ? `<q>${esc(r.quote)}</q>` : ''}${r.fix ? `<span>Propuesta: ${esc(r.fix)}</span>` : ''}<span class="a">${can('edit') ? `<a class="btn ghost" href="/estudio/editar/${r.chapter_id}">Abrir en el editor</a>` : ''}<button class="btn ghost ok" data-fix="${r.id}">Marcar corregida</button><button class="lnk" data-dis="${r.id}">Descartar</button></span></div>`).join('') || '<p class="mono s2-none">Sin erratas abiertas.</p>'}</section>
        <section class="s2-box"><div class="s2-bh"><h2>Vistas · últimos 14 días</h2><a class="mono" href="/estudio/estadisticas" style="color:#a89f8a">${dsum.toLocaleString('es-MX')}</a></div>
          <div class="s2-vb" role="img" aria-label="Vistas por día de los últimos 14 días">${daily.map((x, i) => `<span title="${dl(x)}: ${(+x.n).toLocaleString('es-MX')} vistas" style="height:${Math.max(2, Math.round(+x.n / dmax * 100))}%;background:${i === daily.length - 1 ? 'var(--gold)' : +x.n ? '#8a7a4f' : '#2f2a20'}"></span>`).join('')}</div>
          <div class="s2-vl"><span>${dl(daily[0])}</span><span>${dl(daily[daily.length - 1])}</span></div>${dsum ? '' : '<p class="mono s2-none" style="border:none">Las vistas se cuentan desde que se activaron las estadísticas: una por lector, capítulo y día.</p>'}</section>
      </div>`;
    app.innerHTML = shell('Resumen', body, '/estudio'); bindPicker(home);
    app.querySelectorAll('[data-fix],[data-dis]').forEach(b => b.onclick = () => busy(b, async () => { const fix = !!b.dataset.fix; const { error } = await sb.from('reports').update({ status: fix ? 'fixed' : 'dismissed' }).eq('id', b.dataset.fix || b.dataset.dis); if (error) throw error; toast(fix ? 'Errata marcada como corregida' : 'Errata descartada'); home(); }));
  }
  const emptyState = () => `<div class="s2-empty"><span>空</span><h2>Tu estudio está vacío</h2><p>Empieza importando un EPUB, DOCX o PDF: armamos la obra con su portada, índice e ilustraciones.</p>${can('create') || can('import') ? '<span style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn" href="/estudio/nueva">＋ Crear mi primera obra</a></span>' : '<p class="mono">Pide a tu propietario permiso para crear obras.</p>'}</div>`;

  // Identificador compartido con el importador: conservar su normalización
  // original al crear obras manualmente, sin cargar el importador completo.
  const slugify = s => (s || 'obra').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'obra';

  // ---------- nueva obra: misma ficha que el importador, sin publicar automáticamente ----------
  async function newWork(){
    if (!(await ensure())) return;
    const TAB = '/estudio/obras';
    if (!can('create')) { app.innerHTML = shell('Nueva obra', can('import') ? '<p>Tu rol solo permite importar. <a href="/estudio/importar">Importar un archivo →</a></p>' : '<p>Tu rol no permite crear obras.</p>', TAB); bindPicker(newWork); return; }
    const N = createWorkData(), relatedQuery = await sb.from('series')
      .select('id,title,teams(name)').or('published.eq.true,team_id.eq.' + T.team.id)
      .is('archived_at', null).order('title').limit(500);
    const related = relatedQuery.data || [];
    let made = null, cover = null, vtitle = '';
    const steps = n => '<ol class="st-steps" style="margin:0 0 22px">' +
      ['Obra', 'Primer volumen', 'Primer capítulo'].map((l,i) =>
        '<li' + (i === n ? ' style="color:var(--gold);font-weight:700"' : '') + '>' + l + '</li>').join('') + '</ol>';
    const box = (h,inner) => '<section class="wk-box wf-createbox"><h2>' + h + '</h2>' + inner + '</section>';
    const step1 = () => {
      const choices = '<div class="wf-create-choices"><div class="wk-box" style="border-top:4px solid var(--gold)">' +
        '<b>Desde cero</b><small class="mono">Completa la ficha editorial y continúa con el primer volumen.</small></div>' +
        (can('import') ? '<a class="wk-box" href="/estudio/importar" style="text-decoration:none;color:var(--paper)"><b>Importar un archivo →</b><small class="mono">EPUB, DOCX o PDF con la misma ficha editorial completa.</small></a>' : '') +
        '</div>';
      app.innerHTML = shell('Nueva obra', steps(0) + choices +
        '<h2 class="s2-h2">Datos de la obra</h2><div class="wf-creator" id="nw-fields">' + renderWorkFields(N,esc,related) + '</div>' +
        box('Portada de la obra (opcional)', '<label>JPG, PNG o WebP · máximo 8 MB<input type="file" id="nw-cover" accept="image/png,image/jpeg,image/webp"></label><small class="mono">Si no tienes portada, puedes agregarla después o usar la del volumen importado.</small>') +
        '<div class="wf-create-actions"><button class="btn" id="nw-go">Guardar obra privada y continuar →</button><a class="btn ghost" href="/estudio/obras">Cancelar</a></div>', TAB);
      bindPicker(newWork);
      bindWorkFields($('#nw-fields'), N, esc, related, msg => { if (msg) toast(msg); });
      $('#nw-cover').onchange = e => {
        const v = e.target.files?.[0] || null;
        if (v && (!/^image\/(jpeg|png|webp)$/.test(v.type) || v.size > LIMITS.image)) {
          e.target.value = ''; cover = null; toast('Usa JPG, PNG o WebP de máximo 8 MB'); return;
        }
        cover = v;
      };
      $('#nw-go').onclick = e => busy(e.currentTarget, async () => {
        const data = workPayload(N), slugBase = slugify(data.title);
        let slug = slugBase;
        const { data: taken, error: probeErr } = await sb.from('series').select('id').eq('slug',slug).limit(1);
        if (probeErr) throw new Error(errMsg(probeErr));
        if (taken?.length) slug += '-' + Date.now().toString(36).slice(-4);
        const { data: created, error } = await sb.from('series')
          .insert({ ...data, team_id: T.team.id, slug, published: false }).select().single();
        if (error) throw new Error(errMsg(error));
        made = { s: created }; T.works = null;
        if (cover) {
          const ext = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' }[cover.type];
          const path = T.team.id + '/obras/' + slug + '/portada-' + Date.now() + '.' + ext;
          const u = await sb.storage.from('obi-media').upload(path,cover,{contentType:cover.type,cacheControl:'31536000'});
          if (!u.error) {
            const p = await sb.from('series').update({ cover_path:path }).eq('id',created.id);
            if (p.error) toast('Obra creada, pero no se pudo asignar la portada');
          } else toast('Obra creada, pero no se pudo subir la portada: podrás añadirla después');
        }
        toast('Obra privada creada con su ficha editorial'); step2();
      });
      $('#nw-fields [data-w="title"]')?.focus();
    };
    const step2 = () => {
      app.innerHTML = shell('Nueva obra', steps(1) +
        box('Volumen 1 de «' + esc(made.s.title) + '»',
          '<label>Título del volumen (opcional)<input id="nw-vt" maxlength="200" placeholder="Volumen 1" value="' + esc(vtitle) + '"></label>' +
          '<span class="wf-create-actions"><button class="btn" id="nw-v">Crear volumen y escribir el capítulo 1 →</button>' +
          (can('import') ? '<a class="btn ghost" href="/estudio/importar">⇪ Importar este volumen desde un archivo</a>' : '') + '</span>' +
          '<span class="mono" style="font-size:12px">Al importar, elige «' + esc(made.s.title) + '» como obra y Volumen 1.</span>' +
          '<a class="lnk" href="/estudio/obra/' + esc(made.s.slug) + '">Dejar sin volumen y editar la obra después</a>'), TAB);
      bindPicker(newWork);
      $('#nw-vt').oninput = e => { vtitle = e.target.value; };
      $('#nw-v').onclick = e => busy(e.currentTarget, async () => {
        if (!made.v) {
          const vt = vtitle.trim();
          const r = await sb.from('volumes').insert({
            series_id: made.s.id, num: 1, status: 'draft', ...(vt ? { title: vt } : {})
          }).select('id,num').single();
          if (r.error) throw new Error(errMsg(r.error)); made.v = r.data;
        }
        const c = await sb.from('chapters').insert({
          series_id: made.s.id, volume_id: made.v.id, vol: 1, num: 1,
          title: 'Capítulo 1', body: [], status: 'draft', section_type: 'Capítulo'
        }).select('id').single();
        if (c.error) throw new Error(errMsg(c.error));
        toast('Primer volumen y capítulo preparados'); go('/estudio/editar/' + c.data.id);
      });
    };
    step1();
  }

  // ---------- obras ----------
  async function works(){
    if (!(await ensure())) return;
    app.innerHTML = shell('Mis obras', '<p class="mono">Cargando obras…</p>', '/estudio/obras'); bindPicker(works);
    const [{ works: list, chs, sched }, { data: inv }, { data: collab }] = await Promise.all([teamData(),
      sb.from('collaborations').select('id,status,series(title),inviter:teams!collaborations_inviter_team_fkey(name)').eq('invited_team', T.team.id).eq('status', 'pending'),
      sb.from('collaborations').select('series(slug,title,teams(name))').eq('invited_team', T.team.id).eq('status', 'accepted')]);
    const pick = new URLSearchParams(location.search).has('nuevo');
    const card = w => { const c = chs.filter(x => x.series_id === w.id), pub = c.filter(x => x.status === 'published'), dr = c.filter(x => x.status === 'draft').length;
      const nx = [...c.filter(x => x.status === 'scheduled' && new Date(x.publish_at) > Date.now()).map(x => ({ at: x.publish_at, l: 'Cap. ' + x.num })), ...sched.filter(e => e.series_id === w.id).map(e => ({ at: e.at, l: e.label }))].sort((a, b) => new Date(a.at) - new Date(b.at))[0];
      const last = pub.sort((a, b) => new Date(b.publish_at) - new Date(a.publish_at))[0], st = TLS[w.translation_status] || TLS.active;
      return `<article class="s2-work" style="--c:${wcolor(w)}"><a class="cv" href="/estudio/obra/${w.slug}" style="${w.cover_path ? `background-image:url('${media(w.cover_path)}')` : ''}">${w.cover_path ? '' : `<span>${esc(w.short || w.title)}</span>`}</a>
        <div class="bd"><span class="tg"><span class="pl" style="--p:${st[1]}">${st[0]}</span><small>${w.volumes?.[0]?.count ?? 0} vol. · ${c.length} cap.${w.published ? '' : ' · privada'}</small></span>
          <h2><a href="/estudio/obra/${w.slug}">${esc(w.title)}</a></h2>${w.synopsis ? `<p>${esc(w.synopsis)}</p>` : ''}
          ${(w.genres || []).length ? `<span class="gn">${w.genres.slice(0, 5).map(g => `<span>${esc(g)}</span>`).join('')}</span>` : ''}
          <dl><div><dt>PRÓXIMO</dt><dd style="color:${nx ? '#f2c230' : '#a89f8a'}">${nx ? esc(nx.l) + ' · ' + until(nx.at) : 'Sin programar'}</dd></div><div><dt>BORRADORES</dt><dd>${dr}</dd></div><div><dt>LECTURAS</dt><dd>${(w.views || 0).toLocaleString('es-MX')}</dd></div><div><dt>ÚLTIMO PUBLICADO</dt><dd>${last ? 'Cap. ' + last.num + ' · ' + ago(last.publish_at) : '—'}</dd></div></dl>
          <span class="ac">${can('create') ? `<button class="btn" data-new="${w.id}">＋ Nuevo capítulo</button>` : ''}<a class="btn ghost" href="/estudio/obra/${w.slug}">Abrir ficha</a>${can('import') ? '<a class="btn ghost" href="/estudio/importar">Importar volumen</a>' : ''}<a class="lnk" href="/serie/${w.slug}">Ver en el sitio ↗</a></span></div></article>`; };
    const body = `${(inv || []).map(c => `<div class="st-card"><span>${esc(c.inviter?.name || 'Un equipo')} te invita a colaborar en <strong>${esc(c.series?.title)}</strong></span><span><button class="btn" data-acc="${c.id}">Aceptar</button> <button class="btn ghost" data-rej="${c.id}">Rechazar</button></span></div>`).join('')}
      ${pick && list.length ? '<div class="st-card"><span>¿En qué obra va el nuevo capítulo? Toca «＋ Nuevo capítulo» en la obra.</span></div>' : ''}
      ${list.length ? `<div class="s2-works">${list.map(card).join('')}${can('create') || can('import') ? '<a class="s2-add" href="/estudio/nueva"><span>＋</span>Nueva obra<small>Desde cero con el editor o importando un EPUB, DOCX o PDF</small></a>' : ''}</div>` : emptyState()}
      ${(collab || []).length ? `<h2 class="s2-h2">Colaboraciones</h2><div class="s2-box">${collab.map(c => `<p><a href="/serie/${c.series.slug}">${esc(c.series.title)}</a> <span class="mono">de ${esc(c.series.teams?.name)}</span></p>`).join('')}</div>` : ''}`;
    app.innerHTML = shell('Mis obras', body, '/estudio/obras'); bindPicker(works);
    app.querySelectorAll('[data-new]').forEach(b => b.onclick = () => busy(b, () => newChapter(list.find(w => w.id === b.dataset.new))));
    app.querySelectorAll('[data-acc],[data-rej]').forEach(b => b.onclick = () => busy(b, async () => { const { error } = await sb.from('collaborations').update({ status: b.dataset.acc ? 'accepted' : 'rejected' }).eq('id', b.dataset.acc || b.dataset.rej); if (error) throw error; toast('Respuesta enviada'); works(); }));
  }


  const GENRES = WORK_GENRES;
  const WTYPES = ['Novela ligera','Novela web','Obra original'];
  const OSL = [['publishing','En publicación'],['completed','Completada'],['paused','En pausa'],['cancelled','Cancelada']];
  const VST = { draft: ['Borrador', '#f2c230'], scheduled: ['Programado', '#8cc3f2'], published: ['Publicado', '#a9d18e'], hidden: ['Oculto', '#f59e7a'] };
  async function work(slug){
    if (!(await ensure())) return;
    const { data: s } = await sb.from('series').select('*').eq('slug', slug).maybeSingle();
    if (!s) return go('/estudio');
    const tab = ({ datos: 'datos', avisos: 'avisos', media: 'media' })[new URLSearchParams(location.search).get('tab')] || 'caps';
    const { readPages } = await import('/paging.js?v=1');
    const [{ data: vols }, { data: chs }, { data: cols }, { data: events }, { data: dls }, { data: buys }, { data: tch }, { data: tvol }] = await Promise.all([
      sb.from('volumes').select('*').eq('series_id', s.id).is('deleted_at', null).order('num'),
      readPages((from, to) => sb.from('chapters').select('id,num,vol,volume_id,title,status,section_type,publish_at,updated_at,stage').eq('series_id', s.id).is('deleted_at', null).order('num').range(from, to), { size: 250 }),
      sb.from('collaborations').select('id,status,invited:teams!collaborations_invited_team_fkey(name,slug,color)').eq('series_id', s.id),
      sb.from('publication_events').select('event,summary,created_at').eq('series_id', s.id).order('created_at', { ascending: false }).limit(10),
      sb.from('download_links').select('id,volume_id,vol').eq('series_id', s.id),
      sb.from('purchase_links').select('id,store,region,fmt,verified').eq('series_id', s.id),
      sb.from('chapters').select('id,num,vol,volume_id,title,section_type,status,deleted_at').eq('series_id', s.id).not('deleted_at', 'is', null).order('num'),
      sb.from('volumes').select('id,num,title,cover_path,epub_fonts,deleted_at').eq('series_id', s.id).not('deleted_at', 'is', null).order('num')]);
    const C = chs || [], V = vols || [], st = TLS[s.translation_status] || TLS.active, c0 = wcolor(s);
    const n = k => C.filter(c => c.status === k).length;
    const TC = tch || [], TV = tvol || [], allNums = [...C, ...TC].map(c => +c.num || 0);
    const F = ((work.f ||= {})[s.id] ||= { st: '', stage: '', q: '' }), filtered = !!(F.st || F.stage || F.q.trim());
    const SEL = ((work.sel ||= {})[s.id] ||= new Set()); [...SEL].forEach(x => { if (!C.some(c => c.id === x)) SEL.delete(x); });
    const nrm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const stg = c => c.status === 'draft' ? (STG[c.stage] ? c.stage : 'traduciendo') : null;
    const passes = c => (!F.st || c.status === F.st) && (!F.stage || stg(c) === F.stage) && (!F.q.trim() || nrm(c.num + ' ' + c.title).includes(nrm(F.q.trim())));
    const canSel = can('publish') || can('schedule') || can('delete') || can('edit') || can('board'), canDrag = can('edit') && !filtered;
    const open = work.open?.[s.id] || (work.open = { ...(work.open || {}), [s.id]: new Set(V.length <= 2 ? V.map(v => v.id) : V.slice(-1).map(v => v.id)) })[s.id];
    const fmtD = d => d ? fmtTz(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const listOf = v => C.filter(c => c.volume_id === v.id || (!c.volume_id && c.vol === v.num));
    const volOf = c => V.find(v => v.id === c.volume_id) || V.find(v => v.num === c.vol);
    const volHTML = v => { const L = listOf(v), LL = L.filter(passes), vs = VST[v.status] || VST.draft, isOpen = open.has(v.id) || (filtered && LL.length > 0), nd = (dls || []).filter(d => d.volume_id === v.id || (!d.volume_id && d.vol === v.num)).length;
      const meta = [L.length + (L.length === 1 ? ' capítulo' : ' capítulos'), vs[0] + (v.status === 'scheduled' && v.published_at ? ' · ' + fmtD(v.published_at) : v.status === 'published' && v.published_at ? ' · ' + fmtD(v.published_at) : ''), v.is_final ? 'volumen final' : '', v.external_url ? (v.external_only ? '↗ se lee en el sitio del traductor' : '↗ también en el sitio del traductor') : ''].filter(Boolean).join(' · ');
      return `<section class="wk-vol" data-v="${v.id}"><button type="button" class="wk-vh" data-tog="${v.id}" aria-expanded="${isOpen}">
        <span class="wk-vc" style="${v.cover_path ? `background-image:url('${esc(media(v.cover_path))}')` : ''};border-top-color:${c0}"></span>
        <span class="wk-vt"><small>VOLUMEN ${v.num}</small><b>${esc(v.title && v.title !== String(v.num) && !/^volumen\s*\d+$/i.test(v.title.trim()) ? v.title : 'Volumen ' + v.num)}</b><span><i style="color:${vs[1]}">●</i> ${esc(meta)}</span></span>
        <span class="wk-va" aria-hidden="true">${isOpen ? '▾' : '▸'}</span></button>
        ${isOpen ? `<div class="wk-vbar"><span class="wk-syn">${v.synopsis ? esc(v.synopsis) : 'Sin sinopsis del volumen.'}</span><a class="mono" href="/estudio/descargas" style="color:${nd ? '#a9d18e' : '#a89f8a'}">${nd ? nd + (nd === 1 ? ' descarga' : ' descargas') : 'Sin descargas'}</a>
          ${can('edit') ? `<button class="btn ghost sm" data-vedit="${v.id}">Editar volumen</button>` : ''}
          ${can('create') ? `<button class="btn ghost sm gold" data-addch="${v.id}" data-n="${v.num}">＋ Capítulo en este volumen</button>` : ''}
          ${can('schedule') && v.status !== 'published' ? `<span class="wk-sch"><input type="datetime-local" data-at="${v.id}" aria-label="Fecha de publicación del volumen ${v.num}">${tzHint()}<button class="btn sm" data-sch="${v.id}">◷ Programar volumen</button></span>` : ''}
          ${can('publish') && v.status === 'scheduled' ? `<button class="btn ghost sm" data-unsch="${v.id}">Cancelar programación</button>` : ''}
          ${can('publish') && v.status !== 'published' ? `<button class="btn sm green" data-pub="${v.id}">⇪ Publicar volumen</button>` : ''}
          ${can('publish') && v.status === 'published' ? `<button class="btn ghost sm" data-hide="${v.id}">Ocultar</button>` : ''}
          ${can('publish') && v.status === 'hidden' ? `<button class="btn ghost sm" data-show="${v.id}">Mostrar</button>` : ''}
          ${can('delete') ? `<button class="lnk danger" data-delvol="${v.id}">Borrar volumen</button>` : ''}</div>
          <div class="wk-ve" id="ve-${v.id}" hidden></div>
          <div class="wk-tw"><div class="wk-t"><div class="wk-th"><span>${canSel && LL.length ? `<input type="checkbox" data-allv="${v.id}" aria-label="Seleccionar los capítulos del volumen ${v.num}" ${LL.every(c => SEL.has(c.id)) ? 'checked' : ''}>` : ''}</span><span>N.º</span><span>TÍTULO</span><span>ESTADO</span><span>FECHA</span><span>ACCIONES</span></div>
          ${LL.map(c => { const cs = VST[c.status] || VST.draft, sk = stg(c); return `<div class="wk-tr${SEL.has(c.id) ? ' sel' : ''}" data-row="${c.id}" data-vol="${v.id}" ${canDrag ? 'draggable="true"' : ''}><span class="wk-sel">${canDrag ? '<span class="wk-grip" title="Arrastra para reordenar o llévalo a otro volumen" aria-hidden="true">⠿</span>' : ''}${canSel ? `<input type="checkbox" data-pick="${c.id}" ${SEL.has(c.id) ? 'checked' : ''} aria-label="Seleccionar ${esc(c.title)}">` : ''}</span><span class="mono">${c.num}</span><span class="wk-tt" title="${esc(c.title)}">${c.section_type && c.section_type !== 'Capítulo' ? `<em>${esc(c.section_type)}</em> ` : ''}${esc(c.title)}${sk ? `<span class="wk-stg" style="--c:${STG[sk][2]}">${STG[sk][0]}</span>` : ''}</span><span class="mono" style="color:${cs[1]}">● ${cs[0]}</span><span class="mono">${c.status === 'draft' ? 'edit. ' + fmtD(c.updated_at) : fmtD(c.publish_at)}</span>
            <span class="wk-ra">${can('edit') ? `<a class="btn ghost xs" href="/estudio/editar/${c.id}">Editar</a>` : ''}${can('publish') && c.status === 'draft' && v.status === 'published' ? `<button class="btn ghost xs gold" data-cpub="${c.id}">Publicar</button>` : ''}${can('delete') ? `<button class="lnk danger" data-delch="${c.id}" aria-label="Enviar ${esc(c.title)} a la papelera">Borrar</button>` : ''}</span></div>`; }).join('') || (L.length ? '<p class="tb-empty">Ningún capítulo de este volumen coincide con el filtro.</p>' : '<p class="tb-empty">Este volumen aún no tiene capítulos.</p>')}</div></div>` : ''}</section>`; };
    const D = { title: s.title || '', short: s.short || '', original: s.original || '', title_romaji: s.title_romaji || '', publisher: s.publisher || '', author: s.author || '', illustrator: s.illustrator || '', work_type: s.work_type || 'Novela ligera', demographic: s.demographic || '', translation_status: s.translation_status || 'active', original_status: s.original_status || '', synopsis: s.synopsis || '', adult: !!s.adult, genres: [...(s.genres || [])], tags: [...(s.tags || [])] };
    const sel = (k, opts) => `<select data-d="${k}">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(D[k]) === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
    const inp = (k, l, a = '') => `<label>${l}<input data-d="${k}" value="${esc(D[k])}" ${a}></label>`;
    const datos = () => `<div class="wk-dat">
      <section class="wk-box"><h2>Ficha</h2>${inp('title', 'Título en español', 'maxlength="200"')}${inp('short', 'Título corto (cinta y lomo)', 'maxlength="26"')}${inp('original', 'Título original', 'maxlength="300"')}${inp('title_romaji', 'Lectura / rōmaji del título', 'maxlength="300"')}${inp('publisher', 'Editorial', 'maxlength="120"')}
        <div class="wk-g2">${inp('author', 'Autor', 'maxlength="120"')}${inp('illustrator', 'Ilustración', 'maxlength="120"')}
          <label>Tipo${sel('work_type', WTYPES)}</label><label>Demografía${sel('demographic', WORK_DEMOGRAPHICS.map(([k,l]) => [k,l]))}<small class="mono" id="wk-dem-desc">${esc((WORK_DEMOGRAPHICS.find(x => x[0] === D.demographic) || WORK_DEMOGRAPHICS[0])[2])}</small></label>
          <label>Traducción${sel('translation_status', Object.entries(TLS).map(([k, v]) => [k, v[0]]))}</label><label>Obra original${sel('original_status', [['', 'Sin asignar'], ...OSL])}</label></div>
        <label><span class="wk-lh">Sinopsis<span class="mono" id="syncount">${D.synopsis.length} / 1500</span></span><textarea data-d="synopsis" rows="7" maxlength="1500">${esc(D.synopsis)}</textarea><small class="mono">La primera frase se usa como gancho en el carrusel de Inicio.</small></label>
        <label class="tb-inl"><input type="checkbox" data-d="adult" ${D.adult ? 'checked' : ''}> Contenido +18 (pide confirmación al lector)</label></section>
      <div class="wk-col">
        <section class="wk-box"><h2>Géneros</h2><label>Buscar género<input type="search" id="wk-gen-search" placeholder="Filtrar géneros…"></label><div class="ed-chips" id="wk-gen">${[...new Set([...GENRES, ...D.genres])].map(g => `<button type="button" class="ed-chip ${D.genres.includes(g) ? 'on' : ''}" aria-pressed="${D.genres.includes(g)}" data-gen="${esc(g)}">${esc(g)}</button>`).join('')}</div><small class="mono">Hasta 4. Se usan en los filtros del Catálogo.</small></section>
        <section class="wk-box"><h2>Etiquetas</h2><div class="wk-tags" id="wk-tags">${D.tags.map((t, i) => `<span>#${esc(t)}<button type="button" data-untag="${i}" aria-label="Quitar ${esc(t)}">×</button></span>`).join('')}<input id="wk-tag" maxlength="30" placeholder="Escribe y pulsa Enter" aria-label="Nueva etiqueta"></div><small class="mono">Detalles para quien busca algo concreto: sirvienta, nobleza, comedia romántica…</small></section>
        <section class="wk-box" style="border-top:4px solid #a9d18e"><h2>Compra oficial</h2><small class="mono">Enlaces para apoyar al autor. Se proponen por volumen y el Bibliotecario los verifica.</small>
          <div class="ed-chips">${(buys || []).map(b => `<span class="wk-buy" style="border-color:${b.verified ? '#a9d18e' : '#3d3628'};color:${b.verified ? '#a9d18e' : '#a89f8a'}">${b.verified ? '✓' : '◷'} ${esc(b.store)}${b.region ? ' · ' + esc(b.region) : ''}</span>`).join('') || '<span class="mono">Aún sin enlaces.</span>'}</div>
          <a class="btn ghost sm" href="/estudio/descargas" style="justify-self:start">Gestionar compra y descargas</a></section>
        <section class="wk-box" style="border-top:4px solid #8cc3f2"><h2>Créditos compartidos</h2><small class="mono">Invita a otro grupo traductor. Al aceptar, la obra aparece en el catálogo y en el perfil de ambos equipos.</small>
          ${(cols || []).map(c => `<div class="wk-cb"><span class="wk-ini" style="background:${esc(c.invited?.color || '#8cc3f2')}">${esc((c.invited?.name || '?').slice(0, 2).toUpperCase())}</span><b>${esc(c.invited?.name || '')}</b><span class="mono">${{ pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada', revoked: 'Revocada' }[c.status] || c.status}</span>${c.status !== 'revoked' && can('edit') ? `<button class="lnk danger" data-revoke="${c.id}">Revocar</button>` : '<span></span>'}</div>`).join('')}
          ${can('edit') ? '<div class="wk-inv"><input id="inv" placeholder="@alias del equipo" aria-label="Alias del equipo a invitar"><button class="btn sm blue" id="invite">Invitar</button></div>' : ''}</section>
        <section class="wk-box" id="wk-lock" style="grid-column:1/-1"><h2>Mecenas y bloqueos</h2><small class="mono">Bloquea la obra completa o capítulos sueltos para mecenas de tu Patreon. Quien no es mecenas ve la ficha y los títulos con candado y un botón «Hazte mecenas». Los volúmenes se bloquean desde «Editar volumen».</small><div id="wk-lock-b"><p class="mono">Cargando…</p></div></section>
        <section class="wk-box" id="wk-rel"><h2>Obras relacionadas</h2><small class="mono">Precuelas, secuelas, spin-offs u obras del mismo universo. Se muestran en la ficha pública. Puedes enlazar obras de otros equipos.</small><div id="wk-rel-b"><p class="mono">Cargando…</p></div></section>
        <section class="wk-box"><h2>Historial de publicación</h2>${(events || []).map(e => `<p class="mono" style="margin:0">${fmtTz(e.created_at, { dateStyle: 'short', timeStyle: 'short' })} · ${esc(e.summary)}</p>`).join('') || '<p class="mono" style="margin:0">Sin eventos.</p>'}</section>
      </div>
      ${can('edit') ? '<div class="wk-save"><span class="mono" id="wk-dirty"></span><button class="btn" id="wk-savebtn">Guardar datos</button></div>' : ''}</div>`;
    const avisos = () => `<div class="wk-dat"><section class="wk-box" id="wk-utag"><h2>Aviso en actualizaciones</h2><small class="mono">Texto resaltado junto al título de la obra en Inicio › Últimas actualizaciones y en Lanzamientos. Úsalo para anunciar un volumen nuevo, un nivel nuevo, un capítulo extra o lo que el equipo quiera.</small><div id="wk-utag-b"></div></section>
      <div class="wk-col"><section class="wk-box"><h2>Vista previa</h2><div id="wk-utag-pv"></div></section></div></div>`;
    const chip = (k, val, l) => `<button type="button" class="ed-chip ${F[k] === val ? 'on' : ''}" aria-pressed="${F[k] === val}" data-f${k}="${val}">${l}</button>`;
    const filterBar = () => C.length ? `<div class="wk-flt"><input type="search" id="wk-q" value="${esc(F.q)}" placeholder="Buscar capítulo por número o título" aria-label="Buscar capítulo">
      <span class="ed-chips" role="group" aria-label="Estado">${chip('st', '', 'Todos')}${chip('st', 'draft', 'Borradores · ' + n('draft'))}${chip('st', 'scheduled', 'Programados · ' + n('scheduled'))}${chip('st', 'published', 'Publicados · ' + n('published'))}</span>
      <span class="ed-chips" role="group" aria-label="Etapa del tablero">${chip('stage', '', 'Todas las etapas')}${Object.entries(STG).map(([k, [l]]) => chip('stage', k, l + ' · ' + C.filter(c => stg(c) === k).length)).join('')}</span>
      ${filtered ? '<button type="button" class="lnk" id="wk-fclear">Quitar filtros</button>' : ''}${filtered && can('edit') ? '<span class="mono">Quita los filtros para reordenar arrastrando.</span>' : ''}</div>` : '';
    const left = d => Math.max(0, 30 - Math.floor((Date.now() - new Date(d)) / 864e5));
    const TCx = TC.filter(c => !TV.some(v => v.id === c.volume_id));
    const trashHTML = () => (TC.length || TV.length) ? `<details class="wk-trash" id="wk-trash" ${work.trashOpen ? 'open' : ''}><summary><b>Papelera</b><span class="mono">${[TV.length ? TV.length + (TV.length === 1 ? ' volumen' : ' volúmenes') : '', TCx.length ? TCx.length + (TCx.length === 1 ? ' capítulo' : ' capítulos') : ''].filter(Boolean).join(' · ')} · se vacía sola a los 30 días</span></summary><div class="wk-trl">
      ${TV.map(v => `<div class="wk-tri"><span><b>Volumen ${v.num}${v.title && v.title !== String(v.num) && !/^volumen\s*\d+$/i.test(v.title) ? ' · ' + esc(v.title) : ''}</b><small>${TC.filter(c => c.volume_id === v.id).length} capítulos · quedan ${left(v.deleted_at)} días</small></span>${can('delete') ? `<span class="wk-ra"><button class="btn ghost xs" data-trv="${v.id}">Restaurar</button><button class="lnk danger" data-purv="${v.id}">Borrar definitivamente</button></span>` : ''}</div>`).join('')}
      ${TCx.map(c => `<div class="wk-tri"><span><b>${c.section_type && c.section_type !== 'Capítulo' ? esc(c.section_type) : 'Cap. ' + c.num} — ${esc(c.title)}</b><small>Vol. ${c.vol}${c.status === 'published' ? ' · estaba publicado' : ''} · quedan ${left(c.deleted_at)} días</small></span>${can('delete') ? `<span class="wk-ra"><button class="btn ghost xs" data-trc="${c.id}">Restaurar</button><button class="lnk danger" data-purc="${c.id}">Borrar definitivamente</button></span>` : ''}</div>`).join('')}
      </div>${can('delete') ? '<button type="button" class="lnk danger" id="wk-empty">Vaciar papelera</button>' : ''}</details>` : '';
    app.innerHTML = shell(esc(s.title), `<div class="wk">
      <div class="wk-top"><div class="wk-summary"><span class="pl" style="--p:${st[1]}">${st[0]}</span><span class="mono">${V.length} ${V.length === 1 ? 'volumen' : 'volúmenes'} · ${n('published')} publicados · ${n('scheduled')} programados · ${n('draft')} borradores</span></div>
        <span class="wk-acts">${can('create') ? '<button class="btn sm" id="wk-new">＋ Nuevo capítulo</button>' : ''}${can('import') ? '<a class="btn ghost sm" href="/estudio/importar">Importar volumen</a>' : ''}<a class="btn ghost sm" href="?tab=datos" data-tab="datos">Editar datos</a><a class="lnk" href="/serie/${esc(s.slug)}">Ver en el sitio ↗</a></span></div>
      <div class="wk-tabs" role="tablist">${[['caps', 'Volúmenes y capítulos'], ['datos', 'Datos de la obra'], ['avisos', 'Avisos'], ['media', 'Anime y galería']].map(([k, l]) => `<a role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" href="${k === 'caps' ? location.pathname : '?tab=' + k}" data-tab="${k}">${l}</a>`).join('')}</div>
      ${tab === 'caps' ? `${filterBar()}${V.map(volHTML).join('') || '<p class="tb-empty">Esta obra aún no tiene volúmenes.</p>'}${can('create') ? '<button class="wk-addv" id="addvol"><span>＋</span>Nuevo volumen</button>' : ''}${trashHTML()}<div id="wk-bulkw"></div>` : tab === 'avisos' ? avisos() : tab === 'media' ? '<div id="wk-media"><p class="mono">Cargando…</p></div>' : datos()}</div>`, '/estudio/obra');
    bindPicker(home);
    const on = (sel2, fn) => app.querySelectorAll(sel2).forEach(b => b.onclick = e => { e.preventDefault(); busy(b, () => fn(b)); });
    const again = () => work(slug);
    app.querySelectorAll('[data-tab]').forEach(a => a.onclick = e => { e.preventDefault(); history.replaceState({}, '', a.dataset.tab === 'caps' ? location.pathname : location.pathname + '?tab=' + a.dataset.tab); again(); });
    app.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { const id = b.dataset.tog; open.has(id) ? open.delete(id) : open.add(id); again(); });
    on('#wk-new', async () => { const v = V[V.length - 1]; if (!v) throw new Error('Crea primero un volumen'); const num = Math.max(0, ...allNums) + 1; const { data, error } = await sb.from('chapters').insert({ series_id: s.id, volume_id: v.id, vol: v.num, num, title: 'Capítulo ' + num, body: [], status: 'draft', section_type: 'Capítulo' }).select('id').single(); if (error) throw error; go('/estudio/editar/' + data.id); });
    on('#addvol', async () => { const nn = Math.max(0, ...V.map(v => v.num), ...TV.map(v => v.num)) + 1; const { data, error } = await sb.from('volumes').insert({ series_id: s.id, num: nn, status: 'draft' }).select('id').single(); if (error) throw error; open.add(data.id); again(); });
    on('[data-pub]', async b => { const vx = V.find(x => x.id === b.dataset.pub); if (vx?.external_only && vx.external_url && !listOf(vx).length) { const { error } = await sb.from('volumes').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', vx.id); if (error) throw new Error(errMsg(error)); toast('Volumen publicado · enlaza al sitio del traductor'); return again(); }
      const { error } = await sb.rpc('publish_volume', { p_volume: b.dataset.pub }); if (error) throw new Error(errMsg(error)); toast('Volumen publicado · se envió un solo aviso a los seguidores'); again(); });
    on('[data-sch]', async b => { const at = app.querySelector(`[data-at="${b.dataset.sch}"]`).value; if (!at) throw new Error('Elige fecha y hora'); const d = new Date(fromLocal(at)); if (d <= new Date()) throw new Error('La fecha debe ser futura'); const { error } = await sb.rpc('publish_volume', { p_volume: b.dataset.sch, p_at: d.toISOString() }); if (error) throw new Error(errMsg(error)); toast('Programado para ' + fmtTz(d)); again(); });
    on('[data-unsch]', async b => { await sb.from('chapters').update({ status: 'draft' }).eq('volume_id', b.dataset.unsch).eq('status', 'scheduled'); const { error } = await sb.from('volumes').update({ status: 'draft' }).eq('id', b.dataset.unsch); if (error) throw error; again(); });
    on('[data-hide]', async b => { const { error } = await sb.from('volumes').update({ status: 'hidden' }).eq('id', b.dataset.hide); if (error) throw error; again(); });
    on('[data-show]', async b => { const { error } = await sb.from('volumes').update({ status: 'published' }).eq('id', b.dataset.show); if (error) throw error; again(); });
    on('[data-addch]', async b => { const num = Math.max(0, ...allNums) + 1; const { data, error } = await sb.from('chapters').insert({ series_id: s.id, volume_id: b.dataset.addch, vol: +b.dataset.n, num, title: 'Capítulo ' + num, body: [], status: 'draft', section_type: 'Capítulo' }).select('id').single(); if (error) throw error; go('/estudio/editar/' + data.id); });
    on('[data-cpub]', async b => { const { error } = await sb.from('chapters').update({ status: 'published', publish_at: new Date().toISOString() }).eq('id', b.dataset.cpub); if (error) throw new Error(/approval_required/.test(error.message) ? 'El equipo exige una revisión aprobada antes de publicar.' : errMsg(error)); toast('Capítulo publicado'); again(); });
    on('[data-delch]', async b => { if (!confirm('¿Enviar este capítulo a la papelera? Podrás restaurarlo durante 30 días.')) return; const { error } = await sb.rpc('trash_chapters', { p_ids: [b.dataset.delch] }); if (error) throw new Error(errMsg(error)); SEL.delete(b.dataset.delch); toast('Capítulo en la papelera'); again(); });
    on('[data-delvol]', async b => { if (!confirm('¿Enviar el volumen y todos sus capítulos a la papelera? Podrás restaurarlo durante 30 días.')) return; const { error } = await sb.rpc('trash_volume', { p_id: b.dataset.delvol }); if (error) throw new Error(errMsg(error)); toast('Volumen en la papelera'); again(); });
    // ---- filtros
    app.querySelectorAll('[data-fst]').forEach(b => b.onclick = () => { F.st = b.dataset.fst; again(); });
    app.querySelectorAll('[data-fstage]').forEach(b => b.onclick = () => { F.stage = b.dataset.fstage; again(); });
    $('#wk-fclear')?.addEventListener('click', () => { Object.assign(F, { st: '', stage: '', q: '' }); again(); });
    const q0 = $('#wk-q'); if (q0) { let qt = 0; q0.oninput = () => { clearTimeout(qt); qt = setTimeout(() => { F.q = q0.value; work.focusQ = true; again(); }, 350); }; if (work.focusQ) { work.focusQ = false; q0.focus(); q0.setSelectionRange(q0.value.length, q0.value.length); } }
    // ---- selección y acciones en lote
    const ordered = () => V.flatMap(v => listOf(v).map(c => ({ c, vid: v.id })));
    const picked = () => ordered().filter(x => SEL.has(x.c.id)).map(x => x.c);
    const okPub = c => c.status === 'draft' && volOf(c)?.status === 'published';
    const syncAll = () => app.querySelectorAll('[data-allv]').forEach(a => { const ids = [...app.querySelectorAll(`[data-vol="${a.dataset.allv}"] [data-pick]`)].map(i => i.dataset.pick); a.checked = ids.length > 0 && ids.every(i => SEL.has(i)); });
    app.querySelectorAll('[data-pick]').forEach(i => i.onchange = () => { i.checked ? SEL.add(i.dataset.pick) : SEL.delete(i.dataset.pick); i.closest('.wk-tr').classList.toggle('sel', i.checked); syncAll(); drawBulk(); });
    app.querySelectorAll('[data-allv]').forEach(a => a.onchange = () => { app.querySelectorAll(`[data-vol="${a.dataset.allv}"] [data-pick]`).forEach(i => { i.checked = a.checked; a.checked ? SEL.add(i.dataset.pick) : SEL.delete(i.dataset.pick); i.closest('.wk-tr').classList.toggle('sel', a.checked); }); drawBulk(); });
    const loop = async (list, fn) => { let ok = 0; const bad = []; for (const c of list) { const { error } = await fn(c); if (error) bad.push('Cap. ' + c.num + ': ' + (/approval_required/.test(error.message) ? 'necesita una revisión aprobada' : errMsg(error))); else ok++; } return { ok, bad }; };
    const report = (r, verb) => { toast(r.ok + ' ' + (r.ok === 1 ? 'capítulo ' : 'capítulos ') + verb + (r.bad.length ? ' · ' + r.bad.length + ' con error' : '')); if (r.bad.length) alert('No se pudieron procesar:\n' + r.bad.join('\n')); SEL.clear(); again(); };
    const addDaysLocal = (v, k) => { const [D0, H0] = v.split('T'), [y, m, d] = D0.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10) + 'T' + H0; };
    const dowOf = v => new Date(v.split('T')[0] + 'T12:00:00Z').getUTCDay();
    const DOW = [['1', 'L'], ['2', 'M'], ['3', 'X'], ['4', 'J'], ['5', 'V'], ['6', 'S'], ['0', 'D']];
    function seriesDates(start, every, days, count){ const out = []; if (!start) return out; if (days.length) { for (let k = 0; out.length < count && k < 3660; k++) { const v = addDaysLocal(start, k); if (days.includes(String(dowOf(v)))) out.push(v); } } else for (let k = 0; k < count; k++) out.push(addDaysLocal(start, k * every)); return out; }
    async function commitOrder(list, msg){
      const ren = list.filter((x, i) => +x.c.num !== i + 1), moved = list.filter(x => (volOf(x.c)?.id) !== x.vid);
      if (!ren.length && !moved.length) return false;
      const pubR = ren.filter(x => x.c.status === 'published').length;
      if (ren.length && !confirm(`${msg}\n\nSe renumerarán ${ren.length} capítulo(s) para que la numeración siga el nuevo orden${pubR ? `; ${pubR} ya publicado(s) cambiará(n) de número y de enlace` : ''}. ¿Continuar?`)) return false;
      const { error } = await sb.rpc('reorder_chapters', { p_series: s.id, p_items: list.map(x => ({ id: x.c.id, volume_id: x.vid })) }); if (error) throw new Error(errMsg(error)); return true;
    }
    function drawBulk(){
      const w = $('#wk-bulkw'); if (!w) return; if (!SEL.size) { w.innerHTML = ''; return; }
      w.innerHTML = `<div class="wk-bulk" role="region" aria-label="Acciones en lote"><b>${SEL.size} ${SEL.size === 1 ? 'capítulo' : 'capítulos'}</b>
        ${can('publish') ? '<button class="btn sm green" data-bk="pub">⇪ Publicar</button>' : ''}
        ${can('schedule') ? '<button class="btn ghost sm" data-bk="sch">◷ Programar</button><button class="btn ghost sm" data-bk="ser">◷ En serie</button>' : ''}
        ${can('edit') && V.length > 1 ? `<select data-bk="move" aria-label="Mover a otro volumen"><option value="">Mover a…</option>${V.map(v => `<option value="${v.id}">Volumen ${v.num}</option>`).join('')}</select>` : ''}
        ${can('board') ? `<select data-bk="stage" aria-label="Cambiar etapa del tablero"><option value="">Etapa…</option>${Object.entries(STG).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select>` : ''}
        ${can('delete') ? '<button class="lnk danger" data-bk="trash">Enviar a la papelera</button>' : ''}
        <button class="lnk" data-bk="clear" style="margin-left:auto">Deseleccionar</button><div class="wk-bp" id="wk-bp" hidden></div></div>`;
      const bp = $('#wk-bp'), L2 = picked(), elig = L2.filter(okPub), skip = L2.length - elig.length;
      const skipNote = skip ? `<span class="mono">Se omiten ${skip}: solo se publican o programan borradores de volúmenes ya publicados (para un volumen nuevo usa «Programar volumen»).</span>` : '';
      const B = k => w.querySelector(`[data-bk="${k}"]`);
      B('clear').onclick = () => { SEL.clear(); app.querySelectorAll('[data-pick]').forEach(i => { i.checked = false; i.closest('.wk-tr').classList.remove('sel'); }); syncAll(); drawBulk(); };
      B('pub')?.addEventListener('click', e => busy(e.currentTarget, async () => { if (!elig.length) throw new Error('Ninguno se puede publicar ahora: solo borradores de volúmenes ya publicados.'); if (!confirm(`¿Publicar ahora ${elig.length} capítulo(s)?${skip ? ` Se omiten ${skip}.` : ''}`)) return; const at = new Date().toISOString(); report(await loop(elig, c => sb.from('chapters').update({ status: 'published', publish_at: at }).eq('id', c.id)), 'publicados'); }));
      B('sch')?.addEventListener('click', () => { bp.hidden = !bp.hidden; bp.innerHTML = `<div class="row"><label class="mono">Fecha y hora <input type="datetime-local" id="bk-at"></label>${tzHint()}<button class="btn sm" id="bk-go">Programar ${elig.length}</button></div>${skipNote}`;
        $('#bk-go').onclick = e => busy(e.currentTarget, async () => { const v = $('#bk-at').value; if (!v) throw new Error('Elige fecha y hora'); const d = new Date(fromLocal(v)); if (d <= new Date()) throw new Error('La fecha debe ser futura'); if (!elig.length) throw new Error('Ninguno se puede programar'); report(await loop(elig, c => sb.from('chapters').update({ status: 'scheduled', publish_at: d.toISOString() }).eq('id', c.id)), 'programados para ' + fmtTz(d)); }); });
      B('ser')?.addEventListener('click', () => { bp.hidden = !bp.hidden; const S = { start: '', every: 7, days: [] };
        const dr = () => { const ds = seriesDates(S.start, S.every, S.days, elig.length);
          bp.innerHTML = `<div class="row"><label class="mono">Primer capítulo <input type="datetime-local" id="sr-at" value="${S.start}"></label>${tzHint()}
            <label class="mono">Cada <select id="sr-ev">${[[1, 'día'], [2, '2 días'], [3, '3 días'], [7, 'semana'], [14, '2 semanas']].map(([k, l]) => `<option value="${k}" ${S.every === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <span class="mono">o solo los</span><span class="ed-chips">${DOW.map(([k, l]) => `<button type="button" class="ed-chip ${S.days.includes(k) ? 'on' : ''}" aria-pressed="${S.days.includes(k)}" data-dw="${k}">${l}</button>`).join('')}</span></div>
            ${ds.length ? `<ol>${elig.map((c, i) => `<li>Cap. ${c.num} → ${fmtTz(fromLocal(ds[i]), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</li>`).join('')}</ol>` : '<span class="mono">Elige la fecha del primero para ver el calendario.</span>'}
            ${skipNote}<div class="row"><button class="btn sm" id="sr-go" ${ds.length && elig.length ? '' : 'disabled'}>Programar ${elig.length} en serie</button><span class="mono">En el orden de la lista. Los días de la semana tienen prioridad sobre «cada».</span></div>`;
          $('#sr-at').onchange = e => { S.start = e.target.value; dr(); }; $('#sr-ev').onchange = e => { S.every = +e.target.value; S.days = []; dr(); };
          bp.querySelectorAll('[data-dw]').forEach(b => b.onclick = () => { const k = b.dataset.dw; S.days = S.days.includes(k) ? S.days.filter(x => x !== k) : [...S.days, k]; dr(); });
          $('#sr-go').onclick = e => busy(e.currentTarget, async () => { if (new Date(fromLocal(ds[0])) <= new Date()) throw new Error('El primer capítulo debe programarse en el futuro'); let i = 0; report(await loop(elig, c => sb.from('chapters').update({ status: 'scheduled', publish_at: new Date(fromLocal(ds[i++])).toISOString() }).eq('id', c.id)), 'programados en serie'); }); };
        dr(); });
      B('move')?.addEventListener('change', e => { const vid = e.target.value; if (!vid) return; busy(null, async () => { const list = ordered(), mv = list.filter(x => SEL.has(x.c.id)), rest = list.filter(x => !SEL.has(x.c.id)); mv.forEach(x => { x.vid = vid; });
        const ti = V.findIndex(v => v.id === vid), at = (() => { let k = -1; rest.forEach((x, i) => { if (V.findIndex(v => v.id === x.vid) <= ti) k = i; }); return k + 1; })(); rest.splice(at, 0, ...mv);
        if (await commitOrder(rest, `Mover ${mv.length} capítulo(s) al volumen ${V[ti].num}.`)) { toast('Capítulos movidos'); SEL.clear(); again(); } else e.target.value = ''; }); });
      B('stage')?.addEventListener('change', e => { const k = e.target.value; if (!k) return; busy(null, async () => { const L3 = L2.filter(c => c.status === 'draft'); if (!L3.length) throw new Error('La etapa solo aplica a borradores'); report(await loop(L3, c => sb.rpc('chapter_move', { p_id: c.id, p_stage: k, p_assignee: null })), 'pasados a «' + STG[k][0] + '»'); }); });
      B('trash')?.addEventListener('click', e => busy(e.currentTarget, async () => { if (!confirm(`¿Enviar ${L2.length} capítulo(s) a la papelera? Podrás restaurarlos durante 30 días.`)) return; const { error } = await sb.rpc('trash_chapters', { p_ids: L2.map(c => c.id) }); if (error) throw new Error(errMsg(error)); toast(L2.length + ' en la papelera'); SEL.clear(); again(); }));
    }
    drawBulk();
    // ---- arrastrar para reordenar o cambiar de volumen
    let dragId = null;
    const moveTo = (cid, targetId, after, vid) => busy(null, async () => {
      const list = ordered(), i0 = list.findIndex(x => x.c.id === cid); if (i0 < 0) return; const [it] = list.splice(i0, 1); it.vid = vid;
      let at; if (targetId) at = list.findIndex(x => x.c.id === targetId) + (after ? 1 : 0);
      else { const ti = V.findIndex(v => v.id === vid); at = 0; list.forEach((x, i) => { if (V.findIndex(v => v.id === x.vid) <= ti) at = i + 1; }); }
      list.splice(at, 0, it); if (await commitOrder(list, `Mover «${it.c.title}».`)) { toast('Orden actualizado'); again(); } });
    app.querySelectorAll('.wk-tr[draggable="true"]').forEach(r => {
      r.ondragstart = e => { if (e.target.closest('input,button,a,select')) return e.preventDefault(); dragId = r.dataset.row; r.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); };
      r.ondragend = () => { dragId = null; r.classList.remove('drag'); app.querySelectorAll('.drop-a,.drop-b,.drop-v').forEach(x => x.classList.remove('drop-a', 'drop-b', 'drop-v')); };
      r.ondragover = e => { if (!dragId || r.dataset.row === dragId) return; e.preventDefault(); const bx = r.getBoundingClientRect(), af = e.clientY > bx.top + bx.height / 2; r.classList.toggle('drop-b', af); r.classList.toggle('drop-a', !af); };
      r.ondragleave = () => r.classList.remove('drop-a', 'drop-b');
      r.ondrop = e => { e.preventDefault(); if (!dragId) return; const af = r.classList.contains('drop-b'); r.classList.remove('drop-a', 'drop-b'); moveTo(dragId, r.dataset.row, af, r.dataset.vol); };
    });
    if (canDrag) app.querySelectorAll('.wk-vh').forEach(h => { h.ondragover = e => { if (dragId) { e.preventDefault(); h.classList.add('drop-v'); } }; h.ondragleave = () => h.classList.remove('drop-v'); h.ondrop = e => { e.preventDefault(); h.classList.remove('drop-v'); if (dragId) moveTo(dragId, null, true, h.dataset.tog); }; });
    // ---- papelera
    $('#wk-trash')?.addEventListener('toggle', e => { work.trashOpen = e.currentTarget.open; });
    const purgeVols = async vs => { for (const v of vs) { await deleteChapters(TC.filter(c => c.volume_id === v.id).map(c => c.id), [v.cover_path, ...(v.epub_fonts || []).map(f => pathOf(f.url))]); const { error } = await sb.from('volumes').delete().eq('id', v.id); if (error) throw new Error(errMsg(error)); } };
    on('[data-trc]', async b => { const { error } = await sb.rpc('restore_trash', { p_chapters: [b.dataset.trc], p_volumes: [] }); if (error) throw new Error(errMsg(error)); toast('Capítulo restaurado'); again(); });
    on('[data-trv]', async b => { const { error } = await sb.rpc('restore_trash', { p_chapters: [], p_volumes: [b.dataset.trv] }); if (error) throw new Error(errMsg(error)); toast('Volumen restaurado'); again(); });
    on('[data-purc]', async b => { if (!confirm('¿Borrar definitivamente este capítulo? No se podrá recuperar y sus imágenes sin uso se eliminarán.')) return; await deleteChapters([b.dataset.purc]); again(); });
    on('[data-purv]', async b => { if (!confirm('¿Borrar definitivamente el volumen y sus capítulos? No se podrá recuperar.')) return; await purgeVols(TV.filter(v => v.id === b.dataset.purv)); again(); });
    on('#wk-empty', async () => { if (!confirm('¿Vaciar la papelera? Todo se borrará definitivamente.')) return; await purgeVols(TV); await deleteChapters(TCx.map(c => c.id)); toast('Papelera vaciada'); again(); });
    if (can('delete')) { const oldV = TV.filter(v => !left(v.deleted_at)), oldC = TCx.filter(c => !left(c.deleted_at)); if (oldV.length || oldC.length) (async () => { try { await purgeVols(oldV); if (oldC.length) await deleteChapters(oldC.map(c => c.id)); } catch (e) { console.warn('papelera', e); } })(); }
    app.querySelectorAll('[data-vedit]').forEach(b => b.onclick = () => { const v = V.find(x => x.id === b.dataset.vedit), box = $('#ve-' + v.id); if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false; box.innerHTML = `<div class="imp-fg" style="margin:0">
        <label>Número de volumen<input name="vnum" type="number" min="1" max="999" step="1" value="${v.num}"></label><label>Título del volumen<input name="title" maxlength="200" value="${esc(v.title && v.title !== String(v.num) ? v.title : '')}" placeholder="Volumen ${v.num}"></label><label>Subtítulo<input name="subtitle" maxlength="200" value="${esc(v.subtitle || '')}"></label>
        <label>Salida en Japón<input name="jp_release" type="date" value="${esc(v.jp_release || '')}"></label><label>Capítulos previstos<input name="planned_chapters" type="number" min="0" max="999" value="${v.planned_chapters ?? ''}"></label>
        <label class="wide">Sinopsis<textarea name="synopsis" rows="3" maxlength="3000">${esc(v.synopsis || '')}</textarea></label>
        <label class="tb-inl wide"><input type="checkbox" name="synopsis_spoiler" ${v.synopsis_spoiler ? 'checked' : ''}> La sinopsis contiene spoilers del volumen anterior</label>
        <label class="tb-inl wide"><input type="checkbox" name="is_final" ${v.is_final ? 'checked' : ''}> Es el último volumen (al publicarlo, la traducción queda como completa)</label>
        <div class="wide wk-vacc" style="display:grid;gap:6px;padding:10px 0;border-top:1px solid #2f2a20;border-bottom:1px solid #2f2a20"><b style="font-size:13px">Quién puede leerlo</b>
          <label class="tb-inl"><input type="radio" name="access" value="public" ${(v.access || 'public') === 'public' ? 'checked' : ''}> Público general</label>
          <label class="tb-inl"><input type="radio" name="access" value="donors" ${v.access === 'donors' ? 'checked' : ''}> Solo mecenas, de cualquier nivel</label>
          <label class="tb-inl"><input type="radio" name="access" value="tier" ${v.access === 'tier' ? 'checked' : ''}> Desde el nivel <select name="access_tier" style="width:auto"><option value="">Cargando niveles…</option></select></label>
          <span class="wk-vau" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center" ${(v.access || 'public') === 'public' ? 'hidden' : ''}><label class="tb-inl">Abrir a todo público el <input type="datetime-local" name="access_until" value="${v.access_until ? toLocal(v.access_until) : ''}" style="width:auto"></label>${tzHint()}<span class="mono" style="font-size:11px">Opcional. Vacío = sigue restringido.</span></span>
          <span class="mono" style="font-size:11px">El equipo siempre lo ve. Los lectores sin acceso lo ven bloqueado con el enlace para apoyar. Puedes cambiarlo cuando quieras, también después de publicado.</span></div>
        <div class="wide wk-vcov"><span class="wk-vcp" id="vcp-${v.id}" style="${v.cover_path ? `background-image:url('${esc(media(v.cover_thumb_path || v.cover_path))}')` : ''}">${v.cover_path ? '' : 'Sin portada'}</span>
          <span style="display:grid;gap:6px"><b style="font-size:13px">Portada del volumen</b><span class="mono" style="font-size:11px">JPG, PNG o WebP · máx. 8 MB · se recomienda vertical 2:3 (por ejemplo 1200 × 1800 px).</span>
          <span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label class="btn ghost sm" style="cursor:pointer">${v.cover_path ? 'Cambiar portada' : 'Subir portada'}<input type="file" name="cover" accept="image/jpeg,image/png,image/webp" hidden></label>${v.cover_path ? '<button type="button" class="lnk danger" data-vcovdel>Quitar portada</button>' : ''}<span class="mono" id="vcs-${v.id}"></span></span></span></div>
        <div class="wide wk-vext"><label class="tb-inl"><input type="checkbox" name="ext_on" ${v.external_url ? 'checked' : ''}> Volumen disponible en el sitio del traductor</label>
          <div class="wk-vexf" ${v.external_url ? '' : 'hidden'}>
            <label>Enlace del volumen<input name="external_url" type="url" inputmode="url" maxlength="500" placeholder="https://tu-sitio.com/obra/volumen-${v.num}" value="${esc(v.external_url || '')}"></label>
            <label>Nombre del sitio<input name="external_site" maxlength="60" placeholder="${esc(T.team.name)}" value="${esc(v.external_site || '')}"></label>
            <label class="tb-inl"><input type="radio" name="external_only" value="1" ${v.external_only !== false ? 'checked' : ''}> Se lee solo en su sitio: El Obi del Lector muestra el volumen y un botón «Leer en el sitio del traductor».</label>
            <label class="tb-inl"><input type="radio" name="external_only" value="0" ${v.external_only === false ? 'checked' : ''}> También se lee aquí: el enlace aparece como opción adicional.</label></div></div>
        <span class="wide" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-vsave>Guardar volumen</button><button class="btn ghost sm" data-vcancel>Cancelar</button></span></div>`;
      const tierSel = box.querySelector('[name=access_tier]'), auBox = box.querySelector('.wk-vau');
      box.querySelectorAll('[name=access]').forEach(r => r.onchange = () => { auBox.hidden = r.value === 'public' && r.checked; if (r.value === 'tier' && r.checked) tierSel.focus(); });
      sb.from('patreon_tiers').select('id,name,price_usd').eq('team_id', T.team.id).order('price_usd').then(({ data: tiers }) => { const L2 = tiers || [];
        tierSel.innerHTML = L2.length ? L2.map(t => `<option value="${t.price_usd}" ${v.access_min_price != null && +v.access_min_price === +t.price_usd ? 'selected' : ''}>${esc(t.name)} · ${t.price_usd} USD</option>`).join('') : '<option value="">Aún no hay niveles de Patreon</option>';
        if (!L2.length) { tierSel.disabled = true; const tr = box.querySelector('[name=access][value=tier]'); tr.disabled = true; } });
      const extOn = box.querySelector('[name=ext_on]'); extOn.onchange = () => { box.querySelector('.wk-vexf').hidden = !extOn.checked; if (extOn.checked) box.querySelector('[name=external_url]').focus(); };
      const setCover = async (path, old) => { const { error } = await sb.from('volumes').update({ cover_path: path }).eq('id', v.id); if (error) throw new Error(errMsg(error)); v.cover_path = path;
        if (old && old !== path && old.startsWith(T.team.id + '/')) { const { data: used } = await sb.rpc('media_in_use', { p_team: T.team.id, p_paths: [old] }); if (!(used || []).includes(old)) await sb.storage.from('obi-media').remove([old]); } };
      box.querySelector('[name=cover]').onchange = e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; const st2 = $('#vcs-' + v.id);
        busy(null, async () => { if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Usa JPG, PNG o WebP'); if (file.size > LIMITS.image) throw new Error('La imagen pesa más de 8 MB');
          st2.textContent = 'Subiendo…'; const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type], path = `${T.team.id}/obras/${s.slug}/vol-${v.num}/portada-${Date.now()}.${ext}`;
          const { error } = await sb.storage.from('obi-media').upload(path, file, { contentType: file.type, cacheControl: '31536000' }); if (error) { st2.textContent = ''; throw new Error(errMsg(error)); }
          await setCover(path, v.cover_path); $('#vcp-' + v.id).style.backgroundImage = `url('${media(path)}')`; $('#vcp-' + v.id).textContent = ''; st2.textContent = '✓ Portada guardada';
          if (!s.cover_path && confirm('La obra aún no tiene portada. ¿Usar también esta?')) await sb.from('series').update({ cover_path: path }).eq('id', s.id);
          toast('Portada del volumen ' + v.num + ' actualizada'); }).then(() => { if (!st2.textContent.startsWith('✓')) st2.textContent = ''; }); };
      box.querySelector('[data-vcovdel]')?.addEventListener('click', e => busy(e.currentTarget, async () => { if (!confirm('¿Quitar la portada de este volumen?')) return; await setCover(null, v.cover_path); toast('Portada quitada'); again(); }));
      const f = k => box.querySelector(`[name=${k}]`);
      box.querySelector('[data-vcancel]').onclick = () => { box.hidden = true; };
      box.querySelector('[data-vsave]').onclick = e => busy(e.currentTarget, async () => {
        const patch = { title: f('title').value.trim() || String(v.num), subtitle: f('subtitle').value.trim() || null, jp_release: f('jp_release').value || null, planned_chapters: f('planned_chapters').value === '' ? null : Math.max(0, +f('planned_chapters').value), synopsis: f('synopsis').value.trim() || null, synopsis_spoiler: f('synopsis_spoiler').checked, is_final: f('is_final').checked };
        if (f('ext_on').checked) { const u2 = f('external_url').value.trim(); if (!/^https:\/\/[^\s/]+\.[^\s]{2,}/i.test(u2)) throw new Error('Escribe el enlace completo del volumen, empezando por https://'); Object.assign(patch, { external_url: u2, external_site: f('external_site').value.trim() || null, external_only: box.querySelector('[name=external_only]:checked')?.value !== '0' }); }
        else Object.assign(patch, { external_url: null, external_site: null, external_only: false });
        const acc = box.querySelector('[name=access]:checked')?.value || 'public';
        if (acc === 'tier' && !tierSel.value) throw new Error('Elige desde qué nivel se puede leer');
        const au = acc === 'public' ? null : fromLocal(f('access_until').value);
        if (au && new Date(au) <= new Date() && !confirm('La fecha para abrirlo a todo público ya pasó: el volumen quedará público. ¿Continuar?')) return;
        Object.assign(patch, { access: acc, access_min_price: acc === 'tier' ? +tierSel.value : null, access_until: au });
        const nn = Math.round(+f('vnum').value);
        if (nn !== v.num) { if (!(nn >= 1 && nn <= 999)) throw new Error('El número de volumen va de 1 a 999');
          const live = V.find(x => x.id !== v.id && x.num === nn), gone = (TV || []).find(x => x.id !== v.id && x.num === nn);
          if (live && !confirm(`Ya existe el Volumen ${nn}. ¿Intercambiar números? El Volumen ${nn} pasará a ser el ${v.num}.`)) return;
          if (!live && gone && !confirm(`Hay un Volumen ${nn} en la papelera. Pasará a ser el ${v.num} para dejar libre el número. ¿Continuar?`)) return;
          if (patch.title === String(v.num)) patch.title = String(nn);
          const r = await sb.rpc('renumber_volume', { p_volume: v.id, p_num: nn }); if (r.error) throw new Error(errMsg(r.error)); }
        const { error } = await sb.from('volumes').update(patch).eq('id', v.id); if (error) throw new Error(errMsg(error)); toast((nn !== v.num ? `Volumen guardado · ahora es el Volumen ${nn}` : 'Volumen guardado') + (acc !== (v.access || 'public') ? ' · acceso: ' + ({ public: 'público general', donors: 'solo mecenas', tier: 'desde ' + (tierSel.selectedOptions[0]?.textContent || 'el nivel elegido') })[acc] : '')); again(); });
    });
    if (tab === 'media') {
      const ytId = u => (String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/) || [])[1] || null; const PLAT = [['crunchyroll','Crunchyroll','#f59e7a'],['netflix','Netflix','#f29bb0'],['prime','Prime Video','#8cc3f2'],['disney','Disney+','#8cc3f2'],['hidive','HIDIVE','#a9d18e'],['youtube','YouTube','#f29bb0'],['max','Max','#c9a8f2'],['otro','Otro','#a9d18e']], VK = [['opening','Opening'],['ending','Ending'],['trailer','Tráiler'],['avance','Avance'],['pv','PV'],['ost','Música'],['otro','Video']];
      const M = { anime: [], videos: [], gallery: [] }; let mDirty = false, loaded = false;
      const okU = u => /^https:\/\/[^\s/]+\.[^\s]{2,}/i.test((u || '').trim()), ed = can('edit');
      const row = (inner, i, key) => `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;padding:10px;border:1px solid #2f2a20;background:#16140f">${inner}<span style="display:flex;gap:6px">${ed ? `<button type="button" class="ed-btn" data-mu="${key}|${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button type="button" class="lnk danger" data-mx="${key}|${i}">Quitar</button>` : ''}</span></div>`;
      const draw = () => { const W = $('#wk-media'); if (!W) return; const dis = ed ? '' : 'disabled';
        W.innerHTML = `<div class="wk-dat">
        <section class="wk-box"><h2>Anime</h2><small class="mono">Dónde ver la adaptación. Aparece en la ficha pública como «Ver el anime».</small><div style="display:grid;gap:8px;margin-top:8px">
          ${M.anime.map((a, i) => row(`<span style="display:grid;gap:6px"><select data-m="anime|${i}|platform" ${dis}>${PLAT.map(([k, l]) => `<option value="${k}" ${a.platform === k ? 'selected' : ''}>${l}</option>`).join('')}</select><input data-m="anime|${i}|url" type="url" placeholder="https://…" value="${esc(a.url || '')}" ${dis}><input data-m="anime|${i}|label" maxlength="60" placeholder="Texto opcional (ej. Temporada 1, Latino)" value="${esc(a.label || '')}" ${dis}></span>`, i, 'anime')).join('') || '<p class="mono" style="margin:0">Sin enlaces.</p>'}
          ${ed && M.anime.length < 10 ? '<button type="button" class="btn ghost sm" data-madd="anime">＋ Agregar plataforma</button>' : ''}</div></section>
        <section class="wk-box"><h2>Videos</h2><small class="mono">Openings, endings, tráileres, avances… Los de YouTube se reproducen en la ficha; los demás aparecen como enlace.</small><div style="display:grid;gap:8px;margin-top:8px">
          ${M.videos.map((v, i) => { const id = ytId(v.url); return row(`<span style="display:grid;grid-template-columns:${id ? '96px ' : ''}minmax(0,1fr);gap:10px">${id ? `<img src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" alt="" style="width:96px;aspect-ratio:16/9;object-fit:cover">` : ''}<span style="display:grid;gap:6px"><select data-m="videos|${i}|kind" ${dis}>${VK.map(([k, l]) => `<option value="${k}" ${v.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select><input data-m="videos|${i}|url" type="url" placeholder="https://www.youtube.com/watch?v=…" value="${esc(v.url || '')}" ${dis}><input data-m="videos|${i}|title" maxlength="100" placeholder="Título (ej. Opening 1 · «Nombre de la canción»)" value="${esc(v.title || '')}" ${dis}></span></span>`, i, 'videos'); }).join('') || '<p class="mono" style="margin:0">Sin videos.</p>'}
          ${ed && M.videos.length < 24 ? '<button type="button" class="btn ghost sm" data-madd="videos">＋ Agregar video</button>' : ''}</div></section>
        <section class="wk-box" style="grid-column:1/-1"><h2>Galería</h2><small class="mono">Ilustraciones, portadas alternativas, arte promocional. JPG, PNG o WebP · máx. 8 MB cada una · hasta 40.</small>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px">${M.gallery.map((g, i) => `<figure style="margin:0;display:grid;gap:6px;padding:6px;border:1px solid #2f2a20;background:#16140f"><img src="${esc(media(g.path))}" alt="" loading="lazy" style="width:100%;aspect-ratio:3/4;object-fit:cover;background:#0d0c0a"><input data-m="gallery|${i}|caption" maxlength="120" placeholder="Pie de imagen" value="${esc(g.caption || '')}" style="font-size:12px;padding:5px" ${dis}>${ed ? `<span style="display:flex;justify-content:space-between"><button type="button" class="ed-btn" data-mu="gallery|${i}" ${i ? '' : 'disabled'} aria-label="Mover antes">←</button><button type="button" class="lnk danger" data-mx="gallery|${i}">Quitar</button></span>` : ''}</figure>`).join('')}
            ${ed && M.gallery.length < 40 ? `<label style="display:flex;align-items:center;justify-content:center;aspect-ratio:3/4;border:2px dashed #3d3628;cursor:pointer;text-align:center;font-weight:600;font-size:13px;padding:8px">＋ Subir imágenes<input type="file" id="mg-up" accept="image/jpeg,image/png,image/webp" multiple hidden></label>` : ''}</div>${ed && M.gallery.length < 40 ? '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><button type="button" class="btn ghost sm" id="mg-lib">▦ Elegir de Multimedia</button><span class="mono" style="font-size:12px">Usa ilustraciones que ya subiste con los volúmenes de esta obra.</span></div><div id="mg-pick"></div>' : ''}<span class="mono" id="mg-st" style="font-size:12px"></span></section>
        ${ed ? `<div class="wk-save"><span class="mono" id="m-dirty">${mDirty ? 'Cambios sin guardar' : ''}</span><button class="btn" id="m-save" ${mDirty ? '' : 'disabled'}>Guardar anime y galería</button></div>` : ''}</div>`;
        const mark = () => { mDirty = true; const d = $('#m-dirty'); if (d) d.textContent = 'Cambios sin guardar'; const b = $('#m-save'); if (b) b.disabled = false; };
        W.querySelectorAll('[data-m]').forEach(el => el[el.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => { const [k, i, f] = el.dataset.m.split('|'); M[k][+i][f] = el.value; mark(); if (k === 'videos' && f !== 'title') { el.onblur = draw; } if (el.tagName === 'SELECT') draw(); });
        W.querySelectorAll('[data-madd]').forEach(b => b.onclick = () => { const k = b.dataset.madd; M[k].push(k === 'anime' ? { platform: PLAT.find(p => !M.anime.some(a => a.platform === p[0]))?.[0] || 'otro', url: '', label: '' } : { kind: 'opening', url: '', title: '' }); mDirty = true; draw(); });
        W.querySelectorAll('[data-mx]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.mx.split('|'); M[k].splice(+i, 1); mDirty = true; draw(); });
        W.querySelectorAll('[data-mu]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.mu.split('|'), n = +i; [M[k][n - 1], M[k][n]] = [M[k][n], M[k][n - 1]]; mDirty = true; draw(); });
        $('#mg-lib')?.addEventListener('click', () => busy($('#mg-lib'), async () => {
          const box = $('#mg-pick'), root = `${T.team.id}/obras/${s.slug}`, IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
          const { data: dl, error } = await sb.storage.from('obi-media').list(root, { limit: 200, sortBy: { column: 'name', order: 'asc' } }); if (error) throw new Error(errMsg(error));
          const dirs = (dl || []).filter(x => !x.id).map(x => x.name).sort((a, b) => (+(b.match(/\d+/) || [0])[0]) - (+(a.match(/\d+/) || [0])[0]));
          if (!dirs.length) { box.innerHTML = '<p class="mono" style="font-size:12px">Esta obra aún no tiene carpetas en Multimedia. Se crean al importar un volumen.</p>'; return; }
          const sel = new Set(), have = new Set(M.gallery.map(g => g.path));
          const show = async dir => { box.innerHTML = '<p class="mono" style="font-size:12px">Cargando…</p>';
            const { data: fl } = await sb.storage.from('obi-media').list(root + '/' + dir, { limit: 500, sortBy: { column: 'name', order: 'asc' } });
            const imgs = (fl || []).filter(x => x.id && IMG.test(x.name)).map(x => root + '/' + dir + '/' + x.name);
            box.innerHTML = `<div style="display:grid;gap:10px;margin-top:10px;padding:12px;border:1px solid #3d3628;background:#14120d">
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label class="mono" style="font-size:12px">Carpeta <select id="mg-dir" style="width:auto">${dirs.map(d => `<option value="${esc(d)}" ${d === dir ? 'selected' : ''}>${esc(/^vol-\d+$/.test(d) ? 'Volumen ' + d.slice(4) : d)}</option>`).join('')}</select></label><span class="mono" style="font-size:12px" id="mg-n">${imgs.length} imágenes · elige las que quieras</span></div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;max-height:420px;overflow:auto">${imgs.map(p => `<button type="button" data-pk="${esc(p)}" ${have.has(p) ? 'disabled title="Ya está en la galería"' : ''} aria-pressed="false" style="position:relative;padding:0;aspect-ratio:3/4;border:2px solid #2f2a20;background:#0d0c0a url('${esc(media(p))}') center/cover;cursor:pointer;${have.has(p) ? 'opacity:.35;cursor:default' : ''}"><span aria-hidden="true" style="position:absolute;top:4px;right:4px;width:22px;height:22px;display:none;align-items:center;justify-content:center;background:var(--gold);color:#0d0c0a;font-weight:700">✓</span></button>`).join('') || '<p class="mono" style="font-size:12px">No hay imágenes en esta carpeta.</p>'}</div>
              <span style="display:flex;gap:8px"><button type="button" class="btn sm" id="mg-addsel" disabled>Agregar seleccionadas</button><button type="button" class="btn ghost sm" id="mg-close">Cerrar</button></span></div>`;
            $('#mg-dir').onchange = e => { sel.clear(); show(e.target.value); };
            $('#mg-close').onclick = () => { box.innerHTML = ''; };
            box.querySelectorAll('[data-pk]:not([disabled])').forEach(b => b.onclick = () => { const p = b.dataset.pk, on = !sel.has(p);
              if (on && M.gallery.length + sel.size >= 40) return toast('La galería admite hasta 40 imágenes');
              on ? sel.add(p) : sel.delete(p); b.setAttribute('aria-pressed', on); b.style.borderColor = on ? 'var(--gold)' : '#2f2a20'; b.firstElementChild.style.display = on ? 'flex' : 'none';
              const a = $('#mg-addsel'); a.disabled = !sel.size; a.textContent = sel.size ? `Agregar ${sel.size} seleccionada${sel.size === 1 ? '' : 's'}` : 'Agregar seleccionadas'; });
            $('#mg-addsel').onclick = () => { sel.forEach(path => M.gallery.push({ path, caption: '' })); toast(sel.size + (sel.size === 1 ? ' imagen agregada' : ' imágenes agregadas') + ' · pulsa «Guardar anime y galería»'); mDirty = true; draw(); }; };
          show(dirs[0]); }));
        $('#mg-up')?.addEventListener('change', e => { const files = [...e.target.files].slice(0, 40 - M.gallery.length); e.target.value = ''; if (!files.length) return; busy(null, async () => { const st2 = $('#mg-st');
          for (const [n, f] of files.entries()) { if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast(f.name + ': usa JPG, PNG o WebP'); continue; } if (f.size > LIMITS.image) { toast(f.name + ' pesa más de 8 MB'); continue; }
            if (st2) st2.textContent = `Subiendo ${n + 1} de ${files.length}…`; const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[f.type], path = `${T.team.id}/obras/${s.slug}/galeria/${Date.now()}-${n}.${ext}`;
            const { error } = await sb.storage.from('obi-media').upload(path, f, { contentType: f.type, cacheControl: '31536000' }); if (error) { toast(errMsg(error)); continue; } M.gallery.push({ path, caption: '' }); }
          mDirty = true; draw(); toast('Imágenes subidas · pulsa «Guardar anime y galería»'); }); });
        $('#m-save')?.addEventListener('click', e => busy(e.currentTarget, async () => {
          const bad = [...M.anime, ...M.videos].find(x => !okU(x.url)); if (bad) throw new Error('Revisa los enlaces: todos deben empezar por https://');
          const mediaV = { anime: M.anime.map(a => ({ platform: a.platform, url: a.url.trim(), label: (a.label || '').trim() })), videos: M.videos.map(v => ({ kind: v.kind, url: v.url.trim(), title: (v.title || '').trim() })), gallery: M.gallery.map(g => ({ path: g.path, caption: (g.caption || '').trim() })) };
          const { data: up, error } = await sb.from('series').update({ media: mediaV }).eq('id', s.id).select('id'); if (error) throw new Error(/media/.test(error.message || '') ? 'Falta ejecutar el SQL 20261112_anime_galeria.sql' : errMsg(error)); if (!up?.length) throw new Error('No se guardó (permiso de la tabla «series»)');
          mDirty = false; toast('Anime y galería guardados'); draw(); })); };
      sb.from('series').select('media').eq('id', s.id).maybeSingle().then(({ data, error }) => { const m = data?.media || {}; ['anime', 'videos', 'gallery'].forEach(k => { M[k] = Array.isArray(m[k]) ? [...m[k]] : []; }); loaded = true; draw(); if (error && /media/.test(error.message || '')) toast('Falta ejecutar el SQL 20261112_anime_galeria.sql'); });
      const leaveM = e => { if (mDirty && document.body.contains($('#m-save'))) { e.preventDefault(); e.returnValue = ''; } else removeEventListener('beforeunload', leaveM); }; addEventListener('beforeunload', leaveM);
    }
    if (tab === 'avisos') {
      // ---- aviso en actualizaciones (se guarda aparte, en series.theme.update_tag)
      let utDirty = false; const UT = Object.assign({ on: false, text: '', color: wcolor(s), style: 'solid', until: '', season: false }, s.theme?.update_tag || {});
      const UT_PRE = ['Nuevo volumen', 'Nuevo nivel', 'Capítulo extra', 'Volumen completo', 'Final', 'De regreso'], UT_COL = ['#f2c230', '#d9922b', '#f59e7a', '#c9a8f2', '#8cc3f2', '#a9d18e', wcolor(s)];
      const drawUT = () => { const box = $('#wk-utag-b'); if (!box) return; const ed = can('edit') ? '' : 'disabled';
        const pv = utagOn({ ...UT, on: true }) ? utagHTML(UT) : '<span class="mono" style="font-size:11px;margin-left:8px">(escribe un texto)</span>';
        box.innerHTML = `<div style="display:grid;gap:10px;margin-top:8px">
          <label class="tb-inl"><input type="checkbox" id="ut-on" ${UT.on ? 'checked' : ''} ${ed}> Mostrar el aviso</label>
          <label>Texto<input id="ut-t" maxlength="24" value="${esc(UT.text)}" placeholder="Nuevo volumen" ${ed}></label>
          <div class="ed-chips">${UT_PRE.map(p => `<button type="button" class="ed-chip ${UT.text === p ? 'on' : ''}" data-utp="${esc(p)}" ${ed}>${esc(p)}</button>`).join('')}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="mono" style="font-size:12px">Color</span>${[...new Set(UT_COL)].map(c => `<button type="button" data-utc="${c}" aria-label="Color ${c}" aria-pressed="${UT.color === c}" style="width:26px;height:26px;background:${c};border:2px solid ${UT.color === c ? '#f3ecd9' : 'transparent'};outline:1px solid #3d3628;cursor:pointer" ${ed}></button>`).join('')}<input type="color" id="ut-c" value="${esc(UT.color)}" aria-label="Otro color" style="width:34px;height:28px;padding:0;border:1px solid #3d3628;background:none" ${ed}></div>
          <div style="display:flex;gap:14px;flex-wrap:wrap"><label class="tb-inl"><input type="radio" name="ut-s" value="solid" ${UT.style !== 'outline' ? 'checked' : ''} ${ed}> Sólido</label><label class="tb-inl"><input type="radio" name="ut-s" value="outline" ${UT.style === 'outline' ? 'checked' : ''} ${ed}> Contorno</label></div>
          <label class="tb-inl"><input type="checkbox" id="ut-sea" ${UT.season ? 'checked' : ''} ${ed}> Adaptar el color al tema de temporada<small class="mono" style="display:block">Mientras haya una temporada activa (Otoño, Navidad…) el aviso toma su color; fuera de temporada usa el color elegido.</small></label>
          <label>Mostrar hasta<input type="date" id="ut-u" value="${esc(UT.until || '')}" style="width:auto" ${ed}><small class="mono">Vacío = hasta que lo quites. Después de esa fecha se oculta solo.</small></label>
          ${can('edit') ? '<span style="display:flex;gap:8px;align-items:center"><button type="button" class="btn sm" id="ut-save">Guardar aviso</button><span class="mono" id="ut-st"></span></span>' : ''}</div>`;
        const pvb = $('#wk-utag-pv'); if (pvb) { const ttl = esc(s.title), cov = s.cover_path ? `background:url('${esc(media(s.cover_path))}') center/cover` : 'background:#2f2a20';
          pvb.innerHTML = `<div style="display:grid;gap:14px"><div><span class="mono" style="font-size:11px">INICIO · ÚLTIMAS ACTUALIZACIONES</span>
            <div style="margin-top:6px;padding:10px 12px;background:#0d0c0a;border:1px solid #2f2a20;display:flex;align-items:center;gap:10px"><i style="width:4px;align-self:stretch;background:${esc(wcolor(s))}"></i><span style="flex:1;min-width:0"><b>${ttl}</b>${pv}<br><span class="mono" style="font-size:12px">Cap. 12 — Ejemplo</span></span><span class="mono" style="font-size:12px">hace 2 h</span></div></div>
            <div><span class="mono" style="font-size:11px">LANZAMIENTOS</span>
            <div style="margin-top:6px;padding:12px;background:#0d0c0a;border:1px solid #2f2a20;display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:start"><span style="width:56px;height:80px;${cov}"></span><span><b style="font-size:16px">${ttl}</b>${pv}<br><span class="mono" style="font-size:12px">Novela ligera · ${esc(T.team?.name || '')}</span></span></div></div>
            ${UT.on ? '' : '<p class="mono" style="font-size:12px;margin:0">El aviso está apagado: actívalo con «Mostrar el aviso» y guarda.</p>'}</div>`; }
        const dirtyUT = () => { utDirty = true; const e = $('#ut-st'); if (e) e.textContent = 'Cambios sin guardar'; }; if (utDirty) { const e = $('#ut-st'); if (e) e.textContent = 'Cambios sin guardar'; }
        $('#ut-on')?.addEventListener('change', e => { UT.on = e.target.checked; drawUT(); dirtyUT(); });
        $('#ut-t')?.addEventListener('input', e => { UT.text = e.target.value; const t = $('#wk-utag-pv'); if (t) t.querySelectorAll('.ob-utag').forEach(x => x.textContent = e.target.value.trim().slice(0, 24)); dirtyUT(); });
        $('#ut-t')?.addEventListener('change', () => { drawUT(); dirtyUT(); });
        box.querySelectorAll('[data-utp]').forEach(b => b.onclick = () => { UT.text = b.dataset.utp; UT.on = true; drawUT(); dirtyUT(); });
        box.querySelectorAll('[data-utc]').forEach(b => b.onclick = () => { UT.color = b.dataset.utc; drawUT(); dirtyUT(); });
        $('#ut-c')?.addEventListener('change', e => { UT.color = e.target.value; drawUT(); dirtyUT(); });
        box.querySelectorAll('[name=ut-s]').forEach(r => r.onchange = () => { UT.style = r.value; drawUT(); dirtyUT(); });
        $('#ut-u')?.addEventListener('change', e => { UT.until = e.target.value; dirtyUT(); });
        $('#ut-sea')?.addEventListener('change', e => { UT.season = e.target.checked; drawUT(); dirtyUT(); });
        $('#ut-save')?.addEventListener('click', e => busy(e.currentTarget, async () => {
          if (UT.on && !UT.text.trim()) throw new Error('Escribe el texto del aviso');
          const { data: cur, error: e1 } = await sb.from('series').select('theme').eq('id', s.id).single(); if (e1) throw new Error(errMsg(e1));
          const theme = { ...(cur?.theme || {}), update_tag: { on: !!UT.on, text: UT.text.trim().slice(0, 24), color: UT.color, style: UT.style === 'outline' ? 'outline' : 'solid', until: UT.until || null, season: !!UT.season } };
          const { data: upd, error } = await sb.from('series').update({ theme }).eq('id', s.id).select('id,theme'); if (error) throw new Error(errMsg(error));
          if (!upd?.length || JSON.stringify(upd[0].theme?.update_tag) !== JSON.stringify(theme.update_tag)) throw new Error('La base de datos no guardó el aviso (permiso o regla de la tabla «series»). Revisa con diagnostico_avisos.sql.');
          s.theme = theme; utDirty = false; const st3 = $('#ut-st'); if (st3) st3.textContent = '✓ Guardado'; toast(UT.on ? 'Aviso «' + UT.text.trim() + '» activo en actualizaciones' : 'Aviso oculto'); })); };
      drawUT();
      const leaveUT = e => { if (utDirty && document.body.contains($('#ut-save'))) { e.preventDefault(); e.returnValue = ''; } else removeEventListener('beforeunload', leaveUT); }; addEventListener('beforeunload', leaveUT);
    }
    if (tab === 'datos') {
      { const ed = can('edit'), B = () => $('#wk-lock-b'); let tiers = [], SA = null, CH = [], VOL = {}, dirtyC = new Map(), conn = false;
        const enc = (a, m) => a === 'tier' ? 'tier:' + (+m).toFixed(2) : a || 'public', dec = v => v.startsWith('tier:') ? ['tier', +v.slice(5)] : [v, null];
        const opts = (cur) => [['public', 'Público'], ['donors', 'Todos los mecenas'], ...tiers.map(t => ['tier:' + (+t.price_usd).toFixed(2), 'Desde «' + t.name + '» · US$' + (+t.price_usd).toFixed(2)])].map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
        const day = d => d ? new Date(d).toISOString().slice(0, 10) : '', dis = ed ? '' : 'disabled';
        const vLock = c => { const v = VOL[c.volume_id]; return v && v.access && v.access !== 'public' && !(v.access_until && new Date(v.access_until) <= new Date()) ? v : null; }, isL = c => c.access !== 'public' || !!vLock(c);
        const drawL = () => { const b = B(); if (!b) return; const byV = {}; CH.forEach(c => (byV[c.volume_id || '_'] ||= []).push(c));
          b.innerHTML = `<div style="display:grid;gap:14px;margin-top:10px">
            ${conn ? '' : '<p class="mono" style="margin:0;padding:10px;border:1px solid #f59e7a;color:#f59e7a;font-size:12px">Tu equipo aún no conecta Patreon (Estudio › Página del equipo). Puedes configurar los bloqueos, pero nadie podrá desbloquearlos como mecenas hasta conectarlo.</p>'}
            <div style="display:grid;gap:8px;padding:12px;border:1px solid #2f2a20;background:#16140f"><b>Obra completa</b>
              <span style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select id="lk-s" ${dis} style="flex:1 1 240px">${opts(enc(SA.access, SA.access_min_price))}</select>
              <label class="mono" style="display:flex;gap:6px;align-items:center;font-size:12px">Abrir para todos el <input type="date" id="lk-su" value="${day(SA.access_until)}" ${dis}></label></span></div>
            <details ${CH.some(isL) ? 'open' : ''}><summary style="cursor:pointer;font-weight:600">Capítulos (${CH.filter(isL).length} bloqueados de ${CH.length})</summary>
              <div style="display:grid;gap:12px;margin-top:10px">${Object.entries(byV).sort((x, y) => (VOL[y[0]]?.num ?? -1) - (VOL[x[0]]?.num ?? -1)).map(([vid, L]) => `<div style="display:grid;gap:4px"><span class="mono" style="font-size:12px;letter-spacing:.1em">${vid === '_' ? 'SIN VOLUMEN' : 'VOLUMEN ' + esc(String(VOL[vid]?.num ?? '')) + (VOL[vid]?.access && VOL[vid].access !== 'public' ? ' · 🔒︎ volumen bloqueado' + (VOL[vid].access_until ? ' hasta el ' + new Date(VOL[vid].access_until).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ' · sin fecha de apertura') : '')}</span>
                ${L.map(c => { const d = dirtyC.get(c.id) || c; return `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,220px) auto;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid #221f18"><span style="min-width:0;overflow-wrap:anywhere;font-size:14px"><span class="mono" style="font-size:12px">${c.num}</span> ${esc(c.title || '')}</span><select data-lc="${c.id}" ${dis}>${opts(enc(d.access, d.access_min_price))}</select><input type="date" data-lu="${c.id}" value="${day(d.access_until)}" title="Abrir para todos el…" ${dis} ${d.access === 'public' ? 'hidden' : ''}>${d.access === 'public' && vLock(c) ? '<span class="mono" style="grid-column:1/-1;font-size:11px;color:#f96854">🔒︎ Bloqueado por el volumen</span>' : ''}</div>`; }).join('')}</div>`).join('') || '<p class="mono">Sin capítulos.</p>'}</div></details>
            ${ed ? `<span style="display:flex;gap:8px;align-items:center"><button type="button" class="btn sm" id="lk-save">Guardar bloqueos</button><span class="mono" style="font-size:12px" id="lk-st"></span></span>` : ''}</div>`;
          const mark = () => { const t = $('#lk-st'); if (t) t.textContent = 'Cambios sin guardar'; };
          $('#lk-s')?.addEventListener('change', e => { const [a, m] = dec(e.target.value); SA.access = a; SA.access_min_price = m; mark(); });
          $('#lk-su')?.addEventListener('change', e => { SA.access_until = e.target.value ? e.target.value + 'T00:00:00' : null; mark(); });
          b.querySelectorAll('[data-lc]').forEach(x => x.onchange = () => { const c = CH.find(y => y.id === x.dataset.lc), d = { ...(dirtyC.get(c.id) || c) }; [d.access, d.access_min_price] = dec(x.value); if (d.access === 'public') d.access_until = null; dirtyC.set(c.id, d); drawL(); mark(); });
          b.querySelectorAll('[data-lu]').forEach(x => x.onchange = () => { const c = CH.find(y => y.id === x.dataset.lu), d = { ...(dirtyC.get(c.id) || c) }; d.access_until = x.value ? x.value + 'T00:00:00' : null; dirtyC.set(c.id, d); mark(); });
          $('#lk-save')?.addEventListener('click', e => busy(e.currentTarget, async () => {
            const tz = v => v ? new Date(v).toISOString() : null;
            const { error } = await sb.from('series').update({ access: SA.access, access_min_price: SA.access === 'tier' ? SA.access_min_price : null, access_until: SA.access === 'public' ? null : tz(SA.access_until) }).eq('id', s.id);
            if (error) throw new Error(/access/.test(error.message) ? 'Falta ejecutar el SQL 20261113_patreon.sql' : errMsg(error));
            for (const [id, d] of dirtyC) { const { error: e2 } = await sb.from('chapters').update({ access: d.access, access_min_price: d.access === 'tier' ? d.access_min_price : null, access_until: d.access === 'public' ? null : tz(d.access_until) }).eq('id', id); if (e2) throw new Error(errMsg(e2)); Object.assign(CH.find(c => c.id === id), d); }
            dirtyC.clear(); toast('Bloqueos guardados'); drawL(); })); };
        Promise.all([sb.from('series').select('access,access_min_price,access_until').eq('id', s.id).single(), sb.from('chapters').select('id,num,title,volume_id,access,access_min_price,access_until').eq('series_id', s.id).is('deleted_at', null).order('num'),
          sb.from('volumes').select('id,num,access,access_min_price,access_until').eq('series_id', s.id).is('deleted_at', null), sb.from('patreon_tiers').select('name,price_usd').eq('team_id', T.team.id).order('price_usd'), sb.from('patreon_public').select('owner').eq('owner', T.team.id).maybeSingle()])
          .then(([a1, a2, a3, a4, a5]) => { if (a1.error) { const b = B(); if (b) b.innerHTML = `<p class="mono">${/access/.test(a1.error.message) ? 'Falta ejecutar el SQL 20261113_patreon.sql' : esc(a1.error.message)}</p>`; return; }
            SA = a1.data; CH = a2.data || []; VOL = Object.fromEntries((a3.data || []).map(v => [v.id, v])); tiers = a4.data || []; conn = !!a5.data; drawL(); }); }
      { const KINDS = [['precuela','Precuela'],['secuela','Secuela'],['spinoff','Spin-off'],['universo','Mismo universo'],['paralela','Historia paralela'],['adaptacion','Adaptación'],['alterna','Versión alternativa'],['otra','Relacionada']], RL = [...(Array.isArray(s.relations) ? s.relations : [])]; let all = [], relDirty = false;
        const drawRel = () => { const b = $('#wk-rel-b'); if (!b) return; const by = Object.fromEntries(all.map(x => [x.id, x])), ed = can('edit');
          b.innerHTML = `<div style="display:grid;gap:8px;margin-top:8px">${RL.map((r, i) => { const x = by[r.id]; return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #2f2a20;background:#16140f"><span><b>${esc(x?.title || 'Obra no disponible')}</b><br><small class="mono">${esc(x?.teams?.name || '')}</small></span><span style="display:flex;gap:6px;align-items:center"><select data-rk="${i}" ${ed ? '' : 'disabled'} aria-label="Relación">${KINDS.map(([k, l]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${ed ? `<button type="button" class="lnk danger" data-rx="${i}">Quitar</button>` : ''}</span></div>`; }).join('') || '<p class="mono" style="margin:0">Sin obras relacionadas.</p>'}
            ${ed && RL.length < 12 ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="rel-w" style="flex:1 1 220px"><option value="">Elige una obra…</option>${all.filter(x => x.id !== s.id && !RL.some(r => r.id === x.id)).map(x => `<option value="${x.id}">${esc(x.title)}${x.teams?.name ? ' · ' + esc(x.teams.name) : ''}</option>`).join('')}</select><select id="rel-k">${KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button type="button" class="btn ghost sm" id="rel-add">Agregar</button></div>` : ''}
            ${ed ? `<span style="display:flex;gap:8px;align-items:center"><button type="button" class="btn sm" id="rel-save" ${relDirty ? '' : 'disabled'}>Guardar relaciones</button><span class="mono" style="font-size:12px">${relDirty ? 'Cambios sin guardar' : ''}</span></span>` : ''}</div>`;
          b.querySelectorAll('[data-rk]').forEach(x => x.onchange = () => { RL[+x.dataset.rk].kind = x.value; relDirty = true; drawRel(); });
          b.querySelectorAll('[data-rx]').forEach(x => x.onclick = () => { RL.splice(+x.dataset.rx, 1); relDirty = true; drawRel(); });
          $('#rel-add')?.addEventListener('click', () => { const id = $('#rel-w').value; if (!id) return toast('Elige una obra'); RL.push({ id, kind: $('#rel-k').value }); relDirty = true; drawRel(); });
          $('#rel-save')?.addEventListener('click', e => busy(e.currentTarget, async () => {
            const { data: up, error } = await sb.from('series').update({ relations: RL }).eq('id', s.id).select('id'); if (error) throw new Error(/relations/.test(error.message || '') ? 'Falta ejecutar el SQL 20261111_obras_relacionadas.sql' : errMsg(error));
            if (!up?.length) throw new Error('No se guardó (permiso de la tabla «series»)'); s.relations = [...RL]; relDirty = false; toast('Relaciones guardadas'); drawRel(); })); };
        sb.from('series').select('id,title,teams(name)').or('published.eq.true,team_id.eq.' + T.team.id).is('archived_at', null).order('title').then(({ data }) => { all = data || []; drawRel(); });
        // otras obras que ya enlazan a esta: aparecen solas en la ficha pública (con el sentido invertido)
        sb.from('series').select('id,title,relations,teams(name)').filter('relations', 'cs', JSON.stringify([{ id: s.id }])).then(({ data }) => { const l = (data || []).filter(x => x.id !== s.id && !RL.some(r => r.id === x.id)); if (!l.length) return; const INV = { precuela: 'Secuela', secuela: 'Precuela', adaptacion: 'Obra original' }, KL = Object.fromEntries(KINDS);
          $('#wk-rel-b')?.insertAdjacentHTML('afterend', `<div style="display:grid;gap:6px;margin-top:12px"><span class="mono" style="font-size:11px">Enlazada desde otras obras · se muestran solas en la ficha pública</span>${l.map(x => { const k = (x.relations || []).find(r => r?.id === s.id)?.kind; return `<div style="display:flex;justify-content:space-between;gap:8px;padding:8px;border:1px dashed #2f2a20"><span><b>${esc(x.title)}</b><br><small class="mono">${esc(x.teams?.name || '')}</small></span><span class="mono" style="font-size:12px">${esc(INV[k] || KL[k] || 'Relacionada')}</span></div>`; }).join('')}</div>`); }); }
      let dirty = false; const mark = () => { dirty = true; const d = $('#wk-dirty'); if (d) d.textContent = 'Cambios sin guardar'; };
      app.querySelectorAll('[data-d]').forEach(i => i[i.type === 'checkbox' || i.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => { D[i.dataset.d] = i.type === 'checkbox' ? i.checked : i.value; if (i.dataset.d === 'synopsis') $('#syncount').textContent = i.value.length + ' / 1500'; if (i.dataset.d === 'demographic') $('#wk-dem-desc').textContent = (WORK_DEMOGRAPHICS.find(x => x[0] === i.value) || WORK_DEMOGRAPHICS[0])[2]; mark(); });
      $('#wk-gen-search').oninput = e => { const q = e.target.value.toLocaleLowerCase('es'); $('#wk-gen').querySelectorAll('[data-gen]').forEach(b => b.hidden = !!q && !b.dataset.gen.toLocaleLowerCase('es').includes(q) && !b.classList.contains('on')); };
      $('#wk-gen').onclick = e => { const b = e.target.closest('[data-gen]'); if (!b) return; const g = b.dataset.gen, has = D.genres.includes(g); if (!has && D.genres.length >= 4) return toast('Máximo 4 géneros'); D.genres = has ? D.genres.filter(x => x !== g) : [...D.genres, g]; b.classList.toggle('on', !has); b.setAttribute('aria-pressed', !has); mark(); };
      const drawTags = () => { const box = $('#wk-tags'), inpT = $('#wk-tag'); box.querySelectorAll('span').forEach(x => x.remove()); inpT.insertAdjacentHTML('beforebegin', D.tags.map((t, i) => `<span>#${esc(t)}<button type="button" data-untag="${i}" aria-label="Quitar ${esc(t)}">×</button></span>`).join('')); };
      $('#wk-tags').onclick = e => { const b = e.target.closest('[data-untag]'); if (b) { D.tags.splice(+b.dataset.untag, 1); drawTags(); mark(); } else $('#wk-tag').focus(); };
      $('#wk-tag').onkeydown = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = e.target.value.trim().replace(/^#/, '').toLowerCase(); if (v && !D.tags.includes(v)) { if (D.tags.length >= 20) return toast('Máximo 20 etiquetas'); D.tags.push(v); drawTags(); mark(); } e.target.value = ''; } };
      on('#wk-savebtn', async () => {
        if (!D.title.trim()) throw new Error('El título no puede quedar vacío');
        const patch = { title: D.title.trim(), short: D.short.trim() || D.title.trim().slice(0, 26), original: D.original.trim() || null, title_romaji: D.title_romaji.trim() || null, publisher: D.publisher.trim() || null, author: D.author.trim() || null, illustrator: D.illustrator.trim() || null, work_type: D.work_type, demographic: D.demographic || null, translation_status: D.translation_status, original_status: D.original_status || null, synopsis: D.synopsis.trim() || null, adult: D.adult, genres: D.genres, tags: D.tags };
        const { error } = await sb.from('series').update(patch).eq('id', s.id); if (error) throw new Error(errMsg(error)); dirty = false; toast('Datos de la obra guardados'); again(); });
      const leave = e => { if (dirty && document.body.contains($('#wk-savebtn'))) { e.preventDefault(); e.returnValue = ''; } else removeEventListener('beforeunload', leave); }; addEventListener('beforeunload', leave);
    }
    on('#invite', async () => { const alias = $('#inv').value.trim().replace(/^@/, '').toLowerCase(); const { data: t } = await sb.from('teams').select('id,name').eq('slug', alias).maybeSingle(); if (!t) throw new Error('No existe un equipo con ese alias'); if (t.id === T.team.id) throw new Error('Es tu propio equipo'); const { error } = await sb.from('collaborations').insert({ series_id: s.id, inviter_team: T.team.id, invited_team: t.id, status: 'pending' }); if (error) throw error; toast('Invitación enviada a ' + t.name); again(); });
    on('[data-revoke]', async b => { const { error } = await sb.from('collaborations').update({ status: 'revoked' }).eq('id', b.dataset.revoke); if (error) throw error; again(); });
  }

  // borrar con limpieza de multimedia referenciada
  async function deleteChapters(ids, extra = []){
    let paths = extra.filter(Boolean);
    if (ids.length) {
      const { data } = await sb.from('chapters').select('body').in('id', ids);
      (data || []).forEach(c => (c.body || []).forEach(b => { const p = pathOf(b.url || b.src); if (p) paths.push(p); }));
      const { error } = await sb.from('chapters').delete().in('id', ids); if (error) throw error;
    }
    paths = [...new Set(paths)]; if (!paths.length) return 0;
    const { data: used } = await sb.rpc('media_in_use', { p_team: T.team.id, p_paths: paths });
    const free = paths.filter(p => !(used || []).includes(p) && p.startsWith(T.team.id + '/'));
    if (free.length) await sb.storage.from('obi-media').remove(free);
    if (free.length) toast(`${free.length} archivos sin uso eliminados`);
    return free.length;
  }

  // ---------- editor de capítulo, importación dinámica ----------
  async function names(ids){ ids = [...new Set(ids.filter(Boolean))]; if (!ids.length) return {}; const { data } = await sb.from('profiles').select('id,username').in('id', ids); return Object.fromEntries((data || []).map(p => [p.id, p.username])); }
  let editorTask = null;
  async function editor(id){
    if (!editorTask) editorTask = import('./studio-editor.js?v=1')
      .then(m => m.createEditor({ sb, app, $, esc, toast, go, getUser, getMe, url, PUB, media, pathOf, T, can, ensure, fmtTz, fromLocal, toLocal, tzHint, busy, shell, bindPicker, names, home, errMsg, rpc, LIMITS, SEC }))
      .catch(e => { editorTask = null; throw e; });
    return (await editorTask)(id);
  }

  // ---------- EPUB/DOCX/PDF, importación dinámica ----------
  let importerTask = null;
  async function importer(){
    if (!importerTask) importerTask = import('./studio-importer.js?v=1')
      .then(m => m.createImporter({ sb, app, $, esc, toast, go, getUser, getMe, url, PUB, media, pathOf, T, can, ensure, fmtTz, fromLocal, toLocal, tzHint, busy, shell, bindPicker, LIMITS, SEC }))
      .catch(e => { importerTask = null; throw e; });
    return (await importerTask)();
  }

  // ---------- multimedia (módulo diferido) ----------
  let libraryTask = null;
  async function library(folder = '', page = 0){
    if (!libraryTask) libraryTask = import('./studio-media.js?v=1')
      .then(m => m.createLibrary({ sb, app, $, esc, toast, go, getUser, getMe, url, PUB, media, pathOf, T, can, ensure, fmtTz, fromLocal, toLocal, tzHint, busy, shell, bindPicker, errMsg, LIMITS }))
      .catch(e => { libraryTask = null; throw e; });
    return (await libraryTask)(folder, page);
  }

  // ---------- glosario ----------
  async function glossary(slug){
    if (!(await ensure())) return;
    const TAB = '/estudio/glosario';
    const { data: works } = await sb.from('series').select('id,slug,title').eq('team_id', T.team.id).is('archived_at', null).order('title');
    if (!(works || []).length) { app.innerHTML = shell('Glosario', '<p class="mono">Este equipo aún no tiene obras.</p>', TAB); bindPicker(() => glossary()); return; }
    const s = works.find(w => w.slug === slug) || works.find(w => w.slug === localStorage.getItem('obi-gl-series')) || works[0];
    localStorage.setItem('obi-gl-series', s.slug);
    const { data, error } = await sb.from('glossary_terms').select('id,term,category,definition').eq('series_id', s.id).order('term');
    if (error) { app.innerHTML = shell('Glosario', `<p>No se pudo cargar el glosario: ${esc(error.message)}</p>`, TAB); return; }
    let terms = data || [], editing = null;
    const ed = can('edit'), opt = v => GT.map(t => `<option ${t === v ? 'selected' : ''}>${t}</option>`).join('');
    app.innerHTML = shell('Glosario', `
      <div class="st-row"><select id="glser" aria-label="Obra del glosario">${works.map(w => `<option value="${w.slug}" ${w.id === s.id ? 'selected' : ''}>${esc(w.title)}</option>`).join('')}</select><span class="mono" id="glcount"></span></div>
      <p class="mono">Los términos se marcan solos en el lector. Al tocarlos, el lector ve la definición sin salir del capítulo.</p>
      ${ed ? `<div class="st-card gl-form">
        <div class="st-row"><input id="glterm" aria-label="Término" maxlength="60" placeholder="Término tal como aparece en el texto"><select id="glcat" aria-label="Categoría del término">${opt('Personaje')}</select></div>
        <textarea id="gldef" aria-label="Definición del término" maxlength="600" rows="3" placeholder="Definición que verá el lector"></textarea>
        <div class="st-row"><button class="btn" id="glsave">Añadir término</button><button class="btn ghost" id="glcancel" hidden>Cancelar</button></div>
        <details><summary class="mono">Añadir varios a la vez</summary><p class="mono">Uno por línea: término | tipo | definición</p><textarea id="glbulk" aria-label="Lista de términos para importar" rows="5" placeholder="umeboshi | Comida | Ciruela encurtida en sal, muy ácida."></textarea><button class="btn ghost" id="glbulkbtn">Añadir lista</button></details>
      </div>` : '<p class="mono">Tu rol solo puede ver el glosario.</p>'}
      <div class="st-row"><input id="glq" aria-label="Buscar término o definición" placeholder="Buscar término o definición"><select id="glf" aria-label="Filtrar por tipo de término"><option value="">Todos los tipos</option>${GT.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div id="gllist"></div>`, TAB);
    bindPicker(() => glossary());
    $('#glser').onchange = e => go(TAB + '/' + e.target.value);
    const draw = () => {
      const q = ($('#glq').value || '').trim().toLowerCase(), f = $('#glf').value;
      const list = terms.filter(t => (!f || t.category === f) && (!q || (t.term + ' ' + t.definition).toLowerCase().includes(q)));
      $('#glcount').textContent = terms.length + (terms.length === 1 ? ' término' : ' términos');
      $('#gllist').innerHTML = list.map(t => `<div class="st-card gl-row"><div><strong>${esc(t.term)}</strong> <span class="pill">${esc(t.category)}</span><p>${esc(t.definition)}</p></div>${ed ? `<span><button class="lnk" data-gled="${t.id}">Editar</button> <button class="lnk danger" data-gldel="${t.id}">Borrar</button></span>` : ''}</div>`).join('') || `<p class="mono">${terms.length ? 'Sin resultados.' : 'Aún no hay términos en esta obra.'}</p>`;
    };
    const reset = () => { editing = null; $('#glterm').value = ''; $('#gldef').value = ''; $('#glsave').textContent = 'Añadir término'; $('#glcancel').hidden = true; };
    const check = (term, def) => { if (!term) throw new Error('Escribe el término'); if (!def) throw new Error('Escribe la definición'); if (term.length > 60) throw new Error('El término es demasiado largo (máx. 60)'); if (def.length > 600) throw new Error('La definición es demasiado larga (máx. 600)'); if (terms.some(t => t.id !== editing && t.term.toLowerCase() === term.toLowerCase())) throw new Error('«' + term + '» ya está en el glosario de esta obra'); };
    const dupe = e => { if (e?.code === '23505') throw new Error('Ese término ya existe en esta obra'); if (e) throw e; };
    $('#glq').oninput = draw; $('#glf').onchange = draw; draw();
    if (!ed) return;
    $('#glsave').onclick = () => busy($('#glsave'), async () => {
      const term = $('#glterm').value.trim(), category = $('#glcat').value, definition = $('#gldef').value.trim(); check(term, definition);
      if (editing) { const { data: r, error } = await sb.from('glossary_terms').update({ term, category, definition, updated_at: new Date().toISOString() }).eq('id', editing).select('id,term,category,definition').single(); dupe(error); terms = terms.map(t => t.id === editing ? r : t); toast('Término actualizado'); }
      else { const { data: r, error } = await sb.from('glossary_terms').insert({ series_id: s.id, term, category, definition }).select('id,term,category,definition').single(); dupe(error); terms.push(r); toast('«' + term + '» añadido'); }
      terms.sort((a, b) => a.term.localeCompare(b.term, 'es')); reset(); draw();
    });
    $('#glcancel').onclick = reset;
    $('#glbulkbtn').onclick = () => busy($('#glbulkbtn'), async () => {
      const rows = $('#glbulk').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r[0]);
      if (!rows.length) throw new Error('Pega al menos una línea');
      const have = new Set(terms.map(t => t.term.toLowerCase())), add = [], bad = [];
      rows.forEach((r, i) => { const [term, cat, ...rest] = r, definition = rest.join(' | '); const category = GT.find(g => g.toLowerCase() === (cat || '').toLowerCase()) || 'Otro';
        if (!definition || term.length > 60 || definition.length > 600 || have.has(term.toLowerCase())) bad.push(i + 1); else { have.add(term.toLowerCase()); add.push({ series_id: s.id, term, category, definition }); } });
      if (!add.length) throw new Error('Ninguna línea válida. Revisa las líneas ' + bad.join(', '));
      const { data: r, error } = await sb.from('glossary_terms').insert(add).select('id,term,category,definition'); dupe(error);
      terms = [...terms, ...r].sort((a, b) => a.term.localeCompare(b.term, 'es')); $('#glbulk').value = '';
      toast(r.length + ' términos añadidos' + (bad.length ? ' · se omitieron las líneas ' + bad.join(', ') + ' (repetidas o incompletas)' : '')); draw();
    });
    $('#gllist').onclick = e => {
      const eb = e.target.closest('[data-gled]'), db = e.target.closest('[data-gldel]');
      if (eb) { const t = terms.find(x => x.id === eb.dataset.gled); editing = t.id; $('#glterm').value = t.term; $('#glcat').innerHTML = opt(t.category); $('#gldef').value = t.definition; $('#glsave').textContent = 'Guardar cambios'; $('#glcancel').hidden = false; $('#glterm').focus(); scrollTo(0, 0); }
      if (db) busy(db, async () => { const t = terms.find(x => x.id === db.dataset.gldel); if (!confirm('¿Borrar «' + t.term + '» del glosario?')) return; const { error } = await sb.from('glossary_terms').delete().eq('id', t.id); if (error) throw error; terms = terms.filter(x => x.id !== t.id); if (editing === t.id) reset(); toast('Término borrado'); draw(); });
    };
  }

  // ---------- equipo: integrantes, roles a medida, tablero, bitácora y página del equipo ----------
  const PERMS = [['view','Ver el Estudio','Siempre activo'],['edit','Editar texto','Editor, títulos y ajustes del capítulo'],['create','Crear','Obras, volúmenes y capítulos'],['import','Importar','EPUB, DOCX y PDF'],['publish','Publicar y retirar','Incluye publicar ahora'],['schedule','Programar','Fechas de lanzamiento'],['delete','Borrar','Capítulos, volúmenes y archivos'],['review','Aprobar revisiones','Cuando el equipo exige aprobación'],['board','Mover tarjetas','Tablero de trabajo y asignaciones'],['members','Gestionar integrantes y roles','Solo lo concede el propietario'],['profile','Editar la página del equipo','Nombre, logo, colores y enlaces'],['log','Ver la bitácora','Historial de acciones del equipo']];
  const SWATCH = ['#f2c230','#d9922b','#f59e7a','#c9a8f2','#8cc3f2','#a9d18e','#a89f8a'];
  const ini = s => (s || '?').replace(/^@/, '').slice(0, 2).toUpperCase();
  const fmtAt = d => fmtTz(d, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const errMsg = e => e?.hint || ({ forbidden: 'No tienes permiso para esta acción', duplicate: 'Ya existe', not_found: 'No se encontró' })[e?.message] || e?.message || 'Error';
  const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(errMsg(error)); return data; };
  async function teamMembers(){
    const [{ data: mem }, { data: roles }] = await Promise.all([
      sb.from('team_members').select('user_id,role,role_id,overrides,profiles(username,avatar_url)').eq('team_id', T.team.id),
      sb.from('team_roles').select('id,name,color,description,perms,base,sort').eq('team_id', T.team.id).order('sort')]);
    return { mem: (mem || []).sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0) || (a.profiles?.username || '').localeCompare(b.profiles?.username || '')), roles: roles || [] };
  }

  async function team(){
    if (!(await ensure())) return;
    const { mem, roles } = await teamMembers();
    const manage = can('members'), owner = !!T.perms.owner, me = getUser()?.id;
    const rById = Object.fromEntries(roles.map(r => [r.id, r]));
    const gated = r => r?.perms?.members && !owner;
    const open = team.open || null, editing = team.editing ?? null;
    const memberRow = m => {
      const isOwner = m.role === 'owner', r = rById[m.role_id], name = m.profiles?.username || m.user_id.slice(0, 8), self = m.user_id === me;
      const lockSelf = self && !owner, editable = manage && !isOwner && !lockSelf && !gated(r);
      const ov = m.overrides || {}, nov = Object.keys(ov).length;
      return `<div class="tm-row"><span class="tm-av" style="background:${isOwner ? T.team.color || '#f2c230' : r?.color || '#a89f8a'}">${m.profiles?.avatar_url ? `<img src="${esc(m.profiles.avatar_url)}" alt="">` : esc(ini(name))}</span>
        <span class="tm-n"><b>${esc(name)}${self ? ' <small>(tú)</small>' : ''}</b><small>${isOwner ? 'Acceso completo · no se puede modificar' : nov ? nov + (nov === 1 ? ' excepción' : ' excepciones') + ' sobre su rol' : 'Permisos de su rol'}</small></span>
        <span>${editable ? `<select data-mrole="${m.user_id}" aria-label="Rol de ${esc(name)}">${roles.map(x => `<option value="${x.id}" ${x.id === m.role_id ? 'selected' : ''} ${gated(x) ? 'disabled' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<b style="color:${isOwner ? T.team.color || '#f2c230' : r?.color || '#a89f8a'}">${isOwner ? 'Propietario' : esc(r?.name || ROLE_L[m.role] || 'Sin rol')}</b>`}</span>
        <span class="tm-a">${editable ? `<button class="lnk" data-mx="${m.user_id}" aria-expanded="${open === m.user_id}">Excepciones</button><button class="lnk danger" data-mrm="${m.user_id}">Retirar</button>` : self && !isOwner ? '<button class="lnk danger" data-leave="1">Salir del equipo</button>' : ''}</span>
        ${open === m.user_id && editable ? `<div class="tm-ov"><p class="mono">Cada permiso puede seguir al rol, permitirse o negarse solo para esta persona.</p>${PERMS.filter(([k]) => k !== 'view').map(([k, l]) => { const v = ov[k], base = !!r?.perms?.[k], st = v === true ? 'allow' : v === false ? 'deny' : 'inherit'; const dis = k === 'members' && !owner; return `<label class="tm-p"><span>${l}</span><select data-ov="${k}" data-u="${m.user_id}" ${dis ? 'disabled' : ''}><option value="inherit" ${st === 'inherit' ? 'selected' : ''}>Según el rol (${base ? 'sí' : 'no'})</option><option value="allow" ${st === 'allow' ? 'selected' : ''}>Permitir</option><option value="deny" ${st === 'deny' ? 'selected' : ''}>Negar</option></select></label>`; }).join('')}</div>` : ''}</div>`;
    };
    const roleCard = r => {
      const n = mem.filter(m => m.role_id === r.id).length, yes = PERMS.filter(([k]) => r.perms?.[k] && k !== 'view'), no = PERMS.filter(([k]) => !r.perms?.[k]);
      const mine = mem.find(m => m.user_id === me)?.role_id === r.id, lock = !manage || gated(r) || (mine && !owner);
      if (editing === r.id) return roleForm(r, n);
      return `<div class="rl-card" style="border-top-color:${r.color}"><span class="rl-h"><b>${esc(r.name)}</b><span class="mono">${n} ${n === 1 ? 'persona' : 'personas'}</span></span>${r.description ? `<span class="rl-d">${esc(r.description)}</span>` : ''}
        <span class="rl-l">${yes.map(([, l]) => `<span><i class="y">✓</i>${l}</span>`).join('')}${no.map(([, l]) => `<span class="no"><i>✕</i>${l}</span>`).join('')}</span>
        ${lock ? (manage ? `<span class="mono">${mine && !owner ? 'Es tu rol: solo el propietario lo edita' : 'Solo el propietario edita este rol'}</span>` : '') : `<button class="btn ghost" data-redit="${r.id}">Editar rol</button>`}</div>`;
    };
    const roleForm = (r, n = 0) => `<form class="rl-card rl-form" id="rform" style="border-top-color:${r?.color || '#a89f8a'}" data-id="${r?.id || ''}">
      <label>Nombre<input name="name" maxlength="40" required value="${esc(r?.name || '')}" placeholder="p. ej. Redes y anuncios"></label>
      <span class="rl-sw" role="radiogroup" aria-label="Color del rol">${SWATCH.map(c => `<button type="button" role="radio" aria-checked="${(r?.color || '#a89f8a') === c}" aria-label="${c}" data-sw="${c}" style="background:${c}"></button>`).join('')}<input type="hidden" name="color" value="${r?.color || '#a89f8a'}"></span>
      <label>Descripción<input name="desc" maxlength="200" value="${esc(r?.description || '')}" placeholder="Qué hace este rol en el equipo"></label>
      <fieldset class="rl-perms"><legend>Puede…</legend>${PERMS.map(([k, l, h]) => `<label class="rl-chk"><input type="checkbox" name="p_${k}" ${k === 'view' || r?.perms?.[k] ? 'checked' : ''} ${k === 'view' || (k === 'members' && !owner) ? 'disabled' : ''}><span><b>${l}</b><small>${h}</small></span></label>`).join('')}</fieldset>
      <span class="rl-fa"><button class="btn" type="submit">${r ? 'Guardar rol' : 'Crear rol'}</button><button class="btn ghost" type="button" data-rcancel="1">Cancelar</button>
        ${r ? `<span class="rl-del">${n ? `<select name="move" aria-label="Pasar sus integrantes a">${roles.filter(x => x.id !== r.id && !gated(x)).map(x => `<option value="${x.id}">Pasar a ${esc(x.name)}</option>`).join('')}</select>` : ''}<button class="lnk danger" type="button" data-rdel="${r.id}">Borrar rol</button></span>` : ''}</span></form>`;
    app.innerHTML = shell('Equipo y permisos', `<div class="tm">
      <section class="tm-box"><div class="tm-bh"><h2>Integrantes · ${mem.length}</h2>${manage ? `<form class="tm-inv" id="inv"><input type="email" id="mail" required placeholder="Correo del integrante" aria-label="Correo del integrante"><select id="nrole" aria-label="Rol">${roles.filter(x => !gated(x)).map(x => `<option value="${x.id}" ${x.base === 'collaborator' ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn">Agregar</button></form>` : ''}</div>
        ${mem.map(memberRow).join('')}
        <p class="mono" style="padding:10px 16px;margin:0">${manage ? 'La persona necesita una cuenta en El Obi del Lector con ese correo. Cada cambio queda en la bitácora.' : 'Solo quien gestiona integrantes puede cambiar roles.'}</p></section>
      <section><div class="tm-sh"><h2>Qué puede hacer cada rol</h2><span class="mono">Las mismas reglas se aplican en el servidor.</span></div>
        <div class="rl-grid">${roles.map(roleCard).join('')}${manage ? (editing === 'new' ? roleForm(null) : '<button class="rl-add" data-redit="new">＋ Nuevo rol</button>') : ''}</div></section></div>`, '/estudio/equipo');
    bindPicker(team);
    const again = (o = {}) => { Object.assign(team, o); team(); };
    const memOf = u => mem.find(m => m.user_id === u);
    $('#inv')?.addEventListener('submit', e => { e.preventDefault(); busy(e.submitter, async () => { const n = await rpc('team_member_add', { p_team: T.team.id, p_email: $('#mail').value, p_role: $('#nrole').value }); toast((n || 'Integrante') + ' agregado'); again(); }); });
    app.querySelectorAll('[data-mrole]').forEach(s => s.onchange = () => busy(null, async () => { const m = memOf(s.dataset.mrole); await rpc('team_member_set', { p_team: T.team.id, p_user: m.user_id, p_role: s.value, p_overrides: m.overrides || {} }); toast('Rol actualizado'); again(); }));
    app.querySelectorAll('[data-mx]').forEach(b => b.onclick = () => again({ open: open === b.dataset.mx ? null : b.dataset.mx }));
    app.querySelectorAll('[data-ov]').forEach(s => s.onchange = () => busy(null, async () => { const m = memOf(s.dataset.u), o = { ...(m.overrides || {}) }; if (s.value === 'inherit') delete o[s.dataset.ov]; else o[s.dataset.ov] = s.value === 'allow'; await rpc('team_member_set', { p_team: T.team.id, p_user: m.user_id, p_role: null, p_overrides: o }); toast('Excepción guardada'); again(); }));
    app.querySelectorAll('[data-mrm]').forEach(b => b.onclick = () => busy(b, async () => { const m = memOf(b.dataset.mrm); if (!confirm(`¿Retirar a ${m.profiles?.username || 'este integrante'} del equipo? Sus tarjetas quedan sin asignar.`)) return; await rpc('team_member_remove', { p_team: T.team.id, p_user: m.user_id }); toast('Integrante retirado'); again(); }));
    $('[data-leave]')?.addEventListener('click', e => busy(e.currentTarget, async () => { if (!confirm('¿Salir de este equipo? Perderás el acceso a su Estudio.')) return; await rpc('team_member_remove', { p_team: T.team.id, p_user: me }); T.teams = []; T.team = null; go('/'); }));
    app.querySelectorAll('[data-redit]').forEach(b => b.onclick = () => again({ editing: b.dataset.redit }));
    $('[data-rcancel]')?.addEventListener('click', () => again({ editing: null }));
    const f = $('#rform');
    if (f) {
      f.querySelector('input[name=name]').focus();
      f.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { f.color.value = b.dataset.sw; f.style.borderTopColor = b.dataset.sw; f.querySelectorAll('[data-sw]').forEach(x => x.setAttribute('aria-checked', x === b)); });
      f.onsubmit = e => { e.preventDefault(); busy(e.submitter, async () => { const perms = Object.fromEntries(PERMS.map(([k]) => [k, !!f['p_' + k]?.checked])); await rpc('team_role_save', { p_team: T.team.id, p_id: f.dataset.id || null, p_name: f.name.value, p_color: f.color.value, p_desc: f.desc.value, p_perms: perms }); toast(f.dataset.id ? 'Rol guardado' : 'Rol creado'); await pickTeam(T.team.id); again({ editing: null }); }); };
      f.querySelector('[data-rdel]')?.addEventListener('click', e => busy(e.currentTarget, async () => { const r = rById[f.dataset.id]; if (!confirm(`¿Borrar el rol «${r.name}»?`)) return; await rpc('team_role_delete', { p_team: T.team.id, p_id: r.id, p_move_to: f.move?.value || null }); toast('Rol borrado'); again({ editing: null }); }));
    }
  }

  // tablero
  const COLS = [['traduciendo','Traduciendo','#d9922b'],['correccion','En corrección','#8cc3f2'],['listo','Listo','#a9d18e'],['programado','Programado','#f2c230']];
  async function board(){
    if (!(await ensure())) return;
    app.innerHTML = shell('Flujo de trabajo', '<p class="mono">Cargando el tablero…</p>', '/estudio/flujo'); bindPicker(board);
    const { data: works } = await sb.from('series').select('id,slug,title,short,theme').eq('team_id', T.team.id).is('archived_at', null).order('title');
    const ids = (works || []).map(w => w.id);
    const [{ data: chs }, { mem }] = await Promise.all([
      ids.length ? sb.from('chapters').select('id,num,vol,title,section_type,status,stage,assigned_to,stage_at,publish_at,updated_at,series_id').in('series_id', ids).in('status', ['draft','scheduled']).is('deleted_at', null).order('vol').order('num').limit(1000) : { data: [] },
      teamMembers()]);
    const W = Object.fromEntries((works || []).map(w => [w.id, w])), me = getUser()?.id;
    const F = board.f || (board.f = { work: '', mine: false });
    const colOf = c => c.status === 'scheduled' ? 'programado' : c.stage || 'traduciendo';
    const label = c => (c.section_type && c.section_type !== 'Capítulo' ? c.section_type : 'Cap. ' + c.num) + ' — ' + (c.title || '').replace(/^(Cap[íi]tulo|Cap\.)\s*\d+\s*[—–:-]?\s*/, '');
    const list = (chs || []).filter(c => (!F.work || c.series_id === F.work) && (!F.mine || c.assigned_to === me));
    const mv = can('board');
    const card = c => {
      const k = colOf(c), i = COLS.findIndex(x => x[0] === k), w = W[c.series_id];
      const back = i > 0 && mv && (k !== 'programado' || can('schedule')), fwd = i < 3 && mv && (i < 2 || can('schedule'));
      return `<article class="tb-card" draggable="${mv}" data-card="${c.id}" style="border-left-color:${wcolor(w)}" aria-label="${esc(label(c))}">
        <span class="mono">${esc((w?.short || w?.title || '').toUpperCase())} · VOL. ${c.vol}</span><b>${esc(label(c))}</b>
        ${k === 'programado' ? `<span class="tb-at">◷ ${fmtAt(c.publish_at)}</span>` : `<span class="mono">${c.stage_at ? 'En esta etapa ' + ago(c.stage_at) : 'Editado ' + ago(c.updated_at)}</span>`}
        ${mv ? `<select data-asg="${c.id}" aria-label="Asignar"><option value="">Sin asignar</option>${mem.map(m => `<option value="${m.user_id}" ${m.user_id === c.assigned_to ? 'selected' : ''}>${esc(m.profiles?.username || '—')}${m.user_id === me ? ' (tú)' : ''}</option>`).join('')}</select>` : `<span class="mono">${esc(mem.find(m => m.user_id === c.assigned_to)?.profiles?.username || 'Sin asignar')}</span>`}
        <span class="tb-ac">${back ? `<button class="tb-b" data-mv="${c.id}" data-dir="-1" aria-label="Mover a ${COLS[i - 1][1]}">←</button>` : '<span></span>'}<a class="tb-b" href="/estudio/editar/${c.id}">Abrir</a>${fwd ? `<button class="tb-b f" data-mv="${c.id}" data-dir="1" aria-label="Mover a ${COLS[i + 1][1]}">→</button>` : '<span></span>'}</span>
        <div data-schedfor="${c.id}"></div></article>`;
    };
    app.querySelector('.s2-main').innerHTML = app.querySelector('.s2-head').outerHTML + `<div class="tb">
      <div class="tb-f"><label class="tb-inl">Obra<select id="fw"><option value="">Todas</option>${(works || []).map(w => `<option value="${w.id}" ${F.work === w.id ? 'selected' : ''}>${esc(w.short || w.title)}</option>`).join('')}</select></label>
        <label class="tb-inl"><input type="checkbox" id="fm" ${F.mine ? 'checked' : ''}> Solo lo asignado a mí</label>
        <span class="mono" style="margin-left:auto">${mv ? 'Mueve las tarjetas con ← → o arrastrándolas. Quien queda asignado recibe un aviso.' : 'Tu rol puede ver el tablero, pero no mover tarjetas.'}</span></div>
      <p class="mono s2-scroll-tip">Desliza horizontalmente para recorrer las etapas del tablero. También puedes mover tarjetas con las flechas.</p><div class="tb-cols" role="region" aria-label="Etapas del flujo editorial" tabindex="0">${COLS.map(([k, l, c]) => { const cs = list.filter(x => colOf(x) === k); return `<section class="tb-col" data-col="${k}" style="border-top-color:${c}"><h2><span>${l}</span><span class="mono">${cs.length}</span></h2>${cs.map(card).join('') || `<p class="tb-empty">${k === 'programado' ? 'Nada programado.' : 'Sin capítulos aquí.'}</p>`}</section>`; }).join('')}</div>
      ${!(chs || []).length ? '<p class="mono">Los capítulos en borrador o programados aparecen aquí. Los publicados salen del tablero.</p>' : ''}</div>`;
    const cOf = id => chs.find(c => c.id === id);
    $('#fw').onchange = e => { F.work = e.target.value; board(); };
    $('#fm').onchange = e => { F.mine = e.target.checked; board(); };
    const schedAsk = c => { const box = app.querySelector(`[data-schedfor="${c.id}"]`); box.innerHTML = `<div class="tb-sch"><input type="datetime-local" aria-label="Fecha de publicación">${tzHint()}<button class="tb-b f">Programar</button><button class="tb-b" data-x="1">✕</button></div>`; const inp = box.querySelector('input'); inp.focus();
      box.querySelector('[data-x]').onclick = () => { box.innerHTML = ''; };
      box.querySelector('.f').onclick = e => busy(e.currentTarget, async () => { if (!inp.value || new Date(fromLocal(inp.value)) <= new Date()) throw new Error('Elige una fecha futura'); const { error } = await sb.from('chapters').update({ status: 'scheduled', publish_at: fromLocal(inp.value), stage: 'listo' }).eq('id', c.id); if (error) throw new Error(errMsg(error)); toast('Programado para ' + fmtAt(fromLocal(inp.value))); board(); }); };
    const moveTo = async (c, k) => {
      const from = colOf(c); if (from === k) return;
      if (k === 'programado') return schedAsk(c);
      if (from === 'programado') { if (!confirm('¿Cancelar la programación y devolverlo a «' + COLS.find(x => x[0] === k)[1] + '»?')) return; const { error } = await sb.from('chapters').update({ status: 'draft' }).eq('id', c.id); if (error) throw new Error(errMsg(error)); }
      await rpc('chapter_move', { p_id: c.id, p_stage: k, p_assignee: null, p_set_assignee: false }); board();
    };
    app.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => busy(b, () => { const c = cOf(b.dataset.mv), i = COLS.findIndex(x => x[0] === colOf(c)); return moveTo(c, COLS[i + +b.dataset.dir][0]); }));
    app.querySelectorAll('[data-asg]').forEach(s => s.onchange = () => busy(null, async () => { await rpc('chapter_move', { p_id: s.dataset.asg, p_stage: null, p_assignee: s.value || null, p_set_assignee: true }); toast(s.value ? 'Asignado a ' + s.selectedOptions[0].text.replace(' (tú)', '') : 'Sin asignar'); }));
    let drag = null;
    app.querySelectorAll('[data-card]').forEach(el => { el.ondragstart = e => { drag = el.dataset.card; e.dataTransfer.effectAllowed = 'move'; el.classList.add('drag'); }; el.ondragend = () => el.classList.remove('drag'); });
    app.querySelectorAll('[data-col]').forEach(col => { col.ondragover = e => { if (drag) { e.preventDefault(); col.classList.add('over'); } }; col.ondragleave = () => col.classList.remove('over'); col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const c = cOf(drag); drag = null; if (c) busy(null, () => moveTo(c, col.dataset.col)); }; });
  }

  // bitácora
  const LOGK = { publicacion: ['Publicación', '#f2c230'], edicion: ['Edición', '#8cc3f2'], tablero: ['Tablero', '#d9922b'], permisos: ['Permisos', '#c9a8f2'], borrado: ['Borrado', '#f59e7a'], equipo: ['Equipo', '#a9d18e'] };
  async function log(){
    if (!(await ensure())) return;
    if (!can('log')) { app.innerHTML = shell('Bitácora', '<p>Tu rol no permite ver la bitácora. Pídeselo a quien gestiona el equipo.</p>', '/estudio/bitacora'); return bindPicker(log); }
    const F = log.f || (log.f = { kind: '', who: '', n: 100 });
    app.innerHTML = shell('Bitácora del equipo', '<p class="mono">Cargando…</p>', '/estudio/bitacora'); bindPicker(log);
    let q = sb.from('team_log').select('id,actor,kind,summary,detail,chapter_id,created_at').eq('team_id', T.team.id).order('created_at', { ascending: false }).limit(F.n + 1);
    if (F.kind) q = q.eq('kind', F.kind); if (F.who) q = q.eq('actor', F.who);
    const [{ data, error }, { mem }] = await Promise.all([q, teamMembers()]);
    if (error) { app.querySelector('.s2-main').insertAdjacentHTML('beforeend', `<p class="mono">${esc(error.message)}</p>`); return; }
    const rows = (data || []).slice(0, F.n), more = (data || []).length > F.n;
    const nm = await names(rows.map(r => r.actor));
    const day = d => { const k = z => fmtTz(z, { year: 'numeric', month: '2-digit', day: '2-digit' }), x = new Date(d); return k(x) === k(new Date()) ? 'Hoy' : k(x) === k(new Date(Date.now() - 864e5)) ? 'Ayer' : fmtTz(x, { weekday: 'long', day: 'numeric', month: 'long' }); };
    let last = '';
    app.querySelector('.s2-main').innerHTML = app.querySelector('.s2-head').outerHTML + `<div class="lg">
      <div class="lg-f"><span class="lg-chips">${[['', 'Todo'], ...Object.entries(LOGK).map(([k, [l]]) => [k, l])].map(([k, l]) => `<button class="ed-chip ${F.kind === k ? 'on' : ''}" aria-pressed="${F.kind === k}" data-k="${k}">${l}</button>`).join('')}</span>
        <select id="lw" aria-label="Integrante"><option value="">Todo el equipo</option>${mem.map(m => `<option value="${m.user_id}" ${F.who === m.user_id ? 'selected' : ''}>${esc(m.profiles?.username || '—')}</option>`).join('')}</select></div>
      <div class="lg-list">${rows.map(r => { const d = day(r.created_at), head = d !== last ? (last = d, `<h3 class="lg-day">${d}</h3>`) : ''; const [kl, kc] = LOGK[r.kind] || [r.kind, '#a89f8a'];
        return head + `<div class="lg-row"><span class="mono">${fmtTz(r.created_at, { hour: '2-digit', minute: '2-digit' })}</span><b>${esc(r.actor ? nm[r.actor] || 'Exintegrante' : 'Sistema')}</b><span>${r.chapter_id ? `<a href="/estudio/editar/${r.chapter_id}">${esc(r.summary)}</a>` : esc(r.summary)}${r.detail?.at ? ' para el ' + fmtAt(r.detail.at) : ''}${r.detail?.version ? ` <span class="mono">v${r.detail.version}</span>` : ''}</span><span class="lg-k" style="color:${kc}">${kl.toUpperCase()}</span></div>`; }).join('') || '<p class="tb-empty">Todavía no hay movimientos con este filtro. Se registran desde hoy: publicaciones, versiones guardadas, tablero, permisos y borrados.</p>'}</div>
      ${more ? '<button class="btn ghost" id="lmore">Cargar más</button>' : ''}
      <p class="mono">Visible para quien tenga el permiso «Ver la bitácora». Se conserva 12 meses.</p></div>`;
    app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { F.kind = b.dataset.k; F.n = 100; log(); });
    $('#lw').onchange = e => { F.who = e.target.value; F.n = 100; log(); };
    $('#lmore')?.addEventListener('click', () => { F.n += 100; log(); });
  }

  // página del equipo
  const LANGS = [['ja','Japonés'],['ko','Coreano'],['zh','Chino'],['en','Inglés']];
  const LINKS = [['website','Sitio web','https://…'],['patreon','Patreon','https://patreon.com/…'],['kofi','Ko-fi','https://ko-fi.com/…'],['discord','Discord','https://discord.gg/…'],['twitter','X / Twitter','https://x.com/…']];
  const SECTS = [['show_featured','Obra destacada'],['show_stats','Estadísticas'],['show_works','Obras'],['show_members','Integrantes']];
  async function profile(){
    if (!(await ensure())) return;
    const [{ data: t }, { data: works }, { mem }] = await Promise.all([
      sb.from('teams').select('id,slug,name,bio,color,langs,settings,avatar_path,banner_path,anniversary,anniversary_msg').eq('id', T.team.id).single(),
      sb.from('series').select('id,slug,title,short,synopsis,cover_path,translation_status,theme').eq('team_id', T.team.id).is('archived_at', null).order('title'),
      teamMembers()]);
    const edit = can('profile'), S0 = t.settings || {};
    const D = { name: t.name, slug: t.slug, bio: t.bio || '', aniv: t.anniversary || '', anivMsg: t.anniversary_msg || '', color: t.color || '#f2c230', langs: [...(t.langs || [])], avatar: t.avatar_path, banner: t.banner_path,
      feat: S0.featured_works || '', links: Object.fromEntries(LINKS.map(([k]) => [k, S0[k] || ''])), sect: Object.fromEntries(SECTS.map(([k]) => [k, S0[k] !== false])),
      logoUpd: S0.show_team_logo !== false, logoReader: S0.show_reader_logo !== false, tz: S0.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone };
    const cnt = {}; if (works?.length) { const { data: cc } = await sb.from('chapters').select('series_id').in('series_id', works.map(w => w.id)).eq('status', 'published').is('deleted_at', null).limit(5000); (cc || []).forEach(c => cnt[c.series_id] = (cnt[c.series_id] || 0) + 1); }
    const dis = edit ? '' : 'disabled';
    app.innerHTML = shell('Página del equipo', `<div class="pfx">
      <form class="pf-form" id="pf">
        ${edit ? '' : '<p class="st-card" style="margin:0">Tu rol puede ver esta página, pero no editarla.</p>'}
        <h2>Datos públicos</h2>
        <label>Nombre del equipo<input name="name" maxlength="80" required value="${esc(D.name)}" ${dis}></label>
        <label>Dirección<span class="pf-slug"><span class="mono">obi.lat/equipo/</span><input name="slug" maxlength="40" pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required value="${esc(D.slug)}" ${dis}></span><small class="mono">Solo minúsculas, números y guiones. Si la cambias, los enlaces viejos dejarán de funcionar.</small></label>
        <label><span class="pf-lh">Presentación<span class="mono" id="biocount">${D.bio.length}/600</span></span><textarea name="bio" rows="4" maxlength="600" ${dis}>${esc(D.bio)}</textarea></label>
        <label>Aniversario del equipo<input type="date" name="anniversary" value="${esc(D.aniv)}" ${dis}><small class="mono">Si la dejas vacía se usa la fecha en que el equipo se creó en el Obi. Sale en el Calendario, con un sello en tu página ese día y un aviso a quien sigue sus obras.</small></label>
        <label><span class="pf-lh">Mensaje de aniversario<span class="mono" id="anivcount">${D.anivMsg.length}/200</span></span><input name="anniversary_msg" maxlength="200" placeholder="Ej.: ¡Gracias por leer con nosotros!" value="${esc(D.anivMsg)}" ${dis}><small class="mono">Si lo dejas vacío: «N años de ${esc(D.name)}».</small></label>
        <div class="pf-g"><span class="pf-l">Color del equipo</span><span class="rl-sw" role="radiogroup" aria-label="Color del equipo">${SWATCH.map(c => `<button type="button" role="radio" aria-checked="${D.color === c}" aria-label="${c}" data-pc="${c}" style="background:${c}" ${dis}></button>`).join('')}</span></div>
        <div class="pf-g"><span class="pf-l">Traducimos del</span><span class="ed-chips">${LANGS.map(([k, l]) => `<button type="button" class="ed-chip ${D.langs.includes(k) ? 'on' : ''}" aria-pressed="${D.langs.includes(k)}" data-lang="${k}" ${dis}>${l}</button>`).join('')}</span></div>
        <div class="pf-g"><span class="pf-l">Logo</span><span class="pf-up"><span class="pf-logo" id="logobox"></span><span style="display:grid;gap:6px"><label class="btn ghost pf-file">${D.avatar ? 'Cambiar logo' : 'Subir logo'}<input type="file" id="flogo" accept="image/png,image/webp,image/jpeg" hidden ${dis}></label><small class="mono">PNG transparente · mínimo 512×512 · hasta 1 MB</small>${D.avatar && edit ? '<button type="button" class="lnk danger" id="nologo">Quitar logo</button>' : ''}</span></span>
          <label class="tb-inl"><input type="checkbox" id="lu" ${D.logoUpd ? 'checked' : ''} ${dis}> En la lista de actualizaciones</label><label class="tb-inl"><input type="checkbox" id="lr" ${D.logoReader ? 'checked' : ''} ${dis}> Al inicio de cada capítulo, en lugar de «Traducido por…»</label></div>
        <div class="pf-g"><span class="pf-l">Portada del perfil</span><span class="pf-up"><label class="btn ghost pf-file">${D.banner ? 'Cambiar portada' : 'Subir portada'}<input type="file" id="fban" accept="image/png,image/jpeg,image/webp" hidden ${dis}></label><small class="mono">1600×400 recomendado · hasta 3 MB. Sin portada se usa el color del equipo.</small>${D.banner && edit ? '<button type="button" class="lnk danger" id="noban">Quitar</button>' : ''}</span></div>
        <label>Zona horaria del equipo<select name="tz" ${dis}>${[...TZS, ...(TZS.some(x => x[0] === D.tz) ? [] : [[D.tz, D.tz.replace(/_/g, ' ')]])].map(([k, l]) => `<option value="${k}" ${k === D.tz ? 'selected' : ''}>${l} · ${new Date().toLocaleTimeString('es-MX', { timeZone: k, hour: '2-digit', minute: '2-digit' })}</option>`).join('')}</select><small class="mono">Es la hora de referencia del equipo. Cada integrante programa con la hora de su dispositivo y, junto al campo de fecha, puede cambiar a esta. Los lectores ven cada lanzamiento en su propia hora.</small></label>
        <label>Obra destacada<select name="feat" ${dis}><option value="">Ninguna</option>${(works || []).map(w => `<option value="${w.slug}" ${D.feat === w.slug ? 'selected' : ''}>${esc(w.short || w.title)}</option>`).join('')}</select></label>
        <div class="pf-g"><span class="pf-l">Secciones visibles</span>${SECTS.map(([k, l]) => `<label class="tb-inl"><input type="checkbox" data-sect="${k}" ${D.sect[k] ? 'checked' : ''} ${dis}> ${l}</label>`).join('')}</div>
        <div class="pf-g"><span class="pf-l">Redes y apoyo</span>${LINKS.map(([k, l, ph]) => `<label class="pf-link">${l}<input type="url" data-link="${k}" value="${esc(D.links[k])}" placeholder="${ph}" ${dis}></label>`).join('')}</div>
        <div class="pf-g" id="pt-team"></div>
        ${edit ? '<span class="pf-save"><span class="mono" id="pfstate"></span><button class="btn" id="pfsave">Guardar página</button></span>' : ''}
      </form>
      <div class="pf-pv"><span class="mono" id="pvurl"></span><div id="pv"></div></div></div>`, '/estudio/perfil');
    bindPicker(profile);
    import('/patreon.js?v=1').then(m => m.campaignBox(document.getElementById('pt-team'), { sb, url, esc, toast, owner: T.team.id, edit }));
    const f = $('#pf'); let dirty = false;
    const draw = () => {
      const feat = (works || []).find(w => w.slug === D.feat), c = D.color, logo = D.avatar ? media(D.avatar) : '';
      $('#pvurl').textContent = 'VISTA PÚBLICA · obi.lat/equipo/' + D.slug;
      $('#logobox').innerHTML = logo ? `<img src="${esc(logo)}" alt="Logo actual">` : '<span class="mono">Sin logo</span>';
      const langs = LANGS.filter(([k]) => D.langs.includes(k)).map(x => x[1]).join(' · ');
      $('#pv').innerHTML = `<div class="pf-card"><div class="pf-ban" style="${D.banner ? `background:url('${esc(media(D.banner))}') center/cover` : `background:linear-gradient(135deg, ${c}, #14120d)`}"></div>
        <div class="pf-in"><span class="pf-av" style="color:${c}">${logo ? `<img src="${esc(logo)}" alt="">` : esc(ini(D.name))}</span>
        <div style="display:grid;gap:4px"><b class="pf-name">${esc(D.name)}</b><span class="mono">${[langs ? 'Del ' + langs.toLowerCase() : '', (works || []).length + ((works || []).length === 1 ? ' obra' : ' obras'), mem.length + (mem.length === 1 ? ' integrante' : ' integrantes')].filter(Boolean).join(' · ')}</span></div>
        ${D.bio ? `<p class="pf-bio">${esc(D.bio)}</p>` : ''}
        <span class="ed-chips">${LINKS.filter(([k]) => D.links[k]).map(([k, l]) => `<span class="pf-chip" style="border-color:${c};color:${c}">${l}</span>`).join('')}</span>
        ${D.sect.show_featured && feat ? `<div class="pf-feat" style="border-left-color:${c}"><span class="pf-cv" style="${feat.cover_path ? `background:url('${esc(media(feat.cover_path))}') center/cover` : ''}"></span><span style="display:grid;gap:4px;align-content:start;min-width:0"><span class="mono" style="color:${c}">OBRA DESTACADA</span><b>${esc(feat.title)}</b><span class="pf-syn">${esc(feat.synopsis || '')}</span></span></div>` : ''}
        ${D.sect.show_stats ? `<div class="pf-stats">${[[(works || []).length, 'OBRAS'], [Object.values(cnt).reduce((a, b) => a + b, 0), 'CAPÍTULOS'], [mem.length, 'INTEGRANTES']].map(([v, k]) => `<span><b>${v}</b><span class="mono">${k}</span></span>`).join('')}</div>` : ''}
        ${D.sect.show_works && works?.length ? `<div class="pf-sec"><span class="mono">OBRAS</span>${works.map(w => `<span class="pf-w"><span class="pf-cv sm" style="border-top-color:${wcolor(w)};${w.cover_path ? `background:url('${esc(media(w.cover_path))}') center/cover` : ''}"></span><span><b>${esc(w.short || w.title)}</b><small>${cnt[w.id] || 0} cap. · ${(TLS[w.translation_status] || ['—'])[0]}</small></span></span>`).join('')}</div>` : ''}
        ${D.sect.show_members ? `<div class="pf-sec"><span class="mono">INTEGRANTES</span><span class="ed-chips">${mem.map(m => `<span class="pf-chip">${esc(m.profiles?.username || '—')}</span>`).join('')}</span></div>` : ''}
        </div></div>
        <div class="pf-reader"><span class="mono">ASÍ SE VE AL INICIO DE UN CAPÍTULO</span><div>${D.logoReader && logo ? `<img src="${esc(logo)}" alt="${esc(D.name)}">` : `<span class="mono">TRADUCIDO POR ${esc(D.name.toUpperCase())}</span>`}<b>Capítulo 1</b></div></div>`;
    };
    const touch = () => { dirty = true; if ($('#pfstate')) $('#pfstate').textContent = 'Cambios sin guardar'; draw(); };
    f.name.oninput = e => { D.name = e.target.value; touch(); };
    f.slug.oninput = e => { D.slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); e.target.value = D.slug; touch(); };
    f.bio.oninput = e => { D.bio = e.target.value; $('#biocount').textContent = D.bio.length + '/600'; touch(); };
    f.anniversary.oninput = e => { D.aniv = e.target.value; touch(); };
    f.anniversary_msg.oninput = e => { D.anivMsg = e.target.value; $('#anivcount').textContent = D.anivMsg.length + '/200'; touch(); };
    f.feat.onchange = e => { D.feat = e.target.value; touch(); };
    f.tz.onchange = e => { D.tz = e.target.value; touch(); };
    f.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { D.color = b.dataset.pc; f.querySelectorAll('[data-pc]').forEach(x => x.setAttribute('aria-checked', x === b)); touch(); });
    f.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { const k = b.dataset.lang, on = !D.langs.includes(k); D.langs = on ? [...D.langs, k] : D.langs.filter(x => x !== k); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); touch(); });
    f.querySelectorAll('[data-sect]').forEach(i => i.onchange = () => { D.sect[i.dataset.sect] = i.checked; touch(); });
    f.querySelectorAll('[data-link]').forEach(i => i.oninput = () => { D.links[i.dataset.link] = i.value.trim(); touch(); });
    $('#lu').onchange = e => { D.logoUpd = e.target.checked; touch(); };
    $('#lr').onchange = e => { D.logoReader = e.target.checked; touch(); };
    const up = async (file, kind, max) => {
      if (!file) return; if (file.size > max) throw new Error(`La imagen pesa más de ${max / 1048576} MB`);
      if (kind === 'logo') { const img = await createImageBitmap(file).catch(() => null); if (img && (img.width < 512 || img.height < 512)) toast('Aviso: el logo mide menos de 512×512 y puede verse borroso'); }
      const path = `${T.team.id}/profile/${kind}-${Date.now()}.${(file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const { error } = await sb.storage.from('obi-media').upload(path, file, { contentType: file.type }); if (error) throw error;
      return path;
    };
    $('#flogo').onchange = e => busy(null, async () => { const p = await up(e.target.files[0], 'logo', 1048576); if (p) { D.avatar = p; touch(); } e.target.value = ''; });
    $('#fban').onchange = e => busy(null, async () => { const p = await up(e.target.files[0], 'banner', 3 * 1048576); if (p) { D.banner = p; touch(); } e.target.value = ''; });
    $('#nologo')?.addEventListener('click', () => { D.avatar = null; touch(); });
    $('#noban')?.addEventListener('click', () => { D.banner = null; touch(); });
    f.onsubmit = e => { e.preventDefault(); busy($('#pfsave'), async () => {
      if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(D.slug)) throw new Error('La dirección debe tener de 3 a 40 caracteres: minúsculas, números y guiones');
      if (D.name.trim().length < 2) throw new Error('El nombre es muy corto');
      const bad = LINKS.find(([k]) => D.links[k] && !/^https:\/\//.test(D.links[k])); if (bad) throw new Error(bad[1] + ': el enlace debe empezar con https://');
      if (D.slug !== t.slug && !confirm(`¿Cambiar la dirección a obi.lat/equipo/${D.slug}? Los enlaces viejos dejarán de funcionar.`)) return;
      const settings = { ...S0, ...D.links, ...D.sect, featured_works: D.feat, show_team_logo: D.logoUpd, show_reader_logo: D.logoReader, timezone: D.tz };
      const { error } = await sb.from('teams').update({ name: D.name.trim(), slug: D.slug, bio: D.bio.trim() || null, color: D.color, langs: D.langs, avatar_path: D.avatar, banner_path: D.banner, settings, anniversary: D.aniv || null, anniversary_msg: D.anivMsg.trim() || null }).eq('id', T.team.id);
      if (error) throw new Error(/teams_slug_key/.test(error.message) ? 'Esa dirección ya la usa otro equipo' : /teams_profile_checks/.test(error.message) ? 'Revisa el nombre, la dirección y la presentación' : errMsg(error));
      Object.assign(t, { slug: D.slug }); Object.assign(T.team, { name: D.name.trim(), color: D.color, slug: D.slug }); T.tz = D.tz; dirty = false;
      $('#pfstate').textContent = '✓ Guardado'; toast('Página del equipo guardada');
    }); };
    const leave = e => { if (!document.body.contains(f)) return removeEventListener('beforeunload', leave); if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', leave);
    draw();
  }

  // ---------- lectores: comunidad, estadísticas y descargas ----------
  const pick = (works, cur, id = 'fs', all = 'Todas las obras') => `<select id="${id}" aria-label="Obra">${all ? `<option value="">${all}</option>` : ''}${(works || []).map(w => `<option value="${w.id}" ${cur === w.id ? 'selected' : ''}>${esc(w.short || w.title)}</option>`).join('')}</select>`;
  const chLbl = (n, t) => 'Cap. ' + n + (t ? ' — ' + String(t).replace(/^(Cap[íi]tulo|Cap\.)\s*\d+\s*[—–:-]?\s*/, '') : '');
  async function teamWorks(){ const { data } = await sb.from('series').select('id,slug,title,short,theme').eq('team_id', T.team.id).is('archived_at', null).order('title'); return data || []; }

  async function community(){
    if (!(await ensure())) return;
    const F = community.f || (community.f = { tab: 'erratas', st: 'open', work: '', unans: true, n: 50 });
    app.innerHTML = shell('Comunidad', '<p class="mono">Cargando…</p>', '/estudio/comunidad'); bindPicker(community);
    const works = await teamWorks(), W = Object.fromEntries(works.map(w => [w.id, w])), mod = can('review'), me = getUser()?.id;
    let body = '';
    if (F.tab === 'erratas') {
      const ids = (F.work ? [F.work] : works.map(w => w.id));
      const { data: reps } = ids.length ? await sb.from('reports').select('id,kind,quote,fix,status,created_at,user_id,chapter_id,chapters!inner(num,title,series_id)').in('chapters.series_id', ids).eq('status', F.st).order('created_at', { ascending: false }).limit(F.n + 1) : { data: [] };
      const list = (reps || []).slice(0, F.n), nm = await names(list.map(r => r.user_id));
      body = `<div class="cm-f"><span class="lg-chips">${[['open','Abiertas'],['fixed','Corregidas'],['dismissed','Descartadas']].map(([k, l]) => `<button class="ed-chip ${F.st === k ? 'on' : ''}" aria-pressed="${F.st === k}" data-st="${k}">${l}</button>`).join('')}</span>${pick(works, F.work)}</div>
        <div class="lg-list">${list.map(r => `<div class="cm-row"><span class="cm-w"><span class="mono">${esc((W[r.chapters.series_id]?.short || W[r.chapters.series_id]?.title || '').toUpperCase())} · ${esc(chLbl(r.chapters.num, r.chapters.title))}${r.kind ? ' · ' + esc(r.kind) : ''}</span>
          <span class="cm-q"><q>${esc(r.quote || '')}</q>${r.fix ? ` <span aria-hidden="true">→</span> <b>${esc(r.fix)}</b>` : ''}</span><small>${esc(nm[r.user_id] || 'Lector')} · ${ago(r.created_at)}</small></span>
          <span class="cm-a"><a class="btn ghost" href="/estudio/editar/${r.chapter_id}">Abrir en el editor</a>${mod && F.st === 'open' ? `<button class="btn ghost" data-rfix="${r.id}">Ya está corregida</button><button class="lnk danger" data-rdis="${r.id}">Descartar</button>` : mod && F.st !== 'open' ? `<button class="lnk" data-rre="${r.id}">Reabrir</button>` : ''}</span></div>`).join('') || `<p class="tb-empty">${F.st === 'open' ? 'Sin erratas abiertas. Los lectores las reportan seleccionando texto en el lector.' : 'Nada por aquí.'}</p>`}</div>
        ${(reps || []).length > F.n ? '<button class="btn ghost" id="more">Cargar más</button>' : ''}
        <p class="mono">Al marcarla como corregida, quien la reportó recibe un aviso de agradecimiento. Para aplicar la corrección en el texto, ábrela en el editor.</p>`;
    } else {
      const { data: coms, error } = await sb.rpc('team_comments', { p_team: T.team.id, p_unanswered: F.unans, p_series: F.work || null, p_limit: F.n + 1, p_before: null });
      if (error) throw error;
      const list = (coms || []).slice(0, F.n);
      body = `<div class="cm-f"><label class="tb-inl"><input type="checkbox" id="unans" ${F.unans ? 'checked' : ''}> Solo sin respuesta del equipo</label>${pick(works, F.work)}</div>
        <div class="lg-list">${list.map(m => `<div class="cm-row" data-c="${m.id}"><span class="cm-w"><span class="mono"><a href="/leer/${esc(m.series_slug)}/${m.ch_num}">${esc((m.series_title || '').toUpperCase())} · ${esc(chLbl(m.ch_num, m.ch_title))}</a>${m.para != null ? ' · párrafo ' + (m.para + 1) : ''}${m.pinned ? ' · <b style="color:#f2c230">FIJADO</b>' : ''}</span>
          <span class="cm-body">${m.spoiler ? '<span class="cm-sp">SPOILER</span> ' : ''}${esc(m.body)}</span>
          <small>${esc(m.username || 'Lector')}${m.from_team ? ' · <b style="color:#f2c230">EQUIPO</b>' : ''} · ${ago(m.created_at)}${m.replies ? ' · ' + m.replies + (m.replies === 1 ? ' respuesta' : ' respuestas') : ''}${m.team_replied ? ' · <span style="color:#a9d18e">✓ respondido</span>' : ''}</small>
          <div class="cm-reply" hidden><textarea rows="2" maxlength="2000" placeholder="Responder como ${esc(T.team.name)}…" aria-label="Respuesta"></textarea><span><button class="btn" data-send="${m.id}" data-ch="${m.chapter_id}">Responder</button><button class="btn ghost" data-cancel="1">Cancelar</button></span></div></span>
          <span class="cm-a"><button class="btn ghost" data-rep="${m.id}">Responder</button>${mod ? `<button class="lnk" data-pin="${m.id}" data-on="${!m.pinned}">${m.pinned ? 'Desfijar' : 'Fijar'}</button><button class="lnk danger" data-del="${m.id}">Borrar</button>` : ''}</span></div>`).join('') || `<p class="tb-empty">${F.unans ? 'Ningún comentario espera respuesta.' : 'Aún no hay comentarios.'}</p>`}</div>
        ${(coms || []).length > F.n ? '<button class="btn ghost" id="more">Cargar más</button>' : ''}
        <p class="mono">Tu respuesta aparece con tu usuario y la marca EQUIPO, y quien comentó recibe un aviso. Fijar deja un comentario arriba en su capítulo.</p>`;
    }
    app.querySelector('.s2-main').innerHTML = app.querySelector('.s2-head').outerHTML + `<div class="lg"><div class="cm-tabs" role="tablist">${[['erratas','Erratas'],['comentarios','Comentarios']].map(([k, l]) => `<button role="tab" aria-selected="${F.tab === k}" class="${F.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}</div>`;
    const again = o => { Object.assign(F, o); community(); };
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => again({ tab: b.dataset.tab, n: 50 }));
    app.querySelectorAll('[data-st]').forEach(b => b.onclick = () => again({ st: b.dataset.st, n: 50 }));
    $('#fs').onchange = e => again({ work: e.target.value, n: 50 });
    $('#unans')?.addEventListener('change', e => again({ unans: e.target.checked, n: 50 }));
    $('#more')?.addEventListener('click', () => again({ n: F.n + 50 }));
    const setRep = (id, status) => async () => { const { error } = await sb.from('reports').update({ status }).eq('id', id); if (error) throw new Error(errMsg(error)); toast(status === 'fixed' ? 'Errata corregida · avisamos a quien la reportó' : status === 'dismissed' ? 'Errata descartada' : 'Errata reabierta'); community(); };
    app.querySelectorAll('[data-rfix]').forEach(b => b.onclick = () => busy(b, setRep(b.dataset.rfix, 'fixed')));
    app.querySelectorAll('[data-rdis]').forEach(b => b.onclick = () => busy(b, setRep(b.dataset.rdis, 'dismissed')));
    app.querySelectorAll('[data-rre]').forEach(b => b.onclick = () => busy(b, setRep(b.dataset.rre, 'open')));
    app.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => { const box = b.closest('.cm-row').querySelector('.cm-reply'); box.hidden = false; box.querySelector('textarea').focus(); });
    app.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { b.closest('.cm-reply').hidden = true; });
    app.querySelectorAll('[data-send]').forEach(b => b.onclick = () => busy(b, async () => { const tx = b.closest('.cm-reply').querySelector('textarea').value.trim(); if (!tx) throw new Error('Escribe una respuesta'); const { error } = await sb.from('comments').insert({ chapter_id: b.dataset.ch, parent_id: +b.dataset.send, user_id: me, body: tx }); if (error) throw new Error(errMsg(error)); toast('Respuesta publicada'); community(); }));
    app.querySelectorAll('[data-pin]').forEach(b => b.onclick = () => busy(b, async () => { await rpc('comment_pin', { p_id: +b.dataset.pin, p_on: b.dataset.on === 'true' }); toast(b.dataset.on === 'true' ? 'Comentario fijado' : 'Comentario desfijado'); community(); }));
    app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => busy(b, async () => { if (!confirm('¿Borrar este comentario y sus respuestas?')) return; const { error } = await sb.from('comments').delete().eq('id', b.dataset.del); if (error) throw new Error(errMsg(error)); toast('Comentario borrado'); community(); }));
  }

  async function stats(){
    if (!(await ensure())) return;
    const works = await teamWorks();
    const F = stats.f || (stats.f = { work: '', days: 30, sort: 'order' });
    if (!F.work || !works.some(w => w.id === F.work)) F.work = works[0]?.id || '';
    app.innerHTML = shell('Estadísticas', works.length ? '<p class="mono">Calculando…</p>' : '<p class="tb-empty">Aún no hay obras.</p>', '/estudio/estadisticas'); bindPicker(stats);
    if (!works.length) return;
    const d = await rpc('series_stats', { p_series: F.work, p_days: F.days });
    const fbP = sb.rpc('series_feedback', { p_series: F.work });
    const chs = d.chapters || [], daily = d.daily || [], w = works.find(x => x.id === F.work), c = wcolor(w);
    const sum = k => chs.reduce((a, x) => a + (+x[k] || 0), 0), fmt = n => (+n || 0).toLocaleString('es-MX');
    const base = Math.max(1, +chs[0]?.finished || 0), maxD = Math.max(1, ...daily.map(x => +x.n));
    const kpi = (l, v, n, col) => `<div class="s2-kpi" style="--c:${col}"><small>${l}</small><b>${v}</b><span>${n}</span></div>`;
    const sorted = [...chs].sort((a, b) => F.sort === 'order' ? 0 : (+b[F.sort] || 0) - (+a[F.sort] || 0));
    const col = (k, l) => `<th scope="col"><button class="st-sort ${F.sort === k ? 'on' : ''}" data-sort="${k}">${l}</button></th>`;
    const dayL = s => fmtTz(s + 'T12:00', { day: 'numeric', month: 'short' });
    const hasData = sum('views_total') + sum('finished') + sum('comments') > 0;
    app.querySelector('.s2-main').innerHTML = app.querySelector('.s2-head').outerHTML + `<div class="lg">
      <div class="cm-f">${pick(works, F.work, 'fs', '')}<span class="lg-chips">${[[7,'7 días'],[30,'30 días'],[90,'90 días']].map(([k, l]) => `<button class="ed-chip ${F.days === k ? 'on' : ''}" aria-pressed="${F.days === k}" data-days="${k}">${l}</button>`).join('')}</span></div>
      <div class="s2-kpis" style="margin:0">${kpi('Vistas · ' + F.days + ' días', fmt(sum('views')), fmt(sum('views_total')) + ' en total', c)}${kpi('Seguidores', fmt(d.followers), 'reciben aviso de cada volumen', '#8cc3f2')}${kpi('Lecturas completas', fmt(sum('finished')), 'capítulos terminados por lectores con cuenta', '#a9d18e')}${kpi('Comentarios', fmt(sum('comments')), fmt(sum('reactions')) + ' reacciones', '#c9a8f2')}</div>
      <div id="st-fb"></div>
      <section class="s2-box"><div class="s2-bh"><h2>Vistas por día</h2><span class="mono">${dayL(daily[0]?.day)} – ${dayL(daily[daily.length - 1]?.day)}</span></div>
        <div class="st-bars" role="img" aria-label="Vistas por día en los últimos ${F.days} días">${daily.map(x => `<span title="${dayL(x.day)}: ${fmt(x.n)} vistas" style="height:${Math.max(2, Math.round(+x.n / maxD * 100))}%;background:${+x.n ? c : '#2f2a20'}"></span>`).join('')}</div>
        ${hasData ? '' : '<p class="mono" style="margin:8px 0 0">Las vistas por capítulo se cuentan desde hoy: una por lector, capítulo y día.</p>'}</section>
      <div class="st-tw" role="region" aria-label="Estadísticas de capítulos" tabindex="0"><table class="st-t"><thead><tr>${col('order', 'Capítulo')}${col('views', 'Vistas')}${col('views_total', 'Total')}${col('finished', 'Terminaron')}<th scope="col">Retención</th>${col('here', 'Se quedaron aquí')}${col('comments', 'Coment.')}${col('reactions', 'Reacc.')}${col('reports', 'Erratas')}</tr></thead>
        <tbody>${sorted.map(x => { const r = Math.min(100, Math.round(+x.finished / base * 100)); return `<tr><th scope="row"><a href="/estudio/editar/${x.id}">${esc(x.section_type && x.section_type !== 'Capítulo' ? x.section_type : chLbl(x.num, x.title))}</a><small>Vol. ${x.vol}${x.publish_at ? ' · ' + fmtTz(x.publish_at, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small></th>
          <td>${fmt(x.views)}</td><td>${fmt(x.views_total)}</td><td>${fmt(x.finished)}</td><td><span class="st-ret" title="${r} % de quienes terminaron el primero"><i style="width:${r}%;background:${c}"></i></span><small>${r} %</small></td><td>${+x.here ? fmt(x.here) : '—'}</td><td>${fmt(x.comments)}</td><td>${fmt(x.reactions)}</td><td style="color:${+x.reports ? '#f59e7a' : ''}">${+x.reports ? fmt(x.reports) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="9" class="tb-empty">Sin capítulos publicados.</td></tr>'}</tbody></table></div>
      <p class="mono">«Terminaron» y «Se quedaron aquí» solo cuentan lectores con cuenta. Retención: terminaron este capítulo / terminaron el primero. «Se quedaron aquí» son quienes lo empezaron y no han seguido: un número alto puede indicar un capítulo difícil.</p></div>`;
    fbP.then(({ data: fb, error }) => { const el = document.getElementById('st-fb'); if (!el || error || !fb) return;
      const RL = { leidas: 'Más leídas', tendencia: 'Tendencia', calificadas: 'Mejor calificadas', terminadas: 'Más terminadas', novedades: 'Novedades en ascenso' }, PL = { semana: 'esta semana', historico: 'histórico' };
      const mx = Math.max(1, ...(fb.dist || []));
      el.innerHTML = `<section class="s2-box"><div class="s2-bh"><h2>Recepción</h2><span class="mono">calificaciones, reseñas y ranking</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:18px 28px">
          <div><b style="font-size:34px;font-family:'Shippori Mincho B1',serif;color:#f2c230">${fb.n ? (+fb.avg).toFixed(1) : '—'}</b><span class="mono"> / 5 · ${fmt(fb.n)} votos (${fmt(fb.month)} en 30 días)</span>
            <div style="display:grid;gap:4px;margin-top:8px">${[5, 4, 3, 2, 1].map(v => `<div style="display:grid;grid-template-columns:28px minmax(0,1fr) 36px;gap:8px;align-items:center;font-size:12px"><span class="mono">${v}★</span><span style="height:6px;background:#2f2a20"><i style="display:block;height:100%;width:${Math.round((fb.dist?.[v - 1] || 0) / mx * 100)}%;background:#f2c230"></i></span><span class="mono" style="text-align:right">${fb.dist?.[v - 1] || 0}</span></div>`).join('')}</div></div>
          <div><span class="mono" style="font-size:12px">EN EL RANKING</span>${(fb.ranks || []).length ? `<div style="display:grid;gap:6px;margin-top:8px">${fb.ranks.slice(0, 6).map(r => `<a href="/ranking?lista=${r.list}&periodo=${r.period}" style="display:flex;gap:10px;align-items:baseline;color:inherit;text-decoration:none"><b style="font-family:'Shippori Mincho B1',serif;font-size:20px;color:#f2c230;min-width:44px">#${r.pos}</b><span>${RL[r.list] || r.list} · ${PL[r.period] || r.period}${r.prev && r.prev !== r.pos ? ` <small class="mono" style="color:${r.prev > r.pos ? '#a9d18e' : '#f59e7a'}">${r.prev > r.pos ? '▲' : '▼'}${Math.abs(r.prev - r.pos)}</small>` : ''}</span></a>`).join('')}</div>` : '<p class="mono" style="margin:8px 0 0;font-size:13px">Todavía no entra en el Top 100. Las listas se recalculan cada 6 horas.</p>'}</div>
          <div style="grid-column:1/-1"><span class="mono" style="font-size:12px">RESEÑAS · ${fmt(fb.reviews_n)}</span>${(fb.reviews || []).length ? `<div style="display:grid;gap:10px;margin-top:8px">${fb.reviews.map(r => `<div style="padding:12px;border:1px solid #2f2a20"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><b>${esc(r.username || 'Lector')}</b><span style="color:#f2c230">${r.score ? '★'.repeat(r.score) : ''}</span></div><p style="margin:6px 0 0;font-size:14px;line-height:1.5">${esc(r.body)}</p></div>`).join('')}</div>` : '<p class="mono" style="margin:8px 0 0;font-size:13px">Aún no hay reseñas de esta obra.</p>'}</div>
        </div></section>`; });
    $('#fs').onchange = e => { F.work = e.target.value; stats(); };
    app.querySelectorAll('[data-days]').forEach(b => b.onclick = () => { F.days = +b.dataset.days; stats(); });
    app.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { F.sort = b.dataset.sort; stats(); });
  }

  const PROV = [[/drive\.google|docs\.google/, 'Google Drive'], [/mega\.(nz|io)/, 'MEGA'], [/mediafire/, 'MediaFire'], [/dropbox/, 'Dropbox'], [/terabox/, 'TeraBox'], [/1drv\.ms|onedrive/, 'OneDrive'], [/pixeldrain/, 'Pixeldrain']];
  const provOf = u => (PROV.find(([re]) => re.test(u)) || [, 'Enlace'])[1];
  const FMTS = ['EPUB','PDF','MOBI','AZW3','CBZ','DOCX','ZIP'];
  const STORES = ['Amazon Japón','BookWalker','Kindle','Kobo','Google Play Libros','Apple Books','J-Novel Club','Yen Press','Seven Seas','Ivrea','Panini','Planeta Cómic','Norma Editorial','Kamite','Editorial Kemuri','Otra tienda'];
  const REGIONS = ['Japón','EE. UU.','México','Argentina','España','Latinoamérica','Global'];
  let buys = [];
  async function downloads(){
    if (!(await ensure())) return;
    const works = await teamWorks();
    const F = downloads.f || (downloads.f = { work: '' });
    if (!F.work || !works.some(w => w.id === F.work)) F.work = works[0]?.id || '';
    app.innerHTML = shell('Descargas y compra', works.length ? '<p class="mono">Cargando…</p>' : '<p class="tb-empty">Aún no hay obras.</p>', '/estudio/descargas'); bindPicker(downloads);
    if (!works.length) return;
    const [{ data: vols }, { data: links }] = await Promise.all([
      sb.from('volumes').select('id,num,title,status').eq('series_id', F.work).is('deleted_at', null).order('num'),
      sb.from('download_links').select('*').eq('series_id', F.work).order('sort').order('id'),
      sb.from('purchase_links').select('*').eq('series_id', F.work).order('id')]).then(([a, b, c]) => { buys = c.data || []; return [a, b]; });
    const ed = can('edit');
    app.querySelector('.s2-main').innerHTML = app.querySelector('.s2-head').outerHTML + `<div class="lg">
      <div class="cm-f">${pick(works, F.work, 'fs', '')}<span class="mono">Aparecen en la ficha de la obra, debajo de cada volumen. Los enlaces de compra van primero.</span></div>
      ${(vols || []).map(v => { const ls = (links || []).filter(l => l.volume_id === v.id || (!l.volume_id && l.vol === v.num)); return `<section class="tm-box"><div class="tm-bh"><h2>Volumen ${v.num}${v.title && v.title !== String(v.num) && v.title.length > 2 && !/^volumen\s*\d+$/i.test(v.title.trim()) ? ' · ' + esc(v.title) : ''}</h2><span class="mono">${v.status === 'published' ? 'Publicado' : 'Sin publicar'} · ${ls.length} ${ls.length === 1 ? 'enlace' : 'enlaces'}</span></div>
        ${ls.map(l => `<div class="dl-row"><span class="dl-f">${esc(l.fmt)}</span><span class="tm-n"><b>${esc(l.label || l.provider || provOf(l.url))}</b><small><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url.replace(/^https:\/\//, '').slice(0, 60))}</a></small></span><span class="mono">${l.donor_only ? '援 Solo donadores' : 'Para todos'} · ${(l.clicks || 0).toLocaleString('es-MX')} descargas</span>${ed ? `<span class="tm-a"><button class="lnk" data-dtog="${l.id}" data-on="${!l.donor_only}">${l.donor_only ? 'Abrir a todos' : 'Solo donadores'}</button><button class="lnk danger" data-ddel="${l.id}">Quitar</button></span>` : '<span></span>'}</div>`).join('')}
        ${(() => { const bs = buys.filter(b => b.volume_id === v.id || (!b.volume_id && b.vol === v.num)); return `<div class="dl-buyh"><b>Compra oficial</b><span class="mono">El Bibliotecario verifica cada enlace antes de que se muestre</span></div>${bs.map(b => `<div class="dl-row"><span class="dl-f buy">${esc(b.fmt || 'Digital')}</span><span class="tm-n"><b>${esc(b.store)}${b.region ? ' · ' + esc(b.region) : ''}</b><small><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.url.replace(/^https:\/\//, '').slice(0, 60))}</a></small></span><span class="mono" style="color:${b.verified ? '#a9d18e' : '#f2c230'}">${b.verified ? '✓ Verificado · ' + (b.clicks || 0).toLocaleString('es-MX') + ' clics' : '◷ Pendiente de verificar'}</span>${ed ? `<span class="tm-a"><button class="lnk danger" data-bdel="${b.id}">Quitar</button></span>` : '<span></span>'}</div>`).join('')}${ed ? `<form class="dl-add buy-add" data-vol="${v.id}" data-num="${v.num}"><select name="store" aria-label="Tienda">${STORES.map(s => `<option>${s}</option>`).join('')}</select><select name="region" aria-label="Región">${REGIONS.map(s => `<option>${s}</option>`).join('')}</select><select name="fmt" aria-label="Formato"><option>Digital</option><option>Físico</option><option>Audiolibro</option></select><input name="url" type="url" required placeholder="https://… (tienda oficial)" aria-label="Enlace de compra"><button class="btn ghost">Proponer</button></form>` : ''}`; })()}
        ${ed ? `<form class="dl-add" data-vol="${v.id}" data-num="${v.num}"><select name="fmt" aria-label="Formato">${FMTS.map(f => `<option>${f}</option>`).join('')}</select><input name="url" type="url" required placeholder="https://drive.google.com/…" aria-label="Enlace"><input name="label" maxlength="60" placeholder="Nombre (opcional)" aria-label="Nombre del enlace"><label class="tb-inl"><input type="checkbox" name="donor"> Solo donadores</label><button class="btn">Agregar</button></form>` : ''}</section>`; }).join('') || '<p class="tb-empty">Esta obra aún no tiene volúmenes.</p>'}
      <p class="mono">Los enlaces «Solo donadores» no se muestran a nadie más: el sitio pide el enlace al servidor solo cuando un donador pulsa «Descargar».</p></div>`;
    $('#fs').onchange = e => { F.work = e.target.value; downloads(); };
    app.querySelectorAll('.buy-add').forEach(f => f.onsubmit = e => { e.preventDefault(); e.stopImmediatePropagation(); busy(e.submitter, async () => {
      const u = f.url.value.trim(); if (!/^https:\/\//.test(u)) throw new Error('El enlace debe empezar con https://');
      const { error } = await sb.from('purchase_links').insert({ series_id: F.work, volume_id: f.dataset.vol, vol: +f.dataset.num, store: f.store.value, region: f.region.value, fmt: f.fmt.value, url: u, verified: false, created_by: getUser().id });
      if (error) throw new Error(errMsg(error)); toast('Enlace propuesto · se mostrará cuando el Bibliotecario lo verifique'); downloads(); }); });
    app.querySelectorAll('[data-bdel]').forEach(b => b.onclick = () => busy(b, async () => { if (!confirm('¿Quitar este enlace de compra?')) return; const { error } = await sb.from('purchase_links').delete().eq('id', b.dataset.bdel); if (error) throw new Error(errMsg(error)); downloads(); }));
    app.querySelectorAll('.dl-add:not(.buy-add)').forEach(f => f.onsubmit = e => { e.preventDefault(); busy(e.submitter, async () => {
      const u = f.url.value.trim(); if (!/^https:\/\//.test(u)) throw new Error('El enlace debe empezar con https://');
      const { error } = await sb.from('download_links').insert({ series_id: F.work, volume_id: f.dataset.vol, vol: +f.dataset.num, fmt: f.fmt.value, url: u, provider: provOf(u), label: f.label.value.trim() || null, donor_only: f.donor.checked, sort: Date.now() % 1e6 });
      if (error) throw new Error(errMsg(error)); toast('Enlace agregado'); downloads(); }); });
    app.querySelectorAll('[data-dtog]').forEach(b => b.onclick = () => busy(b, async () => { const { error } = await sb.from('download_links').update({ donor_only: b.dataset.on === 'true' }).eq('id', b.dataset.dtog); if (error) throw new Error(errMsg(error)); downloads(); }));
    app.querySelectorAll('[data-ddel]').forEach(b => b.onclick = () => busy(b, async () => { if (!confirm('¿Quitar este enlace?')) return; const { error } = await sb.from('download_links').delete().eq('id', b.dataset.ddel); if (error) throw new Error(errMsg(error)); toast('Enlace quitado'); downloads(); }));
  }

  // ---------- Anuncios: tarjeta destacada en la página pública del equipo ----------
  async function announcements(){
    if (!(await ensure())) return;
    const TAB = '/estudio/anuncios';
    const [TP, { data: tm }] = await Promise.all([import('./teampage.js?v=12'), sb.from('teams').select('design,color').eq('id', T.team.id).maybeSingle()]);
    TP.ensureFonts();
    const pub = TP.normalize(tm?.design, tm?.color).announce, ed = can('profile');
    let A = { ...pub };
    const today = () => new Date().toISOString().slice(0, 10), live = x => (x.title || x.text) && (!x.until || x.until >= today());
    const state = x => !x.title && !x.text ? ['Sin anuncio', '#a89f8a'] : x.until && x.until < today() ? ['Caducado · ya no se muestra', '#f59e7a'] : ['Publicado · visible en la página', '#a9d18e'];
    app.innerHTML = shell('Anuncios', `<div class="an">
      <section class="an-box"><div class="an-h"><h2>Anuncio del equipo</h2><span class="mono" id="an-st" style="color:${state(pub)[1]}">● ${state(pub)[0]}</span></div>
        <p class="mono">Se muestra como tarjeta destacada en <a href="/equipo/${esc(T.team.slug)}" target="_blank" rel="noopener">tu página pública ↗</a>. El lugar en la página se elige en <a href="/estudio/preferencias">Preferencias › Secciones y orden</a>.</p>
        ${ed ? '' : '<p class="tb-empty">Tu rol no permite publicar anuncios. Pide el permiso «Perfil».</p>'}
        <div class="an-f">
          <label>Título<input id="an-t" maxlength="80" value="${esc(A.title)}" placeholder="p. ej. ¡Volumen 3 este viernes!" ${ed ? '' : 'disabled'}></label>
          <label><span class="an-lh">Texto<span class="mono" id="an-c">${A.text.length} / 300</span></span><textarea id="an-x" rows="4" maxlength="300" ${ed ? '' : 'disabled'}>${esc(A.text)}</textarea></label>
          <div class="an-2"><label>Texto del botón<input id="an-l" maxlength="30" value="${esc(A.label)}" placeholder="Ver más" ${ed ? '' : 'disabled'}></label><label>Enlace<input id="an-u" maxlength="400" value="${esc(A.url)}" placeholder="https://… o /serie/…" ${ed ? '' : 'disabled'}></label></div>
          <label>Se oculta solo después del<input id="an-d" type="date" value="${esc(A.until)}" ${ed ? '' : 'disabled'}></label>
          <p class="mono" id="an-n"></p>
          ${ed ? '<div class="an-a"><button class="btn" id="an-pub">Publicar anuncio</button><button class="btn ghost" id="an-del">Quitar anuncio</button><span class="mono" id="an-dirty"></span></div>' : ''}
        </div></section>
      <section class="an-box"><div class="an-h"><h2>Vista previa</h2><span class="mono">con el diseño publicado de tu página</span></div><div class="an-pv" id="an-pv"></div></section></div>`, TAB);
    bindPicker(announcements);
    const draw = () => { const d = TP.normalize({ ...(tm?.design || {}), announce: A }, tm?.color); $('#an-pv').innerHTML = live(TP.normalize({ announce: A }).announce) ? `<div class="tp2w"><div class="tp2" data-cover="${d.cover}" data-btn="${d.button}" style="${TP.vars(d)};padding:18px;min-height:0">${TP.render({ t: { id: T.team.id, name: T.team.name, slug: T.team.slug, settings: { show_works: false, show_stats: false, show_members: false, show_featured: false } }, works: [], mem: [], next: null }, { ...d, order: ['announce'], hidden: [] }, { esc, media }).match(/<aside class="tp2-ann">[\s\S]*?<\/aside>/)?.[0] || ''}</div></div>` : `<p class="tb-empty">${A.title || A.text ? 'Con esa fecha el anuncio ya no se mostraría.' : 'Escribe un título o un texto para ver el anuncio.'}</p>`; const ok = !A.url || /^(https:\/\/|\/)[^\s"'<>]{0,400}$/.test(A.url); $('#an-n').textContent = ok ? '' : 'El enlace debe empezar con https:// o con / (una página del sitio).'; $('#an-n').style.color = '#f59e7a'; const dirty = JSON.stringify(A) !== JSON.stringify(pub); const dd = $('#an-dirty'); if (dd) dd.textContent = dirty ? 'Cambios sin publicar' : ''; const pb = $('#an-pub'); if (pb) pb.disabled = !dirty || !ok; };
    const read = () => { A = { title: $('#an-t').value.trim(), text: $('#an-x').value.trim(), label: $('#an-l').value.trim(), url: $('#an-u').value.trim(), until: $('#an-d').value }; $('#an-c').textContent = $('#an-x').value.length + ' / 300'; draw(); };
    ['#an-t', '#an-x', '#an-l', '#an-u', '#an-d'].forEach(s => $(s).oninput = read);
    const send = async x => { await rpc('team_announce_set', { p_team: T.team.id, p_announce: x }); Object.assign(pub, x); const st = state(pub), el = $('#an-st'); el.textContent = '● ' + st[0]; el.style.color = st[1]; draw(); };
    $('#an-pub')?.addEventListener('click', e => busy(e.currentTarget, async () => { await send(A); toast('Anuncio publicado'); }));
    $('#an-del')?.addEventListener('click', e => busy(e.currentTarget, async () => { if (!confirm('¿Quitar el anuncio de la página del equipo?')) return; A = { title: '', text: '', label: '', url: '', until: '' }; ['#an-t', '#an-x', '#an-l', '#an-u', '#an-d'].forEach(s => $(s).value = ''); $('#an-c').textContent = '0 / 300'; await send(A); toast('Anuncio quitado'); }));
    draw();
  }

  // ---------- Preferencias: diseño de la página pública del equipo ----------
  async function prefs(){
    if (!(await ensure())) return;
    const TAB = '/estudio/preferencias';
    if (!can('profile')) { app.innerHTML = shell('Preferencias de la página', '<p class="tb-empty">Tu rol no permite personalizar la página del equipo. Pide el permiso «Perfil» a quien administra el equipo.</p>', TAB); bindPicker(prefs); return; }
    const [TP, AN] = await Promise.all([import('./teampage.js?v=12'), import('./anim.js?v=8')]); TP.ensureFonts(TP.ALL_FONTS);
    app.innerHTML = shell('Preferencias de la página', '<p class="mono">Cargando…</p>', TAB); bindPicker(prefs);
    const [D, { data: dr }, { data: ct }] = await Promise.all([TP.loadTeamData(sb, T.team.slug), sb.from('team_design_drafts').select('design,token,updated_at').eq('team_id', T.team.id).maybeSingle(), sb.from('team_custom_themes').select('id,name,design,updated_at').eq('team_id', T.team.id).order('name')]);
    let mine = ct || [];
    if (!D) throw new Error('No encontré la página del equipo');
    let d = TP.normalize(dr?.design && Object.keys(dr.design).length ? dr.design : D.t.design, D.t.color), token = dr?.token || null, saveT = 0, savedAt = dr?.updated_at || null, saving = false;
    let savedDesign = dr?.design && Object.keys(dr.design).length ? JSON.stringify(TP.normalize(dr.design, D.t.color)) : null;
    const pubJSON = () => JSON.stringify(TP.normalize(D.t.design, D.t.color)), pending = () => JSON.stringify(d) !== pubJSON();
    const UI = { dev: matchMedia('(max-width:767px)').matches ? 'mobile' : 'desk', mobDeco: null, open: new Set() };
    const CLIP = [['.pf-mine', 3, 'temas'], ['.pf-themes', 4, 'temas'], ['.pf-fonts', 6, 'tipografías'], ['.pf-pats', 8, 'patrones'], ['#pf-hist', 3, 'versiones'], ['.pf-featpick', 5, 'obras']];
    const clip = () => CLIP.forEach(([sel, n, w]) => { const box = app.querySelector(sel); if (!box) return; const kids = [...box.children].filter(k => !k.classList.contains('pf-more')); box.querySelector(':scope > .pf-more')?.remove(); if (kids.length <= n) return; const open = UI.open.has(sel), hid = kids.slice(n).filter(k => !k.classList.contains('on') && !k.querySelector('.on')); kids.forEach(k => k.hidden = false); if (!open) hid.forEach(k => k.hidden = true); const b = document.createElement('button'); b.type = 'button'; b.className = 'pf-more'; b.setAttribute('aria-expanded', open); b.textContent = open ? 'Ver menos' : `Ver más ${w} (${hid.length})`; b.onclick = () => { open ? UI.open.delete(sel) : UI.open.add(sel); clip(); }; box.appendChild(b); });
    const seg = (k, opts, extra = '') => `<div class="pf-seg" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<button type="button" role="radio" aria-checked="${d[k] === v}" class="${d[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}" ${extra}>${esc(Array.isArray(l) ? l[0] : l)}</button>`).join('')}</div>`;
    const mineHTML = () => { const curId = d.theme?.startsWith?.('mine:') ? +d.theme.slice(5) : null; return `<section class="pf-g"><h3>Mis temas</h3>
        ${mine.length ? `<div class="pf-mine">${mine.map(m => { const x = TP.normalize(m.design, D.t.color), B = TP.palette(x); return `<div class="pf-mt ${curId === m.id ? 'on' : ''}"><button type="button" class="pf-th" data-mine="${m.id}" style="background:${B.bg};color:${B.fg}" aria-pressed="${curId === m.id}"><span class="pf-sw" style="background:${x.accent}"></span><b style="font-family:${TP.TFONTS[x.font][1]}">${esc(m.name)}</b><small style="color:${B.mu}">${TP.TEMPLATES[x.template][0]} · ${TP.BGS[x.bg].l}</small></button><span class="pf-ma"><button class="lnk" data-mexp="${m.id}">Exportar</button>${curId === m.id ? `<button class="lnk" data-mupd="${m.id}">Guardar cambios en este tema</button>` : ''}<button class="lnk" data-mren="${m.id}">Renombrar</button><button class="lnk danger" data-mdel="${m.id}">Borrar</button></span></div>`; }).join('')}</div>` : '<p class="pf-note">Aún no tienes temas propios. Ajusta colores, fondo, tipografía y formas, y guárdalo con un nombre.</p>'}
        ${mine.length < 12 ? `<div class="pf-save"><input id="pf-tname" maxlength="40" placeholder="Nombre del tema, p. ej. Otoño del equipo" aria-label="Nombre del tema"><button type="button" class="btn sm" id="pf-tsave">Guardar como tema</button></div>` : '<p class="pf-note">Llegaste al máximo de 12 temas propios.</p>'}
        <div class="pf-io"><button type="button" class="lnk" id="pf-exp">Exportar el diseño actual</button><label class="lnk" style="cursor:pointer">Importar tema…<input type="file" id="pf-imp" accept=".json,application/json" hidden></label></div>
        <p class="pf-note">Tus temas son privados del equipo. Aplicar uno solo cambia el borrador.</p></section>`; };
    const panel = () => `
      ${mineHTML()}
      <section class="pf-g"><h3>Temas listos</h3><div class="pf-themes">${Object.entries(TP.THEMES).map(([k, th]) => { const B = TP.BGS[th.d.bg]; return `<button type="button" class="pf-th ${d.theme === k ? 'on' : ''}" data-theme="${k}" aria-pressed="${d.theme === k}" style="background:${B.bg};color:${B.fg}"><span class="pf-sw" style="background:${th.d.accent}"></span><b style="font-family:${TP.TFONTS[th.d.font][1]}">${th.l}</b><small style="color:${B.mu}">${TP.TEMPLATES[th.d.template][0]} · ${B.l}</small></button>`; }).join('')}</div>
        <p class="pf-note">Un tema llena todas las opciones de abajo. Después puedes ajustar cada una.</p></section>
      <section class="pf-g"><h3>Plantilla</h3><div class="pf-tpls">${Object.entries(TP.TEMPLATES).map(([k, [l, h]]) => `<button type="button" class="pf-tpl ${d.template === k ? 'on' : ''}" data-k="template" data-v="${k}" aria-pressed="${d.template === k}"><i class="pf-ic pf-ic-${k}" aria-hidden="true"></i><b>${l}</b><small>${h}</small></button>`).join('')}</div></section>
      <section class="pf-g"><h3>Color y fondo</h3>
        <label class="pf-row"><span>Acento</span><span class="pf-col"><input type="color" id="pf-ac" value="${d.accent}" aria-label="Color de acento"><input id="pf-hex" value="${d.accent}" maxlength="7" spellcheck="false" aria-label="Código del color"></span></label>
        <div class="pf-row"><span>Fondo</span>${seg('bg', Object.fromEntries(Object.entries(TP.BGS).map(([k, v]) => [k, v.l])))}</div>
        ${d.bg === 'propio' ? `<div class="pf-cust">${[['bg', 'Fondo'], ['sf', 'Tarjetas'], ['fg', 'Texto']].map(([k, l]) => `<label class="pf-row"><span>${l}</span><span class="pf-col"><input type="color" data-cc="${k}" value="${d.custom[k]}" aria-label="Color de ${l.toLowerCase()}"><input data-cx="${k}" value="${d.custom[k]}" maxlength="7" spellcheck="false" aria-label="Código de ${l.toLowerCase()}" class="pf-hx"></span></label>`).join('')}</div>` : ''}
        <p class="pf-note" id="pf-ctr"></p></section>
      <section class="pf-g"><h3>Tipografía de títulos</h3><div class="pf-fonts">${Object.entries(TP.TFONTS).map(([k, [l, f, w]]) => `<button type="button" class="pf-f ${d.font === k ? 'on' : ''}" data-k="font" data-v="${k}" aria-pressed="${d.font === k}"><b style="font-family:${f};font-weight:${w}">${esc(D.t.name)}</b><small>${l}</small></button>`).join('')}</div></section>
      <section class="pf-g"><h3>Formas</h3>
        <div class="pf-row"><span>Portadas</span>${seg('cover', TP.COVERS)}</div>
        <div class="pf-row"><span>Botones</span>${seg('button', TP.BUTTONS)}</div>
        <div class="pf-row"><span>Logo</span>${seg('logo', TP.LOGOS)}</div></section>
      <section class="pf-g"><h3>Patrón de fondo</h3><div class="pf-pats">${Object.entries(TP.PATTERNS).map(([k, l]) => `<button type="button" class="pf-pt ${d.pattern === k ? 'on' : ''}" data-k="pattern" data-v="${k}" aria-pressed="${d.pattern === k}" title="${l}"><span style="${TP.vars({ ...d, pattern: k, patternOp: 40 })}"></span><small>${l.split(' · ')[0]}</small></button>`).join('')}</div>
        <label class="pf-row"><span>Intensidad</span><span class="pf-col"><input type="range" id="pf-op" min="0" max="30" value="${d.patternOp}" ${d.pattern === 'none' ? 'disabled' : ''} aria-label="Intensidad del patrón"><output id="pf-opv">${d.patternOp} %</output></span></label></section>
      <section class="pf-g"><h3>Lema</h3><label class="pf-lbl"><span class="pf-lh">Aparece bajo el nombre del equipo<span class="mono" id="pf-mc">${d.motto.length} / 120</span></span><input id="pf-motto" maxlength="120" value="${esc(d.motto)}" placeholder="p. ej. Traducciones con cariño desde 2019"></label></section>
      <section class="pf-g"><h3>Secciones y orden</h3><p class="pf-note">Arrastra para ordenar o usa las flechas. El ojo oculta una sección sin borrarla.</p>
        <ol class="pf-ord" id="pf-ord">${d.order.map((k, i) => `<li draggable="true" data-sec="${k}" class="${d.hidden.includes(k) ? 'off' : ''}"><span class="pf-grip" aria-hidden="true">⋮⋮</span><b>${TP.SECTIONS[k]}</b><span class="pf-oa"><button type="button" data-up="${i}" aria-label="Subir ${TP.SECTIONS[k]}" ${i ? '' : 'disabled'}>↑</button><button type="button" data-dn="${i}" aria-label="Bajar ${TP.SECTIONS[k]}" ${i < d.order.length - 1 ? '' : 'disabled'}>↓</button><button type="button" data-eye="${k}" aria-pressed="${!d.hidden.includes(k)}" aria-label="${d.hidden.includes(k) ? 'Mostrar' : 'Ocultar'} ${TP.SECTIONS[k]}">${d.hidden.includes(k) ? '◌' : '◉'}</button></span></li>`).join('')}</ol></section>
      <section class="pf-g"><h3>Anuncio</h3><p class="pf-note">El anuncio ahora tiene su propia sección: <a href="/estudio/anuncios">Estudio › Anuncios</a>. Aquí solo decides dónde va en el orden de arriba.</p></section>
      <section class="pf-g"><h3>Obras destacadas</h3><p class="pf-note">Hasta 3. Con más de una se muestran en carrusel.</p>
        <div class="pf-featpick">${D.works.map(w => { const i = d.featured.indexOf(w.slug); return `<label class="pf-fw ${i >= 0 ? 'on' : ''}"><input type="checkbox" data-feat="${esc(w.slug)}" ${i >= 0 ? 'checked' : ''}><span>${esc(w.short || w.title)}</span>${i >= 0 ? `<em>${i + 1}</em>` : ''}</label>`; }).join('') || '<p class="pf-note">Aún no hay obras publicadas.</p>'}</div></section>
      <section class="pf-g"><h3>Animaciones</h3>
        <div class="pf-tg">${Object.entries(TP.ANIMS).map(([k, l]) => `<label class="pf-sw2"><input type="checkbox" data-an="${k}" ${d.anim[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <div class="pf-row"><span>Intensidad</span>${seg('intensity', TP.INTENS)}</div>
        ${d.anim.particles ? `<div class="pf-cust"><label class="pf-lbl">Partículas<select id="pf-pt">${Object.entries(TP.PARTS).map(([k, l]) => `<option value="${k}" ${d.part.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <div class="pf-row"><span>Cantidad</span><div class="pf-seg">${Object.entries(TP.DENS).map(([k, l]) => `<button type="button" data-pk="density" data-pv="${k}" class="${d.part.density === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="pf-row"><span>Dónde</span><div class="pf-seg">${[['banner', 'Solo banner'], ['page', 'Toda la página']].map(([k, l]) => `<button type="button" data-pk="where" data-pv="${k}" class="${d.part.where === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="pf-row"><span>Color</span><span class="pf-col"><div class="pf-seg">${[['accent', 'Acento'], ['custom', 'Propio']].map(([k, l]) => `<button type="button" data-pk="mode" data-pv="${k}" class="${d.part.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>${d.part.mode === 'custom' ? `<input type="color" id="pf-pc" value="${d.part.color}" aria-label="Color de las partículas">` : ''}</span></div></div>` : ''}
        <p class="pf-note">En celulares las animaciones van más ligeras, y no se muestran a quien tiene activado «reducir movimiento» en su dispositivo.</p></section>
      <section class="pf-g"><h3>Temas de temporada</h3>
        <p class="pf-note">Cambian colores, fondo y partículas en sus fechas. Marca cuáles se activan solos; te avisamos 7 días antes.</p>
        <div class="pf-row"><span>Hemisferio</span>${(() => { const h = d.seasons.hemi; return `<div class="pf-seg">${[['norte', 'Norte'], ['sur', 'Sur']].map(([k, l]) => `<button type="button" data-hemi="${k}" class="${h === k ? 'on' : ''}">${l}</button>`).join('')}</div>`; })()}</div>
        <div class="pf-row"><span>Decoración</span><div class="pf-seg">${[['full', 'Completa'], ['min', 'Solo colores']].map(([k, l]) => `<button type="button" data-deco="${k}" class="${d.seasons.deco === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <p class="pf-note">Completa: patrón de la temporada, figuras en las esquinas del banner, sello junto al nombre y detalles en títulos y tarjetas.</p>
        <label class="pf-lbl">Activar uno ahora (sin esperar su fecha)<select id="pf-sman"><option value="">Ninguno · seguir el calendario</option>${Object.entries(TP.SEASONS).map(([k, s]) => `<option value="${k}" ${d.seasons.manual === k ? 'selected' : ''}>${s.l}</option>`).join('')}</select></label>
        ${Object.entries(TP.SGROUPS || {}).length ? '' : ''}
        <div class="pf-seas">${Object.entries(AN.SGROUPS).map(([g, gl]) => `<details class="pf-sg" ${UI.sg === g ? 'open' : ''} data-sgd="${g}"><summary>${gl}<span class="mono">${Object.entries(TP.SEASONS).filter(([k, s]) => s.g === g && d.seasons.auto.includes(k)).length} automáticos</span></summary>
          ${Object.entries(TP.SEASONS).filter(([, s]) => s.g === g).map(([k, s]) => `<div class="pf-se"><label class="pf-sw2"><input type="checkbox" data-sauto="${k}" ${d.seasons.auto.includes(k) ? 'checked' : ''}><span><i class="pf-sw" style="background:${s.ac}"></i> ${s.l}</span></label><button type="button" class="lnk" data-sedit="${k}">${UI.se === k ? 'Cerrar' : 'Saludo y adorno'}</button>
            ${UI.se === k ? `<div class="pf-cust"><label class="pf-lbl">Saludo (opcional)<input data-sgreet="${k}" maxlength="140" value="${esc(d.seasons.greet[k] || '')}" placeholder="p. ej. ¡Feliz ${esc(s.l)} de parte del equipo!"></label>
              <label class="pf-sw2"><input type="checkbox" data-snoorn="${k}" ${d.seasons.noOrn.includes(k) ? '' : 'checked'}> Mostrar adorno en el banner${d.seasons.orn[k] ? ' (el tuyo)' : ' (incluido: guirnalda de la temporada)'}</label>
              <div class="pf-row"><span>Adorno propio</span><span class="pf-col">${d.seasons.orn[k] ? `<button class="lnk danger" data-sorn0="${k}">Quitar</button>` : ''}<label class="lnk" style="cursor:pointer">${d.seasons.orn[k] ? 'Cambiar' : 'Subir imagen'}<input type="file" accept="image/png,image/webp,image/gif" data-sorn="${k}" hidden></label></span></div>
              <p class="pf-note">Opcional: reemplaza la guirnalda incluida. PNG o WebP con fondo transparente, ancho; se repite a lo largo del borde inferior del banner. Máx. 2 MB.</p><button type="button" class="btn ghost sm" data-ssim="${k}">Ver en la vista previa</button></div>` : ''}</div>`).join('')}</details>`).join('')}</div></section>
      <section class="pf-g"><h3>Historial</h3><div id="pf-hist"><p class="pf-note">Cargando…</p></div><p class="pf-note">Se guardan las últimas 10 versiones publicadas. Restaurar una la pone en el borrador; no se publica hasta que pulses «Publicar cambios».</p></section>
      <p class="pf-note">Atajos: Ctrl+Z deshace y Ctrl+Shift+Z rehace.</p>
      <p class="pf-note">Todo lo de esta página se guarda en el borrador hasta que pulses «Publicar cambios». Nombre, bio, logo, banner y redes se editan en <a href="/estudio/perfil">Página del equipo</a>.</p>`;
    app.querySelector('.s2-main').innerHTML = app.querySelector('.s2-head').outerHTML + `<div class="pfx">
      <div class="pf-bar"><span class="pf-st" id="pf-st" role="status"></span><span class="pf-acts"><button class="btn ghost sm" id="pf-share" title="Compartir el borrador ya guardado, sin guardar ni publicar cambios">Copiar enlace de vista previa</button><button class="btn ghost sm" id="pf-discard">Descartar cambios</button><button class="btn sm" id="pf-pub">Publicar cambios</button><a class="lnk" href="/equipo/${esc(T.team.slug)}" target="_blank" rel="noopener">Ver página publicada ↗</a></span></div>
      <p class="pf-mob">Para editar la página usa una computadora o tableta. Aquí puedes simular temporadas sin guardar cambios y copiar el enlace de un borrador ya guardado.</p>
      <div class="pf-grid"><aside class="pf-panel" id="pf-panel">${panel()}</aside>
        <div class="pf-pvw"><div class="pf-mobile-sim" aria-label="Simulación móvil de temporadas">
          <strong>Temas de temporada · Vista previa móvil</strong>
          <p class="pf-note">Puedes visualizar temporadas y adornos sin guardar ni publicar cambios. La edición completa está disponible en tableta o computadora.</p>
          <label class="pf-lbl" for="pf-msim">Temporada a visualizar</label>
          <select id="pf-msim" aria-label="Temporada a visualizar"><option value="auto">Según la fecha del equipo</option><option value="">Sin temporada</option>${Object.entries(AN.SEASONS).map(([k,s]) => `<option value="${k}">${esc(s.l)}</option>`).join('')}</select>
          <span class="pf-note">Tipo de decoración (solo simulación)</span>
          <div class="pf-mobile-dec" role="group" aria-label="Tipo de decoración">
            <button type="button" data-mdeco="full" aria-pressed="false">Completa</button>
            <button type="button" data-mdeco="min" aria-pressed="false">Solo colores</button>
          </div>
          <span class="pf-note" role="status">La simulación no altera el borrador ni el tema publicado.</span>
        </div><div class="pf-pvbar"><span class="mono" id="pf-pvl">VISTA PREVIA DEL BORRADOR</span><button type="button" class="ed-btn" id="pf-cmp" aria-pressed="false">Comparar con lo publicado</button><select id="pf-sim" aria-label="Simular temporada" class="pf-simsel"><option value="auto">Temporada: según la fecha</option><option value="">Sin temporada</option>${Object.entries(AN.SEASONS).map(([k, s]) => `<option value="${k}">Simular ${s.l}</option>`).join('')}</select><span class="pf-seg"><button type="button" data-dev="desk">Escritorio</button><button type="button" data-dev="mobile">Móvil</button></span></div><div class="pf-frame" id="pf-frame"></div></div></div></div>`;
    // La edición de la lectura del equipo es independiente de la vista previa visual.
    const teamDefaultsUser = getUser()?.id, teamDefaultsTeam = T.team.id;
    void mountTeamReaderDefaults({ app, sb, teamId: teamDefaultsTeam, esc, notify: toast,
      allowed: () => getUser()?.id === teamDefaultsUser && T.team?.id === teamDefaultsTeam && can('profile')
    }).catch(e => toast(e.message || 'No se pudieron cargar los predeterminados de lectura'));
    let pvQ = 0, showPub = false;
    const pvNow = () => { pvQ = 0; const f = $('#pf-frame'); if (!f) return; const previewBase = showPub ? D.t.design : d, previewDesign = matchMedia('(max-width:767px)').matches && UI.mobDeco ? { ...previewBase, seasons: { ...previewBase?.seasons, deco: UI.mobDeco } } : previewBase; const cmp = $('#pf-cmp'); if (cmp) { cmp.classList.toggle('on', showPub); cmp.setAttribute('aria-pressed', showPub); cmp.textContent = showPub ? 'Viendo lo publicado' : 'Comparar con lo publicado'; } $('#pf-pvl').textContent = showPub ? 'VERSIÓN PUBLICADA' : 'VISTA PREVIA DEL BORRADOR'; f.classList.toggle('mobile', UI.dev === 'mobile'); UI.stop?.(); f.innerHTML = TP.render(D, previewDesign, { esc, media, sim: UI.sim, top: '<div class="tp2-top"><a class="tp2-edit" href="#">⚙ Personalizar</a></div>' + (D.t.design && JSON.stringify(TP.normalize(D.t.design, D.t.color)) !== JSON.stringify(d) && !showPub ? '<div class="tp2-draft"><b>Vista previa del borrador</b><span>Así se verá la página cuando publiques los cambios.</span></div>' : '') }); f.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.preventDefault())); const rt = f.querySelector('.tp2'); TP.bind(rt); TP.fillFollow(rt, false, 0); UI.stop = AN.animate(rt, TP.effective(previewDesign, D.t.color, UI.sim), { scroller: f, mobile: UI.dev === 'mobile' }); const sl = $('#pf-sim'); if (sl) sl.value = UI.sim ?? 'auto'; const ms = $('#pf-msim'); if (ms) ms.value = UI.sim ?? 'auto'; app.querySelectorAll('[data-mdeco]').forEach(b => { const chosen = (UI.mobDeco || TP.normalize(previewBase, D.t.color).seasons.deco) === b.dataset.mdeco; b.classList.toggle('on', chosen); b.setAttribute('aria-pressed', String(chosen)); }); app.querySelectorAll('[data-dev]').forEach(b => b.classList.toggle('on', b.dataset.dev === UI.dev)); };
    const pv = () => { if (!pvQ) pvQ = requestAnimationFrame(pvNow); };
    const contrastNote = () => { const B = TP.BGS[d.bg], v = TP.vars(d), act = v.match(/--act:(#[0-9a-f]{6})/i)[1]; const tc = TP.textContrast(d); $('#pf-ctr').textContent = [tc < 4.5 ? `El texto casi no se lee sobre el fondo (contraste ${tc.toFixed(1)}:1; se recomienda 4.5 o más).` : '', act.toLowerCase() !== d.accent ? 'Este acento tiene poco contraste con el fondo: en los textos se usa una versión más legible.' : ''].filter(Boolean).join(' '); $('#pf-ctr').style.color = tc < 4.5 ? '#f59e7a' : ''; };
    const status = () => { const s = $('#pf-st'); if (!s) return; s.className = 'pf-st' + (pending() ? ' warn' : ''); s.textContent = saving ? 'Guardando borrador…' : pending() ? '● Borrador con cambios sin publicar' + (savedAt ? ' · guardado ' + fmtTz(savedAt, { hour: '2-digit', minute: '2-digit' }) : '') : '✓ Lo que ves es lo publicado'; $('#pf-pub').disabled = !pending(); $('#pf-discard').disabled = !pending(); };
    const save = () => { clearTimeout(saveT); saveT = setTimeout(async () => { saving = true; status(); saveT = 0; const snapshot = JSON.stringify(d); const { data, error } = await sb.rpc('team_design_save', { p_team: T.team.id, p_design: d }); saving = false; if (error) { toast(errMsg(error)); } else { savedAt = data; savedDesign = snapshot; } status(); }, 700); };
    const redraw = () => { const y = $('#pf-panel').scrollTop; $('#pf-panel').innerHTML = panel(); bindPanel(); clip(); $('#pf-panel').scrollTop = y; hist(); };
    const set = (o, full) => { d = TP.normalize({ ...d, ...o }, D.t.color); showPub = false; if (!('theme' in o) && Object.keys(o).some(k => !['order', 'hidden', 'featured', 'announce', 'motto', 'seasons', 'anim', 'part', 'intensity'].includes(k)) && !String(d.theme).startsWith('mine:')) d.theme = 'custom'; pv(); contrastNote(); status(); save(); track?.(); if (full) redraw(); };
    async function hist(){
      const { data } = await sb.from('team_design_versions').select('id,created_at,design,created_by').eq('team_id', T.team.id).order('created_at', { ascending: false }).limit(10);
      const nm = await names((data || []).map(x => x.created_by)), box = $('#pf-hist'); if (!box) return;
      box.innerHTML = (data || []).map((v, i) => { const x = TP.normalize(v.design, D.t.color); return `<div class="pf-h"><span class="pf-sw" style="background:${x.accent}"></span><span><b>${i === 0 ? 'Publicada ahora' : fmtTz(v.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</b><small>${esc((TP.THEMES[x.theme]?.l || 'Personalizado') + ' · ' + TP.TEMPLATES[x.template][0] + ' · ' + (nm[v.created_by] || ''))}</small></span>${i ? `<button class="lnk" data-rest="${v.id}">Restaurar</button>` : '<span></span>'}</div>`; }).join('') || '<p class="pf-note">Aún no publicas ningún diseño.</p>'; clip();
      box.querySelectorAll('[data-rest]').forEach(b => b.onclick = () => busy(b, async () => { const r = await rpc('team_design_restore', { p_version: +b.dataset.rest }); d = TP.normalize(r, D.t.color); savedAt = new Date().toISOString(); redraw(); pv(); status(); toast('Versión restaurada en el borrador'); }));
    }
    function bindPanel(){
      const P = $('#pf-panel');
      P.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => set({ ...TP.THEMES[b.dataset.theme].d, theme: b.dataset.theme }, true));
      P.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { set({ [b.dataset.k]: b.dataset.v }); P.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach(x => { const o = x.dataset.v === b.dataset.v; x.classList.toggle('on', o); x.setAttribute(x.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed', o); }); if (b.dataset.k === 'pattern') $('#pf-op').disabled = b.dataset.v === 'none'; if (b.dataset.k === 'bg') { if (b.dataset.v === 'propio' && !d._seeded) { d.custom = { ...TP.palette({ ...d, bg: 'oscuro' }) }; d.custom = { bg: d.custom.bg, sf: d.custom.sf, fg: d.custom.fg }; } redraw(); pv(); } P.querySelectorAll('.pf-th').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }); });
      P.querySelectorAll('[data-mine]').forEach(b => b.onclick = () => { const m = mine.find(x => x.id === +b.dataset.mine); set({ ...TP.normalize(m.design, D.t.color), motto: d.motto, theme: 'mine:' + m.id }, true); });
      P.querySelectorAll('[data-mupd]').forEach(b => b.onclick = () => busy(b, async () => { const id = +b.dataset.mupd, { motto, ...des } = d; const { error } = await sb.from('team_custom_themes').update({ design: des, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw new Error(errMsg(error)); mine.find(x => x.id === id).design = des; toast('Tema actualizado'); }));
      P.querySelectorAll('[data-mren]').forEach(b => b.onclick = () => busy(b, async () => { const m = mine.find(x => x.id === +b.dataset.mren), n = (prompt('Nuevo nombre del tema', m.name) || '').trim().slice(0, 40); if (!n || n === m.name) return; const { error } = await sb.from('team_custom_themes').update({ name: n }).eq('id', m.id); if (error) throw new Error(/duplicate|unique/.test(error.message) ? 'Ya tienes un tema con ese nombre' : errMsg(error)); m.name = n; redraw(); }));
      P.querySelectorAll('[data-mdel]').forEach(b => b.onclick = () => busy(b, async () => { const m = mine.find(x => x.id === +b.dataset.mdel); if (!confirm(`¿Borrar el tema «${m.name}»? El borrador actual no cambia.`)) return; const { error } = await sb.from('team_custom_themes').delete().eq('id', m.id); if (error) throw new Error(errMsg(error)); mine = mine.filter(x => x !== m); if (d.theme === 'mine:' + m.id) d.theme = 'custom'; redraw(); }));
      $('#pf-tsave')?.addEventListener('click', e => busy(e.currentTarget, async () => { const n = $('#pf-tname').value.trim().slice(0, 40); if (!n) throw new Error('Ponle nombre al tema'); const { motto, theme, seasons, featured, announce, order, hidden, ...des } = d; const { data, error } = await sb.from('team_custom_themes').insert({ team_id: T.team.id, name: n, design: des }).select('id,name,design,updated_at').single(); if (error) throw new Error(/duplicate|unique/.test(error.message) ? 'Ya tienes un tema con ese nombre' : errMsg(error)); mine = [...mine, data].sort((a, b) => a.name.localeCompare(b.name)); d.theme = 'mine:' + data.id; save(); redraw(); toast('Tema «' + n + '» guardado'); }));
      P.querySelectorAll('[data-cc]').forEach(i => i.oninput = () => { P.querySelector(`[data-cx="${i.dataset.cc}"]`).value = i.value; set({ custom: { ...d.custom, [i.dataset.cc]: i.value } }); });
      P.querySelectorAll('[data-cx]').forEach(i => i.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(i.value)) { P.querySelector(`[data-cc="${i.dataset.cx}"]`).value = i.value; set({ custom: { ...d.custom, [i.dataset.cx]: i.value } }); } });
      const dl = (name, txt) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.obi-tema.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
      $('#pf-exp').onclick = () => dl(T.team.name + '-diseno', TP.exportTheme(T.team.name, d));
      P.querySelectorAll('[data-mexp]').forEach(b => b.onclick = () => { const m = mine.find(x => x.id === +b.dataset.mexp); dl(m.name, TP.exportTheme(m.name, m.design)); });
      $('#pf-imp').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > 40000) return toast('El archivo es demasiado grande'); f.text().then(async txt => { try { const th = TP.importTheme(txt), look = TP.normalize(th.design, D.t.color); const { motto, theme, featured, announce, order, hidden, ...des } = look; let name = th.name; if (mine.some(x => x.name === name)) name = (name + ' (importado)').slice(0, 40); if (mine.length >= 12) { set({ ...des }, true); return toast('Tema aplicado al borrador (ya tienes 12 temas guardados)'); } const { data, error } = await sb.from('team_custom_themes').insert({ team_id: T.team.id, name, design: des }).select('id,name,design,updated_at').single(); if (error) throw new Error(errMsg(error)); mine = [...mine, data].sort((a, b) => a.name.localeCompare(b.name)); set({ ...des, theme: 'mine:' + data.id }, true); toast('Tema «' + name + '» importado y aplicado'); } catch (er) { toast(er.message || 'No se pudo leer el archivo'); } }); };
      // orden de secciones
      const move = (i, j) => { const o = [...d.order]; const [x] = o.splice(i, 1); o.splice(j, 0, x); set({ order: o }, true); };
      P.querySelectorAll('[data-up]').forEach(b => b.onclick = () => move(+b.dataset.up, +b.dataset.up - 1));
      P.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => move(+b.dataset.dn, +b.dataset.dn + 1));
      P.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => { const k = b.dataset.eye; set({ hidden: d.hidden.includes(k) ? d.hidden.filter(x => x !== k) : [...d.hidden, k] }, true); });
      let dragK = null; const ord = $('#pf-ord');
      ord.addEventListener('dragstart', e => { const li = e.target.closest('li'); dragK = li?.dataset.sec; li?.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
      ord.addEventListener('dragover', e => { e.preventDefault(); const li = e.target.closest('li'); ord.querySelectorAll('.over').forEach(x => x.classList.remove('over')); if (li && li.dataset.sec !== dragK) li.classList.add('over'); });
      ord.addEventListener('drop', e => { e.preventDefault(); const li = e.target.closest('li'); if (!li || !dragK || li.dataset.sec === dragK) return; move(d.order.indexOf(dragK), d.order.indexOf(li.dataset.sec)); dragK = null; });
      ord.addEventListener('dragend', () => { dragK = null; ord.querySelectorAll('.drag,.over').forEach(x => x.classList.remove('drag', 'over')); });
      // destacadas
      P.querySelectorAll('[data-feat]').forEach(c => c.onchange = () => { const s = c.dataset.feat; let f = d.featured.filter(x => x !== s); if (c.checked) { if (f.length >= 3) { c.checked = false; return toast('Máximo 3 obras destacadas'); } f = [...f, s]; } set({ featured: f }, true); });
      P.querySelectorAll('[data-an]').forEach(c => c.onchange = () => set({ anim: { ...d.anim, [c.dataset.an]: c.checked } }, c.dataset.an === 'particles'));
      P.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => set({ part: { ...d.part, [b.dataset.pk]: b.dataset.pv } }, true));
      $('#pf-pt')?.addEventListener('change', e => set({ part: { ...d.part, type: e.target.value } }));
      $('#pf-pc')?.addEventListener('input', e => set({ part: { ...d.part, color: e.target.value } }));
      const SS = o => set({ seasons: { ...d.seasons, ...o } }, true);
      P.querySelectorAll('[data-deco]').forEach(b => b.onclick = () => SS({ deco: b.dataset.deco }));
      P.querySelectorAll('[data-hemi]').forEach(b => b.onclick = () => SS({ hemi: b.dataset.hemi }));
      $('#pf-sman').onchange = e => SS({ manual: e.target.value });
      P.querySelectorAll('[data-sgd]').forEach(x => x.ontoggle = () => { if (x.open) UI.sg = x.dataset.sgd; else if (UI.sg === x.dataset.sgd) UI.sg = null; });
      P.querySelectorAll('[data-sauto]').forEach(c => c.onchange = () => { const k = c.dataset.sauto; UI.sg = TP.SEASONS[k].g; SS({ auto: c.checked ? [...d.seasons.auto, k] : d.seasons.auto.filter(x => x !== k) }); });
      P.querySelectorAll('[data-sedit]').forEach(b => b.onclick = () => { UI.se = UI.se === b.dataset.sedit ? null : b.dataset.sedit; UI.sg = TP.SEASONS[b.dataset.sedit].g; redraw(); });
      P.querySelectorAll('[data-sgreet]').forEach(i => i.oninput = () => set({ seasons: { ...d.seasons, greet: { ...d.seasons.greet, [i.dataset.sgreet]: i.value } } }));
      P.querySelectorAll('[data-snoorn]').forEach(c => c.onchange = () => { const k = c.dataset.snoorn; UI.sim = k; SS({ noOrn: c.checked ? d.seasons.noOrn.filter(x => x !== k) : [...d.seasons.noOrn, k] }); });
      P.querySelectorAll('[data-sorn0]').forEach(b => b.onclick = () => { const o = { ...d.seasons.orn }; delete o[b.dataset.sorn0]; SS({ orn: o }); });
      P.querySelectorAll('[data-sorn]').forEach(i => i.onchange = async () => { const f = i.files[0]; i.value = ''; if (!f) return; if (f.size > 2e6) return toast('El adorno pesa más de 2 MB'); const k = i.dataset.sorn, path = `${T.team.id}/equipo/temporadas/${k}-${Date.now()}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`; const { error } = await sb.storage.from('obi-media').upload(path, f, { contentType: f.type }); if (error) return toast(errMsg(error)); SS({ orn: { ...d.seasons.orn, [k]: path } }); UI.sim = k; pv(); toast('Adorno subido · se ve en la vista previa'); });
      P.querySelectorAll('[data-ssim]').forEach(b => b.onclick = () => { UI.sim = b.dataset.ssim; pv(); toast('Vista previa con ' + TP.SEASONS[UI.sim].l); });
      const ac = $('#pf-ac'), hx = $('#pf-hex');
      ac.oninput = () => { hx.value = ac.value; set({ accent: ac.value }); };
      hx.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(hx.value)) { ac.value = hx.value; set({ accent: hx.value }); } };
      $('#pf-op').oninput = e => { $('#pf-opv').textContent = e.target.value + ' %'; set({ patternOp: +e.target.value }); };
      $('#pf-motto').oninput = e => { $('#pf-mc').textContent = e.target.value.length + ' / 120'; set({ motto: e.target.value }); };
    }
    bindPanel(); clip(); pv(); contrastNote(); status(); hist();
    app.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => { UI.dev = b.dataset.dev; pv(); });
    $('#pf-cmp').onclick = () => { showPub = !showPub; pv(); };
    $('#pf-sim').onchange = e => { UI.sim = e.target.value === 'auto' ? undefined : e.target.value; pv(); };
    $('#pf-msim').onchange = e => { UI.sim = e.target.value === 'auto' ? undefined : e.target.value; pv(); };
    app.querySelectorAll('[data-mdeco]').forEach(b => b.onclick = () => { UI.mobDeco = b.dataset.mdeco; pv(); });
    // deshacer / rehacer
    const past = [], future = []; let lastPush = 0, snap = JSON.stringify(d);
    const track = () => { const now = Date.now(), cur = JSON.stringify(d); if (cur === snap) return; if (now - lastPush > 500 || !past.length) past.push(snap); if (past.length > 60) past.shift(); future.length = 0; snap = cur; lastPush = now; };
    const jump = (from, to) => { if (!from.length) return toast(from === past ? 'Nada que deshacer' : 'Nada que rehacer'); to.push(JSON.stringify(d)); d = TP.normalize(JSON.parse(from.pop()), D.t.color); snap = JSON.stringify(d); redraw(); pv(); contrastNote(); status(); save(); };
    const key = e => { if (!document.body.contains($('#pf-panel') || document.createElement('i'))) return removeEventListener('keydown', key); if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && document.activeElement.type !== 'color' && document.activeElement.type !== 'range') return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? jump(future, past) : jump(past, future); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); jump(future, past); } };
    addEventListener('keydown', key);
    // 6) no perder el último cambio al salir
    const flush = () => { if (saveT) { clearTimeout(saveT); saveT = 0; sb.rpc('team_design_save', { p_team: T.team.id, p_design: d }); } };
    const leave = e => { if (!document.body.contains($('#pf-panel') || document.createElement('i'))) return removeEventListener('beforeunload', leave); if (saveT || saving) { flush(); e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', leave);
    document.addEventListener('click', function nav(e){ if (!$('#pf-panel')) return document.removeEventListener('click', nav, true); if (e.target.closest('a[href]')) flush(); }, true);
    $('#pf-pub').onclick = e => busy(e.currentTarget, async () => { clearTimeout(saveT); await rpc('team_design_save', { p_team: T.team.id, p_design: d }); savedDesign = JSON.stringify(d); await rpc('team_design_publish', { p_team: T.team.id }); D.t.design = d; status(); hist(); toast('Página publicada'); });
    $('#pf-discard').onclick = e => busy(e.currentTarget, async () => { if (!confirm('¿Descartar el borrador y volver a lo publicado?')) return; clearTimeout(saveT); d = TP.normalize(D.t.design, D.t.color); await rpc('team_design_save', { p_team: T.team.id, p_design: d }); savedDesign = JSON.stringify(d); redraw(); pv(); status(); toast('Borrador descartado'); });
    $('#pf-share').onclick = e => busy(e.currentTarget, async () => { const shared = await previewShareLink({ origin: location.origin, slug: T.team.slug, token, savedDesign, currentDesign: JSON.stringify(d), queued: !!saveT, saving, generateToken: () => rpc('team_design_new_token', { p_team: T.team.id }) }); token = shared.token; try { await navigator.clipboard.writeText(shared.link); toast('Enlace copiado · cualquiera con él ve el borrador guardado'); } catch { prompt('Copia este enlace:', shared.link); } });
  }

  return { home, works, newWork, work, editor, importer, library: () => library(), team, board, log, profile, prefs, announcements, community, stats, downloads, glossary, isMember: async () => { const u = getUser(); if (!u) return false; const { count } = await sb.from('team_members').select('*', { count: 'exact', head: true }).eq('user_id', u.id); return count > 0; } };
}

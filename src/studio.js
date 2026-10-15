// Estudio del traductor: obras, volúmenes, publicación, editor con guardado atómico, importador EPUB/DOCX/PDF, multimedia, equipo y colaboraciones.
const LIMITS = { file: 80 * 1024 * 1024, entries: 15000, unzipped: 300 * 1024 * 1024, image: 8 * 1024 * 1024 };
const ACTIONS = [['view','Ver'],['edit','Editar'],['create','Crear'],['import','Importar'],['publish','Publicar'],['schedule','Programar'],['delete','Borrar'],['review','Revisar']];
const ROLES = [['owner','Propietario'],['admin','Administrador'],['translator','Traductor'],['editor','Editor'],['proofreader','Corrector'],['collaborator','Colaborador']];
const SEC = ['Capítulo','Prólogo','Interludio','Epílogo','Afterword','Extra'];
const GT = ['Personaje','Lugar','Organización','Honorífico','Cargo o título','Magia','Hechizo','Habilidad','Objeto','Arma','Criatura','Raza o especie','Comida','Bebida','Festival','Moneda','Unidad de medida','Referencia cultural','Modismo','Onomatopeya','Tabú','Otro'];
const BT = [['paragraph','Párrafo'],['heading','Título'],['quote','Cita'],['note','Nota del traductor'],['image','Ilustración'],['separator','Separador'],['ruby','Furigana']];

const STCSS = `
.s2{display:grid;grid-template-columns:248px minmax(0,1fr);margin:-40px calc(-1 * clamp(16px,4vw,56px)) -80px;min-height:calc(100vh - 64px);background:#0d0c0a}
.s2-side{position:sticky;top:0;align-self:start;height:100vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#2f2a20 transparent;display:flex;flex-direction:column;gap:22px;padding:22px 16px;background:#110f0b;border-right:1px solid #2f2a20}
.s2-brand{display:flex;align-items:center;gap:10px;color:var(--paper);text-decoration:none}.s2-brand b{display:block;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px;line-height:1}.s2-brand small{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;color:#a89f8a}
.s2-seal{width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;border:2px solid var(--gold);border-radius:5px;color:var(--gold);font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:16px;transform:rotate(-6deg)}
.s2-team{display:grid;gap:6px;padding:12px;background:#16140f;border:1px solid #2f2a20;border-left:4px solid var(--gold)}.s2-team small,.s2-quick small{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;color:#a89f8a}.s2-team .st-team{font-size:14px;text-transform:uppercase}.s2-team select{width:100%;font-size:13px;padding:6px}.s2-team>span{font-size:12px;color:#a89f8a}
.s2-bib{display:block;margin-top:4px;padding-top:8px;border-top:1px solid #2f2a20;line-height:1.4;color:#cfc6b0!important}.s2-bib b{color:var(--gold)}.s2-bib a{display:block;margin-top:6px;font-weight:700}
.s2-nav{display:grid;gap:2px}.s2-nav a{display:flex;align-items:center;gap:12px;padding:10px;min-height:44px;color:var(--paper);text-decoration:none;font-size:14px;font-weight:600}.s2-nav a:hover{background:#1c1a14}.s2-nav a.on{background:var(--gold);color:#0d0c0a}
.s2-nav .k{width:22px;flex:none;text-align:center;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:15px}.s2-nav em{margin-left:auto;font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;opacity:.75}
.s2-quick{display:grid;gap:8px}.s2-q{display:block;padding:10px 12px;min-height:44px;background:none;color:var(--paper);border:1px solid #3d3628;font:inherit;font-weight:600;font-size:13px;text-align:left;text-decoration:none;cursor:pointer}.s2-q:hover{border-color:var(--gold);color:var(--paper)}.s2-q.main{background:var(--gold);color:#0d0c0a;border-color:var(--gold);font-weight:700;font-size:14px}
.s2-back{margin-top:auto;font-size:13px;color:#a89f8a}
.s2-main{min-width:0;padding:28px clamp(20px,3vw,44px) 80px}.s2-head{display:grid;gap:4px;margin-bottom:26px}.s2-head small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:#a89f8a}.s2-head h1{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:34px;line-height:1.1}
.s2-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:28px}.s2-kpi{display:grid;gap:6px;padding:16px;background:#16140f;border-top:3px solid var(--c)}.s2-kpi small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a89f8a}.s2-kpi b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:36px;line-height:1}.s2-kpi span{font-size:12px;color:var(--c)}
.s2-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px}.s2-box{display:grid;gap:4px;align-content:start;padding:18px;background:#14120d;border:1px solid #2f2a20}
.s2-bh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px}.s2-bh h2{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:22px}.s2-bh a{font-weight:700;font-size:13px}.s2-none{padding:12px 0;border-top:1px solid #2f2a20;margin:0}
.s2-up{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid #2f2a20}.s2-up .d{display:grid;text-align:center;padding:6px 0;background:#1c1a14;border-top:3px solid var(--c)}.s2-up .d b{font-family:'Shippori Mincho B1',serif;font-size:22px;font-weight:500;line-height:1}.s2-up small{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#a89f8a}
.s2-up .w{display:grid;gap:2px;min-width:0}.s2-up .w b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s2-up .w small{font-family:inherit;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s2-up .t{display:grid;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--gold)}
.s2-dr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 14px;padding:12px 6px;margin:0 -6px;border-top:1px solid #2f2a20;color:var(--paper);text-decoration:none}.s2-dr:hover{background:#1a1812;color:var(--paper)}.s2-dr b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s2-dr .st{font-family:'IBM Plex Mono',monospace;font-size:12px}.s2-dr small{font-size:12px;color:#a89f8a}
.s2-er{display:grid;gap:6px;padding:12px 0;border-top:1px solid #2f2a20}.s2-er small{font-size:12px;color:#a89f8a}.s2-er q{font-family:Literata,serif;font-size:15px;color:#e3dccb}.s2-er>span{font-size:13px;color:#cfc6b0}.s2-er .a{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.s2-er .btn{padding:6px 10px;font-size:12px}.s2-er .ok{color:#a9d18e}
.s2-bar{position:relative;display:flex;justify-content:space-between;gap:12px;padding:10px 0 14px;border-top:1px solid #2f2a20;color:var(--paper);text-decoration:none;font-size:14px}.s2-bar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s2-bar b{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500}.s2-bar i{position:absolute;left:0;bottom:4px;height:4px;width:var(--w);background:var(--c)}
.s2-works{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:18px}
.s2-work{display:grid;grid-template-columns:150px minmax(0,1fr);gap:20px;padding:18px;background:#14120d;border:1px solid #2f2a20;border-top:4px solid var(--c)}
.s2-work .cv{position:relative;aspect-ratio:3/4;background:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px) center/cover;box-shadow:0 14px 30px rgba(0,0,0,.5)}.s2-work .cv[style*=url]{background-size:cover}.s2-work .cv span{position:absolute;left:0;right:0;bottom:16%;padding:8px 10px;background:var(--c);color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:13px;line-height:1.2}
.s2-work .bd{display:grid;gap:10px;align-content:start;min-width:0}.s2-work .tg{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.s2-work .tg small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}.s2-work .pl{white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 8px;border:1px solid var(--p);color:var(--p)}
.s2-work h2{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:22px;line-height:1.2;text-wrap:pretty}.s2-work h2 a{color:var(--paper);text-decoration:none}.s2-work h2 a:hover{color:var(--c)}
.s2-work p{margin:0;font-family:Literata,serif;font-size:14px;line-height:1.55;color:#cfc6b0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.s2-work .gn{display:flex;gap:5px;flex-wrap:wrap}.s2-work .gn span{font-size:11px;font-weight:600;padding:2px 8px;border:1px solid #3d3628;color:#cfc6b0}
.s2-work dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin:0;padding:12px 0;border-top:1px solid #2f2a20;border-bottom:1px solid #2f2a20}.s2-work dl div{display:grid;gap:2px}.s2-work dt{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;color:#a89f8a}.s2-work dd{margin:0;font-size:13px;font-weight:700}
.s2-work .ac{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.s2-work .ac .btn{padding:9px 14px;font-size:13px}.s2-work .lnk{font-size:13px}
.s2-add{min-height:200px;display:grid;place-items:center;align-content:center;gap:6px;border:2px dashed #3d3628;color:#a89f8a;font-size:14px;font-weight:600;text-decoration:none}.s2-add span{font-family:'Shippori Mincho B1',serif;font-size:34px}.s2-add small{font-weight:400;font-size:12px}.s2-add:hover{border-color:var(--gold);color:var(--gold)}
.s2-empty{display:grid;justify-items:center;gap:14px;padding:70px 24px;background:#14120d;border:1px dashed #3d3628;text-align:center}.s2-empty>span{font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:56px;color:#3d3628}.s2-empty h2{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:28px}.s2-empty p{margin:0;max-width:52ch;color:#a89f8a;line-height:1.6}
.s2-h2{font-family:'Shippori Mincho B1',serif;font-weight:500;margin:32px 0 12px}
@media(max-width:860px){.s2{grid-template-columns:1fr}.s2-side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;gap:12px;padding:14px 16px}.s2-brand,.s2-team,.s2-back{display:none}.s2-nav{display:flex;flex-wrap:wrap;gap:4px;width:100%}.s2-nav a{padding:8px 10px}.s2-nav em{margin-left:6px}.s2-quick{display:flex;flex-wrap:wrap;width:100%}.s2-quick small{display:none}.s2-q{flex:1 1 auto}.s2-work{grid-template-columns:96px minmax(0,1fr);gap:14px}}
`;
export function createStudio(ctx){
  const { sb, app, $, esc, toast, go, getUser, getMe, url } = ctx;
  const PUB = `${url}/storage/v1/object/public/obi-media/`;
  const media = p => p ? (/^https?:/.test(p) ? p : PUB + encodeURI(p)) : '';
  const pathOf = u => u && u.startsWith(PUB) ? decodeURI(u.slice(PUB.length)) : null;
  const T = { teams: [], team: null, perms: {} };
  const can = a => !!T.perms[a];
  const busy = async (btn, fn) => { if (btn?.disabled) return; if (btn) { btn.disabled = true; btn.dataset.l = btn.textContent; btn.textContent = 'Un momento…'; } try { return await fn(); } catch (e) { toast(e.hint || e.message || 'Error'); } finally { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.l; } } };
  const ROLE_L = { owner: 'Propietario', admin: 'Administrador', translator: 'Traductor', editor: 'Editor', proofreader: 'Corrector', collaborator: 'Colaborador' };
  const NAV = [['/estudio','総','Resumen'],['/estudio/obras','作','Obras'],['/estudio/glosario','語','Glosario'],['/estudio/importar','入','Importar'],['/estudio/multimedia','画','Multimedia'],['/estudio/equipo','班','Equipo']];
  const CRUMB = { '/estudio': 'RESUMEN', '/estudio/obras': 'OBRAS', '/estudio/glosario': 'GLOSARIO', '/estudio/importar': 'IMPORTAR', '/estudio/multimedia': 'MULTIMEDIA', '/estudio/equipo': 'EQUIPO', '/estudio/obra': 'OBRAS · FICHA' };
  const css = () => { if (document.getElementById('st2-css')) return; const st = document.createElement('style'); st.id = 'st2-css'; st.textContent = STCSS; document.head.appendChild(st); };
  const shell = (title, body, tab) => { css(); const t = tab === '/estudio/obra' ? '/estudio/obras' : tab; const me = getMe?.();
    return `<div class="s2"><aside class="s2-side">
      <a class="s2-brand" href="/estudio"><span class="s2-seal">帯</span><span><b>Estudio Editorial</b><small>EL OBI DEL LECTOR</small></span></a>
      <div class="s2-team"><small>EQUIPO</small>${teamPicker()}<span>Tú: ${ROLE_L[T.team?.role] || 'Miembro'}${T.works != null ? ' · ' + T.works + (T.works === 1 ? ' obra' : ' obras') : ''}</span>${me?.platform_role === 'bibliotecario' ? '<span class="s2-bib">También eres <b>Bibliotecario</b>. Aquí actúas como miembro de tu equipo. <a href="/bibliotecario">Ir al Mostrador →</a></span>' : ''}</div>
      <nav class="s2-nav">${NAV.map(([h, k, l]) => `<a href="${h}" class="${t === h ? 'on' : ''}" ${t === h ? 'aria-current="page"' : ''}><span class="k">${k}</span><span>${l}</span>${h === '/estudio/obras' && T.works ? `<em>${T.works}</em>` : ''}</a>`).join('')}</nav>
      <div class="s2-quick"><small>ACCIONES RÁPIDAS</small>${can('create') ? '<button class="s2-q main" data-quick="new">＋ Nuevo capítulo</button>' : ''}${can('import') ? '<a class="s2-q" href="/estudio/importar">⇪ Importar EPUB / DOCX / PDF</a>' : ''}<a class="s2-q" href="/estudio/obras">◷ Programar lanzamiento</a></div>
      <a class="s2-back" href="/">← Volver al sitio</a></aside>
      <section class="st-main s2-main"><header class="s2-head"><small>ESTUDIO · ${esc((T.team?.name || '').toUpperCase())} · ${CRUMB[tab] || esc(title.toUpperCase())}</small><h1>${title}</h1></header>${body}</section></div>`; };
  const teamPicker = () => T.teams.length > 1 ? `<select id="tpick">${T.teams.map(t => `<option value="${t.id}" ${t.id === T.team?.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>` : `<strong class="st-team">${esc(T.team?.name || '')}</strong>`;
  const bindPicker = again => { $('#tpick')?.addEventListener('change', async e => { await pickTeam(e.target.value); T.works = null; again(); }); $('[data-quick="new"]')?.addEventListener('click', e => busy(e.currentTarget, newChapterPicker)); };
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
    const user = getUser(); if (!user) { go('/entrar'); return false; }
    if (!T.teams.length) {
      const { data } = await sb.from('team_members').select('role,teams(id,slug,name,color)').eq('user_id', user.id);
      T.teams = (data || []).map(m => ({ ...m.teams, role: m.role }));
      if (!T.teams.length) { app.innerHTML = '<h1>Estudio</h1><p>Aún no perteneces a ningún equipo de traducción.</p>'; return false; }
      await pickTeam(localStorage.getItem('obi-team') || T.teams[0].id);
    }
    if (T.works == null) { const { count } = await sb.from('series').select('id', { count: 'exact', head: true }).eq('team_id', T.team.id).is('archived_at', null); T.works = count || 0; }
    return true;
  }
  async function pickTeam(id){
    T.team = T.teams.find(t => t.id === id) || T.teams[0]; localStorage.setItem('obi-team', T.team.id);
    const { data } = await sb.rpc('my_team_permissions', { t: T.team.id }); T.perms = data || {};
  }

  // ---------- obras ----------
  const DAY = 864e5, ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return 'hace ' + Math.max(1, Math.round(s / 60)) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; const n = Math.round(s / 86400); return n === 1 ? 'ayer' : 'hace ' + n + ' días'; };
  const until = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
  const MON = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const TLS = { active: ['En traducción', '#a9d18e'], paused: ['En pausa', '#f2c230'], completed: ['Completada', '#8cc3f2'], abandoned: ['Abandonada', '#a89f8a'], withdrawn: ['Retirada', '#f59e7a'] };
  const wcolor = s => s?.theme?.color || T.team?.color || '#f2c230';
  async function teamData(){
    const { data: works } = await sb.from('series').select('id,slug,title,short,synopsis,genres,cover_path,translation_status,published,views,theme,volumes(count)').eq('team_id', T.team.id).is('archived_at', null).order('title');
    const ids = (works || []).map(w => w.id);
    if (!ids.length) return { works: [], chs: [], sched: [], reps: [] };
    const now = new Date().toISOString();
    const [{ data: chs }, { data: sched }, { data: reps }] = await Promise.all([
      sb.from('chapters').select('id,num,title,status,publish_at,updated_at,series_id,vol,review_status').in('series_id', ids).is('deleted_at', null).limit(3000),
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
    const { works, chs, sched, reps } = await teamData(), byId = Object.fromEntries(works.map(w => [w.id, w]));
    if (!works.length) { app.innerHTML = shell('Resumen', emptyState(), '/estudio'); bindPicker(home); return; }
    const now = Date.now(), pub = chs.filter(c => c.status === 'published'), drafts = chs.filter(c => c.status === 'draft').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const up = [...chs.filter(c => c.status === 'scheduled' && new Date(c.publish_at) > now).map(c => ({ at: c.publish_at, what: `Cap. ${c.num} — ${c.title}`, s: byId[c.series_id] })), ...sched.map(e => ({ at: e.at, what: e.label, s: byId[e.series_id] }))].sort((a, b) => new Date(a.at) - new Date(b.at));
    const week = pub.filter(c => now - new Date(c.publish_at) < 7 * DAY).length, views = works.reduce((a, w) => a + (w.views || 0), 0);
    const kpi = (l, v, n, c) => `<div class="s2-kpi" style="--c:${c}"><small>${l}</small><b>${v}</b><span>${n}</span></div>`;
    const top = [...works].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6), max = Math.max(1, ...top.map(w => w.views || 0));
    const body = `<div class="s2-kpis">
        ${kpi('Capítulos publicados', pub.length.toLocaleString('es-MX'), week ? `+${week} esta semana` : 'Ninguno esta semana', '#a9d18e')}
        ${kpi('Programados', up.length, up[0] ? 'Próximo ' + until(up[0].at) : 'Nada en agenda', '#f2c230')}
        ${kpi('Borradores', drafts.length, drafts[0] ? 'Último ' + ago(drafts[0].updated_at) : 'Sin borradores', '#8cc3f2')}
        ${kpi('Erratas abiertas', reps.length, reps.length ? 'Revísalas pronto' : 'Todo al día', reps.length ? '#f59e7a' : '#a9d18e')}
        ${kpi('Lecturas totales', views.toLocaleString('es-MX'), works.length + (works.length === 1 ? ' obra' : ' obras'), '#cfc6b0')}
      </div>
      <div class="s2-cols">
        <section class="s2-box"><div class="s2-bh"><h2>Próximos lanzamientos</h2><a href="/estudio/obras">Programar →</a></div>
          ${up.slice(0, 5).map(u => { const d = new Date(u.at); return `<div class="s2-up"><span class="d" style="--c:${wcolor(u.s)}"><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></span><span class="w"><b>${esc(u.what)}</b><small>${esc(u.s?.title || '')}</small></span><span class="t">${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}<small>${until(u.at)}</small></span></div>`; }).join('') || '<p class="mono s2-none">No hay nada programado. Programa un capítulo desde la ficha de la obra.</p>'}</section>
        <section class="s2-box"><div class="s2-bh"><h2>Borradores pendientes</h2><span class="mono">${drafts.length}</span></div>
          ${drafts.slice(0, 5).map(c => `<a class="s2-dr" href="/estudio/editar/${c.id}"><b>Cap. ${c.num} — ${esc(c.title)}</b><span class="st" style="color:${c.review_status === 'pending' ? '#8cc3f2' : c.review_status === 'approved' ? '#a9d18e' : '#f2c230'}">${c.review_status === 'pending' ? 'En revisión' : c.review_status === 'approved' ? 'Aprobado' : 'Borrador'}</span><small>${esc(byId[c.series_id]?.title || '')} · Vol. ${c.vol ?? '—'}</small><small>${ago(c.updated_at)}</small></a>`).join('') || '<p class="mono s2-none">Sin borradores. ¡Todo publicado!</p>'}</section>
        <section class="s2-box"><div class="s2-bh"><h2>Erratas abiertas</h2><span class="mono" style="color:${reps.length ? '#f59e7a' : ''}">${reps.length}</span></div>
          ${reps.slice(0, 4).map(r => `<div class="s2-er"><small>${esc(byId[r.chapters.series_id]?.title || '')} · Cap. ${r.chapters.num}${r.kind ? ' · ' + esc(r.kind) : ''} · ${ago(r.created_at)}</small>${r.quote ? `<q>${esc(r.quote)}</q>` : ''}${r.fix ? `<span>Propuesta: ${esc(r.fix)}</span>` : ''}<span class="a">${can('edit') ? `<a class="btn ghost" href="/estudio/editar/${r.chapter_id}">Abrir en el editor</a>` : ''}<button class="btn ghost ok" data-fix="${r.id}">Marcar corregida</button><button class="lnk" data-dis="${r.id}">Descartar</button></span></div>`).join('') || '<p class="mono s2-none">Sin erratas abiertas.</p>'}</section>
        <section class="s2-box"><div class="s2-bh"><h2>Obras más leídas</h2><span class="mono">${views.toLocaleString('es-MX')}</span></div>
          ${top.map(w => `<a class="s2-bar" href="/estudio/obra/${w.slug}"><span>${esc(w.title)}</span><b>${(w.views || 0).toLocaleString('es-MX')}</b><i style="--w:${Math.max(2, Math.round((w.views || 0) / max * 100))}%;--c:${wcolor(w)}"></i></a>`).join('')}</section>
      </div>`;
    app.innerHTML = shell('Resumen', body, '/estudio'); bindPicker(home);
    app.querySelectorAll('[data-fix],[data-dis]').forEach(b => b.onclick = () => busy(b, async () => { const fix = !!b.dataset.fix; const { error } = await sb.from('reports').update({ status: fix ? 'fixed' : 'dismissed' }).eq('id', b.dataset.fix || b.dataset.dis); if (error) throw error; toast(fix ? 'Errata marcada como corregida' : 'Errata descartada'); home(); }));
  }
  const emptyState = () => `<div class="s2-empty"><span>空</span><h2>Tu estudio está vacío</h2><p>Empieza importando un EPUB, DOCX o PDF: armamos la obra con su portada, índice e ilustraciones.</p>${can('import') ? '<a class="btn" href="/estudio/importar">⇪ Importar mi primera obra</a>' : '<p class="mono">Pide a tu propietario permiso para importar.</p>'}</div>`;

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
      ${list.length ? `<div class="s2-works">${list.map(card).join('')}${can('import') ? '<a class="s2-add" href="/estudio/importar"><span>＋</span>Nueva obra<small>Importa un EPUB, DOCX o PDF</small></a>' : ''}</div>` : emptyState()}
      ${(collab || []).length ? `<h2 class="s2-h2">Colaboraciones</h2><div class="s2-box">${collab.map(c => `<p><a href="/serie/${c.series.slug}">${esc(c.series.title)}</a> <span class="mono">de ${esc(c.series.teams?.name)}</span></p>`).join('')}</div>` : ''}`;
    app.innerHTML = shell('Mis obras', body, '/estudio/obras'); bindPicker(works);
    app.querySelectorAll('[data-new]').forEach(b => b.onclick = () => busy(b, () => newChapter(list.find(w => w.id === b.dataset.new))));
    app.querySelectorAll('[data-acc],[data-rej]').forEach(b => b.onclick = () => busy(b, async () => { const { error } = await sb.from('collaborations').update({ status: b.dataset.acc ? 'accepted' : 'rejected' }).eq('id', b.dataset.acc || b.dataset.rej); if (error) throw error; toast('Respuesta enviada'); works(); }));
  }


  async function work(slug){
    if (!(await ensure())) return;
    const { data: s } = await sb.from('series').select('*').eq('slug', slug).maybeSingle();
    if (!s) return go('/estudio');
    const [{ data: vols }, { data: chs }, { data: sched }, { data: cols }, { data: events }] = await Promise.all([
      sb.from('volumes').select('*').eq('series_id', s.id).is('deleted_at', null).order('num'),
      sb.from('chapters').select('id,num,vol,volume_id,title,status,section_type,publish_at,version').eq('series_id', s.id).is('deleted_at', null).order('num'),
      sb.from('volumes').select('id').eq('series_id', s.id).eq('status', 'scheduled'),
      sb.from('collaborations').select('id,status,invited:teams!collaborations_invited_team_fkey(name,slug)').eq('series_id', s.id),
      sb.from('publication_events').select('event,summary,created_at').eq('series_id', s.id).order('created_at', { ascending: false }).limit(8)]);
    const ST = { draft: 'Borrador', scheduled: 'Programado', published: 'Publicado', hidden: 'Oculto' };
    app.innerHTML = shell(esc(s.title), `
      <p class="mono">${(vols || []).length} volúmenes · ${(chs || []).length} capítulos · ${(sched || []).length} programaciones · <a href="/serie/${s.slug}">ver ficha pública</a></p>
      ${can('create') ? '<p><button class="btn" id="addvol">Nuevo volumen</button></p>' : ''}
      ${(vols || []).map(v => { const list = (chs || []).filter(c => c.volume_id === v.id || (!c.volume_id && c.vol === v.num)); return `
        <details class="st-vol" ${list.length < 15 ? 'open' : ''}><summary><strong>Volumen ${v.num}${v.title && v.title !== String(v.num) ? ' · ' + esc(v.title) : ''}</strong> <span class="pill ${v.status}">${ST[v.status]}${v.status === 'scheduled' && v.published_at ? ' · ' + new Date(v.published_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span> <span class="mono">${list.length} cap.${v.is_final ? ' · final' : ''}</span></summary>
          <div class="st-row">
            ${can('publish') && v.status !== 'published' ? `<button class="btn" data-pub="${v.id}">Publicar volumen</button>` : ''}
            ${can('schedule') && v.status !== 'published' ? `<input type="datetime-local" data-at="${v.id}"><button class="btn ghost" data-sch="${v.id}">Programar</button>` : ''}
            ${can('publish') && v.status === 'scheduled' ? `<button class="btn ghost" data-unsch="${v.id}">Cancelar programación</button>` : ''}
            ${can('publish') && v.status === 'published' ? `<button class="btn ghost" data-hide="${v.id}">Ocultar</button>` : ''}
            ${can('publish') && v.status === 'hidden' ? `<button class="btn ghost" data-show="${v.id}">Mostrar</button>` : ''}
            ${can('create') ? `<button class="btn ghost" data-addch="${v.id}" data-n="${v.num}">Añadir capítulo</button>` : ''}
            ${can('edit') ? `<label class="mono"><input type="checkbox" data-final="${v.id}" ${v.is_final ? 'checked' : ''}> Volumen final</label>` : ''}
            ${can('delete') ? `<button class="btn ghost danger" data-delvol="${v.id}">Borrar volumen</button>` : ''}
          </div>
          <ol class="st-ch">${list.map(c => `<li><span class="mono">${c.num}</span><span>${esc(c.title)}</span><span class="pill ${c.status}">${ST[c.status] || c.status}</span><span>${can('edit') ? `<a href="/estudio/editar/${c.id}">Editar</a>` : ''} ${can('delete') ? `<button class="lnk danger" data-delch="${c.id}">Borrar</button>` : ''}</span></li>`).join('')}</ol>
        </details>`; }).join('') || '<p class="mono">Sin volúmenes.</p>'}
      <h2>Colaboración</h2>
      ${(cols || []).map(c => `<p>${esc(c.invited?.name)} <span class="pill">${{ pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada', revoked: 'Revocada' }[c.status] || c.status}</span> ${c.status !== 'revoked' && can('edit') ? `<button class="lnk" data-revoke="${c.id}">Revocar</button>` : ''}</p>`).join('') || '<p class="mono">Sin equipos colaboradores. Los créditos de ambos equipos aparecen en la ficha.</p>'}
      ${can('edit') ? '<p class="st-row"><input id="inv" placeholder="Alias del equipo a invitar (p. ej. kaori)"><button class="btn ghost" id="invite">Invitar</button></p>' : ''}
      <h2>Historial de publicación</h2>${(events || []).map(e => `<p class="mono">${new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(e.summary)}</p>`).join('') || '<p class="mono">Sin eventos.</p>'}`, '/estudio/obra');
    bindPicker(home);
    const on = (sel, fn) => app.querySelectorAll(sel).forEach(b => b.onclick = () => busy(b, () => fn(b)));
    const again = () => work(slug);
    on('#addvol', async () => { const n = Math.max(0, ...(vols || []).map(v => v.num)) + 1; const { error } = await sb.from('volumes').insert({ series_id: s.id, num: n, status: 'draft' }); if (error) throw error; again(); });
    on('[data-pub]', async b => { const { error } = await sb.rpc('publish_volume', { p_volume: b.dataset.pub }); if (error) throw error; toast('Volumen publicado · se envió un solo aviso a los seguidores'); again(); });
    on('[data-sch]', async b => { const at = app.querySelector(`[data-at="${b.dataset.sch}"]`).value; if (!at) throw new Error('Elige fecha y hora'); const d = new Date(at); if (d <= new Date()) throw new Error('La fecha debe ser futura'); const { error } = await sb.rpc('publish_volume', { p_volume: b.dataset.sch, p_at: d.toISOString() }); if (error) throw error; toast('Programado para ' + d.toLocaleString('es-MX')); again(); });
    on('[data-unsch]', async b => { await sb.from('chapters').update({ status: 'draft' }).eq('volume_id', b.dataset.unsch).eq('status', 'scheduled'); const { error } = await sb.from('volumes').update({ status: 'draft' }).eq('id', b.dataset.unsch); if (error) throw error; again(); });
    on('[data-hide]', async b => { const { error } = await sb.from('volumes').update({ status: 'hidden' }).eq('id', b.dataset.hide); if (error) throw error; again(); });
    on('[data-show]', async b => { const { error } = await sb.from('volumes').update({ status: 'published' }).eq('id', b.dataset.show); if (error) throw error; again(); });
    app.querySelectorAll('[data-final]').forEach(c => c.onchange = async () => { await sb.from('volumes').update({ is_final: c.checked }).eq('id', c.dataset.final); toast(c.checked ? 'Al publicarlo, la traducción pasará a Completada' : 'Marca retirada'); });
    on('[data-addch]', async b => { const num = Math.max(0, ...(chs || []).map(c => c.num)) + 1; const { data, error } = await sb.from('chapters').insert({ series_id: s.id, volume_id: b.dataset.addch, vol: +b.dataset.n, num, title: 'Capítulo ' + num, body: [], status: 'draft', section_type: 'Capítulo' }).select('id').single(); if (error) throw error; go('/estudio/editar/' + data.id); });
    on('[data-delch]', async b => { if (!confirm('¿Borrar este capítulo? Sus imágenes sin uso también se eliminarán.')) return; await deleteChapters([b.dataset.delch]); again(); });
    on('[data-delvol]', async b => { if (!confirm('¿Borrar el volumen y todos sus capítulos?')) return; const ids = (chs || []).filter(c => c.volume_id === b.dataset.delvol).map(c => c.id); const v = vols.find(x => x.id === b.dataset.delvol); await deleteChapters(ids, [v.cover_path, ...(v.epub_fonts || []).map(f => pathOf(f.url))]); const { error } = await sb.from('volumes').delete().eq('id', v.id); if (error) throw error; again(); });
    on('#invite', async () => { const alias = $('#inv').value.trim().toLowerCase(); const { data: t } = await sb.from('teams').select('id,name').eq('slug', alias).maybeSingle(); if (!t) throw new Error('No existe un equipo con ese alias'); if (t.id === T.team.id) throw new Error('Es tu propio equipo'); const { error } = await sb.from('collaborations').insert({ series_id: s.id, inviter_team: T.team.id, invited_team: t.id, status: 'pending' }); if (error) throw error; toast('Invitación enviada a ' + t.name); again(); });
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

  // ---------- editor por bloques con guardado atómico ----------
  async function editor(id){
    if (!(await ensure())) return;
    const { data: c } = await sb.from('chapters').select('*, series(slug,title,team_id)').eq('id', id).maybeSingle();
    if (!c) return go('/estudio');
    const KEY = 'obi-draft-' + id;
    let blocks = (c.body || []).map(b => ({ ...b })), title = c.title, type = c.section_type || 'Capítulo', version = c.version, dirty = false;
    const local = (() => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } })();
    const mark = () => { dirty = true; $('#state').textContent = 'Cambios sin guardar'; localStorage.setItem(KEY, JSON.stringify({ blocks, title, type, version, at: Date.now() })); };
    const text = b => b.html ? b.html : esc(b.text || '');
    const draw = () => {
      $('#blocks').innerHTML = blocks.map((b, i) => `<div class="st-blk" data-i="${i}">
        <div class="st-blk-bar"><select data-type="${i}">${BT.map(([k, l]) => `<option value="${k}" ${(b.type || b.t) === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button class="lnk" data-up="${i}" aria-label="Subir">↑</button><button class="lnk" data-down="${i}" aria-label="Bajar">↓</button><button class="lnk" data-ins="${i}">+ debajo</button><button class="lnk danger" data-rm="${i}" aria-label="Quitar">×</button></div>
        ${b.type === 'image' ? `<div class="st-row"><img src="${esc(media(b.url))}" alt="" style="max-height:120px"><input data-f="url" data-i="${i}" value="${esc(b.url || '')}" placeholder="URL"><input type="file" accept="image/*" data-up-img="${i}"></div><input data-f="alt" data-i="${i}" value="${esc(b.alt || '')}" placeholder="Texto alternativo"><input data-f="caption" data-i="${i}" value="${esc(b.caption || '')}" placeholder="Pie de imagen">`
        : b.type === 'separator' ? '<div class="sep">※</div>'
        : b.type === 'ruby' ? `<div class="st-row"><input data-f="text" data-i="${i}" value="${esc(b.text || '')}" placeholder="Texto base"><input data-f="reading" data-i="${i}" value="${esc(b.reading || '')}" placeholder="Lectura"></div>`
        : `<div class="st-ce ${b.type}" contenteditable="true" data-ce="${i}">${text(b)}</div>`}</div>`).join('') || '<p class="mono">Capítulo vacío.</p>';
    };
    app.innerHTML = shell('Editar capítulo', `
      <p class="mono"><a href="/estudio/obra/${c.series.slug}">‹ ${esc(c.series.title)}</a> · Vol. ${c.vol} · versión <span id="ver">${version}</span> · <span id="state">Guardado</span></p>
      ${local && local.at && local.version === version && JSON.stringify(local.blocks) !== JSON.stringify(blocks) ? `<div class="st-card"><span>Hay una copia local sin guardar del ${new Date(local.at).toLocaleString('es-MX')}.</span><span><button class="btn" id="restore">Recuperar</button> <button class="btn ghost" id="discard">Descartar</button></span></div>` : ''}
      <div class="st-row"><input id="ttl" value="${esc(title)}" style="flex:1"><select id="stype">${SEC.map(t => `<option ${t === type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="st-row st-sticky"><button class="btn" id="save">Guardar (Ctrl/Cmd+S)</button><button class="btn ghost" id="addb">+ Párrafo</button><button class="btn ghost" data-fmt="bold"><b>B</b></button><button class="btn ghost" data-fmt="italic"><i>I</i></button><button class="btn ghost" data-fmt="underline"><u>U</u></button><a class="btn ghost" href="/leer/${c.series.slug}/${c.num}" target="_blank">Vista previa</a><span class="mono" id="count"></span></div>
      <div id="blocks"></div>`, '/estudio/obra');
    draw(); counter();
    function counter(){ const words = blocks.reduce((a, b) => a + ((b.text || b.html?.replace(/<[^>]+>/g, '') || '').trim().split(/\s+/).filter(Boolean).length), 0); $('#count').textContent = `${words.toLocaleString('es-MX')} palabras · ${blocks.length} bloques · ${blocks.filter(b => b.type === 'image').length} imágenes`; }
    const root = $('.st-main');
    root.addEventListener('input', e => {
      const ce = e.target.closest('[data-ce]'); if (ce) { const b = blocks[+ce.dataset.ce]; b.html = ce.innerHTML; b.text = ce.textContent; }
      const f = e.target.dataset.f; if (f) blocks[+e.target.dataset.i][f] = e.target.value;
      if (e.target.id === 'ttl') title = e.target.value;
      mark(); counter();
    });
    root.addEventListener('change', async e => {
      if (e.target.dataset.type) { const b = blocks[+e.target.dataset.type]; b.type = e.target.value; delete b.t; mark(); draw(); }
      if (e.target.id === 'stype') { type = e.target.value; mark(); }
      if (e.target.dataset.upImg) { const f = e.target.files[0]; if (!f) return; if (f.size > LIMITS.image) return toast('La imagen pesa más de 8 MB'); const p = `${T.team.id}/series/${c.series_id}/vol-${c.vol}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`; const { error } = await sb.storage.from('obi-media').upload(p, f, { contentType: f.type }); if (error) return toast(error.message); blocks[+e.target.dataset.upImg].url = PUB + p; mark(); draw(); }
    });
    root.addEventListener('click', e => {
      const d = e.target.dataset, i = +(d.up ?? d.down ?? d.ins ?? d.rm ?? -1);
      if (d.up != null && i > 0) [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
      else if (d.down != null && i < blocks.length - 1) [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
      else if (d.ins != null) blocks.splice(i + 1, 0, { type: 'paragraph', text: '' });
      else if (d.rm != null) blocks.splice(i, 1);
      else if (e.target.closest('[data-fmt]')) { document.execCommand(e.target.closest('[data-fmt]').dataset.fmt); return; }
      else return;
      mark(); draw(); counter();
    });
    $('#addb').onclick = () => { blocks.push({ type: 'paragraph', text: '' }); mark(); draw(); };
    $('#restore')?.addEventListener('click', () => { ({ blocks, title, type } = local); $('#ttl').value = title; $('#stype').value = type; draw(); mark(); $('#restore').closest('.st-card').remove(); });
    $('#discard')?.addEventListener('click', () => { localStorage.removeItem(KEY); $('#discard').closest('.st-card').remove(); });
    const save = () => busy($('#save'), async () => {
      const clean = blocks.map(b => { const o = { ...b }; if (o.html && o.html === esc(o.text || '')) delete o.html; return o; });
      const { data, error } = await sb.rpc('save_chapter', { p_id: id, p_expected: version, p_title: title.trim() || 'Sin título', p_body: clean, p_note: null });
      if (error) { if (/version_conflict/.test(error.message)) throw new Error('Otro integrante guardó una versión más nueva. Tu copia local se conserva: recarga para comparar.'); throw error; }
      version = data; await sb.from('chapters').update({ section_type: type }).eq('id', id);
      dirty = false; localStorage.removeItem(KEY); $('#ver').textContent = version; $('#state').textContent = 'Guardado'; toast('Capítulo guardado');
    });
    $('#save').onclick = save;
    const key = e => { if (!document.body.contains(root)) { removeEventListener('keydown', key); removeEventListener('beforeunload', leave); return; } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    const leave = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('keydown', key); addEventListener('beforeunload', leave);
  }

  // ---------- importador ----------
  const sha256 = async buf => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
  const htmlToBlocks = (root, imgMap) => {
    const out = [];
    const push = (type, el) => { const html = el.innerHTML.replace(/\s*class="[^"]*"/g, '').trim(), text = el.textContent.trim(); if (text) out.push({ type, html, text }); };
    const walk = node => [...node.children].forEach(el => {
      const tg = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tg)) push('heading', el);
      else if (tg === 'p' || tg === 'li') { const img = el.querySelector('img,image'); if (img && !el.textContent.trim()) addImg(img); else push('paragraph', el); }
      else if (tg === 'blockquote') push('quote', el);
      else if (tg === 'hr') out.push({ type: 'separator' });
      else if (tg === 'img' || tg === 'image' || tg === 'svg') addImg(tg === 'svg' ? el.querySelector('image') : el);
      else if (el.children.length) walk(el); else if (el.textContent.trim()) push('paragraph', el);
    });
    const addImg = img => { if (!img) return; const src = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href'); const key = imgMap?.resolve(src); if (key) out.push({ type: 'image', url: key, alt: img.getAttribute('alt') || '', caption: '' }); };
    walk(root); return out;
  };
  async function deobfuscate(zip, opf, bytes, path){
    const enc = zip.file('META-INF/encryption.xml'); if (!enc) return bytes;
    const x = new DOMParser().parseFromString(await enc.async('string'), 'application/xml');
    const node = [...x.getElementsByTagNameNS('*', 'EncryptedData')].find(d => (d.getElementsByTagNameNS('*', 'CipherReference')[0]?.getAttribute('URI') || '') === path);
    if (!node) return bytes;
    const alg = node.getElementsByTagNameNS('*', 'EncryptionMethod')[0]?.getAttribute('Algorithm') || '';
    const uid = opf.uid.replace(/[\u0020\u0009\u000d\u000a]/g, '');
    const b = new Uint8Array(bytes);
    if (alg.includes('idpf.org/2008/embedding')) { const key = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(uid))); for (let i = 0; i < Math.min(1040, b.length); i++) b[i] ^= key[i % key.length]; }
    else if (alg.includes('ns.adobe.com/pdf/enc#RC')) { const hex = uid.replace(/^urn:uuid:/i, '').replace(/-/g, ''); const key = new Uint8Array(16); for (let i = 0; i < 16; i++) key[i] = parseInt(hex.substr(i * 2, 2), 16); for (let i = 0; i < Math.min(1024, b.length); i++) b[i] ^= key[i % 16]; }
    return b;
  }
  async function parseEpub(file){
    const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
    const zip = await JSZip.loadAsync(file);
    const files = Object.values(zip.files); if (files.length > LIMITS.entries) throw new Error('El EPUB tiene demasiados archivos');
    const total = files.reduce((a, f) => a + (f._data?.uncompressedSize || 0), 0); if (total > LIMITS.unzipped) throw new Error('El EPUB descomprimido supera 300 MB');
    const cont = new DOMParser().parseFromString(await zip.file('META-INF/container.xml').async('string'), 'application/xml');
    const opfPath = cont.querySelector('rootfile').getAttribute('full-path'), base = opfPath.replace(/[^/]*$/, '');
    const X = new DOMParser().parseFromString(await zip.file(opfPath).async('string'), 'application/xml');
    const uidId = X.documentElement.getAttribute('unique-identifier'), uid = [...X.getElementsByTagNameNS('*', 'identifier')].find(e => e.getAttribute('id') === uidId)?.textContent || '';
    const res = (from, href) => { const u = new URL(href, 'http://x/' + from); return decodeURIComponent(u.pathname.slice(1)); };
    const items = Object.fromEntries([...X.getElementsByTagNameNS('*', 'item')].map(i => [i.getAttribute('id'), { href: res(opfPath, i.getAttribute('href')), type: i.getAttribute('media-type'), props: i.getAttribute('properties') || '' }]));
    const title = X.getElementsByTagNameNS('*', 'title')[0]?.textContent || file.name;
    const images = new Map(), fonts = [];
    for (const it of Object.values(items)) {
      if (/^image\//.test(it.type)) images.set(it.href, { blob: await zip.file(it.href)?.async('blob'), type: it.type, name: it.href.split('/').pop() });
      if (/font|opentype|woff|truetype/.test(it.type) || /\.(ttf|otf|woff2?)$/i.test(it.href)) { const raw = await zip.file(it.href)?.async('uint8array'); if (raw) fonts.push({ href: it.href, bytes: await deobfuscate(zip, { uid }, raw, it.href), name: it.href.split('/').pop() }); }
    }
    // familias desde las hojas de estilo
    const fam = {}; for (const it of Object.values(items).filter(i => i.type === 'text/css')) { const css = await zip.file(it.href)?.async('string') || ''; for (const m of css.matchAll(/@font-face\s*{([^}]*)}/g)) { const f = /font-family\s*:\s*["']?([^;"']+)/.exec(m[1])?.[1]?.trim(), src = /url\(\s*["']?([^)"']+)/.exec(m[1])?.[1], st = /font-style\s*:\s*(\w+)/.exec(m[1])?.[1] || 'normal', wt = /font-weight\s*:\s*(\w+)/.exec(m[1])?.[1] || 'normal'; if (f && src) fam[res(it.href, src)] = { family: f, style: st, weight: wt }; } }
    fonts.forEach(f => Object.assign(f, fam[f.href] || { family: f.name.replace(/\.\w+$/, ''), style: 'normal', weight: 'normal' }));
    // títulos del índice
    const tocTitles = {}; const nav = Object.values(items).find(i => i.props.includes('nav'));
    if (nav) { const d = new DOMParser().parseFromString(await zip.file(nav.href).async('string'), 'application/xhtml+xml'); d.querySelectorAll('nav a[href]').forEach(a => tocTitles[res(nav.href, a.getAttribute('href')).split('#')[0]] ||= a.textContent.trim()); }
    else { const ncx = Object.values(items).find(i => i.type === 'application/x-dtbncx+xml'); if (ncx) { const d = new DOMParser().parseFromString(await zip.file(ncx.href).async('string'), 'application/xml'); d.querySelectorAll('navPoint').forEach(n => { const s = n.querySelector('content')?.getAttribute('src'); if (s) tocTitles[res(ncx.href, s).split('#')[0]] ||= n.querySelector('text')?.textContent.trim(); }); } }
    const chapters = [];
    for (const ref of X.getElementsByTagNameNS('*', 'itemref')) {
      const it = items[ref.getAttribute('idref')]; if (!it || !/html/.test(it.type)) continue;
      const doc = new DOMParser().parseFromString(await zip.file(it.href).async('string'), 'application/xhtml+xml');
      const blocks = htmlToBlocks(doc.body || doc.documentElement, { resolve: s => s && images.has(res(it.href, s)) ? 'img:' + res(it.href, s) : null });
      if (!blocks.length) continue;
      const t = tocTitles[it.href] || blocks.find(b => b.type === 'heading')?.text || `Sección ${chapters.length + 1}`;
      chapters.push({ title: t.slice(0, 200), type: /pr[oó]log/i.test(t) ? 'Prólogo' : /ep[ií]log/i.test(t) ? 'Epílogo' : /afterword|palabras del autor/i.test(t) ? 'Afterword' : /interlud/i.test(t) ? 'Interludio' : 'Capítulo', blocks });
    }
    const coverItem = Object.values(items).find(i => i.props.includes('cover-image'));
    return { title, chapters, images, fonts, cover: coverItem ? 'img:' + coverItem.href : null };
  }
  async function parseDocx(file){
    const { default: mammoth } = await import('https://esm.sh/mammoth@1.8.0/mammoth.browser.js');
    const images = new Map(); let n = 0;
    const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(async img => { const k = 'docx-' + (++n) + '.' + (img.contentType.split('/')[1] || 'png'); images.set(k, { blob: new Blob([await img.read()], { type: img.contentType }), type: img.contentType, name: k }); return { src: k }; }) });
    const doc = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html');
    const blocks = htmlToBlocks(doc.body, { resolve: s => images.has(s) ? 'img:' + s : null });
    return { title: file.name.replace(/\.docx$/i, ''), chapters: splitByHeadings(blocks), images, fonts: [], cover: null };
  }
  async function parsePdf(file){
    const pdfjs = await import('https://esm.sh/pdfjs-dist@4.4.168');
    globalThis.pdfjsWorker = await import('https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs');
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent(); const rows = new Map();
      tc.items.forEach(i => { if (!i.str.trim()) return; const y = Math.round(i.transform[5]); const r = rows.get(y) || { y, size: 0, text: '' }; r.text += (r.text && !r.text.endsWith(' ') ? ' ' : '') + i.str; r.size = Math.max(r.size, Math.abs(i.transform[0])); rows.set(y, r); });
      lines.push(...[...rows.values()].sort((a, b) => b.y - a.y));
    }
    const med = lines.map(l => l.size).sort((a, b) => a - b)[lines.length >> 1] || 10, blocks = []; let cur = '';
    const flush = () => { if (cur.trim()) blocks.push({ type: 'paragraph', text: cur.trim() }); cur = ''; };
    lines.forEach(l => { if (l.size > med * 1.3 && l.text.length < 120) { flush(); blocks.push({ type: 'heading', text: l.text.trim() }); } else { cur += (cur ? ' ' : '') + l.text; if (/[.!?»”]$/.test(l.text.trim())) flush(); } }); flush();
    return { title: file.name.replace(/\.pdf$/i, ''), chapters: splitByHeadings(blocks), images: new Map(), fonts: [], cover: null };
  }
  function splitByHeadings(blocks){
    const out = []; let cur = null;
    blocks.forEach(b => { if (b.type === 'heading' && (!cur || cur.blocks.length > 2)) { cur = { title: b.text.slice(0, 200), type: 'Capítulo', blocks: [b] }; out.push(cur); } else { if (!cur) { cur = { title: 'Sección 1', type: 'Capítulo', blocks: [] }; out.push(cur); } cur.blocks.push(b); } });
    return out;
  }

  async function importer(){
    if (!(await ensure())) return;
    if (!can('import')) { app.innerHTML = shell('Importar', '<p>Tu rol no permite importar archivos.</p>', '/estudio/importar'); bindPicker(importer); return; }
    const { data: works } = await sb.from('series').select('id,slug,title,volumes(id,num)').eq('team_id', T.team.id).order('title');
    let P = null, file = null, fp = null;
    app.innerHTML = shell('Importar contenido', `
      <ol class="st-steps"><li>Archivo</li><li>Análisis</li><li>Estructura</li><li>Destino</li><li>Guardar</li></ol>
      <label class="st-drop">EPUB, DOCX o PDF · máx. 80 MB<input type="file" id="file" accept=".epub,.docx,.pdf"></label>
      <p id="status" class="mono"></p><div id="wiz"></div>`, '/estudio/importar');
    bindPicker(importer);
    $('#file').onchange = async e => {
      file = e.target.files[0]; if (!file) return;
      const st = $('#status');
      try {
        if (file.size > LIMITS.file) throw new Error('El archivo supera 80 MB');
        st.textContent = 'Calculando huella…'; fp = await sha256(await file.arrayBuffer());
        const { data: dup } = await sb.from('import_jobs').select('created_at,filename').eq('team_id', T.team.id).eq('fingerprint', fp).eq('status', 'done').limit(1);
        st.textContent = 'Analizando…';
        P = /\.epub$/i.test(file.name) ? await parseEpub(file) : /\.docx$/i.test(file.name) ? await parseDocx(file) : /\.pdf$/i.test(file.name) ? await parsePdf(file) : (() => { throw new Error('Formato no admitido'); })();
        st.textContent = `${P.chapters.length} secciones · ${P.images.size} imágenes · ${P.fonts.length} fuentes${dup?.length ? ` · ⚠ ya importaste este archivo el ${new Date(dup[0].created_at).toLocaleDateString('es-MX')}` : ''}`;
        wizard();
      } catch (er) { st.textContent = 'No se pudo leer: ' + er.message; }
    };
    function wizard(){
      const ch = P.chapters;
      $('#wiz').innerHTML = `<h2>Estructura</h2><ol class="st-ch">${ch.map((c, i) => `<li><span class="mono">${i + 1}</span><input data-t="${i}" value="${esc(c.title)}"><select data-k="${i}">${SEC.map(s => `<option ${s === c.type ? 'selected' : ''}>${s}</option>`).join('')}</select><span class="mono">${c.blocks.length} bl.</span>
          <span><button class="lnk" data-mv="${i}" data-d="-1">↑</button><button class="lnk" data-mv="${i}" data-d="1">↓</button><button class="lnk" data-merge="${i}" ${i === ch.length - 1 ? 'disabled' : ''}>Unir con siguiente</button><button class="lnk" data-split="${i}">Dividir</button><button class="lnk danger" data-del="${i}">×</button></span></li>`).join('')}</ol>
        <h2>Destino</h2><div class="st-row">
          <select id="dst"><option value="">— Nueva obra: ${esc(P.title)} —</option>${(works || []).map(w => `<option value="${w.id}">${esc(w.title)}</option>`).join('')}</select>
          <label class="mono">Volumen <input id="vnum" type="number" min="1" value="1" style="width:80px"></label>
          <select id="mode"><option value="append">Agregar después de los existentes</option><option value="replace">Reemplazar capítulos del volumen</option></select>
          ${P.cover ? '<label class="mono"><input type="checkbox" id="usecover" checked> Usar portada detectada</label>' : ''}</div>
        <p class="st-row"><button class="btn ghost" id="save-draft">Guardar como borrador</button>${can('publish') ? '<button class="btn" id="save-pub">Guardar y publicar</button>' : ''}</p>`;
      const W = $('#wiz');
      W.querySelectorAll('[data-t]').forEach(i => i.oninput = () => ch[+i.dataset.t].title = i.value);
      W.querySelectorAll('[data-k]').forEach(s => s.onchange = () => ch[+s.dataset.k].type = s.value);
      W.onclick = e => { const d = e.target.dataset; let i;
        if (d.mv != null) { i = +d.mv; const j = i + +d.d; if (j < 0 || j >= ch.length) return; [ch[i], ch[j]] = [ch[j], ch[i]]; }
        else if (d.merge != null) { i = +d.merge; ch[i].blocks.push(...ch[i + 1].blocks); ch.splice(i + 1, 1); }
        else if (d.split != null) { i = +d.split; const at = +prompt(`¿En qué bloque empieza la nueva sección? (2–${ch[i].blocks.length})`, Math.ceil(ch[i].blocks.length / 2)); if (!(at > 1 && at <= ch[i].blocks.length)) return; const rest = ch[i].blocks.splice(at - 1); ch.splice(i + 1, 0, { title: rest.find(b => b.type === 'heading')?.text || ch[i].title + ' (cont.)', type: ch[i].type, blocks: rest }); }
        else if (d.del != null) ch.splice(+d.del, 1);
        else if (e.target.id === 'save-draft' || e.target.id === 'save-pub') return busy(e.target, () => commit(e.target.id === 'save-pub'));
        else return;
        wizard(); };
    }
    async function commit(publish){
      const uploaded = [], inserted = []; let job = null;
      const dstId = $('#dst').value, vnum = Math.max(1, +$('#vnum').value || 1), mode = $('#mode').value;
      try {
        ({ data: job } = await sb.from('import_jobs').insert({ team_id: T.team.id, created_by: getUser().id, filename: file.name, file_type: file.name.split('.').pop().toLowerCase(), mode, status: 'running', fingerprint: fp }).select().single());
        let s = dstId ? works.find(w => w.id === dstId) : null;
        if (!s) { const slug = P.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 50) + '-' + Date.now().toString(36).slice(-4); const r = await sb.from('series').insert({ team_id: T.team.id, slug, title: P.title, short: P.title.slice(0, 26), published: false }).select().single(); if (r.error) throw r.error; s = { ...r.data, volumes: [] }; }
        const prefix = `${T.team.id}/series/${s.id}/vol-${vnum}/import-${job.id}/`, map = {};
        const up = async (name, blob, type) => { if (blob.size > LIMITS.image && /^image/.test(type)) throw new Error(`La imagen ${name} supera 8 MB`); const p = prefix + name.replace(/[^\w.-]/g, '_'); const { error } = await sb.storage.from('obi-media').upload(p, blob, { contentType: type, upsert: true }); if (error) throw error; uploaded.push(p); return p; };
        const used = new Set(P.chapters.flatMap(c => c.blocks.filter(b => b.type === 'image').map(b => b.url))); if (P.cover && $('#usecover')?.checked) used.add(P.cover);
        let k = 0; for (const key of used) { const im = P.images.get(key.replace(/^img:/, '')); if (im?.blob) { $('#status').textContent = `Subiendo imágenes ${++k}/${used.size}…`; map[key] = await up(im.name, im.blob, im.type); } }
        const fonts = []; for (const f of P.fonts) { const p = await up(f.name, new Blob([f.bytes]), /woff2/.test(f.name) ? 'font/woff2' : /woff/.test(f.name) ? 'font/woff' : /otf/.test(f.name) ? 'font/otf' : 'font/ttf'); fonts.push({ url: PUB + p, family: f.family, style: f.style, weight: f.weight }); }
        let vol = (s.volumes || []).find(v => v.num === vnum);
        if (!vol) { const r = await sb.from('volumes').insert({ series_id: s.id, num: vnum, status: 'draft', epub_fonts: fonts, cover_path: map[P.cover] || null }).select().single(); if (r.error) throw r.error; vol = r.data; }
        else { const patch = {}; if (fonts.length) patch.epub_fonts = fonts; if (map[P.cover]) patch.cover_path = map[P.cover]; if (Object.keys(patch).length) await sb.from('volumes').update(patch).eq('id', vol.id); }
        if (map[P.cover] && !s.cover_path) await sb.from('series').update({ cover_path: map[P.cover] }).eq('id', s.id);
        const { data: existing } = await sb.from('chapters').select('id,num,vol').eq('series_id', s.id).is('deleted_at', null);
        if (mode === 'replace') { const old = (existing || []).filter(c => c.vol === vnum).map(c => c.id); const { data: inVol } = await sb.from('chapters').select('id').eq('volume_id', vol.id); const ids = [...new Set([...old, ...(inVol || []).map(c => c.id)])]; if (ids.length) { if (!confirm(`Se reemplazarán ${ids.length} capítulos del Volumen ${vnum}. Las versiones anteriores quedan en el historial de revisiones. ¿Continuar?`)) throw new Error('Importación cancelada'); await sb.from('chapters').update({ deleted_at: new Date().toISOString() }).in('id', ids); } }
        let num = Math.max(0, ...(existing || []).map(c => c.num));
        const rows = P.chapters.map((c, i) => ({ series_id: s.id, volume_id: vol.id, vol: vnum, num: ++num, sort_order: i, title: c.title, section_type: c.type, status: 'draft', body: c.blocks.map(b => b.type === 'image' ? { ...b, url: map[b.url] ? PUB + map[b.url] : b.url } : b).filter(b => b.type !== 'image' || /^https?:/.test(b.url)) }));
        for (let i = 0; i < rows.length; i += 10) { const r = await sb.from('chapters').insert(rows.slice(i, i + 10)).select('id'); if (r.error) throw r.error; inserted.push(...r.data.map(x => x.id)); }
        if (publish) { const r = await sb.rpc('publish_volume', { p_volume: vol.id }); if (r.error) throw r.error; }
        await sb.from('import_jobs').update({ status: 'done', media_paths: uploaded, result: { series: s.id, volume: vol.id, chapters: inserted.length } }).eq('id', job.id);
        toast(`Importados ${inserted.length} capítulos${publish ? ' y publicados' : ' como borrador'}`); go('/estudio/obra/' + s.slug);
      } catch (er) {
        if (inserted.length) await sb.from('chapters').delete().in('id', inserted);
        if (uploaded.length) await sb.storage.from('obi-media').remove(uploaded);
        if (job) await sb.from('import_jobs').update({ status: 'failed', result: { error: er.message } }).eq('id', job.id);
        throw new Error('Se deshizo la importación: ' + (er.hint || er.message));
      }
    }
  }

  // ---------- multimedia ----------
  async function library(folder = '', page = 0){
    if (!(await ensure())) return;
    const root = T.team.id + '/' + folder;
    const { data, error } = await sb.storage.from('obi-media').list(root.replace(/\/$/, ''), { limit: 41, offset: page * 40, sortBy: { column: 'name', order: 'asc' } });
    const list = (data || []).slice(0, 40), dirs = list.filter(x => !x.id), files = list.filter(x => x.id);
    const crumbs = folder.split('/').filter(Boolean);
    app.innerHTML = shell('Multimedia', `
      <p class="mono"><a href="#" data-dir="">${esc(T.team.name)}</a>${crumbs.map((c, i) => ` / <a href="#" data-dir="${esc(crumbs.slice(0, i + 1).join('/') + '/')}">${esc(c)}</a>`).join('')}</p>
      ${error ? `<p>${esc(error.message)}</p>` : ''}
      <div class="st-row">${can('edit') ? '<label class="btn ghost">Subir imágenes<input type="file" id="upl" accept="image/*" multiple hidden></label>' : ''}<button class="btn ghost" id="selall">Seleccionar página</button>${can('delete') ? '<button class="btn ghost danger" id="delsel">Borrar seleccionadas</button>' : ''}<span class="mono" id="sel">0 seleccionadas</span></div>
      <div class="st-media">${dirs.map(d => `<a href="#" class="st-dir" data-dir="${esc(folder + d.name + '/')}">📁 ${esc(d.name)}</a>`).join('')}${files.map(f => { const p = root + f.name; return `<label class="st-file"><input type="checkbox" data-p="${esc(p)}">${/\.(png|jpe?g|webp|gif|avif)$/i.test(f.name) ? `<img src="${esc(media(p))}" alt="" loading="lazy">` : '<span class="mono">fuente</span>'}<span class="mono">${esc(f.name)} · ${Math.round((f.metadata?.size || 0) / 1024)} KB</span><button class="lnk" data-copy="${esc(media(p))}">Copiar URL</button></label>`; }).join('') || (dirs.length ? '' : '<p class="mono">Carpeta vacía.</p>')}</div>
      <p class="st-row">${page > 0 ? '<button class="btn ghost" id="prev">‹ Anterior</button>' : ''}${(data || []).length > 40 ? '<button class="btn ghost" id="next">Siguiente ›</button>' : ''}</p>`, '/estudio/multimedia');
    bindPicker(() => library());
    app.querySelectorAll('[data-dir]').forEach(a => a.onclick = e => { e.preventDefault(); library(a.dataset.dir, 0); });
    app.querySelectorAll('[data-copy]').forEach(b => b.onclick = e => { e.preventDefault(); navigator.clipboard?.writeText(b.dataset.copy); toast('URL copiada'); });
    const boxes = () => [...app.querySelectorAll('[data-p]')], count = () => $('#sel').textContent = boxes().filter(b => b.checked).length + ' seleccionadas';
    app.querySelectorAll('[data-p]').forEach(b => b.onchange = count);
    $('#selall').onclick = () => { const all = boxes().every(b => b.checked); boxes().forEach(b => b.checked = !all); count(); };
    $('#prev')?.addEventListener('click', () => library(folder, page - 1)); $('#next')?.addEventListener('click', () => library(folder, page + 1));
    $('#upl')?.addEventListener('change', e => busy(null, async () => { for (const f of e.target.files) { if (f.size > LIMITS.image) { toast(f.name + ' supera 8 MB'); continue; } const { error } = await sb.storage.from('obi-media').upload(root + Date.now() + '-' + f.name.replace(/[^\w.-]/g, '_'), f, { contentType: f.type }); if (error) toast(error.message); } library(folder, page); }));
    $('#delsel')?.addEventListener('click', e => busy(e.target, async () => {
      const paths = boxes().filter(b => b.checked).map(b => b.dataset.p); if (!paths.length) throw new Error('Selecciona archivos');
      const { data: used } = await sb.rpc('media_in_use', { p_team: T.team.id, p_paths: paths });
      const free = paths.filter(p => !(used || []).includes(p));
      if (free.length) { const { error } = await sb.storage.from('obi-media').remove(free); if (error) throw error; }
      toast(`${free.length} borradas${used?.length ? ` · ${used.length} protegidas porque están en uso` : ''}`); library(folder, page);
    }));
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
      <div class="st-row"><select id="glser">${works.map(w => `<option value="${w.slug}" ${w.id === s.id ? 'selected' : ''}>${esc(w.title)}</option>`).join('')}</select><span class="mono" id="glcount"></span></div>
      <p class="mono">Los términos se marcan solos en el lector. Al tocarlos, el lector ve la definición sin salir del capítulo.</p>
      ${ed ? `<div class="st-card gl-form">
        <div class="st-row"><input id="glterm" maxlength="60" placeholder="Término tal como aparece en el texto"><select id="glcat">${opt('Personaje')}</select></div>
        <textarea id="gldef" maxlength="600" rows="3" placeholder="Definición que verá el lector"></textarea>
        <div class="st-row"><button class="btn" id="glsave">Añadir término</button><button class="btn ghost" id="glcancel" hidden>Cancelar</button></div>
        <details><summary class="mono">Añadir varios a la vez</summary><p class="mono">Uno por línea: término | tipo | definición</p><textarea id="glbulk" rows="5" placeholder="umeboshi | Comida | Ciruela encurtida en sal, muy ácida."></textarea><button class="btn ghost" id="glbulkbtn">Añadir lista</button></details>
      </div>` : '<p class="mono">Tu rol solo puede ver el glosario.</p>'}
      <div class="st-row"><input id="glq" placeholder="Buscar término o definición"><select id="glf"><option value="">Todos los tipos</option>${GT.map(t => `<option>${t}</option>`).join('')}</select></div>
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

  // ---------- equipo y permisos ----------
  async function team(){
    if (!(await ensure())) return;
    const { data: mem } = await sb.from('team_members').select('user_id,role,overrides,profiles(username,avatar_url)').eq('team_id', T.team.id);
    const admin = ['owner', 'admin'].includes(T.team.role);
    app.innerHTML = shell('Equipo y permisos', `
      <p class="mono">Cada permiso puede heredarse del rol, permitirse o denegarse. Propietario y Administrador tienen acceso completo. Las mismas reglas se aplican en el servidor.</p>
      <div class="st-perm"><span></span>${ACTIONS.map(([, l]) => `<span class="mono">${l}</span>`).join('')}
      ${(mem || []).map(m => { const full = ['owner', 'admin'].includes(m.role); return `<span><strong>${esc(m.profiles?.username || m.user_id.slice(0, 8))}</strong><br>${admin && !full ? `<select data-role="${m.user_id}">${ROLES.filter(([k]) => k !== 'owner').map(([k, l]) => `<option value="${k}" ${k === m.role ? 'selected' : ''}>${l}</option>`).join('')}</select> <button class="lnk danger" data-rm="${m.user_id}">Retirar</button>` : `<span class="mono">${ROLES.find(r => r[0] === m.role)?.[1]}</span>`}</span>
        ${ACTIONS.map(([a]) => { const v = (m.overrides || {})[a]; const st = full ? 'full' : v === true ? 'allow' : v === false ? 'deny' : 'inherit'; return `<button class="st-cell ${st}" ${admin && !full ? `data-u="${m.user_id}" data-a="${a}"` : 'disabled'} title="${{ full: 'Acceso completo', allow: 'Permitido', deny: 'Denegado', inherit: 'Heredado del rol' }[st]}">${{ full: '✓', allow: '✓', deny: '✕', inherit: '·' }[st]}</button>`; }).join('')}`; }).join('')}</div>
      ${admin ? '<p class="st-row"><input id="mail" type="email" placeholder="Correo del integrante"><select id="nrole">' + ROLES.filter(([k]) => k !== 'owner').map(([k, l]) => `<option value="${k}" ${k === 'collaborator' ? 'selected' : ''}>${l}</option>`).join('') + '</select><button class="btn" id="add">Agregar</button></p>' : ''}`, '/estudio/equipo');
    bindPicker(team);
    const memOf = u => mem.find(m => m.user_id === u);
    app.querySelectorAll('[data-a]').forEach(b => b.onclick = () => busy(b, async () => { const m = memOf(b.dataset.u), o = { ...(m.overrides || {}) }, a = b.dataset.a; o[a] = o[a] === undefined ? true : o[a] === true ? false : undefined; if (o[a] === undefined) delete o[a]; const { error } = await sb.from('team_members').update({ overrides: o }).eq('team_id', T.team.id).eq('user_id', m.user_id); if (error) throw error; team(); }));
    app.querySelectorAll('[data-role]').forEach(s => s.onchange = () => busy(null, async () => { const { error } = await sb.from('team_members').update({ role: s.value }).eq('team_id', T.team.id).eq('user_id', s.dataset.role); if (error) throw error; toast('Rol actualizado'); }));
    app.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => busy(b, async () => { if (!confirm('¿Retirar a este integrante?')) return; const { error } = await sb.from('team_members').delete().eq('team_id', T.team.id).eq('user_id', b.dataset.rm); if (error) throw error; team(); }));
    $('#add')?.addEventListener('click', e => busy(e.target, async () => { const { data } = await sb.rpc('team_find_user', { p_team: T.team.id, p_email: $('#mail').value.trim() }); if (!data?.length) throw new Error('No hay una cuenta con ese correo'); const { error } = await sb.from('team_members').insert({ team_id: T.team.id, user_id: data[0].id, role: $('#nrole').value }); if (error) throw error; toast(data[0].username + ' agregado'); team(); }));
  }

  return { home, works, work, editor, importer, library: () => library(), team, glossary, isMember: async () => { const u = getUser(); if (!u) return false; const { count } = await sb.from('team_members').select('*', { count: 'exact', head: true }).eq('user_id', u.id); return count > 0; } };
}

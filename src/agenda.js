// Calendario: una sola vista con lo publicado (últimos 30 días), lo programado, lo bloqueado para mecenas,
import { attachPublicCredits, creditTeams, creditsHTML, installCreditImageFallback } from './public-collaboration-credits.js?v=1';
// las aperturas a todo público, los volúmenes y los aniversarios de los equipos. Vistas: Semana, Línea de tiempo y Mes.
const COL = { pub: '#f2c230', pat: '#f96854', open: '#a9d18e', prog: '#8cc3f2', vol: '#c9a0e8', aniv: '#efe6d2' };
const LEG = [['pub', 'Estreno público'], ['pat', 'Estreno para mecenas'], ['open', 'Apertura al público general'], ['prog', 'Programado'], ['vol', 'Volumen completo'], ['aniv', 'Aniversario de equipo']];
const FIL = [['', 'Todos los eventos'], ['pub', 'Estreno público'], ['pat', 'Estreno mecenas'], ['open', 'Apertura general'], ['prog', 'Programados'], ['vol', 'Volúmenes']];
const VIEWS = [['semana', 'Semana'], ['linea', 'Agenda'], ['mes', 'Mes']];
const PERIODS = [['', 'Todo el periodo'], ['next', 'Próximos'], ['past', 'Anteriores']];
const ACCESS = [['', 'Cualquier acceso'], ['readable', 'Puedo leer ahora'], ['restricted', 'Restringidos']];
const TAG = { pub: 'Publicado', pat: 'Solo mecenas', open: 'Se abre a todo público', prog: 'Programado', vol: 'Volumen completo', aniv: 'Aniversario' };
const DAY = 864e5, PAST = 30, FUT = 60, SITE = 'https://obidellector.com';
const JOIN = u => { try { const x = new URL(u); if (!/(^|\.)patreon\.com$/.test(x.hostname) || x.searchParams.has('u') || /\/(membership|join|checkout)(\/|$)/.test(x.pathname)) return u; x.pathname = x.pathname.replace(/\/+$/, '') + '/membership'; return x.toString(); } catch { return u; } };
const CSS = `
.ag-h{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 18px;align-items:flex-end}.ag-h h1{margin:0}.ag-h p{margin:4px 0 0;color:var(--mute,#a89f8a)}
.ag-cnt{display:inline-flex;gap:8px;align-items:center;padding:7px 12px;border:1px solid #a9d18e;color:#a9d18e;background:none;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.ag-bar{position:sticky;top:0;z-index:6;background:rgba(13,12,10,.94);backdrop-filter:blur(6px);border-bottom:1px solid #2f2a20;padding:10px 0;display:grid;gap:8px;margin:14px 0 18px}
.ag-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ag-row.sp{justify-content:space-between}
.ag-tabs{display:inline-flex;border:1px solid #3d3628}.ag-tabs button{padding:8px 14px;background:none;border:0;border-right:1px solid #3d3628;color:#cfc6b0;font:inherit;font-size:14px;cursor:pointer}.ag-tabs button:last-child{border-right:0}.ag-tabs button.on{background:#f2c230;color:#0d0c0a;font-weight:600}
.ag-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.ag-chip{flex:none;padding:6px 11px;border:1px solid #3d3628;background:none;color:#cfc6b0;font:inherit;font-size:13px;cursor:pointer;display:inline-flex;gap:6px;align-items:center}.ag-chip.on{border-color:#f2c230;color:#f3ecd9;background:#2a2412}.ag-chip i{width:9px;height:9px;border-radius:50%;background:var(--c)}.ag-chip em{font-style:normal;color:#a9d18e;font-weight:600}
.ag-sel{background:#16140f;color:#f3ecd9;border:1px solid #3d3628;padding:6px 8px;font:inherit;font-size:13px;max-width:200px}
.ag-tg{display:inline-flex;gap:6px;align-items:center;font-size:13px;color:#cfc6b0;cursor:pointer;white-space:nowrap}
.ag-leg{display:flex;gap:6px 14px;overflow-x:auto;font-size:12px;color:#a89f8a;scrollbar-width:none}.ag-leg span{display:inline-flex;gap:6px;align-items:center;white-space:nowrap}.ag-leg i{width:10px;height:10px;background:var(--c)}
.ag-nav{display:flex;gap:6px;align-items:center}.ag-nav b{min-width:150px;text-align:center;font-weight:600;text-transform:capitalize}
.ag-btn{padding:6px 11px;border:1px solid #3d3628;background:#16140f;color:#f3ecd9;font:inherit;font-size:13px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;line-height:1.2}.ag-btn:hover{border-color:#f2c230;color:#f3ecd9}
.ag-btn.pat{background:#f96854;border-color:#f96854;color:#1a0d0a;font-weight:600}.ag-btn.on{border-color:#a9d18e;color:#a9d18e}
.ag-period{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.ag-period-btn{border:1px solid #3d3628;background:#16140f;color:#cfc6b0;padding:9px 12px;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;font:inherit}.ag-period-btn strong{font-size:20px;color:#f3ecd9}.ag-period-btn span{font-size:12px}.ag-period-btn.on{border-color:#f2c230;background:#2a2412}.ag-period-btn:focus-visible{outline:2px solid #f2c230;outline-offset:2px}
.ag-milestones{display:flex;flex-wrap:wrap;gap:5px 14px;font-size:12px;color:#cfc6b0;margin-top:3px}.ag-milestones span{display:inline-flex;gap:5px;align-items:baseline}.ag-milestones b{color:#f3ecd9;font-weight:600}
.ag-chapters{margin:5px 0 1px;border-top:1px solid #312b20;padding-top:6px}.ag-chapters summary{cursor:pointer;color:#e5cb7d;font-size:12px;display:list-item;list-style-position:inside}.ag-chapter-list{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 3px}.ag-chapter-list a,.ag-chapter-list span{border:1px solid #413927;padding:4px 7px;font-size:11px;color:#e7dec9;text-decoration:none}.ag-chapter-list a:hover{border-color:#f2c230;color:#f2c230}
.ag-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.ag-day{border:1px solid #2f2a20;background:#100f0c;min-height:150px;display:flex;flex-direction:column;min-width:0}.ag-day.today{border-color:#f2c230}
.ag-dh{display:flex;justify-content:space-between;align-items:baseline;padding:6px 8px;border-bottom:1px solid #2f2a20;font-size:12px;color:#a89f8a;text-transform:capitalize}.ag-dh b{color:#f3ecd9;font-size:16px}.ag-day.today .ag-dh b{color:#f2c230}
.ag-dl{display:grid;gap:6px;padding:6px}.ag-none{font-size:12px;color:#6b6252;padding:8px}
.ag-ev{display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;padding:8px;background:#16140f;border:1px solid #2a2519;min-width:0}
.ag-ev.c{grid-template-columns:34px minmax(0,1fr);gap:7px;padding:6px;font-size:12px}
.ag-cv{width:100%;aspect-ratio:2/3;background:#2a2519 center/cover no-repeat;display:block}
.ag-bd{display:grid;gap:3px;min-width:0;align-content:start}.ag-bd>*{min-width:0}.ag-t,.ag-m{overflow-wrap:anywhere}.ag-tg2{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--c)}.ag-tg2 i{width:8px;height:8px;background:var(--c);flex:none}
.ag-t{color:#f3ecd9;font-weight:600;text-decoration:none;overflow-wrap:anywhere}.ag-t:hover{text-decoration:underline;text-underline-offset:3px}
.ag-m{font-size:12px;color:#a89f8a;overflow-wrap:anywhere}.ag-m b{color:#cfc6b0;font-weight:600}.ag-m .rd{color:#a9d18e}.ag-m .ur{color:#f2c230}
.ag-cd{font-size:12px;color:#a9d18e;font-weight:600}
.ag-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.ag-acts .ag-btn{overflow-wrap:normal;white-space:nowrap;flex:none}.ag-ev.c .ag-acts .ag-btn{padding:4px 7px;font-size:11px;flex:0 1 auto;max-width:100%;white-space:normal;word-break:normal;text-align:left}
.ag-ev.c .ag-tg2{letter-spacing:.02em}
.ag-line{display:grid;gap:22px}.ag-ld h2{display:flex;gap:10px;align-items:baseline;margin:0 0 8px;font-size:20px;font-weight:500;text-transform:capitalize}.ag-ld h2 small{font-size:12px;color:#a89f8a}
.ag-ll{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))}
.ag-now{display:flex;align-items:center;gap:12px;color:#f2c230;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px}.ag-now::before,.ag-now::after{content:"";flex:1;height:2px;background:#f2c230}
.ag-mon{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #2f2a20;border-top:1px solid #2f2a20}
.ag-mh{padding:6px;font-size:12px;color:#a89f8a;text-align:center;border-right:1px solid #2f2a20;border-bottom:1px solid #2f2a20;text-transform:capitalize}
.ag-mc{min-height:96px;padding:5px;border:0;border-right:1px solid #2f2a20;border-bottom:1px solid #2f2a20;border-radius:0;background-clip:padding-box;background:#100f0c;display:flex;flex-direction:column;gap:3px;cursor:pointer;text-align:left;font:inherit;color:inherit;min-width:0}
.ag-mc.out{background:#0b0a08;color:#5c5546}.ag-mc.today{outline:2px solid #f2c230;outline-offset:-2px}.ag-mc.sel{background:#2a2412}
.ag-mc>b{font-size:13px}.ag-mcount{margin-left:auto;border-radius:10px;padding:0 5px;background:#3c3320;color:#f3ecd9;font-size:10px;font-weight:700}.ag-mi{display:flex;gap:4px;align-items:center;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cfc6b0}.ag-mi i{width:7px;height:7px;flex:none;background:var(--c)}.ag-mf{font-size:11px;color:var(--fc);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-msel{margin-top:16px}.ag-msel h2{font-size:18px;font-weight:500;margin:0 0 8px;text-transform:capitalize}
.ag-empty{padding:30px 0;color:#a89f8a}
.ag-foot{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:space-between;margin-top:22px;font-size:12px;color:#a89f8a}
@media (max-width:1180px){.ag-ev.c{grid-template-columns:minmax(0,1fr)}.ag-ev.c .ag-cv{display:none}}
@media (max-width:1100px){.ag-week{grid-template-columns:1fr;gap:6px}.ag-day{min-height:0}.ag-day.empty{display:none}.ag-day.today.empty{display:flex}.ag-ev.c{grid-template-columns:38px minmax(0,1fr)}.ag-ev.c .ag-cv{display:block}.ag-dl{grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))}}
@media (max-width:760px){
  .ag-bar{margin:10px -12px 14px;padding:8px 12px}.ag-row.opt{display:none}.ag-bar.open .ag-row.opt{display:flex}
  .ag-tabs{width:100%}.ag-tabs button{flex:1;padding:9px 6px}.ag-period-btn{padding:8px 6px;display:grid;gap:2px;justify-items:center;text-align:center}.ag-period-btn strong{font-size:16px}.ag-period-btn span{font-size:11px}.ag-milestones{display:grid;gap:4px}
  .ag-week{grid-template-columns:1fr;gap:6px}.ag-day{min-height:0}.ag-day.empty{display:none}.ag-day.today.empty{display:flex}
  .ag-ev{grid-template-columns:38px minmax(0,1fr);gap:8px;padding:7px}.ag-ll{grid-template-columns:1fr}
  .ag-mc{min-height:64px;padding:4px}.ag-mi span,.ag-mf{display:none}.ag-mi{display:inline-flex}.ag-mc .dots{display:flex;flex-wrap:wrap;gap:2px}.ag-mcount{font-size:11px}
  .ag-nav b{min-width:0;flex:1}
}
@media (min-width:761px){.ag-more{display:none}}
`;

export async function agenda(ctx){
  installCreditImageFallback();
  const { sb, app, esc, toast, go, getUser, url } = ctx;
  if (!document.getElementById('ag-css')) { const s = document.createElement('style'); s.id = 'ag-css'; s.textContent = CSS; document.head.appendChild(s); }
  if (location.pathname === '/lanzamientos') history.replaceState({}, '', '/calendario' + location.search);
  app.innerHTML = '<p class="mono">Cargando el calendario…</p>';
  const u = getUser(), qs = new URLSearchParams(location.search);
  const TZ = window.obiTZ(), ymd = d => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(d)); const part = k => parts.find(p => p.type === k)?.value; return part('year') + '-' + part('month') + '-' + part('day'); };
  const noon = k => new Date(k + 'T12:00:00Z'), addK = (k, n) => new Date(noon(k).getTime() + n * DAY).toISOString().slice(0, 10);
  const dow = k => (noon(k).getUTCDay() + 6) % 7, monday = k => addK(k, -dow(k)), today = () => ymd(Date.now());
  const media = p => p ? (/^https?:/.test(p) ? p : `${url}/storage/v1/object/public/obi-media/${encodeURI(p)}`) : '';
  const V = { view: VIEWS.some(v => v[0] === qs.get('v')) ? qs.get('v') : (window.matchMedia?.('(max-width: 760px)').matches ? 'linea' : 'semana'), when: PERIODS.some(x => x[0] === qs.get('cuando')) ? qs.get('cuando') : '', access: ACCESS.some(x => x[0] === qs.get('acceso')) ? qs.get('acceso') : '', f: FIL.some(x => x[0] === qs.get('f')) ? qs.get('f') : '', mine: qs.get('sigo') === '1', team: qs.get('equipo') || '', type: qs.get('tipo') || '', anchor: /^\d{4}-\d{2}-\d{2}$/.test(qs.get('d') || '') ? qs.get('d') : today(), sel: null, opts: false };
  const D = { from: null, to: null, rows: [], aniv: [], series: {}, pat: {}, read: new Set(), fol: new Set(), rem: new Set(), fests: null };

  const [AN, S] = await Promise.all([import('/anim.js?v=8'), import('/season.js?v=3')]).catch(() => [null, null]);
  async function load(fromK, toK){
    if (D.from && fromK >= D.from && toK <= D.to) return;
    const a = D.from && D.from < fromK ? D.from : fromK, b = D.to && D.to > toK ? D.to : toK;
    const [ev, an, pre] = await Promise.all([
      sb.rpc('agenda_events', { p_from: noon(addK(a, -1)).toISOString(), p_to: noon(addK(b, 1)).toISOString() }),
      sb.rpc('team_anniversaries', { p_from: a, p_to: b }),
      sb.rpc('prelaunch_calendar', { p_from: noon(addK(a, -1)).toISOString(), p_to: noon(addK(b, 1)).toISOString() })]);
    if (ev.error) { console.warn('agenda_events', ev.error.message); toast('No se pudo cargar el calendario: ' + ev.error.message); }
    if (pre.error) console.warn('prelaunch_calendar', pre.error.message);
    // Los anuncios de volúmenes son opt-in: ignorar la versión automática de 'volp' del feed heredado.
    const previews = pre.data || [];
    D.rows = [...(ev.data || []).filter(r => r.kind !== 'volp'), ...previews.map(r => ({ ...r, chapter_id: null, open_at: null, can_read: false }))];
    D.aniv = an.data || []; D.from = a; D.to = b;
    // Para obras todavía privadas, la RPC permite únicamente estos metadatos de anuncio.
    previews.forEach(r => { D.series[r.series_id] ||= { id: r.series_id, slug: r.slug, title: r.title, short: r.short, cover_path: r.cover_path, cover_thumb_path: r.cover_thumb_path, work_type: r.work_type, teams: { name: r.team_name, slug: r.team_slug } }; });
    const ids = [...new Set(D.rows.map(r => r.series_id).filter(id => !D.series[id] || !Object.hasOwn(D.series[id], 'team_id')))];
    for (let i = 0; i < ids.length; i += 150) { const { data } = await sb.from('series').select('id,slug,title,short,cover_path,cover_thumb_path,work_type,team_id,teams(name,slug)').in('id', ids.slice(i, i + 150)); (data || []).forEach(s => D.series[s.id] = s); }
    // Los preestrenos anunciados son públicos aunque su obra todavía no esté publicada.
    // La RPC verifica announce_prelaunch y solo devuelve logos de equipos activos.
    await attachPublicCredits(sb, Object.values(D.series).filter(s => s?.id));
    const tids = [...new Set(Object.values(D.series).map(s => s.team_id).filter(t => t && !(t in D.pat)))];
    if (tids.length) { const { data } = await sb.from('patreon_public').select('owner,url').in('owner', tids); tids.forEach(t => D.pat[t] = null); (data || []).forEach(p => { if (p.url) D.pat[p.owner] = JOIN(p.url); }); }
    if (u) {
      const ch = [...new Set(D.rows.filter(r => r.chapter_id && r.kind === 'pub').map(r => r.chapter_id))];
      for (let i = 0; i < ch.length; i += 200) { const { data } = await sb.from('read_chapters').select('chapter_id').eq('user_id', u.id).in('chapter_id', ch.slice(i, i + 200)); (data || []).forEach(r => D.read.add(r.chapter_id)); }
    }
  }
  if (u) {
    const [f, r] = await Promise.all([sb.from('follows').select('series_id').eq('user_id', u.id), sb.from('reminders').select('series_id,kind,at').is('sent_at', null)]);
    (f.data || []).forEach(x => D.fol.add(x.series_id)); (r.data || []).forEach(x => D.rem.add(x.series_id + '|' + x.kind + '|' + new Date(x.at).toISOString()));
  }
  await load(addK(today(), -PAST), addK(today(), FUT));

  // ---------- agrupar: un hito por lanzamiento, sin perder el estreno de mecenas ----------
  // La RPC devuelve el acceso ACTUAL. Si el bloqueo expiró, un estreno que fue
  // exclusivo puede venir con acc='public': open_at preserva su historia.
  const patronLaunch = r => (r.kind === 'pub' || r.kind === 'prog') && (
    (r.open_at && new Date(r.open_at) > new Date(r.at)) || r.acc !== 'public'
  );
  function groups(){
    const G = new Map(), now = Date.now();
    for (const r of D.rows) {
      const s = D.series[r.series_id]; if (!s) continue;
      const day = ymd(r.at), early = patronLaunch(r);
      // Separar volúmenes publicados el mismo día; no dividir programaciones ni
      // aperturas públicas, cuyos recordatorios siguen siendo por obra y fecha.
      const volKey = ['pub', 'vol', 'volp'].includes(r.kind) ? '|' + (r.volume_id || r.label || '') : '';
      const phaseKey = r.kind === 'pub' ? '|' + (early ? 'pat' : 'public') : '';
      const k = r.kind + '|' + r.series_id + '|' + day + volKey + phaseKey;
      let g = G.get(k);
      if (!g) { g = { k, kind: r.kind, day, at: r.at, s, list: [], acc: r.acc, mp: r.min_price, tier: r.tier_name, open: r.open_at, early: r.early_at, can: r.can_read, cover: r.vcover, label: r.label, vnum: r.vnum, volumeId: r.volume_id || null, patronFirst: early }; G.set(k, g); }
      if (new Date(r.at) < new Date(g.at)) g.at = r.at;
      if (r.chapter_id && !g.list.some(c => c.chapter_id === r.chapter_id)) g.list.push(r);
      if (!r.can_read) g.can = false;
      if (r.vcover && (r.vnum ?? -1) >= (g.vnum ?? -1)) { g.cover = r.vcover; g.vnum = r.vnum; }
      if (r.acc === 'tier' && (g.acc !== 'tier' || +r.min_price > +(g.mp || 0))) { g.acc = 'tier'; g.mp = r.min_price; g.tier = r.tier_name; } else if (r.acc === 'donors' && g.acc === 'public') g.acc = 'donors';
      if (r.open_at && (!g.open || new Date(r.open_at) > new Date(g.open))) g.open = r.open_at;
      if (early) g.patronFirst = true;
    }
    const out = [...G.values()].map(g => {
      g.list.sort((a, b) => a.num - b.num);
      g.f = new Set(g.kind === 'pub' ? [g.patronFirst ? 'pat' : 'pub'] : g.kind === 'prog' ? ['prog', ...(g.patronFirst ? ['pat'] : [])] : g.kind === 'open' ? ['open'] : g.kind === 'vol' ? ['vol'] : ['vol', 'prog']);
      g.c = g.kind === 'open' ? 'open' : g.f.has('pat') ? 'pat' : g.kind === 'prog' ? 'prog' : g.kind === 'pub' ? 'pub' : 'vol';
      return g;
    });
    // El estreno de un volumen y el de sus capítulos en la misma fecha son un
    // mismo lanzamiento editorial. Mostrar los capítulos DENTRO de la tarjeta
    // del volumen, sin perder los filtros y sin fusionar fases de acceso distintas.
    const chapterVolumes = new Map();
    for (const g of out) if (g.kind === 'pub' && g.volumeId && g.list.length) {
      const k = g.s.id + '|' + g.day + '|' + g.volumeId;
      if (!chapterVolumes.has(k)) chapterVolumes.set(k, []);
      chapterVolumes.get(k).push(g);
    }
    const merged = new Set();
    for (const v of out) if (v.kind === 'vol' && v.volumeId) {
      const sameRelease = chapterVolumes.get(v.s.id + '|' + v.day + '|' + v.volumeId);
      if (!sameRelease || sameRelease.length !== 1) continue;
      const g = sameRelease[0];
      g.wholeVolume = true;
      g.volumeLabel = v.label;
      if (v.cover) g.cover = v.cover;
      g.f.add('vol');
      merged.add(v.k);
    }
    // Un anuncio de volumen programado y sus capítulos programados para el
    // MISMO instante representan un único estreno. Conservar el grupo 'volp'
    // para no cambiar el identificador de los recordatorios del preestreno.
    // No combinar series privadas: solo se incluyen capítulos que la RPC
    // agenda_events ya devuelve públicamente, y nunca se consulta su contenido.
    for (const v of out) if (v.kind === 'volp' && v.volumeId) {
      const matches = out.filter(g => g.kind === 'prog' &&
        g.s.id === v.s.id && g.day === v.day &&
        new Date(g.at).getTime() === new Date(v.at).getTime() &&
        g.list.length && g.list.every(ch => ch.volume_id === v.volumeId));
      if (matches.length !== 1) continue;
      const planned = matches[0];
      v.list = planned.list;
      v.open = planned.open;
      v.patronFirst = planned.patronFirst;
      v.f = new Set([...v.f, ...planned.f]);
      v.c = v.f.has('pat') ? 'pat' : 'vol';
      v.acc = planned.acc;
      v.mp = planned.mp;
      v.tier = planned.tier;
      v.can = false;
      merged.add(planned.k);
    }
    for (const a of D.aniv) out.push({ k: 'aniv|' + a.team_id + '|' + a.at, kind: 'aniv', c: 'aniv', f: new Set(), day: a.at, at: a.at + 'T12:00:00', team: a, list: [] });
    return out.filter(g => !merged.has(g.k));
  }
  const passBase = g => {
    if (g.kind === 'aniv') return (!V.team || g.team.slug === V.team) && !V.type && (!V.mine || Object.values(D.series).some(s => s.team_id === g.team.team_id && D.fol.has(s.id)));
    if (V.mine && !D.fol.has(g.s.id)) return false;
    if (V.team && !creditTeams(g.s).some(t => t.slug === V.team)) return false;
    if (V.type && (g.s.work_type || 'Novela ligera') !== V.type) return false;
    return true;
  };
  // Publicación y acceso actual son dimensiones distintas: un estreno de
  // mecenas puede estar ya abierto a todo el público.
  const passWhen = g => !V.when || (V.when === 'next' ? new Date(g.at) > Date.now() : new Date(g.at) <= Date.now());
  const passAccess = g => !V.access || (V.access === 'readable'
    ? (g.kind === 'pub' && g.can) || (g.kind === 'vol' && g.can) || (g.kind === 'open' && new Date(g.at) <= Date.now())
    : (g.kind === 'pub' && !g.can) || ((g.kind === 'prog' || g.kind === 'volp') && g.f.has('pat')));
  const pass = g => (!V.f || g.f.has(V.f)) && passBase(g) && passWhen(g) && passAccess(g);

  // ---------- piezas ----------
  const fdt = (d, o) => new Date(d).toLocaleString('es-MX', { timeZone: TZ, ...(o || { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) });
  const left = d => { const m = Math.round((new Date(d) - Date.now()) / 6e4); if (m <= 0) return ''; if (m < 60) return m + ' min'; if (m < 1440) return Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : ''); const dd = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60); return dd + (dd === 1 ? ' día' : ' días') + (hh ? ' ' + hh + ' h' : ''); };
  const caps = g => { const n = g.list.map(c => +c.num); if (!n.length) return g.label ? esc(g.label) : ''; const v = g.list[0].vnum != null ? 'Vol. ' + (+g.list[0].vnum) + ' · ' : ''; return v + (n.length === 1 ? 'Cap. ' + n[0] : 'Caps. ' + n[0] + '–' + n[n.length - 1]); };
  const accL = g => g.acc === 'tier' ? `Nivel «${esc(g.tier || 'mecenas')}»${g.mp ? ' · desde US$' + (+g.mp) : ''}` : g.acc === 'donors' ? 'Mecenas · cualquier nivel' : 'Público';
  const remK = g => g.s.id + '|' + g.kind + '|' + new Date(g.at).toISOString();
  const gcal = g => { const t = new Date(g.at), f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(evTitle(g)) + '&dates=' + f(t) + '/' + f(new Date(t.getTime() + 30 * 6e4)) + '&details=' + encodeURIComponent(SITE + hrefOf(g)); };
  const evTitle = g => g.kind === 'aniv' ? g.team.msg : (g.kind === 'open' ? 'Se abre a todo público: ' : g.f.has('pat') && g.kind !== 'pub' ? 'Solo mecenas: ' : '') + g.s.title + (caps(g) ? ' · ' + caps(g).replace(/&[^;]+;/g, '') : '');
  const hrefOf = g => { if (g.kind === 'aniv') return '/equipo/' + g.team.slug; if (g.kind === 'pub' && g.can && g.list.length) { const ur = g.list.find(c => !D.read.has(c.chapter_id)) || g.list[0]; return '/leer/' + g.s.slug + '/' + (+ur.num); } return '/serie/' + g.s.slug; };
  function card(g, compact){
    const future = new Date(g.at) > Date.now();
    if (g.kind === 'aniv') { const a = g.team; return `<div class="ag-ev${compact ? ' c' : ''}" style="--c:${COL.aniv}"><span class="ag-cv" style="${a.avatar_path ? `background-image:url('${esc(media(a.avatar_path))}')` : `background:${esc(a.color || '#2a2519')}`}"></span><div class="ag-bd"><span class="ag-tg2"><i></i>🎉 Aniversario</span><a class="ag-t" href="/equipo/${esc(a.slug)}">${esc(a.name)}</a><span class="ag-m">${esc(a.msg)}</span><span class="ag-m">${a.years} ${a.years === 1 ? 'año' : 'años'} en el Obi</span></div></div>`; }
    const s = g.s, cv = g.cover ? media(g.cover) : media(s.cover_thumb_path || s.cover_path), unread = u && g.kind === 'pub' ? g.list.filter(c => !D.read.has(c.chapter_id)).length : null;
    const tag = g.kind === 'prog' && g.f.has('pat') ? 'Programado · Solo mecenas' : g.kind === 'pub' && g.patronFirst ? 'Estreno para mecenas' : g.kind === 'volp' ? 'Próximo estreno · volumen' : TAG[g.c];
    const shortDate = d => fdt(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const dates = g.kind === 'open' || g.f.has('pat') ? `<div class="ag-milestones" aria-label="Fechas de liberación">
      <span>🔒 Mecenas <b>${g.kind === 'open' ? (g.early ? shortDate(g.early) : '—') : shortDate(g.at)}</b></span>
      <span>🔓 Público general <b>${g.kind === 'open' ? shortDate(g.at) : g.open ? shortDate(g.open) : 'Sin fecha'}</b></span>
      </div>` : '';
    const cdT = g.kind === 'open' ? g.at : g.f.has('pat') ? g.open : null, cd = cdT && left(cdT) ? `<span class="ag-cd">Se abre a todos en ${left(cdT)}</span>` : future && g.kind !== 'open' ? `<span class="ag-cd" style="color:#8cc3f2">Sale en ${left(g.at)}</span>` : '';
    const chapters = g.list.length > 1 ? `<details class="ag-chapters"><summary>Ver ${g.list.length} capítulos</summary><div class="ag-chapter-list">${g.list.map(ch => g.kind === 'pub' && g.can ? `<a href="/leer/${esc(s.slug)}/${+ch.num}">Cap. ${+ch.num}</a>` : `<span>Cap. ${+ch.num}</span>`).join('')}</div></details>` : '';
    const pl = D.pat[s.team_id], rem = D.rem.has(remK(g));
    const acts = [
      !g.can && g.acc !== 'public' ? `<a class="ag-btn pat" href="${esc(pl || '/equipo/' + (s.teams?.slug || ''))}"${pl ? ' target="_blank" rel="noopener"' : ''}>Hazte mecenas</a>` : '',
      g.kind === 'pub' && g.can && g.list.length ? `<a class="ag-btn" href="${hrefOf(g)}">${unread ? 'Leer' : 'Releer'}</a>` : '',
      future && g.kind !== 'pub' && g.kind !== 'vol' ? `<button class="ag-btn${rem ? ' on' : ''}" data-rem="${esc(g.k)}" aria-pressed="${rem}">${rem ? '✓ Te avisaremos' : '🔔 Avísame'}</button>` : '',
      future && !compact ? `<a class="ag-btn" href="${esc(gcal(g))}" target="_blank" rel="noopener">＋ Google Calendar</a>` : ''].join('');
    return `<div class="ag-ev${compact ? ' c' : ''}" style="--c:${COL[g.c]}"><a href="/serie/${esc(s.slug)}" class="ag-cv" style="${cv ? `background-image:url('${esc(cv)}')` : ''}" aria-label="${esc(s.title)}"></a><div class="ag-bd">
      <span class="ag-tg2"><i></i>${!g.can && g.acc !== 'public' ? '🔒︎ ' : ''}${g.wholeVolume ? 'Volumen completo · ' : ''}${tag}</span><a class="ag-t" href="${hrefOf(g)}">${esc(s.title)}</a>
      <span class="ag-m">${g.wholeVolume && g.volumeLabel ? esc(g.volumeLabel) + ' · ' : ''}${caps(g)}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}${compact ? '' : ' · ' + fdt(g.at, { hour: '2-digit', minute: '2-digit' })}</span>${creditsHTML(s, { esc, media, mode: 'carousel' })}
      ${g.kind !== 'vol' && g.kind !== 'volp' ? `<span class="ag-m">Acceso: <b>${g.kind === 'open' ? 'Público desde esta fecha' : g.kind === 'pub' && g.patronFirst && g.open && new Date(g.open) <= Date.now() ? 'Estreno para mecenas · ahora público' : accL(g)}</b>${unread != null ? (unread ? ` · <span class="ur">${unread} sin leer</span>` : ' · <span class="rd">✓ Leído</span>') : ''}</span>` : ''}
      ${dates}${cd}${chapters}${acts ? `<div class="ag-acts">${acts}</div>` : ''}</div></div>`;
  }
  function festivals(fromK, toK){
    if (!AN || !S) return [];
    const out = [], hemi = S.hemiOf ? S.hemiOf(TZ) : 'norte';
    for (let k = fromK; k <= toK; k = addK(k, 1)) { const d = noon(k); for (const [key, s] of Object.entries(AN.SEASONS)) { if (s.g === 'est') continue; const was = AN.activeSeason({ auto: [key] }, new Date(d.getTime() - DAY)) === key, is = AN.activeSeason({ auto: [key] }, d) === key; if (is && !was) out.push({ day: k, s }); } }
    (D.fests || []).filter(c => ['primavera', 'verano', 'otono', 'invierno'].includes(c.key) && c.hemi === hemi && c.starts >= fromK && c.starts <= toK && AN.SEASONS[c.key]).forEach(c => out.push({ day: c.starts, s: AN.SEASONS[c.key] }));
    return out;
  }

  // ---------- vistas ----------
  const byDay = list => { const m = {}; list.forEach(g => (m[g.day] ||= []).push(g)); Object.values(m).forEach(l => l.sort((a, b) => new Date(a.at) - new Date(b.at))); return m; };
  const dayName = k => noon(k).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const lbl = k => k === today() ? 'Hoy' : k === addK(today(), 1) ? 'Mañana' : k === addK(today(), -1) ? 'Ayer' : dayName(k);
  function week(list){
    const m0 = monday(V.anchor), M = byDay(list), t = today();
    return `<div class="ag-week">${[...Array(7)].map((_, i) => { const k = addK(m0, i), L = M[k] || []; return `<section class="ag-day${k === t ? ' today' : ''}${L.length ? '' : ' empty'}"><div class="ag-dh"><span>${k === t ? 'Hoy' : noon(k).toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' })}</span><b>${+k.slice(8)}</b></div><div class="ag-dl">${L.length ? L.map(g => card(g, true)).join('') : '<span class="ag-none">—</span>'}</div></section>`; }).join('')}</div>`;
  }
  function line(list){
    const t = today(), M = byDay(list.filter(g => g.day >= addK(t, -PAST) && g.day <= addK(t, FUT))), ks = Object.keys(M).sort().reverse();
    const fut = ks.filter(k => k > t).sort(), pst = ks.filter(k => k < t), sec = k => `<section class="ag-ld"><h2>${lbl(k)}<small>${k.slice(8)}/${k.slice(5, 7)}</small></h2><div class="ag-ll">${M[k].map(g => card(g)).join('')}</div></section>`;
    return `<div class="ag-line">${V.when === 'past' ? '' : fut.length ? fut.map(sec).join('') : '<p class="ag-empty">Nada programado todavía.</p>'}<div class="ag-now" id="ag-now">Hoy · ${noon(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</div>${M[t] ? sec(t).replace(/<h2>.*?<\/h2>/, '') : V.when ? '' : '<p class="ag-empty" style="padding:6px 0">Nada hoy por ahora.</p>'}${V.when === 'next' ? '' : pst.length ? pst.map(sec).join('') : '<p class="ag-empty">Nada publicado en los últimos 30 días.</p>'}</div>`;
  }
  function month(list){
    const a = V.anchor.slice(0, 8) + '01', ym = a.slice(0, 7), start = monday(a), M = byDay(list), t = today();
    let end = addK(a, 31); end = end.slice(0, 7) === ym ? end : addK(end.slice(0, 8) + '01', -1); end = addK(monday(end), 6);
    const F = {}; festivals(start, end).forEach(f => (F[f.day] ||= []).push(f));
    const cells = []; for (let k = start; k <= end; k = addK(k, 1)) cells.push(k);
    const sel = V.sel && V.sel.slice(0, 7) === ym ? V.sel : (t.slice(0, 7) === ym ? t : (Object.keys(M).filter(k => k.slice(0, 7) === ym).sort()[0] || null));
    const hd = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => `<div class="ag-mh">${d}</div>`).join('');
    const grid = cells.map(k => { const L = M[k] || [], fe = F[k] || []; return `<button type="button" class="ag-mc${k.slice(0, 7) !== ym ? ' out' : ''}${k === t ? ' today' : ''}${k === sel ? ' sel' : ''}" data-day="${k}" aria-label="${esc(dayName(k))}: ${L.length} ${L.length === 1 ? 'evento' : 'eventos'}"><b>${+k.slice(8)}</b>${L.length ? `<span class="ag-mcount">${L.length}</span>` : ''}${fe.map(f => `<span class="ag-mf" style="--fc:${f.s.ac}">${esc(f.s.l)}</span>`).join('')}<span class="dots">${L.slice(0, 3).map(g => `<span class="ag-mi" style="--c:${COL[g.c]}"><i></i><span>${esc(g.kind === 'aniv' ? g.team.name : g.s.short || g.s.title)}</span></span>`).join('')}</span>${L.length > 3 ? `<span class="ag-mi" style="color:#a89f8a">+${L.length - 3}</span>` : ''}</button>`; }).join('');
    const SL = sel ? (M[sel] || []) : [], SF = sel ? (F[sel] || []) : [];
    return `<div class="ag-mon">${hd}${grid}</div>${sel ? `<div class="ag-msel"><h2>${lbl(sel)}</h2>${SF.map(f => `<p class="ag-m" style="color:${f.s.ac};font-weight:600">${esc(f.s.l)} · festividad</p>`).join('')}${SL.length ? `<div class="ag-ll">${SL.map(g => card(g)).join('')}</div>` : '<p class="ag-empty" style="padding:6px 0">Sin lanzamientos este día.</p>'}</div>` : ''}`;
  }

  // ---------- dibujo ----------
  const range = () => { if (V.view === 'semana') return [monday(V.anchor), addK(monday(V.anchor), 6)]; if (V.view !== 'mes') return [addK(today(), -PAST), addK(today(), FUT)]; const first = V.anchor.slice(0, 8) + '01'; const next = new Date(Date.UTC(+first.slice(0, 4), +first.slice(5, 7), 1, 12)).toISOString().slice(0, 10); const end = addK(next, -1); return [monday(first), addK(monday(end), 6)]; };
  const title = () => { if (V.view === 'semana') { const a = monday(V.anchor), b = addK(a, 6), f = k => noon(k).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }); return f(a) + ' – ' + f(b); } return noon(V.anchor.slice(0, 8) + '15').toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  const sync = () => { const p = new URLSearchParams(); if (V.view !== 'semana') p.set('v', V.view); if (V.f) p.set('f', V.f); if (V.when) p.set('cuando', V.when); if (V.access) p.set('acceso', V.access); if (V.mine) p.set('sigo', '1'); if (V.team) p.set('equipo', V.team); if (V.type) p.set('tipo', V.type); if (V.anchor !== today() && V.view !== 'linea') p.set('d', V.anchor); if (/^\/(calendario|lanzamientos)$/.test(location.pathname)) history.replaceState({}, '', '/calendario' + (p.toString() ? '?' + p : '')); };
  async function draw(scroll){
    const [a, b] = range(); await load(a, b);
    if (V.view === 'mes' && !D.fests) { try { if (S) await S.load(sb); const { data } = await sb.from('season_calendar').select('key,starts,hemi').gte('starts', addK(today(), -400)).lte('starts', addK(today(), 400)); D.fests = data || []; } catch { D.fests = []; } }
    const all = groups(), inRange = all.filter(g => g.day >= a && g.day <= b), list = inRange.filter(pass);
    const weekOpen = all.filter(g => g.kind === 'open' && new Date(g.at) > Date.now() && new Date(g.at) - Date.now() < 7 * DAY && pass(g)).length;
    const scoped = inRange.filter(g => passBase(g) && passAccess(g)), countable = scoped.filter(passWhen);
    const periodScoped = scoped.filter(g => !V.f || g.f.has(V.f));
    const periodCount = { '': periodScoped.length, next: periodScoped.filter(g => new Date(g.at) > Date.now()).length, past: periodScoped.filter(g => new Date(g.at) <= Date.now()).length };
    const cnt = Object.fromEntries(FIL.map(([k]) => [k, k ? countable.filter(g => g.f.has(k)).length : countable.length]));
    const teams = [...new Map(Object.values(D.series).flatMap(s => creditTeams(s).filter(t => t.slug).map(t => [t.slug, t.name]))).entries()].sort((x, y) => x[1].localeCompare(y[1], 'es'));
    const types = [...new Set(Object.values(D.series).map(s => s.work_type || 'Novela ligera'))].sort();
    app.innerHTML = `<div class="ag-h"><div><h1>Calendario de lanzamientos</h1><p>Estrenos para mecenas, aperturas al público y próximos volúmenes, sin anuncios repetidos.</p></div>${weekOpen ? `<button class="ag-cnt" data-f="open">${weekOpen} se ${weekOpen === 1 ? 'abre' : 'abren'} a todo público esta semana</button>` : ''}</div>
      <div class="ag-bar${V.opts ? ' open' : ''}">
        <div class="ag-row sp"><div class="ag-tabs" role="tablist">${VIEWS.map(([k, l]) => `<button role="tab" aria-selected="${V.view === k}" class="${V.view === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
          ${V.view !== 'linea' ? `<div class="ag-nav"><button class="ag-btn" data-mv="-1" aria-label="Anterior">‹</button><b>${title()}</b><button class="ag-btn" data-mv="1" aria-label="Siguiente">›</button><button class="ag-btn" data-mv="0">Hoy</button></div>` : '<button class="ag-btn" id="ag-tonow">Ir a hoy</button>'}
          <button class="ag-btn ag-more" id="ag-more" aria-expanded="${V.opts}">Más filtros${V.mine || V.team || V.type || V.access ? ' •' : ''}</button></div>
        <div class="ag-period" role="group" aria-label="Filtrar por fecha">${PERIODS.map(([k, l]) => `<button class="ag-period-btn${V.when === k ? ' on' : ''}" data-when="${k}" aria-pressed="${V.when === k}"><strong>${periodCount[k]}</strong><span>${l}</span></button>`).join('')}</div>
        <div class="ag-chips" aria-label="Tipos de lanzamiento">${u ? `<button class="ag-chip${V.mine ? ' on' : ''}" data-mine="1" aria-pressed="${V.mine}">★ Mis obras seguidas</button>` : ''}${FIL.map(([k, l]) => `<button class="ag-chip${V.f === k ? ' on' : ''}" data-f="${k}" aria-pressed="${V.f === k}">${k ? `<i style="--c:${COL[k]}"></i>` : ''}${l}${k === 'open' && weekOpen ? ` <em>${weekOpen}</em>` : cnt[k] ? ` <span style="color:#6b6252">${cnt[k]}</span>` : ''}</button>`).join('')}</div>
        <div class="ag-row opt"><label class="ag-tg" for="ag-access">Lectura:</label><select class="ag-sel" id="ag-access" aria-label="Filtrar por disponibilidad">${ACCESS.map(([k, l]) => `<option value="${k}" ${V.access === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="ag-sel" id="ag-team" aria-label="Equipo"><option value="">Todos los equipos</option>${teams.map(([s, n]) => `<option value="${esc(s)}" ${V.team === s ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
          <select class="ag-sel" id="ag-type" aria-label="Tipo de obra"><option value="">Todos los tipos</option>${types.map(t => `<option ${V.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <button class="ag-btn" id="ag-ics">⤓ Exportar .ics</button></div>
        <div class="ag-leg" aria-label="Leyenda">${LEG.map(([k, l]) => `<span><i style="--c:${COL[k]}"></i>${l}</span>`).join('')}${V.view === 'mes' ? '<span><i style="--c:linear-gradient(90deg,#d9668a,#8cc3f2);background:linear-gradient(90deg,#d9668a,#8cc3f2)"></i>Festividad</span>' : ''}</div>
      </div>
      <div id="ag-body">${V.view === 'semana' ? week(list) : V.view === 'mes' ? month(list) : line(list)}</div>
      ${list.length ? '' : `<p class="ag-empty">${V.f || V.mine || V.team || V.type || V.access || V.when ? 'No hay lanzamientos que coincidan con estos filtros. <button class="ag-btn" id="ag-clear">Quitar filtros</button>' : 'Sin lanzamientos en estas fechas.'}</p>`}
      <div class="ag-foot"><span>${window.__obiUI?.tz ? '<a href="/preferencias?s=pantalla">Tu zona horaria</a>' : 'Horario de tu dispositivo'} · ${esc(TZ.replace(/_/g, ' '))}</span><span>Publicados: últimos ${PAST} días · Próximos: ${FUT} días</span></div>`;
    sync(); bind(all);
    if (scroll && V.view === 'linea') { const n = document.getElementById('ag-now'); if (n) window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY - 160 }); }
  }
  function bind(all){
    const on = (s, f) => app.querySelectorAll(s).forEach(f);
    on('[data-v]', b => b.onclick = () => { V.view = b.dataset.v; draw(false); });
    on('[data-f]', b => b.onclick = () => { V.f = b.dataset.f; draw(); });
    on('[data-when]', b => b.onclick = () => { V.when = b.dataset.when; draw(); });
    on('[data-mine]', b => b.onclick = () => { V.mine = !V.mine; draw(); });
    on('[data-mv]', b => b.onclick = () => { const n = +b.dataset.mv; if (!n) V.anchor = today(); else if (V.view === 'semana') V.anchor = addK(V.anchor, 7 * n); else { const [y, m] = V.anchor.split('-').map(Number), d = new Date(Date.UTC(y, m - 1 + n, 1, 12)); V.anchor = d.toISOString().slice(0, 10); } V.sel = null; draw(); });
    on('[data-day]', b => b.onclick = () => { V.sel = b.dataset.day; draw(); });
    const g = id => app.querySelector('#' + id);
    g('ag-tonow')?.addEventListener('click', () => { const n = g('ag-now'); if (n) window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY - 160, behavior: 'smooth' }); });
    g('ag-more')?.addEventListener('click', () => { V.opts = !V.opts; app.querySelector('.ag-bar').classList.toggle('open', V.opts); g('ag-more').setAttribute('aria-expanded', V.opts); });
    g('ag-access').onchange = e => { V.access = e.target.value; draw(); };
    g('ag-team').onchange = e => { V.team = e.target.value; draw(); };
    g('ag-type').onchange = e => { V.type = e.target.value; draw(); };
    g('ag-clear')?.addEventListener('click', () => { Object.assign(V, { f: '', when: '', access: '', mine: false, team: '', type: '' }); draw(); });
    g('ag-ics').onclick = () => ics(all.filter(pass).filter(x => new Date(x.at) > Date.now()));
    on('[data-rem]', b => b.onclick = () => remind(all.find(x => x.k === b.dataset.rem), b));
  }

  // ---------- recordatorios y push ----------
  async function remind(g, b){
    if (!g) return; if (!u) { toast('Entra para recibir avisos'); return go('/entrar'); }
    const k = remK(g), had = D.rem.has(k); b.disabled = true;
    const r = had ? await sb.from('reminders').delete().eq('series_id', g.s.id).eq('kind', g.kind).eq('at', new Date(g.at).toISOString())
      : await sb.from('reminders').insert({ series_id: g.s.id, kind: g.kind, at: new Date(g.at).toISOString(), label: (caps(g) || '').replace(/&[^;]+;/g, '').slice(0, 200) || null });
    b.disabled = false; if (r.error && !/duplicate/.test(r.error.message)) return toast(r.error.message);
    had ? D.rem.delete(k) : D.rem.add(k);
    b.classList.toggle('on', !had); b.setAttribute('aria-pressed', !had); b.textContent = had ? '🔔 Avísame' : '✓ Te avisaremos';
    if (!had) { const p = await enablePush(ctx); toast(p ? 'Te avisaremos aquí y en este dispositivo' : 'Te avisaremos en la campana de avisos'); }
  }
  function ics(list){
    if (!list.length) return toast('No hay eventos próximos con estos filtros');
    const f = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), e = t => String(t).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//El Obi del Lector//Calendario//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:El Obi del Lector'];
    for (const g of list) { const allDay = g.kind === 'aniv'; L.push('BEGIN:VEVENT', 'UID:' + g.k.replace(/\|/g, '-') + '@obidellector.com', 'DTSTAMP:' + f(Date.now()), allDay ? 'DTSTART;VALUE=DATE:' + g.day.replace(/-/g, '') : 'DTSTART:' + f(g.at), allDay ? 'DTEND;VALUE=DATE:' + addK(g.day, 1).replace(/-/g, '') : 'DTEND:' + f(new Date(new Date(g.at).getTime() + 30 * 6e4)), 'SUMMARY:' + e(evTitle(g)), 'URL:' + SITE + hrefOf(g), 'END:VEVENT'); }
    L.push('END:VCALENDAR');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' })); a.download = 'obi-calendario.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  await draw(false);
}

// Push: pide permiso una vez y guarda la suscripción del dispositivo.
export async function enablePush({ sb, url, getUser }){
  try {
    if (!getUser() || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || Notification.permission === 'denied') return false;
    const r = await fetch(url + '/functions/v1/push'); const { publicKey } = await r.json(); if (!publicKey) return false;
    if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready, k = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((publicKey.length + 3) % 4)), c => c.charCodeAt(0));
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: k });
    const j = sub.toJSON(); const { error } = await sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: getUser().id });
    if (error) { console.warn('push', error.message); return false; }
    return true;
  } catch (e) { console.warn('push', e); return false; }
}

// Inicio: franja con lo que se abre hoy a todo público.
export async function openToday({ sb, esc }, el){
  if (!el) return;
  const TZ = window.obiTZ(), fmt = d => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d); const get = k => parts.find(p => p.type === k)?.value; return get('year') + '-' + get('month') + '-' + get('day'); }, k = fmt(new Date()), a = new Date(Date.now() - 36 * 36e5), b = new Date(Date.now() + 36 * 36e5);
  const { data, error } = await sb.rpc('agenda_events', { p_from: a.toISOString(), p_to: b.toISOString() });
  if (error) return;
  const rows = (data || []).filter(r => r.kind === 'open' && fmt(new Date(r.at)) === k); if (!rows.length) return;
  const ids = [...new Set(rows.map(r => r.series_id))], { data: ser } = await sb.from('series').select('id,slug,title').in('id', ids), by = Object.fromEntries((ser || []).map(s => [s.id, s]));
  const G = {}; rows.forEach(r => { if (!by[r.series_id]) return; (G[r.series_id] ||= { s: by[r.series_id], at: r.at, n: [] }).n.push(+r.num); });
  const L = Object.values(G); if (!L.length) return;
  el.innerHTML = `<section style="margin:26px 0 0;padding:14px 16px;border:1px solid #a9d18e;display:grid;gap:8px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:baseline"><b style="color:#a9d18e;letter-spacing:.06em;text-transform:uppercase;font-size:13px">Hoy se abre a todo público</b><a href="/calendario?f=open" style="font-size:13px">Ver en el calendario →</a></div>${L.map(g => { const n = g.n.sort((x, y) => x - y), ya = new Date(g.at) <= Date.now(); return `<a href="/serie/${esc(g.s.slug)}" style="display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;color:inherit;text-decoration:none"><b>${esc(g.s.title)}</b><span class="mono" style="font-size:13px">${n.length > 1 ? 'Caps. ' + n[0] + '–' + n[n.length - 1] : 'Cap. ' + n[0]} · ${ya ? 'ya disponible' : 'a las ' + new Date(g.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span></a>`; }).join('')}</section>`;
}

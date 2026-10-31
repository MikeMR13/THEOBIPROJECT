// Cálculos puros de Mi biblioteca: mismos capítulos publicados que estadísticas de lector.
// Evita contar dos veces un capítulo, incluye lecturas sin reading_progress y separa
// capítulos disponibles de capítulos publicados futuros.
export const cleanText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stamp = v => { const t = Date.parse(v || ''); return Number.isFinite(t) ? t : 0; };
const cmp = (a, b) => a.localeCompare(b, 'es');

export function prepareLibrary({ progress = [], follows = [], readRows = [], series = [], chapters = [], now = Date.now() } = {}) {
  const read = new Set(), byRead = new Map();
  for (const row of readRows) {
    const id = row?.chapter_id, sid = row?.chapters?.series_id;
    if (!id || !sid || row.chapters?.deleted_at) continue;
    read.add(id);
    if (!byRead.has(sid)) byRead.set(sid, []);
    byRead.get(sid).push(row);
  }
  const P = new Map(progress.filter(x => x?.series_id).map(x => [x.series_id, x]));
  const F = new Set(follows.map(x => x?.series_id).filter(Boolean));
  const published = new Map();
  for (const c of chapters) {
    if (!c?.series_id || c.status && c.status !== 'published' || c.deleted_at) continue;
    if (!published.has(c.series_id)) published.set(c.series_id, []);
    published.get(c.series_id).push(c);
  }
  const works = series.map(s => {
    const all = (published.get(s.id) || []).slice().sort((a,b) => Number(a.num)-Number(b.num));
    const available = all.filter(c => !c.publish_at || stamp(c.publish_at) <= now);
    const nr = available.filter(c => read.has(c.id)).length;
    const rs = byRead.get(s.id) || [];
    const lastRead = rs.reduce((a,b) => stamp(b.read_at) > stamp(a?.read_at) ? b : a, null);
    const saved = P.get(s.id);
    const num = +saved?.chapter_num;
    const validSaved = available.find(c => +c.num === num);
    const lastReadChapter = available.find(c => c.id === lastRead?.chapter_id);
    const nextU = available.find(c => !read.has(c.id));
    const resume = validSaved || lastReadChapter || nextU || available.at(0) || null;
    const lastAt = Math.max(0, ...available.map(c => stamp(c.publish_at)));
    // "Terminadas" refleja la lectura personal, no el estado editorial de la traducción.
    // Solo contar capítulos YA disponibles: los programados no pueden impedir terminar.
    // La marca persiste en read_chapters; si llega un capítulo nuevo, la obra vuelve
    // automáticamente a Leyendo/Pendientes hasta que el lector se ponga al día.
    const done = available.length > 0 && available.every(c => read.has(c.id));
    const translationCompleted = s.translation_status === 'completed';
    return { s, p:saved, fol:F.has(s.id), tot:available.length, totalPublished:all.length, translationCompleted,
      nr, unread:Math.max(0,available.length-nr), nextU, resume, done,
      hasReading:!!saved || rs.length > 0, lastAt,
      readAt:Math.max(stamp(saved?.updated_at),stamp(lastRead?.read_at)) };
  });
  return {
    works, read, followed:F,
    lists:{
      leyendo:works.filter(w=>w.hasReading&&!w.done).sort((a,b)=>b.readAt-a.readAt||cmp(a.s.title,b.s.title)),
      pendientes:works.filter(w=>w.fol&&w.unread>0&&!w.done).sort((a,b)=>b.lastAt-a.lastAt||cmp(a.s.title,b.s.title)),
      terminadas:works.filter(w=>w.done).sort((a,b)=>cmp(a.s.title,b.s.title))
    }
  };
}

export function selectLibraryItems(rows, { query = '', order = '', tab = 'leyendo' } = {}) {
  const q = cleanText(query.trim());
  const filtered = q ? rows.filter(w => cleanText(w.s.title+' '+(w.s.short||'')+' '+(w.s.teams?.name||'')).includes(q)) : rows.slice();
  if (order === 'titulo') filtered.sort((a,b)=>cmp(a.s.title,b.s.title));
  else if (order === 'progreso') filtered.sort((a,b)=> (b.tot ? b.nr/b.tot:0)-(a.tot ? a.nr/a.tot:0)||cmp(a.s.title,b.s.title));
  else if (order === 'nuevos') filtered.sort((a,b)=>b.unread-a.unread||b.lastAt-a.lastAt||cmp(a.s.title,b.s.title));
  else if (order === 'recientes') filtered.sort((a,b)=>(tab==='pendientes'?b.lastAt-a.lastAt:b.readAt-a.readAt)||cmp(a.s.title,b.s.title));
  return filtered;
}

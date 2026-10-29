// Gestión local de la lista de Obras: ningún filtro solicita más datos a Supabase.
export const normalizeWorkText = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
export function workStats(work, chapters = [], schedules = [], now = Date.now()) {
  const ch = chapters.filter(c => c.series_id === work.id);
  const dates = ch.filter(c => c.status === 'published' && c.publish_at).map(c => c.publish_at);
  const upcoming = [
    ...ch.filter(c => c.status === 'scheduled' && Date.parse(c.publish_at) > now).map(c => c.publish_at),
    ...schedules.filter(x => x.series_id === work.id && Date.parse(x.at) > now).map(x => x.at)
  ];
  const latest = Math.max(0, ...ch.map(c => Date.parse(c.updated_at || c.publish_at) || 0));
  const next = Math.min(Infinity, ...upcoming.map(x => Date.parse(x) || Infinity));
  const drafts = ch.filter(c => c.status === 'draft').length;
  const correction = ch.filter(c => c.status === 'draft' && c.stage === 'correccion').length;
  const attention = drafts > 0 || correction > 0 || !work.published || !work.cover_path ||
    (ch.length > 0 && now - latest > 30 * 864e5);
  return {drafts,correction,latest,next,lastPublished:Math.max(0,...dates.map(d => Date.parse(d)||0)),
    attention, chapters:ch.length,volumes:(work.volumes||[]).filter(v => !v.deleted_at).length};
}
export function selectStudioWorks(works, chapters, schedules, criteria={}, now=Date.now()) {
  const q=normalizeWorkText(criteria.q).trim();
  const status=criteria.status||'all',visibility=criteria.visibility||'all';
  const attention=!!criteria.attention,sort=criteria.sort||'title';
  const rows=(works||[]).map(work=>({work,stats:workStats(work,chapters,schedules,now)}))
    .filter(({work,stats})=>(!q||normalizeWorkText([work.title,work.short,work.slug].join(' ')).includes(q)) &&
      (status==='all'||work.translation_status===status) &&
      (visibility==='all'||(visibility==='public'?!!work.published:!work.published)) &&
      (!attention||stats.attention));
  rows.sort((a,b)=>{
    let diff=0;
    if(sort==='activity')diff=b.stats.latest-a.stats.latest;
    if(sort==='upcoming')diff=a.stats.next-b.stats.next;
    if(sort==='views')diff=(b.work.views||0)-(a.work.views||0);
    return diff || String(a.work.title).localeCompare(String(b.work.title),'es');
  });
  return rows;
}
export function importWorkUrl(id) { return '/estudio/importar?obra='+encodeURIComponent(id); }

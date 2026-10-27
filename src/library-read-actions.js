// Acciones manuales de lectura compartiendo read_chapters con el lector y Lanzamientos.
// No altera reading_progress ni crea estados paralelos de "novela vista".
const moment = v => { const n = Date.parse(v || ''); return Number.isFinite(n) ? n : 0; };
export function readingGroups(seriesId, chapters, now=Date.now()) {
  const by = new Map();
  const list = chapters.filter(c => c?.series_id === seriesId &&
    c.status === 'published' && !c.deleted_at &&
    (!c.publish_at || moment(c.publish_at) <= now))
    .sort((a,b) => Number(a.num)-Number(b.num));
  for (const ch of list) {
    const key = ch.volume_id ? 'id:'+ch.volume_id : ch.vol != null ? 'n:'+ch.vol : 'independent';
    if (!by.has(key)) by.set(key,{key,label:ch.vol!=null?'Volumen '+ch.vol:'Capítulos sin volumen',chapters:[]});
    by.get(key).chapters.push(ch);
  }
  return [...by.values()].sort((a,b)=>
    (a.chapters[0]?.num||0)-(b.chapters[0]?.num||0));
}

export function planReadingChanges(ids, rows, markRead) {
  const indexed = new Map(rows.filter(r=>r?.chapter_id).map(r=>[r.chapter_id,r]));
  return [...new Set(ids.filter(Boolean))].flatMap(id=>{
    const before=indexed.get(id);
    return !!before === !!markRead ? [] : [{chapter_id:id,desired:!!markRead,priorReadAt:before?.read_at||null}];
  });
}

export function undoReadingChanges(changes) {
  return changes.map(c=>({
    chapter_id:c.chapter_id, desired:!c.desired,
    restoreAt:!c.desired ? c.priorReadAt : null,
    priorReadAt:null
  }));
}

export function applyReadingChanges(rows, byChapter, changes, now=new Date().toISOString()) {
  const ids=new Set(changes.map(c=>c.chapter_id));
  return rows.filter(r=>!ids.has(r.chapter_id)).concat(
    changes.filter(c=>c.desired).map(c=>({
      chapter_id:c.chapter_id,
      read_at:c.restoreAt||now,
      chapters:{series_id:byChapter.get(c.chapter_id)?.series_id,deleted_at:null}
    }))
  );
}

// PostgREST limita longitudes de URL / payload: solicitudes cortas y comprobadas.
// Ante un error a mitad de operación, la UI vuelve a consultar el servidor.
export async function persistReadingChanges(sb,uid,changes,{size=80}={}) {
  if (!uid || !Number.isInteger(size) || size<1 || size>200) throw new Error('Acción inválida');
  for (const desired of [true,false]) {
    const rows=changes.filter(c=>c.desired===desired);
    for(let i=0;i<rows.length;i+=size){
      const part=rows.slice(i,i+size), ids=part.map(c=>c.chapter_id);
      const response=desired
        ? await sb.from('read_chapters').upsert(part.map(c=>({
          user_id:uid, chapter_id:c.chapter_id, ...(c.restoreAt?{read_at:c.restoreAt}:{})
        })),{onConflict:'user_id,chapter_id',ignoreDuplicates:true})
        : await sb.from('read_chapters').delete().eq('user_id',uid).in('chapter_id',ids);
      if(response?.error) throw response.error;
    }
  }
  return changes.length;
}

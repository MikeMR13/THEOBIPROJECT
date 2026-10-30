// Embudo editorial descriptivo: NO es una conversión de usuarios o una cohorte.
// Reutiliza exclusivamente agregados obtenidos por RPC con permiso del equipo.
// No crea eventos, identificadores, almacenamiento ni consultas adicionales.

const fmt = n => n.toLocaleString('es-MX');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const safeCount = n => Number.isSafeInteger(n) && n >= 0;

export function buildPrelaunchInterestFunnel(ids, metrics, views, works = []) {
  const allowed = ids instanceof Set ? ids : new Set(ids || []);
  if (!allowed.size) return {status:'empty', rows:[]};
  if (!metrics?.available || !views?.available) return {status:'unavailable',rows:[]};
  const selected = works.filter(w => allowed.has(w?.id));
  if (selected.length !== allowed.size || new Set(selected.map(w=>w.id)).size !== allowed.size)
    return {status:'unavailable',rows:[]};
  const rows = [];
  let opens=0, followers=0, reminders=0;
  for (const work of selected) {
    const m=metrics.counts?.get(work.id);
    const o=views.counts?.get(work.id);
    if (!m || !safeCount(m.followers) || !safeCount(m.reminders) || !safeCount(o))
      return {status:'unavailable',rows:[]};
    rows.push({id:work.id,slug:work.slug,title:work.title,opens:o,followers:m.followers,reminders:m.reminders});
    opens += o; followers += m.followers; reminders += m.reminders;
  }
  if (![opens,followers,reminders].every(safeCount)) return {status:'unavailable',rows:[]};
  rows.sort((a,b)=>b.opens-a.opens || String(a.title??'').localeCompare(String(b.title??''),'es'));
  return {status:'ready',rows,totals:{opens,followers,reminders}};
}

export function interestPerHundred(signal, opens) {
  if (!safeCount(signal) || !safeCount(opens) || opens === 0) return '—';
  // Razón de agregados, no porcentaje de usuarios que convierten.
  const v=100*signal/opens;
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('es-MX',{maximumFractionDigits:1,minimumFractionDigits:0});
}

export function renderPrelaunchInterestFunnel(ids, metrics, views, works=[]) {
  const data=buildPrelaunchInterestFunnel(ids,metrics,views,works);
  if (data.status==='empty') return '';
  const heading='<div class="s2-pre-funnel-head"><h2>Embudo de interés previo al estreno</h2><span class="mono">Comparativa de obras anunciadas</span></div>';
  const disclaimer='<p class="s2-pre-funnel-note">Indicadores orientativos: las aperturas corresponden a los últimos 30 días; los seguidores y recordatorios son saldos actuales. No son visitantes únicos ni conversiones de personas, y las cifras no tienen necesariamente el mismo periodo. El conteo de aperturas tiene límites de registro.</p>';
  if (data.status!=='ready') return '<section class="s2-pre-funnel" aria-label="Embudo de interés previo al estreno">'+heading+'<p role="status">No se pudieron verificar todos los datos para comparar. No mostramos proporciones estimadas.</p>'+disclaimer+'</section>';
  const t=data.totals, largest=Math.max(t.opens,t.followers,t.reminders,1);
  const bar=(label,value,desc,kind)=>{
    const width=Math.min(100,Math.max(0,(100*value/largest)));
    return `<div class="s2-pre-funnel-stage s2-pre-funnel-stage-${kind}">
      <div class="s2-pre-funnel-stage-label"><span>${label}</span><strong>${fmt(value)}</strong></div>
      <div class="s2-pre-funnel-track" aria-hidden="true"><span style="width:${width.toFixed(2)}%"></span></div>
      <span class="s2-pre-funnel-stage-sub">${desc}</span>
    </div>`;
  };
  const guide=t.opens===0 ? 'Sin aperturas contabilizadas; no se calculan proporciones.' :
    `${interestPerHundred(t.followers,t.opens)} seguimientos y ${interestPerHundred(t.reminders,t.opens)} recordatorios por cada 100 aperturas contabilizadas (razones agregadas, no conversiones).`;
  const stages=bar('Aperturas · últimos 30 días',t.opens,'Aperturas registradas, no personas','opens')+
    bar('Seguimientos actuales',t.followers,'Acciones vigentes de seguir obra','followers')+
    bar('Recordatorios pendientes',t.reminders,'Avisos activos de volúmenes anunciados','reminders');
  const rows=data.rows.map(r=>{
    const url=typeof r.slug==='string'?'/estudio/obra/'+encodeURIComponent(r.slug):null;
    const title=esc(r.title||'Obra sin título');
    return `<tr><th scope="row">${url?`<a href="${esc(url)}">${title}</a>`:title}</th>
      <td>${fmt(r.opens)}</td><td>${fmt(r.followers)}</td><td>${fmt(r.reminders)}</td>
      <td>${interestPerHundred(r.followers,r.opens)}</td><td>${interestPerHundred(r.reminders,r.opens)}</td></tr>`;
  }).join('');
  return `<section class="s2-pre-funnel" aria-label="Embudo de interés previo al estreno">
    ${heading}
    <div class="s2-pre-funnel-stages" aria-label="Señales de interés del equipo">${stages}</div>
    <p class="s2-pre-funnel-guide">${guide}</p>
    <h3>Comparativa por obra</h3>
    <div class="s2-pre-funnel-table-wrap" role="region" aria-label="Comparativa de interés por obra" tabindex="0">
      <table class="s2-pre-funnel-table"><thead><tr><th scope="col">Obra</th><th scope="col">Aperturas 30 d</th><th scope="col">Seguidores hoy</th><th scope="col">Recordatorios pendientes</th><th scope="col">Seguimientos / 100 aperturas</th><th scope="col">Recordatorios / 100 aperturas</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    ${disclaimer}
  </section>`;
}

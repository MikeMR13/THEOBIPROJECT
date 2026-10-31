// Panel de Temporadas del Bibliotecario: calendario y estado visual derivados,
// sin guardar campos redundantes ni cambiar la programación de la plataforma.
import { SEASONS } from './anim.js?v=8';
import { seasonPeriods, formatSeasonPeriod } from './season-periods.js';

const dateKey = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export const seasonToday = (d=new Date()) => dateKey(d);

export function describeAdminSeasons({
  seasons=SEASONS, calendar=[], auto=[], hemi='norte', today=seasonToday()
}={}){
  const year=Number(today.slice(0,4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw Error('Fecha de temporada inválida');
  // Copia aislada: las fechas lunares sincronizadas reemplazan a las incorporadas
  // sin mutar el catálogo compartido con las páginas públicas.
  const catalog=Object.fromEntries(Object.entries(seasons).map(([k,s])=>
    [k,s.d?{...s,d:{...s.d,years:{...s.d.years}}}:s]));
  for(const row of calendar){
    const key=row?.key,day=String(row?.day||'');
    if(catalog[key]?.d && /^\d{4}-\d{2}-\d{2}$/.test(day))
      catalog[key].d.years[Number(day.slice(0,4))]=day.slice(5);
  }
  const periods=seasonPeriods(catalog,`${year-1}-01-01`,`${year+1}-12-31`,{hemi,starts:calendar});
  // La misma prioridad de catálogo (primero festividades, luego estaciones),
  // pero sobre periodos CALCULADOS con fechas lunares sincronizadas.
  const activePeriods=periods.filter(p=>p.start<=today&&p.end>=today&&auto.includes(p.key));
  const active=Object.keys(catalog).find(k=>catalog[k].g!=='est'&&activePeriods.some(p=>p.key===k))
    ||activePeriods.find(p=>catalog[p.key]?.g==='est')?.key||null;
  return Object.entries(catalog).map(([key,s])=>{
    const occurrences=periods.filter(p=>p.key===key);
    const thisYear=occurrences.filter(p=>p.start.slice(0,4)===String(year)||p.end.slice(0,4)===String(year));
    const current=thisYear.find(p=>p.start<=today&&p.end>=today);
    const past=thisYear.filter(p=>p.end<today).at(-1);
    const next=thisYear.find(p=>p.start>today) || occurrences.find(p=>p.start>today);
    const period=current||past||next||null;
    const phase=current?'current':past?'finished':next?'upcoming':'unknown';
    const enabled=auto.includes(key);
    const applied=enabled&&current&&active===key;
    const state=!enabled?'disabled':applied?'applied':current?'current':phase==='finished'?'finished':phase==='upcoming'?'upcoming':'unknown';
    const stateLabel={
      applied:'Aplicada ahora',current:'En periodo',upcoming:'Próxima',
      finished:'Finalizada',disabled:'Desactivada',unknown:'Sin fechas'
    }[state];
    const periodLabel=period?formatSeasonPeriod(period):'Sin fechas para este periodo';
    const temporalLabel=phase==='finished'?'Finalizó':phase==='current'?'Vigente hasta':phase==='upcoming'?'Comienza':'Sin intervalo';
    const milestone=period?(phase==='current'||phase==='finished'?period.end:period.start):null;
    const sort={applied:0,current:1,upcoming:2,finished:3,disabled:4,unknown:5}[state];
    return {key,label:s.l,enabled,applied,state,stateLabel,phase,period,periodLabel,temporalLabel,milestone,sort};
  });
}

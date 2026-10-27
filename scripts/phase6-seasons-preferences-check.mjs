// Fase 6.2 — Contratos de temporada, preferencias y vistas previas.
// Pruebas con funciones reales y datos ficticios; ninguna conexión a cuentas ni Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activeSeason, SEASONS } from '../src/anim.js';
import { seasonPeriods, formatSeasonPeriod, addSeasonDay } from '../src/season-periods.js';
import * as TP from '../src/teampage.js';

const src=p=>readFileSync(p,'utf8');
const app=src('src/app.js'), ui=src('src/ui.js'), profile=src('src/profile.js'), reader=src('src/reader.js'),studio=src('src/studio.js'), seasonSource=src('src/season.js');
const contains=(text,needle,why)=>assert(text.includes(needle),'Regresión de '+why);

const kv=new Map();
globalThis.localStorage={
  getItem:k=>kv.get(k)??null,
  setItem:(k,v)=>kv.set(k,String(v)),
  removeItem:k=>kv.delete(k)
};
globalThis.location={pathname:'/',search:''};
globalThis.dispatchEvent=()=>true;
const SE=await import('../src/season.js');
const halloweenDate=new Date('2026-10-27T12:00:00Z'), noDate=new Date('2026-11-10T12:00:00Z');
const mockSb={
  from(table){ if(table==='platform_settings')return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{seasons:{auto:['halloween','primavera'],intensity:'sutil',density:'pocas'}}})};
    if(table==='season_calendar')return {select(){return this},in(){return this},not:async()=>({data:[]})};
    throw Error('Consulta inesperada: '+table);
  }
};
await SE.load(mockSb,true);
SE.setOff(false);
assert.equal(SE.platformKey(halloweenDate),'halloween','Temporada automática activa');
assert.equal(SE.platformKey(noDate),null,'Fuera del periodo');
SE.setOff(true);
assert.equal(SE.platformKey(halloweenDate),null,'Apagar temporadas también oculta el aviso de Inicio');
assert.equal(SE.isOff(),true,'Preferencia desactivada persiste');
globalThis.location.search='?temporada=navidad';
assert.equal(SE.platformKey(halloweenDate),'navidad','Vista previa explícita prevalece sobre temporada apagada');
globalThis.location.search='';
SE.setOff(false);
assert.equal(SE.platformKey(halloweenDate),'halloween','Reactivación restaura temporada sin mutar calendario');

const design=TP.normalize({theme:'sakura',bg:'claro',font:'literata',logo:'hanko',cover:'obi',
  seasons:{manual:'navidad',auto:['halloween'],hemi:'sur',deco:'full',greet:{navidad:'Saludos del equipo'},orn:{navidad:'team/adorno.png'}}});
const snapshot=structuredClone(design);
const D={t:{id:'team-qa',slug:'qa',name:'Editorial de prueba',color:'#f2c230',settings:{},langs:['ja'],design,avatar_path:null},
  works:[],mem:[],next:null};
const h={esc:x=>String(x??''),media:x=>String(x??'')};
const regular=TP.render(D,design,h),hidden=TP.render(D,design,{...h,sim:''});
assert(regular.includes('data-season="navidad"'),'Temporada del equipo activa');
assert(!hidden.includes('data-season="navidad"'),'Preferencia personal desactiva adorno de temporada del equipo');
assert(!hidden.includes('tp2-orn'),'Vista pública sin elementos estacionales cuando el lector los desactiva');
assert(hidden.includes('Editorial de prueba'),'No debe desaparecer la página del equipo');
assert(hidden.includes('tp2-logo'),'Logo del equipo conservado');
const explicit=TP.render(D,design,{...h,sim:'hanami'});
assert(explicit.includes('data-season="hanami"'),'Vista previa explícita de Studio conserva su simulación');
assert.deepEqual(design,snapshot,'La simulación no modifica el diseño almacenado');
assert.equal(activeSeason(design.seasons,halloweenDate),'navidad','Tema manual del equipo gana al automático');
assert.equal(TP.effective(design,'#f2c230','').season,null,'Modo personal sin temporada no altera diseño');
const min=TP.effective({...design,seasons:{...design.seasons,deco:'min'}},'#f2c230','navidad');
assert.equal(min.anim.particles,false,'Solo colores no activa partículas');
assert.equal(min.pattern,design.pattern,'Solo colores conserva el patrón elegido');

contains(ui,"const publicSeasonOff = (() => { try { return localStorage.getItem('obi-season') === 'off'; }",'lectura del ajuste de temporada del lector');
contains(ui,"TP.render(D, design, { esc, media, top, sim: publicSeasonOff ? '' : undefined })",'equipo público sin adornos cuando están desactivados');
contains(ui,"TP.effective(design, D.t.color, publicSeasonOff ? '' : undefined)",'animaciones estacionales del equipo respetan la preferencia');
contains(seasonSource,"return preview || (isOff() ? null : activeSeason(",'aviso de temporada en Inicio respeta la preferencia');
contains(app,'let seasonApplySeq = 0;','protección frente a cambios rápidos de página');
contains(app,'if (seq !== seasonApplySeq || route !== location.pathname + location.search) return;','no reusar resultados de otra ruta');
contains(app,"if (p === '/catalogo') return S.apply('catalog')",'temporada en Catálogo');
contains(app,"return k ? S.apply('series', { key: k, greet: T.greet?.[k] || '' }) : S.apply('series')",'tema de equipo prevalece en ficha');
contains(app,'window.obiSetUI(profile.ui_prefs)','preferencias guardadas tras sesión');
contains(app,"localStorage.setItem('obi-ui', JSON.stringify(P || {}))",'caché de preferencias de interfaz');
contains(profile,"sb.from('reader_prefs').upsert({ user_id: user.id, global: snapshot.global, per_volume: snapshot.per_volume",'persistencia global y por volumen');
contains(reader,"const effective = volId => ({ ...DEF, ...(S.series?.teams?.reader_defaults || {}), ...S.remote.global, ...(S.remote.per_volume[volId] || {}) });",'prioridad equipo - global - volumen');
contains(studio,'TP.render(D, previewDesign','vista previa del diseño sin edición en la página pública');
console.log('Fase 6.2: respeto de temporadas, tema manual, solo colores, vista previa y preferencias confirmado.');

/* Calendario: ventanas inclusivas, límites entre meses/años y fechas lunares. */
const periods = (a, b, opts) => seasonPeriods(SEASONS, a, b, opts);
const october = periods('2026-10-01', '2026-10-31');
const halloween = october.find(p => p.key === 'halloween');
assert(halloween, 'Halloween debe aparecer en octubre');
assert.deepEqual([halloween.start, halloween.end], ['2026-10-25', '2026-10-31'], 'Halloween dura del 25 al 31 inclusive');
assert.equal(formatSeasonPeriod(halloween), '25 al 31 de octubre de 2026', 'El calendario debe describir el rango completo');
assert(halloween.start <= '2026-10-27' && halloween.end >= '2026-10-27', 'El 27 de octubre sigue dentro de Halloween');
assert(!('2026-11-01' <= halloween.end), 'Halloween ya terminó el 1 de noviembre');
const halloweenWeek = periods('2026-10-26', '2026-11-01').filter(p => p.key === 'halloween');
assert.equal(halloweenWeek.length, 1, 'No se debe duplicar Halloween en una misma semana');
const january = periods('2027-01-01', '2027-01-31');
assert(january.some(p => p.key === 'anonuevo' && p.start === '2026-12-30' && p.end === '2027-01-02'),
  'Año Nuevo debe conservar ambos años en enero');
const easter = periods('2026-04-01', '2026-04-30').find(p => p.key === 'pascua');
assert.deepEqual([easter.start, easter.end], ['2026-04-02', '2026-04-06'], 'Las festividades lunares respetan días antes y después');
assert(january.some(p => p.key === 'invierno' && p.start === '2026-12-21' && p.end === '2027-03-19'),
  'El invierno del norte cruza el año y termina antes de primavera');
assert(january.some(p => p.key === 'verano' && p.start === '2026-12-21' && p.end === '2027-03-19') === false,
  'El hemisferio norte no debe confundirse con el sur');
assert(periods('2027-01-01', '2027-01-31', { hemi: 'sur' }).some(p => p.key === 'verano' && p.end === '2027-03-19'),
  'Las estaciones del hemisferio sur respetan su calendario');
const offset = addSeasonDay('2026-10-31', 1);
assert.equal(offset, '2026-11-01', 'El cálculo de fechas es estable al cruzar el mes');
const agendaSource = src('src/agenda.js');
for (const marker of ['seasonSummary(periods)', 'month(list, periods)', 'week(list, periods)', 'ag-msel-season', 'ag-season-dot', 'seasonPeriods(AN?.SEASONS']) {
  assert(agendaSource.includes(marker), 'La interfaz debe mostrar el intervalo de temporadas: ' + marker);
}
console.log('Calendario: Halloween 25–31 oct., estaciones, año nuevo, fechas lunares y señalización de toda la vigencia verificados.');

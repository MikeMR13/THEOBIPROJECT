import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeFeaturedSelection,homeDayKey} from '../src/home-featured.js';
const now=new Date('2026-10-21T20:30:00.000Z');
const day=new Date('2026-10-22T20:30:00.000Z');
const series=Array.from({length:18},(_,i)=>({
  id:'s'+i,team_id:'t'+(i%6),teams:{name:'Equipo '+(i%6)},title:'Obra '+i,
  views:i*20,published:true,translation_status:i===17?'completed':'active'
}));
const news={
 entries:[
  {id:'s0',kind:'volume',volume:{num:2,is_final:false},at:'2026-10-21T18:00:00Z',time:Date.parse('2026-10-21T18:00:00Z')},
  {id:'s1',kind:'chapter',at:'2026-10-21T14:00:00Z',time:Date.parse('2026-10-21T14:00:00Z')},
  {id:'s2',kind:'volume',volume:{num:1},at:'2026-10-20T14:00:00Z',time:Date.parse('2026-10-20T14:00:00Z')}
 ],bySeries:{}
};
const rankings=ids=>ids.map((id,pos)=>({series_id:id,score:100-pos,pos:pos+1}));
const input={series,news,weekly:rankings(['s4','s5','s6']),historic:rankings(['s7','s8','s9']),
  trends:rankings(['s10','s11','s12']).map(x=>({...x,list:'tendencia',period:'hoy'})),
  editorial:['s13','s14','s15'],teams:[{team_id:'t4',series_id:'s16',updated_at:'2026-10-21T08:00:00Z'},{team_id:'t5',series_id:'s17',updated_at:'2026-10-21T08:00:00Z'}],now};
const out=homeFeaturedSelection(input);
assert(out.entries.length<=8,'Carrusel compacto de máximo ocho diapositivas editoriales');
assert(out.entries.filter(x=>x.kind==='release').length<=2,'Solo dos lanzamientos cada día');
assert.equal(out.entries.filter(x=>x.kind==='team').length,1,'Un equipo diario dentro del hero; el resto en la banda');
assert.equal(new Set(out.entries.map(x=>x.id)).size,out.entries.length,'No duplicar novelas');
for(const category of ['release','popular','historic','editorial','discover','trending'])assert(out.pool[category].length<=3,'Tope de tres por '+category);
assert.equal(out.day,homeDayKey(now));
assert.deepEqual(homeFeaturedSelection({...input}).entries,out.entries,'Carrusel estable dentro del mismo día');
assert.notEqual(homeDayKey(now),homeDayKey(day));
assert.equal(out.pool.team.length,2,'Cada equipo presenta una candidatura');
assert(out.teamRecommendations.some(x=>x.id==='s16')&&out.teamRecommendations.some(x=>x.id==='s17'),'Ningún equipo queda fuera de la banda');
// El nuevo volumen final entra en el día ya iniciado y reemplaza inmediatamente otro lanzamiento.
const newlyCompleted={id:'s17',kind:'volume',at:'2026-10-21T20:25:00Z',
  time:Date.parse('2026-10-21T20:25:00Z'),volume:{num:5,is_final:true}};
const recent={...input,news:{...news,entries:[newlyCompleted,...news.entries]}};
const changed=homeFeaturedSelection(recent);
assert.equal(changed.entries[0].id,'s17','Novela completa inmediata, sin esperar mañana');
assert.equal(changed.entries[0].urgent,true);
assert(changed.entries.filter(x=>x.kind==='release').length<=2);
assert.equal(new Set(changed.entries.map(x=>x.id)).size,changed.entries.length,'No repetir recomendación del equipo');
const otherDay=homeFeaturedSelection({...recent,now:day});
assert(otherDay.pool.release.length<=3,'Candidaturas de lanzamiento limitadas tras rotación');
// Una obra no publicada, ajena o inexistente no debe entrar en la recomendación.
const invalid=homeFeaturedSelection({...input,teams:[{team_id:'ajeno',series_id:'s16',updated_at:'2026-10-21T08:00:00Z'},{team_id:'t0',series_id:'desconocida',updated_at:'2026-10-21T08:00:00Z'}]});
assert.equal(invalid.pool.team.length,0);

const eightTeams=Array.from({length:14},(_,i)=>({
  id:'e'+i,team_id:'et'+i,teams:{name:'Equipo extra '+i},views:i+1,published:true,
  translation_status:'active'
}));
const eightInput={...input,series:[...series,...eightTeams],
 teams:eightTeams.map((s,i)=>({team_id:s.team_id,series_id:s.id,updated_at:'2026-10-21T08:00:00Z'}))};
const many=homeFeaturedSelection(eightInput);
assert.equal(many.pool.team.length,14,'Sin límite de tres recomendaciones de equipo');
assert.equal(many.entries.filter(x=>x.kind==='team').length,1,'El carrusel muestra un equipo rotativo');
assert.equal(many.teamRecommendations.length,14,'Los 14 equipos permanecen en la banda propia');
assert(many.entries.length<=8,'El hero no puede crecer con el número de equipos');
assert.equal(new Set(many.entries.map(x=>x.id)).size,many.entries.length,'Sin repetir obras');
assert.deepEqual(homeFeaturedSelection(eightInput).entries,many.entries,'Orden diario estable de equipos');
const expiration='2026-10-14T20:30:00.000Z';
const expired=homeFeaturedSelection({...eightInput,teams:[
 {...eightInput.teams[0],updated_at:expiration},
 {...eightInput.teams[1],updated_at:'2026-10-14T20:30:00.001Z'},
 {...eightInput.teams[2],updated_at:'2026-10-21T20:30:00.001Z'}]});
assert.equal(expired.pool.team.length,1,'A los siete días exactos caduca; futuras no activas');
assert.equal(expired.pool.team[0].id,eightInput.teams[1].series_id);
const replaced=homeFeaturedSelection({...eightInput,teams:[
 {...eightInput.teams[0],updated_at:'2026-10-21T20:20:00Z'}
]});
assert.equal(replaced.pool.team.length,1,'Una nueva selección reinicia sus siete días');
assert.equal(replaced.pool.team[0].expiresAt,'2026-10-28T20:20:00.000Z');

// Incidente: el primer volumen de una novela recién estrenada NO debe caer en
// «Joya por descubrir» por tener pocas vistas o competir con novelas completas.
const NOW_LAUNCH=new Date('2026-10-23T21:20:00Z');
const candidateSeries=[
  {id:'nuevo',team_id:'team-nuevo',teams:{name:'Equipo estreno'},views:0,translation_status:'active'},
  {id:'completo',team_id:'team-viejo',teams:{name:'Equipo antiguo'},views:100,translation_status:'completed'},
  {id:'antiguo',team_id:'team-otro',teams:{name:'Equipo otro'},views:5,translation_status:'active'}
];
const launchInput={
  series:candidateSeries,
  news:{entries:[
    {id:'nuevo',kind:'volume',isNewSeries:true,at:'2026-10-23T21:06:44Z',time:Date.parse('2026-10-23T21:06:44Z'),volume:{num:1}},
    {id:'completo',kind:'volume',at:'2026-10-23T04:19:18Z',time:Date.parse('2026-10-23T04:19:18Z'),volume:{num:4,is_final:true}},
    {id:'antiguo',kind:'volume',at:'2026-10-22T02:29:00Z',time:Date.parse('2026-10-22T02:29:00Z'),volume:{num:2}}
  ]},
  teams:[{team_id:'team-nuevo',series_id:'nuevo',updated_at:'2026-10-23T20:00:00Z'}],
  now:NOW_LAUNCH
};
const debut=homeFeaturedSelection(launchInput);
assert.equal(debut.entries[0].id,'nuevo','El volumen 1 recién publicado lidera el carrusel, antes que una novela completada ayer');
assert.equal(debut.bySeries.nuevo.kind,'release','Un estreno debe conservar su tipo de publicación');
assert.equal(debut.bySeries.nuevo.label,'Nuevo lanzamiento','No usar Joya por descubrir ni recomendado por equipo');
assert.equal(debut.entries.filter(x=>x.id==='nuevo').length,1,'No duplicar el estreno por otra categoría');
assert(debut.entries.some(x=>x.id==='completo'&&x.kind==='release'),'Conservar otro estreno completo reciente');
const afterWeek=homeFeaturedSelection({...launchInput,now:new Date('2026-11-02T21:20:00Z')});
assert(!afterWeek.pool.release.some(x=>x.label==='Nuevo lanzamiento'),'Ningún estreno queda etiquetado como nuevo para siempre');

// Editorial: los volúmenes más recientes (incluidos los que completan una
// traducción) compiten por fecha durante 48 h. La etiqueta dura siete días.
const competing={...launchInput,news:{entries:[
  launchInput.news.entries[0],
  {...launchInput.news.entries[1],at:'2026-10-23T21:11:00Z',
    time:Date.parse('2026-10-23T21:11:00Z')},
  launchInput.news.entries[2]
]}};
const priority=homeFeaturedSelection(competing);
assert.equal(priority.entries[0].id,'completo','Primeras 48 h: el volumen público más reciente debe abrir el carrusel');
assert.equal(priority.entries[1].id,'nuevo','Un debut reciente conserva la segunda posición de lanzamientos');
assert.equal(priority.entries[0].label,'¡Novela completa!','Conservar la etiqueta de volumen finalizado cuando sea el más reciente');
// Regresión 28/oct: un volumen 3 estrenado hoy prevalece sobre debuts y
// novelas completas de días anteriores; no necesita ser el volumen 1.
const newVolume={id:'antiguo',kind:'volume',at:'2026-10-23T21:18:00Z',
  time:Date.parse('2026-10-23T21:18:00Z'),volume:{num:3,is_final:false}};
const withVolume3=homeFeaturedSelection({...launchInput,
  news:{...launchInput.news,entries:[newVolume,...launchInput.news.entries]}});
assert.equal(withVolume3.entries[0].id,'antiguo','El volumen 3 recién estrenado debe ocupar el primer lugar');
assert.equal(withVolume3.entries[0].label,'Nuevo volumen','No confundir un volumen 3 con debut ni novela completa');
assert.equal(withVolume3.entries[1].id,'nuevo','El debut anterior conserva la segunda plaza');
assert.equal(withVolume3.entries.filter(x=>x.kind==='release').length,2,
  'Mantener dos cupos de lanzamientos sin eliminar otras categorías');
assert.equal(new Set(withVolume3.entries.map(x=>x.id)).size,withVolume3.entries.length,
  'Un volumen nuevo no debe duplicar la novela en otra categoría');
const oldVolume=homeFeaturedSelection({...launchInput,now:new Date('2026-10-26T21:20:00Z'),
  news:{...launchInput.news,entries:[newVolume,...launchInput.news.entries]}});
assert.equal(oldVolume.entries[0].id,'completo',
  'Tras las 48 h deja de ser obligatoria la primera posición para el volumen 3');

const after48=homeFeaturedSelection({...competing,now:new Date('2026-10-26T21:20:00Z')});
assert.equal(after48.entries[0].id,'completo','Pasadas 48 h ya no se fija el debut delante de novedades más pertinentes');
assert(after48.pool.release.some(x=>x.id==='nuevo' && x.label==='Nuevo lanzamiento'),
  'El estreno mantiene su etiqueta durante siete días');

// Descubrimiento: no confundir una obra de cero vistas recién estrenada con una joya.
const curatingNow=new Date('2026-10-23T21:30:00Z');
const curated=[
  {id:'joya',views:2,firstPublishedAt:'2026-10-01T10:00:00Z',chapters:[{count:5}]},
  {id:'estreno',views:0,firstPublishedAt:'2026-10-23T20:00:00Z',chapters:[{count:6}]},
  {id:'vacia',views:1,firstPublishedAt:'2026-10-01T10:00:00Z',chapters:[{count:2}]},
  {id:'inactiva',views:1,firstPublishedAt:'2026-08-01T10:00:00Z',chapters:[{count:9}]},
  {id:'sinfecha',views:0,chapters:[{count:9}]}
];
const findAt={joya:'2026-10-19T11:00:00Z',estreno:'2026-10-23T20:00:00Z',
  vacia:'2026-10-19T11:00:00Z',inactiva:'2026-08-10T10:00:00Z'};
const discovery=homeFeaturedSelection({series:curated,now:curatingNow,
  news:{entries:[],bySeries:Object.fromEntries(Object.entries(findAt)
    .map(([id,at])=>[id,{at}]))}});
assert.deepEqual(discovery.pool.discover.map(x=>x.id),['joya'],
  'Solo obra con edad >=7 días, >=3 capítulos y actividad <=30 días puede ser joya');
const steady=homeFeaturedSelection({series:[...curated],now:curatingNow,
  news:{entries:[],bySeries:Object.fromEntries(Object.entries(findAt)
    .map(([id,at])=>[id,{at}]))}});
assert.deepEqual(steady.pool.discover,discovery.pool.discover,'Curaduría determinista');
// El primer equipo rota diariamente, pero se conservan todas sus recomendaciones.
const teamLeads=Array.from({length:7},(_,i)=>{
  const at=new Date(Date.parse('2026-10-21T20:30:00Z')+i*864e5);
  const entry=homeFeaturedSelection({...eightInput,now:at});
  assert.equal(entry.entries.filter(x=>x.kind==='team').length,1,
    'El carrusel debe destacar una recomendación grupal diaria');
  return entry.entries.find(x=>x.kind==='team')?.teamId;
});
assert(new Set(teamLeads).size>1,'Cambiar el día debe rotar qué equipo aparece temprano');

const studio=readFileSync('src/studio.js','utf8')+'\n'+readFileSync('src/studio-works-view.js','utf8');
const ui=readFileSync('src/ui.js','utf8');
const sql=readFileSync('supabase/migrations/20261115_team_featured_carousel.sql','utf8');
const expirySql=readFileSync('supabase/migrations/20261116_team_featured_expiry.sql','utf8');
for(const needle of ["sb.rpc('team_feature_set'","data-feature","featuredSeriesId===w.id"])assert(studio.includes(needle),'Falta botón o RPC: '+needle);
for(const needle of ["homeFeaturedSelection(","homeDayKey()","select('announced_at,published_at')","team_featured_series"])assert(ui.includes(needle),'Falta portada o actualización inmediata: '+needle);
for(const needle of ['primary key references public.teams','enable row level security','private.team_can','on conflict(team_id)','grant execute on function public.team_feature_set'])assert(sql.includes(needle),'Falta garantía de seguridad: '+needle);
for(const needle of ["interval '7 days'","updated_at > now()","cron.schedule","obi-team-featured-expire"])
 assert(expirySql.includes(needle),'Falta garantía de expiración: '+needle);
const scopedPolicy=readFileSync('supabase/migrations/20261117_team_featured_read_scope.sql','utf8');
assert(scopedPolicy.includes('s.team_id = public.team_featured_series.team_id'),
  'La política RLS debe comparar el equipo propietario real y evitar condiciones ambiguas');
assert(ui.includes("teamHighlights()")&&ui.includes("teamSignature(")&&ui.includes("readPages("),
 'Falta lectura sin límite y refresco de pestaña abierta');
assert(studio.includes("featuredExpiresAt")&&studio.includes("7 días"),
 'Studio debe indicar fecha de vigencia');
console.log('Inicio: todas las recomendaciones de equipos 7 días, sin límite, sin duplicados y con novela completa inmediata OK');

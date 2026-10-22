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
assert(out.entries.length>=8 && out.entries.length<=9,'Siete lugares editoriales + todas las recomendaciones');
assert(out.entries.filter(x=>x.kind==='release').length<=2,'Solo dos lanzamientos cada día');
assert.equal(out.entries.filter(x=>x.kind==='team').length,2,'Deben aparecer ambos equipos, no uno por día');
assert.equal(new Set(out.entries.map(x=>x.id)).size,out.entries.length,'No duplicar novelas');
for(const category of ['release','popular','historic','editorial','discover','trending'])assert(out.pool[category].length<=3,'Tope de tres por '+category);
assert.equal(out.day,homeDayKey(now));
assert.deepEqual(homeFeaturedSelection({...input}).entries,out.entries,'Carrusel estable dentro del mismo día');
assert.notEqual(homeDayKey(now),homeDayKey(day));
assert.equal(out.pool.team.length,2,'Cada equipo presenta una candidatura');
assert(out.entries.some(x=>x.id==='s16')&&out.entries.some(x=>x.id==='s17'),'Ningún equipo queda fuera');
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
assert.equal(many.entries.filter(x=>x.kind==='team').length,14,'Todos los equipos visibles incluso si el carrusel supera ocho');
assert(many.entries.length>=14,'El límite general del carrusel no puede ocultar equipos');
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

const studio=readFileSync('src/studio.js','utf8');
const ui=readFileSync('src/ui.js','utf8');
const sql=readFileSync('supabase/migrations/20261115_team_featured_carousel.sql','utf8');
const expirySql=readFileSync('supabase/migrations/20261116_team_featured_expiry.sql','utf8');
for(const needle of ["sb.rpc('team_feature_set'","data-feature","featuredSeriesId===w.id"])assert(studio.includes(needle),'Falta botón o RPC: '+needle);
for(const needle of ["homeFeaturedSelection(","homeDayKey()","select('announced_at,published_at')","team_featured_series"])assert(ui.includes(needle),'Falta portada o actualización inmediata: '+needle);
for(const needle of ['primary key references public.teams','enable row level security','private.team_can','on conflict(team_id)','grant execute on function public.team_feature_set'])assert(sql.includes(needle),'Falta garantía de seguridad: '+needle);
for(const needle of ["interval '7 days'","updated_at > now()","cron.schedule","obi-team-featured-expire"])
 assert(expirySql.includes(needle),'Falta garantía de expiración: '+needle);
assert(ui.includes("teamHighlights()")&&ui.includes("teamSignature(")&&ui.includes("readPages("),
 'Falta lectura sin límite y refresco de pestaña abierta');
assert(studio.includes("featuredExpiresAt")&&studio.includes("7 días"),
 'Studio debe indicar fecha de vigencia');
console.log('Inicio: todas las recomendaciones de equipos 7 días, sin límite, sin duplicados y con novela completa inmediata OK');

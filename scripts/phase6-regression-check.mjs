// Fase 6.5: regresión cruzada de lector, navegación, equipos, temporadas y EPUB.
// Ejecuta funciones reales aisladas, sin servicios externos ni credenciales.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {readerPrefsKey,readReaderPrefs,sameReaderAccount,readingProgressKey,readingProgressPrefix,readerProgressKeys} from '../src/reader-pref-cache.js';
import {cleanReaderTeamDefaults} from '../src/reader-team-defaults.js';
import {publicationAge} from '../src/publication-dates.js';
const source=p=>readFileSync(p,'utf8');
const reader=source('src/reader.js'),app=source('src/app.js'),studio=source('src/studio.js'),
 profile=source('src/profile.js'),ui=source('src/ui.js'),seasons=source('src/season.js'),
 teampage=source('src/teampage.js'),blocks=source('src/blocks.js'),defaultsUI=source('src/studio-reader-defaults.js');
const check=(src,term,why)=>assert(src.includes(term),'Regresión '+why+': '+term);
const data=new Map();
const localStorage={
  getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),
  key:i=>[...data.keys()][i]??null,get length(){return data.size}
};
localStorage.setItem(readingProgressKey('serie1','cuentaA'),JSON.stringify({num:4,at:'2026-10-20T10:00:00Z'}));
localStorage.setItem(readingProgressKey('serie2','cuentaB'),JSON.stringify({num:2,at:'2026-10-20T11:00:00Z'}));
localStorage.setItem(readingProgressKey('serie3',null),JSON.stringify({num:7,at:'2026-10-20T09:00:00Z'}));
assert.deepEqual(readerProgressKeys(localStorage,'cuentaA'),['obi-pos-cuentaA__serie1']);
assert.deepEqual(readerProgressKeys(localStorage,'cuentaB'),['obi-pos-cuentaB__serie2']);
assert.deepEqual(readerProgressKeys(localStorage,null),['obi-pos-serie3']);
assert(!sameReaderAccount('cuentaA','cuentaB'));
assert(sameReaderAccount(undefined,null));
assert.equal(readingProgressPrefix('cuentaB'),'obi-pos-cuentaB__');
localStorage.setItem(readerPrefsKey('cuentaA'),JSON.stringify({global:{font:'Literata'},per_volume:{}}));
assert.deepEqual(readReaderPrefs(localStorage,'cuentaB'),{global:{},per_volume:{}});
assert.deepEqual(cleanReaderTeamDefaults({theme:'sepia',illus:true,untrusted:'cannot-write'}),{theme:'sepia',illus:true});

// Ejecuta saveProgress original sin DOM real: después de cambiar cuenta no debe guardar el capítulo de otra persona.
const saveA=reader.indexOf('  async function saveProgress(){');
const saveB=reader.indexOf('  // sin conexión:',saveA);
assert(saveA>=0&&saveB>saveA);
const saved=[], progressState={
  active:{id:'cap1',num:1,volume_id:'vol1'},series:{id:'serie4'},activeOwner:'cuentaA',
  readMarked:new Set(),saveT:null
};
let activeUser={id:'cuentaB'};
const save=vm.runInNewContext(reader.slice(saveA,saveB)+'\nsaveProgress',{
  S:progressState,localStorage,getUser:()=>activeUser,clearTimeout:()=>{},
  $:()=>({}),currentBlock:()=>({block:3,pct:0.4}),effective:()=>({continuous:'volume'}),
  posKey:id=>readingProgressKey(id,activeUser?.id),pushPos:(user,sid,rec)=>saved.push({user:user.id,sid,rec}),
  pushRead:()=>{throw Error('No debería marcar como leído al 40 %')},
  sameReaderAccount,Date,JSON
});
await save();
assert(!data.has('obi-pos-cuentaB__serie4'),'Se filtró progreso del usuario A al usuario B');
assert.equal(saved.length,0);
activeUser={id:'cuentaA'};await save();
assert.equal(saved.length,1);
assert.equal(saved[0].user,'cuentaA');
assert.equal(saved[0].rec.mode,'continuous');
assert.equal(JSON.parse(data.get('obi-pos-cuentaA__serie4')).block,3);
activeUser={id:'cuentaB'};progressState.activeOwner='cuentaB';await save();
assert.equal(saved.at(-1).user,'cuentaB');

// Ejecuta contBtn original: cuando una consulta de A responde después de la de B, no debe sustituir el botón de B.
const contA=app.indexOf('async function contBtn(force){');
const contB=app.indexOf('\nasync function bell(){',contA);
assert(contA>=0&&contB>contA);
const lookups=new Map();
const button={
  hidden:false,href:'',title:'',attrs:{},setAttribute(k,v){this.attrs[k]=v},
  querySelector(k){return k==='b'?this.bold:this.small},
  bold:{textContent:''},small:{textContent:''}
};
// La prueba de guardar progreso dejó un capítulo nuevo de B sin metadatos de obra;\n// aislar ese registro para probar el orden de respuestas del servidor.\nlocalStorage.removeItem(readingProgressKey('serie4','cuentaB'));\nconst runtime=vm.runInNewContext('let user=null, CB={t:0,v:null,u:null};\n'+app.slice(contA,contB)+
  '\n({run:contBtn,setUser(value){user=value},snapshot(){return CB}})',{
    $:sel=>sel==='#ob-cont'?button:null,
    location:{pathname:'/'},Date,JSON,Math,localStorage,
    sameReaderAccount,readingProgressPrefix,readerProgressKeys,
    navigator:{onLine:false},window:{},rd:()=>{throw Error('No debería precargar sin conexión')},
    sb:{from(name){
      assert.equal(name,'reading_progress');
      let uid=null;
      return {select(){return this},eq(k,v){if(k==='user_id')uid=v;return this},
        order(){return this},limit(){return new Promise(resolve=>lookups.set(uid,resolve))}
      };
    }}
  });
runtime.setUser({id:'cuentaA'});const first=runtime.run(true);
assert(lookups.has('cuentaA'));
runtime.setUser({id:'cuentaB'});const second=runtime.run(true);
assert(lookups.has('cuentaB'));
lookups.get('cuentaB')({data:[{series_id:'serieB',chapter_num:3,pct:0.5,updated_at:'2026-10-20T12:00:00Z',series:{slug:'novela-b',title:'Novela B'}}]});
await second;
assert.equal(button.href,'/leer/novela-b/3','B result: '+JSON.stringify({button,cb:runtime.snapshot(),pending:[...lookups.keys()]}));
lookups.get('cuentaA')({data:[{series_id:'serieA',chapter_num:8,pct:0.6,updated_at:'2026-10-20T12:30:00Z',series:{slug:'novela-a',title:'Novela A'}}]});
await first;
assert.equal(button.href,'/leer/novela-b/3','Una consulta de la cuenta anterior sustituyó el botón Continuar');
assert.equal(runtime.snapshot().u,'cuentaB');

for(const [file,term,label] of [
  [reader,'S.prefsVersion=(S.prefsVersion || 0)+1;','edición invalida respuesta de preferencias remotas'],
  [reader,'S.prefsRequest === request','respuesta remota con secuencia de petición'],
  [reader,'S.activeOwner = openingUser','capítulo asociado a identidad que lo abrió'],
  [reader,'sameReaderAccount(S.activeOwner, getUser()?.id)','bloqueo de progreso tras cambio de cuenta'],
  [reader,'readerProgressKeys(localStorage,user.id)','reenvío de progreso pendiente de cuenta correcta'],
  [reader,"const RQ = user => 'obi-read-q:' + user.id",'cola de leídos por cuenta'],
  [reader,'saveProgress, 1200','guardado por desplazamiento'],
  [reader,"p.continuous === 'off' ? 'chapter' : 'continuous'",'modo lector en progreso'],
  [reader,'fontVars(v, effective(c.volume_id))','fuente EPUB por volumen'],
  [profile,'R.global = { ...R.global, [k]: v }','preferencias globales no sustituyen equipo'],
  [studio,'mountTeamReaderDefaults({ app, sb, teamId: teamDefaultsTeam','configuración predeterminada desde Studio'],
  [studio,"team_design_publish",'publicación explícita de diseño'],
  [defaultsUI,"update({reader_defaults:next})",'guardado restringido a predeterminados'],
  [defaultsUI,'el.disabled=busy','controles de edición bloqueados durante guardado'],
  [ui,'function heroSlide(feat','carrusel principal'],
  [ui,'const bindCars = root','carruseles secundarios'],
  [seasons,'isOff() ? null : activeSeason','preferencia de temporada'],
  [teampage,"deco !== 'min'",'solo colores sin adornos'],
  [blocks,"'RUBY','RT','RP'",'furigana EPUB'],
  [blocks,"'B','STRONG','I','EM'",'negritas/cursivas EPUB']
])check(file,term,label);
assert.equal(publicationAge('1996-10-20T12:00:00Z'),'');
console.log('Fase 6.5: aislamiento entre cuentas, carreras de Continuar, preferencias, EPUB y Studio — PASS');

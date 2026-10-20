// Integración de las cinco fases: preferencias guardadas y personalización estacional.
// Comprueba funciones reales y contratos de persistencia sin conexiones a servicios.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, effective, render, vars, THEMES, COVERS, LOGOS, PATTERNS } from '../src/teampage.js';
import { activeSeason, SEASONS } from '../src/anim.js';

const source=p=>readFileSync(p,'utf8');
const studio=source('src/studio.js'), studioCSS=source('src/studio.css'), admin=source('src/admin.js');
const profile=source('src/profile.js'), reader=source('src/reader.js'), seasonCode=source('src/season.js');
const ui=source('src/ui.js'), index=source('src/index.html');
const contains=(s,m,label)=>assert(s.includes(m),'No se conservó: '+label);

for(const key of ['tinta','sakura','biblioteca','neon','washi'])assert(THEMES[key],'Tema editorial ausente '+key);
for(const key of ['portada','bolsillo','obi'])assert(COVERS[key],'Cubierta no disponible '+key);
for(const key of ['cuadrado','circulo','hanko'])assert(LOGOS[key],'Forma de logo ausente '+key);
assert(PATTERNS.asanoha && PATTERNS.washi,'Patrones nipones perdidos');
assert(SEASONS.navidad && SEASONS.halloween && SEASONS.hanami,'Festividades perdidas');
assert.equal(activeSeason({manual:'navidad',auto:['halloween']},new Date('2026-10-27T12:00:00Z')),'navidad','Manual debe prevalecer sobre auto');
assert.equal(activeSeason({auto:['halloween']},new Date('2026-10-27T12:00:00Z')),'halloween','Festividad automática debe respetarse');
assert.equal(activeSeason({auto:['halloween']},new Date('2026-11-10T12:00:00Z')),null,'No aplicar festividad fuera de calendario');

const src={
  theme:'custom',template:'editorial',bg:'propio',accent:'#aabbcc',cover:'obi',
  logo:'hanko',pattern:'washi',font:'literata',motto:'Colección de prueba',
  seasons:{manual:'navidad',auto:['halloween','primavera'],hemi:'sur',deco:'full',
    noOrn:[],greet:{navidad:'Una lectura especial'},orn:{navidad:'team/logo-navidad.png'}}
};
const normalized=normalize(src,'#bbaacc');
const backup=structuredClone(normalized);
assert.equal(normalized.seasons.manual,'navidad');
assert.equal(normalized.seasons.hemi,'sur');
assert.equal(normalized.seasons.greet.navidad,'Una lectura especial');
assert.equal(normalized.seasons.orn.navidad,'team/logo-navidad.png');
assert.equal(normalized.cover,'obi');
assert.equal(normalized.logo,'hanko');
assert.equal(normalized.font,'literata');
assert.equal(normalized.accent,'#aabbcc');
const full=effective(normalized,'#bbaacc','navidad');
assert.equal(full.season,'navidad');
assert.equal(full.anim.particles,true);
assert.equal(full.pattern,SEASONS.navidad.pat);
const preview={...normalized,seasons:{...normalized.seasons,deco:'min'}};
const min=effective(preview,'#bbaacc','navidad');
assert.equal(min.season,'navidad');
assert.equal(min.anim.particles,false,'Solo colores no debe activar partículas');
assert.equal(min.pattern,normalized.pattern,'Solo colores no debe sustituir el patrón');
assert.equal(min.accent,SEASONS.navidad.ac,'Solo colores sigue aplicando paleta');
assert.equal(effective(normalized,'#bbaacc','').season,null,'Vista previa sin temporada');
assert.deepEqual(normalized,backup,'La simulación no debe mutar el diseño original');

const D={t:{name:'Equipo de prueba',slug:'equipo-prueba',id:'t1',color:'#bbaacc',
  settings:{},langs:['ja'],bio:'Colección literaria',design:normalized},
  works:[],mem:[],next:null};
const options={esc:s=>String(s??''),media:s=>String(s??''),sim:'navidad'};
const fullHTML=render(D,normalized,options);
const minHTML=render(D,preview,options);
assert(fullHTML.includes('tp2-orn'),'Decoración completa debe conservar adornos');
assert(!minHTML.includes('tp2-orn'),'Solo colores no debe dibujar adornos');
assert(fullHTML.includes('Una lectura especial') && minHTML.includes('Una lectura especial'),'El saludo personalizado se respeta');
assert(fullHTML.includes('team/logo-navidad.png'),'Adorno personalizado debe conservarse');
assert(minHTML.includes('tp2-greet'),'Solo colores conserva el saludo textual configurado');

const none=normalize({...normalized,seasons:{...normalized.seasons,noOrn:['navidad']}});
const noOrnHTML=render(D,none,options);
assert(!noOrnHTML.includes('tp2-orn'),'Omitir adornos seleccionados por el equipo');

contains(studio,'id="pf-msim"','selector de temporadas del Studio móvil');
contains(studio,'UI.mobDeco ? { ...previewBase, seasons: { ...previewBase?.seasons, deco: UI.mobDeco } }','vista previa móvil aislada');
contains(studio,'TP.render(D, previewDesign','reutilización del diseño original en vista previa');
contains(studio,"sb.rpc('team_design_save'","guardado del diseño del equipo");
contains(studio,"team_design_publish","publicación existente del diseño");
contains(studioCSS,'.pf-panel,#pf-pub,#pf-discard,.pf-pvbar .pf-seg{display:none}','edición oculta en teléfonos');
contains(admin,'.bb-sea-g{grid-template-columns:minmax(0,1fr)}','controles de temporadas en Bibliotecario');
contains(admin,'.bb #bbv .bb-tbl{min-width:720px}','tablas del Bibliotecario conservadas');

contains(profile,"sb.from('profiles').update(upd)","persistencia de preferencias de interfaz");
contains(profile,'window.obiSetUI?.({ ...UI })','sincronización de preferencias de interfaz');
contains(profile,"Object.assign(UI, prev)","reversión ante fallo de guardado");
contains(profile,"sb.from('reader_prefs').upsert({ user_id: user.id, global: R.global, per_volume: R.per_volume","guardado por volumen y global");
contains(profile,"localStorage.setItem('obi-reader-prefs', JSON.stringify(R))","persistencia local de lectura");
contains(reader,"const effective = volId => ({ ...DEF, ...(S.series?.teams?.reader_defaults || {}), ...S.remote.global, ...(S.remote.per_volume[volId] || {}) });","prioridad: equipo → global → volumen");
contains(reader,"const PREF_KEY = 'obi-reader-prefs'","clave de preferencias"); // alternativa: declaración junto a OFF_CACHE
contains(reader,"sb.from('reader_prefs').upsert","sincronización de ajustes en el lector");
contains(seasonCode,"export const isOff =","preferencia de ocultar festividades");
contains(seasonCode,"export const setOff =","preferencia para activar/desactivar festividades");
contains(seasonCode,"if (isOff() && !sim()) return;","respetar ocultación del lector");
contains(ui,"a.setAttribute('aria-current', 'page')","indicador de navegación accesible");
contains(ui,"publicationAge(d)","fechas fiables de novedades");
contains(index,'reader-a11y.css','estilos opcionales accesibles');

const data=new Map();
globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
globalThis.dispatchEvent=()=>true;
globalThis.location={search:''};
const platform=await import('../src/season.js');
platform.setOff(true);
assert.equal(platform.isOff(),true,'Preferencia de no mostrar festividades');
platform.setOff(false);
assert.equal(platform.isOff(),false,'Volver a activar festividades');
assert(!data.has('obi-season'),'La opción activada se conserva por ausencia de bandera off');

console.log('Integración fases 1–5: temporadas, diseños, adornos, lector, preferencias globales/volumen y navegación OK');

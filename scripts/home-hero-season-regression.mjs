// Regresión crítica de Inicio: heroSlide debe renderizar antes de afterRender.
// Ejecuta código real con datos ficticios; no consulta a Supabase ni a producción.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const code=readFileSync('src/ui.js','utf8');
const start=code.indexOf('  function heroSlide(');
const end=code.indexOf('  const card = (',start);
assert(start>0&&end>start,'No se encontró heroSlide en src/ui.js');
const fn=code.slice(start,end);

const el={
  dataset:{},
  innerHTML:'',
  querySelector(){return null},
  querySelectorAll(){return []}
};
const sandbox={
  el,
  $: selector=>selector==='#hero'?el:null,
  heroKey:item=>'pub:'+item.id,
  media:path=>path||'',
  publicationDate:value=>value?new Date(value):null,
  esc:value=>String(value??''),
  editorialChapterLabel:()=> 'Capítulo 1',
  currentNotice:()=>null,
  heroTag:()=> '',
  creditsHTML:()=> '',
  KN:num=>String(num),
  ago:()=> 'hace un día',
  genericSectionCount:()=> '1 sección',
  homeMetricCategory:()=> 'release',
  homeMetrics:{shown() {},clicked() {}},
  createHeroRotationClock:()=>({show(){},dispose(){}}),
  matchMedia:()=>({matches:false}),
  window:{obiTZ:()=> 'America/Monterrey'},
  document:{body:{contains:()=>true}}
};
const feature={
  id:'novela-ejemplo',
  slug:'novela-ejemplo',
  title:'La bruja del silencio',
  synopsis:'Una aventura de fantasía.',
  cover_path:'portada.jpg'
};
const lastCh={
  [feature.id]:{num:1,publish_at:new Date().toISOString()}
};
const execute='let heroPaused=false,heroClock=null,heroClockEl=null;\n'+fn+
  '\nheroSlide([feature],0,{},lastCh,{}, {}, {});';
sandbox.feature=feature;
sandbox.lastCh=lastCh;
assert.doesNotThrow(
 ()=>runInNewContext(execute,sandbox,{timeout:1500}),
 'heroSlide debe dibujar Inicio con una obra reciente sin ReferenceError');
assert(el.innerHTML.includes('La bruja del silencio'),'Portada del carrusel no renderizada');
assert(el.innerHTML.includes('ob-hero-copy'),'Contenido del carrusel incompleto');
assert(el.innerHTML.includes('新刊'),'Fecha reciente no aplicada al carrusel');
console.log('Inicio: heroSlide con publicación reciente sin errores; listo para aplicar temporada');

// Regresiones sin backend ni servicios de pago para las cinco fases de auditoría.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const { repeatedOpeningHeading, smartTitleBlocks } = await import('../src/reader-headings.js');
const { publicSectionCounts } = await import('../src/public-section-counts.js');
const { createHeroRotationClock } = await import('../src/home-hero-rotation.js');

const chapter = { title:'Capítulo 3: Un triángulo amoroso', section_type:'Capítulo' };
const rawBlocks = [{type:'heading',text:'Capítulo 03 — Un triángulo amoroso'},{type:'paragraph',text:'Hola'}];
const originalBlocks = JSON.stringify(rawBlocks);
assert.equal(repeatedOpeningHeading(rawBlocks,chapter),-1,'Sin casilla, conservar los títulos incluso en importaciones anteriores');
const unchanged = smartTitleBlocks(rawBlocks,chapter);
assert.deepEqual(unchanged,rawBlocks,'Por defecto no se alteran los bloques');
const optedIn = smartTitleBlocks(rawBlocks,chapter,true);
assert.equal(repeatedOpeningHeading(optedIn,chapter),0,'La casilla debe ocultar solo el encabezado repetido');
assert.equal(optedIn[0].smart_title,true,'La marca se conserva con los bloques importados');
assert.equal(optedIn[1].smart_title,undefined,'El contenido del capítulo no se marca');
assert.equal(repeatedOpeningHeading(optedIn,{...chapter,title:'Capítulo 3: Otro título'}),-1,
  'Si el título editorial cambia, no ocultar un heading diferente');
assert.equal(JSON.stringify(rawBlocks),originalBlocks,'No alterar el archivo o los bloques originales');
assert.deepEqual(smartTitleBlocks(optedIn,chapter,false),rawBlocks,'La opción se puede desactivar antes de importar');
assert.equal(repeatedOpeningHeading(smartTitleBlocks([{type:'heading',text:'Introducción nueva'}],chapter,true),chapter),-1);
assert.equal(repeatedOpeningHeading(smartTitleBlocks([{type:'heading',text:'Capítulo 3'}],{title:'Capítulo 3'},true),{title:'Capítulo 3'}),-1);
assert.equal(repeatedOpeningHeading([{type:'heading',text:'Una carta misteriosa'}],chapter),-1);
assert.equal(repeatedOpeningHeading([{type:'paragraph',text:'Un triángulo amoroso'}],chapter),-1);
assert.equal(repeatedOpeningHeading([{type:'heading',text:'Otro título'}],{title:'Prólogo',section_type:'Prólogo'}),-1);
let requested = 0;
const sb = { rpc: async name => { assert.equal(name, 'home_feed'); requested++; return {data:{series:[{id:'obra',chapters:[{count:9}]}]}}; } };
const original = [{id:'obra',chapters:[{count:41}]},{id:'sin-publicar',chapters:[{count:2}]}];
const corrected = await publicSectionCounts(sb,original);
assert.equal(corrected[0].chapters[0].count,9);
assert.equal(corrected[1].chapters[0].count,2);
assert.equal(original[0].chapters[0].count,41,'No se deben mutar los datos de la respuesta de Supabase');
await publicSectionCounts(sb,original);
assert.equal(requested,1,'Las consultas públicas deben compartir un caché corto');
let t=0, next=0, cancels=[];
const clock=createHeroRotationClock({duration:5000,now:()=>t,schedule:(f,ms)=>{next++;return next},cancel:id=>cancels.push(id)});
clock.show({next:()=>{},canRotate:true});
clock.setFocusPaused(true);
assert(cancels.length>0,'El foco de teclado debe detener la rotación');
clock.setFocusPaused(false);
assert.equal(next,2,'Al salir del hero debe reanudarse sin reiniciar la página');
clock.dispose();
const ui=read('src/ui.js'),reader=read('src/reader.js'),team=read('src/teampage.js');
const css=read('src/styles.css'),app=read('src/app.js'),home=read('src/home-vitrina.js');
assert(ui.includes("import { publicSectionCounts }"),'Catálogo y ficha deben reconciliar conteos');
assert(team.includes('publicSectionCounts(sb, rawWorks'),'Los equipos deben usar el conteo público');
const importer=read('src/studio-importer.js');
for (const token of ['id="imp-smart-titles"', 'D.smartTitles = e.target.checked',
  'smartTitleBlocks(cur.blocks', 'const body=smartTitleBlocks(c.blocks','D.smartTitles = false']) {
  assert(importer.includes(token), 'Checkbox inteligente sin integrar: '+token);
}
assert(reader.includes('repeatedOpeningHeading(blocks, ch)'),'Lector sin deduplicación de EPUB');
assert(reader.includes("i === repeated ? '' : block(b, i, p)"),'No modificar bloques guardados al omitir título');
assert(ui.includes("tag === null ? ''"),'La recomendación no puede heredar la insignia del ranking');
assert(ui.includes('El Obi del Lector — Novelas ligeras en español latino'),'Falta H1 fijo');
assert(ui.includes('<h2 data-len='),'El título rotativo no debe ser H1');
assert(home.includes("querySelector('h2')"),'Vitrina debe conservar el título editorial');
assert(ui.includes('.ob-hero .ob-txt h2') && home.includes('.vt-side .ob-txt h2'),'El H2 debe conservar sus estilos en el hero y la vitrina');
assert(app.includes("optimizeAvatar(file)"),'No se optimizan los avatares');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.scripts.build,'node scripts/build.mjs');
assert.ok(pkg.scripts['quality-gates'].split(' && ').length >= 27, 'Conservar las 27 pruebas de calidad originales al añadir regresiones');
assert.ok(pkg.scripts['quality-gates'].includes('node scripts/prelaunch-phase0-check.mjs'), 'Integrar regresiones de seguridad de preestreno');
assert(read('.github/workflows/ci.yml').includes('npm run quality-gates && npm run build'),'Los checks deben estar en GitHub Actions');
console.log('✓ Cinco fases: datos públicos, títulos, QA, Inicio, avatares y accesibilidad');

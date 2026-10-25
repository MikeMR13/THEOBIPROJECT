// Contratos del desplegable compartir: posicionamiento puro + invariantes de integración.
// Sin backend de QA ni red externa; el build ejecuta estos casos siempre.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shareMenuPosition} from '../src/share-placement.js';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const share=src('src/share.js'),css=src('src/styles.css'),ui=src('src/ui.js');

const atBottom=shareMenuPosition(
  {top:520,bottom:564,left:430,right:566},{width:226,height:240},{width:1280,height:620});
assert.equal(atBottom.placement,'above','Debe abrir hacia arriba junto al borde inferior');
assert.ok(atBottom.top>=8 && atBottom.top+240<=520,
  'El desplegable completo debe caber en pantalla de escritorio');

const atTop=shareMenuPosition(
  {top:100,bottom:144,left:180,right:306},{width:236,height:220},{width:1440,height:900});
assert.equal(atTop.placement,'below');
assert.ok(atTop.top>=152 && atTop.top+220<=892);

const mobile=shareMenuPosition(
  {top:542,bottom:590,left:318,right:355},{width:220,height:254},{width:360,height:640});
assert.equal(mobile.placement,'above');
assert.ok(mobile.left+220<=352 && mobile.left>=8,'Nunca se desborda horizontalmente');
assert.ok(mobile.top>=8 && mobile.top+254<=534);

const compact=shareMenuPosition(
  {top:174,bottom:220,left:230,right:310},{width:280,height:400},{width:320,height:410});
assert.equal(compact.placement,'below');
assert.ok(compact.top>=8 && compact.top+compact.maxHeight<=402,
  'En una pantalla pequeña el menú ha de ser desplazable sin salir del viewport');
assert.ok(compact.maxHeight>=0 && compact.maxHeight<400);

// Contrato de integración: el menú debe salir del .ui-sh (overflow:hidden)
// y el botón debe vivir en la misma fila que leer, seguir, anotaciones, etc.
assert.match(ui,/\.ui-sh\{[^}]*overflow:hidden/,'La causa original sigue presente');
assert.match(ui,/class="acts ui-series-actions"/,'La ficha conserva su fila de acciones');
assert.match(share,/p\.startsWith\('\/serie\/'\) \? document\.querySelector\('\.ui-series-page \.ui-series-actions'\)/);
assert.doesNotMatch(share,/\.ui-series-hero > div:last-child/,'No volver a colocar compartir fuera de la fila');
assert.match(share,/document\.body\.append\(panel\)/,'El menú sale del contenedor con overflow hidden');
assert.match(share,/position:fixed;z-index:9000/,'El menú flotante no se oculta tras la portada');
assert.match(share,/panel\.style\.maxHeight=pos\.maxHeight/,'Altura del menú limitada en móviles');
assert.match(share,/window\.addEventListener\('resize',positionFloatingMenu/);
assert.match(share,/document\.addEventListener\('scroll',positionFloatingMenu,true/);
assert.match(share,/e\.key!=='Escape'/,'Escape cierra el menú y devuelve el foco');
assert.match(share,/\.obi-share\[open\]/,'Se cierra al pulsar fuera');
assert.match(share,/floatingPanel\?\.contains\(btn\) \? floatingOwner/,'Copiar funciona aunque el panel esté en body');
assert.match(share,/wa\.me\/\?text=/);
assert.match(share,/t\.me\/share\/url/);
assert.match(share,/navigator\.share/);
assert.match(share,/if \(!navigator\.share\) el\.querySelector/,'No mostrar botón nativo redundante en escritorio');
assert.match(share,/clipboard\.writeText/);
assert.match(share,/if \(!publicPath\(\) \|\| document\.querySelector\('\.tp2-draft'\)\) return/,'No publicar menú en vistas privadas');
assert.match(share,/book\.dataset\.lock === '1'/,'No añadir compartir a volúmenes bloqueados');

console.log('share-menu-layout: fila de acciones, portal fuera de overflow, arriba/abajo, móvil, Escape y privacidad OK');

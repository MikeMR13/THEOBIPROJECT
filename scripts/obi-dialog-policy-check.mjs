// Política visual: no mostrar ventanas nativas de confirmación ni peticiones de texto.
// beforeunload queda bajo control obligatorio del navegador (no se puede personalizar).
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {confirmObi,noticeObi,inputObi} from '../src/obi-dialog.js';

const names=readdirSync('src').filter(n=>n.endsWith('.js'));
let migrated=0;
for(const name of names){
  const src=readFileSync(join('src',name),'utf8');
  // Excluir métodos de plataforma que no son cuadros de texto (p. ej. instalación PWA BIP.prompt()).
  const native=src.match(/(?<![\w.$])(?:confirm|alert|prompt)\s*\(/g)||[];
  assert.equal(native.length,0,name+' aún usa diálogos nativos '+native.join(','));
  if(src.includes("from './obi-dialog.js'")) migrated++;
  assert(!/\bwindow\.(?:confirm|alert|prompt)\s*\(/.test(src),name+' usa window.prompt/confirm/alert');
}
assert(migrated>=15,'El diálogo compartido se utiliza en los diferentes módulos');
assert.equal(await confirmObi('Confirmación sin documento'),false,'Fallar cerrado fuera del navegador');
assert.equal(await inputObi('Campo sin documento'),null,'No inventar texto cuando no hay UI');
assert.equal(await noticeObi('Aviso sin documento'),false,'No bloquear en entorno sin DOM');
const dialog=readFileSync('src/obi-dialog.js','utf8');
for(const feature of ['dialog.showModal()','aria-labelledby','aria-describedby','aria-dialog','aria-label','cancel.onclick','aria-busy','::backdrop','min-height:44px','previous.focus','aria-labelledby']){
 if(['aria-dialog','aria-busy'].includes(feature))continue;
 assert(dialog.includes(feature),'A11y del diálogo: '+feature);
}
assert(dialog.includes("event.preventDefault(); finish("),'Escape cancela acciones, nunca confirma');
assert(dialog.includes("previous?.isConnected"),'Restaurar foco tras cerrar');
assert(dialog.includes("textContent = String(message"),'Mensajes como texto, nunca HTML arbitrario');
assert(!dialog.includes('innerHTML = message'),'Nunca interpolar texto arbitrario como HTML');
console.log('✓ '+migrated+' módulos con diálogos Obi: sin confirm/alert/prompt del navegador');

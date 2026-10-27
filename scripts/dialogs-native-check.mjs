// Regresión: ninguna acción de la plataforma puede abrir cuadros nativos de confirmación.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
const dirs = readdirSync(new URL('../src/',import.meta.url)).filter(x=>x.endsWith('.js'));
let migrated = 0;
for (const name of dirs) {
 const file = new URL('../src/'+name,import.meta.url);
 const code = readFileSync(file,'utf8');
 // Evitar falsos positivos de métodos externos, como el prompt obligatorio de instalación PWA.
 const banned = /(?<![\w.])(?:confirm|alert|prompt)\s*\(|\bwindow\.(?:confirm|alert|prompt)\s*\(/g;
 const hits = [...code.matchAll(banned)];
 assert.equal(hits.length,0,'Diálogo nativo encontrado en '+name+': '+hits.map(x=>x[0]).join(', '));
 if(code.includes("from './dialogs.js'")) migrated++;
}
assert(migrated>=15,'Las pantallas principales deben importar diálogos integrados: '+migrated);
const dialogs=readFileSync(new URL('../src/dialogs.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
for(const text of ["export const confirmInApp","export const promptInApp","export const alertInApp",
 "node.addEventListener('cancel'","document.body.append(node)","node.showModal()","node.remove()","field?.select()","tail.then(operation"]) {
 assert(dialogs.includes(text),'Diálogos de El Obi incompletos: '+text);
}
assert(!/\bwindow\.(?:confirm|alert|prompt)\s*\(/.test(dialogs),'El diálogo unificado no delega en ventanas nativas');
for(const css of ['.obi-dialog::backdrop','.obi-dialog-actions','.obi-dialog-message','@media(max-width:480px)']) {
 assert(styles.includes(css),'Falta estilo adaptable del diálogo: '+css);
}
const profile=readFileSync(new URL('../src/profile.js',import.meta.url),'utf8');
assert(profile.includes('void canLeave().then(ok => { if (ok) C.go(href); });'),'El enlace de Preferencias navega después de aceptar');
assert(profile.includes('e.stopImmediatePropagation()'),'Se bloquea el enlace antes de abrir diálogo asíncrono');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
assert(app.includes('const toggleWholeWork=async(id,mark)=>{'),'Acciones masivas de la biblioteca esperan la confirmación');
assert(app.includes('if(!await confirmInApp(question))return;'),'La biblioteca no guarda antes de confirmar');
console.log('✓ '+dirs.length+' módulos auditados, '+migrated+' migrados y sin ventanas nativas de confirmación');

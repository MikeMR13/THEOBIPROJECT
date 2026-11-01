// QA sin backend: un solo índice offline y accesos visibles a Mis descargas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_TABS} from '../src/mobile-navigation.js';
import {readOfflineIndex} from '../src/offline-downloads.js';

const read = f => readFileSync(f,'utf8');
const app=read('src/app.js'), reader=read('src/reader.js');
const downloads=read('src/offline-downloads.js'),css=read('src/styles.css');
assert.match(app,/app\.classList\.add\('obi-downloads-page'\)/,'La ruta de descargas debe proteger contenido sobre el patrón');
assert.match(app,/app\.classList\.remove\('obi-downloads-page'\)/,'Al salir de descargas se debe quitar fondo aislado');
assert.match(reader,/class="off-empty"/,'El estado sin descargas debe utilizar clase legible');
assert.match(css,/#app\.obi-downloads-page\{background:var\(--ink\)/,'El fondo de descargas debe ser opaco');
assert.match(css,/\.off-empty\{[^\n]*white-space:normal;overflow-wrap:anywhere/,'El mensaje vacío debe poder saltar de línea');
assert.match(css,/\.off-it \.btn\{[^\n]*min-height:44px/,'Leer y Borrar deben tener objetivo táctil de 44px');

assert(EXTRA_TABS.some(([path,label])=>path==='/descargas'&&label==='Mis descargas'),'Falta acceso móvil en Más');
assert.match(app,/<a href="\/descargas">Mis descargas<\/a>/,'Falta el acceso en el menú de cuenta');
assert.match(app,/\['offline','Mis descargas'\]/,'La pestaña de Mi biblioteca debe llamarse Mis descargas');
assert.match(app,/class="lb-download-shortcut" href="\/descargas"/,'Falta la tarjeta destacada en Mi biblioteca');
assert.match(app,/id="lb-download-count"/,'Falta resumen de descargas guardadas en este dispositivo');
assert.match(app,/<h1>Mis descargas<\/h1>/,'La ruta de descargas necesita un título constante');
assert.match(app,/p === '\/descargas' \|\| \(!navigator.onLine/,'La ruta debe funcionar sin sesión y sin red');
assert.match(app,/\['avisos','Avisos'\],\['offline','Mis descargas'\]/,'Conservar compatibilidad de ?t=offline');
assert.match(app,/href="\/descargas">Mis descargas<\/a>/,'El aviso sin internet debe enlazar a las descargas');
assert.match(downloads,/obi-offline-manage-link[^\n]*href="\/descargas">Ver mis descargas/,'Falta enlace tras guardar');
assert.match(downloads,/Administra tus lecturas en Mis descargas/,'Actualizar texto de ayuda');
assert.match(css,/\.obi-offline-manage-link/,'Falta estilo para enlace postdescarga');
assert.match(reader,/Ver mis descargas/,'Conservar enlace a las descargas desde el lector');
assert.match(reader,/obi-offline-v1/,'El lector no debe cambiar de caché');
assert.match(downloads,/obi-offline-v1/,'El gestor debe mantener el caché compartido');
assert.match(downloads,/obi-offline-index/,'El gestor debe mantener el índice compartido');
const storage=new Map([['obi-offline-index',JSON.stringify({
 's1:1':{slug:'ejemplo',kind:'volume',nums:[1,2]},
 's1:ch:3':{slug:'ejemplo',kind:'chapter',nums:[3]}
})]]);
const store={getItem:k=>storage.get(k)||null};
assert.equal(Object.keys(readOfflineIndex(store)).length,2,'El contador debe reflejar entradas del dispositivo');
assert.deepEqual(readOfflineIndex({getItem:()=>'{malformado'}),{},'Índice corrupto no debe impedir ver descargas');
console.log('QA Mis descargas: Biblioteca, menú, móvil, ruta offline, enlace de guardado e índice compartido OK');

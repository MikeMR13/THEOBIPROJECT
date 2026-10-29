// Contrato: la cinta antigua no vuelve, pero no se pierden lanzamientos,
// editorial, lector y temporada. Sin red ni credenciales.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync('src/ui.js','utf8');
const app=readFileSync('src/app.js','utf8');
const index=readFileSync('src/index.html','utf8');
for(const old of ['ob-tick','ob-track','obTicker','tickerNotice']){
 assert(!ui.includes(old),'La cinta redundante sigue en src/ui.js: '+old);
}
for(const required of [
 'id="hero"', 'id="ob-fest-slot"', 'id="ob-release-car"',
 'id="ob-open-today"', 'id="ob-team-recs"',
 'Todos los lanzamientos', 'Nuevos volúmenes y capítulos',
 'const currentNotice', 'const heroTag', 'enhanceHomeVitrina'
])assert(ui.includes(required),'Se perdió contenido del Inicio: '+required);
assert(app.includes('/ui.js?v=56'),'El módulo UI no fue actualizado');
assert(index.includes('app.js?v=34')&&index.includes('ui.js?v=56'),'Versiones sin actualizar');
const m=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
assert(m,'No se encuentra CSS2');
const css=JSON.parse(m[1]);
assert(!/ob-tick|ob-track|obTicker/.test(css),'Estilos de cinta siguen activos');
assert(css.includes('.ob-hero{margin-left:calc(50% - 50vw)!important'),
 'El ancho completo del carrusel se alteró al retirar la cinta');
console.log('✓ Cinta eliminada; Vitrina, lanzamientos, editorial y temporada intactos');

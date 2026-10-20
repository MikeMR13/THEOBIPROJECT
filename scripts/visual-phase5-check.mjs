// Contratos de accesibilidad de la fase visual 5 (cero datos externos).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('src/index.html','utf8');
const a11y = readFileSync('src/reader-a11y.css','utf8');
const base = readFileSync('src/styles.css','utf8');
const reader = readFileSync('src/reader.js','utf8');
const ui = readFileSync('src/ui.js','utf8');
const contains = (source, str, why) => assert(source.includes(str), 'Regresión: '+why);

contains(html,'<a class="ob-skip" href="#app">Saltar al contenido principal</a>','acceso directo al contenido');
contains(html,'<main id="app" tabindex="-1" aria-live="polite"></main>','destino accesible del enlace');
contains(html,'href="/reader-a11y.css?v=1"','carga de estilos de accesibilidad');
contains(a11y,'.ob-skip:focus-visible','enlace visible al usar teclado');
contains(a11y,'.rd :is(a,button,input,select,textarea,summary,[role="button"]):focus-visible','foco accesible del lector');
contains(a11y,'.rd-body img,.rd-body figure img','ilustraciones adaptativas');
contains(a11y,'.rd-more>summary','menú de lectura en teléfono');
contains(a11y,'@media(prefers-reduced-motion:reduce)','respeto a la preferencia del usuario');
contains(a11y,'.ob-track{animation:none!important','cinta quieta solo con reducción solicitada');
contains(a11y,'.ob-page,.ob-seal,.ob-anim>*','señales para desactivar movimiento en modo accesible');
contains(a11y,'.ob-car,.ui-fich,.rd,.rd-ch{scroll-behavior:auto!important}','desplazamiento accesible');
assert(!a11y.includes('display:none!important'),'No eliminar secciones mediante CSS');
assert(!a11y.includes('visibility:hidden'),'No ocultar funciones existentes');
contains(base,'.rd-body','estilo original de lectura preservado');
contains(base,'.rd-team img{display:block;max-width:min(220px,60vw);max-height:64px','logotipo del equipo mantiene dimensiones previas');
contains(reader,'function chapterHTML(ch, blocks, p)','montaje original del capítulo');
contains(reader,'function saveProgress()','persistencia original de lectura');
contains(reader,'function progress()','progreso original del capítulo');
contains(ui,'heroSlide(feat','carrusel principal');
contains(ui,'@keyframes obTicker','cinta deslizante');
contains(ui,"fill('ob-s-ann'",'anuncios de equipos');
console.log('Fase visual 5: foco, accesibilidad, lectura y animaciones existentes protegidos.');

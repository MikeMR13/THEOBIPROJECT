// Fase 4: contratos de red y apariencia de la vitrina en primer fotograma.
// Sin imágenes remotas, Supabase ni redes de pago.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialVitrinaCover } from '../src/home-vitrina.js';

assert.equal(initialVitrinaCover(0,0,8),true,'La portada activa debe cargarse');
assert.equal(initialVitrinaCover(1,0,8),true,'La portada siguiente debe anticiparse');
assert.equal(initialVitrinaCover(7,0,8),true,'La portada anterior circula desde el final');
assert.equal(initialVitrinaCover(2,0,8),false,'La portada distante no debe solicitarse al abrir');
assert.equal(initialVitrinaCover(4,0,8),false,'El extremo opuesto debe permanecer diferido');
assert.equal(initialVitrinaCover(7,3,8),false,'Una portada lejana no debe solicitarse al abrir');
assert.equal(initialVitrinaCover(4,3,8),true,'La vecina siguiente debe anticiparse');
assert.equal(initialVitrinaCover(2,3,8),true,'La vecina anterior debe anticiparse');
for(const i of [0,1,2]) assert(initialVitrinaCover(i,1,3),
  'Con tres obras no se deben diferir las portadas editoriales visibles');

const source=readFileSync('src/home-vitrina.js','utf8');
assert(source.includes('const coverUrl=esc(isActive?x.cover:x.preview||x.cover)'),
  'La protagonista debe conservar la imagen original; vecinos utilizan miniatura correspondiente');
assert(source.includes('initialVitrinaCover(i,active,data.length)'),
  'La decisión de carga respeta la diapositiva editorial activa');
assert(source.includes('data-src="${coverUrl}"'),
  'Las ilustraciones lejanas no deben provocar solicitudes iniciales');
assert(source.includes('src="${coverUrl}"'),
  'La portada activa debe tener src real sin depender del observador');
assert(source.includes('width="264" height="396"'),
  'Reservar geometría de ilustración para evitar variaciones de diseño');
assert(source.includes("loading=\"${i===active?'eager':'lazy'}\"") &&
  source.includes("fetchpriority=\"${i===active?'high':'low'}\""),
  'La protagonista debe ser eager/high y las demás lazy/low');
assert(source.includes("new IntersectionObserver(entries=>") &&
  source.includes("{root:track,rootMargin:'360px 360px'}"),
  'Cargar portadas al entrar en el área próxima a la vitrina');
assert(source.includes('deferredCovers.forEach(hydrateCover)'),
  'Sin IntersectionObserver deben mostrarse todas las portadas');
assert(source.includes('coverObserver?.disconnect()'),
  'No dejar observadores activos al reemplazar el carrusel');
const existing=readFileSync('scripts/home-vitrina-v2-check.mjs','utf8');
assert(existing.includes("books[1].querySelector('img')?.src.includes('volume.svg')"),
  'Conservar la prueba de volumen activo y controles de la vitrina');
const ci=readFileSync('.github/workflows/ci.yml','utf8');
assert(ci.includes('node scripts/performance-phase4-vitrina-cover-check.mjs'),
  'La prueba de carga de portadas debe estar en CI');
console.log('✓ Fase 4: protagonista original de alta prioridad, vecinos WebP, portadas lejanas diferidas y observador liberado');

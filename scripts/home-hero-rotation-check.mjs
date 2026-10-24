import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHeroRotationClock } from '../src/home-hero-rotation.js';

let now = 0, nextId = 0, advances = 0;
const timers = new Map(), states = [];
const clock = createHeroRotationClock({
  now: () => now,
  schedule(fn, ms) { const id = ++nextId; timers.set(id, { at: now + ms, fn }); return id; },
  cancel(id) { timers.delete(id); }
});
const tick = ms => {
  const until = now + ms;
  while (true) {
    const due = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break;
    now = due[1].at; timers.delete(due[0]); due[1].fn();
  }
  now = until;
};
const show = (paused = false, canRotate = true, hovered = false) => clock.show({
  next: () => { advances++; show(); }, canRotate,
  isPaused: paused,
  // Simula el estado anterior: incluso si el puntero está encima, no debe pausar.
  isHovered: hovered,
  stateChanged: blocked => states.push(blocked)
});

show(false, true, true); // Cursor encima antes del primer ciclo.
tick(4999);
assert.equal(advances, 0, 'No cambiar antes de los cinco segundos');
tick(1);
assert.equal(advances, 1, 'El carrusel debe avanzar a los 5 s incluso con cursor encima');
tick(10000);
assert.equal(advances, 3, 'Debe continuar avanzando automáticamente sin interacción');
show(false, true, false); // Quitar el cursor no cambia las condiciones del reloj.
tick(5000);
assert.equal(advances, 4, 'Sin mouse también debe avanzar cada cinco segundos');
assert.equal(timers.size, 1, 'Solo debe haber un temporizador activo a la vez');

show(true);
assert.equal(timers.size, 0, 'Pausar manualmente debe cancelar el temporizador');
tick(20000);
assert.equal(advances, 4, 'La pausa manual debe detener el carrusel');
show(false);
tick(4999);
assert.equal(advances, 4, 'Reanudar debe respetar el ciclo completo');
tick(1);
assert.equal(advances, 5, 'El botón Reanudar debe restablecer el avance automático');

show(false, false); // Modo de movimiento reducido o una sola obra.
tick(15000);
assert.equal(advances, 5, 'Movimiento reducido o una sola obra no deben forzar rotación');
assert(states.includes(true) && states.includes(false), 'El progreso debe distinguir pausa y reproducción');
clock.dispose();
assert.equal(timers.size, 0, 'Salir de Inicio debe limpiar el temporizador');

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../src/home-hero-rotation.js', import.meta.url), 'utf8');
assert(moduleSource.includes('duration = 5000'), 'El reloj debe usar 5 s de forma predeterminada');
assert(ui.includes('animation:obHp 5s linear forwards'), 'La barra de progreso debe durar exactamente 5 s');
assert(!ui.includes('animation:obHp 8s') && !moduleSource.includes('duration = 8000'), 'No debe quedar la rotación anterior de 8 s');
assert(ui.includes('createHeroRotationClock('), 'Inicio debe usar el reloj probado');
assert(ui.includes('refreshHeroKeepingActive('), 'Las consultas tardías deben conservar la portada activa');
assert(ui.includes('heroClock?.dispose()'), 'Salir de Inicio debe limpiar el reloj');
assert(!ui.includes("el.addEventListener('mouseenter'") && !ui.includes("el.addEventListener('mouseleave'"),
  'El cursor no puede registrar eventos que detengan la rotación');
assert(!ui.includes('isHovered:') && !moduleSource.includes('hovered'),
  'El reloj no puede depender del estado del cursor');
assert(ui.includes('isPaused: heroPaused') && ui.includes('canRotate: feat.length > 1'),
  'Mantener pausa manual, varias diapositivas y accesibilidad');
console.log('✓ Carrusel: autoplay cada 5 s con/sin mouse, barra sincronizada, pausa manual y movimiento reducido.');

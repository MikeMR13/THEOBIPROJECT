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
const show = (hovered = false, paused = false) => clock.show({
  next: () => { advances++; show(); }, canRotate: true, isHovered: hovered,
  isPaused: paused, stateChanged: blocked => states.push(blocked)
});
show();
tick(3000);
clock.hover(true);
tick(16000);
assert.equal(advances, 0, 'El cursor sobre el carrusel no debe repetir la diapositiva');
assert.equal(timers.size, 0, 'El temporizador debe detenerse realmente al pasar el cursor');
clock.hover(false);
tick(4999);
assert.equal(advances, 0, 'Al salir se debe conservar el tiempo restante');
tick(1);
assert.equal(advances, 1, 'La diapositiva siguiente debe aparecer al terminar el tiempo restante');
tick(8000);
assert.equal(advances, 2, 'La rotación automática debe continuar');
show(false, true);
tick(16000);
assert.equal(advances, 2, 'El botón de pausa debe detener la rotación');
show();
tick(8000);
assert.equal(advances, 3, 'Reanudar debe iniciar un nuevo ciclo');
assert(states.includes(true) && states.includes(false), 'El indicador debe reflejar las pausas');
clock.dispose();
assert.equal(timers.size, 0, 'Salir de Inicio debe cancelar el temporizador');

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
assert(ui.includes("createHeroRotationClock("), 'Inicio debe usar el reloj probado');
assert(ui.includes('refreshHeroKeepingActive('), 'Las respuestas tardías deben conservar la portada activa');
assert(ui.includes("heroClock?.dispose()"), 'Salir o reiniciar Inicio debe limpiar el reloj');
assert(ui.includes("el.addEventListener('mouseenter'"), 'Hover debe suspender el reloj');
assert(ui.includes("el.addEventListener('mouseleave'"), 'Salir del hover debe reanudarlo');
assert(!ui.includes("el.matches(':hover') ? i : (i + 1)"), 'Prohibido repintar la misma diapositiva cada 8 segundos');
console.log('✓ Carrusel: pausa real en hover, tiempo restante, rotación y actualización asíncrona sin reinicio.');

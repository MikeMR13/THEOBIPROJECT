// Reloj independiente del DOM: detener el carrusel no vuelve a dibujar la diapositiva.
export function createHeroRotationClock({
  duration = 8000,
  now = () => performance.now(),
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = id => clearTimeout(id)
} = {}) {
  let timer = null, startedAt = 0, remaining = duration;
  let enabled = false, paused = false, hovered = false;
  let advance = () => {}, onState = () => {};
  const blocked = () => !enabled || paused || hovered;
  const stop = () => {
    if (timer === null) return;
    remaining = Math.max(0, remaining - Math.max(0, now() - startedAt));
    cancel(timer);
    timer = null;
  };
  const run = () => {
    if (!blocked() && timer === null) {
      startedAt = now();
      timer = schedule(() => {
        timer = null;
        remaining = duration;
        if (!blocked()) advance();
      }, Math.max(1, remaining));
    }
    onState(blocked());
  };
  return {
    show({ next, canRotate, isPaused = false, isHovered = false, stateChanged = () => {} }) {
      stop();
      remaining = duration;
      enabled = Boolean(canRotate);
      paused = Boolean(isPaused);
      hovered = Boolean(isHovered);
      advance = next;
      onState = stateChanged;
      run();
    },
    hover(value) {
      if (hovered === Boolean(value)) return;
      stop(); hovered = Boolean(value); run();
    },
    dispose() {
      stop(); enabled = false;
      advance = () => {}; onState = () => {};
    }
  };
}

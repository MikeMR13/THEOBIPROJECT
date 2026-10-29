// Temporizador del carrusel independiente del DOM: el cursor no detiene la rotación.
// Solo la pausa manual o la desactivación por accesibilidad suspenden el avance.
export function createHeroRotationClock({
  duration = 5000,
  now = () => performance.now(),
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = id => clearTimeout(id)
} = {}) {
  let timer = null, startedAt = 0, remaining = duration;
  let enabled = false, paused = false, focusPaused = false;
  let advance = () => {}, onState = () => {};
  const blocked = () => !enabled || paused || focusPaused;
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
    setFocusPaused(value) { focusPaused = Boolean(value); if (focusPaused) { stop(); onState(blocked()); } else run(); },
    show({ next, canRotate, isPaused = false, stateChanged = () => {} }) {
      stop();
      remaining = duration;
      enabled = Boolean(canRotate);
      paused = Boolean(isPaused);
      advance = next;
      onState = stateChanged;
      run();
    },
    dispose() {
      stop(); enabled = false;
      advance = () => {}; onState = () => {};
    }
  };
}

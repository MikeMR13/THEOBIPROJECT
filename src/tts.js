// Lectura en voz alta con las voces del dispositivo. Complemento autónomo de reader.js.
// Se activa solo dentro del lector y no consulta servidores ni altera el texto guardado.
(() => {
  'use strict';
  if (window.__obiTTSLoaded) return;
  const speech = window.speechSynthesis;
  if (!speech || typeof window.SpeechSynthesisUtterance !== 'function') return;
  window.__obiTTSLoaded = true;

  const KEY = 'obi-tts';
  const speeds = [0.8, 1, 1.2, 1.5, 1.8, 2];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* Preferencias inválidas o acceso denegado. */ }
  const state = {
    rate: speeds.includes(saved.rate) ? saved.rate : 1,
    voice: typeof saved.voice === 'string' ? saved.voice : ''
  };
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  let voices = [], segments = [], index = 0, playing = false;
  let current = null, generation = 0, panel = null, reader = null;
  let turnTimer = 0, turnDeadline = 0, pendingPath = '';
  const CURSOR_KEY = 'obi-tts-cursor-v1';
  // La barra abierta inhibe el paginado visual para que no interrumpa la narración.
  window.__obiTTS = { isActive: () => !!pendingPath || !!(panel && !panel.hidden) };
  const announce = () => window.dispatchEvent(new Event('obi-tts-state'));

  const style = document.createElement('style');
  style.id = 'obi-tts-style';
  style.textContent = `
    .tts-bar{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom,0px));
      transform:translateX(-50%);z-index:60;display:flex;align-items:center;justify-content:center;
      flex-wrap:wrap;gap:6px;padding:9px;max-width:min(650px,calc(100vw - 20px));
      max-height:45dvh;overflow:auto;border:1px solid #615643;border-radius:14px;
      background:#1b1916;color:#f3ede2;box-shadow:0 8px 30px rgba(0,0,0,.4);
      font:14px/1.2 'IBM Plex Sans',system-ui,sans-serif}
    .tts-bar[hidden]{display:none!important}
    .tts-bar button,.tts-bar select{box-sizing:border-box;min-height:44px;min-width:44px;
      padding:0 11px;border:1px solid #675e51;border-radius:9px;
      background:#2b2823;color:inherit;font:inherit;cursor:pointer}
    .tts-bar button:hover{background:#403a30}
    .tts-bar button:focus-visible,.tts-bar select:focus-visible,
    .rd [data-tts]:focus-visible{outline:3px solid #f2c230;outline-offset:2px}
    .tts-bar .tts-main{background:#f2c230;color:#1b1916;font-weight:700}
    .tts-bar select{max-width:min(175px,48vw)}
    .tts-bar .tts-status{width:100%;text-align:center;font-size:12px;color:#e9d9b3}
    .tts-on{background:rgba(201,162,39,.2);border-radius:4px;
      box-shadow:0 0 0 4px rgba(201,162,39,.2)}
    @media(prefers-reduced-motion:reduce){.tts-on{scroll-behavior:auto}}
  `;
  document.head.append(style);

  function voicesChanged() {
    const list = typeof speech.getVoices === 'function' ? speech.getVoices() : [];
    const priority = voice => (/^es[-_](MX|419|US)$/i.test(voice.lang) ? 0 : 1) + (voice.localService ? 0 : 0.5);
    voices = list.filter(v => /^es(?:[-_]|$)/i.test(v.lang)).sort((a, b) => priority(a) - priority(b));
    if (panel) fillVoices();
  }
  function preferredVoice() { return voices.find(v => v.voiceURI === state.voice) || voices[0] || null; }
  voicesChanged();
  speech.addEventListener?.('voiceschanged', voicesChanged);

  // Dividir incluso un párrafo sin puntuación ni espacios en bloques <= 200 caracteres.
  function splitText(value) {
    const result = [];
    let text = value.replace(/\s+/g, ' ').trim();
    while (text.length) {
      if (text.length <= 200) { result.push(text); break; }
      let cut = text.lastIndexOf(' ', 200);
      if (cut < 80) cut = 200;
      result.push(text.slice(0, cut).trim());
      text = text.slice(cut).trimStart();
    }
    return result;
  }
  function collect() {
    const result = [];
    const root = reader?.querySelector('#rd-flow');
    if (!root) return result;
    root.querySelectorAll('.rd-ch').forEach(ch => {
      const title = ch.querySelector('.rd-head h2');
      const body = ch.querySelector('.rd-body');
      const nodes = [...(title ? [title] : []), ...(body ? body.querySelectorAll(':scope > p, :scope > h3, :scope > blockquote, :scope > aside.tn') : [])];
      nodes.forEach(el => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('sup,rt,rp,.fn,script,style,[aria-hidden="true"]').forEach(n => n.remove());
        const text = clone.textContent.trim();
        if (!text || /^[\s*·•◇◆~—–\-=#]+$/.test(text)) return;
        splitText(text).forEach((part, partIndex) => result.push({ el, text: part, partIndex, block: el.getAttribute('data-b') || 'header' }));
      });
    });
    return result;
  }
  function visibleIndex() {
    const at = segments.findIndex(s => s.el.getBoundingClientRect().bottom > 80);
    return at >= 0 ? at : 0;
  }
  function highlight(el) {
    reader?.querySelectorAll('.tts-on').forEach(n => n.classList.remove('tts-on'));
    if (!el || !el.isConnected) return;
    el.classList.add('tts-on');
    const r = el.getBoundingClientRect();
    if (r.top < 72 || r.top > innerHeight - 120) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + r.top - innerHeight * 0.3, behavior: reduced ? 'instant' : 'smooth' });
    }
  }
  function setStatus(message = '') {
    if (!panel) return;
    panel.querySelector('[data-t="toggle"]').textContent = playing ? 'Pausar' : 'Reanudar';
    panel.querySelector('[data-t="rate"]').textContent = state.rate + '×';
    panel.querySelector('.tts-status').textContent = message || (playing ? 'Leyendo en voz alta' : 'Lectura pausada');
    reader?.querySelectorAll('[data-tts]').forEach(b => b.setAttribute('aria-pressed', String(playing)));
  }
  function updateMediaSession() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    try {
      if (typeof MediaMetadata === 'function') ms.metadata = new MediaMetadata({
        title: current?.el.closest('.rd-ch')?.querySelector('.rd-head h2')?.textContent || 'Capítulo',
        artist: reader?.querySelector('.rd-back')?.textContent?.replace('‹', '').trim() || 'El Obi del Lector'
      });
      ms.playbackState = playing ? 'playing' : 'paused';
      ms.setActionHandler('play', () => resume());
      ms.setActionHandler('pause', pause);
      ms.setActionHandler('previoustrack', () => skip(-1));
      ms.setActionHandler('nexttrack', () => skip(1));
    } catch { /* Media Session es opcional, según navegador. */ }
  }
  function clearMediaSession() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    try {
      ms.playbackState = 'none';
      for (const name of ['play', 'pause', 'previoustrack', 'nexttrack']) ms.setActionHandler(name, null);
      ms.metadata = null;
    } catch {}
  }
  // Guardar una referencia por usuario y obra, al inicio de cada fragmento.
  // Así la pestaña puede morir sin esperar a un evento de cierre fiable.
  function infoFor(entry = current) {
    return entry ? window.__obiReaderTTS?.info?.(entry.el.closest('.rd-ch')?.dataset.ch) : null;
  }
  function bookmarkKey(info) { return `${CURSOR_KEY}:${info.user}:${info.slug}`; }
  function saveCursor(entry = current) {
    const info = infoFor(entry);
    if (!info || !entry) return;
    try { localStorage.setItem(bookmarkKey(info), JSON.stringify({
      chapterId: String(info.id), block: entry.block, partIndex: entry.partIndex,
      text: entry.text, at: Date.now()
    })); } catch {}
  }
  function forgetCursor(entry = current) {
    const info = infoFor(entry);
    if (!info) return;
    try { localStorage.removeItem(bookmarkKey(info)); } catch {}
  }
  function savedIndex() {
    if (!segments.length) return -1;
    const info = infoFor(segments[0]);
    if (!info) return -1;
    try {
      const b = JSON.parse(localStorage.getItem(bookmarkKey(info)) || 'null');
      if (!b || Date.now() - b.at > 30 * 86400000) return -1;
      return segments.findIndex(s =>
        String(s.el.closest('.rd-ch')?.dataset.ch) === String(b.chapterId) &&
        s.block === b.block && s.partIndex === b.partIndex && s.text === b.text);
    } catch { return -1; }
  }
  function clearTurn() { clearTimeout(turnTimer); turnTimer = 0; turnDeadline = 0; }
  function finishedChapter() {
    const info = infoFor();
    if (!info?.next || (!info.canContinue && !info.autonext)) return stop(true);
    const changeChapter = () => {
      clearTurn();
      if (!playing || !reader?.isConnected) return;
      pendingPath = `/leer/${info.slug}/${info.next.num}`;
      try {
        if (!window.__obiReaderTTS?.nextChapter?.(info.id, info.next.num)) {
          pendingPath = ''; stop();
        }
      } catch { pendingPath = ''; stop(); }
    };
    if (info.canContinue) { changeChapter(); return; }
    turnDeadline = Date.now() + info.seconds * 1000;
    const tick = () => {
      if (!playing || !reader?.isConnected) { clearTurn(); return; }
      const left = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      if (!left) { changeChapter(); return; }
      setStatus(`Siguiente capítulo en ${left} s`);
      turnTimer = setTimeout(tick, Math.min(1000, Math.max(10, turnDeadline - Date.now())));
    };
    tick();
  }
  function cancelSpeech() {
    generation++;
    try { speech.cancel(); } catch {}
  }
  function pause() {
    if (!turnTimer) saveCursor();
    clearTurn();
    playing = false;
    cancelSpeech();
    setStatus();
    updateMediaSession();
  }
  function stop(completed = false) {
    if (completed) forgetCursor();
    else if (!turnTimer) saveCursor();
    clearTurn();
    pendingPath = '';
    playing = false;
    cancelSpeech();
    current = null; index = 0; segments = [];
    highlight(null);
    clearMediaSession();
    const wasOpen = panel && !panel.hidden;
    if (panel) panel.hidden = true;
    setStatus();
    if (wasOpen) announce();
  }
  function next() {
    // Reconstruir al finalizar la última parte: lectura continua puede haber añadido capítulos.
    if (index + 1 < segments.length && segments[index + 1].el.isConnected) return ++index;
    const old = current;
    segments = collect();
    if (!segments.length) return -1;
    const at = segments.findIndex(s => s.el === old?.el && s.partIndex === old?.partIndex);
    index = at < 0 ? visibleIndex() : at + 1;
    return index < segments.length ? index : -1;
  }
  function speak(restart = false) {
    if (!playing || !reader?.isConnected) return stop();
    const entry = segments[index];
    if (!entry) return stop();
    if (restart) cancelSpeech();
    const id = ++generation;
    current = entry;
    saveCursor(entry);
    highlight(entry.el);
    setStatus();
    updateMediaSession();
    const utterance = new SpeechSynthesisUtterance(entry.text);
    const voice = preferredVoice();
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    else utterance.lang = 'es-MX';
    utterance.rate = state.rate;
    utterance.onend = () => {
      if (generation !== id || !playing) return;
      if (next() < 0) finishedChapter(); else speak();
    };
    utterance.onerror = e => {
      if (generation !== id || !playing) return;
      playing = false; cancelSpeech();
      setStatus('No se pudo reproducir esta voz. Prueba otra voz o navegador.');
      clearMediaSession();
    };
    try { speech.speak(utterance); }
    catch { playing = false; cancelSpeech(); setStatus('La voz no está disponible en este navegador.'); clearMediaSession(); }
  }
  function start(fromVisible = true, useBookmark = false) {
    clearTurn();
    segments = collect();
    if (!segments.length) { playing = false; setStatus('No hay texto disponible para leer.'); return; }
    const previous = useBookmark ? savedIndex() : -1;
    if (previous >= 0) index = previous;
    else if (fromVisible || index >= segments.length) index = visibleIndex();
    playing = true;
    speak(true);
    if (previous >= 0) setStatus('Retomando donde dejaste la voz');
  }
  function resume() {
    if (!reader?.isConnected || !panel || panel.hidden) return;
    clearTurn();
    // El DOM pudo cambiar mientras estaba en pausa (navegación/lectura continua).
    const old = segments[index];
    segments = collect();
    const at = segments.findIndex(s => s.el === old?.el && s.partIndex === old?.partIndex);
    if (at >= 0) index = at;
    else index = visibleIndex();
    if (!segments.length) { setStatus('No hay texto disponible para leer.'); return; }
    playing = true;
    speak(true);
  }
  function skip(amount) {
    if (!reader?.isConnected || !panel || panel.hidden) return;
    const old = segments[index];
    segments = collect();
    if (!segments.length) return stop();
    const at = segments.findIndex(s => s.el === old?.el && s.partIndex === old?.partIndex);
    index = Math.max(0, Math.min(segments.length - 1, (at >= 0 ? at : visibleIndex()) + amount));
    if (playing) { clearTurn(); speak(true); }
    else { highlight(segments[index].el); saveCursor(segments[index]); setStatus(); }
  }
  function fillVoices() {
    const sel = panel?.querySelector('select');
    if (!sel) return;
    sel.replaceChildren();
    if (!voices.length) sel.add(new Option('Voz del sistema', ''));
    else voices.forEach(v => sel.add(new Option(`${v.name.replace(/\s*\(.*\)/, '')} · ${v.lang}`, v.voiceURI)));
    sel.value = preferredVoice()?.voiceURI || '';
  }
  function show() {
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'tts-bar';
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', 'Lectura en voz alta');
      panel.innerHTML = `<button type="button" data-t="prev" aria-label="Fragmento anterior">‹‹</button>
        <button type="button" class="tts-main" data-t="toggle">Pausar</button>
        <button type="button" data-t="next" aria-label="Fragmento siguiente">››</button>
        <button type="button" data-t="rate" aria-label="Cambiar velocidad">${state.rate}×</button>
        <select aria-label="Elegir voz en español"></select>
        <button type="button" data-t="here">Desde aquí</button>
        <button type="button" data-t="close" aria-label="Cerrar lectura en voz alta">✕</button>
        <div class="tts-status" role="status" aria-live="polite"></div>`;
      document.body.append(panel);
      fillVoices();
      panel.addEventListener('click', e => {
        const action = e.target.closest('button')?.dataset.t;
        if (!action) return;
        if (action === 'toggle') playing ? pause() : resume();
        else if (action === 'prev') skip(-1);
        else if (action === 'next') skip(1);
        else if (action === 'here') start();
        else if (action === 'close') stop();
        else if (action === 'rate') {
          state.rate = speeds[(speeds.indexOf(state.rate) + 1) % speeds.length];
          persist(); setStatus(); if (playing) speak(true);
        }
      });
      panel.querySelector('select').addEventListener('change', e => {
        state.voice = e.target.value; persist(); if (playing) speak(true);
      });
    }
    panel.hidden = false;
    announce();
    start(true, true);
  }
  function addButton(container) {
    if (!container || container.querySelector('[data-tts]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ghost';
    button.dataset.tts = '1';
    button.textContent = 'Escuchar';
    button.title = 'Leer en voz alta con las voces del dispositivo';
    button.setAttribute('aria-pressed', String(playing));
    button.addEventListener('click', () => {
      button.closest('details')?.removeAttribute('open');
      if (panel && !panel.hidden) playing ? pause() : resume();
      else show();
    });
    container.prepend(button);
  }
  function hook() {
    const now = document.querySelector('#app .rd');
    if (now !== reader) {
      if (pendingPath && location.pathname === pendingPath) {
        // El SPA reemplaza el DOM entre capítulos; no interpretar ese cambio como cierre.
        cancelSpeech(); highlight(null);
        current = null; segments = []; index = 0; reader = now;
      } else {
        stop(); reader = now;
      }
    }
    if (!reader) {
      if (pendingPath && location.pathname !== pendingPath) stop();
      return;
    }
    addButton(reader.querySelector('.rd-wide'));
    addButton(reader.querySelector('.rd-more-m'));
    if (pendingPath) {
      if (location.pathname !== pendingPath) return stop();
      pendingPath = '';
      segments = collect(); index = 0;
      if (panel) panel.hidden = false;
      if (segments.length) { playing = true; speak(true); }
      else stop();
    }
  }
  const app = document.getElementById('app');
  if (app) new MutationObserver(hook).observe(app, { childList: true, subtree: true });
  // Ocultar la página no cancela la voz: el navegador decide si permite TTS en segundo plano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !turnTimer) saveCursor();
    if (document.visibilityState === 'visible' && turnTimer && Date.now() >= turnDeadline) {
      // Al despertar la pestaña, el reloj absoluto mantiene la espera real.
      clearTimeout(turnTimer); turnTimer = setTimeout(() => {
        if (playing) finishedChapter();
      }, 0);
    }
  });
  window.addEventListener('pagehide', () => stop());
  hook();
})();

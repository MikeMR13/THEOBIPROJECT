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
        splitText(text).forEach((part, partIndex) => result.push({ el, text: part, partIndex }));
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
  function cancelSpeech() {
    generation++;
    try { speech.cancel(); } catch {}
  }
  function pause() {
    playing = false;
    cancelSpeech();
    setStatus();
    updateMediaSession();
  }
  function stop() {
    playing = false;
    cancelSpeech();
    current = null; index = 0; segments = [];
    highlight(null);
    clearMediaSession();
    if (panel) panel.hidden = true;
    setStatus();
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
      if (next() < 0) stop(); else speak();
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
  function start(fromVisible = true) {
    segments = collect();
    if (!segments.length) { setStatus('No hay texto disponible para leer.'); return; }
    if (fromVisible || index >= segments.length) index = visibleIndex();
    playing = true;
    speak(true);
  }
  function resume() {
    if (!reader?.isConnected || !panel || panel.hidden) return;
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
    if (playing) speak(true);
    else { highlight(segments[index].el); setStatus(); }
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
    start();
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
    if (now !== reader) { stop(); reader = now; }
    if (!reader) return;
    addButton(reader.querySelector('.rd-wide'));
    addButton(reader.querySelector('.rd-more-m'));
  }
  const app = document.getElementById('app');
  if (app) new MutationObserver(hook).observe(app, { childList: true, subtree: true });
  window.addEventListener('pagehide', stop);
  hook();
})();

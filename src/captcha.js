// Cloudflare Turnstile para entrar, registrarse y recuperar contraseña.
// El token lo valida Supabase (Authentication › Attack Protection › Enable Captcha · Turnstile), así que no se puede saltar desde el navegador.
// Sin clave (OBI_CONFIG.turnstile vacío) todo sigue funcionando como antes.
const KEY = () => window.OBI_CONFIG?.turnstile || '';
let apiP = null;
const api = () => apiP ||= new Promise((ok, no) => {
  if (window.turnstile) return ok(window.turnstile);
  const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
  s.onload = () => ok(window.turnstile); s.onerror = () => { apiP = null; no(new Error('No se pudo cargar la verificación antibots. Revisa tu conexión o desactiva el bloqueador.')); };
  document.head.appendChild(s);
});
export const enabled = () => !!KEY();
export const preload = () => { if (enabled()) api().catch(() => {}); };

// Widget dentro de un formulario. token() espera a que Cloudflare lo resuelva (casi siempre sin que la persona haga nada).
export function mount(el, { action = 'login', theme = 'dark' } = {}){
  if (!enabled() || !el) return { token: async () => undefined, reset(){}, remove(){} };
  let id = null, tok = null, fail = null; const wait = [];
  const done = (t, e) => { tok = t; fail = e || null; wait.splice(0).forEach(([ok, no]) => e ? no(e) : ok(t)); };
  const ready = api().then(ts => { if (!el.isConnected) return;
    id = ts.render(el, { sitekey: KEY(), action, theme, language: 'es', appearance: 'always', size: 'flexible',
      callback: t => done(t), 'expired-callback': () => { tok = null; ts.reset(id); },
      'error-callback': () => done(null, new Error('La verificación antibots falló. Recarga la página e inténtalo de nuevo.')) });
  }, e => done(null, e));
  return {
    async token(){ await ready; if (tok) return tok; if (fail) throw fail;
      return new Promise((ok, no) => { wait.push([ok, no]); setTimeout(() => no(new Error('La verificación antibots tardó demasiado. Inténtalo de nuevo.')), 20000); }); },
    reset(){ tok = null; fail = null; if (id != null) try { window.turnstile.reset(id); } catch {} },
    remove(){ if (id != null) try { window.turnstile.remove(id); } catch {} }
  };
}

// Para botones sueltos (p. ej. «Cambiar contraseña» en Preferencias): muestra el widget solo mientras hace falta.
export async function once(action = 'reset'){
  if (!enabled()) return undefined;
  const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:80';
  document.body.appendChild(box); const w = mount(box, { action });
  try { return await w.token(); } finally { w.remove(); box.remove(); }
}

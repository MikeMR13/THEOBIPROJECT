/*@shell*/const V='obi-dev',SHELL=['/','/manifest.webmanifest','/icon.svg'],LAZY=[];/*@end*/
// La línea de arriba la reescribe scripts/build.mjs con la versión y la lista exacta de archivos (sin studio.js ni admin.js).
const IMG = 'obi-img', IMG_MAX = 400;
// Una sola revalidación de cada portada durante la vida del service worker.
const refreshedImages = new Set();
let puts = 0;
// No activar una versión sin todos sus archivos esenciales. Un recurso versionado
// puede recuperarse de la versión previa solo si coincide su URL exacta.
const validShellResponse = (url, r) => {
  if (!r || !r.ok || r.redirected) return false;
  const type = (r.headers.get('content-type') || '').toLowerCase();
  if (url === '/') return type.includes('text/html');
  if (/\.js(?:\?|$)/.test(url)) return /javascript|ecmascript/.test(type);
  if (/\.css(?:\?|$)/.test(url)) return type.includes('text/css');
  if (url.endsWith('.webmanifest')) return /json|manifest/.test(type);
  if (/\.(?:png|svg)$/.test(url)) return type.startsWith('image/');
  return true;
};
const grab = async (c, u) => {
  try {
    const r = await fetch(u, { cache: 'reload', credentials: 'same-origin' });
    if (validShellResponse(u, r)) { await c.put(u, r); return true; }
  } catch {}
  // Nunca reutilizar HTML antiguo: podría apuntar a módulos ya eliminados.
  if (u !== '/' && /\?v=/.test(u)) {
    const old = await caches.match(u);
    if (validShellResponse(u, old)) { await c.put(u, old); return true; }
  }
  return false;
};
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(V);
  const results = await Promise.all(SHELL.map(u => grab(c, u)));
  if (results.some(ok => !ok)) throw new Error('Instalación PWA incompleta: se conserva la versión anterior');
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const c = await caches.open(V);
  const ok = (await Promise.all(SHELL.map(u => c.match(u)))).every(Boolean);
  // Solo retirar versiones antiguas si todo el arranque está guardado
  if (ok) { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== V && k !== V + '-ch' && k !== V + '-lib' && k !== IMG && k !== 'obi-bodies' && !k.startsWith('obi-offline')).map(k => caches.delete(k))); }
  await self.clients.claim();
  // el resto de módulos (calendario, perfil, captcha…) se guardan después, sin frenar el arranque
  LAZY.forEach(u => c.match(u).then(h => h || grab(c, u)));
})()));
const put = (name, key, r) => { if (r && r.ok && !r.redirected) { const cp = r.clone(); caches.open(name).then(c => c.put(key, cp)); } return r; };
const trim = c => { if (++puts % 20) return; c.keys().then(k => k.length > IMG_MAX && Promise.all(k.slice(0, k.length - IMG_MAX).map(x => c.delete(x)))); };
// Páginas: se abre AL INSTANTE la copia guardada y se actualiza en segundo plano para la próxima vez.
// (Antes se esperaba a la red hasta 4 s; con el desafío de Cloudflare eso hacía lenta cada visita y la app instalada no abría sin internet.)
async function nav(e, req, u){
  if (u.pathname.includes('.')) return fetch(req);
  const c = await caches.open(V), hit = await c.match('/');
  // HTML y módulos son una unidad: el HTML no cambia hasta que se active un
  // nuevo SW con todas sus dependencias, evitando arranques a medias offline.
  if (hit) return hit;
  try { return await fetch(req); } catch { return Response.error(); }
}
// Portadas: la guardada al instante y se actualiza en segundo plano. Se piden en modo CORS para no guardar respuestas opacas.
function image(e, req){
  return caches.open(IMG).then(async c => {
    const hit = await c.match(req.url);
    const download = () => fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req))
      .then(r => { if (r.ok) { c.put(req.url, r.clone()); trim(c); } return r; });
    if (hit) {
      if (!refreshedImages.has(req.url)) {
        if (refreshedImages.size >= IMG_MAX) refreshedImages.clear();
        refreshedImages.add(req.url);
        e.waitUntil(download().catch(() => {}));
      }
      return hit;
    }
    return download().catch(() => caches.match(req.url).then(r => r || Response.error()));
  });
}
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url); if (req.method !== 'GET') return;
  if (u.origin === location.origin) {
    if (u.pathname === '/sw.js') return;
    if (req.mode === 'navigate') { if (u.searchParams.has('temporada')) return; e.respondWith(nav(e, req, u)); return; }
    // Archivos versionados (?v=sello): nunca cambian, se sirven del caché.
    if (u.searchParams.has('v') || SHELL.includes(u.pathname)) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => r.ok ? put(V, req, r) : caches.match(req.url, { ignoreSearch: true }).then(o => o || r)))); return; }
    // si la red responde con error (desafío 403/503) o no hay conexión, la copia guardada
    e.respondWith(fetch(req).then(r => r.ok ? put(V, req, r) : caches.match(req).then(o => o || r)).catch(() => caches.match(req))); return;
  }
  if (u.hostname === 'esm.sh' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com') { e.respondWith(caches.open(V + '-lib').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })))); return; }
  if (u.pathname.includes('/storage/v1/object/public/')) { if (req.destination === 'image') { e.respondWith(image(e, req)); return; } e.respondWith(fetch(req).catch(() => caches.match(req.url))); return; }
  // El lector gestiona su propia caché offline por capítulo. No almacenar respuestas
  // de PostgREST autenticadas en una caché global compartida entre sesiones.
  if (u.pathname.includes('/rest/v1/chapters')) return;
});
// Notificaciones push (avisos del sitio, recordatorios y aniversarios).
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'El Obi del Lector', { body: d.body || '', icon: '/icon.svg', badge: '/icon.svg', tag: d.tag, data: { url: d.url || '/' } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); const u = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) if (c.url.startsWith(self.location.origin) && 'focus' in c) { if ('navigate' in c) c.navigate(u); return c.focus(); } return self.clients.openWindow(u); })); });

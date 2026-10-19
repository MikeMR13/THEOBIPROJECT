/*@shell*/const V='obi-dev',SHELL=['/','/manifest.webmanifest','/icon.svg'];/*@end*/
// La línea de arriba la reescribe scripts/build.mjs con la versión y la lista exacta de archivos (sin studio.js ni admin.js).
const IMG = 'obi-img', IMG_MAX = 400, NAV_MS = 4000;
let puts = 0;
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== V + '-ch' && k !== V + '-lib' && k !== IMG && !k.startsWith('obi-offline')).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const put = (name, key, r) => { if (r && r.ok && !r.redirected) { const cp = r.clone(); caches.open(name).then(c => c.put(key, cp)); } return r; };
const trim = c => { if (++puts % 20) return; c.keys().then(k => k.length > IMG_MAX && Promise.all(k.slice(0, k.length - IMG_MAX).map(x => c.delete(x)))); };
// Páginas: red con límite de 2.5 s; si tarda más o no hay conexión, la copia guardada.
async function nav(req, u){
  const net = fetch(req).then(r => u.pathname.includes('.') ? r : put(V, '/', r));
  try { const r = await Promise.race([net, new Promise(res => setTimeout(res, NAV_MS)).then(() => caches.match('/'))]); if (r) return r; } catch {}
  try { return await net; } catch { return (await caches.match('/')) || Response.error(); }
}
// Portadas: la guardada al instante y se actualiza en segundo plano. Se piden en modo CORS para no guardar respuestas opacas.
function image(e, req){
  return caches.open(IMG).then(c => c.match(req.url).then(hit => {
    const net = fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req)).then(r => { if (r.ok) { c.put(req.url, r.clone()); trim(c); } return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => caches.match(req.url).then(r => r || Response.error()));
  }));
}
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url); if (req.method !== 'GET') return;
  if (u.origin === location.origin) {
    if (u.pathname === '/sw.js') return;
    if (req.mode === 'navigate') { if (u.searchParams.has('temporada')) return; e.respondWith(nav(req, u)); return; }
    // Archivos versionados (?v=sello): nunca cambian, se sirven del caché.
    if (u.searchParams.has('v') || SHELL.includes(u.pathname)) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(V, req, r)))); return; }
    e.respondWith(fetch(req).then(r => put(V, req, r)).catch(() => caches.match(req))); return;
  }
  if (u.hostname === 'esm.sh' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com') { e.respondWith(caches.open(V + '-lib').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })))); return; }
  if (u.pathname.includes('/storage/v1/object/public/')) { if (req.destination === 'image') { e.respondWith(image(e, req)); return; } e.respondWith(fetch(req).catch(() => caches.match(req.url))); return; }
  if (u.pathname.includes('/rest/v1/chapters')) { e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(V + '-ch').then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req))); }
});
// Notificaciones push (avisos del sitio, recordatorios y aniversarios).
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'El Obi del Lector', { body: d.body || '', icon: '/icon.svg', badge: '/icon.svg', tag: d.tag, data: { url: d.url || '/' } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); const u = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) if (c.url.startsWith(self.location.origin) && 'focus' in c) { if ('navigate' in c) c.navigate(u); return c.focus(); } return self.clients.openWindow(u); })); });

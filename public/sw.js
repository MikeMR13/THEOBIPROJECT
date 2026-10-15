const V='obi-v5', SHELL=['/','/styles.css','/app.js','/reader.js','/studio.js','/config.js','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==V+'-ch'&&k!==V+'-lib'&&!k.startsWith('obi-offline')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET') return;
  if(u.origin===location.origin){ e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(V).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/')))); return; }
  if(u.hostname==='esm.sh'||u.hostname==='fonts.gstatic.com'||u.hostname==='fonts.googleapis.com'){ e.respondWith(caches.open(V+'-lib').then(c=>c.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{ if(r.ok) c.put(e.request,r.clone()); return r; })))); return; }
  if(u.pathname.includes('/storage/v1/object/public/')){ e.respondWith(fetch(e.request).catch(()=>caches.match(e.request.url))); return; }
  if(u.pathname.includes('/rest/v1/chapters')){ e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(V+'-ch').then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request))); }
});
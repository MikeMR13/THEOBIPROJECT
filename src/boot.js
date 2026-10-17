// Arranque temprano (script clásico con defer, corre antes que los módulos).
(function(){
  // 1. Google Fonts sin bloquear el primer pintado: llega como media="print" y aquí pasa a "all".
  var l = document.getElementById('gf');
  if (l) { var on = function(){ l.media = 'all'; }; if (l.sheet) on(); else l.addEventListener('load', on); }
  // 2. En el inicio, pide home_feed ya, en paralelo con la descarga del JS, y precarga la portada destacada (LCP).
  var C = window.OBI_CONFIG; if (!C || location.pathname !== '/' || !window.fetch) return;
  // Sin cabeceras propias (apikey va en la URL) para que el navegador no haga la consulta previa OPTIONS: un viaje menos.
  var p = window.OBI_HOME = fetch(C.url + '/rest/v1/rpc/home_feed?apikey=' + encodeURIComponent(C.key))
    .then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
  p.then(function(d){
    if (!d || !d.series) return; var by = {}; d.series.forEach(function(s){ by[s.id] = s; });
    var f = (d.featured || []).map(function(id){ return by[id]; }).filter(function(s){ return s && !s.adult; })[0];
    if (!f) { var lc = (d.latest || []).find(function(c){ var s = by[c.series_id]; return s && !s.adult; }); f = lc && by[lc.series_id]; }
    if (!f || !f.cover_path) return; var cp = (matchMedia('(max-width: 700px)').matches && f.cover_thumb_path) || f.cover_path;
    var k = document.createElement('link'); k.rel = 'preload'; k.as = 'image'; k.setAttribute('fetchpriority', 'high');
    k.href = /^https?:/.test(cp) ? cp : C.url + '/storage/v1/object/public/obi-media/' + encodeURI(cp);
    document.head.appendChild(k);
  });
})();

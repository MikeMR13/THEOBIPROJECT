// Adaptación del SEO de navegación aportado por el equipo.
// El servidor (api/public-meta.js) sigue siendo la autoridad para bots,
// canónicos, privacidad y tarjetas sociales. No usar un MutationObserver
// paralelo al ciclo SPA de app.js/share.js.
const BRAND='El Obi del Lector';
const ROOT='https://elobidellector.com';
const DESC='Biblioteca de novelas ligeras traducidas al español latino por grupos de fans. Lee en línea, sigue tus obras y recibe avisos de capítulos nuevos.';
const STATIC=new Map([
  ['/',['El Obi del Lector — Novelas ligeras en español latino',DESC]],
  ['/catalogo',['Catálogo de novelas ligeras',DESC]],
  ['/calendario',['Calendario de publicaciones',DESC]],
  ['/lanzamientos',['Lanzamientos',DESC]],
  ['/ranking',['Ranking de obras',DESC]],
  ['/apoyar',['Apoyar a los traductores',DESC]],
  ['/privacidad',['Política de privacidad',DESC]],
  ['/condiciones-servicio',['Condiciones del servicio',DESC]]
]);
export function clipSeoText(raw,n=170){
  let s=String(raw??'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ').trim();
  if(s.length>n)s=s.slice(0,n-1).replace(/\s+\S*$/,'').trimEnd()+'…';
  return s;
}
export function deriveClientSeo(path,read=()=>'',opts={}){
  const p=String(path||'');
  let title='',description=DESC,kind='',slug='',chapter='';
  const common=STATIC.get(p);
  if(common){
    title=common[0]===STATIC.get('/')[0]?common[0]:common[0]+' | '+BRAND;
    description=common[1];kind=p==='/'?'home':'static';
  }else{
    let m;
    if((m=p.match(/^\/serie\/([\w-]+)$/))){
      const heading=clipSeoText(read('.ui-series-page h1'),190);
      if(!heading)return null;
      title=heading+' — Novela ligera en español | '+BRAND;
      description=clipSeoText(read('.ui-series-page .ui-syn, .ui-series-page .ob-syn')||DESC);
      kind='serie';slug=m[1];
    }else if((m=p.match(/^\/leer\/([\w-]+)\/([1-9]\d{0,7})$/))){
      const heading=clipSeoText(read('.rd-ch .rd-head h2, .rd h1, .rd-title'),130);
      if(!heading)return null;
      const book=clipSeoText(read('.rd-back, .rd-where a'),80).replace(/^‹\s*/,'');
      title=heading+(book?' · '+book:'')+' | '+BRAND;
      description=clipSeoText('Lee '+heading+(book?' de '+book:'')+' en español latino.');
      kind='leer';slug=m[1];chapter=m[2];
    }else if((m=p.match(/^\/equipo\/([\w-]+)$/))){
      const heading=clipSeoText(read('.tp2-page h1, .tp2-page .tp2 h1'),130);
      if(!heading)return null;
      title=heading+' · Grupo traductor | '+BRAND;
      description=clipSeoText(read('.tp2-page .tp2-bio, .tp2-page .tp2-desc')||'Grupo traductor de novelas ligeras en español latino en '+BRAND+'.');
      kind='equipo';slug=m[1];
    }else return null;
  }
  return {title,description,kind,slug,chapter,publicURL:ROOT+p};
}
function ensureMeta(doc,attr,key){
  const selector='meta['+attr+'="'+key+'"]';
  let n=doc.querySelector(selector);
  if(!n){n=doc.createElement('meta');n.setAttribute(attr,key);doc.head.appendChild(n);}
  return n;
}
export function updateClientSeo({doc=globalThis.document,loc=globalThis.location,blocked=false}={}){
  if(!doc||!loc)return false;
  // Las rutas privadas nunca heredan textos o portadas sociales de la ficha previa.
  if(blocked){
    ensureMeta(doc,'name','description').content=DESC;
    ensureMeta(doc,'property','og:title').content=BRAND;
    ensureMeta(doc,'property','og:description').content='';
    ensureMeta(doc,'property','og:image').content=ROOT+'/icon-512.png';
    ensureMeta(doc,'name','twitter:title').content=BRAND;
    ensureMeta(doc,'name','twitter:description').content='';
    ensureMeta(doc,'name','twitter:image').content=ROOT+'/icon-512.png';
    return false;
  }
  const read=sel=>doc.querySelector(sel)?.textContent?.replace(/\s+/g,' ').trim()||'';
  const plan=deriveClientSeo(loc.pathname,read);
  if(!plan)return false;
  doc.title=plan.title;
  ensureMeta(doc,'name','description').content=plan.description;
  ensureMeta(doc,'property','og:title').content=plan.title.replace(/ \| El Obi del Lector$/,'');
  ensureMeta(doc,'property','og:description').content=plan.description;
  // El canonical es responsabilidad de share.js. Reutilizarlo, no duplicarlo.
  const canonical=doc.querySelector('link[rel="canonical"]')?.href||plan.publicURL;
  ensureMeta(doc,'property','og:url').content=canonical;
  ensureMeta(doc,'name','twitter:title').content=plan.title.replace(/ \| El Obi del Lector$/,'');
  ensureMeta(doc,'name','twitter:description').content=plan.description;
  if(plan.kind==='home'||['serie','leer','equipo'].includes(plan.kind)){
    const q=new URLSearchParams({kind:plan.kind});
    if(plan.slug)q.set('slug',plan.slug);
    if(plan.chapter)q.set('chapter',plan.chapter);
    const image=ROOT+'/api/og-image?'+q.toString();
    ensureMeta(doc,'property','og:image').content=image;
    ensureMeta(doc,'name','twitter:image').content=image;
  }else{
    ensureMeta(doc,'property','og:image').content=ROOT+'/icon-512.png';
    ensureMeta(doc,'name','twitter:image').content=ROOT+'/icon-512.png';
  }
  // Jamás modificar meta[name=robots], og:image:width/height ni JSON-LD SSR.
  return true;
}

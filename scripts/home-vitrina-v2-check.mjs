// QA de Vitrina V2: contrato editorial y navegador, sin dependencias pagadas.
function browserCheck(){
  const s=document.querySelector('#hero');
  const fails=[]; const ok=(test,msg)=>{if(!test)fails.push(msg);};
  const books=[...s.querySelectorAll('.vt-book')];
  const r=sel=>s.querySelector(sel).getBoundingClientRect();
  ok(s.querySelectorAll('.vt').length===1,'Vitrina no montada');
  ok(books.length===3,'Número incorrecto de portadas');
  ok(books[1].querySelector('img')?.src.includes('volume.svg'),'Portada de volumen incorrecta');
  ok(books[2].querySelector('img')?.src.includes('pre.svg'),'Portada del preestreno incorrecta');
  ok(books[1].querySelector('.vt-obi')?.textContent==='AVISO EDITORIAL','Faja editorial ausente');
  ok(!books[2].querySelector('.vt-obi'),'El preestreno no debe tener faja de publicación');
  ok(s.dataset.vtKeys==='pub:1|pub:2|pre:3','Claves editoriales alteradas');
  ok(s.querySelector('.ob-hero-team-logo')?.getAttribute('href')==='/equipo/equipo','Identidad del equipo perdida');
  ok(!!s.querySelector('.ob-hero-partners'),'Colaboradores desaparecidos');
  ok(!!s.querySelector('.ob-hero-rank'),'Ranking desaparecido');
  ok(s.querySelector('.ob-acts .a2')?.getAttribute('href')==='/leer/obra/14','Progreso de lectura modificado');
  ok(!!s.querySelector('.ob-pager2 button[data-hp]'),'Pausa no disponible');
  ok(books[1].getAttribute('aria-current')==='true','Estado activo incorrecto');
  ok(books[1].tagName==='A'&&books[1].getAttribute('href')==='/serie/segunda-obra','La portada activa no abre su novela');
  ok(books[0].tagName==='BUTTON'&&books[0].hasAttribute('data-j'),'Las portadas laterales no permiten seleccionar');
  const width=book=>book.getBoundingClientRect().width;
  ok(width(books[1])>=width(books[0])*1.14,'La portada visible no destaca al menos un 14% sobre las vecinas');
  const a1=s.querySelector('.ob-acts .a1'),ranking=s.querySelector('.rk-bdg');
  const visible=el=>{if(!el)return false;const st=getComputedStyle(el),r=el.getBoundingClientRect();return st.visibility==='visible'&&Number(st.opacity)>0.9&&r.width>35&&r.height>=30;};
  ok(visible(a1),'El botón Ver volumen está oculto');
  ok(visible(ranking),'El enlace Top de la semana está oculto');
  ok(getComputedStyle(a1).backgroundColor!=='rgba(0, 0, 0, 0)','Ver volumen no tiene fondo visible');
  const a2=s.querySelector('.ob-acts .a2');
  const opacityOf=el=>Number((getComputedStyle(el).backgroundColor.match(/rgba?\\(([^)]+)\\)/)?.[1]?.split(',')[3])||1);
  ok(!!a2&&visible(a2),'El segundo CTA está oculto');
  ok(opacityOf(a1)>=1&&opacityOf(a2)>=1,'Los botones deben ser completamente opacos');
  ok(getComputedStyle(a1).backgroundImage==='none'&&getComputedStyle(a2).backgroundImage==='none','Los CTA no deben heredar transparencias/gradientes');
  ok(getComputedStyle(a1).backgroundColor!==getComputedStyle(a2).backgroundColor,'Los CTA requieren jerarquía visual');

  const canHit=el=>{if(!el)return false;const q=el.getBoundingClientRect();const hit=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return !!hit&&(el===hit||el.contains(hit));};
  ok(canHit(books[1]),'La portada activa está tapada: no se puede hacer clic');
  ok(canHit(a1),'Un elemento tapa el botón Ver volumen');
  ok(canHit(ranking),'Un elemento tapa Top de la semana');
  let opened=false;
  books[1].addEventListener('click',e=>{e.preventDefault();opened=true;},{once:true});
  books[1].click();
  ok(opened,'El clic de la portada activa no llega al enlace');
  let selected='';
  s.querySelectorAll('.vt-book').forEach(b=>b.addEventListener('click',()=>selected=b.dataset.heroTarget));
  books[0].click();
  ok(selected==='pub:1','No se puede seleccionar un libro');
  let keyboard=false;
  s.querySelector('[data-dir="1"]').addEventListener('click',()=>keyboard=true);
  const stage=s.querySelector('.vt-stage');
  stage.focus();
  stage.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true,bubbles:true}));
  ok(keyboard,'Teclado no avanza');
  ok(document.documentElement.scrollWidth<=document.documentElement.clientWidth+3,'Desbordamiento horizontal');
  ok(r('.ob-acts').bottom<=r('.vt').bottom+3,'Acciones recortadas');
  ok(r('.ob-hero-team-logo').right<=r('.vt-side').right+3,`Logo desbordado: ${r('.ob-hero-team-logo').right.toFixed(1)}/${r('.vt-side').right.toFixed(1)}; vt ${r('.vt').left.toFixed(1)}-${r('.vt').right.toFixed(1)}`);
  // El título debe encoger sin modificar la altura global entre obras.
  const fixedHeight=r('.vt-row').height, paper=r('.ob-txt');
  const h1=s.querySelector('.ob-txt h1'),originalTitle=h1.textContent;
  h1.textContent='Título breve';
  ok(Math.abs(r('.vt-row').height-fixedHeight)<1,'Cambió la altura con un título corto');
  h1.textContent=originalTitle;
  ok(Math.abs(r('.vt-row').height-fixedHeight)<1,'Cambió la altura con un título largo');
  ok(getComputedStyle(s.querySelector('.vt-row')).height!=='auto','Altura sin reserva estable');
  // La vitrina no debe ocupar casi toda la portada: el resto del Inicio
  // debe aparecer sin un desplazamiento largo para llegar a Novedades.
  const viewport=window.innerHeight;
  const rowHeight=r('.vt-row').height,totalHeight=r('.vt').height;
  const maxRow=innerWidth>1050?Math.min(400,Math.max(340,viewport*.43)):
    innerWidth>700?Math.min(390,Math.max(330,viewport*.46)):
    innerWidth>380?Math.min(510,viewport*.72):Math.min(535,viewport*.78);
  ok(rowHeight<=maxRow+4,'Vitrina ocupa más alto del previsto: '+rowHeight.toFixed(1)+' > '+maxRow.toFixed(1));
  if(innerWidth>700)ok(totalHeight<=460,'La vitrina de PC sigue ocultando casi toda la página: '+totalHeight.toFixed(1));
  ok(r('.vt-controls').top>=r('.vt-row').bottom-2,'Controles encima de la ficha');
  ok(r('.ob-txt').height<=rowHeight-8,'Hoja demasiado alta para la vitrina');
  ok(s.querySelector('.ob-txt').dataset.vtFit==='ready','No se ejecutó el ajuste de tipografía');
  ok(r('.ob-acts').bottom<=paper.bottom-4,'Botones sobresalen de la hoja');
  ok(r('.ob-acts').top>=paper.top,'Botones colocados fuera de la hoja');
  ok(r('.ob-txt h1').bottom<=r('.ob-hero-footer').top+2,`Título sobrepuesto: título ${r('.ob-txt h1').top.toFixed(0)}-${r('.ob-txt h1').bottom.toFixed(0)}, pie ${r('.ob-hero-footer').top.toFixed(0)}-${r('.ob-hero-footer').bottom.toFixed(0)}, papel ${r('.ob-txt').top.toFixed(0)}-${r('.ob-txt').bottom.toFixed(0)}, font ${getComputedStyle(h1).fontSize}, display ${getComputedStyle(h1).display}, clamp ${getComputedStyle(h1).webkitLineClamp}`);
  const logoWidth=r('.ob-hero-team-logo').width;
  ok(logoWidth>=(innerWidth<=700?90:110),'PNG del traductor demasiado pequeño: '+logoWidth.toFixed(1)+'px');

  ok(r('.ob-txt h1').right<=document.documentElement.clientWidth+3,`Título desbordado: ${r('.ob-txt h1').right.toFixed(1)}/${document.documentElement.clientWidth}`);
  if(innerWidth<=700){
    ok(getComputedStyle(s.querySelector('.vt-books')).scrollSnapType.includes('mandatory'),'Falta scroll-snap');
    ok(getComputedStyle(books[0]).position==='relative','Diseño móvil incorrecto');
  }else{
    ok(getComputedStyle(books[0]).position==='absolute','Diseño PC incorrecto');
  }
  const output=document.querySelector('#result');
  output.dataset.status=fails.length?'fail':'pass';output.textContent=fails.join(' | ')||'OK';
}
async function run(){
  const assert=(await import('node:assert/strict')).default;
  const {readFileSync} = await import('node:fs');
  const {createServer}=await import('node:http');
  const {spawn,execFileSync}=await import('node:child_process');
  const ui=readFileSync('src/ui.js','utf8'),v=readFileSync('src/home-vitrina.js','utf8');
  const cssMatch=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
  assert(cssMatch,'Estilos reales de Inicio no encontrados');
  const siteCss=readFileSync('src/styles.css','utf8')+'\n'+JSON.parse(cssMatch[1]);
  for(const needle of [
    "home-vitrina.js?v=6","enhanceHomeVitrina(el, feat, i,","activeNotice: currentNotice",
    "el.dataset.vtKeys === feat.map(heroKey).join('|')","el.__vtStop?.()",
    "heroPaused = true;","homeMetrics.shown(heroKey(s)","homeMetrics.clicked(s.slug",
    "prelaunch_calendar","creditsHTML({publicCredits:","heroClock.show({"
  ])assert(ui.includes(needle),'Contrato editorial perdido: '+needle);
  for(const needle of [
    'export function enhanceHomeVitrina','const CSS=',"news?.kind === 'volume'",
    "notice?.season","scroll-snap-type:x mandatory","ResizeObserver",
    "aria-current","aria-hidden","ro?.disconnect()","vt-book","vt-side"
  ])assert(v.includes(needle),'Falta funcionalidad Vitrina: '+needle);
  const chrome=process.env.QA_CHROME || ['google-chrome','chromium','google-chrome-stable','chromium-browser'].map(x=>{
    try{return execFileSync('which',[x],{encoding:'utf8'}).trim();}catch{return '';}
  }).find(Boolean);
  assert(chrome,'No hay Chromium / Google Chrome disponible');
  const long='Una historia de novelas ligeras con muchos personajes y un nombre demasiado largo para un móvil ';
  const HTML=`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${siteCss}\n
  :root{--gold:#f2c230;--sea:#eb863e;--paper:#f3ecd9}body{margin:0;background:#100d09;color:#f3ecd9;font:14px Arial}
  /* La prueba mide la posición final, no la animación de entrada de 600–750 ms. */
  .ob-page,#hero .ob-txt{animation:none!important}.vt-book{transition:none!important}
  .ob-page{max-width:1160px;margin:auto;padding:10px;box-sizing:border-box}
  .ob-hero{display:grid;grid-template-columns:250px minmax(0,1fr);gap:20px;padding:30px;border:1px solid #312718}
  .ob-hero-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}
  .ob-hero-team-logo{display:block;width:75px;color:inherit}.ob-hero-team-logo img{width:100%;aspect-ratio:1;object-fit:contain}
  .ob-hero-flags{display:flex;flex-direction:column;align-items:start;gap:6px}
  .ob-badge{background:#f2c230;color:#111;padding:6px}.ob-hero-rank{margin:9px 0}
  .ob-h1a{color:inherit}.ob-txt h1{font-size:28px;overflow-wrap:anywhere}.ob-syn{line-height:1.5}
  .ob-acts{display:flex;gap:9px;flex-wrap:wrap}.ob-acts a{display:inline-flex;padding:9px;border:1px solid #8c7d5f;color:inherit}
  .ob-pager2{display:flex;gap:8px;align-items:center}.ob-pager2>span{display:flex;gap:8px;flex:1;justify-content:center}
  .ob-pager2 button{min-height:44px;min-width:44px}
  </style></head><body><main class="ob-page"><section class="ob-hero" id="hero">
  <span class="ob-vk">新刊</span><div class="ob-cov"><div class="f"></div></div>
  <div class="ob-txt"><div class="ob-hero-copy"><div class="ob-hero-head"><div class="ob-hero-meta">
  <span class="ob-kick">第２巻 · 新刊</span><div class="ob-hero-flags"><span class="ob-badge">¡NUEVO VOLUMEN!</span></div><div class="ob-hero-rank"><a class="rk-bdg" href="/ranking">#2 Top de la semana</a></div></div>
  <a class="ob-hero-team-logo" href="/equipo/equipo"><img alt="" src="/covers/team.svg"></a></div>
  <div class="ob-hero-partners"><a href="/equipo/colaborador">Créditos de colaborador</a></div>
  <h1><a class="ob-h1a" href="/serie/obra">${long.repeat(2)}</a></h1>
  <p class="ob-syn">${long.repeat(3)}</p></div>
  <div class="ob-hero-footer"><div class="ob-acts"><a class="a1" href="/serie/obra">Ver volumen 2</a><a class="a2" href="/leer/obra/14">Continuar lectura</a></div></div></div>
  <div class="ob-pager2"><button data-dir="-1">‹</button><span><button data-j="0">1</button><button data-j="1">2</button><button data-j="2">3</button></span><button data-hp aria-label="Pausar">Ⅱ Pausar</button><button data-dir="1">›</button></div>
  </section></main><div id="result" data-status="running"></div><script type="module">
  import {enhanceHomeVitrina} from '/home-vitrina.js';
  const books=[{id:1,title:'Primera obra',slug:'primera-obra',cover_path:'first.svg',theme:{color:'#a97941'}},
  {id:2,title:'Segunda obra',slug:'segunda-obra',cover_path:'second.svg',theme:{color:'#47456a'}},
  {id:3,title:'Tercera obra',slug:'tercera-obra',cover_path:'third.svg',__prelaunch:{volume_id:3,cover_path:'pre.svg'},theme:{color:'#544631'}}];
  enhanceHomeVitrina(document.querySelector('#hero'),books,1,{esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),media:s=>'/covers/'+s,newsBySeries:{2:{kind:'volume',volume:{cover_path:'volume.svg'}}},reasons:{2:{label:'Nuevo volumen'}},activeNotice:s=>s.id===2?{text:'AVISO EDITORIAL',color:'#f2c230',style:'solid'}:null});
  (${browserCheck.toString()})();
  </script></body></html>`;
  const server=createServer((req,res)=>{
    if(req.url==='/home-vitrina.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(v);}
    if(req.url?.startsWith('/covers/')){res.writeHead(200,{'Content-Type':'image/svg+xml'});return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="#9e7044"/></svg>');}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(HTML);
  });
  try{
    await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});
    for(const w of [320,390,768,1024,1440]){
      const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--virtual-time-budget=2200',`--window-size=${w},1100`,'--dump-dom',`http://127.0.0.1:${server.address().port}`];
      const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
      child.stdout.on('data',x=>out+=String(x));
      child.stderr.on('data',x=>err+=String(x).slice(0,3000));
      const code=await new Promise((ok,no)=>{
        const timeout=setTimeout(()=>{child.kill('SIGKILL');no(Error(`Chromium timeout ${w}`));},45000);
        child.once('error',e=>{clearTimeout(timeout);no(e);});
        child.once('close',c=>{clearTimeout(timeout);ok(c);});
      });
      assert.equal(code,0,`Chromium ${w}px: ${err.slice(-300)}`);
      const m=out.match(/<div id="result" data-status="(pass|fail)">([^<]*)<\/div>/);
      assert(m,`Prueba del navegador incompleta a ${w}px`);
      assert.equal(m[1],'pass',`Ancho ${w}px: ${m[2]}`);
      console.log(`✓ Vitrina V2 ${w}px`);
    }
  }finally{server.closeAllConnections();await new Promise(ok=>server.close(ok));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});

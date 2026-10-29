// Validación visual con portadas públicas existentes, solo consultas de imagen.
async function realCoverValidation() {
 const assert=(await import('node:assert/strict')).default;
 const {readFileSync,mkdirSync,statSync}=await import('node:fs');
 const {createServer}=await import('node:http');
 const {spawn,execFileSync}=await import('node:child_process');
 const ui=readFileSync('src/ui.js','utf8'),v=readFileSync('src/home-vitrina.js','utf8'),css=readFileSync('src/styles.css','utf8');
 const m=ui.match(/const CSS2 = ("(?:\\.|[^"\\])*");/);
 assert(m,'Falta CSS2');
 const css2=JSON.parse(m[1]);
 const a=ui.indexOf('const HOME_CSS = `');assert(a>=0,'Falta HOME_CSS');
 const start=a+'const HOME_CSS = `'.length,end=ui.indexOf('`;',start);assert(end>start);
 const homeCss=ui.slice(start,end);
 const base='https://qfllthjpjuaztppvpsrk.supabase.co/storage/v1/object/public/obi-media/';
 const rows=[
 ['¿Pensaste que la esposa online no era una chica?','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/nlobi/covers/cover-mv3bukui-qy3esk-optimized.webp','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/thumbs/72f6d574-2d6d-40aa-9b99-34afed21d6f9-1792271312713.webp'],
 ['¿Heroína? ¿Santa? ¡No, soy una sirvienta todoterreno con orgullo!','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/nlobi/volumes/4b8c8969-bfcf-48ab-9be5-2b56d8899a01/imported-cover-muzrle04-lnqd2m-legacy-optimized.webp','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/thumbs/a3ffcde2-3d3f-473d-87c1-b792a2bcb401-1792271311744.webp'],
 ['Los secretos de la Bruja del Silencio','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/obras/los-secretos-de-la-bruja-del-silencio/vol-1/cover.jpeg','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/thumbs/bd95dde4-56a6-4343-9cf9-5d576a0a4616-1792374154019.webp'],
 ['El caballero imperial retirado se convierte en el líder de las tres grandes organizaciones del imperio Las chicas que una vez salvó fundaron esas organizaciones para devolverle el favor','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/obras/el-caballero-imperial-retirado-se-convierte-en-el-/vol-1/image-0-0.jpg','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/thumbs/9233cad3-a942-419c-8f29-68ca4e9ea326-1792635528118.webp'],
 ['Sayonara Princess','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/obras/sayonara-princess/vol-1/cover.jpeg','50a58d51-5f9d-4f9b-b97e-ead2ada7220c/thumbs/2ae1d994-043a-4d14-a338-256808d1c0ce-1792634908498.webp']
 ];
 // Descargar una vez los objetos públicos antes de abrir Chromium. Así, las
 // capturas no dependen de latencias remotas ni de DNS dentro del navegador.
 const requests=rows.map((r,i)=>({key:i+'/thumb',path:r[2]})).concat([{key:'3/full',path:rows[3][1]}]);
 const assets=new Map();
 await Promise.all(requests.map(async item=>{
  const resp=await fetch(base+encodeURI(item.path),{signal:AbortSignal.timeout(10000)});
  assert(resp.ok,'Portada pública '+item.key+' HTTP '+resp.status);
  const bytes=Buffer.from(await resp.arrayBuffer());
  assert(bytes.length>1500,'Portada vacía: '+item.key);
  assets.set(item.key,{bytes,type:item.path.endsWith('.webp')?'image/webp':item.path.endsWith('.jpeg')?'image/jpeg':'image/jpeg'});
 }));
 const books=rows.map(([title],i)=>({id:String(i+1),title,cover_path:'/covers/'+i+'/full',cover_thumb_path:'/covers/'+i+'/thumb',theme:{color:'#f2c230'}}));
 const title=books[3].title;
 const HTML=`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\n${css2}\n${homeCss}\n:root{--gold:#f2c230;--sea:#d8a75c;--paper:#f3ecd9;--line:#3d3628}body{background:#0d0c0a;margin:0}.ob-page{max-width:1160px;padding:12px;box-sizing:border-box;margin:auto}</style></head>
 <body><main class="ob-page"><section id="hero" class="ob-hero"><div class="ob-cov"></div>
 <div class="ob-txt"><div class="ob-hero-copy"><div class="ob-hero-head"><div class="ob-hero-meta"><span class="ob-kick">NUEVO VOLUMEN</span><div class="ob-hero-flags"><span class="ob-badge ob-badge-vol">SELECCIÓN EDITORIAL</span></div></div><a href="/equipo/ox-mr" class="ob-hero-team-logo is-text"><span>OX-MR TRADUCCIONES</span></a></div><h1 data-len="xl"><a class="ob-h1a" href="/serie/caballero">${title}</a></h1><p class="ob-syn">Obra publicada y portada pública de El Obi del Lector. Comprobación de longitud real del título, encuadre del arte y adaptación móvil.</p></div><div class="ob-hero-footer"><div class="ob-acts"><a class="a1" href="/serie/caballero">Ver volumen</a><a class="a2" href="/leer/caballero/1">Empezar a leer</a></div></div></div>
 <div class="ob-pager2"><button data-dir="-1">‹</button><span><button data-j="0">1</button><button data-j="1">2</button><button data-j="2">3</button><button data-j="3">4</button><button data-j="4">5</button></span><button data-hp aria-label="Pausar">Ⅱ</button><button data-dir="1">›</button></div></section></main>
 <div id="result" data-status="loading"></div>
 <script type="module">
 import {enhanceHomeVitrina} from '/home-vitrina.js';
 const b=${JSON.stringify(books)};
 enhanceHomeVitrina(document.querySelector('#hero'),b,3,{esc:s=>String(s),media:s=>s});
 const active=document.querySelector('.vt-book[aria-current=true] img');
 await Promise.race([active.decode().catch(()=>{}),new Promise(res=>setTimeout(res,12000))]);
 const errs=[];
 if(active.naturalWidth<30)errs.push('Portada pública no cargada');
 if(document.querySelectorAll('.vt-book').length!==5)errs.push('Obras incompletas');
 if(document.querySelector('h1')?.textContent!==b[3].title)errs.push('Título alterado');
 if(document.documentElement.scrollWidth>document.documentElement.clientWidth+3)errs.push('Desbordamiento horizontal');
 const btn=document.querySelector('.ob-acts').getBoundingClientRect(),bar=document.querySelector('.vt-controls').getBoundingClientRect();
 if(btn.bottom>bar.top+3)errs.push('Acciones superpuestas');
 const result=document.querySelector('#result');result.dataset.status=errs.length?'fail':'pass';result.textContent=errs.join(' | ')||('Portada real: '+active.naturalWidth+'×'+active.naturalHeight);
 </script></body></html>`;
 const server=createServer((req,res)=>{
  if(req.url==='/home-vitrina.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(v);}
  if(req.url?.startsWith('/covers/')){
   const a=assets.get(req.url.slice('/covers/'.length));
   if(!a){res.writeHead(404);return res.end('No encontrado');}
   res.writeHead(200,{'Content-Type':a.type,'Cache-Control':'public,max-age=3600'});return res.end(a.bytes);
  }
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(HTML);
 });
 const bin=process.env.QA_CHROME||['chromium','google-chrome','google-chrome-stable'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
 assert(bin,'Chromium no disponible');
 const go=async(args)=>{
  const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
  child.stdout.on('data',d=>out+=String(d));child.stderr.on('data',d=>err+=String(d).slice(-500));
  const code=await new Promise((ok,no)=>{const t=setTimeout(()=>{child.kill('SIGKILL');no(Error('Timeout Chromium'))},35000);child.once('error',e=>{clearTimeout(t);no(e)});child.once('close',c=>{clearTimeout(t);ok(c)})});
  assert.equal(code,0,err.slice(-400));return out;
 };
 try {
  await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
  mkdirSync('qa-capturas',{recursive:true});
  for(const width of [390,1440]){
   const url='http://127.0.0.1:'+server.address().port+'/';
   const html=await go(['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',`--window-size=${width},1150`,'--virtual-time-budget=16000','--dump-dom',url]);
   const m=html.match(/<div id="result" data-status="(pass|fail|loading)">([^<]*)<\/div>/);assert(m,'Sin resultado visual a '+width);
   assert.equal(m[1],'pass',width+'px: '+m[2]);
   const path='qa-capturas/vitrina-portadas-reales-'+width+'.png';
   await go(['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--window-size=${width},1150`,'--virtual-time-budget=5000','--screenshot='+path,url]);
   assert(statSync(path).size>8000,'Captura vacía');
   console.log('✓ Vitrina con portada pública '+width+'px: '+m[2]);
  }
 } finally {server.closeAllConnections();await new Promise(ok=>server.close(ok));}
}
realCoverValidation().catch(e=>{console.error(e);process.exitCode=1});

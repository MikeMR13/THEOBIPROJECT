// Prueba real Chromium responsive, sin credenciales ni acceso a Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { render } from '../src/teampage.js';
const widths=[320,390,768,1024,1440];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data={
 t:{id:'g',slug:'grupo-demo',name:'Equipo de traducción de ejemplo',color:'#f2c230',settings:{show_works:true,show_members:true,show_stats:true,show_featured:true}},
 works:[{id:'w',slug:'novela',title:'Novela ligera de ejemplo',short:'Novela',synopsis:'Fantasía y aventuras',chapters:[{count:12}],translation_status:'active'}],
 mem:[{role:'owner',profiles:{username:'Editora'},team_roles:{name:'Propietaria'}}],
 next:{at:'2027-01-01T12:00:00Z',series:{slug:'novela',title:'Novela ligera de ejemplo'}},
 recent:Array.from({length:4},(_,i)=>({id:'c'+i,kind:'chapter',series_id:'w',series:{slug:'novela',title:'Para crear una organización extraordinaria de traductores'},title:'Capítulo doce',chapter:12+i,at:'2026-10-22T10:00:00Z',href:'/leer/novela/'+(12+i),cover_path:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#76552b"/></svg>')}))
};
const design={
 order:['featured','next','recent','works','members','announce','stats'],featured:['novela'],
 editorial:{featureStyle:'editorial',recentStyle:'carrusel',recentCount:4},composition:{columns:'dos'},
 mobile:{orderMode:'propio',order:['members','recent','featured','works','next','announce','stats'],hero:'compacto',catalog:'una',follow:'mostrar'}
};
const page=render(data,design,{esc,media:x=>x,sim:''});
const checks=[
 "import {bind,ensureFonts,insertTeamRanking} from '/teampage.js';",
 "const errors=[];try{",
 "ensureFonts([]); const root=document.querySelector('.tp2'); bind(root);",
 "await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));",
 "const w=document.documentElement.clientWidth, mobile=w<=640, comp=document.querySelector('.tp2-composition');",
 "const order=Array.from(comp.children).map(n=>n.dataset.section);",
 "const expected=mobile?['members','recent','featured','works','next','stats']:['featured','recent','works','members','stats'];",
 "if(JSON.stringify(order)!==JSON.stringify(expected))errors.push('orden '+order.join(','));",
 "if(document.querySelectorAll('#grupo-destacadas').length!==1||document.querySelectorAll('#grupo-lanzamientos').length!==1)errors.push('IDs duplicados');",
 "if(document.querySelectorAll('a[href=\"#grupo-obras\"]').length!==1)errors.push('navegación ausente');",
 "const grid=getComputedStyle(comp).gridTemplateColumns.trim().split(/\\s+/).length;",
 "if(mobile&&grid!==1||w>=1024&&grid!==2)errors.push('columnas '+grid);",
 "const bar=getComputedStyle(document.querySelector('.tp2-fbar')).display;",
 "if(mobile&&bar==='none'||!mobile&&bar!=='none')errors.push('barra seguir '+bar);",
 "const overflow=document.documentElement.scrollWidth-w;if(overflow>4)errors.push('desbordamiento '+overflow);",
 "const recentUnit=comp.querySelector('.tp2-unit[data-section=recent]'), recentTrack=recentUnit?.querySelector('.tp2-updates');",
 "if(!recentUnit||!recentTrack)errors.push('novedades no renderizadas');",
 "else {",
 " if(recentTrack.dataset.view!=='carrusel')errors.push('tipo de carrusel incorrecto');",
 " if(w>=1024&&Math.abs(recentUnit.getBoundingClientRect().width-comp.getBoundingClientRect().width)>3)errors.push('novedades limitadas a media columna');",
 " if(w>=1024&&recentTrack.firstElementChild.getBoundingClientRect().width<280)errors.push('tarjetas demasiado estrechas');",
 " if(recentTrack.querySelectorAll('.tp2-update').length!==4)errors.push('novedades incompletas');",
 " if(recentTrack.querySelectorAll('.tp2-upcover img').length!==4)errors.push('portadas no son imagenes');",
 " const img=recentTrack.querySelector('img');if(img&&getComputedStyle(img).objectFit!=='contain')errors.push('portada recortada');",
 " if(!recentTrack.hasAttribute('tabindex')||recentTrack.getAttribute('role')!=='region')errors.push('carrusel no accesible');",
 " const buttons=[...recentUnit.querySelectorAll('[data-updates-scroll]')];if(buttons.length!==2||buttons.some(x=>x.getBoundingClientRect().width<43||x.getBoundingClientRect().height<43))errors.push('navegación del carrusel');",
 "}",
 "const b=document.querySelector('.tp2-car-nav button')?.getBoundingClientRect();",
 "if(b&&(b.width<43||b.height<43))errors.push('botón carrusel');",
 // Un ranking obtenido después de activar la animación de aparición NO debe ser invisible,
 // ni ocupar un bloque oculto después de la llamada a la comunidad.
 "root.classList.add('tp2-rv');",
 "const fixture='<section class=\"tp2-sec tp2-rk\">'+Array(7).fill('<div style=\"height:65px\">Obra clasificada</div>').join('')+'</section>';",
 "const rank=insertTeamRanking(root,fixture), community=root.querySelector('.tp2-community-cta');",
 "if(!rank||!community||rank.nextElementSibling!==community)errors.push('ranking posterior a comunidad');",
 "if(rank&&getComputedStyle(rank).opacity!=='1')errors.push('ranking invisible tras carga asíncrona');",
 "if(rank&&insertTeamRanking(root,fixture)!==rank)errors.push('ranking duplicado');",
 "const foot=document.querySelector('.foot');",
 "const gap=foot&&community?foot.getBoundingClientRect().top-community.getBoundingClientRect().bottom:Infinity;",
 "if(gap<0||gap>(mobile?240:160))errors.push('hueco antes del footer: '+Math.round(gap)+'px');",
 "}catch(e){errors.push(e.message)}",
 "const q=document.getElementById('case-result');q.dataset.qaStatus=errors.length?'fail':'pass';q.textContent=errors.join('; ')||'OK';"
].join('\n');
const sample='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+ 
  '*{box-sizing:border-box}html,body{overflow-x:clip}body{margin:0;background:#0d0c0a}main{max-width:1920px;margin:0 auto;padding:40px clamp(16px,4vw,56px) 80px}'+
  '.tp2-page{position:relative;width:100vw;margin:-40px 0 -80px calc(50% - 50vw)}'+
  '.foot{border-top:1px solid #2f2a20;padding:22px 16px 96px;color:#a89f8a}'+
  '</style></head><body><main id="app"><div class="tp2-page">'+
 page+'</div></main><footer class="foot">© El Obi del Lector · Política de privacidad</footer><p id="case-result" data-qa-status="running">RUNNING</p><script type="module">'+checks+'</script></body></html>';
const parent='<!doctype html><html><head><meta charset="utf-8"></head><body><p id="qa-result" data-qa-status="running">QA_RUNNING</p>'+
 widths.map(w=>'<iframe title="Perfil '+w+'" width="'+w+'" height="800" src="/sample"></iframe>').join('')+
 '<script>const frames=[...document.querySelectorAll("iframe")];let tries=0;const poll=setInterval(()=>{const results=frames.map(x=>x.contentDocument?.getElementById("case-result"));if(results.every(p=>p?.dataset.qaStatus&&p.dataset.qaStatus!=="running")||++tries>950){clearInterval(poll);const errors=results.flatMap((p,i)=>p?.dataset.qaStatus==="pass"?[]:[frames[i].width+": "+(p?.textContent||"sin resultado")]);const q=document.getElementById("qa-result");q.dataset.qaStatus=errors.length?"fail":"pass";q.textContent=errors.join(" | ")||"Perfil grupal Chromium 320/390/768/1024/1440 OK";}},20);</script></body></html>';
const server=createServer((req,res)=>{
 const url=new URL(req.url||'/', 'http://127.0.0.1');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; img-src 'self' data:; font-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'");
 if(['/teampage.js','/anim.js','/public-collaboration-credits.js'].includes(url.pathname)){
  res.setHeader('Content-Type','text/javascript; charset=utf-8');
  const modules={'/teampage.js':'src/teampage.js','/anim.js':'src/anim.js','/public-collaboration-credits.js':'src/public-collaboration-credits.js'};
  res.end(readFileSync(modules[url.pathname]));return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(url.pathname==='/sample'?sample:parent);
});
const bin=process.env.QA_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return ''}}).find(Boolean);
assert(bin,'Chromium no está instalado');
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',
 '--no-proxy-server','--incognito','--window-size=1600,900','--virtual-time-budget=35000','--dump-dom',
 'http://127.0.0.1:'+server.address().port];
 const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
 child.stdout.on('data',x=>out+=String(x));child.stderr.on('data',x=>err+=String(x).slice(0,35000));
 const code=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Chromium timeout'))},55000);
  child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('close',c=>{clearTimeout(timer);resolve(c)});
 });
 assert.equal(code,0,err.slice(-850));
 const match=out.match(/<p id="qa-result" data-qa-status="(pass|fail)">([\s\S]*?)<\/p>/);
 assert(match,'No se encontró el resultado responsive');
 assert.equal(match[1],'pass',match[2]);
 console.log(match[2]);
}finally{await new Promise(ok=>server.close(ok))}

// Prueba visual real del parche sticky: CSS de producción, 3.000px de scroll.
// Independiente de cuentas, API, Supabase y navegación externa.
const report=document.getElementById('qa-result');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
async function test(width,height){
  document.documentElement.style.width='100%';
  document.getElementById('fixture-screen').style.maxWidth='100%';
  // Emular viewport distinto en DevTools sin API remota: reproducir la
  // geometría dentro de iframes de mismo origen, con viewport físico real.
  const iframe=document.createElement('iframe');
  iframe.title='Prueba de barra fija '+width+'px';
  iframe.style.cssText='position:fixed;left:0;top:0;width:'+width+'px;height:'+height+'px;border:0;opacity:0.01;pointer-events:none';
  iframe.src='/sticky-frame.html';
  document.body.append(iframe);
  await new Promise((ok,bad)=>{iframe.onload=ok;iframe.onerror=bad;});
  const w=iframe.contentWindow,d=w.document;
  await delay(180);
  const body=d.body,bar=d.querySelector('.ed-bar');
  assert(!!bar,'No existe la barra del editor');
  const before=bar.getBoundingClientRect();
  const x=getComputedStyle.call(w,body).overflowX;
  assert(x==='clip','body conserva overflow-x='+x+' en '+width+'px');
  assert(w.getComputedStyle(bar).position==='sticky','barra perdió position:sticky');
  w.scrollTo(0,3000);
  await delay(260);
  const after=bar.getBoundingClientRect();
  const scroll=w.scrollY;
  assert(scroll>=2950,'No hubo desplazamiento vertical real: '+scroll);
  assert(after.top>=-2&&after.top<=Math.max(84,before.top+1),
    'La barra no queda fija después de 3.000px en '+width+'px: top='+after.top);
  const overflow=d.documentElement.scrollWidth-w.innerWidth;
  assert(overflow<=3,'Desbordamiento horizontal de '+overflow+'px en '+width+'px');
  iframe.remove();
  return width+'px: desplazamiento '+Math.round(scroll)+'px; barra top='+Math.round(after.top)+'px';
}
try{
 const a=await test(1470,900);
 const b=await test(390,844);
 const c=await test(320,760);
 report.dataset.status='pass';
 report.textContent='Sticky verificado en Chromium: '+[a,b,c].join(' | ');
}catch(e){report.dataset.status='fail';report.textContent=e.stack||e.message;}

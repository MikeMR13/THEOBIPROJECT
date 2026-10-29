// Prueba visual y de interacción sobre el despliegue de PR real, sin login ni mutaciones.
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base=process.env.AUDIT_PREVIEW_URL;
assert(/^https:\/\/[a-z0-9.-]+\.vercel\.app$/.test(base||''),'Se requiere el URL verificado de Vercel');
const chrome=process.env.QA_CHROME||['google-chrome','chromium','chromium-browser']
 .map(x=>{try{return execFileSync('which',[x],{encoding:'utf8'}).trim()}catch{return''}}).find(Boolean);
assert(chrome,'Chromium no disponible');
mkdirSync('qa-capturas/mejoras-auditoria',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const width of [320,390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===320?720:width===390?844:900},
   isMobile:width<760,deviceScaleFactor:1,locale:'es-MX',serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await ctx.newPage();page.setDefaultTimeout(13000);
  for(const [name,path] of [['ranking','/ranking'],['entrar','/entrar'],['inicio','/']]){
   const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:24000});
   assert.equal(response?.status(),200,'Ruta '+path+' no carga');
   await page.waitForTimeout(name==='inicio'?3500:2200);
   const filename='qa-capturas/mejoras-auditoria/'+width+'-'+name+'.png';
   await page.screenshot({path:filename,animations:'disabled',fullPage:false});
   if(name==='ranking'){
    const q=page.locator('.rk-bar .ui-chips>.ui-chip');
    assert.equal(await q.count(),6,'No aparecen seis filtros de Ranking');
    const sizes=await q.evaluateAll(els=>els.map(e=>({label:e.textContent.trim(),height:e.getBoundingClientRect().height})));
    assert(sizes.every(x=>x.height>=43.5),'Filtros <44px: '+JSON.stringify(sizes));
    const trend=q.filter({hasText:'Tendencia'});await trend.click();
    await page.waitForTimeout(300);
    assert(await trend.evaluate(el=>el.classList.contains('on')),'Pestaña Tendencia no se activó');
    results.push({width,name,sizes});
   }else if(name==='entrar'){
    const button=page.locator('#go');await button.waitFor({state:'visible'});
    await button.scrollIntoViewIfNeeded();
    await button.click({trial:true,timeout:6000});
    const measured=await button.evaluate(el=>{
     const r=el.getBoundingClientRect(),nav=document.querySelector('.ob-tab')?.getBoundingClientRect();
     return {top:r.top,bottom:r.bottom,height:r.height,navTop:nav?.top??null,
       left:r.left,right:r.right,viewport:innerWidth,docScroll:document.documentElement.scrollHeight};
    });
    assert(measured.height>=43.5,'Botón Entrar menor a 44px');
    if(width<760)assert(measured.bottom<=measured.navTop+1,
      'Entrar se solapa con barra móvil: '+JSON.stringify(measured));
    results.push({width,name,measured});
   }else{
    await page.locator('.vt-row').waitFor({state:'visible',timeout:15000});
    const heights=await page.evaluate(()=>{
      const r=x=>document.querySelector(x)?.getBoundingClientRect();
      return {vitrina:Math.round(r('.vt')?.height||0),row:Math.round(r('.vt-row')?.height||0)};
    });
    if(width<760)assert(heights.vitrina<=565,'Vitrina móvil demasiado alta: '+JSON.stringify(heights));
    const a=page.locator('#hero .vt-side .ob-acts .a1').first();
    await a.waitFor({state:'visible'});await a.scrollIntoViewIfNeeded();
    await a.click({trial:true,timeout:7000});
    results.push({width,name,heights,cta:'recibe clic'});
   }
   console.log('✓',width,name,'verificación en DOM real',JSON.stringify(results[results.length-1]));
  }
  await ctx.close();
 }
}finally{await browser.close()}
writeFileSync('qa-capturas/mejoras-auditoria/resultado.json',JSON.stringify({base,results},null,2));
console.log('✓ Nueve comprobaciones de sitio real completadas');

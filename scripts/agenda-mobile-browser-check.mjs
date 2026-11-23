// QA de calendario en móvil: JS real compilado, 1,400 filas ficticias,
// temporadas deliberadamente lentas y SIN acceso a Supabase ni producción.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

assert(existsSync('dist/agenda.js'), 'Ejecutar npm run build primero');
const browser = process.env.QA_CHROME || ['chromium', 'google-chrome', 'google-chrome-stable']
  .map(x => { try { return execFileSync('which', [x], { encoding:'utf8' }).trim(); } catch { return ''; } })
  .find(Boolean);
assert(browser, 'Chromium no disponible');
const DAY = 86400000, noon = new Date().setUTCHours(12, 0, 0, 0);
const series = Array.from({ length:20 }, (_,i) => ({
  id:'s'+i, slug:'obra-'+i, title:'Novela de prueba '+i, short:'Novela '+i,
  team_id:'t'+i, work_type:'Novela ligera', teams:{name:'Equipo ficticio '+i, slug:'equipo-'+i}
}));
const rows = [];
for(let g=0;g<140;g++){
  const at = new Date(noon + (Math.floor(g/4)-15)*DAY).toISOString();
  for(let c=0;c<10;c++) rows.push({
    series_id:'s'+(g%20),kind:'pub',at,chapter_id:'c'+(g*10+c),
    num:g*10+c+1,volume_id:'v'+g,acc:'public',can_read:true,
    open_at:null,early_at:null,min_price:null,vnum:1,vcover:null
  });
}
const fixture={series,rows};
function testFrame(){
  const app=document.getElementById('app'), out=document.getElementById('ag-test');
  const Q=window.FIXTURE, delay=ms=>new Promise(r=>setTimeout(r,ms));
  window.obiTZ=()=> 'UTC';
  window.__seasonsFinished=false;
  const failures=[];
  addEventListener('error',e=>failures.push(String(e.message||e.error)));
  addEventListener('unhandledrejection',e=>failures.push(String(e.reason)));
  function table(name){
    const q={
      select(){return this},eq(){return this},in(){return this},
      is(){return this},gte(){return this},lte(){return this},not(){return this},
      then(ok,bad){
        return (async()=>{
          if(name==='season_calendar'){await delay(3200);window.__seasonsFinished=true;}
          else await delay(35);
          const data=name==='series'?Q.series:name==='platform_settings'?[{seasons:{}}]:[];
          return {data,error:null};
        })().then(ok,bad);
      },
      maybeSingle(){return this.then(r=>({...r,data:r.data[0]||null}));}
    };
    return q;
  }
  const sb={
    from:table,
    async rpc(name){
      if(name==='agenda_events_json'){await delay(210);return {data:Q.rows,error:null};}
      if(name==='series_public_credits'){await delay(200);return {data:[],error:null};}
      await delay(35);return {data:[],error:null};
    }
  };
  const ctx={
    app,sb,url:'https://fixture.invalid',getUser:()=>null,
    go:()=>{},toast:()=>{},
    esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  };
  (async()=>{
    const t=performance.now();
    const {agenda}=await import('/agenda.js?v=1');
    await agenda(ctx);
    const initialMs=Math.round(performance.now()-t);
    const firstCards=app.querySelectorAll('.ag-ev').length;
    const all=Number(app.querySelector('.ag-period strong')?.textContent||0);
    const moreNext=app.querySelector('[data-line-more="next"]');
    const morePast=app.querySelector('[data-line-more="past"]');
    const whileSeasonPending=!window.__seasonsFinished;
    const widths=window.innerWidth;
    moreNext?.click();
    await delay(90);
    const afterNext=app.querySelectorAll('.ag-ev').length;
    const allAfter=Number(app.querySelector('.ag-period strong')?.textContent||0);
    const morePastNow=app.querySelector('[data-line-more="past"]');
    morePastNow?.click();
    await delay(90);
    const afterPast=app.querySelectorAll('.ag-ev').length;
    await delay(3300);
    const afterSeason=app.querySelectorAll('.ag-ev').length;
    const seasonUpdated=window.__seasonsFinished;
    const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+3;
    const result={widths,initialMs,firstCards,afterNext,afterPast,afterSeason,
      all,allAfter,whileSeasonPending,seasonUpdated,overflow,failures};
    const pass=widths<=400 && initialMs<3000 && whileSeasonPending && seasonUpdated &&
      all===140 && allAfter===140 && firstCards>0 && firstCards<50 &&
      afterNext>firstCards && afterPast>afterNext && afterSeason===afterPast &&
      !overflow && failures.length===0 && !!moreNext && !!morePast;
    out.dataset.status=pass?'pass':'fail';
    out.textContent=JSON.stringify(result);
  })().catch(e=>{
    out.dataset.status='fail';out.textContent=JSON.stringify({error:String(e),stack:e?.stack});
  });
}
const frameHtml='<!doctype html><html lang="es"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<style>body{margin:0;color:#f3ecd9;background:#0d0c0a;font:14px sans-serif}main{padding:12px}</style>'+
 '</head><body><main id="app"></main><pre id="ag-test" data-status="running" hidden></pre>'+
 '<script>window.FIXTURE='+JSON.stringify(fixture)+';('+testFrame.toString()+')();</script></body></html>';
const parent='<!doctype html><html><body><iframe width="390" height="800" src="/calendario?v=linea"></iframe>'+
 '<pre id="qa" data-status="running"></pre><script>'+
 'setInterval(()=>{const frame=document.querySelector("iframe");const e=frame.contentDocument?.querySelector("#ag-test");'+
 'if(e&&e.dataset.status!=="running"){const q=document.querySelector("#qa");q.dataset.status=e.dataset.status;q.textContent=e.textContent;}},100);'+
 '</script></body></html>';
const root=resolve('dist');
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  res.setHeader('Content-Security-Policy',"default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:");
  if(path==='/'){res.setHeader('Content-Type','text/html');return res.end(parent);}
  if(path==='/calendario'){res.setHeader('Content-Type','text/html');return res.end(frameHtml);}
  const file=resolve(join(root,path.replace(/^\/+/,'')));
  if(!file.startsWith(root+'/')||!existsSync(file)){res.statusCode=404;return res.end('404 '+path);}
  res.setHeader('Content-Type', {'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
try{
  const html=await new Promise((resolve,reject)=>{
    const proc=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu',
      '--disable-dev-shm-usage','--disable-background-networking','--disable-extensions',
      '--no-first-run','--window-size=1000,1000','--virtual-time-budget=11000','--dump-dom',url],
      {stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='',done=false;
    const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timeout);err?reject(err):resolve(value);};
    const timeout=setTimeout(()=>{proc.kill('SIGKILL');finish(Error('Timeout Chromium: '+stderr.slice(-300)));},40000);
    proc.stdout.on('data',b=>stdout+=String(b));
    proc.stderr.on('data',b=>stderr=(stderr+String(b)).slice(-800));
    proc.once('error',e=>finish(e));
    proc.once('close',code=>finish(code===0?null:Error('Chromium exit '+code+' '+stderr.slice(-350)),stdout));
  });
  const match=html.match(/<pre id="qa" data-status="(pass|fail)">([^<]*)<\/pre>/);
  assert(match, 'Sin informe de Chromium: '+html.slice(-400));
  const result=JSON.parse(match[2]);
  assert.equal(match[1],'pass','Falló calendario móvil: '+JSON.stringify(result));
  console.log('✓ Calendario móvil (390px), 140 grupos / 1,400 eventos, carga antes de temporadas, Ver más y conteos: '+JSON.stringify(result));
}finally{server.close();}
